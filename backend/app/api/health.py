"""Health Check API Routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db_session
from app.api.schemas import HealthResponse
from app.core.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check(db: AsyncSession = Depends(get_db_session)) -> HealthResponse:
    """Health check endpoint with database connectivity verification."""
    # Verify database connection
    try:
        await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return HealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )


@router.get("/health/ready", tags=["health"])
async def readiness_check(db: AsyncSession = Depends(get_db_session)) -> dict:
    """Readiness check for Kubernetes/container orchestration."""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        return {"status": "not ready", "database": "disconnected", "error": str(e)}


@router.get("/health/live", tags=["health"])
async def liveness_check() -> dict:
    """Liveness check for Kubernetes/container orchestration."""
    return {"status": "alive"}