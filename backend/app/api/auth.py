"""Authentication API Routes."""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from urllib.parse import urlencode
import secrets
import httpx

from app.core.database import get_db_session
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_token,
    TokenData,
)
from app.core.auth import get_current_user, oidc_config
from app.models import User
from app.api.schemas import (
    TokenRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserResponse,
    OIDCConfigResponse,
    ErrorResponse,
)

router = APIRouter()


@router.get("/config", response_model=OIDCConfigResponse, tags=["auth"])
async def get_oidc_config() -> OIDCConfigResponse:
    """Get OIDC configuration for frontend PKCE flow."""
    return OIDCConfigResponse(
        authorization_endpoint=oidc_config.authorization_endpoint,
        client_id=oidc_config.client_id,
    )


@router.get("/login", tags=["auth"])
async def login_redirect(
    redirect_uri: str,
    state: str,
    code_challenge: str,
    code_challenge_method: str = "S256",
) -> RedirectResponse:
    """Initiate OIDC authorization code flow with PKCE."""
    # Validate redirect_uri against allowed origins
    allowed = any(redirect_uri.startswith(origin) for origin in settings.CORS_ORIGINS)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid redirect_uri",
        )

    params = {
        "client_id": oidc_config.client_id,
        "response_type": "code",
        "scope": "openid profile email roles",
        "redirect_uri": redirect_uri,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": code_challenge_method,
    }

    auth_url = f"{oidc_config.authorization_endpoint}?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.post("/callback", response_model=TokenResponse, tags=["auth"])
async def oidc_callback(
    request: TokenRequest,
    db: AsyncSession = Depends(get_db_session),
) -> TokenResponse:
    """Exchange authorization code for tokens."""
    # Exchange code for tokens at Keycloak
    async with httpx.AsyncClient(timeout=30.0) as client:
        token_data = {
            "grant_type": "authorization_code",
            "code": request.code,
            "redirect_uri": request.redirect_uri,
            "client_id": oidc_config.client_id,
        }
        if oidc_config.client_secret:
            token_data["client_secret"] = oidc_config.client_secret
        if request.code_verifier:
            token_data["code_verifier"] = request.code_verifier

        response = await client.post(
            oidc_config.token_endpoint,
            data=token_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token exchange failed",
            )

        tokens = response.json()

    # Get user info from Keycloak
    access_token = tokens.get("access_token")
    async with httpx.AsyncClient(timeout=30.0) as client:
        userinfo_response = await client.get(
            oidc_config.userinfo_endpoint,
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch user info",
            )

        userinfo = userinfo_response.json()

    # Extract user data
    sub = userinfo.get("sub")
    email = userinfo.get("email")
    username = userinfo.get("preferred_username", email.split("@")[0] if email else sub)
    full_name = userinfo.get("name")
    roles = userinfo.get("realm_access", {}).get("roles", ["viewer"])

    if not sub or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incomplete user info from IdP",
        )

    # Get or create user
    result = await db.execute(select(User).where(User.id == sub))
    user = result.scalar_one_or_none()

    if user:
        user.email = email
        user.username = username
        user.full_name = full_name
        user.roles = roles
        user.last_login = datetime.now(timezone.utc)
    else:
        user = User(
            id=sub,
            email=email,
            username=username,
            full_name=full_name,
            roles=roles,
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)

    # Create application tokens
    app_access_token = create_access_token(
        subject=user.id,
        email=user.email,
        roles=user.roles,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    app_refresh_token = create_refresh_token(subject=user.id, email=user.email)

    return TokenResponse(
        access_token=app_access_token,
        refresh_token=app_refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse, tags=["auth"])
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db_session),
) -> TokenResponse:
    """Refresh access token using refresh token."""
    token_data = verify_token(request.refresh_token)
    if not token_data or token_data.type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    result = await db.execute(select(User).where(User.id == token_data.sub))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    app_access_token = create_access_token(
        subject=user.id,
        email=user.email,
        roles=user.roles,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    app_refresh_token = create_refresh_token(subject=user.id, email=user.email)

    return TokenResponse(
        access_token=app_access_token,
        refresh_token=app_refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=UserResponse, tags=["auth"])
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Get current user information."""
    return UserResponse.model_validate(current_user)


@router.post("/logout", tags=["auth"])
async def logout(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Logout endpoint (client should discard tokens)."""
    # In a full implementation, this would also call Keycloak end_session_endpoint
    return {"message": "Logged out successfully"}


from datetime import timezone