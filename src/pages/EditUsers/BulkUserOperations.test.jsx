import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToasterProvider } from '../../components/Toaster'
import BulkUserOperations from './BulkUserOperations'

const bulkCreateMock = vi.fn()
const bulkUpdateMock = vi.fn()
const bulkDisableMock = vi.fn()
const mockUseTenantContext = vi.fn()

vi.mock('../../store/api/userApi.js', () => ({
  useBulkCreateUsersMutation: () => [bulkCreateMock, { isLoading: false }],
  useBulkUpdateUsersMutation: () => [bulkUpdateMock, { isLoading: false }],
  useBulkDisableUsersMutation: () => [bulkDisableMock, { isLoading: false }],
}))

vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: (...args) => mockUseTenantContext(...args),
}))

function getTenantContextMockValue(overrides = {}) {
  return {
    customerId: 'cust-1',
    tenantId: null,
    tenantName: null,
    resolvedTenantName: null,
    tenants: [
      {
        id: 'ten-1',
        name: 'North Hub',
        status: 'ENABLED',
        isDefault: true,
        isSelectable: true,
        selectionState: 'AVAILABLE',
      },
      {
        id: 'ten-2',
        name: 'South Hub',
        status: 'ENABLED',
        isDefault: false,
        isSelectable: true,
        selectionState: 'AVAILABLE',
      },
      {
        id: 'ten-legacy',
        name: 'Legacy Hub',
        status: 'DISABLED',
        isDefault: false,
        isSelectable: false,
        selectionState: 'PRESERVED',
      },
    ],
    selectableTenants: [
      {
        id: 'ten-1',
        name: 'North Hub',
        status: 'ENABLED',
        isDefault: true,
        isSelectable: true,
        selectionState: 'AVAILABLE',
      },
      {
        id: 'ten-2',
        name: 'South Hub',
        status: 'ENABLED',
        isDefault: false,
        isSelectable: true,
        selectionState: 'AVAILABLE',
      },
    ],
    tenantVisibilityMeta: {
      mode: 'GUIDED',
      allowed: true,
      topology: 'MULTI_TENANT',
      isServiceProvider: true,
      selectableStatuses: ['ENABLED'],
    },
    isLoadingTenants: false,
    tenantsError: null,
    isSuperAdmin: false,
    accessibleCustomerIds: ['cust-1'],
    hasSelectedCustomerAccess: true,
    selectedTenant: null,
    isResolvingSelectedTenantContext: false,
    hasInvalidTenantContext: false,
    setCustomerId: vi.fn(),
    setTenantId: vi.fn(),
    clearContext: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  bulkCreateMock.mockReset()
  bulkUpdateMock.mockReset()
  bulkDisableMock.mockReset()
  mockUseTenantContext.mockReset()
  mockUseTenantContext.mockReturnValue(getTenantContextMockValue())

  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function () {
    this.open = false
  })
})

function renderDialog(props = {}) {
  return render(
    <ToasterProvider>
      <BulkUserOperations
        open
        onClose={vi.fn()}
        customerId="cust-1"
        selectedUserIds={[]}
        {...props}
      />
    </ToasterProvider>,
  )
}

describe('BulkUserOperations', () => {
  // ---- Rendering ----

  it('renders dialog heading', () => {
    renderDialog()
    expect(
      screen.getByRole('heading', { name: /bulk operations/i }),
    ).toBeInTheDocument()
  })

  it('renders the Operation select with default "Bulk Create"', () => {
    renderDialog()
    const select = screen.getByLabelText(/operation/i)
    expect(select).toBeInTheDocument()
    expect(select.value).toBe('create')
  })

  it('renders Close button in footer', () => {
    renderDialog()
    const closeButtons = screen.getAllByRole('button', { name: /close/i })
    // Dialog header X + footer Close
    expect(closeButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('renders subtitle with batch limit', () => {
    renderDialog()
    expect(screen.getByText(/maximum 100 users/i)).toBeInTheDocument()
  })

  // ---- Operation switching ----

  it('shows input mode select when operation is create', () => {
    renderDialog()
    expect(screen.getByLabelText(/input mode/i)).toBeInTheDocument()
    expect(
      screen.getByLabelText(/customer admin governance guidance/i),
    ).toBeInTheDocument()
  })

  it('shows roles and tenant visibility inputs when operation is update', async () => {
    const user = userEvent.setup()
    renderDialog({ selectedUserIds: ['user-1'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'update')

    expect(screen.getByLabelText(/roles/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tenant visibility change/i)).toBeInTheDocument()
    expect(
      screen.getByText(/supported bulk roles: tenant_admin, user\./i),
    ).toBeInTheDocument()
  })

  it('shows disable warning when operation is disable', async () => {
    const user = userEvent.setup()
    renderDialog({ selectedUserIds: ['user-1'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'disable')

    expect(
      screen.getByText(/immediately revokes access/i),
    ).toBeInTheDocument()
  })

  it('shows selected user count for update operation', async () => {
    const user = userEvent.setup()
    renderDialog({ selectedUserIds: ['user-1', 'user-2'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'update')

    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows guided tenant selection when bulk update uses replace mode', async () => {
    const user = userEvent.setup()
    renderDialog({ selectedUserIds: ['user-1'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'update')
    await user.selectOptions(screen.getByLabelText(/tenant visibility change/i), 'replace')

    expect(screen.getByText(/apply the same tenant visibility set to every selected user/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /select all available/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/north hub/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/south hub/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/tenant visibility ids/i)).not.toBeInTheDocument()
  })

  // ---- Bulk Create: Manual ----

  it('parses manual rows and shows preview', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.selectOptions(
      screen.getByLabelText(/input mode/i),
      'manual',
    )
    await user.type(
      screen.getByLabelText(/manual rows/i),
      'Jane Doe,jane@example.com,USER|TENANT_ADMIN,tenant-1',
    )
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))

    expect(screen.getByText(/preview \(1\)/i)).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('shows error for empty manual input', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.selectOptions(screen.getByLabelText(/input mode/i), 'manual')
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/at least one user/i)
  })

  it('runs bulk create with previewed users', async () => {
    const user = userEvent.setup()
    bulkCreateMock.mockReturnValue({
      unwrap: async () => ({
        summary: { total: 1, success: 1, failed: 0 },
        results: [{ email: 'jane@example.com', success: true }],
      }),
    })

    renderDialog()

    await user.selectOptions(
      screen.getByLabelText(/input mode/i),
      'manual',
    )
    await user.type(
      screen.getByLabelText(/manual rows/i),
      'Jane Doe,jane@example.com,USER|TENANT_ADMIN,tenant-1',
    )
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))
    await user.click(screen.getByRole('button', { name: /process batch/i }))

    await waitFor(() => {
      expect(bulkCreateMock).toHaveBeenCalledTimes(1)
    })
  })

  it('blocks bulk create preview when rows include CUSTOMER_ADMIN', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.selectOptions(
      screen.getByLabelText(/input mode/i),
      'manual',
    )
    await user.type(
      screen.getByLabelText(/manual rows/i),
      'Jane Doe,jane@example.com,CUSTOMER_ADMIN,tenant-1',
    )
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      /bulk operations cannot assign or remove customer admin ownership/i,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/transfer ownership/i)
    expect(screen.queryByText(/preview \(1\)/i)).not.toBeInTheDocument()
  })

  it('shows batch results after successful create', async () => {
    const user = userEvent.setup()
    bulkCreateMock.mockReturnValue({
      unwrap: async () => ({
        summary: { total: 1, success: 1, failed: 0 },
        results: [{ email: 'jane@example.com', success: true }],
      }),
    })

    renderDialog()

    await user.selectOptions(screen.getByLabelText(/input mode/i), 'manual')
    await user.type(
      screen.getByLabelText(/manual rows/i),
      'Jane,jane@example.com,USER,',
    )
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))
    await user.click(screen.getByRole('button', { name: /process batch/i }))

    await waitFor(() => {
      expect(screen.getByText(/batch results/i)).toBeInTheDocument()
    })
  })

  // ---- Bulk Create: CSV ----

  it('shows CSV content textarea when CSV mode is selected', () => {
    renderDialog()
    // CSV is the default source mode
    expect(screen.getByLabelText(/csv content/i)).toBeInTheDocument()
  })

  it('shows CSV file input', () => {
    renderDialog()
    expect(screen.getByLabelText(/csv file/i)).toBeInTheDocument()
  })

  // ---- Bulk Disable ----

  it('disables the Disable button when no users are selected', async () => {
    const user = userEvent.setup()
    renderDialog({ selectedUserIds: [] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'disable')

    const btn = screen.getByRole('button', { name: /disable selected/i })
    expect(btn).toBeDisabled()
  })

  it('calls bulkDisableUsers with selected IDs', async () => {
    const user = userEvent.setup()
    bulkDisableMock.mockReturnValue({
      unwrap: async () => ({
        summary: { total: 2, success: 2, failed: 0 },
        results: [
          { userId: 'u1', success: true },
          { userId: 'u2', success: true },
        ],
      }),
    })

    renderDialog({ selectedUserIds: ['u1', 'u2'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'disable')
    await user.click(screen.getByRole('button', { name: /disable selected/i }))

    await waitFor(() => {
      expect(bulkDisableMock).toHaveBeenCalledTimes(1)
      expect(bulkDisableMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-1',
          body: { userIds: ['u1', 'u2'] },
        }),
      )
    })
  })

  // ---- Bulk Update ----

  it('calls bulkUpdateUsers with supported roles', async () => {
    const user = userEvent.setup()
    bulkUpdateMock.mockReturnValue({
      unwrap: async () => ({
        summary: { total: 1, success: 1, failed: 0 },
        results: [{ userId: 'u1', success: true }],
      }),
    })

    renderDialog({ selectedUserIds: ['u1'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'update')
    await user.type(screen.getByLabelText(/roles/i), 'TENANT_ADMIN')
    await user.click(screen.getByRole('button', { name: /update selected/i }))

    await waitFor(() => {
      expect(bulkUpdateMock).toHaveBeenCalledTimes(1)
      expect(bulkUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-1',
          body: {
            users: [
              {
                userId: 'u1',
                roles: ['TENANT_ADMIN'],
              },
            ],
          },
        }),
      )
    })
  })

  it('calls bulkUpdateUsers with selected tenant visibility ids in replace mode', async () => {
    const user = userEvent.setup()
    bulkUpdateMock.mockReturnValue({
      unwrap: async () => ({
        summary: { total: 1, success: 1, failed: 0 },
        results: [{ userId: 'u1', success: true }],
      }),
    })

    renderDialog({ selectedUserIds: ['u1'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'update')
    await user.selectOptions(screen.getByLabelText(/tenant visibility change/i), 'replace')
    await user.click(screen.getByLabelText(/north hub/i))
    await user.click(screen.getByRole('button', { name: /update selected users/i }))

    await waitFor(() => {
      expect(bulkUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-1',
          body: {
            users: [
              {
                userId: 'u1',
                tenantVisibility: ['ten-1'],
              },
            ],
          },
        }),
      )
    })
  })

  it('calls bulkUpdateUsers with an empty tenant visibility array in clear mode', async () => {
    const user = userEvent.setup()
    bulkUpdateMock.mockReturnValue({
      unwrap: async () => ({
        summary: { total: 1, success: 1, failed: 0 },
        results: [{ userId: 'u1', success: true }],
      }),
    })

    renderDialog({ selectedUserIds: ['u1'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'update')
    await user.selectOptions(screen.getByLabelText(/tenant visibility change/i), 'clear')
    await user.click(screen.getByRole('button', { name: /update selected users/i }))

    await waitFor(() => {
      expect(bulkUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-1',
          body: {
            users: [
              {
                userId: 'u1',
                tenantVisibility: [],
              },
            ],
          },
        }),
      )
    })
  })

  it('blocks bulk update when roles include CUSTOMER_ADMIN', async () => {
    const user = userEvent.setup()
    renderDialog({ selectedUserIds: ['u1'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'update')
    await user.type(screen.getByLabelText(/roles/i), 'CUSTOMER_ADMIN')
    await user.click(screen.getByRole('button', { name: /update selected/i }))

    expect(bulkUpdateMock).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      /bulk operations cannot assign or remove customer admin ownership/i,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/transfer ownership/i)
  })

  it('shows not-required guidance when tenant visibility is not allowed for the topology', async () => {
    const user = userEvent.setup()
    mockUseTenantContext.mockReturnValue(
      getTenantContextMockValue({
        tenants: [],
        selectableTenants: [],
        tenantVisibilityMeta: {
          mode: 'NONE',
          allowed: false,
          topology: 'SINGLE_TENANT',
          isServiceProvider: false,
          selectableStatuses: [],
        },
      }),
    )

    renderDialog({ selectedUserIds: ['u1'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'update')

    expect(screen.getByText(/tenant visibility is not required for this customer topology/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/tenant visibility change/i)).not.toBeInTheDocument()
  })

  // ---- Close / reset ----

  it('calls onClose when footer Close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderDialog({ onClose })

    // The footer Close button has visible text "Close"; Dialog header has aria-label "Close dialog"
    const closeButtons = screen.getAllByRole('button', { name: /close/i })
    // Footer Close is the last one rendered
    await user.click(closeButtons[closeButtons.length - 1])

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
