from fastapi import FastAPI, HTTPException
from functions.resume_parser import router as resume_parser_router
from functions.resume_enhancer import router as resume_enhancer_router
from functions.interview_handler import router as interview_router
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="ResumifyNG API", version="1.0.0")

# Get allowed origins from environment or use default
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,https://resumifyng.vercel.app").split(",")

# Updated CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

@app.get("/health")
async def health_check():
    """Health check endpoint for Railway deployment"""
    required_env_vars = ["TOGETHER_API_KEY", "PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET", "PUSHER_CLUSTER"]
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    if missing_vars:
        return {"status": "unhealthy", "message": f"Missing environment variables: {', '.join(missing_vars)}"}
    
    return {"status": "healthy"}

# Include all routers
app.include_router(resume_parser_router, prefix="/api")
app.include_router(resume_enhancer_router, prefix="/api")
app.include_router(interview_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
