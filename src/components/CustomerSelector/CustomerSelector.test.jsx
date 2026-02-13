/**
 * CustomerSelector — component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerSelector } from './CustomerSelector.jsx'

// ── Mock the hooks ───────────────────────────────────────
vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: vi.fn(),
}))

vi.mock('../../store/api/customerApi.js', () => ({
  useListCustomersQuery: vi.fn(),
  useCreateCustomerMutation: vi.fn(),
}))

import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useListCustomersQuery, useCreateCustomerMutation } from '../../store/api/customerApi.js'

// ── Polyfills ────────────────────────────────────────────
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () { this.open = true })
  HTMLDialogElement.prototype.close = vi.fn(function () { this.open = false })
  vi.clearAllMocks()
})

// ── Fixtures ─────────────────────────────────────────────
const customers = [
  { _id: 'cust-1', name: 'Acme Corp', status: 'ACTIVE' },
  { _id: 'cust-2', name: 'Beta Inc', status: 'ACTIVE' },
]

function mockHooks(contextOverrides = {}, queryOverrides = {}, createOverrides = {}) {
  useTenantContext.mockReturnValue({
    customerId: null,
    isSuperAdmin: true,
    setCustomerId: vi.fn(),
    ...contextOverrides,
  })

  useListCustomersQuery.mockReturnValue({
    data: { data: customers },
    isLoading: false,
    ...queryOverrides,
  })

  const createFn = vi.fn().mockReturnValue({
    unwrap: vi.fn().mockResolvedValue({ data: { _id: 'new-cust' } }),
  })
  useCreateCustomerMutation.mockReturnValue([
    createFn,
    { isLoading: false, ...createOverrides },
  ])

  return { createFn }
}

// ── Tests ────────────────────────────────────────────────
describe('CustomerSelector', () => {
  it('renders nothing when user is not super admin', () => {
    mockHooks({ isSuperAdmin: false })
    const { container } = render(<CustomerSelector />)
    expect(container.innerHTML).toBe('')
  })

  it('renders the combobox trigger with aria-label for super admin', () => {
    mockHooks()
    render(<CustomerSelector />)
    expect(screen.getByRole('combobox', { name: /select customer/i })).toBeInTheDocument()
  })

  it('renders loading spinner when loading customers', () => {
    mockHooks({}, { isLoading: true })
    render(<CustomerSelector />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders placeholder text when no customer selected', () => {
    mockHooks()
    render(<CustomerSelector />)
    const trigger = screen.getByRole('combobox', { name: /select customer/i })
    expect(trigger).toHaveTextContent('Select customer...')
  })

  it('renders all customers in the dropdown', async () => {
    mockHooks()
    render(<CustomerSelector />)

    await userEvent.click(screen.getByRole('combobox', { name: /select customer/i }))

    expect(screen.getByRole('option', { name: 'Acme Corp' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Beta Inc' })).toBeInTheDocument()
  })

  it('renders "+ Create customer…" option', async () => {
    mockHooks()
    render(<CustomerSelector />)

    await userEvent.click(screen.getByRole('combobox', { name: /select customer/i }))

    expect(screen.getByRole('option', { name: /create customer/i })).toBeInTheDocument()
  })

  it('shows selected customer when customerId is set', () => {
    mockHooks({ customerId: 'cust-1' })
    render(<CustomerSelector />)

    const trigger = screen.getByRole('combobox', { name: /select customer/i })
    expect(trigger).toHaveTextContent('Acme Corp')
  })

  it('calls setCustomerId when selection changes', async () => {
    const setCustomerId = vi.fn()
    mockHooks({ setCustomerId })
    render(<CustomerSelector />)

    await userEvent.click(screen.getByRole('combobox', { name: /select customer/i }))
    await userEvent.click(screen.getByRole('option', { name: 'Beta Inc' }))

    expect(setCustomerId).toHaveBeenCalledWith('cust-2')
  })

  it('shows create form when "+ Create customer…" is selected', async () => {
    mockHooks()
    render(<CustomerSelector />)

    await userEvent.click(screen.getByRole('combobox', { name: /select customer/i }))
    await userEvent.click(screen.getByRole('option', { name: /create customer/i }))

    expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/topology/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('hides create form on cancel', async () => {
    mockHooks()
    render(<CustomerSelector />)

    await userEvent.click(screen.getByRole('combobox', { name: /select customer/i }))
    await userEvent.click(screen.getByRole('option', { name: /create customer/i }))

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByRole('combobox', { name: /select customer/i })).toBeInTheDocument()
  })

  it('shows error when submitting empty name', async () => {
    mockHooks()
    render(<CustomerSelector />)

    await userEvent.click(screen.getByRole('combobox', { name: /select customer/i }))
    await userEvent.click(screen.getByRole('option', { name: /create customer/i }))

    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/name is required/i)
  })

  it('calls createCustomer and setCustomerId on successful submit', async () => {
    const setCustomerId = vi.fn()
    const { createFn } = mockHooks({ setCustomerId })
    render(<CustomerSelector />)

    await userEvent.click(screen.getByRole('combobox', { name: /select customer/i }))
    await userEvent.click(screen.getByRole('option', { name: /create customer/i }))

    await userEvent.type(screen.getByLabelText(/customer name/i), 'New Corp')
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    expect(createFn).toHaveBeenCalledWith({
      name: 'New Corp',
      topology: 'SINGLE_TENANT',
      vmfPolicy: 'SINGLE',
      billing: { planCode: 'FREE' },
    })

    await waitFor(() => {
      expect(setCustomerId).toHaveBeenCalledWith('new-cust')
    })
  })

  it('shows error message when create API fails', async () => {
    mockHooks()
    const failCreate = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        data: { error: { message: 'Duplicate name' } },
      }),
    })
    useCreateCustomerMutation.mockReturnValue([failCreate, { isLoading: false }])

    render(<CustomerSelector />)

    await userEvent.click(screen.getByRole('combobox', { name: /select customer/i }))
    await userEvent.click(screen.getByRole('option', { name: /create customer/i }))

    await userEvent.type(screen.getByLabelText(/customer name/i), 'Dup Corp')
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Duplicate name')
    })
  })

  it('skips query when user is not super admin', () => {
    mockHooks({ isSuperAdmin: false })
    render(<CustomerSelector />)

    expect(useListCustomersQuery).toHaveBeenCalledWith(
      { page: 1, pageSize: 100 },
      { skip: true }
    )
  })
})
