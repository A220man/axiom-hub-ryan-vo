/* Type Definitions */

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  roles: string[];
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface OIDCConfig {
  authorization_endpoint: string;
  client_id: string;
  scope: string;
}

export interface PaginationParams {
  page: number;
  page_size: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DesignAnalysis {
  id: number;
  name: string;
  source_path: string;
  type_scale: TypeScale;
  color_palette: ColorPalette;
  spacing: Spacing;
  component_patterns: ComponentPatterns;
  raw_findings: RawFindings;
  llm_explanation?: string;
  created_at: string;
  updated_at: string;
}

export interface TypeScale {
  base: string;
  scale: Record<string, string>;
  font_families: Record<string, string>;
  line_heights: Record<string, number>;
  font_weights: Record<string, number>;
}

export interface ColorPalette {
  families: Record<string, Record<string, string>>;
  semantic: Record<string, string>;
}

export interface Spacing {
  base: string;
  scale: Record<string, string>;
}

export interface ComponentPatterns {
  components_found: number;
  common_props: Record<string, number>;
  styling_approaches: Record<string, number>;
  component_names: string[];
}

export interface RawFindings {
  files_scanned: number;
  css_files: number;
  component_files: number;
  color_tokens_found: number;
  spacing_tokens_found: number;
  typography_tokens_found: number;
}

export interface DesignDocument {
  id: number;
  name: string;
  analysis_id?: number;
  content: string;
  format_version: string;
  created_at: string;
  updated_at: string;
}

export interface DesignCritique {
  id: number;
  name: string;
  analysis_id?: number;
  document_id?: number;
  findings: Finding[];
  summary: CritiqueSummary;
  llm_explanation?: string;
  created_at: string;
  updated_at: string;
}

export interface Finding {
  rule_id: string;
  title: string;
  description: string;
  severity: 'error' | 'warning' | 'advisory';
  element?: string;
  suggestion?: string;
  waivable: boolean;
}

export interface CritiqueSummary {
  total_findings: number;
  by_severity: Record<string, number>;
  by_rule: Record<string, number>;
  waivable_findings: number;
  non_waivable_findings: number;
}

export interface ApiError {
  detail: string;
  code?: string;
}