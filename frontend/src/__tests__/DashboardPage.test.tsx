import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { DashboardPage } from '../pages/DashboardPage'
import { analyzeApi, generateApi, critiqueApi } from '../api/client'

// Mock API client
vi.mock('../api/client', () => ({
  analyzeApi: {
    listAnalyses: vi.fn(),
  },
  generateApi: {
    listDocuments: vi.fn(),
  },
  critiqueApi: {
    listCritiques: vi.fn(),
  },
}))

// Mock UI components
vi.mock('../components/ui', () => ({
  Card: ({ children, padding = 'md', className = '' }: { children: React.ReactNode; padding?: string; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ title, description, action, className = '' }: { title: string; description?: string; action?: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  ),
  Button: ({ children, ...props }: { children: React.ReactNode; type?: string; disabled?: boolean; onClick?: () => void; className?: string; variant?: string; size?: string }) => (
    <button {...props} data-testid="button">{children}</button>
  ),
}))

// Mock toast
vi.mock('../components/ui/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: () => <svg data-testid="search-icon" />,
  FileText: () => <svg data-testid="file-text-icon" />,
  AlertTriangle: () => <svg data-testid="alert-triangle-icon" />,
  Plus: () => <svg data-testid="plus-icon" />,
  FolderOpen: () => <svg data-testid="folder-open-icon" />,
  Eye: () => <svg data-testid="eye-icon" />,
  Download: () => <svg data-testid="download-icon" />,
  Trash2: () => <svg data-testid="trash2-icon" />,
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard with loading state', () => {
    ;(analyzeApi.listAnalyses as vi.Mock).mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 5, total_pages: 0 } })
    ;(generateApi.listDocuments as vi.Mock).mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 5, total_pages: 0 } })
    ;(critiqueApi.listCritiques as vi.Mock).mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 5, total_pages: 0 } })

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    )

    // Should show loading spinner initially
    expect(screen.getByLabelText('Loading dashboard')).toBeInTheDocument()
  })

  it('renders empty state when no data', async () => {
    ;(analyzeApi.listAnalyses as vi.Mock).mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 5, total_pages: 0 } })
    ;(generateApi.listDocuments as vi.Mock).mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 5, total_pages: 0 } })
    ;(critiqueApi.listCritiques as vi.Mock).mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 5, total_pages: 0 } })

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('No analyses yet. Create your first analysis to get started.')).toBeInTheDocument()
      expect(screen.getByText('No documents yet. Generate a DESIGN.md from an analysis.')).toBeInTheDocument()
      expect(screen.getByText('No critiques yet. Evaluate a design against craft floor rules.')).toBeInTheDocument()
    })
  })

  it('renders quick action cards', async () => {
    ;(analyzeApi.listAnalyses as vi.Mock).mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 5, total_pages: 0 } })
    ;(generateApi.listDocuments as vi.Mock).mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 5, total_pages: 0 } })
    ;(critiqueApi.listCritiques as vi.Mock).mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 5, total_pages: 0 } })

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Analyze Design System')).toBeInTheDocument()
      expect(screen.getByText('Generate DESIGN.md')).toBeInTheDocument()
      expect(screen.getByText('Critique Design')).toBeInTheDocument()
    })
  })
})
