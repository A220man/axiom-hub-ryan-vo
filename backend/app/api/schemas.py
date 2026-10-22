"""Pydantic Schemas for API Request/Response."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# Health
class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    version: str = "1.0.0"
    environment: str = "development"


# Auth
class TokenRequest(BaseModel):
    """Token exchange request."""
    code: str
    redirect_uri: str
    code_verifier: Optional[str] = None


class TokenResponse(BaseModel):
    """Token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""
    refresh_token: str


class UserResponse(BaseModel):
    """User response."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    roles: List[str] = []
    is_active: bool = True
    created_at: datetime


class OIDCConfigResponse(BaseModel):
    """OIDC configuration for frontend."""
    authorization_endpoint: str
    client_id: str
    scope: str = "openid profile email roles"


# Design Analysis
class DesignAnalysisRequest(BaseModel):
    """Request to analyze a design system."""
    name: str = Field(..., min_length=1, max_length=255)
    source_path: str = Field(..., min_length=1, max_length=500)
    include_llm_explanation: bool = False


class DesignAnalysisResponse(BaseModel):
    """Design analysis response."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    source_path: str
    type_scale: Dict[str, Any] = {}
    color_palette: Dict[str, Any] = {}
    spacing: Dict[str, Any] = {}
    component_patterns: Dict[str, Any] = {}
    raw_findings: Dict[str, Any] = {}
    llm_explanation: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DesignAnalysisListResponse(BaseModel):
    """Paginated design analysis list."""
    items: List[DesignAnalysisResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Design Document
class DesignDocumentRequest(BaseModel):
    """Request to generate a DESIGN.md document."""
    name: str = Field(..., min_length=1, max_length=255)
    analysis_id: Optional[int] = None
    custom_content: Optional[Dict[str, Any]] = None
    include_llm_explanation: bool = False


class DesignDocumentResponse(BaseModel):
    """Design document response."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    analysis_id: Optional[int] = None
    content: str
    format_version: str
    created_at: datetime
    updated_at: datetime


class DesignDocumentListResponse(BaseModel):
    """Paginated design document list."""
    items: List[DesignDocumentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Design Critique
class DesignCritiqueRequest(BaseModel):
    """Request to critique a design."""
    name: str = Field(..., min_length=1, max_length=255)
    analysis_id: Optional[int] = None
    document_id: Optional[int] = None
    include_llm_explanation: bool = False


class DesignCritiqueResponse(BaseModel):
    """Design critique response."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    analysis_id: Optional[int] = None
    document_id: Optional[int] = None
    findings: Dict[str, Any] = {}
    summary: Dict[str, Any] = {}
    llm_explanation: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DesignCritiqueListResponse(BaseModel):
    """Paginated design critique list."""
    items: List[DesignCritiqueResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Pagination
class PaginationParams(BaseModel):
    """Pagination parameters."""
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


# Error
class ErrorResponse(BaseModel):
    """Error response."""
    detail: str
    code: Optional[str] = None