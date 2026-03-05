import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import SuperAdminCustomers from './SuperAdminCustomers'

vi.mock('../../store/api/customerApi.js', () => ({
  useListCustomersQuery: vi.fn(),
  useCreateCustomerMutation: vi.fn(),
  useGetCustomerQuery: vi.fn(),
  useUpdateCustomerMutation: vi.fn(),
  useUpdateCustomerStatusMutation: vi.fn(),
  useCreateCustomerAdminInvitationMutation: vi.fn(),
  useReplaceCustomerAdminMutation: vi.fn(),
}))

vi.mock('../../store/api/licenseLevelApi.js', () => ({
  useListLicenseLevelsQuery: vi.fn(),
}))

vi.mock('../../store/api/invitationApi.js', () => ({
  useListInvitationsQuery: vi.fn(),
  useResendInvitationMutation: vi.fn(),
  useRevokeInvitationMutation: vi.fn(),
}))

vi.mock('../../components/StepUpAuthForm', () => ({
  StepUpAuthForm: ({ onStepUpComplete, passwordLabel, passwordHelperText }) => (
    <div>
      <div>StepUpAuthForm</div>
      <div data-testid="step-up-password-label">{passwordLabel}</div>
      <div data-testid="step-up-password-helper">{passwordHelperText}</div>
      <button type="button" onClick={() => onStepUpComplete?.('mock-step-up-token', 900)}>
        Mock Step-up Complete
      </button>
    </div>
  ),
}))

import {
  useListCustomersQuery,
  useCreateCustomerMutation,
  useGetCustomerQuery,
  useUpdateCustomerMutation,
  useUpdateCustomerStatusMutation,
  useCreateCustomerAdminInvitationMutation,
  useReplaceCustomerAdminMutation,
} from '../../store/api/customerApi.js'
import { useListLicenseLevelsQuery } from '../../store/api/licenseLevelApi.js'
import {
  useListInvitationsQuery,
  useResendInvitationMutation,
  useRevokeInvitationMutation,
} from '../../store/api/invitationApi.js'

function renderPage(initialEntry = '/super-admin/customers') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ToasterProvider>
        <SuperAdminCustomers />
      </ToasterProvider>
    </MemoryRouter>,
  )
}

describe('SuperAdminCustomers page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // JSDOM does not implement the native <dialog> API; polyfill so showModal/close
    // set/remove the `open` attribute and make dialog contents accessible in queries.
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
    useListCustomersQuery.mockReturnValue({
      data: { data: [], meta: { page: 1, totalPages: 1, total: 0 } },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useListLicenseLevelsQuery.mockReturnValue({
      data: { data: [{ id: 'lic-1', name: 'Enterprise' }] },
      isLoading: false,
    })
    useGetCustomerQuery.mockReturnValue({
      data: null,
      isFetching: false,
      error: null,
    })
    useCreateCustomerMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useUpdateCustomerMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useUpdateCustomerStatusMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useCreateCustomerAdminInvitationMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useReplaceCustomerAdminMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useListInvitationsQuery.mockReturnValue({
      data: { data: [], meta: { page: 1, totalPages: 1 } },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useResendInvitationMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useRevokeInvitationMutation.mockReturnValue([vi.fn(), { isLoading: false }])
  })

  it('renders customer admin workspace in list-first mode by default', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /customer admin/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /customers/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: /customer catalogue/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^create customer$/i })).not.toBeInTheDocument()
  })

  it('opens create customer dialog from the catalogue create button', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(screen.getByRole('heading', { name: /^create customer$/i })).toBeInTheDocument()
    expect(
      screen.getByLabelText(/customer name/i, { selector: 'input#sa-customer-name' }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(/vmf count/i, { selector: 'input#sa-customer-vmf-count' }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(/licence level/i, { selector: 'select#sa-customer-license' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/vmf policy/i)).not.toBeInTheDocument()
  })

  it('keeps create dialog open when interacting with customer name input', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create$/i }))

    const customerNameInput = screen.getByLabelText(
      /customer name/i,
      { selector: 'input#sa-customer-name' },
    )

    // Simulate Safari-like misreported click coordinates on an in-dialog target.
    fireEvent.click(customerNameInput, { clientX: -999, clientY: -999 })

    expect(screen.getByRole('heading', { name: /^create customer$/i })).toBeInTheDocument()
    expect(customerNameInput).toBeInTheDocument()
  })

  it('supports dialog cancel events and exposes a labelled close control in create flow', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create$/i }))

    const closeDialogButton = screen.getByRole('button', { name: /close dialog/i })
    expect(closeDialogButton).toHaveAttribute('aria-label', 'Close dialog')

    const createDialog = closeDialogButton.closest('dialog')
    expect(createDialog).not.toBeNull()
    fireEvent(
      createDialog,
      new Event('cancel', { bubbles: true, cancelable: true }),
    )

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /^create customer$/i })).not.toBeInTheDocument()
    })
  })

  it('closes create customer dialog and resets form state', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create$/i }))
    const customerNameInput = screen.getByLabelText(/customer name/i, { selector: 'input#sa-customer-name' })
    await user.type(customerNameInput, 'Temporary Name')

    await user.click(screen.getByRole('button', { name: /close dialog/i }))
    expect(screen.queryByRole('heading', { name: /^create customer$/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^create$/i }))
    expect(
      screen.getByLabelText(/customer name/i, { selector: 'input#sa-customer-name' }),
    ).toHaveValue('')
  })

  it('shows max tenants only when create-customer topology is multi tenant', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(
      screen.queryByLabelText(/max tenants/i, { selector: 'input#sa-customer-max-tenants' }),
    ).not.toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText(/topology/i, { selector: 'select#sa-customer-topology' }),
      'MULTI_TENANT',
    )

    expect(
      screen.getByLabelText(/max tenants/i, { selector: 'input#sa-customer-max-tenants' }),
    ).toBeInTheDocument()
  })

  it('enforces required fields when creating a customer', async () => {
    const user = userEvent.setup()
    const mockCreateCustomer = vi.fn()
      .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) })
    useCreateCustomerMutation.mockReturnValue([mockCreateCustomer, { isLoading: false }])

    renderPage()

    await user.click(screen.getByRole('button', { name: /^create$/i }))
    await user.click(screen.getByRole('button', { name: /^create customer$/i }))

    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/licence level is required/i)).toBeInTheDocument()
    expect(mockCreateCustomer).not.toHaveBeenCalled()
  })

  it('shows invitations tab when view=invitations is in the URL', () => {
    renderPage('/super-admin/customers?view=invitations')

    expect(screen.getByRole('tab', { name: /invitations/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('heading', { name: /invitation management/i })).toBeInTheDocument()
  })

  it('normalizes unknown view query values to customers', () => {
    renderPage('/super-admin/customers?view=unknown')

    expect(screen.getByRole('tab', { name: /customers/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('heading', { name: /^customers$/i })).toBeInTheDocument()
  })

  it('opens update dialog with preloaded values when customer name is clicked', async () => {
    const user = userEvent.setup()
    const emptyDetailsResult = { data: null, isFetching: false, error: null }
    const populatedDetailsResult = {
      data: {
        data: {
          id: 'c-1',
          name: 'Acme Corp Updated',
          website: 'https://acme.example',
          topology: 'MULTI_TENANT',
          vmfPolicy: 'PER_TENANT_MULTI',
          licenseLevelId: 'lic-1',
          governance: { maxTenants: 3, maxVmfsPerTenant: 2 },
          billing: { planCode: 'PRO', cycle: 'ANNUAL' },
        },
      },
      isFetching: false,
      error: null,
    }

    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'MULTI_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useGetCustomerQuery.mockImplementation((customerId) => {
      if (!customerId) return emptyDetailsResult
      return populatedDetailsResult
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /^acme corp$/i }))

    expect(screen.getByRole('heading', { name: /update customer/i })).toBeInTheDocument()
    expect(await screen.findByDisplayValue('Acme Corp Updated')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://acme.example')).toBeInTheDocument()

    const editNameInput = screen.getByLabelText(/customer name/i, {
      selector: 'input#sa-customer-edit-name',
    })
    const editNameContainer = editNameInput.closest('.input-container')
    const editNameLabel = editNameContainer?.querySelector('.input-label')
    expect(editNameLabel).toHaveClass('input-label--floating')
  })

  it('requires customer name before saving edit dialog changes', async () => {
    const user = userEvent.setup()
    const mockUpdateCustomer = vi.fn()
      .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) })
    const emptyDetailsResult = { data: null, isFetching: false, error: null }
    const populatedDetailsResult = {
      data: {
        data: {
          id: 'c-1',
          name: 'Acme Corp',
          website: 'https://acme.example',
          topology: 'SINGLE_TENANT',
          vmfPolicy: 'SINGLE',
          licenseLevelId: 'lic-1',
          governance: { maxTenants: 1, maxVmfsPerTenant: 1 },
          billing: { planCode: 'FREE', cycle: 'MONTHLY' },
        },
      },
      isFetching: false,
      error: null,
    }

    useUpdateCustomerMutation.mockReturnValue([mockUpdateCustomer, { isLoading: false }])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useGetCustomerQuery.mockImplementation((customerId) => {
      if (!customerId) return emptyDetailsResult
      return populatedDetailsResult
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /^acme corp$/i }))
    const editNameInput = await screen.findByLabelText(
      /customer name/i,
      { selector: 'input#sa-customer-edit-name' },
    )

    await user.clear(editNameInput)
    await user.click(screen.getByRole('button', { name: /^save changes$/i }))

    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    expect(mockUpdateCustomer).not.toHaveBeenCalled()
  })

  it('renders customer row actions inside a compact overflow menu', async () => {
    const user = userEvent.setup()
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    expect(
      screen.queryByRole('menuitem', { name: /assign admin acme corp/i }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))

    expect(screen.getByRole('menu', { name: /actions for acme corp/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /assign admin acme corp/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /replace admin acme corp/i })).toBeInTheDocument()
  })

  it('supports keyboard access for row action menu with explicit screen-reader labels', async () => {
    const user = userEvent.setup()
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    const menuTrigger = screen.getByRole('button', { name: /actions for acme corp/i })
    expect(menuTrigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(menuTrigger).toHaveAttribute('aria-expanded', 'false')

    menuTrigger.focus()
    await user.keyboard('{Enter}')

    const menu = await screen.findByRole('menu', { name: /actions for acme corp/i })
    expect(menuTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(menuTrigger).toHaveAttribute('aria-controls', menu.getAttribute('id'))
    expect(screen.getByRole('menuitem', { name: /edit acme corp/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /assign admin acme corp/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /replace admin acme corp/i })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: /actions for acme corp/i })).not.toBeInTheDocument()
    })
    expect(menuTrigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows assign-invitation validation error for invalid email and blocks submit', async () => {
    const user = userEvent.setup()
    const mockCreateCustomerAdminInvitation = vi.fn()
      .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ outcome: 'created' }) })
    useCreateCustomerAdminInvitationMutation.mockReturnValue([
      mockCreateCustomerAdminInvitation,
      { isLoading: false },
    ])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /assign admin acme corp/i }))

    await user.type(screen.getByLabelText(/^user name$/i), 'Alex Admin')
    await user.type(screen.getByLabelText(/^email$/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /^send invitation$/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/valid email address/i)
    expect(mockCreateCustomerAdminInvitation).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: /customers/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('suppresses browser autofill on assign-admin invitation inputs', async () => {
    const user = userEvent.setup()
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /assign admin acme corp/i }))

    const nameInput = screen.getByLabelText(/^user name$/i, { selector: 'input' })
    const emailInput = screen.getByLabelText(/^email$/i, { selector: 'input' })

    expect(nameInput).toHaveAttribute('name', 'sa-admin-recipient-name')
    expect(nameInput).toHaveAttribute('autocomplete', 'off')
    expect(emailInput).toHaveAttribute('name', 'sa-admin-recipient-email')
    expect(emailInput).toHaveAttribute('autocomplete', 'off')
    expect(emailInput).toHaveAttribute('autocorrect', 'off')
    expect(emailInput).toHaveAttribute('autocapitalize', 'none')
    expect(emailInput).toHaveAttribute('spellcheck', 'false')
  })

  it('shows reason-based guidance for 409 INVITATION_ALREADY_ACTIVE different-user case', async () => {
    const user = userEvent.setup()
    const mockCreateCustomerAdminInvitation = vi.fn()
      .mockReturnValue({
        unwrap: vi.fn().mockRejectedValue({
          status: 409,
          data: {
            error: {
              code: 'INVITATION_ALREADY_ACTIVE',
              message: 'An active invitation already exists for this email address.',
              details: {
                reason: 'DIFFERENT_USER',
              },
            },
          },
        }),
      })
    useCreateCustomerAdminInvitationMutation.mockReturnValue([
      mockCreateCustomerAdminInvitation,
      { isLoading: false },
    ])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /assign admin acme corp/i }))
    await user.type(screen.getByLabelText(/^user name$/i), 'Alex Admin')
    await user.type(screen.getByLabelText(/^email$/i), 'alex@example.com')
    await user.click(screen.getByRole('button', { name: /^send invitation$/i }))

    expect(mockCreateCustomerAdminInvitation).toHaveBeenCalledWith({
      customerId: 'c-1',
      recipientName: 'Alex Admin',
      recipientEmail: 'alex@example.com',
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /already tied to another user/i,
    )
    expect(screen.getByRole('heading', { name: /assign customer admin/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /customers/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('preserves backend-specific INVITATION_ALREADY_ACTIVE message when provided', async () => {
    const user = userEvent.setup()
    const backendConflictMessage =
      'An active invitation already exists for this email in another customer. Revoke it there first.'
    const mockCreateCustomerAdminInvitation = vi.fn()
      .mockReturnValue({
        unwrap: vi.fn().mockRejectedValue({
          status: 409,
          data: {
            error: {
              code: 'INVITATION_ALREADY_ACTIVE',
              message: backendConflictMessage,
            },
          },
        }),
      })
    useCreateCustomerAdminInvitationMutation.mockReturnValue([
      mockCreateCustomerAdminInvitation,
      { isLoading: false },
    ])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /assign admin acme corp/i }))
    await user.type(screen.getByLabelText(/^user name$/i), 'Alex Admin')
    await user.type(screen.getByLabelText(/^email$/i), 'alex@example.com')
    await user.click(screen.getByRole('button', { name: /^send invitation$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(backendConflictMessage)
    expect(screen.queryByRole('alert')).not.toHaveTextContent(/already tied to another user/i)
  })

  it('shows neutral fallback guidance for generic INVITATION_ALREADY_ACTIVE without reason', async () => {
    const user = userEvent.setup()
    const mockCreateCustomerAdminInvitation = vi.fn()
      .mockReturnValue({
        unwrap: vi.fn().mockRejectedValue({
          status: 409,
          data: {
            error: {
              code: 'INVITATION_ALREADY_ACTIVE',
              message: 'An active invitation already exists for this email address.',
            },
          },
        }),
      })
    useCreateCustomerAdminInvitationMutation.mockReturnValue([
      mockCreateCustomerAdminInvitation,
      { isLoading: false },
    ])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /assign admin acme corp/i }))
    await user.type(screen.getByLabelText(/^user name$/i), 'Alex Admin')
    await user.type(screen.getByLabelText(/^email$/i), 'alex@example.com')
    await user.click(screen.getByRole('button', { name: /^send invitation$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /review invitation management before retrying/i,
    )
    expect(screen.queryByRole('alert')).not.toHaveTextContent(/already tied to another user/i)
  })

  it('keeps replace-admin submit disabled until step-up verification is present', async () => {
    const user = userEvent.setup()
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /replace admin acme corp/i }))

    expect(screen.queryByRole('heading', { name: /before you continue/i })).not.toBeInTheDocument()
    const replaceDialogHeading = screen.getByRole('heading', { name: /replace customer admin/i })
    const replaceDialog = replaceDialogHeading.closest('dialog')
    expect(replaceDialog).not.toBeNull()
    const replaceDialogScreen = within(replaceDialog)
    expect(replaceDialogScreen.getByTestId('step-up-password-label')).toHaveTextContent(
      /current super admin password/i,
    )
    expect(replaceDialogScreen.getByTestId('step-up-password-helper')).toHaveTextContent(
      /verify this replacement/i,
    )
    const replaceAdminHelpTrigger = screen.getByRole('button', { name: /when to use replace admin/i })
    expect(replaceAdminHelpTrigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: /when to use assign admin/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('button', { name: /user id and verification/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    const replaceAdminHelpPanel = document.getElementById('accordion-content-replace-admin-when')
    expect(replaceAdminHelpPanel).toHaveAttribute('aria-hidden', 'true')

    await user.click(replaceAdminHelpTrigger)
    expect(replaceAdminHelpTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(replaceAdminHelpPanel).toHaveAttribute('aria-hidden', 'false')
    expect(
      screen.getByText(/updates canonical ownership immediately/i),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^existing user id$/i), 'new-user-1')
    await user.type(screen.getByLabelText(/^reason$/i), 'Ownership transfer')

    expect(screen.getByRole('button', { name: /^replace admin$/i })).toBeDisabled()
  })

  it('shows actionable guidance when replace-admin step-up token is expired', async () => {
    const user = userEvent.setup()
    const mockReplaceCustomerAdmin = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 401,
        data: {
          error: {
            code: 'STEP_UP_INVALID',
            message: 'Step-up token expired or invalid. Re-authenticate and try again.',
            requestId: 'stepup-expired-1',
          },
        },
      }),
    })
    useReplaceCustomerAdminMutation.mockReturnValue([mockReplaceCustomerAdmin, { isLoading: false }])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /replace admin acme corp/i }))
    await user.type(screen.getByLabelText(/^existing user id$/i), 'new-user-1')
    await user.type(screen.getByLabelText(/^reason$/i), 'Ownership transfer')
    await user.click(screen.getByRole('button', { name: /mock step-up complete/i }))
    await user.click(screen.getByRole('button', { name: /^replace admin$/i }))

    const errorAlert = await screen.findByRole('alert')
    expect(errorAlert).toHaveTextContent(
      /verify again using your current super admin password, then retry replace admin/i,
    )
    expect(errorAlert).toHaveTextContent(/\(Ref: stepup-expired-1\)/i)
    expect(mockReplaceCustomerAdmin).toHaveBeenCalledWith({
      customerId: 'c-1',
      newUserId: 'new-user-1',
      reason: 'Ownership transfer',
      stepUpToken: 'mock-step-up-token',
    })
  })

  it('shows actionable guidance when step-up verification service is unavailable during replace-admin', async () => {
    const user = userEvent.setup()
    const mockReplaceCustomerAdmin = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 503,
        data: {
          error: {
            code: 'STEP_UP_UNAVAILABLE',
            message: 'Step-up verification is unavailable right now. Try again shortly.',
            requestId: 'stepup-unavailable-1',
          },
        },
      }),
    })
    useReplaceCustomerAdminMutation.mockReturnValue([mockReplaceCustomerAdmin, { isLoading: false }])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /replace admin acme corp/i }))
    await user.type(screen.getByLabelText(/^existing user id$/i), 'new-user-1')
    await user.type(screen.getByLabelText(/^reason$/i), 'Ownership transfer')
    await user.click(screen.getByRole('button', { name: /mock step-up complete/i }))
    await user.click(screen.getByRole('button', { name: /^replace admin$/i }))

    const errorAlert = await screen.findByRole('alert')
    expect(errorAlert).toHaveTextContent(
      /step-up verification is temporarily unavailable/i,
    )
    expect(errorAlert).toHaveTextContent(
      /verify using your current super admin password and retry/i,
    )
    expect(errorAlert).toHaveTextContent(/\(Ref: stepup-unavailable-1\)/i)
  })

  it('switches to invitations tab after successful assign-admin invitation creation', async () => {
    const user = userEvent.setup()
    const mockCreateCustomerAdminInvitation = vi.fn()
      .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ outcome: 'created' }) })
    useCreateCustomerAdminInvitationMutation.mockReturnValue([
      mockCreateCustomerAdminInvitation,
      { isLoading: false },
    ])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    // Open the assign admin dialog from the customer row overflow menu
    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /assign admin acme corp/i }))

    // Fill invite form fields
    await user.type(screen.getByLabelText(/^user name$/i), 'Alex Admin')
    await user.type(screen.getByLabelText(/^email$/i), 'alex@example.com')

    // Submit the dialog
    await user.click(screen.getByRole('button', { name: /^send invitation$/i }))

    expect(mockCreateCustomerAdminInvitation).toHaveBeenCalledWith({
      customerId: 'c-1',
      recipientName: 'Alex Admin',
      recipientEmail: 'alex@example.com',
    })

    // After success the workspace should switch to the Invitations tab
    expect(screen.getByRole('tab', { name: /invitations/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('shows auth-link dialog for dev-mode invite responses and switches tab after closing it', async () => {
    const user = userEvent.setup()
    const mockCreateCustomerAdminInvitation = vi.fn()
      .mockReturnValue({
        unwrap: vi.fn().mockResolvedValue({
          outcome: 'created',
          authLink: 'http://localhost:5173/invitation-auth?invitationId=inv-123',
        }),
      })
    useCreateCustomerAdminInvitationMutation.mockReturnValue([
      mockCreateCustomerAdminInvitation,
      { isLoading: false },
    ])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /assign admin acme corp/i }))
    await user.type(screen.getByLabelText(/^user name$/i), 'Alex Admin')
    await user.type(screen.getByLabelText(/^email$/i), 'alex@example.com')
    await user.click(screen.getByRole('button', { name: /^send invitation$/i }))

    const authLinkHeading = await screen.findByRole('heading', { name: /auth link \(dev mode\)/i })
    const authLinkDialog = authLinkHeading.closest('dialog')
    expect(authLinkDialog).not.toBeNull()
    expect(
      within(authLinkDialog).getByText(
        'http://localhost:5173/invitation-auth?invitationId=inv-123',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /customers/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.click(within(authLinkDialog).getByRole('button', { name: /^close$/i }))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /invitations/i })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })
  })

  it('shows invited user in invitations list after successful assign-admin submit', async () => {
    const user = userEvent.setup()
    const mockCreateCustomerAdminInvitation = vi.fn()
      .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ outcome: 'created' }) })
    useCreateCustomerAdminInvitationMutation.mockReturnValue([
      mockCreateCustomerAdminInvitation,
      { isLoading: false },
    ])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useListInvitationsQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'inv-1',
            recipientName: 'Alex Admin',
            recipientEmail: 'alex@example.com',
            company: { name: 'Acme Corp' },
            status: 'created',
            updatedAt: '2026-03-04T10:00:00.000Z',
            expiresAt: '2026-03-11T10:00:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /assign admin acme corp/i }))
    await user.type(screen.getByLabelText(/^user name$/i), 'Alex Admin')
    await user.type(screen.getByLabelText(/^email$/i), 'alex@example.com')
    await user.click(screen.getByRole('button', { name: /^send invitation$/i }))

    expect(screen.getByRole('tab', { name: /invitations/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(await screen.findByText('alex@example.com')).toBeInTheDocument()
  })
})
