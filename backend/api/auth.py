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
        user_id = None
        
        # First, try to find existing user by listing all users and filtering
        list_response = await client.get(
            f"{supabase_url}/auth/v1/admin/users",
            headers=headers
        )
        
        if list_response.status_code == 200:
            users_data = list_response.json()
            users_list = users_data.get("users", []) if isinstance(users_data, dict) else users_data
            
            for user in users_list:
                if user.get("email", "").lower() == email.lower():
                    user_id = user["id"]
                    print(f"Found existing user: {user_id}")
                    break
        
        # If user not found, try to create
        if not user_id:
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
            
            if create_response.status_code < 400:
                user_data = create_response.json()
                user_id = user_data["id"]
                print(f"Created new user: {user_id}")
            else:
                error_data = create_response.json()
                # If email exists error, we need to find the user another way
                if error_data.get("error_code") == "email_exists":
                    print(f"User exists but wasn't found in list, searching again...")
                    # Try pagination - get more users
                    page = 1
                    per_page = 1000
                    while not user_id:
                        paginated_response = await client.get(
                            f"{supabase_url}/auth/v1/admin/users",
                            headers=headers,
                            params={"page": page, "per_page": per_page}
                        )
                        if paginated_response.status_code != 200:
                            break
                        
                        paginated_data = paginated_response.json()
                        users_list = paginated_data.get("users", []) if isinstance(paginated_data, dict) else paginated_data
                        
                        if not users_list:
                            break
                            
                        for user in users_list:
                            if user.get("email", "").lower() == email.lower():
                                user_id = user["id"]
                                print(f"Found user on page {page}: {user_id}")
                                break
                        
                        if user_id or len(users_list) < per_page:
                            break
                        page += 1
                else:
                    raise HTTPException(status_code=500, detail=f"Failed to create user: {error_data}")
        
        if not user_id:
            raise HTTPException(status_code=500, detail="Could not find or create user")
        
        # Update user metadata
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
        
        # Generate session using password sign-in method
        # Set a temporary password and sign in with it
        temp_password = secrets.token_urlsafe(32)
        
        update_response = await client.put(
            f"{supabase_url}/auth/v1/admin/users/{user_id}",
            headers=headers,
            json={"password": temp_password}
        )
        
        if update_response.status_code >= 400:
            print(f"Failed to update password: {update_response.json()}")
            raise HTTPException(status_code=500, detail="Failed to prepare authentication")
        
        # Sign in with the temporary password to get tokens
        signin_response = await client.post(
            f"{supabase_url}/auth/v1/token?grant_type=password",
            headers={"apikey": service_role_key, "Content-Type": "application/json"},
            json={
                "email": email,
                "password": temp_password
            }
        )
        
        if signin_response.status_code >= 400:
            print(f"Sign in failed: {signin_response.json()}")
            raise HTTPException(status_code=500, detail="Failed to create session")
        
        session_data = signin_response.json()
        return {
            "access_token": session_data["access_token"],
            "refresh_token": session_data["refresh_token"]
        }
