from fastapi import FastAPI, HTTPException
from functions.resume_parser import router as resume_parser_router
from functions.resume_enhancer import router as resume_enhancer_router
from functions.interview_handler import router as interview_router
from fastapi.middleware.cors import CORSMiddleware
import os
import razorpay
from fastapi import Request

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

# Razorpay credentials from environment variables
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "YOUR_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "YOUR_KEY_SECRET")
client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

@app.head("/health")
@app.get("/health")
async def health_check():
    """Health check endpoint for Railway deployment and UptimeRobot monitoring"""
    required_env_vars = ["TOGETHER_API_KEY", "PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET", "PUSHER_CLUSTER"]
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    response = {"status": "healthy"} if not missing_vars else {"status": "unhealthy", "message": f"Missing environment variables: {', '.join(missing_vars)}"}
    
    # Return same response for both HEAD and GET
    return response

# Include all routers
app.include_router(resume_parser_router, prefix="/api")
app.include_router(resume_enhancer_router, prefix="/api")
app.include_router(interview_router, prefix="/api")

@app.post("/api/create-order")
async def create_order():
    order = client.order.create({
        "amount": 1900,  # 19 INR in paise
        "currency": "INR",
        "payment_capture": 1
    })
    return {"orderId": order["id"], "key": RAZORPAY_KEY_ID}

@app.post("/api/verify-payment")
async def verify_payment(request: Request):
    data = await request.json()
    try:
        client.utility.verify_payment_signature({
            'razorpay_order_id': data['razorpay_order_id'],
            'razorpay_payment_id': data['razorpay_payment_id'],
            'razorpay_signature': data['razorpay_signature']
        })
        # Here you would mark the user as paid in your DB/session
        return {"status": "success"}
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Payment verification failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
