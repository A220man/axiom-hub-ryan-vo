"""Analyze API Routes."""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db_session
from app.core.auth import get_current_active_user, require_analyst
from app.models import User, DesignAnalysis
from app.services.design_analyzer import DesignAnalyzer
from app.api.schemas import (
    DesignAnalysisRequest,
    DesignAnalysisResponse,
    DesignAnalysisListResponse,
    PaginationParams,
    ErrorResponse,
)

router = APIRouter()


@router.post(
    "/design-system",
    response_model=DesignAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["analyze"],
)
async def analyze_design_system(
    request: DesignAnalysisRequest,
    current_user: User = Depends(require_analyst),
    db: AsyncSession = Depends(get_db_session),
) -> DesignAnalysisResponse:
    """Analyze a frontend codebase to extract design system tokens."""
    # Run deterministic analysis
    analyzer = DesignAnalyzer(request.source_path)
    try:
        results = analyzer.analyze()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # LLM explanation (advisory, opt-in)
    llm_explanation = None
    if request.include_llm_explanation:
        llm_explanation = await _generate_llm_explanation(results)

    # Save analysis
    analysis = DesignAnalysis(
        user_id=current_user.id,
        name=request.name,
        source_path=request.source_path,
        type_scale=results["type_scale"],
        color_palette=results["color_palette"],
        spacing=results["spacing"],
        component_patterns=results["component_patterns"],
        raw_findings=results["raw_findings"],
        llm_explanation=llm_explanation,
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    return DesignAnalysisResponse.model_validate(analysis)


@router.get(
    "/design-system",
    response_model=DesignAnalysisListResponse,
    tags=["analyze"],
)
async def list_design_analyses(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> DesignAnalysisListResponse:
    """List design analyses for current user."""
    query = select(DesignAnalysis).where(DesignAnalysis.user_id == current_user.id)
    total_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(total_query)

    query = query.order_by(DesignAnalysis.created_at.desc())
    query = query.offset((pagination.page - 1) * pagination.page_size).limit(pagination.page_size)
    result = await db.execute(query)
    analyses = result.scalars().all()

    return DesignAnalysisListResponse(
        items=[DesignAnalysisResponse.model_validate(a) for a in analyses],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=(total + pagination.page_size - 1) // pagination.page_size,
    )


@router.get(
    "/design-system/{analysis_id}",
    response_model=DesignAnalysisResponse,
    tags=["analyze"],
)
async def get_design_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session),
) -> DesignAnalysisResponse:
    """Get a specific design analysis."""
    result = await db.execute(
        select(DesignAnalysis).where(
            DesignAnalysis.id == analysis_id,
            DesignAnalysis.user_id == current_user.id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )
    return DesignAnalysisResponse.model_validate(analysis)


@router.delete(
    "/design-system/{analysis_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["analyze"],
)
async def delete_design_analysis(
    analysis_id: int,
    current_user: User = Depends(require_analyst),
    db: AsyncSession = Depends(get_db_session),
) -> None:
    """Delete a design analysis."""
    result = await db.execute(
        select(DesignAnalysis).where(
            DesignAnalysis.id == analysis_id,
            DesignAnalysis.user_id == current_user.id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )
    await db.delete(analysis)
    await db.commit()


async def _generate_llm_explanation(results: Dict[str, Any]) -> str:
    """Generate advisory LLM explanation (placeholder - requires LLM_API_KEY)."""
    # This is a placeholder. In production, this would call an LLM provider.
    # The implementation would use the LLM_PROVIDER, LLM_MODEL, LLM_BASE_URL, LLM_API_KEY
    # settings from config. For now, return a deterministic placeholder.
    raw = results.get("raw_findings", {})
    return (
        f"Analysis of {raw.get('files_scanned', 0)} files found "
        f"{raw.get('color_tokens_found', 0)} color tokens, "
        f"{raw.get('spacing_tokens_found', 0)} spacing tokens, and "
        f"{raw.get('typography_tokens_found', 0)} typography tokens. "
        f"{raw.get('component_files', 0)} component files were analyzed. "
        "This explanation is advisory only and generated without an LLM key."
    )