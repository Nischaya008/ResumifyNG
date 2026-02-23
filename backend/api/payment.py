import uuid
import razorpay
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from config import settings
from supabase import create_client, Client
import hmac
import hashlib
from datetime import datetime, timedelta, timezone

router = APIRouter()

# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID or "dummy", settings.RAZORPAY_KEY_SECRET or "dummy"))

# Initialize Supabase Admin client
if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
    supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
else:
    supabase = None

class OrderRequest(BaseModel):
    amount: int  # in INR (Rs 50 = amount: 50)
    currency: str = "INR"

class VerificationRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    user_id: str

@router.post("/create-order")
async def create_order(request: OrderRequest):
    try:
        data = {
            "amount": request.amount * 100,  # Razorpay expects amount in paise
            "currency": request.currency,
            "receipt": f"rng_{uuid.uuid4().hex[:24]}",  # Must be unique per order (max 40 chars)
        }
        order = razorpay_client.order.create(data=data)
        return {"order_id": order["id"], "amount": order["amount"], "currency": order["currency"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify")
async def verify_payment(request: VerificationRequest):
    try:
        # Verify Payment Signature
        generated_signature = hmac.new(
            bytes(settings.RAZORPAY_KEY_SECRET, 'utf-8'),
            bytes(request.razorpay_order_id + "|" + request.razorpay_payment_id, 'utf-8'),
            hashlib.sha256
        ).hexdigest()

        if generated_signature != request.razorpay_signature:
            raise HTTPException(status_code=400, detail="Invalid payment signature")

        # Payment is valid, update user in Supabase
        if not supabase:
            raise HTTPException(status_code=500, detail="Supabase admin client not configured")
        
        # Calculate expiry 1 year from now
        expiry_date = datetime.now(timezone.utc) + timedelta(days=365)
        expiry_str = expiry_date.isoformat()

        # Update profile membership
        response = supabase.table("profiles").update({
            "membership_tier": "member",
            "membership_expiry": expiry_str
        }).eq("id", request.user_id).execute()

        # If data is empty, it means the profile record might not have updated
        if not response.data:
            # Upsert just in case the trigger didn't run
            supabase.table("profiles").upsert({
                "id": request.user_id,
                "membership_tier": "member",
                "membership_expiry": expiry_str
            }).execute()

        return {"status": "success", "message": "Membership activated"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
