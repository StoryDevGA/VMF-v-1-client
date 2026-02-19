import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToasterProvider } from '../../components/Toaster'
import SuperAdminDeniedAccessLogs from './SuperAdminDeniedAccessLogs'

vi.mock('../../store/api/superAdminAuditApi.js', () => ({
  useListDeniedAccessLogsQuery: vi.fn(),
}))

import { useListDeniedAccessLogsQuery } from '../../store/api/superAdminAuditApi.js'

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
})
