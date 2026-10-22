"""Authentication Dependencies and OIDC Integration."""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db_session
from app.core.security import verify_token, TokenData
from app.models import User

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db_session),
) -> User:
    """Get current authenticated user from JWT token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = verify_token(credentials.credentials)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == token_data.sub))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current active user (alias for clarity)."""
    return current_user


def require_roles(*allowed_roles: str):
    """Dependency factory for role-based access control."""
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if not any(role in current_user.roles for role in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return role_checker


# Role dependencies
require_admin = require_roles("admin")
require_operator = require_roles("admin", "operator")
require_analyst = require_roles("admin", "operator", "analyst")
require_viewer = require_roles("admin", "operator", "analyst", "viewer")


class OIDCConfig:
    """Keycloak OIDC Configuration."""

    def __init__(self):
        from app.core.config import settings
        self.issuer = f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}"
        self.authorization_endpoint = f"{self.issuer}/protocol/openid-connect/auth"
        self.token_endpoint = f"{self.issuer}/protocol/openid-connect/token"
        self.jwks_uri = f"{self.issuer}/protocol/openid-connect/certs"
        self.userinfo_endpoint = f"{self.issuer}/protocol/openid-connect/userinfo"
        self.end_session_endpoint = f"{self.issuer}/protocol/openid-connect/logout"
        self.client_id = settings.KEYCLOAK_CLIENT_ID
        self.client_secret = settings.KEYCLOAK_CLIENT_SECRET


oidc_config = OIDCConfig()