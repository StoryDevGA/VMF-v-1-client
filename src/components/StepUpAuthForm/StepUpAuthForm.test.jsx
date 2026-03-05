import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToasterProvider } from '../Toaster'
import StepUpAuthForm from './StepUpAuthForm'

vi.mock('../../store/api/authApi.js', () => ({
  useRequestStepUpMutation: vi.fn(),
}))

import { useRequestStepUpMutation } from '../../store/api/authApi.js'

function renderForm(props = {}) {
  return render(
    <ToasterProvider>
      <StepUpAuthForm onStepUpComplete={vi.fn()} {...props} />
    </ToasterProvider>,
  )
}

describe('StepUpAuthForm', () => {
  const mockRequestStepUp = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useRequestStepUpMutation.mockReturnValue([
      mockRequestStepUp,
      { isLoading: false },
    ])
  })

  it('renders password field and action button', () => {
    renderForm()

    expect(
      screen.getByLabelText(/re-enter password/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /verify identity/i }),
    ).toBeInTheDocument()
  })

  it('validates required password before submitting', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /verify identity/i }))

    expect(
      screen.getByText(/password is required to continue/i),
    ).toBeInTheDocument()
    expect(mockRequestStepUp).not.toHaveBeenCalled()
  })

  it('calls onStepUpComplete when token request succeeds', async () => {
    const user = userEvent.setup()
    const onStepUpComplete = vi.fn()

    mockRequestStepUp.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: { stepUpToken: 'token-123', expiresIn: 900 },
        }),
    })

    renderForm({ onStepUpComplete })

    await user.type(
      screen.getByLabelText(/re-enter password/i),
      'correct-horse-battery-staple',
    )
    await user.click(screen.getByRole('button', { name: /verify identity/i }))

    expect(onStepUpComplete).toHaveBeenCalledWith('token-123', 900)
  })

  it('supports custom password label and helper text', () => {
    renderForm({
      passwordLabel: 'Current Super Admin Password',
      passwordHelperText: 'Enter your current Super Admin password to verify this replacement.',
    })

    expect(screen.getByLabelText(/current super admin password/i)).toBeInTheDocument()
    expect(
      screen.getByText(/verify this replacement/i),
    ).toBeInTheDocument()
  })

  it('shows actionable guidance for expired step-up tokens', async () => {
    const user = userEvent.setup()
    mockRequestStepUp.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 401,
          data: {
            error: {
              code: 'STEP_UP_INVALID',
              message: 'Step-up token expired or invalid. Re-authenticate and try again.',
              requestId: 'step-up-invalid-1',
            },
          },
        }),
    })

    renderForm()

    await user.type(screen.getByLabelText(/re-enter password/i), 'incorrect-password')
    await user.click(screen.getByRole('button', { name: /verify identity/i }))

    const errorAlert = await screen.findByRole('alert')
    expect(errorAlert).toHaveTextContent(/step-up verification has expired/i)
    expect(errorAlert).toHaveTextContent(/\(Ref: step-up-invalid-1\)/i)
  })

  it('shows actionable guidance when step-up verification is unavailable', async () => {
    const user = userEvent.setup()
    mockRequestStepUp.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 503,
          data: {
            error: {
              code: 'STEP_UP_UNAVAILABLE',
              message: 'Step-up verification is unavailable right now. Try again shortly.',
              requestId: 'step-up-unavailable-1',
            },
          },
        }),
    })

    renderForm()

    await user.type(screen.getByLabelText(/re-enter password/i), 'password')
    await user.click(screen.getByRole('button', { name: /verify identity/i }))

    const errorAlert = await screen.findByRole('alert')
    expect(errorAlert).toHaveTextContent(/step-up verification is temporarily unavailable/i)
    expect(errorAlert).toHaveTextContent(/\(Ref: step-up-unavailable-1\)/i)
  })
})
