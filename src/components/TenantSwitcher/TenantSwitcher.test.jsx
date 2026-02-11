/**
 * TenantSwitcher — component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TenantSwitcher from './TenantSwitcher.jsx'

// ── Mock the hook ────────────────────────────────────────
vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: vi.fn(),
}))

import { useTenantContext } from '../../hooks/useTenantContext.js'

// ── Polyfills ────────────────────────────────────────────
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () { this.open = true })
  HTMLDialogElement.prototype.close = vi.fn(function () { this.open = false })
  vi.clearAllMocks()
})

// ── Fixtures ─────────────────────────────────────────────
const enabledTenants = [
  { _id: 'ten-1', name: 'Alpha', status: 'ENABLED' },
  { _id: 'ten-2', name: 'Bravo', status: 'ENABLED' },
]

const mixedTenants = [
  { _id: 'ten-1', name: 'Alpha', status: 'ENABLED' },
  { _id: 'ten-d', name: 'Disabled Co', status: 'DISABLED' },
  { _id: 'ten-2', name: 'Bravo', status: 'ENABLED' },
]

function mockHook(overrides = {}) {
  useTenantContext.mockReturnValue({
    customerId: 'cust-1',
    tenantId: null,
    tenantName: null,
    tenants: enabledTenants,
    isLoadingTenants: false,
    setTenantId: vi.fn(),
    ...overrides,
  })
}

// ── Tests ────────────────────────────────────────────────
describe('TenantSwitcher', () => {
  it('renders nothing when no customerId', () => {
    mockHook({ customerId: null })
    const { container } = render(<TenantSwitcher />)
    expect(container.innerHTML).toBe('')
  })

  it('renders the select element with aria-label', () => {
    mockHook()
    render(<TenantSwitcher />)
    expect(screen.getByRole('combobox', { name: /switch tenant/i })).toBeInTheDocument()
  })

  it('renders "All Tenants" default option', () => {
    mockHook()
    render(<TenantSwitcher />)
    expect(screen.getByRole('option', { name: /all tenants/i })).toBeInTheDocument()
  })

  it('renders ENABLED tenants only', () => {
    mockHook({ tenants: mixedTenants })
    render(<TenantSwitcher />)

    expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Bravo' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Disabled Co' })).not.toBeInTheDocument()
  })

  it('calls setTenantId with tenant id/name when selection changes', async () => {
    const setTenantId = vi.fn()
    mockHook({ setTenantId })
    render(<TenantSwitcher />)

    const select = screen.getByRole('combobox', { name: /switch tenant/i })
    await userEvent.selectOptions(select, 'ten-1')

    expect(setTenantId).toHaveBeenCalledWith('ten-1', 'Alpha')
  })

  it('calls setTenantId(null, null) when "All Tenants" selected', async () => {
    const setTenantId = vi.fn()
    mockHook({ tenantId: 'ten-1', setTenantId })
    render(<TenantSwitcher />)

    const select = screen.getByRole('combobox', { name: /switch tenant/i })
    await userEvent.selectOptions(select, '')

    expect(setTenantId).toHaveBeenCalledWith(null, null)
  })

  it('disables select when loading', () => {
    mockHook({ isLoadingTenants: true })
    render(<TenantSwitcher />)

    const select = screen.getByRole('combobox', { name: /switch tenant/i })
    expect(select).toBeDisabled()
  })
})
