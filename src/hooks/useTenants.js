/**
 * useTenants Hook
 *
 * Facade hook wrapping the RTK Query tenant endpoints from `tenantApi.js`.
 * Provides a convenient API for tenant management components.
 *
 * @example
 * const { tenants, pagination, isLoading, createTenant, enableTenant } = useTenants(customerId)
 */

import { useState, useCallback, useMemo } from 'react'
import {
  useListTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useEnableTenantMutation,
  useDisableTenantMutation,
} from '../store/api/tenantApi.js'

/**
 * @param {string} customerId - The customer to manage tenants for
 * @param {Object}  [options]
 * @param {number}  [options.pageSize=20] - Page size for list queries
 * @returns {{
 *   tenants: Array,
 *   pagination: { page: number, pageSize: number, total: number, totalPages: number },
 *   isLoading: boolean,
 *   isFetching: boolean,
 *   error: object|null,
 *   search: string,
 *   setSearch: Function,
 *   statusFilter: string,
 *   setStatusFilter: Function,
 *   page: number,
 *   setPage: Function,
 *   createTenant: Function,
 *   createTenantResult: object,
 *   updateTenant: Function,
 *   updateTenantResult: object,
 *   enableTenant: Function,
 *   enableTenantResult: object,
 *   disableTenant: Function,
 *   disableTenantResult: object,
 * }}
 */
export function useTenants(customerId, options = {}) {
  const { pageSize = 20 } = options

  /* ---- Local filter / pagination state ---- */
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  /* ---- RTK Query: list tenants ---- */
  const {
    data: listData,
    isLoading,
    isFetching,
    error: listError,
  } = useListTenantsQuery(
    {
      customerId,
      q: search || undefined,
      status: statusFilter || undefined,
      page,
      pageSize,
    },
    { skip: !customerId },
  )

  const tenants = useMemo(() => listData?.data ?? [], [listData])

  const pagination = useMemo(
    () => ({
      page: listData?.meta?.page ?? page,
      pageSize: listData?.meta?.pageSize ?? pageSize,
      total: listData?.meta?.total ?? 0,
      totalPages: listData?.meta?.totalPages ?? 0,
    }),
    [listData, page, pageSize],
  )

  /* ---- Mutations ---- */
  const [createTenantMutation, createTenantResult] = useCreateTenantMutation()
  const [updateTenantMutation, updateTenantResult] = useUpdateTenantMutation()
  const [enableTenantMutation, enableTenantResult] = useEnableTenantMutation()
  const [disableTenantMutation, disableTenantResult] = useDisableTenantMutation()

  /** Create a tenant within the current customer */
  const createTenant = useCallback(
    (body) => createTenantMutation({ customerId, body }).unwrap(),
    [createTenantMutation, customerId],
  )

  /** Update tenant by ID */
  const updateTenant = useCallback(
    (tenantId, body) => updateTenantMutation({ tenantId, body }).unwrap(),
    [updateTenantMutation],
  )

  /** Enable tenant by ID */
  const enableTenant = useCallback(
    (tenantId) => enableTenantMutation({ tenantId }).unwrap(),
    [enableTenantMutation],
  )

  /** Disable tenant by ID */
  const disableTenant = useCallback(
    (tenantId) => disableTenantMutation({ tenantId }).unwrap(),
    [disableTenantMutation],
  )

  return {
    // List data
    tenants,
    pagination,
    isLoading,
    isFetching,
    error: listError ?? null,

    // Search & filter state
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,

    // Mutations
    createTenant,
    createTenantResult,
    updateTenant,
    updateTenantResult,
    enableTenant,
    enableTenantResult,
    disableTenant,
    disableTenantResult,
  }
}

export default useTenants
