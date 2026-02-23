import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToasterProvider } from '../../components/Toaster'
import SuperAdminInvitations from './SuperAdminInvitations'

vi.mock('../../store/api/invitationApi.js', () => ({
  useListInvitationsQuery: vi.fn(),
  useCreateInvitationMutation: vi.fn(),
  useResendInvitationMutation: vi.fn(),
  useRevokeInvitationMutation: vi.fn(),
}))

vi.mock('../../components/StepUpAuthForm', () => ({
  StepUpAuthForm: () => <div>StepUpAuthForm</div>,
}))

import {
  useListInvitationsQuery,
  useCreateInvitationMutation,
  useResendInvitationMutation,
  useRevokeInvitationMutation,
} from '../../store/api/invitationApi.js'

function renderPage() {
  return render(
    <ToasterProvider>
      <SuperAdminInvitations />
    </ToasterProvider>,
  )
}

describe('SuperAdminInvitations page', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useListInvitationsQuery.mockReturnValue({
      data: { data: [], meta: { page: 1, totalPages: 1 } },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    useCreateInvitationMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useResendInvitationMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useRevokeInvitationMutation.mockReturnValue([vi.fn(), { isLoading: false }])
  })

  it('renders heading and create form', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: /invitation management/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send invitation/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /invitation history/i })).toBeInTheDocument()
  })

  it('disables Revoke action for revoked invitations', async () => {
    const user = userEvent.setup()

    useListInvitationsQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'inv-1',
            recipientName: 'Alpha User',
            recipientEmail: 'alpha@example.com',
            company: { name: 'Alpha Co' },
            status: 'revoked',
          },
          {
            id: 'inv-2',
            recipientName: 'Beta User',
            recipientEmail: 'beta@example.com',
            company: { name: 'Beta Co' },
            status: 'sent',
          },
        ],
        meta: { page: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    const revokeButtons = screen.getAllByRole('button', { name: /revoke/i })
    expect(revokeButtons).toHaveLength(2)
    expect(revokeButtons[0]).toBeDisabled()
    expect(revokeButtons[1]).not.toBeDisabled()

    await user.click(revokeButtons[0])
    expect(
      screen.queryByRole('heading', { name: /revoke invitation/i }),
    ).not.toBeInTheDocument()
  })
})
