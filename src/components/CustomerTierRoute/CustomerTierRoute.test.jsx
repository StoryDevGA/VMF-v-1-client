import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CustomerTierRoute from './CustomerTierRoute'

vi.mock('react-redux', () => ({
  useSelector: (selector) => selector({ authStatus: 'authenticated' }),
}))

vi.mock('../../hooks/useAuthorization.js', () => ({
  useAuthorization: vi.fn(),
}))

vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: vi.fn(),
}))

vi.mock('../../store/slices/authSlice.js', () => ({
  selectAuthStatus: (state) => state.authStatus,
}))

import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'

function renderRoute({ scope, requiredTier = 'CORE', customerId = 'cust-1' } = {}) {
  useTenantContext.mockReturnValue({ customerId })
  useAuthorization.mockReturnValue({ getCustomerScope: vi.fn(() => scope) })

  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={(
            <CustomerTierRoute requiredTier={requiredTier}>
              <h1>Protected customer surface</h1>
            </CustomerTierRoute>
          )}
        />
        <Route path="/app/dashboard" element={<h1>Customer Home</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CustomerTierRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows a Core scope to reach Core surfaces', () => {
    renderRoute({ scope: { featureEntitlements: ['VMF'] } })
    expect(screen.getByRole('heading', { name: 'Protected customer surface' })).toBeInTheDocument()
  })

  it('redirects Signal scopes away from Core surfaces', () => {
    renderRoute({ scope: { featureEntitlements: ['DEALS'] } })
    expect(screen.getByRole('heading', { name: 'Customer Home' })).toBeInTheDocument()
  })

  it('fails closed for missing customer scope', () => {
    renderRoute({ scope: null })
    expect(screen.getByRole('heading', { name: 'Customer Home' })).toBeInTheDocument()
  })
})
