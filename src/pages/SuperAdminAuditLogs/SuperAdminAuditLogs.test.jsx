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
})

