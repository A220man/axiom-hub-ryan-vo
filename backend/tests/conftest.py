"""Backend Test Configuration."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.main import create_app
from app.core.database import Base, get_db_session
from app.core.config import settings
from app.models import User
from app.core.security import create_access_token


# Test database URL (in-memory SQLite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    """Create test database session."""
    async_session = async_sessionmaker(test_engine, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session):
    """Create test client with overridden database dependency."""
    def override_get_db():
        yield db_session

    app = create_app()
    app.dependency_overrides[get_db_session] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def test_user(db_session):
    """Create a test user."""
    user = User(
        id="test-user-123",
        email="test@example.com",
        username="testuser",
        full_name="Test User",
        roles=["analyst"],
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
def auth_headers(test_user):
    """Create authorization headers for test user."""
    token = create_access_token(
        subject=test_user.id,
        email=test_user.email,
        roles=test_user.roles,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
def admin_headers():
    """Create authorization headers for admin user."""
    token = create_access_token(
        subject="admin-123",
        email="admin@example.com",
        roles=["admin"],
    )
    return {"Authorization": f"Bearer {token}"}