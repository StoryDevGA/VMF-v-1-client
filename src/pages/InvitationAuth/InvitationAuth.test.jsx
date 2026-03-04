import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import InvitationAuth from './InvitationAuth'

vi.mock('../../store/api/fakeAuthApi.js', () => ({
  useFakeAuthInvitationQuery: vi.fn(),
  useCompleteFakeAuthMutation: vi.fn(),
}))

import {
  useFakeAuthInvitationQuery,
  useCompleteFakeAuthMutation,
} from '../../store/api/fakeAuthApi.js'

const BASE_INVITATION = {
  recipientName: 'Gary Guy',
  recipientEmail: 'gary@mail.com',
  companyName: 'Trilogy Web Solutions',
  status: 'accessed',
  expiresAt: '2026-03-11T16:16:21.000Z',
}

function renderPage(initialEntry = '/invitation-auth?invitationId=inv-1') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <InvitationAuth />
    </MemoryRouter>,
  )
}

describe('InvitationAuth page', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useFakeAuthInvitationQuery.mockReturnValue({
      data: { data: BASE_INVITATION },
      isLoading: false,
      error: null,
    })

    useCompleteFakeAuthMutation.mockReturnValue([
      vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) }),
      { isLoading: false, isSuccess: false, error: null },
    ])
  })

  it('shows missing invitation-id guidance when query param is absent', () => {
    renderPage('/invitation-auth')

    expect(screen.getByText(/no invitation id provided/i)).toBeInTheDocument()
  })

  it('renders invitation details and allows completion when status is accessed', () => {
    renderPage('/invitation-auth?invitationId=inv-1')

    expect(screen.getByRole('heading', { name: /identity verification/i })).toBeInTheDocument()
    expect(screen.getByText('gary@mail.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /complete verification/i })).toBeEnabled()
  })

  it('submits complete-fake-auth request with invitation id when user clicks complete', async () => {
    const user = userEvent.setup()
    const mockCompleteFakeAuth = vi.fn()
      .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) })
    useCompleteFakeAuthMutation.mockReturnValue([
      mockCompleteFakeAuth,
      { isLoading: false, isSuccess: false, error: null },
    ])

    renderPage('/invitation-auth?invitationId=inv-123')

    await user.click(screen.getByRole('button', { name: /complete verification/i }))

    expect(mockCompleteFakeAuth).toHaveBeenCalledWith('inv-123')
  })

  it('shows success state when completion succeeds (including customer-linked missing-user fallback)', () => {
    useCompleteFakeAuthMutation.mockReturnValue([
      vi.fn(),
      { isLoading: false, isSuccess: true, error: null },
    ])

    renderPage('/invitation-auth?invitationId=inv-1')

    expect(
      screen.getByText(/verification complete! the user has been marked as trusted/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /complete verification/i })).not.toBeInTheDocument()
  })

  it('surfaces USER_NOT_FOUND fallback error when completion fails without user/customer linkage', () => {
    useCompleteFakeAuthMutation.mockReturnValue([
      vi.fn(),
      {
        isLoading: false,
        isSuccess: false,
        error: {
          status: 404,
          data: {
            error: {
              code: 'USER_NOT_FOUND',
              message:
                'No user account found for gary@mail.com. Auto-provisioning may have failed. Please revoke and re-create the invitation.',
              requestId: 'mmc8p5bl-mqdem5',
            },
          },
        },
      },
    ])

    renderPage('/invitation-auth?invitationId=inv-1')

    expect(
      screen.getByText(/no user account found for gary@mail.com/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/\(Ref: mmc8p5bl-mqdem5\)/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /complete verification/i })).toBeEnabled()
  })
})
