"""
Profile lifetime metrics API - uses Supabase service role to bypass RLS.
Ensures lifetime_resumes, lifetime_interviews, lifetime_questions are reliably updated.
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import httpx
from config import settings
from api.payment import supabase

router = APIRouter()


class IncrementMetricsRequest(BaseModel):
    """Request body for incrementing profile metrics."""
    resumes: int = 0
    interviews: int = 0
    questions: int = 0


async def _get_user_id_from_token(authorization: Optional[str]) -> Optional[str]:
    """Validate Bearer token and return user ID."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        return None
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY or "",
                },
            )
            if r.status_code == 200:
                data = r.json()
                return data.get("id")
    except Exception:
        pass
    return None


@router.post("/increment-metrics")
async def increment_profile_metrics(
    body: IncrementMetricsRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Increment lifetime metrics for the authenticated user.
    Requires Authorization: Bearer <supabase_access_token>.
    Uses service role to bypass RLS and reliably update profiles.
    """
    user_id = await _get_user_id_from_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or missing authorization")

    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    if body.resumes == 0 and body.interviews == 0 and body.questions == 0:
        return {"status": "ok", "message": "Nothing to increment"}

    try:
        # Fetch current values
        resp = supabase.table("profiles").select(
            "lifetime_resumes, lifetime_interviews, lifetime_questions"
        ).eq("id", user_id).execute()

        row = resp.data[0] if resp.data else None
        if not row:
            # Profile doesn't exist - create with initial values (auth trigger may not have run)
            supabase.table("profiles").upsert({
                "id": user_id,
                "membership_tier": "guest",
                "lifetime_resumes": max(0, body.resumes),
                "lifetime_interviews": max(0, body.interviews),
                "lifetime_questions": max(0, body.questions),
            }).execute()
        else:
            new_resumes = (row.get("lifetime_resumes") or 0) + body.resumes
            new_interviews = (row.get("lifetime_interviews") or 0) + body.interviews
            new_questions = (row.get("lifetime_questions") or 0) + body.questions

            supabase.table("profiles").update({
                "lifetime_resumes": new_resumes,
                "lifetime_interviews": new_interviews,
                "lifetime_questions": new_questions,
            }).eq("id", user_id).execute()

        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
