"""Security Utilities: Password Hashing, JWT, OIDC."""

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenData(BaseModel):
    """JWT token payload."""
    sub: str
    email: str
    roles: list[str] = []
    exp: int
    iat: int
    nonce: Optional[str] = None
    type: Optional[str] = None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(
    subject: str,
    email: str,
    roles: list[str],
    expires_delta: Optional[timedelta] = None,
    nonce: Optional[str] = None,
) -> str:
    """Create a JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": subject,
        "email": email,
        "roles": roles,
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
    }
    if nonce:
        to_encode["nonce"] = nonce

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: str, email: str) -> str:
    """Create a JWT refresh token."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode = {
        "sub": subject,
        "email": email,
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "type": "refresh",
    }

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return TokenData(**payload)
    except JWTError:
        return None


def verify_token(token: str) -> Optional[TokenData]:
    """Verify token and check expiration."""
    token_data = decode_token(token)
    if not token_data:
        return None
    if datetime.now(timezone.utc).timestamp() > token_data.exp:
        return None
    return token_data