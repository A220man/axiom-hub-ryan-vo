import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AnalyzePage } from '../pages/AnalyzePage'
import { analyzeApi } from '../api/client'
import { toast } from '../components/ui/Toast'

// Mock API client
vi.mock('../api/client', () => ({
  analyzeApi: {
    analyzeDesignSystem: vi.fn(),
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
  Input: ({ label, error, helperText, id, ...props }: { label?: string; error?: string; helperText?: string; id?: string; type?: string; placeholder?: string; required?: boolean; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div>
        {label && <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700 mb-1">{label}</label>}
        <input
          id={inputId}
          {...props}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        />
        {error && <p id={`${inputId}-error`} className="mt-1 text-sm text-error-500" role="alert">{error}</p>}
        {helperText && !error && <p id={`${inputId}-helper`} className="mt-1 text-sm text-neutral-500">{helperText}</p>}
      </div>
    );
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

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: () => <svg data-testid="search-icon" />,
  Loader2: () => <svg data-testid="loader-icon" />,
  ArrowRight: () => <svg data-testid="arrow-right-icon" />,
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
      expect(toast.error).toHaveBeenCalledWith('Please fill in all required fields')
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
