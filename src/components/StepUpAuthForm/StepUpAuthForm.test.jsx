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
})
