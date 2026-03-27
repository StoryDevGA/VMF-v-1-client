import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockUseListTenantsQuery,
  mockUseDisableTenantMutation,
} = vi.hoisted(() => ({
  mockUseListTenantsQuery: vi.fn(),
  mockUseDisableTenantMutation: vi.fn(),
}))

vi.mock('../store/api/tenantApi.js', () => ({
  useListTenantsQuery: (...args) => mockUseListTenantsQuery(...args),
  useCreateTenantMutation: () => [vi.fn(), {}],
  useUpdateTenantMutation: () => [vi.fn(), {}],
  useEnableTenantMutation: () => [vi.fn(), {}],
  useDisableTenantMutation: (...args) => mockUseDisableTenantMutation(...args),
}))

import { useTenants } from './useTenants.js'

describe('useTenants', () => {
  beforeEach(() => {
    mockUseListTenantsQuery.mockReset()
    mockUseDisableTenantMutation.mockReset()
    mockUseListTenantsQuery.mockReturnValue({
      data: {
        data: [
          { _id: 'tenant-1', name: 'North Hub', status: 'ENABLED' },
          { _id: 'tenant-2', name: 'South Hub', status: 'DISABLED' },
        ],
        meta: {
          page: 1,
          pageSize: 20,
          total: 2,
          totalPages: 1,
          tenantCapacity: {
            maxTenants: 5,
            currentCount: 2,
            remainingCount: 3,
            isAtCapacity: false,
            countMode: 'ACTIVE',
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    mockUseDisableTenantMutation.mockReturnValue([vi.fn(), { isLoading: false }])
  })

  it('returns the customer-scoped tenant list and normalized capacity metadata', () => {
    const { result } = renderHook(() => useTenants('cust-1'))

    expect(result.current.tenants).toHaveLength(2)
    expect(result.current.tenantCapacity).toEqual({
      maxTenants: 5,
      currentCount: 2,
      remainingCount: 3,
      isAtCapacity: false,
      countMode: 'ACTIVE',
    })
    expect(mockUseListTenantsQuery).toHaveBeenCalledWith(
      {
        customerId: 'cust-1',
        q: undefined,
        status: undefined,
        page: 1,
        pageSize: 20,
      },
      { skip: false },
    )
  })

  it('passes customer scope through the disableTenant mutation facade', async () => {
    const disableTenantMutation = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { _id: 'tenant-1', status: 'DISABLED' } }),
    })
    mockUseDisableTenantMutation.mockReturnValue([disableTenantMutation, { isLoading: false }])

    const { result } = renderHook(() => useTenants('cust-1'))

    await act(async () => {
      await result.current.disableTenant('tenant-1')
    })

    expect(disableTenantMutation).toHaveBeenCalledWith({
      customerId: 'cust-1',
      tenantId: 'tenant-1',
    })
    expect(result.current.disableTenantResult.isLoading).toBe(false)
  })

  it('skips the list query when only tenant mutation facades are needed', () => {
    renderHook(() => useTenants('cust-1', { skipListQuery: true }))

    expect(mockUseListTenantsQuery).toHaveBeenCalledWith(
      {
        customerId: 'cust-1',
        q: undefined,
        status: undefined,
        page: 1,
        pageSize: 20,
      },
      { skip: true },
    )
  })

  it('resets search, status, and page when the active customer changes', async () => {
    const { result, rerender } = renderHook(
      ({ customerId }) => useTenants(customerId),
      { initialProps: { customerId: 'cust-1' } },
    )

    act(() => {
      result.current.setSearch('Alpha')
      result.current.setStatusFilter('ENABLED')
      result.current.setPage(3)
    })

    expect(mockUseListTenantsQuery).toHaveBeenLastCalledWith(
      {
        customerId: 'cust-1',
        q: 'Alpha',
        status: 'ENABLED',
        page: 3,
        pageSize: 20,
      },
      { skip: false },
    )

    rerender({ customerId: 'cust-2' })

    await waitFor(() => {
      expect(result.current.search).toBe('')
      expect(result.current.statusFilter).toBe('')
      expect(result.current.page).toBe(1)
      expect(mockUseListTenantsQuery).toHaveBeenLastCalledWith(
        {
          customerId: 'cust-2',
          q: undefined,
          status: undefined,
          page: 1,
          pageSize: 20,
        },
        { skip: false },
      )
    })
  })

  it('rejects customer-admin tenant lifecycle actions when customer scope is missing', async () => {
    const disableTenantMutation = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { _id: 'tenant-1', status: 'DISABLED' } }),
    })
    mockUseDisableTenantMutation.mockReturnValue([disableTenantMutation, { isLoading: false }])

    const { result } = renderHook(() => useTenants())

    await act(async () => {
      await expect(result.current.disableTenant('tenant-1')).rejects.toMatchObject({
        status: 400,
        data: {
          error: {
            code: 'CUSTOMER_CONTEXT_REQUIRED',
          },
        },
      })
    })

    expect(disableTenantMutation).not.toHaveBeenCalled()
  })
})
