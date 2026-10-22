"""Generate API Routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi.responses import StreamingResponse
import io

from app.core.database import get_db_session
from app.core.auth import get_current_active_user, require_analyst
from app.models import User, DesignAnalysis, DesignDocument
from app.services.design_document import DesignDocumentGenerator
from app.api.schemas import (
    DesignDocumentRequest,
    DesignDocumentResponse,
    DesignDocumentListResponse,
    PaginationParams,
)

router = APIRouter()


@router.post(
    "/design-doc",
    response_model=DesignDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["generate"],
)
async def generate_design_document(
    request: DesignDocumentRequest,
    current_user: User = Depends(require_analyst),
    db: AsyncSession = Depends(get_db_session),
) -> DesignDocumentResponse:
    """Generate a DESIGN.md document from analysis or custom content."""
    analysis = None
    if request.analysis_id:
        result = await db.execute(
            select(DesignAnalysis).where(
                DesignAnalysis.id == request.analysis_id,
                DesignAnalysis.user_id == current_user.id,
            )
        )
        analysis = result.scalar_one_or_none()
        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found",
            )

    # Prepare analysis data for generator
    analysis_data = {
        "source_path": analysis.source_path if analysis else "custom",
        "type_scale": analysis.type_scale if analysis else request.custom_content.get("type_scale", {}),
        "color_palette": analysis.color_palette if analysis else request.custom_content.get("color_palette", {}),
        "spacing": analysis.spacing if analysis else request.custom_content.get("spacing", {}),
        "component_patterns": analysis.component_patterns if analysis else request.custom_content.get("component_patterns", {}),
        "raw_findings": analysis.raw_findings if analysis else request.custom_content.get("raw_findings", {}),
        "llm_explanation": analysis.llm_explanation if analysis else None,
    }

    # Generate document
    generator = DesignDocumentGenerator(analysis_data, request.custom_content)
    content = generator.generate(include_llm_explanation=request.include_llm_explanation)

    # Save document
    document = DesignDocument(
        user_id=current_user.id,
        analysis_id=request.analysis_id,
        name=request.name,
        content=content,
        format_version="1.0",
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    return DesignDocumentResponse.model_validate(document)


@router.get(
    "/design-doc",
    response_model=DesignDocumentListResponse,
    tags=["generate"],
)
async def list_design_documents(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> DesignDocumentListResponse:
    """List design documents for current user."""
    query = select(DesignDocument).where(DesignDocument.user_id == current_user.id)
    total_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(total_query)

    query = query.order_by(DesignDocument.created_at.desc())
    query = query.offset((pagination.page - 1) * pagination.page_size).limit(pagination.page_size)
    result = await db.execute(query)
    documents = result.scalars().all()

    return DesignDocumentListResponse(
        items=[DesignDocumentResponse.model_validate(d) for d in documents],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=(total + pagination.page_size - 1) // pagination.page_size,
    )


@router.get(
    "/design-doc/{document_id}",
    response_model=DesignDocumentResponse,
    tags=["generate"],
)
async def get_design_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> DesignDocumentResponse:
    """Get a specific design document."""
    result = await db.execute(
        select(DesignDocument).where(
            DesignDocument.id == document_id,
            DesignDocument.user_id == current_user.id,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    return DesignDocumentResponse.model_validate(document)


@router.get(
    "/design-doc/{document_id}/download",
    tags=["generate"],
)
async def download_design_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> StreamingResponse:
    """Download a design document as a file."""
    result = await db.execute(
        select(DesignDocument).where(
            DesignDocument.id == document_id,
            DesignDocument.user_id == current_user.id,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    file_content = document.content.encode("utf-8")
    file_like = io.BytesIO(file_content)

    return StreamingResponse(
        file_like,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{document.name}.md"'},
    )


@router.delete(
    "/design-doc/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["generate"],
)
async def delete_design_document(
    document_id: int,
    current_user: User = Depends(require_analyst),
    db: AsyncSession = Depends(get_db_session),
) -> None:
    """Delete a design document."""
    result = await db.execute(
        select(DesignDocument).where(
            DesignDocument.id == document_id,
            DesignDocument.user_id == current_user.id,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    await db.delete(document)
    await db.commit()