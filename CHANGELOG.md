# Changelog

## 1.5.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.4.1 — work-in-progress checkpoint

- Fixed deterministic token sorting in DESIGN.md generation
  - The `_generate_tokens_reference` method in `backend/app/services/design_document.py` now uses `sorted()` with `_spacing_sort_key` for typography tokens, ensuring consistent alphabetical ordering across runs
  - Previously, typography tokens were output in insertion order, causing non-deterministic DESIGN.md output

## 1.4.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.
