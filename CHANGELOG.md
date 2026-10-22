# Changelog

## 1.0.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-22

### Added
- Initial release of axiom-hub-ryan-vo
- Design System Analysis workflow: deterministic extraction of type scale, color palette, spacing, and component patterns from frontend codebases
- DESIGN.md Generation workflow: standardized 8-section documentation format with token schema
- Design Critique workflow: evaluation against craft floor rules (cramped-padding, hard-offset-shadow, dark-glow, insufficient-contrast, inconsistent-radius, arbitrary-magic-numbers, type-scale-violation, color-token-violation, spacing-token-violation, focus-ring-missing)
- OIDC authentication via Keycloak with PKCE, roles (admin/operator/analyst/viewer)
- React + TypeScript + Vite frontend with responsive dashboard
- FastAPI backend with SQLite, REST API, and OpenAPI docs
- Docker Compose deployment with Keycloak, Redis, and persistent volumes
- Comprehensive test suite (12+ backend tests, 3+ frontend tests)
- CI/CD pipeline with backend tests, frontend typecheck/build/tests, Docker builds

### Security
- JWT-based authentication with short-lived access tokens and refresh tokens
- Role-based access control on all data endpoints
- Secure OIDC flow with state, nonce, and PKCE
- No hardcoded secrets or credentials

### AI/ML
- Deterministic offline core for design analysis (no LLM required)
- Advisory LLM explanations (opt-in, labeled, grounded in actual records)
- Support for multiple LLM providers (OpenAI-compatible, Anthropic, Gemini, Ollama)