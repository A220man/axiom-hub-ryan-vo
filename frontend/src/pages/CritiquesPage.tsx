/* Critiques Page */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { critiqueApi, analyzeApi, generateApi } from '../../api/client';
import { Card, CardHeader, Button, Input } from '../ui';
import { AlertTriangle, Plus, Loader2, Eye, Trash2, ArrowRight } from 'lucide-react';
import { toast } from '../ui/Toast';
import type { DesignCritique, DesignAnalysis, DesignDocument } from '../../types';

export const CritiquesPage = () => {
  const navigate = useNavigate();
  const [critiques, setCritiques] = useState<DesignCritique[]>([]);
  const [analyses, setAnalyses] = useState<DesignAnalysis[]>([]);
  const [documents, setDocuments] = useState<DesignDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [analysisId, setAnalysisId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [includeLLM, setIncludeLLM] = useState(false);
  const [sourceType, setSourceType] = useState<'analysis' | 'document'>('analysis');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [critiquesRes, analysesRes, documentsRes] = await Promise.all([
        critiqueApi.listCritiques({ page: 1, page_size: 20 }),
        analyzeApi.listAnalyses({ page: 1, page_size: 20 }),
        generateApi.listDocuments({ page: 1, page_size: 20 }),
      ]);
      setCritiques(critiquesRes.data.items);
      setAnalyses(analysesRes.data.items);
      setDocuments(documentsRes.data.items);
    } catch (err) {
      console.error('Failed to load critiques:', err);
      toast.error('Failed to load critiques');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a critique name');
      return;
    }
    if (sourceType === 'analysis' && !analysisId) {
      toast.error('Please select an analysis');
      return;
    }
    if (sourceType === 'document' && !documentId) {
      toast.error('Please select a document');
      return;
    }

    setCreating(true);
    try {
      const response = await critiqueApi.critiqueDesign({
        name,
        analysis_id: sourceType === 'analysis' ? parseInt(analysisId) : undefined,
        document_id: sourceType === 'document' ? parseInt(documentId) : undefined,
        include_llm_explanation: includeLLM,
      });
      toast.success('Critique complete');
      setName('');
      setAnalysisId('');
      setDocumentId('');
      loadData();
      navigate(`/critiques/${response.data.id}`);
    } catch (err) {
      console.error('Failed to create critique:', err);
      toast.error('Failed to create critique');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this critique?')) return;
    try {
      await critiqueApi.deleteCritique(id);
      setCritiques(critiques.filter((c) => c.id !== id));
      toast.success('Critique deleted');
    } catch {
      toast.error('Failed to delete critique');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" aria-label="Loading critiques" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Design Critiques</h1>
        <p className="text-neutral-500 mt-1">Evaluate designs against craft floor rules</p>
      </div>

      {/* Create Critique */}
      <Card>
        <CardHeader
          title="New Critique"
          description="Evaluate a design analysis or document against quality rules"
        />
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Critique Name"
            placeholder="Landing Page Critique"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Source Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="source-type"
                    value="analysis"
                    checked={sourceType === 'analysis'}
                    onChange={() => setSourceType('analysis')}
                    className="w-4 h-4 text-primary-600 border-neutral-300 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700">Design Analysis</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="source-type"
                    value="document"
                    checked={sourceType === 'document'}
                    onChange={() => setSourceType('document')}
                    className="w-4 h-4 text-primary-600 border-neutral-300 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700">Design Document</span>
                </label>
              </div>
            </div>

            {sourceType === 'analysis' && analyses.length > 0 && (
              <div>
                <label htmlFor="critique-analysis-select" className="block text-sm font-medium text-neutral-700 mb-1">
                  Select Analysis
                </label>
                <select
                  id="critique-analysis-select"
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

            {sourceType === 'document' && documents.length > 0 && (
              <div>
                <label htmlFor="critique-document-select" className="block text-sm font-medium text-neutral-700 mb-1">
                  Select Document
                </label>
                <select
                  id="critique-document-select"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Choose a document...</option>
                  {documents.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name} {d.analysis_id ? `(from analysis #${d.analysis_id})` : '(custom)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {((sourceType === 'analysis' && analyses.length === 0) || (sourceType === 'document' && documents.length === 0)) && (
              <p className="text-sm text-neutral-500">
                No {sourceType === 'analysis' ? 'analyses' : 'documents'} available. Create one first.
              </p>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="include-llm-critique"
                checked={includeLLM}
                onChange={(e) => setIncludeLLM(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="include-llm-critique" className="text-sm text-neutral-700">
                Include AI-generated explanation (advisory, requires LLM_API_KEY)
              </label>
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" loading={creating}>
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            {creating ? 'Critiquing...' : 'Run Critique'}
          </Button>
        </form>
      </Card>

      {/* Critiques List */}
      <Card>
        <CardHeader title="Critiques" description={`${critiques.length} critique${critiques.length !== 1 ? 's' : ''}`} />
        {critiques.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-neutral-300 mx-auto mb-4" aria-hidden="true" />
            <p className="text-neutral-500 text-lg">No critiques yet</p>
            <p className="text-neutral-400 mt-1">Run your first critique above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {critiques.map((critique) => (
              <div key={critique.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 truncate">{critique.name}</p>
                  <p className="text-sm text-neutral-500">
                    {critique.summary.total_findings} finding{critique.summary.total_findings !== 1 ? 's' : ''}
                    ({critique.summary.by_severity.error || 0} errors, {critique.summary.by_severity.warning || 0} warnings, {critique.summary.by_severity.advisory || 0} advisories)
                    • {new Date(critique.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/critiques/${critique.id}`)} aria-label={`View ${critique.name}`}>
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(critique.id)} aria-label={`Delete ${critique.name}`}>
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