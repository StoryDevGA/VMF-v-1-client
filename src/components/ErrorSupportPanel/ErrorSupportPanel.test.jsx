import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToasterProvider } from '../Toaster'
import { ErrorSupportPanel } from './ErrorSupportPanel'

describe('ErrorSupportPanel', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders nothing when error is null', () => {
    const { container } = render(
      <ToasterProvider>
        <ErrorSupportPanel error={null} />
      </ToasterProvider>,
    )
    expect(container.querySelector('.error-support')).toBeNull()
  })

  it('renders error message inside an alert region', () => {
    render(
      <ToasterProvider>
        <ErrorSupportPanel
          error={{ code: 'SERVER_ERROR', message: 'Something broke', status: 500 }}
        />
      </ToasterProvider>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something broke')).toBeInTheDocument()
  })

  it('renders request id and retry hint', () => {
    render(
      <ToasterProvider>
        <ErrorSupportPanel
          error={{
            code: 'HTTP_429',
            message: 'Too many requests',
            requestId: 'req-123',
            status: 429,
          }}
          retryRemainingSeconds={61}
        />
      </ToasterProvider>,
    )

    expect(screen.getByText(/request id/i)).toBeInTheDocument()
    expect(screen.getByText(/retry available in/i)).toBeInTheDocument()
  })

  it('hides retry hint when retryRemainingSeconds is 0', () => {
    render(
      <ToasterProvider>
        <ErrorSupportPanel
          error={{
            code: 'HTTP_429',
            message: 'Rate limited',
            status: 429,
          }}
          retryRemainingSeconds={0}
        />
      </ToasterProvider>,
    )
    expect(screen.queryByText(/retry available in/i)).toBeNull()
  })

  it('hides request id when not present', () => {
    render(
      <ToasterProvider>
        <ErrorSupportPanel
          error={{ code: 'NETWORK_ERROR', message: 'Network error' }}
        />
      </ToasterProvider>,
    )
    expect(screen.queryByText(/request id/i)).toBeNull()
  })

  it('renders Report Issue button', () => {
    render(
      <ToasterProvider>
        <ErrorSupportPanel
          error={{ code: 'SERVER_ERROR', message: 'Fail', requestId: 'r-1', status: 500 }}
        />
      </ToasterProvider>,
    )
    expect(screen.getByRole('button', { name: /report issue/i })).toBeInTheDocument()
  })

  it('copies report payload when report button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <ToasterProvider>
        <ErrorSupportPanel
          error={{
            code: 'SERVER_ERROR',
            message: 'Something failed',
            requestId: 'req-456',
            status: 500,
          }}
        />
      </ToasterProvider>,
    )

    await user.click(screen.getByRole('button', { name: /report issue/i }))
    expect(
      screen.getByText(/issue details copied|unable to copy issue details/i),
    ).toBeInTheDocument()
  })

  it('shows clipboard error toast when clipboard API is blocked', async () => {
    const user = userEvent.setup()
    const original = navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) },
      writable: true,
      configurable: true,
    })

    render(
      <ToasterProvider>
        <ErrorSupportPanel
          error={{ code: 'SERVER_ERROR', message: 'Fail', status: 500 }}
        />
      </ToasterProvider>,
    )

    await user.click(screen.getByRole('button', { name: /report issue/i }))
    expect(screen.getByText(/unable to copy issue details/i)).toBeInTheDocument()

    // Restore original clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: original,
      writable: true,
      configurable: true,
    })
  })
})
