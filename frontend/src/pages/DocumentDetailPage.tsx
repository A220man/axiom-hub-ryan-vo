/* Document Detail Page */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateApi } from '../../api/client';
import { Card, CardHeader, Button } from '../ui';
import { Download, Copy, Edit, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '../ui/Toast';
import type { DesignDocument } from '../../types';

export const DocumentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DesignDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState<'rendered' | 'source'>('rendered');

  useEffect(() => {
    if (id) {
      loadDocument();
    }
  }, [id]);

  const loadDocument = async () => {
    try {
      const response = await generateApi.getDocument(parseInt(id!));
      setDocument(response.data);
    } catch (err) {
      console.error('Failed to load document:', err);
      toast.error('Failed to load document');
      navigate('/documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;
    try {
      const response = await generateApi.downloadDocument(document.id);
      const blob = new Blob([response.data], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${document.name}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Document downloaded');
    } catch {
      toast.error('Failed to download document');
    }
  };

  const handleCopy = () => {
    if (!document) return;
    navigator.clipboard.writeText(document.content);
    toast.success('Document copied to clipboard');
  };

  const handleDelete = async () => {
    if (!document || !confirm('Delete this document?')) return;
    try {
      await generateApi.deleteDocument(document.id);
      toast.success('Document deleted');
      navigate('/documents');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" aria-label="Loading document" />
      </div>
    );
  }

  if (!document) {
    return (
      <Card className="text-center py-8">
        <p className="text-neutral-500">Document not found</p>
      </Card>
    );
  }

  // Simple markdown rendering (for preview)
  const renderMarkdown = (content: string) => {
    // Basic markdown to HTML conversion for preview
    return content
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^\| (.+) \|$/gm, '<div class="markdown-table-row">$1</div>')
      .replace(/^\|.*\|$/gm, '')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{document.name}</h1>
          <p className="text-neutral-500 mt-1">
            {document.analysis_id ? `From analysis #${document.analysis_id}` : 'Custom content'}
            • Created {new Date(document.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4" aria-hidden="true" />
            Download
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="w-4 h-4" aria-hidden="true" />
            Copy
          </Button>
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 text-error-500" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={previewMode === 'rendered' ? 'primary' : 'outline'}
          onClick={() => setPreviewMode('rendered')}
        >
          Preview
        </Button>
        <Button
          variant={previewMode === 'source' ? 'primary' : 'outline'}
          onClick={() => setPreviewMode('source')}
        >
          Source
        </Button>
      </div>

      {/* Content */}
      <Card className="overflow-hidden">
        {previewMode === 'rendered' ? (
          <div
            className="p-6 prose prose-neutral max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(document.content) }}
          />
        ) : (
          <div className="p-0">
            <textarea
              className="w-full h-[600px] p-4 font-mono text-sm border-none focus:outline-none resize-none bg-neutral-50"
              value={document.content}
              readOnly
              spellCheck={false}
              aria-label="Document source markdown"
            />
          </div>
        )}
      </Card>
    </div>
  );
};