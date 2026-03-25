import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import MaintainVmfs from './MaintainVmfs.jsx'

vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: vi.fn(),
}))

vi.mock('../../hooks/useAuthorization.js', () => ({
  useAuthorization: vi.fn(),
}))

vi.mock('../../store/api/customerApi.js', () => ({
  useGetCustomerQuery: vi.fn(),
}))

vi.mock('../../store/api/vmfApi.js', () => ({
  useListVmfsQuery: vi.fn(),
  useCreateVmfMutation: vi.fn(),
  useUpdateVmfMutation: vi.fn(),
  useDeleteVmfMutation: vi.fn(),
}))

import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useGetCustomerQuery } from '../../store/api/customerApi.js'
import {
  useCreateVmfMutation,
  useDeleteVmfMutation,
  useListVmfsQuery,
  useUpdateVmfMutation,
} from '../../store/api/vmfApi.js'

const createVmfMock = vi.fn()
const updateVmfMock = vi.fn()
const deleteVmfMock = vi.fn()

let listQueryResponse
let activeCountQueryResponse

function renderPage(initialEntry = '/app/administration/manage-vmfs') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ToasterProvider>
        <Routes>
          <Route path="/app/administration/manage-vmfs" element={<MaintainVmfs />} />
          <Route path="/app/dashboard" element={<div>Dashboard Route</div>} />
        </Routes>
      </ToasterProvider>
    </MemoryRouter>,
  )
}

describe('MaintainVmfs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    HTMLDialogElement.prototype.showModal = vi.fn(function showModalMock() {
      this.open = true
    })
    HTMLDialogElement.prototype.close = vi.fn(function closeMock() {
      this.open = false
    })

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

    useGetCustomerQuery.mockReturnValue({
      data: {
        data: {
          _id: 'cust-1',
          governance: { maxVmfsPerTenant: 4 },
        },
      },
    })

    listQueryResponse = {
      data: { data: [], meta: { page: 1, totalPages: 1, total: 0 } },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    activeCountQueryResponse = {
      data: { data: [], meta: { page: 1, totalPages: 1, total: 0 } },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    useListVmfsQuery.mockImplementation((args = {}) => {
      if (
        args?.status === 'ACTIVE'
        && args?.q === ''
        && args?.lifecycleStatus === ''
        && args?.pageSize === 1
      ) {
        return activeCountQueryResponse
      }

      return listQueryResponse
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

  it('renders tenant-selection boundary state and returns to the dashboard', async () => {
    const user = userEvent.setup()

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

    await user.click(screen.getByRole('button', { name: /back to home/i }))

    expect(screen.getByText('Dashboard Route')).toBeInTheDocument()
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

  it('shows VMF capacity guidance and disables create when the tenant is at capacity', () => {
    activeCountQueryResponse = {
      data: {
        data: [{ id: 'vmf-1', name: 'Active VMF', status: 'ACTIVE' }],
        meta: { page: 1, totalPages: 4, total: 4 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    expect(
      screen.getByText(/this tenant is already using 4 of 4 active vmf slots/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^create vmf$/i })).toBeDisabled()
  })

  it('renders compact row-action menus with only the allowed actions per row state', () => {
    listQueryResponse = {
      data: {
        data: [
          {
            id: 'vmf-active',
            name: 'Active VMF',
            description: 'Current active framework',
            status: 'ACTIVE',
            lifecycleStatus: 'CANONISED',
            frameworkVersion: '2.2',
            updatedAt: '2026-03-24T21:08:00.000Z',
          },
          {
            id: 'vmf-archived',
            name: 'Archived VMF',
            description: 'Legacy framework',
            status: 'ARCHIVED',
            lifecycleStatus: 'PUBLISHED',
            frameworkVersion: '2.0',
            updatedAt: '2026-03-20T10:00:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 2 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    activeCountQueryResponse = {
      data: { data: [], meta: { page: 1, totalPages: 1, total: 1 } },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    expect(screen.getByText(/use the actions menu to edit vmfs or schedule a soft-delete/i)).toBeInTheDocument()

    const activeActions = screen.getByRole('combobox', { name: /actions for active vmf/i })
    expect(within(activeActions).getByRole('option', { name: /edit/i })).toBeInTheDocument()
    expect(within(activeActions).queryByRole('option', { name: /delete/i })).not.toBeInTheDocument()

    const archivedActions = screen.getByRole('combobox', { name: /actions for archived vmf/i })
    expect(within(archivedActions).getByRole('option', { name: /edit/i })).toBeInTheDocument()
    expect(within(archivedActions).getByRole('option', { name: /delete/i })).toBeInTheDocument()
  })

  it('opens the delete dialog from the row actions menu', async () => {
    const user = userEvent.setup()

    listQueryResponse = {
      data: {
        data: [
          {
            id: 'vmf-archived',
            name: 'Archived VMF',
            description: 'Legacy framework',
            status: 'ARCHIVED',
            lifecycleStatus: 'PUBLISHED',
            frameworkVersion: '2.0',
            updatedAt: '2026-03-20T10:00:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    await user.selectOptions(
      screen.getByRole('combobox', { name: /actions for archived vmf/i }),
      'Delete',
    )

    expect(screen.getByRole('heading', { name: /delete vmf/i })).toBeInTheDocument()
    expect(screen.getByText(/delete archived vmf\?/i)).toBeInTheDocument()
  })
})
