import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToasterProvider } from '../../components/Toaster'
import BulkUserOperations from './BulkUserOperations'

const bulkCreateMock = vi.fn()
const bulkUpdateMock = vi.fn()
const bulkDisableMock = vi.fn()

vi.mock('../../store/api/userApi.js', () => ({
  useBulkCreateUsersMutation: () => [bulkCreateMock, { isLoading: false }],
  useBulkUpdateUsersMutation: () => [bulkUpdateMock, { isLoading: false }],
  useBulkDisableUsersMutation: () => [bulkDisableMock, { isLoading: false }],
}))

beforeEach(() => {
  bulkCreateMock.mockReset()
  bulkUpdateMock.mockReset()
  bulkDisableMock.mockReset()

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
  })

  it('shows roles and tenant visibility inputs when operation is update', async () => {
    const user = userEvent.setup()
    renderDialog({ selectedUserIds: ['user-1'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'update')

    expect(screen.getByLabelText(/roles/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tenant visibility/i)).toBeInTheDocument()
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

  it('calls bulkUpdateUsers with roles', async () => {
    const user = userEvent.setup()
    bulkUpdateMock.mockReturnValue({
      unwrap: async () => ({
        summary: { total: 1, success: 1, failed: 0 },
        results: [{ userId: 'u1', success: true }],
      }),
    })

    renderDialog({ selectedUserIds: ['u1'] })

    await user.selectOptions(screen.getByLabelText(/operation/i), 'update')
    await user.type(screen.getByLabelText(/roles/i), 'CUSTOMER_ADMIN')
    await user.click(screen.getByRole('button', { name: /update selected/i }))

    await waitFor(() => {
      expect(bulkUpdateMock).toHaveBeenCalledTimes(1)
    })
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
