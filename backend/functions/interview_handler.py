from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import json
from langchain import PromptTemplate, LLMChain
from langchain.memory import ConversationBufferMemory
from langchain_community.llms import Together
import os
from pusher import Pusher
import logging
from dotenv import load_dotenv
from pydantic import BaseModel
from textblob import TextBlob
import uuid
import pyttsx3
import threading

# Global mute state
is_muted = False

router = APIRouter()

# Global states
is_muted = False
current_speech_thread = None
speech_engine = None

def stop_current_speech():
    """Stop the current speech if any"""
    global speech_engine
    if speech_engine:
        try:
            speech_engine.stop()
            speech_engine.endLoop()  # End the run loop
        except:
            pass  # Ignore any errors when stopping
        finally:
            speech_engine = None

def speak_text(text, force=False):
    """Function to speak text in a separate thread"""
    global speech_engine, is_muted, current_speech_thread
    
    # Only proceed if not muted or forced
    if not is_muted or force:
        try:
            # Ensure any existing speech is properly stopped
            stop_current_speech()
            
            # Check mute state again in case it changed
            if not is_muted or force:
                import platform
                system = platform.system().lower()
                
                # Initialize speech engine based on platform
                if system == 'windows':
                    speech_engine = pyttsx3.init(driverName='sapi5')
                elif system == 'darwin':  # macOS
                    speech_engine = pyttsx3.init(driverName='nsss')
                else:  # Linux and others
                    speech_engine = pyttsx3.init()
                
                # Configure and run speech
                speech_engine.setProperty('rate', 150)
                speech_engine.say(text)
                speech_engine.runAndWait()
                
                # After successful speech completion, set is_muted to False
                if not force:
                    is_muted = False
        except Exception as e:
            print(f"Speech error: {e}")
            # If speech fails, ensure next message can be read
            if not force:
                is_muted = False
        finally:
            speech_engine = None

class MuteRequest(BaseModel):
    mute: bool
    last_message: str | None = None

@router.post("/toggle_mute")
async def toggle_mute(request: MuteRequest):
    """Toggle mute state and optionally speak the last message"""
    global is_muted
    is_muted = request.mute
    
    if is_muted:
        stop_current_speech()  # Immediately stop speech when muted
    # Remove automatic unmuting and speaking of last message
    
    return {"status": "success", "muted": is_muted}
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Together.ai client
together_api_key = os.getenv("TOGETHER_API_KEY")
if not together_api_key:
    raise ValueError("TOGETHER_API_KEY environment variable is not set")

llm = Together(
    model="mistralai/Mixtral-8x7B-Instruct-v0.1",
    temperature=0.7,
    max_tokens=512,  # Reduced to keep responses more concise
    top_p=0.7,
    together_api_key=together_api_key
)

# Initialize Pusher
pusher = Pusher(
    app_id=os.getenv("PUSHER_APP_ID"),
    key=os.getenv("PUSHER_KEY"),
    secret=os.getenv("PUSHER_SECRET"),
    cluster=os.getenv("PUSHER_CLUSTER"),
    ssl=True
)

# Initialize conversation memory with custom attributes
memory = ConversationBufferMemory(
    memory_key="chat_history",
    return_messages=True,
    output_key="response"
)

# Track interview state
interview_state = {
    "current_topic": None,
    "topic_follow_ups": 0,
    "discussed_topics": set(),
    "remaining_topics": set()
}

def reset_interview_state(resume_data: Dict[str, Any]):
    """Reset interview state and initialize topics from resume"""
    global interview_state
    # Extract all potential topics from resume sections
    all_topics = set()
    
    # Add skills as individual topics
    if "Skills" in resume_data:
        all_topics.update(resume_data["Skills"])
    
    # Add experience entries as topics
    if "Experience" in resume_data:
        all_topics.update([exp.split()[0] for exp in resume_data["Experience"]])
    
    # Add projects as topics
    if "Projects" in resume_data:
        all_topics.update([proj.split()[0] for proj in resume_data["Projects"]])
    
    interview_state = {
        "current_topic": None,
        "topic_follow_ups": 0,
        "discussed_topics": set(),
        "remaining_topics": all_topics
    }

# Updated prompt template
interview_prompt = PromptTemplate(
    input_variables=["input"],
    template="""You are an expert AI interviewer specializing in technical and behavioral job interviews. Your responses should be natural, empathetic, and adaptive.

Key Behaviors:
1. Analyze candidate responses for technical depth and adjust follow-up complexity accordingly
2. Recognize emotional tone and adapt your interviewing style
3. Provide brief, constructive feedback before asking follow-up questions
4. Use varied, natural language patterns instead of rigid questioning
5. Reference the candidate's specific experience and skills from their resume
6. If a candidate shows frustration or hostility, respond with empathy and offer to adjust the interview style

{input}

Remember:
1. Keep responses conversational and engaging
2. Ask one question at a time
3. Wait for candidate responses before proceeding
4. Provide brief feedback on technical answers
5. Maintain a professional yet friendly tone"""
)

llm_chain = LLMChain(
    llm=llm,
    prompt=interview_prompt,
    memory=memory,
    output_key="response"
)

class InterviewRequest(BaseModel):
    resume_data: Dict[str, Any]
    job_description: str

class MessageRequest(BaseModel):
    message: str
    resume_data: Dict[str, Any]
    job_description: str

@router.post("/start_interview")
async def start_interview(request: InterviewRequest):
    try:
        logger.debug(f"Starting interview with data: {request}")
        
        if not request.resume_data or not request.job_description:
            raise HTTPException(
                status_code=400,
                detail="Missing required fields: resume_data or job_description"
            )

        # Clear any existing conversation
        if hasattr(memory, 'chat_memory'):
            memory.chat_memory.clear()
        
        # Format the input for initial interview start
        input_text = f"""You are conducting a technical interview. Based on the candidate's profile:
        Resume: {json.dumps(request.resume_data, indent=2)}
        Job Description: {request.job_description}
        
        Provide ONE brief, friendly introduction and ask ONE initial technical question relevant to their background.
        Keep your response under 150 words.
        Do not generate multiple responses or follow-up questions."""
        
        # Get initial response
        initial_response = await llm_chain.apredict(input=input_text)
        cleaned_response = initial_response.split('"""')[0].strip()
        
        # Generate unique message ID
        message_id = str(uuid.uuid4())
        
        # Store in memory
        memory.chat_memory.add_message({
            "role": "system",
            "content": f"Interview started with resume: {json.dumps(request.resume_data)}\nJob Description: {request.job_description}"
        })
        
        memory.chat_memory.add_message({
            "role": "assistant",
            "content": cleaned_response
        })
        
        # Create new speech thread with the response
        speech_thread = threading.Thread(target=speak_text, args=(cleaned_response,))
        
        # Stop current speech if any
        stop_current_speech()
        
        # Start the new speech thread
        speech_thread.start()

        # Send single response through Pusher with message ID
        pusher.trigger('interview-channel', 'ai-response', {
            'type': 'ai_response',
            'message': cleaned_response,
            'message_id': message_id
        })
        
        return {"status": "success", "message": "Interview started"}
        
    except Exception as e:
        logger.error(f"Error starting interview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send_message")
async def send_message(request: MessageRequest):
    try:
        # Ensure system is unmuted for new responses
        global is_muted
        is_muted = False
        
        # Analyze sentiment of candidate's response
        sentiment = analyze_response_sentiment(request.message)
        special_response = generate_appropriate_response(request.message, sentiment)
        
        if special_response:
            # Handle negative/frustrated responses differently
            cleaned_response = special_response
        else:
            # Update topic follow-ups counter and check for topic switch
            interview_state["topic_follow_ups"] += 1
            should_switch_topic = interview_state["topic_follow_ups"] >= 3 and interview_state["remaining_topics"] - interview_state["discussed_topics"]
            
            if should_switch_topic:
                # Mark current topic as discussed and select new topic
                if interview_state["current_topic"]:
                    interview_state["discussed_topics"].add(interview_state["current_topic"])
                
                new_topic = next(iter(interview_state["remaining_topics"] - interview_state["discussed_topics"]))
                interview_state["current_topic"] = new_topic
                interview_state["topic_follow_ups"] = 0
                
                input_text = f"""Previous conversation: {str(memory.chat_memory.messages)}
                
                Candidate's response: {request.message}
                
                IMPORTANT: Switch the conversation to discuss the candidate's experience with {new_topic}.
                
                Based on their background:
                1. Acknowledge their previous response briefly
                2. Transition smoothly to discussing {new_topic}
                3. Ask ONE focused question about their experience with {new_topic}
                4. Keep the conversation professional and engaging
                
                Resume Data: {json.dumps(request.resume_data)}
                Job Description: {request.job_description}"""
            else:
                # Continue with current topic
                input_text = f"""Previous conversation: {str(memory.chat_memory.messages)}
                
                Candidate's response: {request.message}
                
                Based on the candidate's response and their background:
                1. Analyze technical depth (basic/intermediate/advanced)
                2. Provide brief constructive feedback
                3. Ask ONE relevant follow-up question
                4. Keep the conversation focused and professional
                5. Reference their specific experience when relevant
                
                Resume Data: {json.dumps(request.resume_data)}
                Job Description: {request.job_description}"""
            
            response = await llm_chain.apredict(input=input_text)
            cleaned_response = response.split('"""')[0].strip()
        
        # Store the interaction in memory
        memory.chat_memory.add_message({"role": "user", "content": request.message})
        memory.chat_memory.add_message({"role": "assistant", "content": cleaned_response})
        
        # Create new speech thread with the response
        speech_thread = threading.Thread(target=speak_text, args=(cleaned_response,))
        
        # Stop current speech if any
        stop_current_speech()
        
        # Start the new speech thread
        speech_thread.start()

        pusher.trigger('interview-channel', 'ai-response', {
            'type': 'ai_response',
            'message': cleaned_response
        })
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def analyze_response_sentiment(message: str) -> tuple[float, float]:
    analysis = TextBlob(message)
    return (analysis.sentiment.polarity, analysis.sentiment.subjectivity)

def generate_appropriate_response(message: str, sentiment: tuple[float, float]) -> str:
    polarity, subjectivity = sentiment
    
    if polarity < -0.3:  # Negative sentiment detected
        return """I sense some frustration, which is completely understandable. Would you like to:
        1. Take a brief moment before continuing
        2. Adjust the interview style or pace
        3. Focus on a different area
        Please let me know your preference."""
    
    return None  # Continue with normal interview flow 