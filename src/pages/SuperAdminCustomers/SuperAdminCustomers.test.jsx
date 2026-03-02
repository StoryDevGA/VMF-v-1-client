import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

function renderPage() {
  return render(
    <ToasterProvider>
      <SuperAdminCustomers />
    </ToasterProvider>,
  )
}

describe('SuperAdminCustomers page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
  })

  it('renders heading and create form controls', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /customers/i })).toBeInTheDocument()
    expect(screen.getAllByLabelText(/customer name/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/licence level/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /create customer/i })).toBeInTheDocument()
  })
})
