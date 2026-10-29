import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import { useAuth } from '../hooks/useAuth'

// Mock the auth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn(),
    logout: vi.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
}))

// Mock UI components
vi.mock('../components/ui', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode; type?: string; disabled?: boolean; onClick?: () => void; className?: string; variant?: string; size?: string }) => (
    <button {...props} data-testid="button">{children}</button>
  ),
  Input: ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} data-testid="input" />
  ),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: () => <svg data-testid="loader-icon" />,
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login page with title and description', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    expect(screen.getByText('axiom-hub')).toBeInTheDocument()
    expect(screen.getByText('The design language that makes your AI harness better at design')).toBeInTheDocument()
    expect(screen.getByText('Sign in')).toBeInTheDocument()
    expect(screen.getByText('Continue with your organization account')).toBeInTheDocument()
  })

  it('has accessible form structure', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    const button = screen.getByRole('button', { name: /Continue with Keycloak/i })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
  })
})
