import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToasterProvider } from '../../components/Toaster'
import MaintainVmfs from './MaintainVmfs.jsx'

vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: vi.fn(),
}))

vi.mock('../../hooks/useAuthorization.js', () => ({
  useAuthorization: vi.fn(),
}))

vi.mock('../../store/api/vmfApi.js', () => ({
  useListVmfsQuery: vi.fn(),
  useCreateVmfMutation: vi.fn(),
  useUpdateVmfMutation: vi.fn(),
  useDeleteVmfMutation: vi.fn(),
}))

import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import {
  useCreateVmfMutation,
  useDeleteVmfMutation,
  useListVmfsQuery,
  useUpdateVmfMutation,
} from '../../store/api/vmfApi.js'

const createVmfMock = vi.fn()
const updateVmfMock = vi.fn()
const deleteVmfMock = vi.fn()

function renderPage() {
  return render(
    <ToasterProvider>
      <MaintainVmfs />
    </ToasterProvider>,
  )
}

describe('MaintainVmfs', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: 'tenant-1',
      resolvedTenantName: 'Orbit Core',
      supportsTenantManagement: true,
      selectableTenants: [],
      setTenantId: vi.fn(),
    })

    useAuthorization.mockReturnValue({
      isSuperAdmin: false,
      hasCustomerRole: (customerId, role) => customerId === 'cust-1' && role === 'CUSTOMER_ADMIN',
      hasTenantRole: () => false,
      hasFeatureEntitlement: () => true,
    })

    useListVmfsQuery.mockReturnValue({
      data: { data: [], meta: { page: 1, totalPages: 1, total: 0 } },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    createVmfMock.mockReset()
    createVmfMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { name: 'Northwind', frameworkVersion: '2.2' } }),
    })
    useCreateVmfMutation.mockReturnValue([createVmfMock, { isLoading: false }])

    updateVmfMock.mockReset()
    updateVmfMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    })
    useUpdateVmfMutation.mockReturnValue([updateVmfMock, { isLoading: false }])

    deleteVmfMock.mockReset()
    deleteVmfMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    })
    useDeleteVmfMutation.mockReturnValue([deleteVmfMock, { isLoading: false }])
  })

  it('renders tenant-selection boundary state when tenant context is missing', () => {
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: null,
      resolvedTenantName: '',
      supportsTenantManagement: true,
      selectableTenants: [],
      setTenantId: vi.fn(),
    })

    renderPage()

    expect(
      screen.getByText(/select a tenant from the tenant switcher before opening vmf management/i),
    ).toBeInTheDocument()
  })

  it('submits create payload with optional description against customer-tenant scoped route', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create vmf$/i }))
    const dialog = screen.getByRole('dialog')

    await user.type(
      within(dialog).getByLabelText(/name/i, { selector: 'input#vmf-create-name' }),
      'Northwind',
    )
    await user.type(
      within(dialog).getByLabelText(/description/i, { selector: 'textarea#vmf-create-description' }),
      'Launch planning workspace',
    )
    await user.click(within(dialog).getByRole('button', { name: /^create vmf$/i }))

    await waitFor(() => {
      expect(createVmfMock).toHaveBeenCalledTimes(1)
    })

    expect(createVmfMock).toHaveBeenCalledWith({
      customerId: 'cust-1',
      tenantId: 'tenant-1',
      body: {
        name: 'Northwind',
        description: 'Launch planning workspace',
      },
    })
  })
})

