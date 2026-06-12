import path from 'node:path'
import process from 'node:process'
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import MaintainVmfs from './MaintainVmfs.jsx'

const maintainVmfsCss = readFileSync(
  path.resolve(process.cwd(), 'src/pages/MaintainVmfs/MaintainVmfs.css'),
  'utf8',
)

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getCssRuleBody(selector, { after } = {}) {
  const startIndex = after ? maintainVmfsCss.indexOf(after) : 0

  if (startIndex === -1) {
    throw new Error(`Missing CSS anchor ${after}`)
  }

  const source = maintainVmfsCss.slice(startIndex)
  const match = new RegExp(`${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\}`).exec(source)

  if (!match) {
    throw new Error(`Missing CSS rule for ${selector}`)
  }

  return match[1]
}

function getCssDeclarations(selector, options) {
  return getCssRuleBody(selector, options)
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .reduce((declarations, declaration) => {
      const separatorIndex = declaration.indexOf(':')

      if (separatorIndex === -1) return declarations

      const property = declaration.slice(0, separatorIndex).trim()
      const value = declaration.slice(separatorIndex + 1).replace(/\s+/g, ' ').trim()

      return {
        ...declarations,
        [property]: value,
      }
    }, {})
}

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

function RuntimeRouteProbe() {
  const location = useLocation()
  return (
    <div>
      <span>Runtime Route</span>
      <span>{location.state?.from ?? ''}</span>
    </div>
  )
}

function getPageTree(initialEntry = '/app/workspaces/vmf') {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <ToasterProvider>
        <Routes>
          <Route path="/app/workspaces/vmf" element={<MaintainVmfs />} />
          <Route path="/app/runtime/:runtimeInstanceId" element={<RuntimeRouteProbe />} />
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
    const continueSection = screen.getByRole('heading', { name: /^continue work$/i })
      .closest('section')
    const primaryContinueCard = within(continueSection)
      .getByText('Northwind Value Narrative')
      .closest('li')
    const primaryHead = primaryContinueCard.querySelector('.maintain-vmfs__continue-head')
    const primaryCopy = primaryContinueCard.querySelector('.maintain-vmfs__continue-copy')
    const primaryActions = primaryContinueCard.querySelector('.maintain-vmfs__continue-actions')
    const lockedSummaryCard = within(continueSection)
      .getByText('Review Locked Instances')
      .closest('li')

    expect(primaryContinueCard).toHaveClass('maintain-vmfs__continue-card--primary')
    expect(primaryHead).not.toBeNull()
    expect(primaryHead).toContainElement(
      within(primaryContinueCard).getByRole('heading', { name: 'Northwind Value Narrative' }),
    )
    expect(primaryHead).toContainElement(within(primaryContinueCard).getByLabelText('Runtime state'))
    expect(primaryCopy).not.toBeNull()
    expect(primaryCopy.querySelector('.maintain-vmfs__continue-title')).not.toBeInTheDocument()
    expect(primaryCopy.querySelector('.maintain-vmfs__continue-status')).not.toBeInTheDocument()
    expect(primaryActions).not.toBeNull()
    expect(primaryActions).toContainElement(
      within(primaryContinueCard).getByRole('button', { name: /^continue$/i }),
    )
    expect(lockedSummaryCard).toHaveClass('maintain-vmfs__continue-card--summary')
    expect(lockedSummaryCard).toHaveClass('maintain-vmfs__continue-card--secondary')
    expect(lockedSummaryCard.querySelector('.maintain-vmfs__continue-arrow')).not.toBeInTheDocument()
    expect(within(lockedSummaryCard).queryByRole('link')).not.toBeInTheDocument()
    expect(within(lockedSummaryCard).queryByRole('button')).not.toBeInTheDocument()
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
    expect(within(table).queryByRole('combobox', {
      name: /runtime actions for northwind value narrative/i,
    })).not.toBeInTheDocument()
    const continueButton = within(table).getByRole('button', { name: /^continue$/i })
    const detailsToggle = within(table).getByRole('button', {
      name: /show more information for northwind value narrative/i,
    })
    expect(detailsToggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByLabelText(/value narrative register counts/i))
      .toHaveTextContent(/1 runtime object\s*\|\s*0 VMF bridge records/i)

    expect(within(table).queryByRole('tablist')).not.toBeInTheDocument()

    await user.click(detailsToggle)

    expect(detailsToggle).toHaveAttribute('aria-expanded', 'true')
    expect(within(table).getAllByText('Overview').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('Runtime').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('Idle').length).toBeGreaterThan(0)
    expect(within(table).queryByText(/no dependency records returned/i)).not.toBeInTheDocument()
    expect(within(table).queryByText(/no notes returned/i)).not.toBeInTheDocument()
    expect(within(table).queryByText(/no change-log events returned/i)).not.toBeInTheDocument()

    await user.click(continueButton)

    expect(screen.getByText('Runtime Route')).toBeInTheDocument()
    expect(screen.getByText('/app/workspaces/vmf')).toBeInTheDocument()
  })

  it('applies the featured Continue Work treatment only to the first Value Narrative card', () => {
    runtimeInstanceQueryResponse = {
      data: {
        data: [
          {
            id: 'runtime-first',
            runtimeInstanceKey: 'value-narrative-first',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'First Runtime',
            packageKey: 'vmf-runtime-package',
            packageVersion: '2.3.1',
            status: 'ACTIVE',
            executionStatus: 'IDLE',
            updatedAt: '2026-05-27T09:21:00.000Z',
          },
          {
            id: 'runtime-second',
            runtimeInstanceKey: 'value-narrative-second',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'Second Runtime',
            packageKey: 'vmf-runtime-package',
            packageVersion: '2.3.1',
            status: 'ACTIVE',
            executionStatus: 'IDLE',
            updatedAt: '2026-05-25T11:48:00.000Z',
          },
          {
            id: 'runtime-third',
            runtimeInstanceKey: 'value-narrative-third',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'Third Runtime',
            packageKey: 'vmf-runtime-package',
            packageVersion: '2.3.1',
            status: 'ARCHIVED',
            executionStatus: 'IDLE',
            updatedAt: '2026-05-20T15:11:00.000Z',
          },
          {
            id: 'runtime-fourth',
            runtimeInstanceKey: 'value-narrative-fourth',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'Fourth Runtime',
            packageKey: 'vmf-runtime-package',
            packageVersion: '2.3.1',
            status: 'ACTIVE',
            executionStatus: 'IDLE',
            updatedAt: '2026-05-20T14:46:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 4 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    const continueSection = screen.getByRole('heading', { name: /^continue work$/i })
      .closest('section')
    const continueCards = Array.from(continueSection.querySelectorAll('.maintain-vmfs__continue-card'))
    const [primaryContinueCard, ...summaryCards] = continueCards

    expect(continueCards).toHaveLength(4)
    expect(primaryContinueCard).toHaveClass('maintain-vmfs__continue-card--primary')
    expect(primaryContinueCard).not.toHaveClass('maintain-vmfs__continue-card--summary')
    expect(within(primaryContinueCard).getByRole('heading', { name: 'First Runtime' }))
      .toBeInTheDocument()
    expect(within(primaryContinueCard).getByRole('button', { name: /^continue$/i }))
      .toBeInTheDocument()
    expect(primaryContinueCard.querySelector('.maintain-vmfs__continue-arrow')).toBeInTheDocument()

    summaryCards.forEach((card) => {
      expect(card).toHaveClass('maintain-vmfs__continue-card--summary')
      expect(card).toHaveClass('maintain-vmfs__continue-card--secondary')
      expect(card).not.toHaveClass('maintain-vmfs__continue-card--primary')
      expect(card.querySelector('.maintain-vmfs__continue-actions')).not.toBeInTheDocument()
      expect(card.querySelector('.maintain-vmfs__continue-arrow')).not.toBeInTheDocument()
      expect(within(card).queryByRole('button')).not.toBeInTheDocument()
      expect(within(card).queryByRole('link')).not.toBeInTheDocument()
    })
  })

  it('surfaces API-backed focus details on secondary Continue Work cards', () => {
    runtimeInstanceQueryResponse = {
      data: {
        data: [
          {
            id: 'runtime-risk',
            runtimeInstanceKey: 'value-narrative-risk',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'At Risk Runtime',
            packageKey: 'vmf-runtime-package',
            packageVersion: '2.3.1',
            status: 'ACTIVE',
            executionStatus: 'BLOCKED',
            validationStatus: 'READY',
            lockStatus: 'UNLOCKED',
            updatedAt: '2026-05-27T09:21:00.000Z',
          },
          {
            id: 'runtime-pending',
            runtimeInstanceKey: 'value-narrative-pending',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'Pending Validation Runtime',
            packageKey: 'vmf-runtime-package',
            packageVersion: '2.3.1',
            status: 'ACTIVE',
            executionStatus: 'IDLE',
            validationStatus: 'PENDING',
            lockStatus: 'UNLOCKED',
            updatedAt: '2026-05-26T10:10:00.000Z',
          },
          {
            id: 'runtime-locked',
            runtimeInstanceKey: 'value-narrative-locked',
            runtimeType: 'VALUE_NARRATIVE',
            name: 'Locked Runtime',
            packageKey: 'vmf-runtime-package',
            packageVersion: '2.3.1',
            status: 'ACTIVE',
            executionStatus: 'IDLE',
            validationStatus: 'READY',
            lockStatus: 'LOCKED',
            updatedAt: '2026-05-25T11:48:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 3 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    renderPage()

    const continueSection = screen.getByRole('heading', { name: /^continue work$/i })
      .closest('section')
    const lockedCard = within(continueSection)
      .getByText('Review Locked Instances')
      .closest('li')
    const pendingCard = within(continueSection)
      .getByText('Resolve Pending Validation')
      .closest('li')
    const atRiskCard = within(continueSection)
      .getByText('Review At-Risk Instances')
      .closest('li')

    expect(within(lockedCard).getByText('1 instance locked')).toBeInTheDocument()
    expect(within(lockedCard).getByText('Latest: Locked Runtime')).toBeInTheDocument()
    expect(within(lockedCard).getByText('Locked').closest('.badge')).toHaveClass('badge--warning')

    expect(within(pendingCard).getByText('1 instance needs attention')).toBeInTheDocument()
    expect(within(pendingCard).getByText('Latest: Pending Validation Runtime')).toBeInTheDocument()
    expect(within(pendingCard).getByText('Pending').closest('.badge')).toHaveClass('badge--info')

    expect(within(atRiskCard).getByText('1 instance needs attention')).toBeInTheDocument()
    expect(within(atRiskCard).getByText('Latest: At Risk Runtime')).toBeInTheDocument()
    expect(within(atRiskCard).getByText('Blocked').closest('.badge')).toHaveClass('badge--danger')
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
      screen.getByLabelText(/state/i, { selector: 'select#vmf-status-filter' }),
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
    expect(
      within(screen.getByRole('table', { name: /value narrative work register/i }))
        .getByText('Disabled Bridge VMF'),
    ).toBeInTheDocument()
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

    expect(
      within(screen.getByRole('table', { name: /value narrative work register/i }))
        .getByText('Page 1 Value Narrative'),
    ).toBeInTheDocument()
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
    expect(
      within(screen.getByRole('table', { name: /value narrative work register/i }))
        .getByText('Page 2 Value Narrative'),
    ).toBeInTheDocument()
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
      screen.getByLabelText(/state/i, { selector: 'select#vmf-status-filter' }),
      'ARCHIVED',
    )
    await user.click(screen.getByRole('button', { name: /^create new instance$/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/search/i)).toHaveValue('Legacy')
    expect(
      screen.getByLabelText(/state/i, { selector: 'select#vmf-status-filter' }),
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
        screen.getByLabelText(/state/i, { selector: 'select#vmf-status-filter' }),
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
    expect(screen.getByText('Access')).toBeInTheDocument()
    expect(screen.getByText('Review only')).toBeInTheDocument()
    expect(
      within(screen.getByRole('table', { name: /value narrative work register/i }))
        .getByText('Viewer VMF'),
    ).toBeInTheDocument()
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
    expect(
      within(screen.getByRole('table', { name: /value narrative work register/i }))
        .getByText('Published Bridge VMF'),
    ).toBeInTheDocument()
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

    expect(
      within(screen.getByRole('table', { name: /value narrative work register/i }))
        .getByText('Package-backed VMF'),
    ).toBeInTheDocument()
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

    expect(screen.getByText('Register guide')).toBeInTheDocument()
    expect(screen.getByText('Runtime objects + bridge records')).toBeInTheDocument()
    expect(screen.getByText('State + package lineage')).toBeInTheDocument()
    expect(screen.getByText('Lifecycle-gated bridge edits')).toBeInTheDocument()

    const table = screen.getByRole('table', { name: /value narrative work register/i })

    expect(within(table).getByRole('columnheader', { name: /^instance$/i })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: /^package$/i })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: /^version$/i })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: /^state$/i })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: /^lifecycle$/i })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: /^health$/i })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: /^action$/i })).toBeInTheDocument()
    expect(within(table).queryByRole('columnheader', { name: /^stage \/ health$/i })).not.toBeInTheDocument()
    expect(within(table).queryByRole('columnheader', { name: /^completion$/i })).not.toBeInTheDocument()
    expect(within(table).getAllByText('CANONISED').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('PUBLISHED').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('2.2').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('2.0').length).toBeGreaterThan(0)

    const activeDetailsToggle = within(table).getByRole('button', {
      name: /show more information for active vmf/i,
    })
    expect(activeDetailsToggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(activeDetailsToggle)

    expect(activeDetailsToggle).toHaveAttribute('aria-expanded', 'true')
    const completionValue = within(table).getAllByText('NOT_TRACKED')[0]
    expect(completionValue.closest('.badge')).toHaveClass('badge--info')
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

  it('locks the primary Continue Work card visual hierarchy contract', () => {
    const baseCard = getCssDeclarations('.maintain-vmfs__continue-card')
    const primaryCard = getCssDeclarations('.maintain-vmfs__continue-card--primary')
    const primaryIcon = getCssDeclarations('.maintain-vmfs__continue-card--primary .maintain-vmfs__continue-icon')
    const primaryHead = getCssDeclarations('.maintain-vmfs__continue-card--primary .maintain-vmfs__continue-head')
    const primaryCopy = getCssDeclarations('.maintain-vmfs__continue-card--primary .maintain-vmfs__continue-copy')
    const primaryTitle = getCssDeclarations('.maintain-vmfs__continue-card--primary .maintain-vmfs__continue-title')
    const primaryBadge = getCssDeclarations('.maintain-vmfs__continue-card--primary .maintain-vmfs__continue-status .badge')
    const primaryStatus = getCssDeclarations('.maintain-vmfs__continue-card--primary .maintain-vmfs__continue-status .status')
    const primaryStatusText = getCssDeclarations('.maintain-vmfs__continue-card--primary .maintain-vmfs__continue-status .status__text')
    const primaryActions = getCssDeclarations('.maintain-vmfs__continue-card--primary .maintain-vmfs__continue-actions')
    const primaryCta = getCssDeclarations('.maintain-vmfs__continue-actions .btn')

    expect(baseCard).toEqual(expect.objectContaining({
      '--maintain-vmfs-continue-icon-size': 'var(--spacing-xl)',
      'grid-template-columns': 'minmax(0, 1fr) auto',
      'grid-template-rows': 'auto minmax(0, 1fr)',
      'min-height': '8.25rem',
      padding: 'var(--spacing-md)',
      border: 'var(--border-width-thin) solid var(--color-card-border)',
    }))
    expect(primaryCard).toEqual(expect.objectContaining({
      '--maintain-vmfs-continue-icon-size': 'var(--spacing-2xl)',
      'grid-template-columns': 'minmax(0, 1fr) auto',
      'grid-template-rows': 'auto auto',
      'align-content': 'center',
      'align-items': 'center',
      gap: 'var(--spacing-sm) var(--spacing-md)',
      'min-height': '8.25rem',
      padding: 'var(--spacing-lg)',
      'border-color': 'color-mix(in srgb, var(--color-action-primary) 58%, var(--color-card-border))',
      background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-action-primary) 9%, transparent), transparent 48%), var(--color-background)',
    }))
    expect(primaryIcon).toEqual(expect.objectContaining({
      'border-radius': 'var(--border-radius-md)',
      'background-color': 'color-mix(in srgb, var(--color-action-primary) 14%, transparent)',
      'font-size': 'var(--font-size-lg)',
    }))
    expect(primaryHead).toEqual(expect.objectContaining({
      'align-items': 'center',
      gap: 'var(--spacing-md)',
    }))
    expect(primaryCopy).toEqual(expect.objectContaining({
      'grid-column': '1',
      'grid-row': '2',
      'padding-inline-start': 'calc(var(--maintain-vmfs-continue-icon-size) + var(--spacing-md))',
      'padding-inline-end': 'var(--spacing-md)',
      'border-inline-start': '0',
    }))
    expect(primaryTitle).toEqual(expect.objectContaining({
      'font-size': 'var(--font-size-lg)',
      'font-weight': 'var(--font-weight-bold)',
      'line-height': '1.05',
      'text-wrap': 'balance',
    }))
    expect(primaryBadge).toEqual(expect.objectContaining({
      'font-size': '0.6875rem',
      'line-height': '1.05',
    }))
    expect(primaryStatus).toEqual(expect.objectContaining({
      'font-size': '0.6875rem',
      'line-height': '1.05',
    }))
    expect(primaryStatusText).toEqual(expect.objectContaining({
      'font-size': '0.6875rem',
      'line-height': '1.05',
    }))
    expect(primaryActions).toEqual(expect.objectContaining({
      'grid-column': '2',
      'grid-row': '1 / span 2',
      gap: 'var(--spacing-md)',
    }))
    expect(primaryCta).toEqual(expect.objectContaining({
      'min-width': '6.25rem',
      'min-height': 'calc(var(--spacing-md) * 2.15)',
      'padding-inline': 'var(--spacing-md)',
      'font-size': 'var(--font-size-sm)',
    }))
  })

  it('locks the register guide treatment below the filter toolbar', () => {
    const registerMeta = getCssDeclarations('.maintain-vmfs__register-meta')
    const registerGuide = getCssDeclarations('.maintain-vmfs__register-guide')
    const guideTitle = getCssDeclarations('.maintain-vmfs__register-guide-title')
    const guideList = getCssDeclarations('.maintain-vmfs__register-guide-list')
    const guideItem = getCssDeclarations('.maintain-vmfs__register-guide-item')
    const mobileRegisterMeta = getCssDeclarations('.maintain-vmfs__register-meta', {
      after: '@media (max-width: 1024px)',
    })
    const mobileRegisterCounts = getCssDeclarations('.maintain-vmfs__register-counts', {
      after: '@media (max-width: 1024px)',
    })

    expect(registerMeta).toEqual(expect.objectContaining({
      display: 'grid',
      'grid-template-columns': 'minmax(0, 1fr) auto',
      'align-items': 'center',
      gap: 'var(--spacing-md)',
      'margin-block-start': 'var(--spacing-lg)',
      'padding-block-start': 'var(--spacing-md)',
      'border-block-start': 'var(--border-width-thin) solid color-mix(in srgb, var(--color-card-border) 72%, transparent)',
    }))
    expect(registerGuide).toEqual(expect.objectContaining({
      display: 'grid',
      'grid-template-columns': 'minmax(0, 1fr)',
      'align-items': 'center',
      'min-width': '0',
    }))
    expect(guideTitle).toEqual(expect.objectContaining({
      margin: '0',
      color: 'var(--color-text-primary)',
      'font-size': '0.6875rem',
      'font-weight': 'var(--font-weight-bold)',
      'line-height': '1',
      'text-transform': 'uppercase',
    }))
    expect(guideList).toEqual(expect.objectContaining({
      display: 'flex',
      'align-items': 'center',
      'flex-wrap': 'wrap',
      gap: 'var(--spacing-xs) var(--spacing-sm)',
      margin: '0',
      padding: '0',
      'list-style': 'none',
    }))
    expect(guideItem).toEqual(expect.objectContaining({
      display: 'inline-flex',
      'align-items': 'center',
      gap: 'var(--spacing-2xs)',
      'font-size': 'var(--font-size-xs)',
      'line-height': 'var(--line-height-tight)',
    }))
    expect(mobileRegisterMeta).toEqual(expect.objectContaining({
      'grid-template-columns': '1fr',
    }))
    expect(mobileRegisterCounts).toEqual(expect.objectContaining({
      'justify-content': 'flex-start',
    }))
  })

  it('locks the secondary Continue Work card compact hierarchy contract', () => {
    const secondaryCard = getCssDeclarations('.maintain-vmfs__continue-card--secondary')
    const secondaryIcon = getCssDeclarations('.maintain-vmfs__continue-card--secondary .maintain-vmfs__continue-icon')
    const warningIcon = getCssDeclarations('.maintain-vmfs__continue-card--warning .maintain-vmfs__continue-icon')
    const secondaryHead = getCssDeclarations('.maintain-vmfs__continue-card--secondary .maintain-vmfs__continue-head')
    const secondaryHeading = getCssDeclarations('.maintain-vmfs__continue-card--secondary .maintain-vmfs__continue-heading')
    const secondaryCopy = getCssDeclarations('.maintain-vmfs__continue-card--secondary .maintain-vmfs__continue-copy')
    const secondaryTitle = getCssDeclarations('.maintain-vmfs__continue-card--secondary .maintain-vmfs__continue-title')
    const secondaryCopyText = getCssDeclarations('.maintain-vmfs__continue-card--secondary .maintain-vmfs__continue-copy p')
    const secondaryInsight = getCssDeclarations('.maintain-vmfs__continue-insight')
    const secondaryDetail = getCssDeclarations('.maintain-vmfs__continue-card--secondary .maintain-vmfs__continue-detail')
    const secondaryPill = getCssDeclarations('.maintain-vmfs__continue-pill.badge')

    expect(secondaryCard).toEqual(expect.objectContaining({
      '--maintain-vmfs-continue-icon-size': 'var(--spacing-xl)',
      'grid-template-rows': 'auto auto',
      'align-content': 'start',
      gap: 'var(--spacing-sm)',
      'min-height': '8.25rem',
      padding: 'var(--spacing-lg)',
    }))
    expect(secondaryIcon).toEqual(expect.objectContaining({
      'margin-block-start': '0',
      'border-color': 'color-mix(in srgb, var(--color-action-primary) 18%, transparent)',
      'border-radius': 'var(--border-radius-md)',
      'background-color': 'color-mix(in srgb, var(--color-action-primary) 10%, transparent)',
      'font-size': 'var(--font-size-lg)',
    }))
    expect(warningIcon).toEqual(expect.objectContaining({
      'border-color': 'color-mix(in srgb, var(--color-warning) 18%, transparent)',
    }))
    expect(secondaryHead).toEqual(expect.objectContaining({
      'grid-template-columns': 'auto minmax(0, 1fr)',
      'align-items': 'start',
      gap: 'var(--spacing-sm)',
    }))
    expect(secondaryHeading).toEqual(expect.objectContaining({
      gap: 'var(--spacing-xs)',
    }))
    expect(secondaryCopy).toEqual(expect.objectContaining({
      gap: 'var(--spacing-sm)',
      'margin-block-start': '0',
      'padding-inline-start': 'calc(var(--maintain-vmfs-continue-icon-size) + var(--spacing-sm))',
      'padding-inline-end': '0',
    }))
    expect(secondaryTitle).toEqual(expect.objectContaining({
      'font-size': 'var(--font-size-base)',
      'line-height': '1.16',
      'text-wrap': 'balance',
    }))
    expect(secondaryCopyText).toEqual(expect.objectContaining({
      'font-size': 'var(--font-size-xs)',
      'line-height': '1.18',
      'text-wrap': 'pretty',
    }))
    expect(secondaryInsight).toEqual(expect.objectContaining({
      display: 'flex',
      'align-items': 'center',
      gap: 'var(--spacing-xs)',
      'flex-wrap': 'wrap',
      'min-width': '0',
    }))
    expect(secondaryDetail).toEqual(expect.objectContaining({
      color: 'color-mix(in srgb, var(--color-text-secondary) 70%, var(--color-text-primary))',
      'font-weight': 'var(--font-weight-semibold)',
    }))
    expect(secondaryPill).toEqual(expect.objectContaining({
      'max-width': '100%',
      'min-height': '1.0625rem',
      'padding-inline': 'var(--spacing-2xs)',
      'font-size': 'var(--font-size-xs)',
      'line-height': '1',
    }))
  })

  it('locks the Continue Work responsive grid contract for a wide primary card', () => {
    const desktopActionsGrid = getCssDeclarations('.maintain-vmfs__continue-grid', {
      after: '@media (min-width: 768px)',
    })
    const tabletActionsGrid = getCssDeclarations('.maintain-vmfs__continue-grid', {
      after: '@media (min-width: 768px) and (max-width: 1023px)',
    })
    const tabletPrimaryCard = getCssDeclarations('.maintain-vmfs__continue-card--primary', {
      after: '@media (min-width: 768px) and (max-width: 1023px)',
    })
    const mobilePrimaryCard = getCssDeclarations('.maintain-vmfs__continue-card--primary', {
      after: '@media (max-width: 768px)',
    })
    const mobilePrimaryActions = getCssDeclarations('.maintain-vmfs__continue-actions', {
      after: '@media (max-width: 768px)',
    })

    expect(desktopActionsGrid).toEqual(expect.objectContaining({
      'grid-template-columns': 'minmax(0, 2fr) repeat(3, minmax(12rem, 1fr))',
    }))
    expect(tabletActionsGrid).toEqual(expect.objectContaining({
      'grid-template-columns': 'repeat(2, minmax(0, 1fr))',
    }))
    expect(tabletPrimaryCard).toEqual(expect.objectContaining({
      'grid-column': '1 / -1',
    }))
    expect(mobilePrimaryCard).toEqual(expect.objectContaining({
      'grid-template-columns': 'minmax(0, 1fr)',
      'grid-template-rows': 'auto auto auto',
    }))
    expect(mobilePrimaryActions).toEqual(expect.objectContaining({
      'grid-column': '1 / -1',
      'grid-row': '3',
      'justify-content': 'space-between',
      width: '100%',
    }))
  })
})
