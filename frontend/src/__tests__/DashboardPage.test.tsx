import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

// Mock toast
vi.mock('../components/ui/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
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
      expect(screen.getByText('No analyses yet')).toBeInTheDocument()
      expect(screen.getByText('No documents yet')).toBeInTheDocument()
      expect(screen.getByText('No critiques yet')).toBeInTheDocument()
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