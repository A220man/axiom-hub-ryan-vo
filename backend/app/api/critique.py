"""Critique API Routes."""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db_session
from app.core.auth import get_current_active_user, require_analyst
from app.models import User, DesignAnalysis, DesignDocument, DesignCritique
from app.services.design_critique import DesignCritiqueEngine
from app.api.schemas import (
    DesignCritiqueRequest,
    DesignCritiqueResponse,
    DesignCritiqueListResponse,
    PaginationParams,
)

router = APIRouter()


@router.post(
    "/design",
    response_model=DesignCritiqueResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["critique"],
)
async def critique_design(
    request: DesignCritiqueRequest,
    current_user: User = Depends(require_analyst),
    db: AsyncSession = Depends(get_db_session),
) -> DesignCritiqueResponse:
    """Critique a design against craft floor rules."""
    analysis = None
    document = None

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

    if request.document_id:
        result = await db.execute(
            select(DesignDocument).where(
                DesignDocument.id == request.document_id,
                DesignDocument.user_id == current_user.id,
            )
        )
        document = result.scalar_one_or_none()
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )

    if not analysis and not document:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either analysis_id or document_id must be provided",
        )

    # Prepare analysis data for critique engine
    analysis_data = {}
    if analysis:
        analysis_data = {
            "type_scale": analysis.type_scale,
            "color_palette": analysis.color_palette,
            "spacing": analysis.spacing,
            "component_patterns": analysis.component_patterns,
            "raw_findings": analysis.raw_findings,
            "llm_explanation": analysis.llm_explanation,
        }

    # Run critique
    engine = DesignCritiqueEngine(analysis_data)
    # Note: In a real implementation, we'd pass HTML/CSS content to analyze
    # For now, we critique based on extracted tokens only
    results = engine.critique()

    # LLM explanation (advisory, opt-in)
    llm_explanation = None
    if request.include_llm_explanation:
        llm_explanation = _generate_llm_critique_explanation(results)

    # Save critique
    critique = DesignCritique(
        user_id=current_user.id,
        analysis_id=request.analysis_id,
        document_id=request.document_id,
        name=request.name,
        findings={"items": results["findings"]},
        summary=results["summary"],
        llm_explanation=llm_explanation,
    )
    db.add(critique)
    await db.commit()
    await db.refresh(critique)

    return DesignCritiqueResponse.model_validate(critique)


@router.get(
    "/design",
    response_model=DesignCritiqueListResponse,
    tags=["critique"],
)
async def list_design_critiques(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> DesignCritiqueListResponse:
    """List design critiques for current user."""
    query = select(DesignCritique).where(DesignCritique.user_id == current_user.id)
    total_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(total_query)

    query = query.order_by(DesignCritique.created_at.desc())
    query = query.offset((pagination.page - 1) * pagination.page_size).limit(pagination.page_size)
    result = await db.execute(query)
    critiques = result.scalars().all()

    return DesignCritiqueListResponse(
        items=[DesignCritiqueResponse.model_validate(c) for c in critiques],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=(total + pagination.page_size - 1) // pagination.page_size,
    )


@router.get(
    "/design/{critique_id}",
    response_model=DesignCritiqueResponse,
    tags=["critique"],
)
async def get_design_critique(
    critique_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> DesignCritiqueResponse:
    """Get a specific design critique."""
    result = await db.execute(
        select(DesignCritique).where(
            DesignCritique.id == critique_id,
            DesignCritique.user_id == current_user.id,
        )
    )
    critique = result.scalar_one_or_none()
    if not critique:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Critique not found",
        )
    return DesignCritiqueResponse.model_validate(critique)


@router.delete(
    "/design/{critique_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["critique"],
)
async def delete_design_critique(
    critique_id: int,
    current_user: User = Depends(require_analyst),
    db: AsyncSession = Depends(get_db_session),
) -> None:
    """Delete a design critique."""
    result = await db.execute(
        select(DesignCritique).where(
            DesignCritique.id == critique_id,
            DesignCritique.user_id == current_user.id,
        )
    )
    critique = result.scalar_one_or_none()
    if not critique:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Critique not found",
        )
    await db.delete(critique)
    await db.commit()


def _generate_llm_critique_explanation(results: Dict[str, Any]) -> str:
    """Generate advisory LLM explanation for critique (placeholder)."""
    summary = results.get("summary", {})
    total = summary.get("total_findings", 0)
    by_severity = summary.get("by_severity", {})
    return (
        f"Design critique found {total} total issues: "
        f"{by_severity.get('error', 0)} errors, "
        f"{by_severity.get('warning', 0)} warnings, "
        f"{by_severity.get('advisory', 0)} advisories. "
        "This explanation is advisory only and generated without an LLM key."
    )