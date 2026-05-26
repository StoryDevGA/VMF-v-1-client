import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
          <Route path="/app/runtime/:runtimeInstanceId" element={<div>Runtime Route</div>} />
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
      data: {
        data: [],
        meta: {
          page: 1,
          totalPages: 1,
          total: 0,
          runtimeCapacity: {
            runtimeType: 'VALUE_NARRATIVE',
            maxRuntimeInstances: 4,
            currentCount: 2,
            remainingCount: 2,
            isAtCapacity: false,
            countMode: 'ACTIVE_RUNTIME_INSTANCES',
          },
        },
      },
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

  it('renders one Value Narrative register when no runtime instances exist', () => {
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
    expect(screen.getByRole('heading', { name: /value narratives/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /value narrative work register/i }))
      .toBeInTheDocument()
    expect(screen.getByText(/no value narratives found/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^create new instance$/i })).toBeInTheDocument()
  })

  it('lists Value Narrative runtime instances from the runtime instance API', async () => {
    const user = userEvent.setup()

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

    expect(screen.getByRole('heading', { name: /value narratives/i })).toBeInTheDocument()
    expect(useListRuntimeInstancesQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        tenantId: 'tenant-1',
        runtimeType: 'VALUE_NARRATIVE',
        pageSize: 10,
      }),
      { skip: false },
    )
    const table = screen.getByRole('table', { name: /value narrative work register/i })

    expect(table)
      .toBeInTheDocument()
    expect(within(table).getByRole('link', { name: /^northwind value narrative$/i }))
      .toHaveAttribute('href', '/app/runtime/value-narrative-001')
    expect(within(table).getAllByText('value-narrative-001').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('vmf-runtime-package').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('Idle').length).toBeGreaterThan(0)
    const runtimeActions = within(table).getByRole('combobox', {
      name: /runtime actions for northwind value narrative/i,
    })
    expect(within(runtimeActions).getByRole('option', { name: /^continue$/i })).toBeInTheDocument()
    expect(within(runtimeActions).queryByRole('option', { name: /edit/i })).not.toBeInTheDocument()
    expect(within(runtimeActions).queryByRole('option', { name: /delete/i })).not.toBeInTheDocument()
    const moreInformation = within(table).getByRole('button', {
      name: /show more information for northwind value narrative/i,
    })
    expect(moreInformation).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByLabelText(/value narrative register counts/i))
      .toHaveTextContent(/1 runtime object\s*\|\s*0 VMF bridge records/i)

    await user.click(moreInformation)

    expect(moreInformation).toHaveAttribute('aria-expanded', 'true')
    expect(within(table).queryByRole('tablist')).not.toBeInTheDocument()
    expect(within(table).getAllByText('Overview').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('Runtime').length).toBeGreaterThan(0)
    expect(within(table).queryByText(/no dependency records returned/i)).not.toBeInTheDocument()
    expect(within(table).queryByText(/no notes returned/i)).not.toBeInTheDocument()
    expect(within(table).queryByText(/no change-log events returned/i)).not.toBeInTheDocument()

    await user.selectOptions(runtimeActions, 'Continue')

    expect(screen.getByText('Runtime Route')).toBeInTheDocument()
  })

  it('does not send VMF-only disabled status to the runtime instance API', async () => {
    const user = userEvent.setup()

    runtimeInstanceQueryResponse = {
      data: {
        data: [
          {
            id: 'runtime-1',
            runtimeInstanceKey: 'value-narrative-001',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'Active Runtime Narrative',
            packageKey: 'vmf-runtime-package',
            status: 'ACTIVE',
            executionStatus: 'IDLE',
            updatedAt: '2026-05-18T11:13:00.000Z',
          },
        ],
        meta: {
          page: 1,
          totalPages: 1,
          total: 1,
          runtimeCapacity: {
            runtimeType: 'VALUE_NARRATIVE',
            maxRuntimeInstances: 4,
            currentCount: 1,
            remainingCount: 3,
            isAtCapacity: false,
            countMode: 'ACTIVE_RUNTIME_INSTANCES',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }
    listQueryResponse = {
      data: {
        data: [
          {
            id: 'vmf-disabled',
            name: 'Disabled Bridge VMF',
            status: 'DISABLED',
            lifecycleStatus: 'PUBLISHED',
            updatedAt: '2026-05-17T11:13:00.000Z',
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
      screen.getByLabelText(/status/i, { selector: 'select#vmf-status-filter' }),
      'DISABLED',
    )

    expect(useListRuntimeInstancesQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        tenantId: 'tenant-1',
        runtimeType: 'VALUE_NARRATIVE',
        q: '',
        status: '',
      }),
      { skip: false },
    )
    expect(screen.queryByText('Active Runtime Narrative')).not.toBeInTheDocument()
    expect(screen.getByText('Disabled Bridge VMF')).toBeInTheDocument()
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
    expect(within(pagination).getByText('Runtime objects page 1 of 3 (25 runtime objects)')).toBeInTheDocument()
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
    expect(within(pagination).getByText('Runtime objects page 2 of 3 (25 runtime objects)')).toBeInTheDocument()
  })

  it('submits create payload with optional description to the runtime instance API', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create new instance$/i }))
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

    await user.click(screen.getByRole('button', { name: /^create new instance$/i }))
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

    await user.click(screen.getByRole('button', { name: /^create new instance$/i }))
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

    await user.click(screen.getByRole('button', { name: /^create new instance$/i }))
    const dialog = screen.getByRole('dialog')

    await user.type(
      within(dialog).getByLabelText(/name/i, { selector: 'input#vmf-create-name' }),
      'Northwind',
    )
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }))

    expect(await within(dialog).findByText(/framework package is required/i)).toBeInTheDocument()
    expect(createRuntimeInstanceMock).not.toHaveBeenCalled()
  })

  it('shows Value Narrative capacity guidance and blocks creation when runtime capacity is reached', () => {
    runtimeInstanceQueryResponse = {
      data: {
        data: [],
        meta: {
          page: 1,
          totalPages: 1,
          total: 0,
          runtimeCapacity: {
            runtimeType: 'VALUE_NARRATIVE',
            maxRuntimeInstances: 4,
            currentCount: 4,
            remainingCount: 0,
            isAtCapacity: true,
            countMode: 'ACTIVE_RUNTIME_INSTANCES',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    const capacityGuidance = screen.getByRole('status', {
      name: /^value narrative capacity reached/i,
    })

    expect(capacityGuidance).toHaveTextContent(/0 of 4 left/i)
    expect(screen.getByRole('button', { name: /^create new instance$/i })).toBeDisabled()
  })

  it('shows compact Value Narrative usage guidance when runtime capacity remains', () => {
    runtimeInstanceQueryResponse = {
      data: {
        data: [],
        meta: {
          page: 1,
          totalPages: 1,
          total: 0,
          runtimeCapacity: {
            runtimeType: 'VALUE_NARRATIVE',
            maxRuntimeInstances: 4,
            currentCount: 2,
            remainingCount: 2,
            isAtCapacity: false,
            countMode: 'ACTIVE_RUNTIME_INSTANCES',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    const capacityGuidance = screen.getByRole('status', { name: /^value narrative capacity/i })

    expect(capacityGuidance).toHaveTextContent(/2 of 4 left/i)
    expect(screen.getByRole('button', { name: /^create new instance$/i })).toBeEnabled()
  })

  it('uses runtime instance capacity instead of stale VMF catalogue capacity', () => {
    listQueryResponse = {
      data: {
        data: [],
        meta: {
          page: 1,
          totalPages: 1,
          total: 0,
          vmfCapacity: {
            maxVmfs: 3,
            currentCount: 2,
            remainingCount: 1,
            isAtCapacity: false,
            countMode: 'ACTIVE',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }
    runtimeInstanceQueryResponse = {
      data: {
        data: [],
        meta: {
          page: 1,
          totalPages: 1,
          total: 3,
          runtimeCapacity: {
            runtimeType: 'VALUE_NARRATIVE',
            maxRuntimeInstances: 3,
            currentCount: 3,
            remainingCount: 0,
            isAtCapacity: true,
            countMode: 'ACTIVE_RUNTIME_INSTANCES',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    expect(screen.getByRole('status', { name: /^value narrative capacity reached/i }))
      .toHaveTextContent(/0 of 3 left/i)
    expect(screen.getByRole('button', { name: /^create new instance$/i })).toBeDisabled()
  })

  it('fails closed when runtime instance capacity cannot be loaded', () => {
    listQueryResponse = {
      data: {
        data: [],
        meta: {
          page: 1,
          totalPages: 1,
          total: 0,
          vmfCapacity: {
            maxVmfs: 4,
            currentCount: 1,
            remainingCount: 3,
            isAtCapacity: false,
            countMode: 'ACTIVE',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }
    runtimeInstanceQueryResponse = {
      data: null,
      isLoading: false,
      isFetching: false,
      error: { status: 503, data: { error: { message: 'Runtime capacity unavailable' } } },
    }

    renderPage()

    expect(screen.getByRole('status', { name: /^value narrative capacity unavailable/i }))
      .toHaveTextContent(/capacity unavailable/i)
    expect(screen.getByRole('button', { name: /^create new instance$/i })).toBeDisabled()
  })

  it('fails closed when runtime instance metadata omits runtime capacity', () => {
    listQueryResponse = {
      data: {
        data: [],
        meta: {
          page: 1,
          totalPages: 1,
          total: 0,
          vmfCapacity: {
            maxVmfs: 4,
            currentCount: 1,
            remainingCount: 3,
            isAtCapacity: false,
            countMode: 'ACTIVE',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }
    runtimeInstanceQueryResponse = {
      data: { data: [], meta: { page: 1, totalPages: 1, total: 0 } },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    expect(screen.getByRole('status', { name: /^value narrative capacity unavailable/i }))
      .toHaveTextContent(/capacity unavailable/i)
    expect(screen.getByRole('button', { name: /^create new instance$/i })).toBeDisabled()
  })

  it('blocks create submission when runtime capacity becomes unavailable after the dialog opens', async () => {
    const user = userEvent.setup()

    const view = renderPage()

    await user.click(screen.getByRole('button', { name: /^create new instance$/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    runtimeInstanceQueryResponse = {
      data: null,
      isLoading: false,
      isFetching: false,
      error: { status: 503, data: { error: { message: 'Runtime capacity unavailable' } } },
    }

    view.rerender(getPageTree())

    const dialog = screen.getByRole('dialog')
    const createButton = within(dialog).getByRole('button', { name: /^create$/i })

    expect(within(dialog).getByRole('alert')).toHaveTextContent(/capacity is unavailable/i)
    expect(createButton).toBeDisabled()

    fireEvent.submit(createButton.closest('form'))

    expect(createRuntimeInstanceMock).not.toHaveBeenCalled()
  })

  it('explains when tenant capacity exists but no runtime-ready package is available', async () => {
    const user = userEvent.setup()

    runtimeInstanceQueryResponse = {
      data: {
        data: [],
        meta: {
          page: 1,
          totalPages: 1,
          total: 0,
          runtimeCapacity: {
            runtimeType: 'VALUE_NARRATIVE',
            maxRuntimeInstances: 4,
            currentCount: 2,
            remainingCount: 2,
            isAtCapacity: false,
            countMode: 'ACTIVE_RUNTIME_INSTANCES',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }
    frameworkPackageQueryResponse = {
      data: { data: [], meta: { page: 1, totalPages: 1, total: 0 } },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    const actionBar = screen.getByRole('group', { name: /value narrative workspace actions/i })

    expect(screen.getByRole('status', { name: /^value narrative capacity/i }))
      .toHaveTextContent(/2 of 4 left/i)
    expect(screen.getByRole('status', { name: /eligible framework package required/i }))
      .toHaveTextContent(/no eligible package/i)
    expect(actionBar).toHaveTextContent(/No eligible package\s*Back\s*2 of 4 left/i)

    await user.click(screen.getByRole('button', { name: /^create new instance$/i }))
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByRole('combobox', { name: /framework package/i }))
      .toBeDisabled()
    expect(within(dialog).getByText(/assigned or published for this customer/i))
      .toBeInTheDocument()
    expect(within(dialog).getByText(/available to this customer and runtime-ready/i))
      .toBeInTheDocument()
    expect(within(dialog).getByText(/assign or publish a package with active deployment evidence/i))
      .toBeInTheDocument()
    expect(within(dialog).getByText(/certified dependency lock, active activation, active deployment/i))
      .toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /^create$/i })).toBeDisabled()
  })

  it('keeps create as a single primary header action and leaves the compact workspace action bar for navigation', () => {
    runtimeInstanceQueryResponse = {
      data: {
        data: [],
        meta: {
          page: 1,
          totalPages: 1,
          total: 0,
          runtimeCapacity: {
            runtimeType: 'VALUE_NARRATIVE',
            maxRuntimeInstances: 4,
            currentCount: 2,
            remainingCount: 2,
            isAtCapacity: false,
            countMode: 'ACTIVE_RUNTIME_INSTANCES',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    const actionBar = screen.getByRole('group', { name: /value narrative workspace actions/i })
    const quickCreate = screen.getByRole('group', { name: /value narrative quick create/i })

    expect(within(actionBar).getByRole('button', { name: /^back$/i })).toBeInTheDocument()
    expect(within(actionBar).getByRole('status', { name: /^value narrative capacity/i })).toHaveTextContent('2 of 4 left')
    expect(within(actionBar).queryByRole('button', { name: /^create value narrative$/i })).not.toBeInTheDocument()
    expect(within(quickCreate).getByRole('button', { name: /^create new instance$/i })).toBeEnabled()
    expect(actionBar).toHaveTextContent(/Back.*2 of 4 left/)
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
    await user.click(screen.getByRole('button', { name: /^create new instance$/i }))

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
      screen.getByText(/linked tenant members can review published vmf bridge records and published runtime lifecycle rows only/i),
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

  it('applies the read-only published lifecycle filter to runtime instance rows', () => {
    useAuthorization.mockReturnValue({
      hasFeatureEntitlement: () => true,
      hasCustomerPermission: () => false,
      hasTenantPermission: (_customerId, _tenantId, permission) => permission === 'VMF_VIEW',
      hasVmfPermission: () => false,
      hasVmfWorkspaceManagementAccess: () => false,
    })

    runtimeInstanceQueryResponse = {
      data: {
        data: [
          {
            id: 'runtime-draft',
            runtimeInstanceKey: 'value-narrative-draft',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'Draft Runtime Narrative',
            packageKey: 'vmf-runtime-package',
            status: 'ACTIVE',
            executionStatus: 'IDLE',
            framework_state: { lifecycle: { stage: 'DRAFT' } },
            updatedAt: '2026-05-18T11:13:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }
    listQueryResponse = {
      data: {
        data: [
          {
            id: 'vmf-read-only',
            name: 'Published Bridge VMF',
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
      expect.objectContaining({ lifecycleStatus: 'PUBLISHED' }),
      { skip: false },
    )
    expect(screen.getByText('Published Bridge VMF')).toBeInTheDocument()
    expect(screen.queryByText('Draft Runtime Narrative')).not.toBeInTheDocument()
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
    expect(screen.getAllByText('Latest Package').length).toBeGreaterThan(0)
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

    expect(screen.getByText(/runtime objects are shown alongside transitional vmf bridge records/i)).toBeInTheDocument()

    const table = screen.getByRole('table', { name: /value narrative work register/i })

    expect(within(table).getByRole('columnheader', { name: /^value narrative$/i })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: /^description$/i })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: /^state$/i })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: /^stage \/ health$/i })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: /^framework \/ package$/i })).toBeInTheDocument()
    expect(within(table).queryByRole('columnheader', { name: /^completion$/i })).not.toBeInTheDocument()
    expect(within(table).getByText('Current active framework')).toBeInTheDocument()
    expect(within(table).getAllByText('CANONISED').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('PUBLISHED').length).toBeGreaterThan(0)
    expect(within(table).getByText('Version 2.2')).toBeInTheDocument()
    expect(within(table).getByText('Version 2.0')).toBeInTheDocument()

    const activeCompletionAccordion = within(table).getByRole('button', {
      name: /completion for active vmf/i,
    })
    const activeVmfIdAccordion = within(table).getByRole('button', {
      name: /vmf id for active vmf/i,
    })

    expect(activeCompletionAccordion).toHaveAttribute('aria-expanded', 'false')
    expect(activeVmfIdAccordion).toHaveAttribute('aria-expanded', 'false')

    await user.click(activeCompletionAccordion)

    expect(activeCompletionAccordion).toHaveAttribute('aria-expanded', 'true')
    const completionValue = within(table).getAllByText('NOT_TRACKED')[0]
    expect(completionValue.closest('.badge')).toHaveClass('badge--info')

    await user.click(activeVmfIdAccordion)

    expect(activeVmfIdAccordion).toHaveAttribute('aria-expanded', 'true')
    expect(within(table).getAllByText('VMF ID').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('vmf-active').length).toBeGreaterThan(0)

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
