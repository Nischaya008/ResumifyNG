from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from authlib.integrations.httpx_client import AsyncOAuth2Client
from config import settings
import httpx
import secrets

router = APIRouter()

GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET
GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"

oauth_states: dict[str, dict] = {}


async def get_google_provider_config():
    async with httpx.AsyncClient() as client:
        response = await client.get(GOOGLE_DISCOVERY_URL)
        return response.json()


@router.get("/google")
async def google_login(request: Request, redirect_to: str = "/check-auth"):
    """Initiates Google OAuth flow"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    google_config = await get_google_provider_config()
    authorization_endpoint = google_config["authorization_endpoint"]

    state = secrets.token_urlsafe(32)
    oauth_states[state] = {"redirect_to": redirect_to}

    callback_url = str(request.base_url).rstrip('/') + "/api/auth/google/callback"

    client = AsyncOAuth2Client(
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        redirect_uri=callback_url,
        scope="openid email profile"
    )

    authorization_url, _ = client.create_authorization_url(
        authorization_endpoint,
        state=state
    )

    return RedirectResponse(url=authorization_url)


@router.get("/google/callback")
async def google_callback(request: Request, code: str = None, state: str = None, error: str = None):
    """Handles Google OAuth callback and creates Supabase session"""
    if error:
        frontend_url = settings.FRONTEND_URL
        return RedirectResponse(url=f"{frontend_url}/onboard?error={error}")

    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")

    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state")

    state_data = oauth_states.pop(state)
    redirect_to = state_data.get("redirect_to", "/check-auth")

    try:
        google_config = await get_google_provider_config()
        token_endpoint = google_config["token_endpoint"]
        userinfo_endpoint = google_config["userinfo_endpoint"]

        callback_url = str(request.base_url).rstrip('/') + "/api/auth/google/callback"

        client = AsyncOAuth2Client(
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            redirect_uri=callback_url
        )

        token = await client.fetch_token(
            token_endpoint,
            code=code
        )

        async with httpx.AsyncClient() as http_client:
            userinfo_response = await http_client.get(
                userinfo_endpoint,
                headers={"Authorization": f"Bearer {token['access_token']}"}
            )
            userinfo = userinfo_response.json()

        google_email = userinfo.get("email")
        google_name = userinfo.get("name", "")
        google_id = userinfo.get("sub")

        if not google_email:
            raise HTTPException(status_code=400, detail="Failed to get email from Google")

        supabase_session = await create_or_signin_supabase_user(
            email=google_email,
            google_id=google_id,
            full_name=google_name
        )

        frontend_url = settings.FRONTEND_URL
        access_token = supabase_session["access_token"]
        refresh_token = supabase_session["refresh_token"]

        redirect_url = f"{frontend_url}{redirect_to}?access_token={access_token}&refresh_token={refresh_token}"
        return RedirectResponse(url=redirect_url)

    except Exception as e:
        print(f"Google OAuth error: {e}")
        frontend_url = settings.FRONTEND_URL
        return RedirectResponse(url=f"{frontend_url}/onboard?error=oauth_failed")


async def create_or_signin_supabase_user(email: str, google_id: str, full_name: str) -> dict:
    """Creates or signs in a user in Supabase using Admin API"""
    supabase_url = settings.SUPABASE_URL
    service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY

    if not service_role_key:
        raise HTTPException(status_code=500, detail="Supabase service role key not configured")

    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        list_response = await client.get(
            f"{supabase_url}/auth/v1/admin/users",
            headers=headers,
            params={"filter": f"email.eq.{email}"}
        )

        users_data = list_response.json()
        existing_user = None

        if isinstance(users_data, dict) and "users" in users_data:
            for user in users_data["users"]:
                if user.get("email") == email:
                    existing_user = user
                    break
        elif isinstance(users_data, list):
            for user in users_data:
                if user.get("email") == email:
                    existing_user = user
                    break

        if existing_user:
            user_id = existing_user["id"]

            await client.put(
                f"{supabase_url}/auth/v1/admin/users/{user_id}",
                headers=headers,
                json={
                    "email_confirm": True,
                    "user_metadata": {
                        "full_name": full_name,
                        "provider": "google",
                        "google_id": google_id
                    }
                }
            )
        else:
            temp_password = secrets.token_urlsafe(32)
            create_response = await client.post(
                f"{supabase_url}/auth/v1/admin/users",
                headers=headers,
                json={
                    "email": email,
                    "password": temp_password,
                    "email_confirm": True,
                    "user_metadata": {
                        "full_name": full_name,
                        "provider": "google",
                        "google_id": google_id
                    }
                }
            )

            if create_response.status_code >= 400:
                error_detail = create_response.json()
                raise HTTPException(status_code=500, detail=f"Failed to create user: {error_detail}")

            user_data = create_response.json()
            user_id = user_data["id"]

        token_response = await client.post(
            f"{supabase_url}/auth/v1/admin/users/{user_id}/token",
            headers=headers,
            params={"grant_type": "id_token"}
        )

        if token_response.status_code == 404 or token_response.status_code >= 400:
            magic_link_response = await client.post(
                f"{supabase_url}/auth/v1/admin/generate_link",
                headers=headers,
                json={
                    "type": "magiclink",
                    "email": email
                }
            )

            if magic_link_response.status_code >= 400:
                raise HTTPException(status_code=500, detail="Failed to generate session")

            link_data = magic_link_response.json()

            if "access_token" in link_data:
                return {
                    "access_token": link_data["access_token"],
                    "refresh_token": link_data.get("refresh_token", "")
                }

            hashed_token = link_data.get("hashed_token")
            if hashed_token:
                verify_response = await client.post(
                    f"{supabase_url}/auth/v1/verify",
                    headers={"apikey": service_role_key, "Content-Type": "application/json"},
                    json={
                        "type": "magiclink",
                        "token": hashed_token,
                        "email": email
                    }
                )

                if verify_response.status_code < 400:
                    session_data = verify_response.json()
                    return {
                        "access_token": session_data.get("access_token", ""),
                        "refresh_token": session_data.get("refresh_token", "")
                    }

            otp_response = await client.post(
                f"{supabase_url}/auth/v1/otp",
                headers={"apikey": service_role_key, "Content-Type": "application/json"},
                json={
                    "email": email,
                    "create_user": False
                }
            )

            temp_password = secrets.token_urlsafe(32)
            await client.put(
                f"{supabase_url}/auth/v1/admin/users/{user_id}",
                headers=headers,
                json={"password": temp_password}
            )

            signin_response = await client.post(
                f"{supabase_url}/auth/v1/token?grant_type=password",
                headers={"apikey": service_role_key, "Content-Type": "application/json"},
                json={
                    "email": email,
                    "password": temp_password
                }
            )

            if signin_response.status_code >= 400:
                raise HTTPException(status_code=500, detail="Failed to create session")

            session_data = signin_response.json()
            return {
                "access_token": session_data["access_token"],
                "refresh_token": session_data["refresh_token"]
            }

        token_data = token_response.json()
        return {
            "access_token": token_data["access_token"],
            "refresh_token": token_data.get("refresh_token", "")
        }
