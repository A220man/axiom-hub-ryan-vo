# Product development plan

Each round completes one feature or repair. Future items are planned, not implemented claims.

## Current round

core-skeleton

## Roadmap

### core-skeleton — Core FastAPI/React skeleton with auth, DB, and one workflow

Status: done

Acceptance:
- FastAPI backend with SQLite, OIDC Keycloak auth, and /health endpoint
- React + TypeScript + Vite frontend with login page and dashboard
- CI workflow running backend tests, frontend build/test, and Docker builds
- portfolio.json, README, LICENSE, CHANGELOG, .env.example, .gitignore
- At least 12 backend tests and 3 frontend tests passing

Implementation: `backend/app/main.py`, `backend/app/api/`, `backend/app/services/`, `backend/app/models/`, `backend/app/core/`, `backend/tests/`, `frontend/src/`, `frontend/package.json`, `compose.yaml`, `.github/workflows/ci.yml`

Tests: `backend/tests/test_health.py`, `backend/tests/test_auth.py`, `backend/tests/test_workflow.py`, `frontend/src/__tests__/`

### design-system-analysis — Design system analysis workflow (AI/ML domain engine)

Status: done

Acceptance:
- POST /api/v1/analyze/design-system extracts tokens from frontend codebase
- Returns type scale, color palette, spacing, component patterns
- Deterministic offline core works without LLM key
- LLM explanations opt-in, labeled advisory, grounded in actual records

Implementation: `backend/app/services/design_analyzer.py`, `backend/app/api/analyze.py`, `frontend/src/pages/AnalyzePage.tsx`, `frontend/src/pages/AnalyzeDetailPage.tsx`

Tests: `backend/tests/test_workflow.py::TestDesignAnalysisWorkflow`, `frontend/src/__tests__/AnalyzePage.test.tsx`

### design-document-generation — DESIGN.md document generation workflow

Status: done

Acceptance:
- POST /api/v1/generate/design-doc creates DESIGN.md from analysis
- Follows 8-section format with token schema
- Export and download workflow in UI

Implementation: `backend/app/services/design_document.py`, `backend/app/api/generate.py`, `frontend/src/pages/DocumentsPage.tsx`, `frontend/src/pages/DocumentDetailPage.tsx`

Tests: `backend/tests/test_workflow.py::TestDesignDocumentWorkflow`, `frontend/src/__tests__/DashboardPage.test.tsx`

### design-critique-workflow — Design critique and improvement workflow

Status: done

Acceptance:
- POST /api/v1/critique/design evaluates against craft floor rules
- Returns actionable findings with severity and fix guidance
- UI shows findings with accept/reject per issue

Implementation: `backend/app/services/design_critique.py`, `backend/app/api/critique.py`, `frontend/src/pages/CritiquesPage.tsx`, `frontend/src/pages/CritiqueDetailPage.tsx`

Tests: `backend/tests/test_workflow.py::TestDesignCritiqueWorkflow`, `frontend/src/__tests__/DashboardPage.test.tsx`

