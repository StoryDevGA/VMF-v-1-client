import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AssuranceDetails from './AssuranceDetails.jsx'

vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: vi.fn(),
}))

vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetRuntimeInstanceSummaryQuery: vi.fn(),
}))

import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useGetRuntimeInstanceSummaryQuery } from '../../store/api/runtimeInstanceApi.js'

function renderAssuranceDetails() {
  return render(
    <MemoryRouter initialEntries={['/app/runtime/instance-1/assurance']}>
      <Routes>
        <Route path="/app/runtime/:runtimeInstanceId/assurance" element={<AssuranceDetails />} />
        <Route path="/app/dashboard" element={<p>Customer Home destination</p>} />
        <Route path="/app/runtime/:runtimeInstanceId" element={<p>Workspace destination</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Assurance Details', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTenantContext.mockReturnValue({ customerId: 'customer-1', tenantId: 'tenant-1' })
  })

  it('keeps locked workspaces read-only and provides the prototype-aligned navigation', () => {
    useGetRuntimeInstanceSummaryQuery.mockReturnValue({
      data: { data: {
        id: 'instance-1',
        name: 'Locked workspace',
        status: 'LOCKED',
        lockStatus: 'LOCKED',
        lockedAt: '2026-09-20T10:00:00.000Z',
        frameworkLifecycleStage: 'PUBLISHED',
        submittedForReview: true,
        validationStatus: 'PENDING',
      } },
      isLoading: false,
      error: null,
    })

    renderAssuranceDetails()

    expect(screen.getByRole('link', { name: '← Back to Customer Home' })).toHaveAttribute('href', '/app/dashboard')
    expect(screen.getByRole('link', { name: 'VIEW DETAILS' })).toHaveClass('customer-centre__hero-action--primary')
    expect(screen.getByText('Locked · read-only')).toBeInTheDocument()
    expect(screen.queryByText('Evidence status')).not.toBeInTheDocument()
    expect(screen.queryByText('Review status')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Open review item/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Create final asset/i })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Workspace owner' })).toHaveClass('customer-centre__workspace-owner')

    fireEvent.click(screen.getByRole('link', { name: '← Back to Customer Home' }))
    expect(screen.getByText('Customer Home destination')).toBeInTheDocument()
  })

  it('retains bounded assurance and review information for an unlocked workspace', () => {
    useGetRuntimeInstanceSummaryQuery.mockReturnValue({
      data: { data: {
        id: 'instance-1',
        name: 'Published workspace',
        status: 'PUBLISHED',
        frameworkLifecycleStage: 'PUBLISHED',
        submittedForReview: false,
        validationStatus: 'ACCEPTED',
      } },
      isLoading: false,
      error: null,
    })

    renderAssuranceDetails()

    expect(screen.getByText('Evidence status')).toBeInTheDocument()
    expect(screen.getByText('Review status')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open review item/i })).toBeInTheDocument()
  })
})
