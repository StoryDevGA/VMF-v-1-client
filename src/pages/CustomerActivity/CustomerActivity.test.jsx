import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CustomerActivity from './CustomerActivity.jsx'

vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: vi.fn(),
}))

vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useListRuntimeInstanceActivityQuery: vi.fn(),
}))

import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useListRuntimeInstanceActivityQuery } from '../../store/api/runtimeInstanceApi.js'

describe('Customer Activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTenantContext.mockReturnValue({ customerId: 'customer-1', tenantId: 'tenant-1' })
  })

  it('opens a workspace-scoped activity list and keeps a top Back destination', () => {
    useListRuntimeInstanceActivityQuery.mockReturnValue({
      data: { data: [
        { id: 'event-a', runtimeInstanceId: 'instance-a', runtimeName: 'Workspace A', summary: 'Workspace A changed', occurredAt: '2026-09-20T12:00:00.000Z' },
        { id: 'event-b', runtimeInstanceId: 'instance-b', runtimeName: 'Workspace B', summary: 'Workspace B changed', occurredAt: '2026-09-21T12:00:00.000Z' },
      ] },
      isLoading: false,
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/app/activity?runtimeInstanceId=instance-a']}>
        <Routes>
          <Route path="/app/activity" element={<CustomerActivity />} />
          <Route path="/app/dashboard" element={<p>Customer Home destination</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: '← Back to Customer Home' })).toHaveAttribute('href', '/app/dashboard')
    expect(screen.getByRole('heading', { name: 'Workspace A changed' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Workspace B changed' })).not.toBeInTheDocument()
  })
})
