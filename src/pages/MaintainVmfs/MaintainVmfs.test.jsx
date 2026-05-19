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
  useListVmfFrameworkPackagesQuery: vi.fn(),
  useUpdateVmfMutation: vi.fn(),
  useDeleteVmfMutation: vi.fn(),
}))

vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useCreateRuntimeInstanceMutation: vi.fn(),
  useListRuntimeInstancesQuery: vi.fn(),
}))

import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useGetCustomerQuery } from '../../store/api/customerApi.js'
import {
  useDeleteVmfMutation,
  useListVmfFrameworkPackagesQuery,
  useListVmfsQuery,
  useUpdateVmfMutation,
} from '../../store/api/vmfApi.js'
import {
  useCreateRuntimeInstanceMutation,
  useListRuntimeInstancesQuery,
} from '../../store/api/runtimeInstanceApi.js'

const createRuntimeInstanceMock = vi.fn()
const updateVmfMock = vi.fn()
const deleteVmfMock = vi.fn()

let listQueryResponse
let runtimeInstanceQueryResponse
let frameworkPackageQueryResponse

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
      customerName: null,
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
          name: 'Orbit Services',
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

    runtimeInstanceQueryResponse = {
      data: { data: [], meta: { page: 1, totalPages: 1, total: 0 } },
      isLoading: false,
      isFetching: false,
      error: null,
    }
    useListRuntimeInstancesQuery.mockImplementation(() => runtimeInstanceQueryResponse)

    frameworkPackageQueryResponse = {
      data: {
        data: [
          {
            id: 'pkg-1',
            frameworkKey: 'VMF',
            packageName: 'VMF Runtime Package',
            packageKey: 'vmf-runtime-package',
            version: '2.3.1',
            status: 'ACTIVE',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }
    useListVmfFrameworkPackagesQuery.mockImplementation(() => frameworkPackageQueryResponse)

    createRuntimeInstanceMock.mockReset()
    createRuntimeInstanceMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          name: 'Northwind',
          packageVersion: '2.3.1',
          runtimeInstanceKey: 'value-narrative-001',
        },
      }),
    })
    useCreateRuntimeInstanceMutation.mockReturnValue([
      createRuntimeInstanceMock,
      { isLoading: false },
    ])

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

  it('uses the customer name instead of a generic default tenant label for single-tenant workspaces', () => {
    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: 'tenant-1',
      customerName: 'Person 2 Person',
      resolvedTenantName: 'Default Tenant',
      supportsTenantManagement: false,
      selectableTenants: [],
      isLoadingTenants: false,
      setTenantId: vi.fn(),
    })

    renderPage()

    expect(screen.getByText(/workspace scope for Person 2 Person\./i)).toBeInTheDocument()
    expect(screen.queryByText(/workspace scope for Default Tenant\./i)).not.toBeInTheDocument()
  })

  it('hides the Value Narrative runtime table when no runtime instances exist', () => {
    renderPage()

    expect(useListRuntimeInstancesQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        tenantId: 'tenant-1',
        runtimeType: 'VALUE_NARRATIVE',
        pageSize: 10,
      }),
      { skip: false },
    )
    expect(screen.queryByRole('heading', { name: /my value narratives/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('table', { name: /value narrative runtime instances/i }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^create value narrative$/i })).toBeInTheDocument()
  })

  it('lists Value Narrative runtime instances from the runtime instance API', () => {
    runtimeInstanceQueryResponse = {
      data: {
        data: [
          {
            id: 'runtime-1',
            runtimeInstanceKey: 'value-narrative-001',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'Northwind Value Narrative',
            packageKey: 'vmf-runtime-package',
            packageVersion: '2.3.1',
            status: 'ACTIVE',
            executionStatus: 'IDLE',
            updatedAt: '2026-05-18T11:13:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    expect(screen.getByRole('heading', { name: /my value narratives/i })).toBeInTheDocument()
    expect(useListRuntimeInstancesQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        tenantId: 'tenant-1',
        runtimeType: 'VALUE_NARRATIVE',
        pageSize: 10,
      }),
      { skip: false },
    )
    expect(screen.getByRole('table', { name: /value narrative runtime instances/i }))
      .toBeInTheDocument()
    expect(screen.getByText('Northwind Value Narrative')).toBeInTheDocument()
    expect(screen.getByText('value-narrative-001')).toBeInTheDocument()
    expect(screen.getByText('vmf-runtime-package')).toBeInTheDocument()
    expect(screen.getByText('Idle')).toBeInTheDocument()
  })

  it('paginates Value Narrative runtime instances without silently truncating after the first page', async () => {
    const user = userEvent.setup()

    useListRuntimeInstancesQuery.mockImplementation((args) => ({
      data: {
        data: [
          {
            id: `runtime-page-${args.page}`,
            runtimeInstanceKey: `value-narrative-page-${args.page}`,
            runtimeType: 'VALUE_NARRATIVE',
            name: `Page ${args.page} Value Narrative`,
            packageKey: 'vmf-runtime-package',
            packageVersion: '2.3.1',
            status: 'ACTIVE',
            executionStatus: 'IDLE',
            updatedAt: '2026-05-18T11:13:00.000Z',
          },
        ],
        meta: { page: args.page, totalPages: 3, total: 25 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }))

    renderPage()

    const pagination = screen.getByRole('navigation', {
      name: /value narrative runtime pagination/i,
    })

    expect(screen.getByText('Page 1 Value Narrative')).toBeInTheDocument()
    expect(within(pagination).getByText('Page 1 of 3 (25 runtime instances)')).toBeInTheDocument()
    expect(useListRuntimeInstancesQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        tenantId: 'tenant-1',
        runtimeType: 'VALUE_NARRATIVE',
        page: 1,
        pageSize: 10,
      }),
      { skip: false },
    )

    await user.click(within(pagination).getByRole('button', { name: /^next$/i }))

    await waitFor(() => {
      expect(useListRuntimeInstancesQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          customerId: 'cust-1',
          tenantId: 'tenant-1',
          runtimeType: 'VALUE_NARRATIVE',
          page: 2,
          pageSize: 10,
        }),
        { skip: false },
      )
    })
    expect(screen.getByText('Page 2 Value Narrative')).toBeInTheDocument()
    expect(within(pagination).getByText('Page 2 of 3 (25 runtime instances)')).toBeInTheDocument()
  })

  it('submits create payload with optional description to the runtime instance API', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create value narrative$/i }))
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByRole('combobox', { name: /framework package/i }))
      .toHaveDisplayValue('VMF Runtime Package / 2.3.1')

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
      expect(createRuntimeInstanceMock).toHaveBeenCalledTimes(1)
    })

    expect(createRuntimeInstanceMock).toHaveBeenCalledWith({
      body: {
        customerId: 'cust-1',
        tenantId: 'tenant-1',
        frameworkKey: 'VMF',
        runtimeType: 'VALUE_NARRATIVE',
        name: 'Northwind',
        frameworkPackageId: 'pkg-1',
        description: 'Launch planning workspace',
      },
    })
  })

  it('defaults to the default framework package when more than one package is available', async () => {
    const user = userEvent.setup()

    frameworkPackageQueryResponse = {
      data: {
        data: [
          {
            id: 'pkg-1',
            packageName: 'VMF Runtime Package',
            packageKey: 'vmf-runtime-package',
            version: '2.3.1',
            status: 'ACTIVE',
            isDefault: true,
          },
          {
            id: 'pkg-2',
            packageName: 'VMF Enterprise Package',
            packageKey: 'vmf-enterprise-package',
            version: '2.4.0',
            status: 'ACTIVE',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 2 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    await user.click(screen.getByRole('button', { name: /^create value narrative$/i }))
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByRole('combobox', { name: /framework package/i }))
      .toHaveDisplayValue('VMF Runtime Package / 2.3.1')

    await user.type(
      within(dialog).getByLabelText(/name/i, { selector: 'input#vmf-create-name' }),
      'Northwind',
    )
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(createRuntimeInstanceMock).toHaveBeenCalledTimes(1)
    })

    expect(createRuntimeInstanceMock).toHaveBeenCalledWith({
      body: {
        customerId: 'cust-1',
        tenantId: 'tenant-1',
        frameworkKey: 'VMF',
        runtimeType: 'VALUE_NARRATIVE',
        name: 'Northwind',
        frameworkPackageId: 'pkg-1',
      },
    })
  })

  it('allows the user to override the default framework package selection', async () => {
    const user = userEvent.setup()

    frameworkPackageQueryResponse = {
      data: {
        data: [
          {
            id: 'pkg-1',
            packageName: 'VMF Runtime Package',
            packageKey: 'vmf-runtime-package',
            version: '2.3.1',
            status: 'ACTIVE',
            isDefault: true,
          },
          {
            id: 'pkg-2',
            packageName: 'VMF Enterprise Package',
            packageKey: 'vmf-enterprise-package',
            version: '2.4.0',
            status: 'ACTIVE',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 2 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    await user.click(screen.getByRole('button', { name: /^create value narrative$/i }))
    const dialog = screen.getByRole('dialog')
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: /framework package/i }),
      'pkg-2',
    )
    await user.type(
      within(dialog).getByLabelText(/name/i, { selector: 'input#vmf-create-name' }),
      'Northwind',
    )
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(createRuntimeInstanceMock).toHaveBeenCalledTimes(1)
    })

    expect(createRuntimeInstanceMock).toHaveBeenCalledWith({
      body: {
        customerId: 'cust-1',
        tenantId: 'tenant-1',
        frameworkKey: 'VMF',
        runtimeType: 'VALUE_NARRATIVE',
        name: 'Northwind',
        frameworkPackageId: 'pkg-2',
      },
    })
  })

  it('requires a selected framework package when multiple packages are available without a default', async () => {
    const user = userEvent.setup()

    frameworkPackageQueryResponse = {
      data: {
        data: [
          {
            id: 'pkg-1',
            packageName: 'VMF Runtime Package',
            packageKey: 'vmf-runtime-package',
            version: '2.3.1',
            status: 'ACTIVE',
          },
          {
            id: 'pkg-2',
            packageName: 'VMF Enterprise Package',
            packageKey: 'vmf-enterprise-package',
            version: '2.4.0',
            status: 'ACTIVE',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 2 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    await user.click(screen.getByRole('button', { name: /^create value narrative$/i }))
    const dialog = screen.getByRole('dialog')

    await user.type(
      within(dialog).getByLabelText(/name/i, { selector: 'input#vmf-create-name' }),
      'Northwind',
    )
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }))

    expect(await within(dialog).findByText(/framework package is required/i)).toBeInTheDocument()
    expect(createRuntimeInstanceMock).not.toHaveBeenCalled()
  })

  it('shows VMF capacity guidance without blocking runtime instance creation', () => {
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
    expect(screen.getByRole('button', { name: /^create value narrative$/i })).toBeEnabled()
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
    expect(screen.getByRole('button', { name: /^create value narrative$/i })).toBeEnabled()
  })

  it('renders Back, capacity, and Create Value Narrative in the compact catalogue action bar', () => {
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

    const actionBar = screen.getByRole('group', { name: /vmf catalogue actions/i })

    expect(within(actionBar).getByRole('button', { name: /^back$/i })).toBeInTheDocument()
    expect(within(actionBar).getByRole('status', { name: /^vmf capacity/i })).toHaveTextContent('2 of 4 left')
    expect(within(actionBar).getByRole('button', { name: /^create value narrative$/i })).toBeEnabled()
    expect(actionBar).toHaveTextContent(/BackCreate Value Narrative.*2 of 4 left/)
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
    await user.click(screen.getByRole('button', { name: /^create value narrative$/i }))

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

  it('renders a read-only VMF workspace with a details action for standard viewers', async () => {
    const user = userEvent.setup()
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
            frameworkPackageId: 'pkg-vmf-2-2',
            frameworkPackage: { id: 'pkg-vmf-2-2', name: 'VMF Package 2.2' },
            completionState: 'NOT_TRACKED',
            validationStatus: 'NOT_RUN',
            lockStatus: 'UNLOCKED',
            snapshotStatus: 'PACKAGE_INFERRED_FROM_VERSION',
            migrationAvailable: false,
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
    expect(screen.queryByRole('button', { name: /^create value narrative$/i })).not.toBeInTheDocument()
    expect(
      screen.getByText(/linked tenant members can review published vmfs only/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Viewer VMF')).toBeInTheDocument()
    const actions = screen.getByRole('combobox', { name: /actions for viewer vmf/i })
    expect(within(actions).getByRole('option', { name: /view details/i })).toBeInTheDocument()
    expect(within(actions).queryByRole('option', { name: /edit/i })).not.toBeInTheDocument()
    expect(within(actions).queryByRole('option', { name: /delete/i })).not.toBeInTheDocument()
    expect(
      screen.getByLabelText(/lifecycle/i, { selector: 'select#vmf-lifecycle-filter' }),
    ).toHaveValue('PUBLISHED')
    expect(
      screen.getByLabelText(/lifecycle/i, { selector: 'select#vmf-lifecycle-filter' }),
    ).toBeDisabled()
    expect(useGetCustomerQuery).toHaveBeenLastCalledWith('cust-1', { skip: true })

    await user.selectOptions(actions, 'View details')

    const dialog = screen.getByRole('dialog', { name: /viewer vmf details/i })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('VMF Package 2.2')).toBeInTheDocument()
    expect(within(dialog).getByText('Readiness pending')).toBeInTheDocument()
    expect(within(dialog).getByText('Not Started')).toBeInTheDocument()
    expect(within(dialog).getByText('PACKAGE_INFERRED_FROM_VERSION')).toBeInTheDocument()
  })

  it('prefers framework package names over package ids in the catalogue', () => {
    listQueryResponse = {
      data: {
        data: [
          {
            id: 'vmf-package-name',
            name: 'Package-backed VMF',
            description: 'Uses packageName from the expanded framework package.',
            status: 'ACTIVE',
            lifecycleStatus: 'DRAFT',
            frameworkVersion: '2.3.569357',
            frameworkPackageId: '6a06e86458a5e0613e859907',
            frameworkPackage: {
              id: '6a06e86458a5e0613e859907',
              packageName: 'Latest Package',
              version: '2.3.569357',
            },
            completionState: 'NOT_TRACKED',
            validationStatus: 'NOT_RUN',
            lockStatus: 'UNLOCKED',
            snapshotStatus: 'PACKAGE_BOUND',
            migrationAvailable: false,
            updatedAt: '2026-05-18T11:13:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    expect(screen.getByText('Package-backed VMF')).toBeInTheDocument()
    expect(screen.getByText('Latest Package')).toBeInTheDocument()
    expect(screen.queryByText('6a06e86458a5e0613e859907')).not.toBeInTheDocument()
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
    expect(screen.queryByRole('button', { name: /^create value narrative$/i })).not.toBeInTheDocument()
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

    expect(screen.queryByRole('button', { name: /^create value narrative$/i })).not.toBeInTheDocument()
    expect(useGetCustomerQuery).toHaveBeenLastCalledWith('cust-1', { skip: true })

    const actions = screen.getByRole('combobox', { name: /actions for editable vmf/i })
    expect(within(actions).getByRole('option', { name: /view details/i })).toBeInTheDocument()
    expect(within(actions).getByRole('option', { name: /edit/i })).toBeInTheDocument()
    expect(within(actions).getByRole('option', { name: /delete/i })).toBeInTheDocument()

    await user.selectOptions(actions, 'Edit')

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /edit vmf/i })).toBeInTheDocument()
  })

  it('shows only the details action when VMF_UPDATE is not granted', () => {
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

    const actions = screen.getByRole('combobox', { name: /actions for read only vmf/i })
    expect(within(actions).getByRole('option', { name: /view details/i })).toBeInTheDocument()
    expect(within(actions).queryByRole('option', { name: /edit/i })).not.toBeInTheDocument()
    expect(within(actions).queryByRole('option', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('renders compact row-action menus with only the allowed actions per row state', async () => {
    const user = userEvent.setup()
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

    expect(screen.getByText(/use the actions menu to view details, edit vmfs, or schedule a soft-delete/i)).toBeInTheDocument()

    const table = screen.getByRole('table', { name: /vmf catalogue/i })

    expect(within(table).getByRole('columnheader', { name: /^vmf$/i })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: /^description$/i })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: /^status$/i })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: /^lifecycle$/i })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: /^framework$/i })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: /^runtime state$/i })).toBeInTheDocument()
    expect(within(table).queryByRole('columnheader', { name: /^completion$/i })).not.toBeInTheDocument()
    expect(within(table).getByText('Current active framework')).toBeInTheDocument()
    expect(within(table).getByText('CANONISED')).toBeInTheDocument()
    expect(within(table).getByText('PUBLISHED')).toBeInTheDocument()
    expect(within(table).getAllByText('Version').length).toBeGreaterThan(0)
    expect(within(table).getAllByRole('button', { name: /completion runtime evidence/i })).toHaveLength(2)
    expect(within(table).getAllByRole('button', { name: /readiness runtime evidence/i })).toHaveLength(2)
    expect(within(table).getAllByRole('button', { name: /execution runtime evidence/i })).toHaveLength(2)
    expect(within(table).getAllByRole('button', { name: /validation runtime evidence/i })).toHaveLength(2)
    expect(within(table).getAllByRole('button', { name: /lock runtime evidence/i })).toHaveLength(2)
    expect(within(table).getAllByRole('button', { name: /snapshot runtime evidence/i })).toHaveLength(2)
    expect(within(table).getAllByRole('button', { name: /migration runtime evidence/i })).toHaveLength(2)
    const runtimeEvidenceButtons = within(table).getAllByRole('button', {
      name: /completion runtime evidence/i,
    })
    const activeRuntimePanel = document.getElementById(
      runtimeEvidenceButtons[0].getAttribute('aria-controls'),
    )
    expect(runtimeEvidenceButtons).toHaveLength(2)
    expect(runtimeEvidenceButtons[0]).toHaveAttribute('aria-expanded', 'false')
    expect(activeRuntimePanel).toHaveAttribute('aria-hidden', 'true')

    await user.click(runtimeEvidenceButtons[0])

    expect(runtimeEvidenceButtons[0]).toHaveAttribute('aria-expanded', 'true')
    expect(activeRuntimePanel).toHaveAttribute('aria-hidden', 'false')
    expect(activeRuntimePanel).toHaveTextContent('NOT_TRACKED')

    const activeActions = screen.getByRole('combobox', { name: /actions for active vmf/i })
    expect(within(activeActions).getByRole('option', { name: /view details/i })).toBeInTheDocument()
    expect(within(activeActions).getByRole('option', { name: /edit/i })).toBeInTheDocument()
    expect(within(activeActions).queryByRole('option', { name: /delete/i })).not.toBeInTheDocument()

    const archivedActions = screen.getByRole('combobox', { name: /actions for archived vmf/i })
    expect(within(archivedActions).getByRole('option', { name: /view details/i })).toBeInTheDocument()
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
