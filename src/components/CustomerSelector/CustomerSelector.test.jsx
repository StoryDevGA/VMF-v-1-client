/**
 * CustomerSelector - component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerSelector } from './CustomerSelector.jsx'

vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: vi.fn(),
}))

vi.mock('../../store/api/customerApi.js', () => ({
  useListCustomersQuery: vi.fn(),
  useOnboardCustomerMutation: vi.fn(),
}))

vi.mock('../../store/api/licenseLevelApi.js', () => ({
  useListLicenseLevelsQuery: vi.fn(),
}))

import { useTenantContext } from '../../hooks/useTenantContext.js'
import {
  useListCustomersQuery,
  useOnboardCustomerMutation,
} from '../../store/api/customerApi.js'
import { useListLicenseLevelsQuery } from '../../store/api/licenseLevelApi.js'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function () {
    this.open = false
  })
  vi.clearAllMocks()
})

const customers = [
  { _id: 'cust-1', name: 'Acme Corp', status: 'ACTIVE' },
  { _id: 'cust-2', name: 'Beta Inc', status: 'ACTIVE' },
]

const licenseLevels = [
  { _id: 'lic-1', name: 'Starter', isActive: true },
  { _id: 'lic-2', name: 'Enterprise', isActive: true },
]

function mockHooks(
  contextOverrides = {},
  customerQueryOverrides = {},
  onboardingOverrides = {},
  licenseLevelQueryOverrides = {},
) {
  useTenantContext.mockReturnValue({
    customerId: null,
    isSuperAdmin: true,
    setCustomerId: vi.fn(),
    ...contextOverrides,
  })

  useListCustomersQuery.mockReturnValue({
    data: { data: customers },
    isLoading: false,
    ...customerQueryOverrides,
  })

  useListLicenseLevelsQuery.mockReturnValue({
    data: { data: licenseLevels },
    isLoading: false,
    ...licenseLevelQueryOverrides,
  })

  const onboardFn = vi.fn().mockReturnValue({
    unwrap: vi.fn().mockResolvedValue({
      data: { customer: { _id: 'new-cust' } },
    }),
  })

  useOnboardCustomerMutation.mockReturnValue([
    onboardFn,
    { isLoading: false, ...onboardingOverrides },
  ])

  return { onboardFn }
}

async function openCreateForm() {
  await userEvent.click(screen.getByRole('combobox', { name: /select customer/i }))
  await userEvent.click(screen.getByRole('option', { name: /create customer/i }))
}

async function fillRequiredOnboardingFields({
  name = 'New Corp',
  licenseLevel = 'lic-1',
  adminName = 'Jane Admin',
  adminEmail = 'jane@newcorp.com',
} = {}) {
  await userEvent.type(screen.getByLabelText(/customer name/i), name)
  await userEvent.selectOptions(screen.getByLabelText(/license level/i), licenseLevel)
  await userEvent.type(screen.getByLabelText(/admin name/i), adminName)
  await userEvent.type(screen.getByLabelText(/admin email/i), adminEmail)
}

describe('CustomerSelector', () => {
  it('renders nothing when user is not super admin', () => {
    mockHooks({ isSuperAdmin: false })
    const { container } = render(<CustomerSelector />)
    expect(container.innerHTML).toBe('')
  })

  it('renders combobox trigger for super admin', () => {
    mockHooks()
    render(<CustomerSelector />)
    expect(screen.getByRole('combobox', { name: /select customer/i })).toBeInTheDocument()
  })

  it('renders loading state when customers query is loading', () => {
    mockHooks({}, { isLoading: true })
    render(<CustomerSelector />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders placeholder text when no customer selected', () => {
    mockHooks()
    render(<CustomerSelector />)
    expect(screen.getByRole('combobox', { name: /select customer/i })).toHaveTextContent(
      'Select customer...',
    )
  })

  it('renders all customers in dropdown', async () => {
    mockHooks()
    render(<CustomerSelector />)

    await userEvent.click(screen.getByRole('combobox', { name: /select customer/i }))

    expect(screen.getByRole('option', { name: 'Acme Corp' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Beta Inc' })).toBeInTheDocument()
  })

  it('shows create form when create action is selected', async () => {
    mockHooks()
    render(<CustomerSelector />)

    await openCreateForm()

    expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/website url \(optional\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/topology/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/license level/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/admin name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/admin email/i)).toBeInTheDocument()
  })

  it('hides create form on cancel', async () => {
    mockHooks()
    render(<CustomerSelector />)

    await openCreateForm()
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByRole('combobox', { name: /select customer/i })).toBeInTheDocument()
  })

  it('shows error when name is missing', async () => {
    mockHooks()
    render(<CustomerSelector />)

    await openCreateForm()
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/name is required/i)
  })

  it('shows error when license level is missing', async () => {
    mockHooks()
    render(<CustomerSelector />)

    await openCreateForm()
    await userEvent.type(screen.getByLabelText(/customer name/i), 'Acme New')
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/license level is required/i)
  })

  it('calls onboardCustomer and setCustomerId on successful submit', async () => {
    const setCustomerId = vi.fn()
    const { onboardFn } = mockHooks({ setCustomerId })
    render(<CustomerSelector />)

    await openCreateForm()
    await fillRequiredOnboardingFields()
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    expect(onboardFn).toHaveBeenCalledWith({
      customer: {
        companyName: 'New Corp',
        serviceProvider: false,
        billingCycle: 'MONTHLY',
        planCode: 'FREE',
        licenseLevelId: 'lic-1',
        maxTenants: 1,
        maxVmfsPerTenant: 1,
        topology: 'SINGLE_TENANT',
        vmfPolicy: 'SINGLE',
      },
      adminUser: {
        name: 'Jane Admin',
        email: 'jane@newcorp.com',
      },
    })

    await waitFor(() => {
      expect(setCustomerId).toHaveBeenCalledWith('new-cust')
    })
  })

  it('includes optional website and multi-tenant defaults', async () => {
    const { onboardFn } = mockHooks()
    render(<CustomerSelector />)

    await openCreateForm()
    await userEvent.type(screen.getByLabelText(/customer name/i), 'Website Corp')
    await userEvent.type(
      screen.getByLabelText(/website url \(optional\)/i),
      'https://website.example',
    )
    await userEvent.selectOptions(screen.getByLabelText(/topology/i), 'MULTI_TENANT')
    await userEvent.selectOptions(screen.getByLabelText(/license level/i), 'lic-2')
    await userEvent.type(screen.getByLabelText(/admin name/i), 'Chris Admin')
    await userEvent.type(screen.getByLabelText(/admin email/i), 'chris@website.example')
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    expect(onboardFn).toHaveBeenCalledWith({
      customer: {
        companyName: 'Website Corp',
        website: 'https://website.example',
        serviceProvider: true,
        billingCycle: 'MONTHLY',
        planCode: 'FREE',
        licenseLevelId: 'lic-2',
        maxTenants: 10,
        maxVmfsPerTenant: 5,
        topology: 'MULTI_TENANT',
        vmfPolicy: 'PER_TENANT_SINGLE',
      },
      adminUser: {
        name: 'Chris Admin',
        email: 'chris@website.example',
      },
    })
  })

  it('blocks submit when optional website is invalid', async () => {
    const { onboardFn } = mockHooks()
    render(<CustomerSelector />)

    await openCreateForm()
    await fillRequiredOnboardingFields({ name: 'Broken URL Corp' })
    await userEvent.type(screen.getByLabelText(/website url \(optional\)/i), 'not-a-url')
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/enter a valid website url/i)
    })

    expect(onboardFn).not.toHaveBeenCalled()
  })

  it('shows API error message when onboarding fails', async () => {
    mockHooks()
    const failOnboard = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 500,
        data: { error: { message: 'Onboarding failed' } },
      }),
    })
    useOnboardCustomerMutation.mockReturnValue([failOnboard, { isLoading: false }])

    render(<CustomerSelector />)

    await openCreateForm()
    await fillRequiredOnboardingFields({ name: 'Fail Corp' })
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Onboarding failed')
    })
  })

  it('maps 409 duplicate-customer conflict to name field', async () => {
    mockHooks()
    const failOnboard = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: {
          error: {
            code: 'CONFLICT',
            message: 'A customer with this name already exists.',
          },
        },
      }),
    })
    useOnboardCustomerMutation.mockReturnValue([failOnboard, { isLoading: false }])

    render(<CustomerSelector />)

    await openCreateForm()
    await fillRequiredOnboardingFields({ name: 'ACME Corp' })
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'A customer with this name already exists.',
      )
    })
  })

  it('maps 409 admin-email conflict to admin email field', async () => {
    mockHooks()
    const failOnboard = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: {
          error: {
            code: 'CONFLICT',
            message: 'A user with this email already exists and cannot be used as onboarding admin.',
          },
        },
      }),
    })
    useOnboardCustomerMutation.mockReturnValue([failOnboard, { isLoading: false }])

    render(<CustomerSelector />)

    await openCreateForm()
    await fillRequiredOnboardingFields({ name: 'Email Conflict Corp' })
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /cannot be used as onboarding admin/i,
      )
    })
  })

  it('maps 422 onboarding details to field errors', async () => {
    mockHooks()
    const failOnboard = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 422,
        data: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Please provide valid onboarding data.',
            details: {
              'adminUser.email': 'adminUser.email must be a valid email',
            },
          },
        },
      }),
    })
    useOnboardCustomerMutation.mockReturnValue([failOnboard, { isLoading: false }])

    render(<CustomerSelector />)

    await openCreateForm()
    await fillRequiredOnboardingFields({
      name: 'Validation Corp',
      adminEmail: 'jane@validation.example',
    })
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i)
    })
  })

  it('blocks normalized duplicate names client-side before API call', async () => {
    const { onboardFn } = mockHooks()
    render(<CustomerSelector />)

    await openCreateForm()
    await fillRequiredOnboardingFields({ name: '  ACME   corp  ' })
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'A customer with this name already exists.',
      )
    })

    expect(onboardFn).not.toHaveBeenCalled()
  })

  it('shows guidance when no active license levels are available', async () => {
    mockHooks({}, {}, {}, { data: { data: [] }, isLoading: false })
    render(<CustomerSelector />)

    await openCreateForm()

    expect(screen.getByRole('alert')).toHaveTextContent(
      /no active license levels available/i,
    )
    expect(screen.getByRole('button', { name: /^create$/i })).toBeDisabled()
  })

  it('skips customer and license queries when not super admin', () => {
    mockHooks({ isSuperAdmin: false })
    render(<CustomerSelector />)

    expect(useListCustomersQuery).toHaveBeenCalledWith(
      { page: 1, pageSize: 100 },
      { skip: true },
    )
    expect(useListLicenseLevelsQuery).toHaveBeenCalledWith(
      { page: 1, pageSize: 100, isActive: true },
      { skip: true },
    )
  })
})
