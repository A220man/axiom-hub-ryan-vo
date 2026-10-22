import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AnalyzePage } from '../pages/AnalyzePage'
import { analyzeApi } from '../api/client'

// Mock API client
vi.mock('../api/client', () => ({
  analyzeApi: {
    analyzeDesignSystem: vi.fn(),
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

describe('AnalyzePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders analyze page with form', () => {
    render(
      <BrowserRouter>
        <AnalyzePage />
      </BrowserRouter>
    )

    expect(screen.getByText('Analyze Design System')).toBeInTheDocument()
    expect(screen.getByText('Extract design tokens from a frontend codebase')).toBeInTheDocument()
    expect(screen.getByLabelText('Analysis Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Source Path')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start Analysis/i })).toBeInTheDocument()
  })

  it('shows error when submitting empty form', async () => {
    render(
      <BrowserRouter>
        <AnalyzePage />
      </BrowserRouter>
    )

    const submitButton = screen.getByRole('button', { name: /Start Analysis/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Please fill in all required fields')).toBeInTheDocument()
    })
  })

  it('calls API on valid submit', async () => {
    ;(analyzeApi.analyzeDesignSystem as vi.Mock).mockResolvedValue({
      data: { id: 1, name: 'Test', source_path: '/test', type_scale: {}, color_palette: {}, spacing: {}, component_patterns: {}, raw_findings: {} }
    })

    render(
      <BrowserRouter>
        <AnalyzePage />
      </BrowserRouter>
    )

    fireEvent.change(screen.getByLabelText('Analysis Name'), { target: { value: 'Test Analysis' } })
    fireEvent.change(screen.getByLabelText('Source Path'), { target: { value: '/path/to/codebase' } })

    const submitButton = screen.getByRole('button', { name: /Start Analysis/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(analyzeApi.analyzeDesignSystem).toHaveBeenCalledWith({
        name: 'Test Analysis',
        source_path: '/path/to/codebase',
        include_llm_explanation: false,
      })
    })
  })
})