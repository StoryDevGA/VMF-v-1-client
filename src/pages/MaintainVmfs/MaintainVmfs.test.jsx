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

function getPageTree(initialEntry = '/app/workspaces/vmf') {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <ToasterProvider>
        <Routes>
          <Route path="/app/workspaces/vmf" element={<MaintainVmfs />} />
          <Route path="/app/dashboard" element={<div>Dashboard Route</div>} />
        </Routes>
      </ToasterProvider>
    </MemoryRouter>
  )
}

function renderPage(initialEntry = '/app/workspaces/vmf') {
  return render(getPageTree(initialEntry))
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
      hasFeatureEntitlement: () => true,
      hasCustomerPermission: () => false,
      hasTenantPermission: () => true,
      hasVmfPermission: () => false,
      hasVmfWorkspaceManagementAccess: () => true,
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
    useListVmfsQuery.mockImplementation(() => listQueryResponse)

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
      screen.getByText(/select a tenant from the tenant switcher before opening the vmf workspace/i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^back$/i }))

    expect(screen.getByText('Dashboard Route')).toBeInTheDocument()
  })

  it('uses a non-permission boundary message when single-tenant tenant resolution fails', () => {
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: null,
      resolvedTenantName: '',
      supportsTenantManagement: false,
      selectableTenants: [],
      isLoadingTenants: false,
      setTenantId: vi.fn(),
    })

    renderPage()

    expect(
      screen.getByText(/vmf access is available, but the workspace could not resolve its tenant context/i),
    ).toBeInTheDocument()
  })

  it('submits create payload with optional description against customer-tenant scoped route', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create$/i }))
    const dialog = screen.getByRole('dialog')

    await user.type(
      within(dialog).getByLabelText(/name/i, { selector: 'input#vmf-create-name' }),
      'Northwind',
    )
    await user.type(
      within(dialog).getByLabelText(/description/i, { selector: 'textarea#vmf-create-description' }),
      'Launch planning workspace',
    )
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }))

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
    listQueryResponse = {
      data: {
        data: [],
        meta: {
          page: 1,
          totalPages: 1,
          total: 0,
          vmfCapacity: {
            maxVmfs: 4,
            currentCount: 4,
            remainingCount: 0,
            isAtCapacity: true,
            countMode: 'ACTIVE',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    const capacityGuidance = screen.getByRole('status', { name: /^vmf capacity reached/i })

    expect(capacityGuidance).toHaveTextContent(/0 of 4 left/i)
    expect(screen.getByRole('button', { name: /^create$/i })).toBeDisabled()
  })

  it('shows compact VMF usage guidance when capacity remains', () => {
    listQueryResponse = {
      data: {
        data: [],
        meta: {
          page: 1,
          totalPages: 1,
          total: 0,
          vmfCapacity: {
            maxVmfs: 4,
            currentCount: 2,
            remainingCount: 2,
            isAtCapacity: false,
            countMode: 'ACTIVE',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    const capacityGuidance = screen.getByRole('status', { name: /^vmf capacity/i })

    expect(capacityGuidance).toHaveTextContent(/2 of 4 left/i)
    expect(screen.getByRole('button', { name: /^create$/i })).toBeEnabled()
  })

  it('resets workspace filters and dialogs when the tenant context changes', async () => {
    const user = userEvent.setup()
    let currentTenantContext = {
      customerId: 'cust-1',
      tenantId: 'tenant-1',
      resolvedTenantName: 'Orbit Core',
      supportsTenantManagement: true,
      selectableTenants: [],
      setTenantId: vi.fn(),
    }

    useTenantContext.mockImplementation(() => currentTenantContext)

    const view = renderPage()

    await user.type(screen.getByLabelText(/search/i), 'Legacy')
    await user.selectOptions(
      screen.getByLabelText(/status/i, { selector: 'select#vmf-status-filter' }),
      'ARCHIVED',
    )
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/search/i)).toHaveValue('Legacy')
    expect(
      screen.getByLabelText(/status/i, { selector: 'select#vmf-status-filter' }),
    ).toHaveValue('ARCHIVED')

    currentTenantContext = {
      ...currentTenantContext,
      tenantId: 'tenant-2',
      resolvedTenantName: 'Orbit Edge',
    }

    view.rerender(getPageTree())

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByLabelText(/search/i)).toHaveValue('')
      expect(
        screen.getByLabelText(/status/i, { selector: 'select#vmf-status-filter' }),
      ).toHaveValue('')
      expect(useListVmfsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          customerId: 'cust-1',
          tenantId: 'tenant-2',
          q: '',
          status: '',
          lifecycleStatus: '',
          page: 1,
        }),
        { skip: false },
      )
    })
  })

  it('renders a read-only VMF workspace for standard viewers', () => {
    useAuthorization.mockReturnValue({
      hasFeatureEntitlement: () => true,
      hasCustomerPermission: () => false,
      hasTenantPermission: (_customerId, _tenantId, permission) => permission === 'VMF_VIEW',
      hasVmfPermission: () => false,
      hasVmfWorkspaceManagementAccess: () => false,
    })

    listQueryResponse = {
      data: {
        data: [
          {
            id: 'vmf-read-only',
            name: 'Viewer VMF',
            description: 'Visible in read-only mode',
            status: 'ACTIVE',
            lifecycleStatus: 'PUBLISHED',
            frameworkVersion: '2.2',
            updatedAt: '2026-03-24T21:08:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    expect(useListVmfsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        tenantId: 'tenant-1',
        lifecycleStatus: 'PUBLISHED',
      }),
      { skip: false },
    )
    expect(screen.queryByRole('button', { name: /^create$/i })).not.toBeInTheDocument()
    expect(
      screen.getByText(/linked tenant members can review published vmfs only/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Viewer VMF')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /actions for viewer vmf/i })).not.toBeInTheDocument()
    expect(
      screen.getByLabelText(/lifecycle/i, { selector: 'select#vmf-lifecycle-filter' }),
    ).toHaveValue('PUBLISHED')
    expect(
      screen.getByLabelText(/lifecycle/i, { selector: 'select#vmf-lifecycle-filter' }),
    ).toBeDisabled()
    expect(useGetCustomerQuery).toHaveBeenLastCalledWith('cust-1', { skip: true })
  })

  it('denies the VMF workspace when VMF_CREATE and VMF_UPDATE exist without VMF_VIEW', () => {
    useAuthorization.mockReturnValue({
      hasFeatureEntitlement: () => true,
      hasCustomerPermission: () => false,
      hasTenantPermission: (_customerId, _tenantId, permission) =>
        permission === 'VMF_CREATE' || permission === 'VMF_UPDATE',
    })

    renderPage()

    expect(
      screen.getByText(/you do not have permission to manage vmfs for this tenant/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^create$/i })).not.toBeInTheDocument()
    expect(useListVmfsQuery).toHaveBeenLastCalledWith(expect.anything(), { skip: true })
  })

  it('shows edit and delete controls when VMF_UPDATE is granted', async () => {
    const user = userEvent.setup()

    useAuthorization.mockReturnValue({
      hasFeatureEntitlement: () => true,
      hasCustomerPermission: () => false,
      hasTenantPermission: (_customerId, _tenantId, permission) => permission === 'VMF_VIEW' || permission === 'VMF_UPDATE',
    })

    listQueryResponse = {
      data: {
        data: [
          {
            id: 'vmf-editable',
            name: 'Editable VMF',
            description: 'Update-only workspace',
            status: 'ARCHIVED',
            lifecycleStatus: 'PUBLISHED',
            frameworkVersion: '2.2',
            updatedAt: '2026-03-24T21:08:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    expect(screen.queryByRole('button', { name: /^create$/i })).not.toBeInTheDocument()
    expect(useGetCustomerQuery).toHaveBeenLastCalledWith('cust-1', { skip: true })

    const actions = screen.getByRole('combobox', { name: /actions for editable vmf/i })
    expect(within(actions).getByRole('option', { name: /edit/i })).toBeInTheDocument()
    expect(within(actions).getByRole('option', { name: /delete/i })).toBeInTheDocument()

    await user.selectOptions(actions, 'Edit')

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /edit vmf/i })).toBeInTheDocument()
  })

  it('hides row actions when VMF_UPDATE is not granted', () => {
    useAuthorization.mockReturnValue({
      hasFeatureEntitlement: () => true,
      hasCustomerPermission: () => false,
      hasTenantPermission: (_customerId, _tenantId, permission) => permission === 'VMF_VIEW',
    })

    listQueryResponse = {
      data: {
        data: [
          {
            id: 'vmf-read-only',
            name: 'Read Only VMF',
            description: 'Viewer access only',
            status: 'ARCHIVED',
            lifecycleStatus: 'PUBLISHED',
            frameworkVersion: '2.2',
            updatedAt: '2026-03-24T21:08:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    expect(screen.queryByRole('combobox', { name: /actions for read only vmf/i })).not.toBeInTheDocument()
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
