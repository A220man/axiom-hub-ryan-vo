"""Design Analysis Service - Deterministic Offline Core."""

import os
import re
from pathlib import Path
from typing import Dict, List, Any, Optional
from collections import Counter
import json


class DesignAnalyzer:
    """Analyzes frontend codebases to extract design systems deterministically."""

    # CSS custom property patterns
    COLOR_PATTERN = re.compile(r'--color-[\w-]+:\s*([^;]+);')
    SPACING_PATTERN = re.compile(r'--spacing-[\w-]+:\s*([^;]+);')
    FONT_SIZE_PATTERN = re.compile(r'--font-size-[\w-]+:\s*([^;]+);')
    FONT_FAMILY_PATTERN = re.compile(r'--font-family-[\w-]+:\s*([^;]+);')

    # Tailwind-like patterns
    TAILWIND_COLOR = re.compile(r'(bg|text|border|fill|stroke)-([\w-]+)-(\d+)')
    TAILWIND_SPACING = re.compile(r'(p|m|gap|space)-([xy]?)-(\d+)')
    TAILWIND_FONT = re.compile(r'text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)')

    # Component patterns
    COMPONENT_FILE_PATTERN = re.compile(r'(component|Component)\.(tsx?|jsx?|vue|svelte)$')

    def __init__(self, source_path: str):
        self.source_path = Path(source_path).resolve()
        self.files_scanned = 0
        self.css_files = 0
        self.component_files = 0

    def analyze(self) -> Dict[str, Any]:
        """Run full design system analysis."""
        if not self.source_path.exists():
            raise ValueError(f"Source path does not exist: {self.source_path}")

        # Scan files
        all_files = list(self.source_path.rglob("*"))
        self.files_scanned = len([f for f in all_files if f.is_file()])

        # Extract tokens from CSS/SCSS files
        color_tokens = self._extract_color_tokens()
        spacing_tokens = self._extract_spacing_tokens()
        typography_tokens = self._extract_typography_tokens()

        # Extract component patterns
        component_patterns = self._extract_component_patterns()

        # Build type scale from findings
        type_scale = self._build_type_scale(typography_tokens)

        # Build color palette
        color_palette = self._build_color_palette(color_tokens)

        # Build spacing scale
        spacing = self._build_spacing_scale(spacing_tokens)

        return {
            "type_scale": type_scale,
            "color_palette": color_palette,
            "spacing": spacing,
            "component_patterns": component_patterns,
            "raw_findings": {
                "files_scanned": self.files_scanned,
                "css_files": self.css_files,
                "component_files": self.component_files,
                "color_tokens_found": len(color_tokens),
                "spacing_tokens_found": len(spacing_tokens),
                "typography_tokens_found": len(typography_tokens),
            },
        }

    def _extract_color_tokens(self) -> Dict[str, str]:
        """Extract color tokens from CSS custom properties and Tailwind classes."""
        tokens = {}

        for file_path in self.source_path.rglob("*.css"):
            self.css_files += 1
            try:
                content = file_path.read_text(encoding="utf-8")
                for match in self.COLOR_PATTERN.finditer(content):
                    name = match.group(0).split(":")[0].strip()
                    value = match.group(1).strip()
                    tokens[name] = value
            except Exception:
                continue

        for file_path in self.source_path.rglob("*.scss"):
            self.css_files += 1
            try:
                content = file_path.read_text(encoding="utf-8")
                for match in self.COLOR_PATTERN.finditer(content):
                    name = match.group(0).split(":")[0].strip()
                    value = match.group(1).strip()
                    tokens[name] = value
            except Exception:
                continue

        # Also scan JS/TS/JSX/TSX for Tailwind color classes
        for ext in ["*.js", "*.ts", "*.jsx", "*.tsx", "*.vue", "*.svelte"]:
            for file_path in self.source_path.rglob(ext):
                try:
                    content = file_path.read_text(encoding="utf-8")
                    for match in self.TAILWIND_COLOR.finditer(content):
                        prefix, color, shade = match.groups()
                        tokens[f"--tw-{prefix}-{color}-{shade}"] = f"{color}-{shade}"
                except Exception:
                    continue

        return tokens

    def _extract_spacing_tokens(self) -> Dict[str, str]:
        """Extract spacing tokens from CSS custom properties and Tailwind classes."""
        tokens = {}

        for file_path in self.source_path.rglob("*.css"):
            try:
                content = file_path.read_text(encoding="utf-8")
                for match in self.SPACING_PATTERN.finditer(content):
                    name = match.group(0).split(":")[0].strip()
                    value = match.group(1).strip()
                    tokens[name] = value
            except Exception:
                continue

        for ext in ["*.js", "*.ts", "*.jsx", "*.tsx", "*.vue", "*.svelte"]:
            for file_path in self.source_path.rglob(ext):
                try:
                    content = file_path.read_text(encoding="utf-8")
                    for match in self.TAILWIND_SPACING.finditer(content):
                        prop, axis, value = match.groups()
                        tokens[f"--tw-{prop}{axis or ''}-{value}"] = f"{value} * 0.25rem"
                except Exception:
                    continue

        return tokens

    def _extract_typography_tokens(self) -> Dict[str, str]:
        """Extract typography tokens from CSS custom properties and Tailwind classes."""
        tokens = {"font_sizes": {}, "font_families": {}}

        for file_path in self.source_path.rglob("*.css"):
            try:
                content = file_path.read_text(encoding="utf-8")
                for match in self.FONT_SIZE_PATTERN.finditer(content):
                    name = match.group(0).split(":")[0].strip()
                    value = match.group(1).strip()
                    tokens["font_sizes"][name] = value
                for match in self.FONT_FAMILY_PATTERN.finditer(content):
                    name = match.group(0).split(":")[0].strip()
                    value = match.group(1).strip()
                    tokens["font_families"][name] = value
            except Exception:
                continue

        for ext in ["*.js", "*.ts", "*.jsx", "*.tsx", "*.vue", "*.svelte"]:
            for file_path in self.source_path.rglob(ext):
                try:
                    content = file_path.read_text(encoding="utf-8")
                    for match in self.TAILWIND_FONT.finditer(content):
                        size = match.group(1)
                        tokens["font_sizes"][f"--tw-text-{size}"] = size
                except Exception:
                    continue

        return tokens

    def _extract_component_patterns(self) -> Dict[str, Any]:
        """Extract component patterns from component files."""
        patterns = {
            "components_found": 0,
            "common_props": Counter(),
            "styling_approaches": Counter(),
            "component_names": [],
        }

        for ext in ["*.tsx", "*.jsx", "*.vue", "*.svelte"]:
            for file_path in self.source_path.rglob(ext):
                if self.COMPONENT_FILE_PATTERN.search(file_path.name):
                    self.component_files += 1
                    patterns["components_found"] += 1
                    patterns["component_names"].append(file_path.stem)

                    try:
                        content = file_path.read_text(encoding="utf-8")

                        # Detect styling approach
                        if "styled-components" in content or "styled(" in content:
                            patterns["styling_approaches"]["styled-components"] += 1
                        if "@emotion" in content or "css`" in content:
                            patterns["styling_approaches"]["emotion"] += 1
                        if "className=" in content and "tw-" in content:
                            patterns["styling_approaches"]["tailwind"] += 1
                        if "className=" in content and "module." in content:
                            patterns["styling_approaches"]["css-modules"] += 1
                        if "<style" in content:
                            patterns["styling_approaches"]["vue-sfc"] += 1
                        if "class:" in content:
                            patterns["styling_approaches"]["svelte"] += 1

                        # Extract common prop patterns
                        prop_matches = re.findall(r'(\w+)\??:', content)
                        for prop in prop_matches:
                            if prop not in ["type", "interface", "export", "const", "function"]:
                                patterns["common_props"][prop] += 1

                    except Exception:
                        continue

        # Convert Counter to dict for JSON serialization
        patterns["common_props"] = dict(patterns["common_props"].most_common(20))
        patterns["styling_approaches"] = dict(patterns["styling_approaches"])
        patterns["component_names"] = patterns["component_names"][:50]  # Limit

        return patterns

    def _build_type_scale(self, typography_tokens: Dict[str, Any]) -> Dict[str, Any]:
        """Build a normalized type scale from extracted tokens."""
        font_sizes = typography_tokens.get("font_sizes", {})
        font_families = typography_tokens.get("font_families", {})

        # Default type scale if none found
        if not font_sizes:
            return {
                "base": "1rem",
                "scale": {
                    "xs": "0.75rem",
                    "sm": "0.875rem",
                    "base": "1rem",
                    "lg": "1.125rem",
                    "xl": "1.25rem",
                    "2xl": "1.5rem",
                    "3xl": "1.875rem",
                    "4xl": "2.25rem",
                    "5xl": "3rem",
                },
                "font_families": {
                    "sans": "system-ui, -apple-system, sans-serif",
                    "mono": "ui-monospace, SFMono-Regular, monospace",
                },
                "line_heights": {
                    "tight": 1.1,
                    "normal": 1.5,
                    "relaxed": 1.625,
                },
                "font_weights": {
                    "normal": 400,
                    "medium": 500,
                    "semibold": 600,
                    "bold": 700,
                },
            }

        # Try to parse found sizes into a scale
        scale = {}
        for name, value in font_sizes.items():
            clean_name = name.replace("--font-size-", "").replace("--tw-text-", "")
            scale[clean_name] = value

        return {
            "base": font_sizes.get("--font-size-base", "1rem"),
            "scale": scale,
            "font_families": font_families or {
                "sans": "system-ui, -apple-system, sans-serif",
                "mono": "ui-monospace, SFMono-Regular, monospace",
            },
            "line_heights": {
                "tight": 1.1,
                "normal": 1.5,
                "relaxed": 1.625,
            },
            "font_weights": {
                "normal": 400,
                "medium": 500,
                "semibold": 600,
                "bold": 700,
            },
        }

    def _build_color_palette(self, color_tokens: Dict[str, str]) -> Dict[str, Any]:
        """Build a normalized color palette from extracted tokens."""
        if not color_tokens:
            return {
                "primary": {"500": "#3b82f6", "600": "#2563eb", "700": "#1d4ed8"},
                "neutral": {
                    "50": "#f8fafc", "100": "#f1f5f9", "200": "#e2e8f0",
                    "300": "#cbd5e1", "400": "#94a3b8", "500": "#64748b",
                    "600": "#475569", "700": "#334155", "800": "#1e293b",
                    "900": "#0f172a", "950": "#020617",
                },
                "semantic": {
                    "success": "#10b981",
                    "warning": "#f59e0b",
                    "error": "#ef4444",
                    "info": "#3b82f6",
                },
            }

        # Group by color family
        families = {}
        for token, value in color_tokens.items():
            # Try to extract family and shade
            parts = token.replace("--color-", "").replace("--tw-", "").split("-")
            if len(parts) >= 2:
                family = parts[0]
                shade = parts[-1] if parts[-1].isdigit() else "base"
                if family not in families:
                    families[family] = {}
                families[family][shade] = value

        return {
            "families": families,
            "semantic": {
                "primary": families.get("primary", {}).get("500", "#3b82f6"),
                "success": "#10b981",
                "warning": "#f59e0b",
                "error": "#ef4444",
                "info": "#3b82f6",
            },
        }

    def _build_spacing_scale(self, spacing_tokens: Dict[str, str]) -> Dict[str, Any]:
        """Build a normalized spacing scale from extracted tokens."""
        if not spacing_tokens:
            return {
                "base": "0.25rem",
                "scale": {
                    "0": "0",
                    "1": "0.25rem",
                    "2": "0.5rem",
                    "3": "0.75rem",
                    "4": "1rem",
                    "5": "1.25rem",
                    "6": "1.5rem",
                    "8": "2rem",
                    "10": "2.5rem",
                    "12": "3rem",
                    "16": "4rem",
                    "20": "5rem",
                    "24": "6rem",
                },
            }

        scale = {}
        for token, value in spacing_tokens.items():
            clean_name = token.replace("--spacing-", "").replace("--tw-", "")
            scale[clean_name] = value

        return {
            "base": spacing_tokens.get("--spacing-1", "0.25rem"),
            "scale": scale,
        }