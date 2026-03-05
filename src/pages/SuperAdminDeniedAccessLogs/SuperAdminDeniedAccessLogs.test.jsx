import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})
