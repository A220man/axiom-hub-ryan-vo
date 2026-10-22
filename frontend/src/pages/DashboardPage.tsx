/* Dashboard Page */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyzeApi, generateApi, critiqueApi } from '../../api/client';
import { Card, CardHeader, Button } from '../ui';
import { Search, FileText, AlertTriangle, Plus, FolderOpen, Eye, Download, Trash2 } from 'lucide-react';
import { toast } from '../ui/Toast';
import type { DesignAnalysis, DesignDocument, DesignCritique } from '../../types';

export const DashboardPage = () => {
  const [analyses, setAnalyses] = useState<DesignAnalysis[]>([]);
  const [documents, setDocuments] = useState<DesignDocument[]>([]);
  const [critiques, setCritiques] = useState<DesignCritique[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [analysesRes, documentsRes, critiquesRes] = await Promise.all([
        analyzeApi.listAnalyses({ page: 1, page_size: 5 }),
        generateApi.listDocuments({ page: 1, page_size: 5 }),
        critiqueApi.listCritiques({ page: 1, page_size: 5 }),
      ]);
      setAnalyses(analysesRes.data.items);
      setDocuments(documentsRes.data.items);
      setCritiques(critiquesRes.data.items);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = async (id: number) => {
    if (!confirm('Delete this analysis?')) return;
    try {
      await analyzeApi.deleteAnalysis(id);
      setAnalyses(analyses.filter((a) => a.id !== id));
      toast.success('Analysis deleted');
    } catch {
      toast.error('Failed to delete analysis');
    }
  };

  const handleDeleteDocument = async (id: number) => {
    if (!confirm('Delete this document?')) return;
    try {
      await generateApi.deleteDocument(id);
      setDocuments(documents.filter((d) => d.id !== id));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const handleDeleteCritique = async (id: number) => {
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
        <div className="spinner" aria-label="Loading dashboard" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-neutral-500 mt-1">Overview of your design system analyses, documents, and critiques</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/analyze" className="group">
          <Card padding="md" className="hover:border-primary-300 transition-colors cursor-pointer">
            <CardHeader
              title="Analyze Design System"
              description="Extract design tokens from a frontend codebase"
              action={<Plus className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 transition-colors" />}
            />
            <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg">
              <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                <Search className="w-6 h-6 text-primary-600" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium text-neutral-900">New Analysis</p>
                <p className="text-sm text-neutral-500">Scan a codebase for design tokens</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/documents" className="group">
          <Card padding="md" className="hover:border-primary-300 transition-colors cursor-pointer">
            <CardHeader
              title="Generate DESIGN.md"
              description="Create design system documentation"
              action={<Plus className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 transition-colors" />}
            />
            <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg">
              <div className="w-12 h-12 rounded-lg bg-success-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-success-600" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium text-neutral-900">New Document</p>
                <p className="text-sm text-neutral-500">Generate from analysis or custom</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/critiques" className="group">
          <Card padding="md" className="hover:border-primary-300 transition-colors cursor-pointer">
            <CardHeader
              title="Critique Design"
              description="Evaluate against craft floor rules"
              action={<Plus className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 transition-colors" />}
            />
            <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg">
              <div className="w-12 h-12 rounded-lg bg-warning-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-warning-600" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium text-neutral-900">New Critique</p>
                <p className="text-sm text-neutral-500">Check design quality</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent Analyses */}
      <section>
        <CardHeader
          title="Recent Analyses"
          description={`${analyses.length} analysis${analyses.length !== 1 ? 'es' : ''} found`}
          action={<Link to="/analyze"><Button variant="outline" size="sm">View All</Button></Link>}
        />
        {analyses.length === 0 ? (
          <Card padding="md" className="text-center py-8">
            <FolderOpen className="w-12 h-12 text-neutral-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-neutral-500">No analyses yet. Create your first analysis to get started.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {analyses.map((analysis) => (
              <Card key={analysis.id} padding="sm" className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 truncate">{analysis.name}</p>
                  <p className="text-sm text-neutral-500 truncate">{analysis.source_path}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Link to={`/analyze/${analysis.id}`}>
                    <Button variant="ghost" size="sm" aria-label={`View ${analysis.name}`}>
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteAnalysis(analysis.id)} aria-label={`Delete ${analysis.name}`}>
                    <Trash2 className="w-4 h-4 text-error-500" aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recent Documents */}
      <section>
        <CardHeader
          title="Recent Documents"
          description={`${documents.length} document${documents.length !== 1 ? 's' : ''} found`}
          action={<Link to="/documents"><Button variant="outline" size="sm">View All</Button></Link>}
        />
        {documents.length === 0 ? (
          <Card padding="md" className="text-center py-8">
            <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-neutral-500">No documents yet. Generate a DESIGN.md from an analysis.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <Card key={document.id} padding="sm" className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 truncate">{document.name}</p>
                  <p className="text-sm text-neutral-500">
                    {document.analysis_id ? `From analysis #${document.analysis_id}` : 'Custom content'}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(document.id)} aria-label={`Download ${document.name}`}>
                    <Download className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <Link to={`/documents/${document.id}`}>
                    <Button variant="ghost" size="sm" aria-label={`View ${document.name}`}>
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(document.id)} aria-label={`Delete ${document.name}`}>
                    <Trash2 className="w-4 h-4 text-error-500" aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recent Critiques */}
      <section>
        <CardHeader
          title="Recent Critiques"
          description={`${critiques.length} critique${critiques.length !== 1 ? 's' : ''} found`}
          action={<Link to="/critiques"><Button variant="outline" size="sm">View All</Button></Link>}
        />
        {critiques.length === 0 ? (
          <Card padding="md" className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-neutral-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-neutral-500">No critiques yet. Evaluate a design against craft floor rules.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {critiques.map((critique) => (
              <Card key={critique.id} padding="sm" className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 truncate">{critique.name}</p>
                  <p className="text-sm text-neutral-500">
                    {critique.summary.total_findings} finding{critique.summary.total_findings !== 1 ? 's' : ''}
                    ({critique.summary.by_severity.error || 0} errors, {critique.summary.by_severity.warning || 0} warnings)
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Link to={`/critiques/${critique.id}`}>
                    <Button variant="ghost" size="sm" aria-label={`View ${critique.name}`}>
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteCritique(critique.id)} aria-label={`Delete ${critique.name}`}>
                    <Trash2 className="w-4 h-4 text-error-500" aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
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