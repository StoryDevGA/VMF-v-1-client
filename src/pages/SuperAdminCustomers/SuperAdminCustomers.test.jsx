import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
  useAssignAdminMutation: vi.fn(),
  useReplaceCustomerAdminMutation: vi.fn(),
}))

vi.mock('../../store/api/licenseLevelApi.js', () => ({
  useListLicenseLevelsQuery: vi.fn(),
}))

vi.mock('../../store/api/invitationApi.js', () => ({
  useListInvitationsQuery: vi.fn(),
  useCreateInvitationMutation: vi.fn(),
  useResendInvitationMutation: vi.fn(),
  useRevokeInvitationMutation: vi.fn(),
}))

vi.mock('../../components/StepUpAuthForm', () => ({
  StepUpAuthForm: () => <div>StepUpAuthForm</div>,
}))

import {
  useListCustomersQuery,
  useCreateCustomerMutation,
  useGetCustomerQuery,
  useUpdateCustomerMutation,
  useUpdateCustomerStatusMutation,
  useAssignAdminMutation,
  useReplaceCustomerAdminMutation,
} from '../../store/api/customerApi.js'
import { useListLicenseLevelsQuery } from '../../store/api/licenseLevelApi.js'
import {
  useListInvitationsQuery,
  useCreateInvitationMutation,
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
    useAssignAdminMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useReplaceCustomerAdminMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useListInvitationsQuery.mockReturnValue({
      data: { data: [], meta: { page: 1, totalPages: 1 } },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    useCreateInvitationMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useResendInvitationMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useRevokeInvitationMutation.mockReturnValue([vi.fn(), { isLoading: false }])
  })

  it('renders customer admin workspace and defaults to customers view', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /customer admin/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /customers/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: /^customers$/i })).toBeInTheDocument()
    expect(screen.getAllByLabelText(/customer name/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/licence level/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /create customer/i })).toBeInTheDocument()
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

  it('switches to invitations tab after a successful assign-admin action', async () => {
    const user = userEvent.setup()
    const mockAssignAdmin = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) })
    useAssignAdminMutation.mockReturnValue([mockAssignAdmin, { isLoading: false }])
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

    // Open the assign admin dialog from the customer row
    await user.click(screen.getByRole('button', { name: /assign admin acme corp/i }))

    // Fill in the required User ID field
    await user.type(screen.getByLabelText(/^user id$/i), 'user-abc-123')

    // Submit the dialog
    await user.click(screen.getByRole('button', { name: /^assign admin$/i }))

    // After success the workspace should switch to the Invitations tab
    expect(screen.getByRole('tab', { name: /invitations/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
