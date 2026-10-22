/* Critique Detail Page */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { critiqueApi } from '../../api/client';
import { Card, CardHeader, Button } from '../ui';
import { AlertTriangle, Loader2, ChevronDown, ChevronUp, Trash2, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { toast } from '../ui/Toast';
import type { DesignCritique, Finding } from '../../types';

export const CritiqueDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [critique, setCritique] = useState<DesignCritique | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedFindings, setExpandedFindings] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (id) {
      loadCritique();
    }
  }, [id]);

  const loadCritique = async () => {
    try {
      const response = await critiqueApi.getCritique(parseInt(id!));
      setCritique(response.data);
    } catch (err) {
      console.error('Failed to load critique:', err);
      toast.error('Failed to load critique');
      navigate('/critiques');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!critique || !confirm('Delete this critique?')) return;
    try {
      await critiqueApi.deleteCritique(critique.id);
      toast.success('Critique deleted');
      navigate('/critiques');
    } catch {
      toast.error('Failed to delete critique');
    }
  };

  const getSeverityIcon = (severity: Finding['severity']) => {
    switch (severity) {
      case 'error': return <XCircle className="w-5 h-5 text-error-500" aria-hidden="true" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-warning-500" aria-hidden="true" />;
      case 'advisory': return <Info className="w-5 h-5 text-primary-500" aria-hidden="true" />;
    }
  };

  const getSeverityColor = (severity: Finding['severity']) => {
    switch (severity) {
      case 'error': return 'bg-error-50 border-error-200 text-error-800';
      case 'warning': return 'bg-warning-50 border-warning-200 text-warning-800';
      case 'advisory': return 'bg-primary-50 border-primary-200 text-primary-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" aria-label="Loading critique" />
      </div>
    );
  }

  if (!critique) {
    return (
      <Card className="text-center py-8">
        <p className="text-neutral-500">Critique not found</p>
      </Card>
    );
  }

  const findingsBySeverity = {
    error: critique.findings.filter((f) => f.severity === 'error'),
    warning: critique.findings.filter((f) => f.severity === 'warning'),
    advisory: critique.findings.filter((f) => f.severity === 'advisory'),
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{critique.name}</h1>
          <p className="text-neutral-500 mt-1">
            {critique.analysis_id ? `Analysis #${critique.analysis_id}` : critique.document_id ? `Document #${critique.document_id}` : 'Unknown source'}
            &bull; {new Date(critique.created_at).toLocaleDateString()}
          </p>
        </div>
        <Button variant="outline" onClick={handleDelete}>
          <Trash2 className="w-4 h-4 text-error-500" aria-hidden="true" />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="md" className="text-center">
          <p className="text-3xl font-bold text-error-600">{critique.summary.by_severity.error || 0}</p>
          <p className="text-sm text-neutral-500">Errors</p>
        </Card>
        <Card padding="md" className="text-center">
          <p className="text-3xl font-bold text-warning-600">{critique.summary.by_severity.warning || 0}</p>
          <p className="text-sm text-neutral-500">Warnings</p>
        </Card>
        <Card padding="md" className="text-center">
          <p className="text-3xl font-bold text-primary-600">{critique.summary.by_severity.advisory || 0}</p>
          <p className="text-sm text-neutral-500">Advisories</p>
        </Card>
        <Card padding="md" className="text-center">
          <p className="text-3xl font-bold text-neutral-900">{critique.summary.total_findings}</p>
          <p className="text-sm text-neutral-500">Total Findings</p>
        </Card>
      </div>

      {/* Findings by Rule */}
      {Object.entries(critique.summary.by_rule).length > 0 && (
        <Card>
          <CardHeader title="Findings by Rule" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500 border-b border-neutral-200">
                  <th className="pb-2 font-medium">Rule</th>
                  <th className="pb-2 font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(critique.summary.by_rule).map(([rule, count]) => (
                  <tr key={rule} className="border-b border-neutral-100">
                    <td className="py-2 font-mono text-neutral-700">{rule}</td>
                    <td className="py-2 text-neutral-900">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Findings */}
      <Card>
        <CardHeader title="All Findings" />
        {critique.findings.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-success-500 mx-auto mb-4" aria-hidden="true" />
            <p className="text-neutral-500 text-lg">No findings! Great job.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(['error', 'warning', 'advisory'] as const).map((severity) => {
              const findings = findingsBySeverity[severity];
              if (findings.length === 0) return null;

              return (
                <div key={severity}>
                  <h4 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-3">
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}s ({findings.length})
                  </h4>
                  <div className="space-y-3">
                    {findings.map((finding, index) => (
                      <div
                        key={`${severity}-${index}`}
                        className={`border rounded-lg p-4 ${getSeverityColor(finding.severity)}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getSeverityIcon(finding.severity)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium text-neutral-900">{finding.title}</h5>
                              <span className="text-xs font-mono text-neutral-500">{finding.rule_id}</span>
                              {finding.waivable && (
                                <span className="text-xs px-2 py-0.5 bg-neutral-200 rounded text-neutral-600">Waivable</span>
                              )}
                            </div>
                            <p className="text-sm text-neutral-600 mt-1">{finding.description}</p>
                            {finding.element && (
                              <p className="text-sm text-neutral-500 mt-1">
                                <span className="font-mono">{finding.element}</span>
                              </p>
                            )}
                            {finding.suggestion && (
                              <p className="text-sm text-neutral-700 mt-2">
                                <span className="font-medium">Suggestion:</span> {finding.suggestion}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* LLM Explanation */}
      {critique.llm_explanation && (
        <Card className="border-warning-200 bg-warning-50">
          <div className="p-4 border-b border-warning-200">
            <h3 className="text-lg font-semibold text-warning-800 flex items-center gap-2">
              <span className="text-warning-500">!</span>
              AI-Generated Explanation (Advisory)
            </h3>
          </div>
          <div className="p-4 text-sm text-warning-700">
            <p className="mb-2 font-medium">Note: This explanation was generated by an LLM and is provided for advisory purposes only. It may contain inaccuracies and should not be treated as authoritative.</p>
            <p>{critique.llm_explanation}</p>
          </div>
        </Card>
      )}
    </div>
  );
};