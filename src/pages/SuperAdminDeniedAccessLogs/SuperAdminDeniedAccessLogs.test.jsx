import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToasterProvider } from '../../components/Toaster'
import SuperAdminDeniedAccessLogs from './SuperAdminDeniedAccessLogs'

vi.mock('../../store/api/superAdminAuditApi.js', () => ({
  useListDeniedAccessLogsQuery: vi.fn(),
}))

import { useListDeniedAccessLogsQuery } from '../../store/api/superAdminAuditApi.js'

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
      <SuperAdminDeniedAccessLogs />
    </ToasterProvider>,
  )
}

describe('SuperAdminDeniedAccessLogs page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useListDeniedAccessLogsQuery.mockReturnValue({
      data: { data: [], meta: { page: 1, totalPages: 1, total: 0 } },
      isLoading: false,
      isFetching: false,
      error: null,
    })
  })

  it('renders heading and filters', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: /denied access logs/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/actor user id/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
  })

  it('renders timestamp column using standardized two-line date/time format', () => {
    const createdAt = '2026-03-05T14:30:00.000Z'
    const parts = getExpectedDateTimeParts(createdAt)

    useListDeniedAccessLogsQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'dal-1',
            createdAt,
            action: 'ACCESS_DENIED',
            resourceType: 'Customer',
            resourceId: 'cust-1',
            requestId: 'req-1',
            actorUserId: 'user-1',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    const timestampNode = document.querySelector('.table-date-time')
    expect(timestampNode).not.toBeNull()
    expect(timestampNode).toHaveAttribute('datetime', parts.iso)
    expect(timestampNode.querySelector('.table-date-time__date')).toHaveTextContent(parts.dateLabel)
    expect(timestampNode.querySelector('.table-date-time__time')).toHaveTextContent(parts.timeLabel)
  })

  it('supports first/last pagination controls in denied-access logs results', async () => {
    const user = userEvent.setup()
    useListDeniedAccessLogsQuery.mockImplementation(({ page = 1 }) => ({
      data: { data: [], meta: { page, totalPages: 4, total: 80 } },
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
      expect(useListDeniedAccessLogsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 4, pageSize: 20 }),
      )
    })
    expect(screen.getByText(/page 4 of 4/i)).toBeInTheDocument()

    await user.click(firstButton)

    await waitFor(() => {
      expect(useListDeniedAccessLogsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, pageSize: 20 }),
      )
    })
    expect(screen.getByText(/page 1 of 4/i)).toBeInTheDocument()
  })
})
