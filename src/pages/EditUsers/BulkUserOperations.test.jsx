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
    selectedCustomerTopology: 'MULTI_TENANT',
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
  HTMLElement.prototype.scrollIntoView = vi.fn()
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

  it('supports a locked bulk-create entry mode', () => {
    renderDialog({
      initialOperation: 'create',
      availableOperations: ['create'],
    })

    expect(
      screen.getByRole('heading', { name: /^bulk create users$/i }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/operation/i)).not.toBeInTheDocument()
    expect(screen.getByText(/^Bulk Create$/, { selector: 'strong' })).toBeInTheDocument()
  })

  it('supports a locked bulk-update entry mode for selected users', () => {
    renderDialog({
      initialOperation: 'update',
      availableOperations: ['update'],
      selectedUserIds: ['user-1', 'user-2'],
    })

    expect(
      screen.getByRole('heading', { name: /^bulk update users$/i }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/operation/i)).not.toBeInTheDocument()
    expect(
      screen.getByText((_, element) => element?.textContent === 'Selected users: 2'),
    ).toBeInTheDocument()
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

    expect(screen.getByText(/role access/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^user$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tenant admin/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tenant visibility change/i)).toBeInTheDocument()
    expect(
      screen.getByText(/supported bulk roles: tenant_admin, user\./i),
    ).toBeInTheDocument()
  })

  it('limits bulk-update role guidance to USER for single-tenant customers', async () => {
    const user = userEvent.setup()
    mockUseTenantContext.mockReturnValue(
      getTenantContextMockValue({
        tenants: [],
        selectableTenants: [],
        selectedCustomerTopology: 'SINGLE_TENANT',
        tenantVisibilityMeta: {
          mode: 'NONE',
          allowed: false,
          topology: 'SINGLE_TENANT',
          isServiceProvider: false,
          selectableStatuses: [],
        },
      }),
    )

    renderDialog({ selectedUserIds: ['user-1'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'update')

    expect(screen.getByText(/supported bulk roles: user\./i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^user$/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/tenant admin/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/supported bulk roles: tenant_admin, user\./i)).not.toBeInTheDocument()
  })

  it('limits bulk-update role guidance to USER when customer topology is unresolved', async () => {
    const user = userEvent.setup()
    mockUseTenantContext.mockReturnValue(
      getTenantContextMockValue({
        tenants: [],
        selectableTenants: [],
        selectedCustomerTopology: '',
        tenantVisibilityMeta: null,
      }),
    )

    renderDialog({ selectedUserIds: ['user-1'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'update')

    expect(screen.getByText(/supported bulk roles: user\./i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^user$/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/tenant admin/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/supported bulk roles: tenant_admin, user\./i)).not.toBeInTheDocument()
  })

  it('removes tenant-visibility create guidance for single-tenant customers', async () => {
    const user = userEvent.setup()
    mockUseTenantContext.mockReturnValue(
      getTenantContextMockValue({
        tenants: [],
        selectableTenants: [],
        selectedCustomerTopology: 'SINGLE_TENANT',
        tenantVisibilityMeta: {
          mode: 'NONE',
          allowed: false,
          topology: 'SINGLE_TENANT',
          isServiceProvider: false,
          selectableStatuses: [],
        },
      }),
    )

    renderDialog()

    expect(screen.getAllByText(/supported bulk roles: user\./i).length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByText(/include headers for name, email, and roles\. supported bulk roles: user\./i),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/optional tenantvisibility/i),
    ).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/input mode/i), 'manual')

    expect(
      screen.getByText(/one row per line: name,email,roles\. supported bulk roles: user\./i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/roles\/tenants separated by \|/i)).not.toBeInTheDocument()
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

  it('shows current tenant references for multi-tenant bulk create', () => {
    renderDialog()

    expect(screen.getByText(/current tenant references/i)).toBeInTheDocument()
    expect(screen.getByText('North Hub')).toBeInTheDocument()
    expect(screen.getByText('ten-1')).toBeInTheDocument()
    expect(screen.getByText('South Hub')).toBeInTheDocument()
    expect(screen.getByText('ten-2')).toBeInTheDocument()
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
      'Jane Doe,jane@example.com,USER|TENANT_ADMIN,North Hub',
    )
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))

    expect(screen.getByText(/preview \(1\)/i)).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('uses example rows and switches to manual entry mode', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: /use example rows/i }))

    expect(screen.getByLabelText(/input mode/i)).toHaveValue('manual')
    expect(screen.getByLabelText(/manual rows/i).value).toContain(
      'Avery North,avery.north@example.com',
    )
    expect(screen.getByLabelText(/manual rows/i).value).toContain(
      'Taylor Tenant,taylor.tenant@example.com,TENANT_ADMIN',
    )
    expect(screen.getByLabelText(/manual rows/i).value).not.toContain('tenantVisibility')
    expect(screen.getByLabelText(/manual rows/i).value).not.toContain('ten-1')
  })

  it('uses single-tenant example rows without tenant visibility values', async () => {
    const user = userEvent.setup()
    mockUseTenantContext.mockReturnValue(
      getTenantContextMockValue({
        tenants: [],
        selectableTenants: [],
        selectedCustomerTopology: 'SINGLE_TENANT',
        tenantVisibilityMeta: {
          mode: 'NONE',
          allowed: false,
          topology: 'SINGLE_TENANT',
          isServiceProvider: false,
          selectableStatuses: [],
        },
      }),
    )

    renderDialog()

    await user.click(screen.getByRole('button', { name: /use example rows/i }))

    expect(screen.getByLabelText(/manual rows/i)).toHaveValue(
      'Avery North,avery.north@example.com,USER\nTaylor Reed,taylor.reed@example.com,USER',
    )
  })

  it('downloads an example CSV from create mode', async () => {
    const user = userEvent.setup()
    const originalCreateObjectUrl = URL.createObjectURL
    const originalRevokeObjectUrl = URL.revokeObjectURL
    const createObjectUrlMock = vi.fn(() => 'blob:example')
    const revokeObjectUrlMock = vi.fn()
    const clickMock = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    URL.createObjectURL = createObjectUrlMock
    URL.revokeObjectURL = revokeObjectUrlMock

    renderDialog()

    await user.click(screen.getByRole('button', { name: /download example csv/i }))

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:example')
    expect(clickMock).toHaveBeenCalledTimes(1)

    const generatedBlob = createObjectUrlMock.mock.calls[0][0]
    expect(generatedBlob).toBeInstanceOf(Blob)
    expect(generatedBlob.type).toContain('text/csv')

    clickMock.mockRestore()
    URL.createObjectURL = originalCreateObjectUrl
    URL.revokeObjectURL = originalRevokeObjectUrl
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
      'Jane Doe,jane@example.com,USER|TENANT_ADMIN,North Hub|South Hub',
    )
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))
    await user.click(screen.getByRole('button', { name: /process batch/i }))

    await waitFor(() => {
      expect(bulkCreateMock).toHaveBeenCalledTimes(1)
      expect(bulkCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-1',
          body: {
            sendInvitations: true,
            users: [
              {
                name: 'Jane Doe',
                email: 'jane@example.com',
                roles: ['USER', 'TENANT_ADMIN'],
                tenantVisibility: ['ten-1', 'ten-2'],
              },
            ],
          },
        }),
      )
    })
  })

  it('blocks bulk create preview when tenant visibility values do not match current tenant references', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.selectOptions(
      screen.getByLabelText(/input mode/i),
      'manual',
    )
    await user.type(
      screen.getByLabelText(/manual rows/i),
      'Jane Doe,jane@example.com,USER,tenant-1|tenant-2',
    )
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      /tenant visibility values must use current tenant ids or exact tenant names from this customer/i,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/row 1: tenant-1, tenant-2/i)
    expect(screen.queryByText(/preview \(1\)/i)).not.toBeInTheDocument()
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
      'Jane Doe,jane@example.com,CUSTOMER_ADMIN,North Hub',
    )
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      /bulk operations cannot assign or remove customer admin ownership/i,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/transfer ownership/i)
    expect(screen.queryByText(/preview \(1\)/i)).not.toBeInTheDocument()
  })

  it('clears the bulk-create form and closes after a fully successful create', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    bulkCreateMock.mockReturnValue({
      unwrap: async () => ({
        summary: { total: 1, success: 1, failed: 0 },
        results: [{ email: 'jane@example.com', success: true }],
      }),
    })

    renderDialog({ onClose })

    await user.selectOptions(screen.getByLabelText(/input mode/i), 'manual')
    await user.type(
      screen.getByLabelText(/manual rows/i),
      'Jane,jane@example.com,USER,',
    )
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))
    await user.click(screen.getByRole('button', { name: /process batch/i }))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByLabelText(/input mode/i)).toHaveValue('csv')
    expect(screen.getByLabelText(/csv content/i)).toHaveValue('')
    expect(screen.queryByText(/preview \(1\)/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /batch results/i })).not.toBeInTheDocument()
  })

  it('resolves CSV tenant visibility values to canonical tenant ids before submit', async () => {
    const user = userEvent.setup()
    bulkCreateMock.mockReturnValue({
      unwrap: async () => ({
        summary: { total: 1, success: 1, failed: 0 },
        results: [{ email: 'jane@example.com', success: true }],
      }),
    })

    renderDialog()

    await user.type(
      screen.getByLabelText(/csv content/i),
      'name,email,roles,tenantVisibility{enter}Jane Doe,jane@example.com,USER,South Hub',
    )
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))
    await user.click(screen.getByRole('button', { name: /process batch/i }))

    await waitFor(() => {
      expect(bulkCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-1',
          body: {
            sendInvitations: true,
            users: [
              {
                name: 'Jane Doe',
                email: 'jane@example.com',
                roles: ['USER'],
                tenantVisibility: ['ten-2'],
              },
            ],
          },
        }),
      )
    })
  })

  it('reveals the preview section after validation', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.selectOptions(screen.getByLabelText(/input mode/i), 'manual')
    await user.type(
      screen.getByLabelText(/manual rows/i),
      'Jane Doe,jane@example.com,USER|TENANT_ADMIN,North Hub',
    )
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))

    await waitFor(() => {
      expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    })
    expect(
      screen.getByText(/preview is ready\. review the first 1 row below, then process the batch\./i),
    ).toBeInTheDocument()
  })

  it('uses create completion messaging that distinguishes partial success from failure', async () => {
    const user = userEvent.setup()
    bulkCreateMock.mockReturnValue({
      unwrap: async () => ({
        summary: { total: 2, success: 1, failed: 1 },
        results: [
          { email: 'avery.north@example.com', success: true },
          { email: 'taylor.tenant@example.com', success: false, error: 'Duplicate email' },
        ],
      }),
    })

    renderDialog()

    await user.click(screen.getByRole('button', { name: /use example rows/i }))
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))
    await user.click(screen.getByRole('button', { name: /process batch/i }))

    await waitFor(() => {
      expect(screen.getByText(/bulk create completed with issues/i)).toBeInTheDocument()
    })
    expect(
      screen.getByText(/1 succeeded and 1 failed\. review batch results below before retrying the failed rows\./i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/1 rows were created, and 1 need attention before retrying\./i),
    ).toBeInTheDocument()
  })

  it('reconciles impossible bulk-create summary counts with deterministic row results', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    bulkCreateMock.mockReturnValue({
      unwrap: async () => ({
        summary: { total: 2, success: 2, failed: 1 },
        results: [
          { email: 'avery.north@example.com', success: true },
          { email: 'tiny.bloggs@example.com', success: true },
        ],
      }),
    })

    renderDialog({ onClose })

    await user.selectOptions(screen.getByLabelText(/input mode/i), 'manual')
    await user.type(
      screen.getByLabelText(/manual rows/i),
      'Avery North,avery.north@example.com,USER{enter}Tiny Bloggs,tiny.bloggs@example.com,USER',
    )
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))
    await user.click(screen.getByRole('button', { name: /process batch/i }))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByLabelText(/input mode/i)).toHaveValue('csv')
    expect(screen.getByLabelText(/csv content/i)).toHaveValue('')
    expect(screen.queryByRole('heading', { name: /batch results/i })).not.toBeInTheDocument()
  })

  it('treats result rows with an error message as failed even when success is omitted', async () => {
    const user = userEvent.setup()
    bulkCreateMock.mockReturnValue({
      unwrap: async () => ({
        summary: { total: 2, success: 1, failed: 1 },
        results: [
          { email: 'avery.north@example.com', success: true },
          { email: 'tiny.bloggs@example.com', error: 'Duplicate email' },
        ],
      }),
    })

    renderDialog()

    await user.selectOptions(screen.getByLabelText(/input mode/i), 'manual')
    await user.type(
      screen.getByLabelText(/manual rows/i),
      'Avery North,avery.north@example.com,USER{enter}Tiny Bloggs,tiny.bloggs@example.com,USER',
    )
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))
    await user.click(screen.getByRole('button', { name: /process batch/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /batch results/i })).toBeInTheDocument()
    })
    expect(screen.getByText(/success: 1/i)).toBeInTheDocument()
    expect(screen.getByText(/failed: 1/i)).toBeInTheDocument()
    const failedRow = screen.getByText('tiny.bloggs@example.com', {
      selector: '.bulk-users__result-target',
    }).closest('.bulk-users__result-row')
    expect(failedRow).toHaveTextContent('Duplicate email')
    expect(failedRow).not.toHaveTextContent('Success')
  })

  it('closes successfully when zero failed counts are returned even if result rows omit success flags', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    bulkCreateMock.mockReturnValue({
      unwrap: async () => ({
        summary: { total: 1, success: 1, failed: 0 },
        results: [{ email: 'jane@example.com', userId: 'user-1' }],
      }),
    })

    renderDialog({ onClose })

    await user.selectOptions(screen.getByLabelText(/input mode/i), 'manual')
    await user.type(
      screen.getByLabelText(/manual rows/i),
      'Jane,jane@example.com,USER',
    )
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))
    await user.click(screen.getByRole('button', { name: /process batch/i }))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByLabelText(/input mode/i)).toHaveValue('csv')
    expect(screen.getByLabelText(/csv content/i)).toHaveValue('')
    expect(screen.queryByRole('heading', { name: /batch results/i })).not.toBeInTheDocument()
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
    expect(screen.queryByText(/^csv file$/i)).not.toBeInTheDocument()
  })

  it('clears the selected CSV file when the dialog closes', async () => {
    const user = userEvent.setup()
    renderDialog()

    const csvFileInput = screen.getByLabelText(/csv file/i)
    const csvFile = new File(['name,email,roles'], 'bulk-users.csv', { type: 'text/csv' })
    Object.defineProperty(csvFile, 'text', {
      value: vi.fn().mockResolvedValue('name,email,roles'),
    })

    await user.upload(csvFileInput, csvFile)

    expect(csvFileInput).toHaveValue('C:\\fakepath\\bulk-users.csv')

    const closeButtons = screen.getAllByRole('button', { name: /close/i })
    await user.click(closeButtons[closeButtons.length - 1])

    expect(csvFileInput).toHaveValue('')
    expect(screen.getByLabelText(/csv content/i)).toHaveValue('')
  })

  it('applies browser-autofill suppression to bulk-create text inputs and textareas', async () => {
    const user = userEvent.setup()
    renderDialog()

    const csvFileInput = screen.getByLabelText(/csv file/i)
    const csvContentTextarea = screen.getByLabelText(/csv content/i)

    expect(csvFileInput).toHaveAttribute('autocomplete', 'off')
    expect(csvFileInput).toHaveAttribute('autocorrect', 'off')
    expect(csvFileInput).toHaveAttribute('autocapitalize', 'none')
    expect(csvFileInput).toHaveAttribute('name', 'bulk-create-csv-file')
    expect(csvFileInput).toHaveClass('input--file')
    expect(csvContentTextarea).toHaveAttribute('autocomplete', 'off')
    expect(csvContentTextarea).toHaveAttribute('autocorrect', 'off')
    expect(csvContentTextarea).toHaveAttribute('autocapitalize', 'none')
    expect(csvContentTextarea).toHaveAttribute('name', 'bulk-create-csv-content')
    expect(csvContentTextarea).not.toHaveAttribute('spellcheck', 'true')

    await user.selectOptions(screen.getByLabelText(/input mode/i), 'manual')

    const manualRowsTextarea = screen.getByLabelText(/manual rows/i)
    expect(manualRowsTextarea).toHaveAttribute('autocomplete', 'off')
    expect(manualRowsTextarea).toHaveAttribute('autocorrect', 'off')
    expect(manualRowsTextarea).toHaveAttribute('autocapitalize', 'none')
    expect(manualRowsTextarea).toHaveAttribute('name', 'bulk-create-manual-rows')
    expect(manualRowsTextarea).not.toHaveAttribute('spellcheck', 'true')
  })

  it('applies browser-autofill suppression to CSV mapping controls', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(
      screen.getByLabelText(/csv content/i),
      'name,email,roles{enter}Jane Doe,jane@example.com,USER',
    )
    await user.click(screen.getByRole('button', { name: /validate & preview/i }))

    expect(screen.getByLabelText(/name column/i)).toHaveAttribute('autocomplete', 'off')
    expect(screen.getByLabelText(/name column/i)).toHaveAttribute('name', 'bulk-create-map-name-column')
    expect(screen.getByLabelText(/email column/i)).toHaveAttribute('autocomplete', 'off')
    expect(screen.getByLabelText(/email column/i)).toHaveAttribute('name', 'bulk-create-map-email-column')
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
    await user.click(screen.getByLabelText(/tenant admin/i))
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

  it('does not offer CUSTOMER_ADMIN in bulk update role selection', async () => {
    const user = userEvent.setup()
    renderDialog({ selectedUserIds: ['u1'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'update')

    expect(screen.queryByRole('checkbox', { name: /customer admin/i })).not.toBeInTheDocument()
  })

  it('keeps update disabled until at least one change is selected', async () => {
    const user = userEvent.setup()
    renderDialog({ selectedUserIds: ['u1'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'update')

    expect(screen.getByRole('button', { name: /update selected users/i })).toBeDisabled()
    expect(
      screen.getByText(/choose at least one role or tenant visibility change before updating selected users\./i),
    ).toBeInTheDocument()
  })

  it('shows a replace-mode readiness hint until a tenant is selected', async () => {
    const user = userEvent.setup()
    renderDialog({ selectedUserIds: ['u1'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'update')
    await user.selectOptions(screen.getByLabelText(/tenant visibility change/i), 'replace')

    expect(
      screen.getByText(/select at least one tenant before replacing tenant visibility\./i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update selected users/i })).toBeDisabled()
  })

  it('hides TENANT_ADMIN in single-tenant bulk update and still allows USER updates', async () => {
    const user = userEvent.setup()
    mockUseTenantContext.mockReturnValue(
      getTenantContextMockValue({
        tenants: [],
        selectableTenants: [],
        selectedCustomerTopology: 'SINGLE_TENANT',
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
    await user.click(screen.getByLabelText(/^user$/i))
    await user.click(screen.getByRole('button', { name: /update selected/i }))

    await waitFor(() => {
      expect(bulkUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-1',
          body: {
            users: [
              {
                userId: 'u1',
                roles: ['USER'],
              },
            ],
          },
        }),
      )
    })
    expect(screen.queryByLabelText(/tenant admin/i)).not.toBeInTheDocument()
  })

  it('suppresses the tenant-visibility fallback hint for single-tenant customers', async () => {
    const user = userEvent.setup()
    mockUseTenantContext.mockReturnValue(
      getTenantContextMockValue({
        tenants: [],
        selectableTenants: [],
        selectedCustomerTopology: 'SINGLE_TENANT',
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

    expect(screen.queryByText(/tenant visibility is not required for this customer topology/i)).not.toBeInTheDocument()
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
