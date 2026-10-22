"""Application Configuration."""

from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    APP_NAME: str = "axiom-hub-ryan-vo"
    APP_VERSION: str = "1.0.0"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/axiom.db"

    # Security
    SECRET_KEY: str = "dev-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Keycloak / OIDC
    KEYCLOAK_URL: str = "http://localhost:8080"
    KEYCLOAK_REALM: str = "axiom"
    KEYCLOAK_CLIENT_ID: str = "axiom-frontend"
    KEYCLOAK_CLIENT_SECRET: str = ""
    KEYCLOAK_ADMIN_USER: str = "admin"
    KEYCLOAK_ADMIN_PASSWORD: str = "admin"

    # LLM Provider (optional)
    LLM_PROVIDER: str = "openai-compatible"
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_BASE_URL: str = "https://api.openai.com/v1"
    LLM_API_KEY: str = ""

    # Redis (for sessions/caching)
    REDIS_URL: str = "redis://localhost:6379/0"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()