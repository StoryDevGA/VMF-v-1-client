import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToasterProvider } from '../../components/Toaster'
import OwnershipTransferDialog from './OwnershipTransferDialog'

const mockUseReplaceCustomerAdminMutation = vi.fn()

vi.mock('../../store/api/customerApi.js', () => ({
  useReplaceCustomerAdminMutation: (...args) => mockUseReplaceCustomerAdminMutation(...args),
}))

vi.mock('../../components/StepUpAuthForm', () => ({
  StepUpAuthForm: ({ onStepUpComplete, passwordLabel, passwordHelperText }) => (
    <div>
      <p data-testid="ownership-step-up-label">{passwordLabel}</p>
      <p data-testid="ownership-step-up-helper">{passwordHelperText}</p>
      <button type="button" onClick={() => onStepUpComplete('mock-step-up-token')}>
        Mock Step-Up Complete
      </button>
    </div>
  ),
}))

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function () {
    this.open = false
  })
})

const currentCanonicalUser = {
  _id: 'user-1',
  name: 'Owner User',
  email: 'owner@acme.com',
  isCanonicalAdmin: true,
}

const replacementUser = {
  _id: 'user-2',
  name: 'Replacement User',
  email: 'replacement@acme.com',
  isActive: true,
}

function renderDialog(props = {}) {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    customerId: 'cust-1',
    currentCanonicalUser,
    targetUser: replacementUser,
    ...props,
  }

  return {
    ...render(
      <ToasterProvider>
        <OwnershipTransferDialog {...defaultProps} />
      </ToasterProvider>,
    ),
    onClose: defaultProps.onClose,
  }
}

describe('OwnershipTransferDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const replaceCustomerAdmin = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          message: 'Canonical ownership transferred successfully.',
          canonicalAdminUserId: 'user-2',
        },
        meta: {
          requestId: 'transfer-req-1',
        },
      }),
    })

    mockUseReplaceCustomerAdminMutation.mockReturnValue([
      replaceCustomerAdmin,
      { isLoading: false },
    ])
  })

  it('renders current owner, replacement user, and step-up guidance', () => {
    renderDialog()

    expect(
      screen.getByRole('heading', { name: /transfer customer admin ownership/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/owner user/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/replacement user/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByTestId('ownership-step-up-label')).toHaveTextContent(/current password/i)
    expect(screen.getByTestId('ownership-step-up-helper')).toHaveTextContent(
      /verify this ownership transfer/i,
    )
  })

  it('submits the guided ownership-transfer flow and preserves requestId on success', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog()
    const replaceCustomerAdmin = mockUseReplaceCustomerAdminMutation.mock.results[0].value[0]

    await user.type(screen.getByLabelText(/^reason$/i), 'Ownership transfer for coverage handoff')
    expect(screen.getByRole('button', { name: /transfer ownership/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /mock step-up complete/i }))
    await user.click(screen.getByRole('button', { name: /transfer ownership/i }))

    await waitFor(() => {
      expect(replaceCustomerAdmin).toHaveBeenCalledWith({
        customerId: 'cust-1',
        newUserId: 'user-2',
        reason: 'Ownership transfer for coverage handoff',
        stepUpToken: 'mock-step-up-token',
      })
    })

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(
        screen.getByText(/canonical ownership transferred successfully\.\s+\(Ref: transfer-req-1\)/i),
      ).toBeInTheDocument()
    })
  })

  it('maps reason-based transfer failures to actionable guidance with requestId', async () => {
    const user = userEvent.setup()
    const replaceCustomerAdmin = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: {
          error: {
            code: 'CONFLICT',
            requestId: 'transfer-req-err-1',
            details: {
              reason: 'INACTIVE_TARGET_USER',
            },
          },
        },
      }),
    })

    mockUseReplaceCustomerAdminMutation.mockReturnValue([
      replaceCustomerAdmin,
      { isLoading: false },
    ])

    const { onClose } = renderDialog()

    await user.type(screen.getByLabelText(/^reason$/i), 'Ownership transfer for coverage handoff')
    await user.click(screen.getByRole('button', { name: /mock step-up complete/i }))
    await user.click(screen.getByRole('button', { name: /transfer ownership/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /only active users can receive customer ownership/i,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/\(Ref: transfer-req-err-1\)/i)
    expect(onClose).not.toHaveBeenCalled()
  })
})
