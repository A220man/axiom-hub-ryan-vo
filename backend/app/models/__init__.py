"""Database Models."""

from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Text, DateTime, Boolean, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON

from app.core.database import Base


class User(Base):
    """User model with OIDC integration."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    roles: Mapped[List[str]] = mapped_column(SQLiteJSON, default=["viewer"], nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    analyses: Mapped[List["DesignAnalysis"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    documents: Mapped[List["DesignDocument"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    critiques: Mapped[List["DesignCritique"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    audit_logs: Mapped[List["AuditLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class DesignAnalysis(Base):
    """Design system analysis results."""
    __tablename__ = "design_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_path: Mapped[str] = mapped_column(String(500), nullable=False)
    type_scale: Mapped[dict] = mapped_column(SQLiteJSON, default=dict, nullable=False)
    color_palette: Mapped[dict] = mapped_column(SQLiteJSON, default=dict, nullable=False)
    spacing: Mapped[dict] = mapped_column(SQLiteJSON, default=dict, nullable=False)
    component_patterns: Mapped[dict] = mapped_column(SQLiteJSON, default=dict, nullable=False)
    raw_findings: Mapped[dict] = mapped_column(SQLiteJSON, default=dict, nullable=False)
    llm_explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="analyses")


class DesignDocument(Base):
    """Generated DESIGN.md documents."""
    __tablename__ = "design_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    analysis_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("design_analyses.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    format_version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="documents")
    analysis: Mapped[Optional["DesignAnalysis"]] = relationship()


class DesignCritique(Base):
    """Design critique findings."""
    __tablename__ = "design_critiques"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    analysis_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("design_analyses.id"), nullable=True)
    document_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("design_documents.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    findings: Mapped[dict] = mapped_column(SQLiteJSON, default=dict, nullable=False)
    summary: Mapped[dict] = mapped_column(SQLiteJSON, default=dict, nullable=False)
    llm_explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="critiques")
    analysis: Mapped[Optional["DesignAnalysis"]] = relationship()
    document: Mapped[Optional["DesignDocument"]] = relationship()


class AuditLog(Base):
    """Audit log for security-relevant events."""
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    resource_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    result: Mapped[str] = mapped_column(String(20), nullable=False)  # success, failure
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    details: Mapped[dict] = mapped_column(SQLiteJSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    user: Mapped[Optional["User"]] = relationship(back_populates="audit_logs")