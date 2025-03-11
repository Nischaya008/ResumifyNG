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

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import json
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

# Initialize pygame mixer with error handling and dummy driver
audio_enabled = False
try:
    # Force dummy driver for headless environment
    os.environ['SDL_AUDIODRIVER'] = 'dummy'
    os.environ['AUDIODEV'] = 'null'
    os.environ['SDL_VIDEODRIVER'] = 'dummy'  # Also set video driver to dummy
    
    # Initialize pygame first
    pygame.init()
    
    # Then initialize the mixer with specific settings
    pygame.mixer.pre_init(frequency=22050, size=-16, channels=2, buffer=4096)
    pygame.mixer.init()
    
    # Verify mixer is actually initialized
    if pygame.mixer.get_init():
        audio_enabled = True
        logger.info("Audio system initialized successfully with dummy driver")
    else:
        logger.warning("Mixer initialization failed, continuing without audio")
except Exception as e:
    logger.error(f"Failed to initialize audio system: {e}")
    logger.warning("Continuing without audio playback")

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
                # Speed up by 2x for faster speech
                faster_audio = audio.speedup(playback_speed=2.0)
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

def stop_current_speech():
    """Stop the current speech if any"""
    if audio_enabled:
        try:
            if pygame.mixer.get_init():
                if pygame.mixer.music.get_busy():
                    pygame.mixer.music.stop()
                pygame.mixer.music.unload()
        except Exception as e:
            logger.error(f"Error stopping speech: {e}")
            # Try to reinitialize mixer on error
            try:
                pygame.mixer.quit()
                pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=4096)
            except:
                pass

def speak_text(text, force=False):
    """Function to speak text in a separate thread with caching"""
    global is_muted
    
    # Only proceed if audio is enabled and not muted or forced
    if audio_enabled and (not is_muted or force):
        try:
            stop_current_speech()  # Stop any existing speech
            
            # Check mute state again in case it changed
            if not is_muted or force:
                cache_path = get_cache_path(text)
                
                # Generate audio file if not in cache
                if not cache_path.exists():
                    generate_speech(text, cache_path)
                
                try:
                    # Ensure mixer is initialized
                    if not pygame.mixer.get_init():
                        pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=4096)
                    
                    # Load and play the audio
                    pygame.mixer.music.load(str(cache_path))
                    pygame.mixer.music.play()
                    logger.debug("Started audio playback")
                    
                    # Wait for audio to finish with timeout
                    start_time = time.time()
                    timeout = 30  # Maximum wait time in seconds
                    
                    while pygame.mixer.music.get_busy():
                        pygame.time.Clock().tick(10)
                        if time.time() - start_time > timeout:
                            logger.warning("Audio playback timed out")
                            break
                            
                    # Ensure cleanup
                    pygame.mixer.music.unload()
                    
                except Exception as e:
                    logger.error(f"Error playing audio: {e}")
                    # Try to reinitialize mixer on error
                    try:
                        pygame.mixer.quit()
                        pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=4096)
                    except:
                        pass
                    
        except Exception as e:
            logger.error(f"Speech error: {e}")

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
    elif request.last_message and audio_enabled:
        # Speak the last message when unmuting
        threading.Thread(target=speak_text, args=(request.last_message, True)).start()
    
    return {"status": "success", "muted": is_muted}

load_dotenv()

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
            
            # Once speech is ready, send the actual message
            pusher.trigger('interview-channel', 'ai-response', {
                'type': 'ai_response',
                'message': cleaned_response,
                'message_id': message_id,
                'speech_ready': audio_enabled
            })
            
            # Then start speaking if audio is enabled
            if audio_enabled:
                stop_current_speech()
                speak_text(cleaned_response)

        speech_thread = threading.Thread(target=speak_and_notify)
        speech_thread.start()
        
        return {"status": "success", "message": "Interview started"}
        
    except Exception as e:
        logger.error(f"Error starting interview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
            
            # Once speech is ready, send the actual message
            pusher.trigger('interview-channel', 'ai-response', {
                'type': 'ai_response',
                'message': cleaned_response,
                'message_id': message_id,
                'speech_ready': audio_enabled
            })
            
            # Then start speaking if audio is enabled
            if audio_enabled:
                stop_current_speech()
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
        return """I sense some frustration, which is completely understandable. Would you like to:
        1. Take a brief moment before continuing
        2. Adjust the interview style or pace
        3. Focus on a different area
        Please let me know your preference."""
    
    return None  # Continue with normal interview flow
