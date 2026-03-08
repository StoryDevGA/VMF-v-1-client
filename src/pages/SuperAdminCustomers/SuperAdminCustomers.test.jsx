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

vi.mock('../../store/api/userApi.js', () => ({
  useListUsersQuery: vi.fn(),
  useCreateUserMutation: vi.fn(),
  useUpdateUserMutation: vi.fn(),
  useDisableUserMutation: vi.fn(),
  useEnableUserMutation: vi.fn(),
  useDeleteUserMutation: vi.fn(),
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
import {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDisableUserMutation,
  useEnableUserMutation,
  useDeleteUserMutation,
} from '../../store/api/userApi.js'

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
    useListUsersQuery.mockReturnValue({
      data: {
        data: { users: [], page: 1, pageSize: 20, total: 0, totalPages: 1, filters: {} },
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 1, filters: {} },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useCreateUserMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useUpdateUserMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useDisableUserMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useEnableUserMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useDeleteUserMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useResendInvitationMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useRevokeInvitationMutation.mockReturnValue([vi.fn(), { isLoading: false }])
  })

  it('renders customer admin workspace in list-first mode by default', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /customer admin/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /customers/i })).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByText(
        /customers - manage customer lifecycle, governance limits, and canonical customer admin flows\./i,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /customer catalogue/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^create customer$/i })).not.toBeInTheDocument()
  })

  it('clarifies canonical-admin meaning and normalizes updated timestamp rendering in customer rows', () => {
    const updatedAt = '2026-03-05T14:30:00.000Z'
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'c-1',
            name: 'Acme Corp',
            status: 'ACTIVE',
            topology: 'SINGLE_TENANT',
            governance: {
              maxTenants: 1,
              maxVmfsPerTenant: 4,
              customerAdminUserId: 'admin-user-123',
            },
            updatedAt,
          },
          {
            id: 'c-2',
            name: 'Beta Corp',
            status: 'ACTIVE',
            topology: 'SINGLE_TENANT',
            governance: {
              maxTenants: 1,
              maxVmfsPerTenant: 2,
            },
            updatedAt: null,
          },
        ],
        meta: { page: 1, totalPages: 1, total: 2 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    expect(
      screen.getByText(/canonical admin shows the governance owner user id for each customer/i),
    ).toBeInTheDocument()
    expect(screen.getByText('admin-user-123', { selector: 'code' })).toBeInTheDocument()
    expect(screen.getByText(/not assigned/i)).toBeInTheDocument()

    const parsedUpdatedAt = new Date(updatedAt)
    const padTwoDigits = (value) => String(value).padStart(2, '0')
    const updatedDateLabel = `${parsedUpdatedAt.getFullYear()}-${padTwoDigits(
      parsedUpdatedAt.getMonth() + 1,
    )}-${padTwoDigits(parsedUpdatedAt.getDate())}`
    const updatedTimeLabel = `${padTwoDigits(parsedUpdatedAt.getHours())}:${padTwoDigits(
      parsedUpdatedAt.getMinutes(),
    )}`
    const updatedTimestamp = document.querySelector('.table-date-time')
    expect(updatedTimestamp).not.toBeNull()
    expect(updatedTimestamp).toHaveAttribute('datetime', parsedUpdatedAt.toISOString())
    expect(updatedTimestamp).toHaveTextContent(updatedDateLabel)
    expect(updatedTimestamp).toHaveTextContent(updatedTimeLabel)
    expect(updatedTimestamp.querySelector('.table-date-time__date')).toHaveTextContent(
      /^\d{4}-\d{2}-\d{2}$/,
    )
    expect(updatedTimestamp.querySelector('.table-date-time__time')).toHaveTextContent(
      /^\d{2}:\d{2}$/,
    )
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
    expect(
      screen.getByText(
        /invitation management - track, resend, and revoke customer onboarding invitations\./i,
      ),
    ).toBeInTheDocument()
  })

  it('renders invitations in embedded tab context with shared heading hierarchy', () => {
    renderPage('/super-admin/customers?view=invitations')

    const invitationHeading = screen.getByRole('heading', { name: /invitation management/i })
    expect(invitationHeading.tagName).toBe('H2')

    const invitationPanel = invitationHeading.closest('.super-admin-invitations')
    expect(invitationPanel).not.toBeNull()
    expect(invitationPanel).toHaveClass('super-admin-invitations--embedded')
  })

  it('normalizes unknown view query values to customers', () => {
    renderPage('/super-admin/customers?view=unknown')

    expect(screen.getByRole('tab', { name: /customers/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('heading', { name: /^customers$/i })).toBeInTheDocument()
  })

  it('supports first/last pagination controls in customer catalogue', async () => {
    const user = userEvent.setup()
    useListCustomersQuery.mockImplementation(({ page = 1 }) => ({
      data: {
        data: [{
          id: 'c-1',
          name: 'Acme Corp',
          status: 'ACTIVE',
          topology: 'SINGLE_TENANT',
          governance: { customerAdminUserId: 'admin-1' },
        }],
        meta: { page, totalPages: 3, total: 41 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }))

    renderPage()

    const firstButton = screen.getByRole('button', { name: /^first$/i })
    const previousButton = screen.getByRole('button', { name: /^previous$/i })
    const nextButton = screen.getByRole('button', { name: /^next$/i })
    const lastButton = screen.getByRole('button', { name: /^last$/i })

    expect(firstButton).toBeDisabled()
    expect(previousButton).toBeDisabled()
    expect(nextButton).not.toBeDisabled()
    expect(lastButton).not.toBeDisabled()

    await user.click(lastButton)

    await waitFor(() => {
      expect(useListCustomersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 3 }),
      )
    })
    expect(screen.getByText(/page 3 of 3/i)).toBeInTheDocument()

    await user.click(firstButton)

    await waitFor(() => {
      expect(useListCustomersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
      )
    })
    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument()
  })

  it('opens customer-level users workspace from row actions', async () => {
    const user = userEvent.setup()
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{
          id: 'c-1',
          name: 'Acme Corp',
          status: 'ACTIVE',
          topology: 'SINGLE_TENANT',
          governance: { customerAdminUserId: 'admin-1' },
        }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))

    expect(screen.getByRole('heading', { name: /customer users/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to customers/i })).toBeInTheDocument()
    expect(
      screen.getByText(/canonical admin marks the governance owner user for this customer\./i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/showing users for/i)).not.toBeInTheDocument()
    expect(useListUsersQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        customerId: 'c-1',
        q: '',
        role: '',
        status: '',
        page: 1,
        pageSize: 20,
      }),
      { skip: false },
    )
  })

  it('renders customer users table with roles, trust, status, and canonical-admin marker', async () => {
    const user = userEvent.setup()
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{
          id: 'c-1',
          name: 'Acme Corp',
          status: 'ACTIVE',
          topology: 'SINGLE_TENANT',
          governance: { customerAdminUserId: 'admin-1' },
        }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: [
            {
              id: 'u-1',
              name: 'Alex Admin',
              email: 'alex@example.com',
              status: 'ACTIVE',
              trustStatus: 'TRUSTED',
              customerRoles: ['CUSTOMER_ADMIN', 'TENANT_ADMIN'],
              isCanonicalAdmin: true,
            },
            {
              id: 'u-2',
              name: 'Taylor User',
              email: 'taylor@example.com',
              status: 'INACTIVE',
              trustStatus: 'UNTRUSTED',
              customerRoles: ['USER'],
              isCanonicalAdmin: false,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 2,
          totalPages: 1,
          filters: {},
        },
        meta: { page: 1, pageSize: 20, total: 2, totalPages: 1, filters: {} },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))

    expect(screen.getByText('alex@example.com')).toBeInTheDocument()
    expect(screen.getByText('CUSTOMER_ADMIN, TENANT_ADMIN')).toBeInTheDocument()
    expect(screen.getByText('USER')).toBeInTheDocument()
    expect(screen.getByText(/^trusted$/i)).toBeInTheDocument()
    expect(screen.getByText(/^untrusted$/i)).toBeInTheDocument()
    expect(screen.getByText(/^INACTIVE$/)).toBeInTheDocument()
    expect(screen.getByText('Canonical')).toBeInTheDocument()
  })

  it('applies server-driven search/role/status filters and pagination in customer users workspace', async () => {
    const user = userEvent.setup()
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{
          id: 'c-1',
          name: 'Acme Corp',
          status: 'ACTIVE',
          topology: 'SINGLE_TENANT',
          governance: { customerAdminUserId: 'admin-1' },
        }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useListUsersQuery.mockImplementation(({ page = 1 }) => ({
      data: {
        data: {
          users: [
            {
              id: 'u-1',
              name: 'Alex Admin',
              email: 'alex@example.com',
              status: 'ACTIVE',
              trustStatus: 'TRUSTED',
              customerRoles: ['CUSTOMER_ADMIN'],
              isCanonicalAdmin: false,
            },
          ],
          page,
          pageSize: 20,
          total: 41,
          totalPages: 3,
          filters: {},
        },
        meta: { page, pageSize: 20, total: 41, totalPages: 3, filters: {} },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }))

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))

    const firstButton = screen.getByRole('button', { name: /^first$/i })
    const previousButton = screen.getByRole('button', { name: /^previous$/i })
    const nextButton = screen.getByRole('button', { name: /^next$/i })
    const lastButton = screen.getByRole('button', { name: /^last$/i })

    expect(firstButton).toBeDisabled()
    expect(previousButton).toBeDisabled()
    expect(nextButton).not.toBeDisabled()
    expect(lastButton).not.toBeDisabled()

    await user.type(
      screen.getByLabelText(/^search$/i, { selector: 'input#sa-customer-user-search' }),
      'alex',
    )

    await waitFor(() => {
      expect(useListUsersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          customerId: 'c-1',
          q: 'alex',
          role: '',
          status: '',
          page: 1,
        }),
        { skip: false },
      )
    })

    await user.selectOptions(
      screen.getByLabelText(/^role$/i, { selector: 'select#sa-customer-user-role-filter' }),
      'TENANT_ADMIN',
    )

    await waitFor(() => {
      expect(useListUsersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          customerId: 'c-1',
          q: 'alex',
          role: 'TENANT_ADMIN',
          status: '',
          page: 1,
        }),
        { skip: false },
      )
    })

    await user.selectOptions(
      screen.getByLabelText(/^status$/i, { selector: 'select#sa-customer-user-status-filter' }),
      'INACTIVE',
    )

    await waitFor(() => {
      expect(useListUsersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          customerId: 'c-1',
          q: 'alex',
          role: 'TENANT_ADMIN',
          status: 'INACTIVE',
          page: 1,
        }),
        { skip: false },
      )
    })

    await user.selectOptions(
      screen.getByLabelText(/^role$/i, { selector: 'select#sa-customer-user-role-filter' }),
      '',
    )

    await waitFor(() => {
      expect(useListUsersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          customerId: 'c-1',
          q: 'alex',
          role: '',
          status: 'INACTIVE',
          page: 1,
        }),
        { skip: false },
      )
    })

    await user.selectOptions(
      screen.getByLabelText(/^status$/i, { selector: 'select#sa-customer-user-status-filter' }),
      '',
    )

    await waitFor(() => {
      expect(useListUsersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          customerId: 'c-1',
          q: 'alex',
          role: '',
          status: '',
          page: 1,
        }),
        { skip: false },
      )
    })

    await user.click(screen.getByRole('button', { name: /^next$/i }))

    await waitFor(() => {
      expect(useListUsersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          customerId: 'c-1',
          q: 'alex',
          role: '',
          status: '',
          page: 2,
        }),
        { skip: false },
      )
    })
    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument()

    await user.click(lastButton)

    await waitFor(() => {
      expect(useListUsersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          customerId: 'c-1',
          q: 'alex',
          role: '',
          status: '',
          page: 3,
        }),
        { skip: false },
      )
    })
    expect(screen.getByText(/page 3 of 3/i)).toBeInTheDocument()

    await user.click(firstButton)

    await waitFor(() => {
      expect(useListUsersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          customerId: 'c-1',
          q: 'alex',
          role: '',
          status: '',
          page: 1,
        }),
        { skip: false },
      )
    })
    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument()
  })

  it('shows backend validation guidance when customer users query returns 422', async () => {
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
    useListUsersQuery.mockReturnValue({
      data: {
        data: { users: [], page: 1, pageSize: 20, total: 0, totalPages: 1, filters: {} },
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 1, filters: {} },
      },
      isLoading: false,
      isFetching: false,
      error: {
        status: 422,
        data: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Validation failed',
            details: {
              status: ['status must be one of ACTIVE or INACTIVE'],
            },
          },
        },
      },
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /status must be one of active or inactive/i,
    )
  })

  it('opens create-user dialog from customer users workspace and enforces required fields', async () => {
    const user = userEvent.setup()
    const mockCreateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { outcome: 'invited_new', invitationOutcome: 'sent' } }),
    })
    useCreateUserMutation.mockReturnValue([mockCreateUser, { isLoading: false }])
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /^create user$/i }))

    const createUserHeading = screen.getByRole('heading', { name: /create customer user/i })
    const createUserDialog = createUserHeading.closest('dialog')
    expect(createUserDialog).not.toBeNull()
    const createUserScreen = within(createUserDialog)

    await user.click(createUserScreen.getByRole('button', { name: /^create user$/i }))

    expect(createUserScreen.getByText(/full name is required/i)).toBeInTheDocument()
    expect(createUserScreen.getByText(/email is required/i)).toBeInTheDocument()
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  it('defaults create-user role to USER and hides TENANT_ADMIN for single-tenant customers', async () => {
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /^create user$/i }))

    const createUserHeading = screen.getByRole('heading', { name: /create customer user/i })
    const createUserDialog = createUserHeading.closest('dialog')
    expect(createUserDialog).not.toBeNull()
    const createUserScreen = within(createUserDialog)

    expect(createUserScreen.getByLabelText(/^user$/i)).toBeChecked()
    expect(createUserScreen.queryByLabelText(/tenant admin/i)).not.toBeInTheDocument()
  })

  it('shows TENANT_ADMIN role option for multi-tenant customers', async () => {
    const user = userEvent.setup()
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'MULTI_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /^create user$/i }))

    const createUserHeading = screen.getByRole('heading', { name: /create customer user/i })
    const createUserDialog = createUserHeading.closest('dialog')
    expect(createUserDialog).not.toBeNull()
    const createUserScreen = within(createUserDialog)

    expect(createUserScreen.getByLabelText(/tenant admin/i)).toBeInTheDocument()
  })

  it('creates invited_new customer user and shows explicit sent outcome guidance', async () => {
    const user = userEvent.setup()
    const mockCreateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          outcome: 'invited_new',
          invitationDispatched: true,
          invitationOutcome: 'sent',
        },
      }),
    })
    useCreateUserMutation.mockReturnValue([mockCreateUser, { isLoading: false }])
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /^create user$/i }))

    const createUserHeading = screen.getByRole('heading', { name: /create customer user/i })
    const createUserDialog = createUserHeading.closest('dialog')
    expect(createUserDialog).not.toBeNull()
    const createUserScreen = within(createUserDialog)

    await user.type(
      createUserScreen.getByLabelText(/^user full name$/i, { selector: 'input#sa-customer-user-create-name' }),
      'Taylor User',
    )
    await user.type(
      createUserScreen.getByLabelText(/^user email$/i, { selector: 'input#sa-customer-user-create-email' }),
      'taylor@example.com',
    )
    await user.click(createUserScreen.getByRole('button', { name: /^create user$/i }))

    expect(mockCreateUser).toHaveBeenCalledWith({
      customerId: 'c-1',
      body: {
        name: 'Taylor User',
        email: 'taylor@example.com',
        roles: ['USER'],
      },
    })
    expect(
      await screen.findByText(/user account created for taylor@example\.com\. invitation email sent\./i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /create customer user/i })).not.toBeInTheDocument()
  })

  it('creates invited_new customer user and surfaces explicit send_failed outcome guidance', async () => {
    const user = userEvent.setup()
    const mockCreateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          outcome: 'invited_new',
          invitationDispatched: true,
          invitationOutcome: 'send_failed',
        },
      }),
    })
    useCreateUserMutation.mockReturnValue([mockCreateUser, { isLoading: false }])
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /^create user$/i }))

    const createUserHeading = screen.getByRole('heading', { name: /create customer user/i })
    const createUserDialog = createUserHeading.closest('dialog')
    expect(createUserDialog).not.toBeNull()
    const createUserScreen = within(createUserDialog)

    await user.type(
      createUserScreen.getByLabelText(/^user full name$/i, { selector: 'input#sa-customer-user-create-name' }),
      'Taylor User',
    )
    await user.type(
      createUserScreen.getByLabelText(/^user email$/i, { selector: 'input#sa-customer-user-create-email' }),
      'taylor@example.com',
    )
    await user.click(createUserScreen.getByRole('button', { name: /^create user$/i }))

    expect(await screen.findByText(/user account created for taylor@example\.com\./i)).toBeInTheDocument()
    expect(screen.getByText(/invitation email delivery failed/i)).toBeInTheDocument()
    expect(screen.getByText(/check invitation management for status/i)).toBeInTheDocument()
  })

  it('creates invited_new customer user and surfaces unknown invitation status guidance when invitationOutcome is missing', async () => {
    const user = userEvent.setup()
    const mockCreateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          outcome: 'invited_new',
        },
      }),
    })
    useCreateUserMutation.mockReturnValue([mockCreateUser, { isLoading: false }])
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /^create user$/i }))

    const createUserHeading = screen.getByRole('heading', { name: /create customer user/i })
    const createUserDialog = createUserHeading.closest('dialog')
    expect(createUserDialog).not.toBeNull()
    const createUserScreen = within(createUserDialog)

    await user.type(
      createUserScreen.getByLabelText(/^user full name$/i, { selector: 'input#sa-customer-user-create-name' }),
      'Taylor User',
    )
    await user.type(
      createUserScreen.getByLabelText(/^user email$/i, { selector: 'input#sa-customer-user-create-email' }),
      'taylor@example.com',
    )
    await user.click(createUserScreen.getByRole('button', { name: /^create user$/i }))

    expect(
      await screen.findByText(
        /user account created for taylor@example\.com\. invitation delivery status is unavailable\./i,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/check invitation management for status/i)).toBeInTheDocument()
  })

  it('keeps create-user dev-mode auth-link behavior unchanged for invited_new outcomes', async () => {
    const user = userEvent.setup()
    const mockCreateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          outcome: 'invited_new',
          invitationOutcome: 'sent',
          authLink: 'http://localhost:5173/invitation-auth?invitationId=inv-create-1',
        },
      }),
    })
    useCreateUserMutation.mockReturnValue([mockCreateUser, { isLoading: false }])
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /^create user$/i }))

    const createUserHeading = screen.getByRole('heading', { name: /create customer user/i })
    const createUserDialog = createUserHeading.closest('dialog')
    expect(createUserDialog).not.toBeNull()
    const createUserScreen = within(createUserDialog)

    await user.type(
      createUserScreen.getByLabelText(/^user full name$/i, { selector: 'input#sa-customer-user-create-name' }),
      'Taylor User',
    )
    await user.type(
      createUserScreen.getByLabelText(/^user email$/i, { selector: 'input#sa-customer-user-create-email' }),
      'taylor@example.com',
    )
    await user.click(createUserScreen.getByRole('button', { name: /^create user$/i }))

    const authLinkHeading = await screen.findByRole('heading', { name: /auth link \(dev mode\)/i })
    const authLinkDialog = authLinkHeading.closest('dialog')
    expect(authLinkDialog).not.toBeNull()
    expect(
      within(authLinkDialog).getByText(
        'http://localhost:5173/invitation-auth?invitationId=inv-create-1',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /customers/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: /invitations/i })).toHaveAttribute(
      'aria-selected',
      'false',
    )

    await user.click(within(authLinkDialog).getByRole('button', { name: /^close$/i }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /auth link \(dev mode\)/i })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('tab', { name: /customers/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('assigns existing customer user without invitation when outcome is assigned_existing', async () => {
    const user = userEvent.setup()
    const mockCreateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          outcome: 'assigned_existing',
          invitationDispatched: false,
          invitationOutcome: 'none',
        },
      }),
    })
    useCreateUserMutation.mockReturnValue([mockCreateUser, { isLoading: false }])
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /^create user$/i }))

    const createUserHeading = screen.getByRole('heading', { name: /create customer user/i })
    const createUserDialog = createUserHeading.closest('dialog')
    expect(createUserDialog).not.toBeNull()
    const createUserScreen = within(createUserDialog)

    await user.selectOptions(
      createUserScreen.getByLabelText(/^create mode$/i, { selector: 'select#sa-customer-user-create-mode' }),
      'assign_existing',
    )
    await user.type(
      createUserScreen.getByLabelText(
        /^existing user id$/i,
        { selector: 'input#sa-customer-user-create-existing-id' },
      ),
      'user-42',
    )
    await user.click(createUserScreen.getByRole('button', { name: /^assign user$/i }))

    expect(mockCreateUser).toHaveBeenCalledWith({
      customerId: 'c-1',
      body: {
        existingUserId: 'user-42',
        roles: ['USER'],
      },
    })
    expect(await screen.findByText(/existing user assigned to this customer/i)).toBeInTheDocument()
  })

  it('maps USER_ALREADY_EXISTS create-user conflicts using reason/details guidance', async () => {
    const user = userEvent.setup()
    const mockCreateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: {
          error: {
            code: 'USER_ALREADY_EXISTS',
            message: 'Generic conflict message from server',
            requestId: 'user-exists-1',
            details: {
              reason: 'already-in-customer',
              existingUserId: 'usr-123',
            },
          },
        },
      }),
    })
    useCreateUserMutation.mockReturnValue([mockCreateUser, { isLoading: false }])
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /^create user$/i }))

    const createUserHeading = screen.getByRole('heading', { name: /create customer user/i })
    const createUserDialog = createUserHeading.closest('dialog')
    expect(createUserDialog).not.toBeNull()
    const createUserScreen = within(createUserDialog)

    await user.type(
      createUserScreen.getByLabelText(/^user full name$/i, { selector: 'input#sa-customer-user-create-name' }),
      'Taylor User',
    )
    await user.type(
      createUserScreen.getByLabelText(/^user email$/i, { selector: 'input#sa-customer-user-create-email' }),
      'taylor@example.com',
    )
    await user.click(createUserScreen.getByRole('button', { name: /^create user$/i }))

    expect(await createUserScreen.findByText(/already exists in this customer/i)).toBeInTheDocument()
    expect(createUserScreen.getByText(/\(User ID: usr-123\)\. \(Ref: user-exists-1\)/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /create customer user/i })).toBeInTheDocument()
  })

  it('maps USER_CUSTOMER_CONFLICT for existing-user assignment mode', async () => {
    const user = userEvent.setup()
    const mockCreateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: {
          error: {
            code: 'USER_CUSTOMER_CONFLICT',
            message: 'Generic conflict message from server',
            requestId: 'user-conflict-1',
            details: {
              reason: 'other-customer',
            },
          },
        },
      }),
    })
    useCreateUserMutation.mockReturnValue([mockCreateUser, { isLoading: false }])
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /^create user$/i }))

    const createUserHeading = screen.getByRole('heading', { name: /create customer user/i })
    const createUserDialog = createUserHeading.closest('dialog')
    expect(createUserDialog).not.toBeNull()
    const createUserScreen = within(createUserDialog)

    await user.selectOptions(
      createUserScreen.getByLabelText(/^create mode$/i, { selector: 'select#sa-customer-user-create-mode' }),
      'assign_existing',
    )
    await user.type(
      createUserScreen.getByLabelText(
        /^existing user id$/i,
        { selector: 'input#sa-customer-user-create-existing-id' },
      ),
      'user-42',
    )
    await user.click(createUserScreen.getByRole('button', { name: /^assign user$/i }))

    expect(
      await createUserScreen.findByText(/belongs to another customer and cannot be assigned to this customer/i),
    ).toBeInTheDocument()
  })

  it('shows form-level create-user error when validation fields are not mappable', async () => {
    const user = userEvent.setup()
    const mockCreateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 422,
        data: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Validation failed',
            requestId: 'create-user-422-1',
            details: {
              tenantVisibility: ['Tenant visibility is not allowed in this mode.'],
            },
          },
        },
      }),
    })
    useCreateUserMutation.mockReturnValue([mockCreateUser, { isLoading: false }])
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /^create user$/i }))

    const createUserHeading = screen.getByRole('heading', { name: /create customer user/i })
    const createUserDialog = createUserHeading.closest('dialog')
    expect(createUserDialog).not.toBeNull()
    const createUserScreen = within(createUserDialog)

    await user.type(
      createUserScreen.getByLabelText(/^user full name$/i, { selector: 'input#sa-customer-user-create-name' }),
      'Taylor User',
    )
    await user.type(
      createUserScreen.getByLabelText(/^user email$/i, { selector: 'input#sa-customer-user-create-email' }),
      'taylor@example.com',
    )
    await user.click(createUserScreen.getByRole('button', { name: /^create user$/i }))

    expect(
      await createUserScreen.findByText(/tenant visibility is not allowed in this mode/i),
    ).toBeInTheDocument()
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
    expect(screen.getByRole('menuitem', { name: /edit acme corp/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /view users acme corp/i })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /assign admin acme corp/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /replace admin acme corp/i })).not.toBeInTheDocument()
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
    expect(screen.getByRole('menuitem', { name: /view users acme corp/i })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /assign admin acme corp/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /replace admin acme corp/i })).not.toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: /actions for acme corp/i })).not.toBeInTheDocument()
    })
    expect(menuTrigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('hides assign-admin toolbar CTA when row-level edit path is available', async () => {
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
    useListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: [
            {
              id: 'u-1',
              name: 'Taylor User',
              email: 'taylor@example.com',
              customerRoles: ['USER'],
              isCanonicalAdmin: false,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          filters: {},
        },
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1, filters: {} },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))

    expect(screen.getByRole('button', { name: /edit user taylor user/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /replace customer admin/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /assign customer admin/i })).not.toBeInTheDocument()
  })

  it('opens edit-user dialog from row action and seeds assign-admin dialog with row values', async () => {
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
    useListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: [
            {
              id: 'u-1',
              name: 'Taylor User',
              email: 'taylor@example.com',
              customerRoles: ['USER'],
              isCanonicalAdmin: false,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          filters: {},
        },
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1, filters: {} },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /edit user taylor user/i }))

    const editHeading = screen.getByRole('heading', { name: /edit customer user/i })
    const editDialog = editHeading.closest('dialog')
    expect(editDialog).not.toBeNull()
    const editDialogScreen = within(editDialog)
    const editDialogFooter = editDialog.querySelector('.super-admin-customers__user-edit-footer')
    expect(editDialogFooter).not.toBeNull()
    const footerActions = editDialogFooter.querySelector('.super-admin-customers__user-edit-footer-actions')
    expect(footerActions).not.toBeNull()
    expect(
      editDialogScreen.getByLabelText(/^user full name$/i, { selector: 'input#sa-customer-user-edit-name' }),
    ).toHaveValue('Taylor User')
    expect(
      editDialogScreen.getByLabelText(/^user email$/i, { selector: 'input#sa-customer-user-edit-email' }),
    ).toHaveValue('taylor@example.com')
    expect(within(footerActions).getByRole('button', { name: /assign customer admin/i })).toBeInTheDocument()
    expect(within(footerActions).getByRole('button', { name: /save changes/i })).toBeInTheDocument()

    await user.click(editDialogScreen.getByRole('button', { name: /assign customer admin/i }))

    const assignHeading = await screen.findByRole('heading', { name: /assign customer admin/i })
    const assignDialog = assignHeading.closest('dialog')
    expect(assignDialog).not.toBeNull()
    const assignDialogScreen = within(assignDialog)
    expect(assignDialogScreen.getByLabelText(/^full name$/i)).toHaveValue('Taylor User')
    expect(assignDialogScreen.getByLabelText(/^email$/i)).toHaveValue('taylor@example.com')
  })

  it('keeps email immutable and shows remediation guidance in edit-user dialog', async () => {
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
    useListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: [
            {
              id: 'u-1',
              name: 'Taylor User',
              email: 'taylor@example.com',
              customerRoles: ['USER'],
              isCanonicalAdmin: false,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          filters: {},
        },
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1, filters: {} },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /edit user taylor user/i }))

    const editHeading = screen.getByRole('heading', { name: /edit customer user/i })
    const editDialog = editHeading.closest('dialog')
    expect(editDialog).not.toBeNull()
    const editDialogScreen = within(editDialog)
    const emailInput = editDialogScreen.getByLabelText(
      /^user email$/i,
      { selector: 'input#sa-customer-user-edit-email' },
    )
    expect(emailInput).toHaveAttribute('readonly')
    expect(editDialogScreen.getByText(/email cannot be changed here/i)).toBeInTheDocument()
    expect(editDialogScreen.getByText(/archive this user and create a new user/i)).toBeInTheDocument()
  })

  it('validates required name and roles before submitting edit-user changes', async () => {
    const user = userEvent.setup()
    const mockUpdateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { id: 'u-1', name: 'Taylor User' } }),
    })
    useUpdateUserMutation.mockReturnValue([mockUpdateUser, { isLoading: false }])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: [
            {
              id: 'u-1',
              name: 'Taylor User',
              email: 'taylor@example.com',
              customerRoles: ['USER'],
              isCanonicalAdmin: false,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          filters: {},
        },
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1, filters: {} },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /edit user taylor user/i }))

    const editHeading = screen.getByRole('heading', { name: /edit customer user/i })
    const editDialog = editHeading.closest('dialog')
    expect(editDialog).not.toBeNull()
    const editDialogScreen = within(editDialog)

    await user.clear(
      editDialogScreen.getByLabelText(/^user full name$/i, {
        selector: 'input#sa-customer-user-edit-name',
      }),
    )
    await user.click(editDialogScreen.getByLabelText(/^user$/i))
    await user.click(editDialogScreen.getByRole('button', { name: /^save changes$/i }))

    expect(editDialogScreen.getByText(/full name is required/i)).toBeInTheDocument()
    expect(editDialogScreen.getByText(/select at least one role/i)).toBeInTheDocument()
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('submits edit-user updates with name and roles via updateUser mutation', async () => {
    const user = userEvent.setup()
    const mockUpdateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { id: 'u-1', name: 'Taylor Updated' } }),
    })
    useUpdateUserMutation.mockReturnValue([mockUpdateUser, { isLoading: false }])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: [
            {
              id: 'u-1',
              name: 'Taylor User',
              email: 'taylor@example.com',
              customerRoles: ['USER'],
              isCanonicalAdmin: false,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          filters: {},
        },
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1, filters: {} },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /edit user taylor user/i }))

    const editHeading = screen.getByRole('heading', { name: /edit customer user/i })
    const editDialog = editHeading.closest('dialog')
    expect(editDialog).not.toBeNull()
    const editDialogScreen = within(editDialog)

    const fullNameInput = editDialogScreen.getByLabelText(/^user full name$/i, {
      selector: 'input#sa-customer-user-edit-name',
    })
    await user.clear(fullNameInput)
    await user.type(fullNameInput, 'Taylor Updated')
    await user.click(editDialogScreen.getByLabelText(/^customer admin$/i))
    await user.click(editDialogScreen.getByRole('button', { name: /^save changes$/i }))

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        userId: 'u-1',
        body: {
          name: 'Taylor Updated',
          roles: ['USER', 'CUSTOMER_ADMIN'],
        },
      })
    })
    expect(await screen.findByText(/taylor updated was updated successfully/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /edit customer user/i })).not.toBeInTheDocument()
  })

  it('maps edit-user 422 errors to field-level guidance', async () => {
    const user = userEvent.setup()
    const mockUpdateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 422,
        data: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Validation failed',
            details: {
              name: ['Name must be at least 2 characters.'],
              roles: ['Select at least one role.'],
            },
          },
        },
      }),
    })
    useUpdateUserMutation.mockReturnValue([mockUpdateUser, { isLoading: false }])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: [
            {
              id: 'u-1',
              name: 'Taylor User',
              email: 'taylor@example.com',
              customerRoles: ['USER'],
              isCanonicalAdmin: false,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          filters: {},
        },
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1, filters: {} },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /edit user taylor user/i }))

    const editHeading = screen.getByRole('heading', { name: /edit customer user/i })
    const editDialog = editHeading.closest('dialog')
    expect(editDialog).not.toBeNull()
    const editDialogScreen = within(editDialog)
    await user.click(editDialogScreen.getByRole('button', { name: /^save changes$/i }))

    expect(mockUpdateUser).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(/name must be at least 2 characters/i)).toBeInTheDocument()
    expect(screen.getByText(/select at least one role/i)).toBeInTheDocument()
  })

  it('maps canonical-admin role conflicts to actionable edit-user guidance', async () => {
    const user = userEvent.setup()
    const mockUpdateUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: {
          error: {
            code: 'CONFLICT',
            message: 'Request conflicts with the current state of the resource.',
            details: {
              canonicalAdminUserId: 'u-1',
            },
          },
        },
      }),
    })
    useUpdateUserMutation.mockReturnValue([mockUpdateUser, { isLoading: false }])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: [
            {
              id: 'u-1',
              name: 'Alex Admin',
              email: 'alex@example.com',
              customerRoles: ['CUSTOMER_ADMIN'],
              isCanonicalAdmin: true,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          filters: {},
        },
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1, filters: {} },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /edit user alex admin/i }))

    const editHeading = screen.getByRole('heading', { name: /edit customer user/i })
    const editDialog = editHeading.closest('dialog')
    expect(editDialog).not.toBeNull()
    const editDialogScreen = within(editDialog)
    await user.click(editDialogScreen.getByRole('button', { name: /^save changes$/i }))

    expect(mockUpdateUser).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(/canonical customer admin governance/i)).toBeInTheDocument()
    expect(screen.getByText(/assign\/replace admin flows/i)).toBeInTheDocument()
  })

  it('shows replace-admin entry in users workspace when canonical admin exists', async () => {
    const user = userEvent.setup()
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'c-1',
            name: 'Acme Corp',
            status: 'ACTIVE',
            topology: 'SINGLE_TENANT',
            governance: { customerAdminUserId: 'admin-1' },
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))

    expect(screen.getByRole('button', { name: /replace customer admin/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /assign customer admin/i })).not.toBeInTheDocument()
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /assign customer admin/i }))

    await user.type(screen.getByLabelText(/^full name$/i), 'Alex Admin')
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /assign customer admin/i }))

    const nameInput = screen.getByLabelText(/^full name$/i, { selector: 'input' })
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /assign customer admin/i }))
    await user.type(screen.getByLabelText(/^full name$/i), 'Alex Admin')
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /assign customer admin/i }))
    await user.type(screen.getByLabelText(/^full name$/i), 'Alex Admin')
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /assign customer admin/i }))
    await user.type(screen.getByLabelText(/^full name$/i), 'Alex Admin')
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
        data: [{
          id: 'c-1',
          name: 'Acme Corp',
          status: 'ACTIVE',
          topology: 'SINGLE_TENANT',
          governance: { customerAdminUserId: 'admin-1' },
        }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /replace customer admin/i }))

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
        data: [{
          id: 'c-1',
          name: 'Acme Corp',
          status: 'ACTIVE',
          topology: 'SINGLE_TENANT',
          governance: { customerAdminUserId: 'admin-1' },
        }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /replace customer admin/i }))
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
        data: [{
          id: 'c-1',
          name: 'Acme Corp',
          status: 'ACTIVE',
          topology: 'SINGLE_TENANT',
          governance: { customerAdminUserId: 'admin-1' },
        }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /replace customer admin/i }))
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

    // Open the assign-admin dialog from the customer users workspace
    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /assign customer admin/i }))

    // Fill invite form fields
    await user.type(screen.getByLabelText(/^full name$/i), 'Alex Admin')
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /assign customer admin/i }))
    await user.type(screen.getByLabelText(/^full name$/i), 'Alex Admin')
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
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /assign customer admin/i }))
    await user.type(screen.getByLabelText(/^full name$/i), 'Alex Admin')
    await user.type(screen.getByLabelText(/^email$/i), 'alex@example.com')
    await user.click(screen.getByRole('button', { name: /^send invitation$/i }))

    expect(screen.getByRole('tab', { name: /invitations/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(await screen.findByText('alex@example.com')).toBeInTheDocument()
  })

  it('deactivates an active customer user after confirmation', async () => {
    const user = userEvent.setup()
    const mockDisableUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { id: 'u-1', status: 'INACTIVE' } }),
    })
    useDisableUserMutation.mockReturnValue([mockDisableUser, { isLoading: false }])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: [
            {
              id: 'u-1',
              name: 'Alex Admin',
              email: 'alex@example.com',
              status: 'ACTIVE',
              trustStatus: 'TRUSTED',
              customerRoles: ['USER'],
              isCanonicalAdmin: false,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          filters: {},
        },
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1, filters: {} },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /deactivate alex admin/i }))

    const confirmHeading = screen.getByRole('heading', { name: /deactivate user/i })
    const confirmDialog = confirmHeading.closest('dialog')
    expect(confirmDialog).not.toBeNull()

    await user.click(within(confirmDialog).getByRole('button', { name: /^deactivate$/i }))

    expect(mockDisableUser).toHaveBeenCalledWith({ userId: 'u-1' })
    expect(await screen.findByText(/alex admin is now inactive\./i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /deactivate user/i })).not.toBeInTheDocument()
    })
  })

  it('reactivates an inactive user and surfaces untrusted trust-status guidance', async () => {
    const user = userEvent.setup()
    const mockEnableUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          id: 'u-2',
          status: 'ACTIVE',
          trustStatus: 'UNTRUSTED',
        },
      }),
    })
    useEnableUserMutation.mockReturnValue([mockEnableUser, { isLoading: false }])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: [
            {
              id: 'u-2',
              name: 'Taylor User',
              email: 'taylor@example.com',
              status: 'INACTIVE',
              trustStatus: 'REVOKED',
              customerRoles: ['USER'],
              isCanonicalAdmin: false,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          filters: {},
        },
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1, filters: {} },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /reactivate taylor user/i }))

    const confirmHeading = screen.getByRole('heading', { name: /reactivate user/i })
    const confirmDialog = confirmHeading.closest('dialog')
    expect(confirmDialog).not.toBeNull()

    await user.click(within(confirmDialog).getByRole('button', { name: /^reactivate$/i }))

    expect(mockEnableUser).toHaveBeenCalledWith({ userId: 'u-2' })
    expect(
      await screen.findByText(/taylor user is active, but trust is untrusted\./i),
    ).toBeInTheDocument()
  })

  it('archives an inactive user after confirmation', async () => {
    const user = userEvent.setup()
    const mockDeleteUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    })
    useDeleteUserMutation.mockReturnValue([mockDeleteUser, { isLoading: false }])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: [
            {
              id: 'u-2',
              name: 'Taylor User',
              email: 'taylor@example.com',
              status: 'INACTIVE',
              trustStatus: 'UNTRUSTED',
              customerRoles: ['USER'],
              isCanonicalAdmin: false,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          filters: {},
        },
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1, filters: {} },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /archive taylor user/i }))

    const confirmHeading = screen.getByRole('heading', { name: /archive user/i })
    const confirmDialog = confirmHeading.closest('dialog')
    expect(confirmDialog).not.toBeNull()

    await user.click(within(confirmDialog).getByRole('button', { name: /^archive$/i }))

    expect(mockDeleteUser).toHaveBeenCalledWith({ userId: 'u-2' })
    expect(await screen.findByText(/taylor user has been permanently removed\./i)).toBeInTheDocument()
  })

  it('shows canonical-admin governance guidance when deactivation is blocked', async () => {
    const user = userEvent.setup()
    const mockDisableUser = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: {
          error: {
            code: 'CONFLICT',
            message: 'Request conflicts with the current state of the resource.',
            details: {
              canonicalAdminUserId: 'u-1',
            },
          },
        },
      }),
    })
    useDisableUserMutation.mockReturnValue([mockDisableUser, { isLoading: false }])
    useListCustomersQuery.mockReturnValue({
      data: {
        data: [{ id: 'c-1', name: 'Acme Corp', status: 'ACTIVE', topology: 'SINGLE_TENANT' }],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: [
            {
              id: 'u-1',
              name: 'Alex Admin',
              email: 'alex@example.com',
              status: 'ACTIVE',
              trustStatus: 'TRUSTED',
              customerRoles: ['CUSTOMER_ADMIN'],
              isCanonicalAdmin: true,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          filters: {},
        },
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1, filters: {} },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))
    await user.click(screen.getByRole('button', { name: /deactivate alex admin/i }))

    const confirmHeading = screen.getByRole('heading', { name: /deactivate user/i })
    const confirmDialog = confirmHeading.closest('dialog')
    expect(confirmDialog).not.toBeNull()
    await user.click(within(confirmDialog).getByRole('button', { name: /^deactivate$/i }))

    expect(mockDisableUser).toHaveBeenCalledWith({ userId: 'u-1' })
    expect(await screen.findByText(/cannot deactivate user/i)).toBeInTheDocument()
    expect(
      screen.getByText(/this user is the canonical customer admin of an active customer\. replace admin first\./i),
    ).toBeInTheDocument()
  })

  it('status-gates lifecycle row actions in users workspace', async () => {
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
    useListUsersQuery.mockReturnValue({
      data: {
        data: {
          users: [
            {
              id: 'u-1',
              name: 'Alex Admin',
              email: 'alex@example.com',
              status: 'ACTIVE',
              trustStatus: 'TRUSTED',
              customerRoles: ['USER'],
              isCanonicalAdmin: false,
            },
            {
              id: 'u-2',
              name: 'Taylor User',
              email: 'taylor@example.com',
              status: 'INACTIVE',
              trustStatus: 'UNTRUSTED',
              customerRoles: ['USER'],
              isCanonicalAdmin: false,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 2,
          totalPages: 1,
          filters: {},
        },
        meta: { page: 1, pageSize: 20, total: 2, totalPages: 1, filters: {} },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /actions for acme corp/i }))
    await user.click(screen.getByRole('menuitem', { name: /view users acme corp/i }))

    expect(screen.getByRole('button', { name: /deactivate alex admin/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /reactivate alex admin/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /archive alex admin/i })).toBeDisabled()

    expect(screen.getByRole('button', { name: /deactivate taylor user/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /reactivate taylor user/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /archive taylor user/i })).toBeEnabled()
  })
})

