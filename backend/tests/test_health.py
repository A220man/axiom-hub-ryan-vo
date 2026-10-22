"""Health Endpoint Tests."""

import pytest
from httpx import AsyncClient


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient):
        """Test basic health check endpoint."""
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["healthy", "degraded"]
        assert "version" in data
        assert "environment" in data

    @pytest.mark.asyncio
    async def test_readiness_check(self, client: AsyncClient):
        """Test readiness check endpoint."""
        response = await client.get("/api/v1/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["ready", "not ready"]
        assert "database" in data

    @pytest.mark.asyncio
    async def test_liveness_check(self, client: AsyncClient):
        """Test liveness check endpoint."""
        response = await client.get("/api/v1/health/live")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "alive"