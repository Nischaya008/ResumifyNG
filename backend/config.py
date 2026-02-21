import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "ResumifyNG Backend"
    PROJECT_VERSION: str = "1.0.0"
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_EXTENSIONS: set = {".pdf", ".docx", ".tex"}
    UPLOAD_DIR: str = os.path.join(os.getcwd(), "uploads")
    
    # AI Models
    LLM_MODEL: str = "meta-llama/Meta-Llama-3-8B-Instruct"
    HF_API_TOKEN: str = os.getenv("HF_API_TOKEN", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    
    # Razorpay
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")

    # Supabase Admin
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://ezemctappnoeggmuosco.supabase.co")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:5173", # Local dev default
        "http://localhost:3000",
        "https://resumifyng.vercel.app" # Production frontend URL
    ]
settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
