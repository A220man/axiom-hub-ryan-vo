/* Analyze Page */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeApi } from '../../api/client';
import { Card, CardHeader, Button, Input } from '../ui';
import { Search, Loader2, ArrowRight } from 'lucide-react';
import { toast } from '../ui/Toast';
import type { DesignAnalysis } from '../../types';

export const AnalyzePage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [sourcePath, setSourcePath] = useState('');
  const [includeLLM, setIncludeLLM] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState<DesignAnalysis[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sourcePath.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await analyzeApi.analyzeDesignSystem({
        name,
        source_path: sourcePath,
        include_llm_explanation: includeLLM,
      });
      toast.success('Analysis complete');
      navigate(`/analyze/${response.data.id}`);
    } catch (err) {
      console.error('Analysis failed:', err);
      toast.error('Analysis failed. Check the path and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Analyze Design System</h1>
        <p className="text-neutral-500 mt-1">Extract design tokens from a frontend codebase</p>
      </div>

      <Card>
        <CardHeader title="New Analysis" description="Enter the path to your frontend codebase" />
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Analysis Name"
            placeholder="My Design System"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Source Path"
            placeholder="/path/to/frontend/codebase"
            value={sourcePath}
            onChange={(e) => setSourcePath(e.target.value)}
            required
            helperText="Absolute path to the frontend codebase directory on the server"
          />

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="include-llm"
              checked={includeLLM}
              onChange={(e) => setIncludeLLM(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="include-llm" className="text-sm text-neutral-700">
              Include AI-generated explanation (advisory, requires LLM_API_KEY)
            </label>
          </div>

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full sm:w-auto">
            <Search className="w-4 h-4" aria-hidden="true" />
            {loading ? 'Analyzing...' : 'Start Analysis'}
          </Button>
        </form>
      </Card>

      {/* Recent Analyses */}
      <Card>
        <CardHeader title="Recent Analyses" />
        {recentAnalyses.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <Search className="w-12 h-12 text-neutral-300 mx-auto mb-3" aria-hidden="true" />
            <p>No analyses yet. Create one above to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAnalyses.map((analysis) => (
              <div key={analysis.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div>
                  <p className="font-medium text-neutral-900">{analysis.name}</p>
                  <p className="text-sm text-neutral-500">{analysis.source_path}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(`/analyze/${analysis.id}`)}>
                  View <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};