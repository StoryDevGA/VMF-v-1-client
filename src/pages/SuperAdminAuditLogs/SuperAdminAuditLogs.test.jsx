import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToasterProvider } from '../../components/Toaster'
import SuperAdminAuditLogs from './SuperAdminAuditLogs'

vi.mock('../../store/api/auditLogApi.js', () => ({
  useQueryAuditLogsQuery: vi.fn(),
  useGetAuditStatsQuery: vi.fn(),
  useLazyGetAuditLogsByRequestQuery: vi.fn(),
  useLazyGetAuditLogsByResourceQuery: vi.fn(),
  useVerifyAuditIntegrityMutation: vi.fn(),
}))

import {
  useQueryAuditLogsQuery,
  useGetAuditStatsQuery,
  useLazyGetAuditLogsByRequestQuery,
  useLazyGetAuditLogsByResourceQuery,
  useVerifyAuditIntegrityMutation,
} from '../../store/api/auditLogApi.js'

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
      <SuperAdminAuditLogs />
    </ToasterProvider>,
  )
}

describe('SuperAdminAuditLogs page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useQueryAuditLogsQuery.mockReturnValue({
      data: { data: [], meta: { page: 1, totalPages: 1, totalCount: 0 } },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useGetAuditStatsQuery.mockReturnValue({
      data: { data: { total: 0, byAction: [], byResourceType: [] } },
      isFetching: false,
    })
    useLazyGetAuditLogsByRequestQuery.mockReturnValue([vi.fn(), { data: { data: [] }, isFetching: false }])
    useLazyGetAuditLogsByResourceQuery.mockReturnValue([vi.fn(), { data: { data: [] }, isFetching: false }])
    useVerifyAuditIntegrityMutation.mockReturnValue([vi.fn(), { isLoading: false }])
  })

  it('renders heading and verify action', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /audit logs explorer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /verify integrity/i })).toBeInTheDocument()
  })

  it('renders timestamp column using standardized two-line date/time format', () => {
    const timestamp = '2026-03-05T14:30:00.000Z'
    const timestampParts = getExpectedDateTimeParts(timestamp)

    useQueryAuditLogsQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'log-1',
            ts: timestamp,
            action: 'CUSTOMER_UPDATED',
            resourceType: 'Customer',
            resourceId: 'cust-1',
            actorUserId: 'admin-1',
            requestId: 'req-1',
          },
        ],
        meta: { page: 1, totalPages: 1, totalCount: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    const timestampNode = document.querySelector('.table-date-time')
    expect(timestampNode).not.toBeNull()
    expect(timestampNode).toHaveAttribute('datetime', timestampParts.iso)
    expect(timestampNode.querySelector('.table-date-time__date')).toHaveTextContent(timestampParts.dateLabel)
    expect(timestampNode.querySelector('.table-date-time__time')).toHaveTextContent(timestampParts.timeLabel)
  })
})
