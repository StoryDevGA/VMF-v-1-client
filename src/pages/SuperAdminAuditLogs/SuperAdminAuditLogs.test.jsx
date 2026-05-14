import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    expect(screen.getByRole('group', { name: /^query$/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /^governance$/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /^runtime package$/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /^component and actor$/i })).toBeInTheDocument()
    expect(screen.getByText(/showing audit rows that match the selected query/i)).toBeInTheDocument()
    const verifyButton = screen.getByRole('button', { name: /verify integrity/i })
    expect(verifyButton).toBeInTheDocument()
    expect(verifyButton.closest('.super-admin-audit-logs__verify-row')).not.toBeNull()
  })

  it('renders lookup controls and stats using available audit data', () => {
    useGetAuditStatsQuery.mockReturnValue({
      data: {
        data: {
          total: 550,
          byAction: [{ _id: 'ACCESS_DENIED', count: 126 }],
          byResourceType: [{ _id: 'User', count: 133 }],
        },
      },
      isFetching: false,
    })

    renderPage()

    expect(screen.queryByText(/^request$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^resource$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^matches$/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /lookup request/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /lookup resource/i })).toBeInTheDocument()
    expect(screen.getByText(/request matches 0/i)).toBeInTheDocument()
    expect(screen.getByText(/resource matches 0/i)).toBeInTheDocument()
    expect(screen.getByText('550')).toBeInTheDocument()
    expect(screen.getAllByText('ACCESS_DENIED').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('User').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByLabelText('ACCESS_DENIED 126')).toHaveAttribute('value', '126')
    expect(screen.getByLabelText('User 133')).toHaveAttribute('value', '133')
  })

  it('uses native bounded date picker inputs for audit query and integrity ranges', async () => {
    renderPage()

    const queryStartDate = document.getElementById('audit-filter-start-date')
    const queryEndDate = document.getElementById('audit-filter-end-date')
    const verifyStartDate = document.getElementById('audit-verify-start-date')
    const verifyEndDate = document.getElementById('audit-verify-end-date')

    expect(queryStartDate).toHaveAttribute('type', 'date')
    expect(queryEndDate).toHaveAttribute('type', 'date')
    expect(verifyStartDate).toHaveAttribute('type', 'date')
    expect(verifyEndDate).toHaveAttribute('type', 'date')

    fireEvent.change(queryStartDate, { target: { value: '2026-05-01' } })
    fireEvent.change(queryEndDate, { target: { value: '2026-05-14' } })
    fireEvent.change(verifyStartDate, { target: { value: '2026-04-01' } })
    fireEvent.change(verifyEndDate, { target: { value: '2026-04-30' } })

    await waitFor(() => {
      expect(queryStartDate).toHaveAttribute('max', '2026-05-14')
      expect(queryEndDate).toHaveAttribute('min', '2026-05-01')
      expect(verifyStartDate).toHaveAttribute('max', '2026-04-30')
      expect(verifyEndDate).toHaveAttribute('min', '2026-04-01')
    })
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
            summary: 'Super Admin updated customer Acme Corp',
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
    expect(screen.getByText('Super Admin updated customer Acme Corp')).toBeInTheDocument()
  })

  it('renders readable fallback event text when summary is missing', () => {
    useQueryAuditLogsQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'log-2',
            ts: '2026-03-05T14:30:00.000Z',
            action: 'VMF_GRANT_CREATED',
            resourceType: 'User',
            resourceId: '69c5205f9510a816ace195e4',
            actorUserId: { name: 'Jane Admin' },
            display: {
              targetLabel: 'John User <john@example.com>',
              scopeLabel: 'Alpha VMF',
              permissionLabels: ['READ'],
            },
            requestId: 'req-2',
          },
        ],
        meta: { page: 1, totalPages: 1, totalCount: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    expect(screen.getByText('Jane Admin granted John User <john@example.com> READ access to Alpha VMF')).toBeInTheDocument()
    expect(screen.getByText('VMF Grant Created')).toBeInTheDocument()
  })

  it('renders governance audit fields for system events', () => {
    useQueryAuditLogsQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'log-governance-1',
            ts: '2026-05-14T08:53:39.000Z',
            action: 'FRAMEWORK_PACKAGE_VALIDATED',
            summary: 'Super Admin validated framework package VMF 2.3.1',
            resourceType: 'FrameworkPackage',
            resourceId: '69c5205f9510a816ace195e4',
            actorUserId: { name: 'Super Admin' },
            requestId: 'req-governance-1',
            isSystemEvent: true,
            systemEventType: 'PACKAGE_VALIDATED',
            eventCategory: 'PACKAGE',
            eventSeverity: 'HIGH',
            frameworkKey: 'VMF',
            frameworkVersion: '2.3.1',
            packageKey: 'vmf-v2-3-1-standard',
            checksum: 'checksum-123',
          },
        ],
        meta: { page: 1, totalPages: 1, totalCount: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    expect(screen.getAllByText('PACKAGE_VALIDATED').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('VMF / 2.3.1 / vmf-v2-3-1-standard')).toBeInTheDocument()
    expect(screen.getByText('Super Admin validated framework package VMF 2.3.1')).toBeInTheDocument()
  })

  it('passes governance filters to the audit query', async () => {
    const user = userEvent.setup()

    renderPage()

    await user.selectOptions(screen.getByLabelText(/audit layer/i), 'true')
    await user.selectOptions(screen.getByLabelText(/system event type/i), 'PACKAGE_ACTIVATED')
    await user.selectOptions(screen.getByLabelText(/event category/i), 'PACKAGE')
    await user.selectOptions(screen.getByLabelText(/severity/i), 'CRITICAL')
    await user.type(screen.getByLabelText(/framework key/i), 'VMF')
    await user.type(screen.getByLabelText(/framework version/i), '2.3.1')
    await user.type(screen.getByLabelText(/package key/i), 'vmf-v2-3-1-standard')
    await user.type(screen.getByLabelText(/component type/i), 'SKILL')
    await user.type(screen.getByLabelText(/component stable id/i), 'skill-vmf-required-sections-validator')
    await user.type(screen.getByLabelText(/component version/i), '2')
    await user.type(screen.getByLabelText(/checksum/i), 'checksum-123')

    await waitFor(() => {
      expect(useQueryAuditLogsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isSystemEvent: 'true',
          systemEventType: 'PACKAGE_ACTIVATED',
          eventCategory: 'PACKAGE',
          eventSeverity: 'CRITICAL',
          frameworkKey: 'VMF',
          frameworkVersion: '2.3.1',
          packageKey: 'vmf-v2-3-1-standard',
          componentType: 'SKILL',
          componentStableId: 'skill-vmf-required-sections-validator',
          componentVersion: '2',
          checksum: 'checksum-123',
          pageSize: 10,
        }),
        expect.any(Object),
      )
    })
  })

  it('supports first/last pagination controls in audit log query results', async () => {
    const user = userEvent.setup()
    useQueryAuditLogsQuery.mockImplementation(({ page = 1 }) => ({
      data: { data: [], meta: { page, totalPages: 4, totalCount: 80 } },
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
      expect(useQueryAuditLogsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 4, pageSize: 10 }),
        expect.any(Object),
      )
    })
    expect(screen.getByText(/page 4 of 4/i)).toBeInTheDocument()

    await user.click(firstButton)

    await waitFor(() => {
      expect(useQueryAuditLogsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, pageSize: 10 }),
        expect.any(Object),
      )
    })
    expect(screen.getByText(/page 1 of 4/i)).toBeInTheDocument()
  })
})
