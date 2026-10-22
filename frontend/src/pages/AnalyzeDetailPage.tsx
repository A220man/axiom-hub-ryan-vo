/* Analyze Detail Page */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analyzeApi, generateApi } from '../../api/client';
import { Card, CardHeader, Button } from '../ui';
import { FileText, Copy, Download, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { toast } from '../ui/Toast';
import type { DesignAnalysis } from '../../types';

export const AnalyzeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<DesignAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (id) {
      loadAnalysis();
    }
  }, [id]);

  const loadAnalysis = async () => {
    try {
      const response = await analyzeApi.getAnalysis(parseInt(id!));
      setAnalysis(response.data);
    } catch (err) {
      console.error('Failed to load analysis:', err);
      toast.error('Failed to load analysis');
      navigate('/analyze');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this analysis?')) return;
    try {
      await analyzeApi.deleteAnalysis(parseInt(id!));
      toast.success('Analysis deleted');
      navigate('/analyze');
    } catch {
      toast.error('Failed to delete analysis');
    }
  };

  const handleGenerateDoc = async () => {
    if (!analysis) return;
    try {
      const response = await generateApi.generateDesignDoc({
        name: `${analysis.name} - DESIGN.md`,
        analysis_id: analysis.id,
      });
      toast.success('Document generated');
      navigate(`/documents/${response.data.id}`);
    } catch {
      toast.error('Failed to generate document');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" aria-label="Loading analysis" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <Card className="text-center py-8">
        <p className="text-neutral-500">Analysis not found</p>
      </Card>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const renderTypeScale = () => (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-neutral-900">Base Size: {analysis.type_scale.base}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-200">
              <th className="pb-2 font-medium">Token</th>
              <th className="pb-2 font-medium">Size</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(analysis.type_scale.scale).map(([token, size]) => (
              <tr key={token} className="border-b border-neutral-100">
                <td className="py-2 font-mono text-neutral-700">{token}</td>
                <td className="py-2 text-neutral-900">{size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderColorPalette = () => (
    <div className="space-y-4">
      {Object.entries(analysis.color_palette.families).map(([family, shades]) => (
        <div key={family}>
          <h4 className="font-medium text-neutral-900 capitalize">{family}</h4>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(shades).map(([shade, value]) => (
              <div key={shade} className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 rounded-lg" title={`${family}-${shade}: ${value}`}>
                <div className="w-6 h-6 rounded border border-neutral-300" style={{ backgroundColor: value }} />
                <span className="text-sm font-mono text-neutral-700">{shade}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderSpacing = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-neutral-500 border-b border-neutral-200">
            <th className="pb-2 font-medium">Token</th>
            <th className="pb-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(analysis.spacing.scale)
            .sort((a, b) => {
              const an = parseInt(a[0]) || 999;
              const bn = parseInt(b[0]) || 999;
              return an - bn;
            })
            .map(([token, value]) => (
              <tr key={token} className="border-b border-neutral-100">
                <td className="py-2 font-mono text-neutral-700">{token}</td>
                <td className="py-2 text-neutral-900">{value}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );

  const renderComponentPatterns = () => (
    <div className="space-y-4">
      <p className="text-neutral-600">
        Found {analysis.component_patterns.components_found} component file{analysis.component_patterns.components_found !== 1 ? 's' : ''}
      </p>
      {analysis.component_patterns.styling_approaches && Object.keys(analysis.component_patterns.styling_approaches).length > 0 && (
        <div>
          <h4 className="font-medium text-neutral-900">Styling Approaches</h4>
          <ul className="list-disc list-inside text-sm text-neutral-600 mt-1 space-y-1">
            {Object.entries(analysis.component_patterns.styling_approaches).map(([approach, count]) => (
              <li key={approach}>{approach}: {count} component{count !== 1 ? 's' : ''}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const sections = [
    { id: 'type-scale', title: 'Type Scale', render: renderTypeScale },
    { id: 'color-palette', title: 'Color Palette', render: renderColorPalette },
    { id: 'spacing', title: 'Spacing', render: renderSpacing },
    { id: 'components', title: 'Component Patterns', render: renderComponentPatterns },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{analysis.name}</h1>
          <p className="text-neutral-500 mt-1">{analysis.source_path}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleGenerateDoc}>
            <FileText className="w-4 h-4" aria-hidden="true" />
            Generate DESIGN.md
          </Button>
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 text-error-500" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <Card padding="sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-neutral-500">Files Scanned</p>
            <p className="font-medium text-neutral-900">{analysis.raw_findings.files_scanned}</p>
          </div>
          <div>
            <p className="text-neutral-500">CSS Files</p>
            <p className="font-medium text-neutral-900">{analysis.raw_findings.css_files}</p>
          </div>
          <div>
            <p className="text-neutral-500">Components</p>
            <p className="font-medium text-neutral-900">{analysis.raw_findings.component_files}</p>
          </div>
          <div>
            <p className="text-neutral-500">Created</p>
            <p className="font-medium text-neutral-900">{new Date(analysis.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </Card>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.id}>
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900">{section.title}</h3>
              <button
                onClick={() => toggleSection(section.id)}
                className="p-1 rounded hover:bg-neutral-100"
                aria-expanded={expandedSections[section.id]}
                aria-controls={`${section.id}-content`}
              >
                {expandedSections[section.id] ? (
                  <ChevronUp className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </div>
            <div
              id={`${section.id}-content`}
              className={expandedSections[section.id] ? 'p-4' : 'hidden'}
              role="region"
              aria-labelledby={`${section.id}-title`}
            >
              {section.render()}
            </div>
          </Card>
        ))}
      </div>

      {/* LLM Explanation */}
      {analysis.llm_explanation && (
        <Card className="border-warning-200 bg-warning-50">
          <div className="p-4 border-b border-warning-200">
            <h3 className="text-lg font-semibold text-warning-800 flex items-center gap-2">
              <span className="text-warning-500">⚠</span>
              AI-Generated Explanation (Advisory)
            </h3>
          </div>
          <div className="p-4 text-sm text-warning-700">
            <p className="mb-2 font-medium">Note: This explanation was generated by an LLM and is provided for advisory purposes only. It may contain inaccuracies and should not be treated as authoritative.</p>
            <p>{analysis.llm_explanation}</p>
          </div>
        </Card>
      )}
    </div>
  );
};