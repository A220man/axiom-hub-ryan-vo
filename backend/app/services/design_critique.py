"""Design Critique Service - Evaluates designs against craft floor rules."""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
import re


class Severity(Enum):
    """Finding severity levels."""
    ERROR = "error"
    WARNING = "warning"
    ADVISORY = "advisory"


@dataclass
class Finding:
    """A single design critique finding."""
    rule_id: str
    title: str
    description: str
    severity: Severity
    element: Optional[str] = None
    suggestion: Optional[str] = None
    waivable: bool = False


class DesignCritiqueEngine:
    """Evaluates designs against craft floor rules."""

    # Craft floor rules (from impeccable's craft-floor.md)
    RULES = {
        "cramped-padding": {
            "title": "Cramped Padding",
            "description": "Content is flush against container edges with no visual breathing room",
            "severity": Severity.ERROR,
            "waivable": True,
        },
        "hard-offset-shadow": {
            "title": "Hard Offset Shadow",
            "description": "Non-inset, zero-blur box-shadow with substantial offset (neobrutalist pattern)",
            "severity": Severity.ADVISORY,
            "waivable": True,
        },
        "dark-glow": {
            "title": "Dark Glow",
            "description": "Large, dark, diffused box-shadow creating a glow effect",
            "severity": Severity.WARNING,
            "waivable": True,
        },
        "insufficient-contrast": {
            "title": "Insufficient Contrast",
            "description": "Text or UI elements don't meet WCAG AA contrast ratios",
            "severity": Severity.ERROR,
            "waivable": False,
        },
        "inconsistent-radius": {
            "title": "Inconsistent Border Radius",
            "description": "Multiple different border radius values used without systematic scale",
            "severity": Severity.WARNING,
            "waivable": True,
        },
        "arbitrary-magic-numbers": {
            "title": "Arbitrary Magic Numbers",
            "description": "Hardcoded pixel values that should be design tokens",
            "severity": Severity.WARNING,
            "waivable": True,
        },
        "type-scale-violation": {
            "title": "Type Scale Violation",
            "description": "Font sizes used that don't conform to the established type scale",
            "severity": Severity.WARNING,
            "waivable": True,
        },
        "color-token-violation": {
            "title": "Color Token Violation",
            "description": "Hardcoded color values used instead of design tokens",
            "severity": Severity.ERROR,
            "waivable": True,
        },
        "spacing-token-violation": {
            "title": "Spacing Token Violation",
            "description": "Hardcoded spacing values used instead of design tokens",
            "severity": Severity.WARNING,
            "waivable": True,
        },
        "focus-ring-missing": {
            "title": "Missing Focus Ring",
            "description": "Interactive elements lack visible focus indicators",
            "severity": Severity.ERROR,
            "waivable": False,
        },
    }

    def __init__(self, analysis: Dict[str, Any], design_tokens: Optional[Dict[str, Any]] = None):
        self.analysis = analysis
        self.design_tokens = design_tokens or analysis
        self.findings: List[Finding] = []

    def critique(self, html_content: Optional[str] = None, css_content: Optional[str] = None) -> Dict[str, Any]:
        """Run full design critique."""
        self.findings = []

        # Analyze based on available data
        if css_content:
            self._analyze_css(css_content)
        if html_content:
            self._analyze_html(html_content)

        # Also analyze from extracted tokens
        self._analyze_tokens()

        # Build summary
        summary = self._build_summary()

        return {
            "findings": [self._finding_to_dict(f) for f in self.findings],
            "summary": summary,
        }

    def _analyze_css(self, css: str) -> None:
        """Analyze CSS for rule violations."""
        # Check for hard offset shadows
        hard_shadows = re.findall(r'box-shadow:\s*([^;]+)', css)
        for shadow in hard_shadows:
            if self._is_hard_offset_shadow(shadow):
                self.findings.append(Finding(
                    rule_id="hard-offset-shadow",
                    title=self.RULES["hard-offset-shadow"]["title"],
                    description=self.RULES["hard-offset-shadow"]["description"],
                    severity=self.RULES["hard-offset-shadow"]["severity"],
                    suggestion="Consider using soft elevation shadows (with blur) or document intentional neobrutalist direction",
                    waivable=self.RULES["hard-offset-shadow"]["waivable"],
                ))

        # Check for dark glow
        for shadow in hard_shadows:
            if self._is_dark_glow(shadow):
                self.findings.append(Finding(
                    rule_id="dark-glow",
                    title=self.RULES["dark-glow"]["title"],
                    description=self.RULES["dark-glow"]["description"],
                    severity=self.RULES["dark-glow"]["severity"],
                    suggestion="Reduce shadow spread/opacity or use elevation tokens",
                    waivable=self.RULES["dark-glow"]["waivable"],
                ))

        # Check for arbitrary magic numbers (hardcoded px values not in tokens)
        px_values = re.findall(r'(\d+)px', css)
        token_spacing = set()
        spacing_scale = self.design_tokens.get("spacing", {}).get("scale", {})
        for val in spacing_scale.values():
            if "rem" in str(val):
                try:
                    rem_val = float(val.replace("rem", ""))
                    token_spacing.add(int(rem_val * 16))
                except ValueError:
                    pass

        for px in px_values:
            px_int = int(px)
            if px_int not in token_spacing and px_int not in [0, 1, 2, 4, 8, 16]:
                self.findings.append(Finding(
                    rule_id="arbitrary-magic-numbers",
                    title=self.RULES["arbitrary-magic-numbers"]["title"],
                    description=f"Hardcoded pixel value: {px}px",
                    severity=self.RULES["arbitrary-magic-numbers"]["severity"],
                    element=f"{px}px",
                    suggestion="Replace with spacing token",
                    waivable=self.RULES["arbitrary-magic-numbers"]["waivable"],
                ))

        # Check for hardcoded colors
        hex_colors = re.findall(r'#[0-9a-fA-F]{3,8}', css)
        token_colors = set()
        color_families = self.design_tokens.get("color_palette", {}).get("families", {})
        for family in color_families.values():
            for val in family.values():
                if val.startswith("#"):
                    token_colors.add(val.lower())

        for color in hex_colors:
            if color.lower() not in token_colors and color.lower() not in ["#fff", "#ffffff", "#000", "#000000"]:
                self.findings.append(Finding(
                    rule_id="color-token-violation",
                    title=self.RULES["color-token-violation"]["title"],
                    description=f"Hardcoded color: {color}",
                    severity=self.RULES["color-token-violation"]["severity"],
                    element=color,
                    suggestion="Replace with color token",
                    waivable=self.RULES["color-token-violation"]["waivable"],
                ))

    def _analyze_html(self, html: str) -> None:
        """Analyze HTML for accessibility and structural issues."""
        # Check for focus rings (simplified)
        if "focus:" not in html and "focus-visible:" not in html and ":focus" not in html:
            # Check if there are interactive elements
            if re.search(r'<(button|a|input|select|textarea)', html, re.IGNORECASE):
                self.findings.append(Finding(
                    rule_id="focus-ring-missing",
                    title=self.RULES["focus-ring-missing"]["title"],
                    description=self.RULES["focus-ring-missing"]["description"],
                    severity=self.RULES["focus-ring-missing"]["severity"],
                    suggestion="Add focus-visible styles for interactive elements",
                    waivable=self.RULES["focus-ring-missing"]["waivable"],
                ))

    def _analyze_tokens(self) -> None:
        """Analyze extracted tokens for consistency issues."""
        # Check type scale consistency
        type_scale = self.design_tokens.get("type_scale", {})
        scale = type_scale.get("scale", {})
        if scale:
            sizes = []
            for val in scale.values():
                if "rem" in str(val):
                    try:
                        sizes.append(float(val.replace("rem", "")))
                    except ValueError:
                        pass
            if sizes:
                # Check if sizes follow a reasonable scale
                sizes_sorted = sorted(set(sizes))
                if len(sizes_sorted) > 5:
                    ratios = [sizes_sorted[i+1]/sizes_sorted[i] for i in range(len(sizes_sorted)-1)]
                    if any(r > 1.5 or r < 1.1 for r in ratios):
                        self.findings.append(Finding(
                            rule_id="type-scale-violation",
                            title=self.RULES["type-scale-violation"]["title"],
                            description="Type scale has inconsistent ratios between steps",
                            severity=self.RULES["type-scale-violation"]["severity"],
                            suggestion="Use a consistent modular scale (e.g., 1.125, 1.25, 1.5)",
                            waivable=self.RULES["type-scale-violation"]["waivable"],
                        ))

        # Check border radius consistency (from component patterns)
        patterns = self.design_tokens.get("component_patterns", {})
        # This would need more sophisticated analysis

    def _is_hard_offset_shadow(self, shadow: str) -> bool:
        """Check if shadow is a hard offset shadow (neobrutalist pattern)."""
        # Match: offset-x offset-y blur spread color
        # Hard offset: no blur (0 or missing), significant offset
        parts = shadow.strip().split()
        if len(parts) < 3:
            return False
        try:
            offset_x = parts[0]
            offset_y = parts[1]
            blur = parts[2] if len(parts) > 2 else "0"
            # Check if blur is 0 or very small
            if blur in ["0", "0px", "0rem"]:
                # Check if offset is substantial
                ox = self._parse_length(offset_x)
                oy = self._parse_length(offset_y)
                if ox and oy and (abs(ox) >= 3 or abs(oy) >= 3):
                    return True
        except Exception:
            pass
        return False

    def _is_dark_glow(self, shadow: str) -> bool:
        """Check if shadow is a dark glow (large diffuse shadow)."""
        parts = shadow.strip().split()
        if len(parts) < 4:
            return False
        try:
            blur = parts[2]
            color = parts[3] if len(parts) > 3 else ""
            bx = self._parse_length(blur)
            if bx and bx >= 16:  # Large blur
                # Check if color is dark
                if color.startswith("#") or "rgba(0,0,0" in color or "rgb(0,0,0" in color:
                    return True
        except Exception:
            pass
        return False

    def _parse_length(self, value: str) -> Optional[float]:
        """Parse CSS length value to pixels."""
        value = value.strip()
        if value.endswith("px"):
            return float(value[:-2])
        if value.endswith("rem"):
            return float(value[:-3]) * 16
        if value.endswith("em"):
            return float(value[:-2]) * 16
        try:
            return float(value)
        except ValueError:
            return None

    def _build_summary(self) -> Dict[str, Any]:
        """Build critique summary."""
        by_severity = {"error": 0, "warning": 0, "advisory": 0}
        by_rule = {}
        waivable_count = 0

        for f in self.findings:
            by_severity[f.severity.value] += 1
            by_rule[f.rule_id] = by_rule.get(f.rule_id, 0) + 1
            if f.waivable:
                waivable_count += 1

        return {
            "total_findings": len(self.findings),
            "by_severity": by_severity,
            "by_rule": by_rule,
            "waivable_findings": waivable_count,
            "non_waivable_findings": len(self.findings) - waivable_count,
        }

    def _finding_to_dict(self, finding: Finding) -> Dict[str, Any]:
        """Convert Finding to dictionary."""
        return {
            "rule_id": finding.rule_id,
            "title": finding.title,
            "description": finding.description,
            "severity": finding.severity.value,
            "element": finding.element,
            "suggestion": finding.suggestion,
            "waivable": finding.waivable,
        }