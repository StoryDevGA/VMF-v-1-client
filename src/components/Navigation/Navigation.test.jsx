/**
 * Navigation — component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'

import Navigation from './Navigation.jsx'
import authReducer from '../../store/slices/authSlice.js'
import tenantContextReducer from '../../store/slices/tenantContextSlice.js'
import { baseApi } from '../../store/api/baseApi.js'

// ── Polyfills ────────────────────────────────────────────
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () { this.open = true })
  HTMLDialogElement.prototype.close = vi.fn(function () { this.open = false })
})

// ── User fixtures ────────────────────────────────────────
const anonymousUser = null

const customerAdminUser = {
  id: 'user-1',
  email: 'admin@acme.com',
  name: 'Admin',
  isActive: true,
  memberships: [{ customerId: 'cust-1', roles: ['CUSTOMER_ADMIN'] }],
  tenantMemberships: [],
  vmfGrants: [],
}

const superAdminUser = {
  id: 'user-2',
  email: 'super@vmf.io',
  name: 'Super Admin',
  isActive: true,
  memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
  tenantMemberships: [],
  vmfGrants: [],
}

const basicUser = {
  id: 'user-3',
  email: 'basic@acme.com',
  name: 'Basic',
  isActive: true,
  memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
  tenantMemberships: [],
  vmfGrants: [],
}

// ── Helpers ──────────────────────────────────────────────
function createTestStore(user, status = 'authenticated') {
  return configureStore({
    reducer: {
      auth: authReducer,
      tenantContext: tenantContextReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
    preloadedState: {
      auth: { user, status },
    },
  })
}

function renderNavigation(store, onLinkClick) {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <Navigation onLinkClick={onLinkClick} />
      </MemoryRouter>
    </Provider>,
  )
}

// ── Tests ────────────────────────────────────────────────
describe('Navigation', () => {
  it('renders Home and About links always (unauthenticated)', () => {
    const store = createTestStore(anonymousUser, 'idle')
    renderNavigation(store)

    // Home link is inside a mobile-only wrapper (hidden on desktop viewports)
    expect(screen.getByText(/home/i)).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /about/i })).toBeInTheDocument()
  })

  it('does NOT show admin links for unauthenticated users', () => {
    const store = createTestStore(anonymousUser, 'idle')
    renderNavigation(store)

    expect(screen.queryByRole('menuitem', { name: /users/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /tenants/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /^admin$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /dashboard/i })).not.toBeInTheDocument()
  })

  it('shows Users and Tenants links for CUSTOMER_ADMIN', () => {
    const store = createTestStore(customerAdminUser)
    renderNavigation(store)

    expect(screen.getByRole('menuitem', { name: /users/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /tenants/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /monitoring/i })).toBeInTheDocument()
  })

  it('shows Users, Tenants, and Monitoring links for SUPER_ADMIN', () => {
    const store = createTestStore(superAdminUser)
    renderNavigation(store)

    expect(screen.getByRole('menuitem', { name: /users/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /tenants/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /monitoring/i })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /^admin$/i })).not.toBeInTheDocument()
  })

  it('does NOT show admin links for basic USER role', () => {
    const store = createTestStore(basicUser)
    renderNavigation(store)

    expect(screen.queryByRole('menuitem', { name: /users/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /tenants/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /monitoring/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /^admin$/i })).not.toBeInTheDocument()
  })

  it('shows Dashboard for authenticated users', () => {
    const store = createTestStore(basicUser)
    renderNavigation(store)

    expect(screen.getByRole('menuitem', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('calls onLinkClick when Dashboard is clicked', async () => {
    const onLinkClick = vi.fn()
    const store = createTestStore(customerAdminUser)
    renderNavigation(store, onLinkClick)

    await userEvent.click(screen.getByRole('menuitem', { name: /dashboard/i }))
    expect(onLinkClick).toHaveBeenCalled()
  })

  it('calls onLinkClick when a link is clicked', async () => {
    const onLinkClick = vi.fn()
    const store = createTestStore(anonymousUser, 'idle')
    renderNavigation(store, onLinkClick)

    await userEvent.click(screen.getByRole('menuitem', { name: /about/i }))
    expect(onLinkClick).toHaveBeenCalled()
  })

  it('marks active link with correct class', () => {
    const store = createTestStore(anonymousUser, 'idle')
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/about']}>
          <Navigation />
        </MemoryRouter>
      </Provider>,
    )

    const aboutLink = screen.getByRole('menuitem', { name: /about/i })
    expect(aboutLink.className).toMatch(/active/i)
  })
})
