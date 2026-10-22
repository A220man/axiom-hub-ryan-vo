/* Documents Page */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateApi, analyzeApi } from '../../api/client';
import { Card, CardHeader, Button, Input } from '../ui';
import { FileText, Plus, Loader2, Download, Eye, Trash2, ArrowRight } from 'lucide-react';
import { toast } from '../ui/Toast';
import type { DesignDocument, DesignAnalysis } from '../../types';

export const DocumentsPage = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DesignDocument[]>([]);
  const [analyses, setAnalyses] = useState<DesignAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [analysisId, setAnalysisId] = useState('');
  const [customContent, setCustomContent] = useState(false);
  const [includeLLM, setIncludeLLM] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [docsRes, analysesRes] = await Promise.all([
        generateApi.listDocuments({ page: 1, page_size: 20 }),
        analyzeApi.listAnalyses({ page: 1, page_size: 20 }),
      ]);
      setDocuments(docsRes.data.items);
      setAnalyses(analysesRes.data.items);
    } catch (err) {
      console.error('Failed to load documents:', err);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a document name');
      return;
    }
    if (!customContent && !analysisId) {
      toast.error('Please select an analysis or enable custom content');
      return;
    }

    setCreating(true);
    try {
      const response = await generateApi.generateDesignDoc({
        name,
        analysis_id: customContent ? undefined : parseInt(analysisId),
        custom_content: customContent ? {} : undefined,
        include_llm_explanation: includeLLM,
      });
      toast.success('Document generated');
      setName('');
      setAnalysisId('');
      setCustomContent(false);
      loadData();
      navigate(`/documents/${response.data.id}`);
    } catch (err) {
      console.error('Failed to generate document:', err);
      toast.error('Failed to generate document');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (id: number) => {
    try {
      const response = await generateApi.downloadDocument(id);
      const blob = new Blob([response.data], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `design-doc-${id}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Document downloaded');
    } catch {
      toast.error('Failed to download document');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this document?')) return;
    try {
      await generateApi.deleteDocument(id);
      setDocuments(documents.filter((d) => d.id !== id));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" aria-label="Loading documents" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Design Documents</h1>
        <p className="text-neutral-500 mt-1">Generate and manage DESIGN.md documentation</p>
      </div>

      {/* Create Document */}
      <Card>
        <CardHeader
          title="Generate DESIGN.md"
          description="Create design system documentation from an analysis or custom content"
        />
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Document Name"
            placeholder="My Design System - DESIGN.md"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="custom-content"
                checked={customContent}
                onChange={(e) => setCustomContent(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="custom-content" className="text-sm font-medium text-neutral-700">
                Use custom content instead of analysis
              </label>
            </div>

            {!customContent && analyses.length > 0 && (
              <div>
                <label htmlFor="analysis-select" className="block text-sm font-medium text-neutral-700 mb-1">
                  Select Analysis
                </label>
                <select
                  id="analysis-select"
                  value={analysisId}
                  onChange={(e) => setAnalysisId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Choose an analysis...</option>
                  {analyses.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.name} ({a.source_path})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {customContent && (
              <p className="text-sm text-neutral-500">
                Custom content mode: document will be generated with default template structure.
              </p>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="include-llm-doc"
                checked={includeLLM}
                onChange={(e) => setIncludeLLM(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="include-llm-doc" className="text-sm text-neutral-700">
                Include AI-generated explanation (advisory, requires LLM_API_KEY)
              </label>
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" loading={creating}>
            <FileText className="w-4 h-4" aria-hidden="true" />
            {creating ? 'Generating...' : 'Generate Document'}
          </Button>
        </form>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader title="Documents" description={`${documents.length} document${documents.length !== 1 ? 's' : ''}`} />
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-neutral-300 mx-auto mb-4" aria-hidden="true" />
            <p className="text-neutral-500 text-lg">No documents yet</p>
            <p className="text-neutral-400 mt-1">Generate your first DESIGN.md above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 truncate">{doc.name}</p>
                  <p className="text-sm text-neutral-500">
                    {doc.analysis_id ? `From analysis #${doc.analysis_id}` : 'Custom content'}
                    • {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(doc.id)} aria-label={`Download ${doc.name}`}>
                    <Download className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/documents/${doc.id}`)} aria-label={`View ${doc.name}`}>
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)} aria-label={`Delete ${doc.name}`}>
                    <Trash2 className="w-4 h-4 text-error-500" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};