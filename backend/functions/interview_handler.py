"""
Audio processing module with cross-platform support for speech rate adjustment.

For development:
- Windows: Download ffmpeg from https://ffmpeg.org/download.html
- MacOS: Install via 'brew install ffmpeg'
- Linux: Install via package manager (apt install ffmpeg, yum install ffmpeg, etc.)

For deployment:
1. Set FFMPEG_PATH environment variable to custom ffmpeg binary location, or
2. Include ffmpeg binary in your deployment:
   - Windows: Include ffmpeg.exe in 'backend/bin/windows/ffmpeg.exe'
   - Linux: Include ffmpeg in 'backend/bin/linux/ffmpeg'
   - MacOS: Include ffmpeg in 'backend/bin/macos/ffmpeg'
    
The system will:
1. Check FFMPEG_PATH environment variable
2. Look for platform-specific binary in backend/bin directory
3. Check system PATH for ffmpeg installation
4. Fall back to normal speed if ffmpeg is unavailable
"""

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import FileResponse
from typing import Dict, Any
import json
import mimetypes
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.memory import ConversationBufferMemory
from langchain_community.llms.together import Together
import os
from pusher import Pusher
import logging
from dotenv import load_dotenv
from pydantic import BaseModel
from textblob import TextBlob
import uuid
import threading
from gtts import gTTS
import pygame
import hashlib
import pathlib
import shutil
import time
import platform
from pydub import AudioSegment
from pydub.utils import which

def get_ffmpeg_path():
    """Get ffmpeg binary path based on platform and environment"""
    # Check environment variable first
    ffmpeg_path = os.getenv('FFMPEG_PATH')
    if ffmpeg_path and os.path.exists(ffmpeg_path):
        return ffmpeg_path
        
    # Check platform-specific binary in backend/bin
    system = platform.system().lower()
    if system == 'windows':
        local_path = 'backend/bin/windows/ffmpeg.exe'
    elif system == 'darwin':  # MacOS
        local_path = 'backend/bin/macos/ffmpeg'
    else:  # Linux and others
        local_path = 'backend/bin/linux/ffmpeg'
        
    if os.path.exists(local_path):
        return os.path.abspath(local_path)
    
    # Check system PATH
    return which("ffmpeg")

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Set ffmpeg path for pydub
FFMPEG_PATH = get_ffmpeg_path()
if FFMPEG_PATH:
    AudioSegment.converter = FFMPEG_PATH
    logger.info(f"Using ffmpeg from: {FFMPEG_PATH}")
else:
    logger.warning("ffmpeg not found - speech rate adjustment will be disabled")

# Initialize router first
router = APIRouter()

# For web deployment, we don't need pygame's audio system
# We only generate audio files that are played by the client's browser
audio_enabled = True  # Always true since we're just generating files
try:
    # Only initialize pygame for its other utilities
    os.environ['SDL_VIDEODRIVER'] = 'dummy'
    os.environ['SDL_AUDIODRIVER'] = 'dummy'  # Prevent audio initialization attempts
    pygame.init()
    logger.info("Initialized pygame for utility functions only")
except Exception as e:
    logger.error(f"Failed to initialize pygame: {e}")
    # Continue anyway since we don't need pygame's audio

# Create cache directory if it doesn't exist
CACHE_DIR = pathlib.Path("/tmp/tts_cache")  # Use /tmp for deployment
try:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    # Test write permissions
    test_file = CACHE_DIR / "test.txt"
    test_file.write_text("test")
    test_file.unlink()
    logger.info(f"Cache directory initialized at {CACHE_DIR}")
except Exception as e:
    logger.error(f"Failed to initialize cache directory: {e}")
    # Fallback to current directory
    CACHE_DIR = pathlib.Path("backend/temp/tts_cache")
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"Using fallback cache directory: {CACHE_DIR}")

# Global mute state
is_muted = False
current_speech_thread = None

def get_cache_path(text: str) -> pathlib.Path:
    """Generate a cache file path for the given text"""
    text_hash = hashlib.md5(text.encode()).hexdigest()
    return CACHE_DIR / f"{text_hash}.mp3"

def generate_speech(text: str, cache_path: pathlib.Path):
    """Generate speech audio file using gTTS and adjust speed with pydub if available"""
    def get_temp_path():
        """Generate a unique temporary file path"""
        return cache_path.parent / f"temp_{uuid.uuid4().hex}.mp3"
    
    temp_path = get_temp_path()
    
    try:
        # Generate initial speech with gTTS
        tts = gTTS(text=text, lang='en', slow=False)
        tts.save(str(temp_path))
        logger.debug(f"Generated initial speech file at {temp_path}")
        
        try:
            # Load and process audio
            with open(str(temp_path), 'rb') as audio_file:
                audio = AudioSegment.from_file(audio_file, format="mp3")
                # Speed up by 1.2x for faster speech
                faster_audio = audio.speedup(playback_speed=1.2)
                # Export to cache path
                faster_audio.export(str(cache_path), format="mp3")
                
            logger.info("Successfully processed audio with pydub at 2x speed")
            
        except Exception as e:
            logger.error(f"Pydub processing failed: {e}")
            # If pydub fails, copy the original file
            shutil.copy2(str(temp_path), str(cache_path))
            
    except Exception as e:
        logger.error(f"Speech generation failed: {e}")
        # Final fallback: direct save
        tts.save(str(cache_path))
        
    finally:
        # Ensure all handles are released before cleanup
        time.sleep(0.5)
        try:
            if temp_path.exists():
                temp_path.unlink()
        except Exception as e:
            logger.error(f"Cleanup error: {e}")

def speak_text(text, force=False):
    """Generate speech audio file (actual playback happens in browser)"""
    global is_muted
    
    # Only proceed if not muted or forced
    if not is_muted or force:
        try:
            cache_path = get_cache_path(text)
            
            # Generate audio file if not in cache
            if not cache_path.exists():
                generate_speech(text, cache_path)
                logger.debug(f"Generated audio file at {cache_path}")
            
        except Exception as e:
            logger.error(f"Speech generation error: {e}")

class MuteRequest(BaseModel):
    mute: bool
    last_message: str | None = None

@router.post("/toggle_mute")
async def toggle_mute(request: MuteRequest):
    """Toggle mute state and optionally prepare the last message audio"""
    global is_muted
    is_muted = request.mute
    
    # When unmuting, ensure the last message's audio is ready
    if not is_muted and request.last_message:
        # Generate audio in background thread if needed
        threading.Thread(target=speak_text, args=(request.last_message, True)).start()
    
    return {"status": "success", "muted": is_muted}

load_dotenv()

# Initialize Together.ai client
from langchain_together import Together
from tenacity import retry, stop_after_attempt, wait_exponential

# Add retry logic for LLM chain at module level
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
async def predict_with_retries(chain, text):
    try:
        response = await chain.apredict(input=text)
        if not response:
            raise ValueError("Empty response received from LLM")
        return response
    except Exception as e:
        logger.error(f"LLM generation error: {str(e)}", exc_info=True)
        if "rate limit" in str(e).lower():
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
        elif "token limit" in str(e).lower():
            raise HTTPException(status_code=400, detail="Input too long. Please provide a shorter resume or job description.")
        raise

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

# Enable detailed logging
logging.getLogger("langchain").setLevel(logging.DEBUG)

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
    template="""You are an expert technical interviewer conducting a professional interview. Format your responses as direct statements and questions without conversational fillers like "Great" or "That's interesting".

Key Behaviors:
1. Analyze response technical depth (basic/intermediate/advanced) internally
2. Provide concise, specific feedback referencing technical concepts
3. Ask focused follow-up questions based on the candidate's expertise level
4. Track discussed topics to ensure comprehensive coverage
5. Maintain professional tone without casual conversation

Response Format:
1. Technical Assessment: [Keep internal, do not output]
2. Feedback: Brief, specific feedback on technical accuracy
3. Question: One clear, focused technical question

{input}

Guidelines:
1. No conversational phrases ("Great", "That's interesting", etc.)
2. Keep internal analysis separate from output
3. Focus on technical substance over social interaction
4. Maintain consistent professional tone
5. Ask one specific question at a time"""
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

        # Reset interview state and clear conversation
        reset_interview_state(request.resume_data)
        if hasattr(memory, 'chat_memory'):
            memory.chat_memory.clear()
        
        # Format the input for initial interview start
        input_text = f"""You are conducting a technical interview. Based on the candidate's profile:
        Resume: {json.dumps(request.resume_data, indent=2)}
        Job Description: {request.job_description}
        
        Provide ONE brief, friendly introduction and ask ONE initial technical question relevant to their background.
        Keep your response under 150 words.
        Do not generate multiple responses or follow-up questions."""

        # Get initial response with retries
        initial_response = await predict_with_retries(llm_chain, input_text)
        cleaned_response = initial_response.split('"""')[0].strip()
        if not cleaned_response:
            raise ValueError("Empty response after cleaning")
        logger.info("Successfully generated initial response")
        
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
        
        # First send a "thinking" signal
        pusher.trigger('interview-channel', 'ai-thinking', {
            'type': 'ai_thinking',
            'message_id': message_id
        })

        # Create new speech thread with the response
        def speak_and_notify():
                    # Generate speech first
                    cache_path = get_cache_path(cleaned_response)
                    if not cache_path.exists():
                        generate_speech(cleaned_response, cache_path)
                    
                    # Get audio file hash for URL
                    audio_hash = hashlib.md5(cleaned_response.encode()).hexdigest()
                    
                    # Once speech is ready, send the actual message with audio URL
                    pusher.trigger('interview-channel', 'ai-response', {
                        'type': 'ai_response',
                        'message': cleaned_response,
                        'message_id': message_id,
                        'speech_ready': audio_enabled,
                        'audio_url': f"/api/audio/{audio_hash}" if audio_enabled else None
                    })
                    
                    # Then generate speech if audio is enabled
                    if audio_enabled:
                        speak_text(cleaned_response)

        speech_thread = threading.Thread(target=speak_and_notify)
        speech_thread.start()
        
        return {"status": "success", "message": "Interview started"}
        
    except Exception as e:
        error_msg = f"Error starting interview: {str(e)}"
        logger.error(error_msg, exc_info=True)  # Log full traceback
        if hasattr(e, 'detail'):
            raise HTTPException(status_code=500, detail=str(e.detail))
        raise HTTPException(status_code=500, detail=error_msg)

@router.post("/send_message")
async def send_message(request: MessageRequest):
    try:
        # Ensure we're unmuted for the response
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
                input_text = f"""Context:
                    Previous Messages: {str(memory.chat_memory.messages)}
                    Current Response: {request.message}
                    Resume: {json.dumps(request.resume_data)}
                    Job Description: {request.job_description}
                    
                    Instructions:
                    1. [INTERNAL] Analyze technical depth: basic/intermediate/advanced
                    2. [OUTPUT] Provide specific technical feedback in 1-2 sentences
                    3. [OUTPUT] Ask one focused technical question
                    4. [INTERNAL] Track topic coverage and expertise level
                    
                    Format response as:
                    [Specific technical feedback without conversational phrases]
                    [One focused technical question]"""
            
            response = await predict_with_retries(llm_chain, input_text)
            cleaned_response = response.split('"""')[0].strip()
            if not cleaned_response:
                raise ValueError("Empty response after cleaning")
            logger.info("Successfully generated response")
        
        # Store the interaction in memory
        memory.chat_memory.add_message({"role": "user", "content": request.message})
        memory.chat_memory.add_message({"role": "assistant", "content": cleaned_response})
        
        # Generate unique message ID
        message_id = str(uuid.uuid4())

        # First send a "thinking" signal
        pusher.trigger('interview-channel', 'ai-thinking', {
            'type': 'ai_thinking',
            'message_id': message_id
        })

        # Create new speech thread with the response
        def speak_and_notify():
                    # Generate speech first
                    cache_path = get_cache_path(cleaned_response)
                    if not cache_path.exists():
                        generate_speech(cleaned_response, cache_path)
                    
                    # Get audio file hash for URL
                    audio_hash = hashlib.md5(cleaned_response.encode()).hexdigest()
                    
                    # Once speech is ready, send the actual message with audio URL
                    pusher.trigger('interview-channel', 'ai-response', {
                        'type': 'ai_response',
                        'message': cleaned_response,
                        'message_id': message_id,
                        'speech_ready': audio_enabled,
                        'audio_url': f"/api/audio/{audio_hash}" if audio_enabled else None
                    })
                    
                    # Then generate speech if audio is enabled
                    if audio_enabled:
                        speak_text(cleaned_response)

        speech_thread = threading.Thread(target=speak_and_notify)
        speech_thread.start()
        
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
        return """Let's adjust our approach:
1. Proceed with a different technical area
2. Focus on system design
3. Discuss project architecture

Which technical topic would you prefer to explore?"""
    
    return None  # Continue with normal interview flow

@router.get("/audio/{audio_hash}")
async def get_audio(audio_hash: str):
    """Serve the audio file for a given hash"""
    try:
        # Construct the file path from hash
        audio_path = CACHE_DIR / f"{audio_hash}.mp3"
        
        if not audio_path.exists():
            raise HTTPException(status_code=404, detail="Audio file not found")
            
        # Return the audio file using FileResponse for better performance
        return FileResponse(
            path=audio_path,
            media_type="audio/mpeg",
            filename=f"{audio_hash}.mp3",
            headers={
                "Cache-Control": "public, max-age=31536000"  # Cache for 1 year
            }
        )
    except Exception as e:
        logger.error(f"Error serving audio file: {e}")
        raise HTTPException(status_code=500, detail="Error serving audio file")
