from fastapi import FastAPI
from functions.resume_parser import router as resume_parser_router
from functions.resume_enhancer import router as resume_enhancer_router
from functions.interview_handler import router as interview_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Updated CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://resumifyng.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include all routers
app.include_router(resume_parser_router, prefix="/api")
app.include_router(resume_enhancer_router, prefix="/api")
app.include_router(interview_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
