"""Workflow Integration Tests."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User, DesignAnalysis, DesignDocument, DesignCritique
from app.services.design_analyzer import DesignAnalyzer
from app.services.design_document import DesignDocumentGenerator
from app.services.design_critique import DesignCritiqueEngine, Severity


class TestDesignAnalysisWorkflow:
    """Tests for design analysis workflow."""

    @pytest.mark.asyncio
    async def test_analyze_design_system_creates_record(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """Test that analyzing a design system creates a database record."""
        # Create a temporary directory with some CSS files
        import tempfile
        import os

        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a CSS file with design tokens
            css_content = """
:root {
    --color-primary-500: #3b82f6;
    --color-primary-600: #2563eb;
    --color-neutral-100: #f1f5f9;
    --color-neutral-900: #0f172a;
    --spacing-1: 0.25rem;
    --spacing-4: 1rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    --font-family-sans: system-ui, sans-serif;
}
"""
            css_file = os.path.join(tmpdir, "styles.css")
            with open(css_file, "w") as f:
                f.write(css_content)

            # Create a component file
            component_content = """
export function Button({ children }) {
    return <button className="bg-primary-500 text-white px-4 py-2">{children}</button>;
}
"""
            comp_file = os.path.join(tmpdir, "Button.tsx")
            with open(comp_file, "w") as f:
                f.write(component_content)

            response = await client.post("/api/v1/analyze/design-system", json={
                "name": "Test Design System",
                "source_path": tmpdir,
                "include_llm_explanation": False,
            }, headers=auth_headers)

            assert response.status_code == 201
            data = response.json()
            assert data["name"] == "Test Design System"
            assert data["source_path"] == tmpdir
            assert "type_scale" in data
            assert "color_palette" in data
            assert "spacing" in data
            assert "component_patterns" in data

            # Verify database record
            result = await db_session.execute(
                select(DesignAnalysis).where(DesignAnalysis.id == data["id"])
            )
            analysis = result.scalar_one_or_none()
            assert analysis is not None
            assert analysis.user_id == "test-user-123"

    @pytest.mark.asyncio
    async def test_analyze_nonexistent_path_fails(self, client: AsyncClient, auth_headers: dict):
        """Test that analyzing a nonexistent path fails."""
        response = await client.post("/api/v1/analyze/design-system", json={
            "name": "Test",
            "source_path": "/nonexistent/path/that/does/not/exist",
        }, headers=auth_headers)
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_list_analyses(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
        """Test listing design analyses."""
        # Create test analyses
        for i in range(3):
            analysis = DesignAnalysis(
                user_id="test-user-123",
                name=f"Analysis {i}",
                source_path=f"/tmp/test{i}",
                type_scale={},
                color_palette={},
                spacing={},
                component_patterns={},
                raw_findings={},
            )
            db_session.add(analysis)
        await db_session.commit()

        response = await client.get("/api/v1/analyze/design-system", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3

    @pytest.mark.asyncio
    async def test_get_analysis_by_id(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
        """Test getting a specific analysis by ID."""
        analysis = DesignAnalysis(
            user_id="test-user-123",
            name="Specific Analysis",
            source_path="/tmp/specific",
            type_scale={"base": "1rem"},
            color_palette={},
            spacing={},
            component_patterns={},
            raw_findings={},
        )
        db_session.add(analysis)
        await db_session.commit()
        await db_session.refresh(analysis)

        response = await client.get(f"/api/v1/analyze/design-system/{analysis.id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == analysis.id
        assert data["name"] == "Specific Analysis"

    @pytest.mark.asyncio
    async def test_delete_analysis(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
        """Test deleting an analysis."""
        analysis = DesignAnalysis(
            user_id="test-user-123",
            name="To Delete",
            source_path="/tmp/delete",
            type_scale={},
            color_palette={},
            spacing={},
            component_patterns={},
            raw_findings={},
        )
        db_session.add(analysis)
        await db_session.commit()
        await db_session.refresh(analysis)

        response = await client.delete(f"/api/v1/analyze/design-system/{analysis.id}", headers=auth_headers)
        assert response.status_code == 204

        # Verify deleted
        result = await db_session.execute(
            select(DesignAnalysis).where(DesignAnalysis.id == analysis.id)
        )
        assert result.scalar_one_or_none() is None


class TestDesignDocumentWorkflow:
    """Tests for design document generation workflow."""

    @pytest.mark.asyncio
    async def test_generate_design_document_from_analysis(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """Test generating a DESIGN.md from an analysis."""
        # Create analysis first
        analysis = DesignAnalysis(
            user_id="test-user-123",
            name="Test Analysis",
            source_path="/tmp/test",
            type_scale={
                "base": "1rem",
                "scale": {"xs": "0.75rem", "sm": "0.875rem", "base": "1rem", "lg": "1.125rem"},
                "font_families": {"sans": "system-ui, sans-serif"},
            },
            color_palette={
                "families": {"primary": {"500": "#3b82f6", "600": "#2563eb"}},
                "semantic": {"primary": "#3b82f6", "success": "#10b981"},
            },
            spacing={"base": "0.25rem", "scale": {"1": "0.25rem", "4": "1rem"}},
            component_patterns={"components_found": 5},
            raw_findings={"files_scanned": 10},
        )
        db_session.add(analysis)
        await db_session.commit()
        await db_session.refresh(analysis)

        response = await client.post("/api/v1/generate/design-doc", json={
            "name": "Test DESIGN.md",
            "analysis_id": analysis.id,
            "include_llm_explanation": False,
        }, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test DESIGN.md"
        assert data["analysis_id"] == analysis.id
        assert "content" in data
        assert "Design System Documentation" in data["content"]
        assert "Color Palette" in data["content"]
        assert "Typography" in data["content"]

    @pytest.mark.asyncio
    async def test_generate_design_document_custom_content(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test generating a DESIGN.md from custom content."""
        response = await client.post("/api/v1/generate/design-doc", json={
            "name": "Custom DESIGN.md",
            "custom_content": {
                "type_scale": {"base": "1rem", "scale": {"base": "1rem"}},
                "color_palette": {},
                "spacing": {},
                "component_patterns": {},
                "raw_findings": {},
            },
        }, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Custom DESIGN.md"
        assert data["analysis_id"] is None

    @pytest.mark.asyncio
    async def test_download_design_document(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """Test downloading a design document."""
        document = DesignDocument(
            user_id="test-user-123",
            name="Download Test",
            content="# Test Document\n\nContent here.",
        )
        db_session.add(document)
        await db_session.commit()
        await db_session.refresh(document)

        response = await client.get(f"/api/v1/generate/design-doc/{document.id}/download", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/markdown")
        assert "attachment" in response.headers["content-disposition"]
        content = response.text
        assert "Test Document" in content


class TestDesignCritiqueWorkflow:
    """Tests for design critique workflow."""

    @pytest.mark.asyncio
    async def test_critique_design_from_analysis(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """Test critiquing a design from an analysis."""
        # Create analysis with some issues
        analysis = DesignAnalysis(
            user_id="test-user-123",
            name="Analysis to Critique",
            source_path="/tmp/test",
            type_scale={"base": "1rem", "scale": {"base": "1rem", "huge": "10rem"}},  # Bad scale
            color_palette={"families": {}, "semantic": {}},
            spacing={"base": "0.25rem", "scale": {"1": "0.25rem"}},
            component_patterns={},
            raw_findings={},
        )
        db_session.add(analysis)
        await db_session.commit()
        await db_session.refresh(analysis)

        response = await client.post("/api/v1/critique/design", json={
            "name": "Test Critique",
            "analysis_id": analysis.id,
            "include_llm_explanation": False,
        }, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Critique"
        assert data["analysis_id"] == analysis.id
        assert "findings" in data
        assert "summary" in data
        assert data["summary"]["total_findings"] >= 0

    @pytest.mark.asyncio
    async def test_critique_requires_analysis_or_document(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that critique requires either analysis_id or document_id."""
        response = await client.post("/api/v1/critique/design", json={
            "name": "Invalid Critique",
        }, headers=auth_headers)
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_critique_engine_hard_offset_shadow(self):
        """Test that critique engine detects hard offset shadows."""
        engine = DesignCritiqueEngine({
            "type_scale": {},
            "color_palette": {},
            "spacing": {},
            "component_patterns": {},
        })
        css = ".box { box-shadow: 4px 4px 0 #333; }"
        results = engine.critique(css_content=css)
        assert len(results["findings"]) >= 1
        hard_shadow = next((f for f in results["findings"] if f["rule_id"] == "hard-offset-shadow"), None)
        assert hard_shadow is not None
        assert hard_shadow["severity"] == "advisory"

    @pytest.mark.asyncio
    async def test_critique_engine_dark_glow(self):
        """Test that critique engine detects dark glow."""
        engine = DesignCritiqueEngine({
            "type_scale": {},
            "color_palette": {},
            "spacing": {},
            "component_patterns": {},
        })
        css = ".box { box-shadow: 0 0 32px rgba(0,0,0,0.5); }"
        results = engine.critique(css_content=css)
        dark_glow = next((f for f in results["findings"] if f["rule_id"] == "dark-glow"), None)
        assert dark_glow is not None
        assert dark_glow["severity"] == "warning"

    @pytest.mark.asyncio
    async def test_critique_engine_magic_numbers(self):
        """Test that critique engine detects arbitrary magic numbers."""
        engine = DesignCritiqueEngine({
            "type_scale": {},
            "color_palette": {},
            "spacing": {"scale": {"4": "1rem"}},  # Only 1rem token
            "component_patterns": {},
        })
        css = ".box { margin: 17px; padding: 23px; }"  # Not in tokens
        results = engine.critique(css_content=css)
        magic = [f for f in results["findings"] if f["rule_id"] == "arbitrary-magic-numbers"]
        assert len(magic) >= 1

    @pytest.mark.asyncio
    async def test_critique_engine_color_token_violation(self):
        """Test that critique engine detects hardcoded colors."""
        engine = DesignCritiqueEngine({
            "type_scale": {},
            "color_palette": {"families": {"primary": {"500": "#3b82f6"}}},
            "spacing": {},
            "component_patterns": {},
        })
        css = ".box { color: #ff0000; background: #123456; }"
        results = engine.critique(css_content=css)
        color_violations = [f for f in results["findings"] if f["rule_id"] == "color-token-violation"]
        assert len(color_violations) >= 1

    @pytest.mark.asyncio
    async def test_critique_engine_focus_ring_missing(self):
        """Test that critique engine detects missing focus rings."""
        engine = DesignCritiqueEngine({
            "type_scale": {},
            "color_palette": {},
            "spacing": {},
            "component_patterns": {},
        })
        html = "<button>Click me</button>"
        results = engine.critique(html_content=html)
        focus_missing = next((f for f in results["findings"] if f["rule_id"] == "focus-ring-missing"), None)
        assert focus_missing is not None
        assert focus_missing["severity"] == "error"


    @pytest.mark.asyncio
    async def test_critique_engine_cramped_padding(self):
        """Test that critique engine detects cramped padding."""
        engine = DesignCritiqueEngine({
            "type_scale": {},
            "color_palette": {},
            "spacing": {},
            "component_patterns": {},
        })
        css = ".box { padding: 0; } .card { padding-top: 2px; padding-bottom: 8px; }"
        results = engine.critique(css_content=css)
        cramped = [f for f in results["findings"] if f["rule_id"] == "cramped-padding"]
        assert len(cramped) >= 2
        # Verify severity is ERROR
        for f in cramped:
            assert f["severity"] == "error"

from sqlalchemy import select
