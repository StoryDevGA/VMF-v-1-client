import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToasterProvider } from '../../components/Toaster'
import SuperAdminInvitations from './SuperAdminInvitations'

vi.mock('../../store/api/invitationApi.js', () => ({
  useListInvitationsQuery: vi.fn(),
  useResendInvitationMutation: vi.fn(),
  useRevokeInvitationMutation: vi.fn(),
}))

vi.mock('../../components/StepUpAuthForm', () => ({
  StepUpAuthForm: () => <div>StepUpAuthForm</div>,
}))

import {
  useListInvitationsQuery,
  useResendInvitationMutation,
  useRevokeInvitationMutation,
} from '../../store/api/invitationApi.js'

const padTwoDigits = (value) => String(value).padStart(2, '0')

const getExpectedDateTimeParts = (value) => {
  const parsed = new Date(value)
  return {
    iso: parsed.toISOString(),
    dateLabel: `${parsed.getFullYear()}-${padTwoDigits(parsed.getMonth() + 1)}-${padTwoDigits(parsed.getDate())}`,
    timeLabel: `${padTwoDigits(parsed.getHours())}:${padTwoDigits(parsed.getMinutes())}`,
  }
}

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

    useResendInvitationMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useRevokeInvitationMutation.mockReturnValue([vi.fn(), { isLoading: false }])
  })

  it('renders heading and invitation history without create form', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: /invitation management/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /invitation history/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /create invitation/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /send invitation/i })).not.toBeInTheDocument()
  })

  it('disables browser autofill for invitation search input', () => {
    renderPage()

    const searchInput = screen.getByLabelText(/search/i, { selector: 'input' })
    expect(searchInput).not.toHaveAttribute('placeholder')
    expect(searchInput).toHaveAttribute('autocomplete', 'off')
    expect(searchInput).toHaveAttribute('autocorrect', 'off')
    expect(searchInput).toHaveAttribute('autocapitalize', 'none')
    expect(searchInput).toHaveAttribute('spellcheck', 'false')
  })

  it('renders expires and updated table timestamps in standardized two-line format', () => {
    const expiresAt = '2026-03-11T10:00:00.000Z'
    const updatedAt = '2026-03-05T14:30:00.000Z'
    const expiresParts = getExpectedDateTimeParts(expiresAt)
    const updatedParts = getExpectedDateTimeParts(updatedAt)

    useListInvitationsQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'inv-1',
            recipientName: 'Alpha User',
            recipientEmail: 'alpha@example.com',
            company: { name: 'Alpha Co' },
            status: 'created',
            expiresAt,
            updatedAt,
          },
        ],
        meta: { page: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    const dateTimeNodes = Array.from(document.querySelectorAll('.table-date-time'))
    expect(dateTimeNodes).toHaveLength(2)
    for (const dateTimeNode of dateTimeNodes) {
      expect(dateTimeNode.querySelector('.table-date-time__date')).toHaveTextContent(/^\d{4}-\d{2}-\d{2}$/)
      expect(dateTimeNode.querySelector('.table-date-time__time')).toHaveTextContent(/^\d{2}:\d{2}$/)
    }

    expect(document.querySelector(`.table-date-time[datetime="${expiresParts.iso}"]`)).not.toBeNull()
    expect(document.querySelector(`.table-date-time[datetime="${updatedParts.iso}"]`)).not.toBeNull()
    expect(screen.getByText(expiresParts.dateLabel)).toBeInTheDocument()
    expect(screen.getByText(expiresParts.timeLabel)).toBeInTheDocument()
    expect(screen.getByText(updatedParts.dateLabel)).toBeInTheDocument()
    expect(screen.getByText(updatedParts.timeLabel)).toBeInTheDocument()
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

  it('supports first/last pagination controls for invitation history', async () => {
    const user = userEvent.setup()
    useListInvitationsQuery.mockImplementation(({ page = 1 }) => ({
      data: {
        data: [],
        meta: { page, totalPages: 3 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }))

    renderPage()

    const firstButton = screen.getByRole('button', { name: /^first$/i })
    const previousButton = screen.getByRole('button', { name: /^previous$/i })
    const nextButton = screen.getByRole('button', { name: /^next$/i })
    const lastButton = screen.getByRole('button', { name: /^last$/i })

    expect(firstButton).toBeDisabled()
    expect(previousButton).toBeDisabled()
    expect(nextButton).not.toBeDisabled()
    expect(lastButton).not.toBeDisabled()

    await user.click(lastButton)

    await waitFor(() => {
      expect(useListInvitationsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 3 }),
        { skip: false },
      )
    })
    expect(screen.getByText(/page 3 of 3/i)).toBeInTheDocument()

    await user.click(firstButton)

    await waitFor(() => {
      expect(useListInvitationsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
        { skip: false },
      )
    })
    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument()
  })
})
