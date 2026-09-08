/**
 * Tenant API Slice (RTK Query)
 *
 * Injects tenant-management endpoints into the base API.
 * Handles listing, creating, updating, enabling, and disabling tenants.
 *
 * All tenant endpoints align with BACKEND-SPEC §9.2.
 *
 * Customer-scoped routes:
 *   GET  /customers/:customerId/tenants       — list tenants
 *   POST /customers/:customerId/tenants       — create tenant
 *
 * Tenant-scoped routes (SUPER_ADMIN):
 *   PATCH /tenants/:tenantId                  — update tenant
 *   POST  /tenants/:tenantId/enable           — enable tenant
 *   POST  /tenants/:tenantId/disable          — disable tenant
 */

import { baseApi } from './baseApi.js'
import { getSessionRevision } from '../../utils/tokenStorage.js'

const getScopedTenantMutationUrl = (customerId, tenantId, suffix = '') =>
  customerId
    ? `/customers/${customerId}/tenants/${tenantId}${suffix}`
    : `/tenants/${tenantId}${suffix}`

// The context switcher needs a complete catalogue; ordinary list views stay paginated.
export const fetchTenantContextCatalogue = async ({ customerId }, api, _extraOptions, baseQuery) => {
  const session = getSessionRevision()
  const incomplete = () => ({ error: { status: 'CUSTOM_ERROR', error: 'Incomplete tenant catalogue', data: {
    code: 'TENANT_CONTEXT_INCOMPLETE', message: 'The tenant list could not be loaded completely. Try again.',
  } } })
  const tenants = []
  const ids = new Set()
  let firstMeta
  for (let page = 1; page <= 100; page += 1) {
    if (api.signal?.aborted) return { error: { status: 'FETCH_ERROR', error: 'AbortError' } }
    if (session !== getSessionRevision()) return incomplete()
    const result = await baseQuery(`/customers/${customerId}/tenants?page=${page}&pageSize=100`)
    if (session !== getSessionRevision()) return incomplete()
    if (api.signal?.aborted) return { error: { status: 'FETCH_ERROR', error: 'AbortError' } }
    if (result.error) return result
    const { data, meta } = result.data || {}
    if (!Array.isArray(data) || !Number.isInteger(meta?.total) || meta.total < 0
      || meta.page !== page || meta.pageSize !== 100 || meta.totalPages !== Math.ceil(meta.total / 100)
      || meta.totalPages > 100 || (firstMeta && (meta.total !== firstMeta.total || meta.totalPages !== firstMeta.totalPages))) return incomplete()
    firstMeta ||= meta
    for (const tenant of data) {
      const id = tenant?.id ?? tenant?._id
      if (!id || ids.has(String(id))) return incomplete()
      ids.add(String(id))
      tenants.push(tenant)
    }
    if (page >= meta.totalPages) return tenants.length === meta.total
      ? { data: { data: tenants, meta: { ...firstMeta, customerId, complete: true } } }
      : incomplete()
    if (data.length !== 100) return incomplete()
  }
  return incomplete()
}

export const tenantApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    tenantContextCatalogue: build.query({
      queryFn: fetchTenantContextCatalogue,
      providesTags: (result) => [
        ...(result?.data || []).map((tenant) => ({ type: 'Tenant', id: tenant.id ?? tenant._id })),
        { type: 'Tenant', id: 'LIST' },
      ],
    }),
    /**
     * GET /customers/:customerId/tenants
     * Paginated tenant list with optional search and status filter.
     *
     * @param {{ customerId: string, q?: string, status?: string, page?: number, pageSize?: number }} params
     */
    listTenants: build.query({
      query: ({ customerId, q, status, page = 1, pageSize = 20 }) => {
        const params = new URLSearchParams()
        if (q) params.set('q', q)
        if (status) params.set('status', status)
        params.set('page', String(page))
        params.set('pageSize', String(pageSize))
        return `/customers/${customerId}/tenants?${params.toString()}`
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((t) => ({ type: 'Tenant', id: t.id ?? t._id })),
              { type: 'Tenant', id: 'LIST' },
            ]
          : [{ type: 'Tenant', id: 'LIST' }],
    }),

    /**
     * POST /customers/:customerId/tenants
     * Creates a new tenant under the given customer.
     *
     * @param {{ customerId: string, body: { name: string, website: string, tenantAdminUserIds: string[] } }} params
     */
    createTenant: build.mutation({
      query: ({ customerId, body }) => ({
        url: `/customers/${customerId}/tenants`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Tenant', id: 'LIST' },
        { type: 'User', id: 'LIST' },
      ],
    }),

    /**
     * PATCH /customers/:customerId/tenants/:tenantId
     * PATCH /tenants/:tenantId
     * Updates tenant name, website, or admin user IDs.
     * Customer-admin flows use the customer-scoped route; super-admin flows
     * keep the entity-scoped fallback.
     *
     * @param {{ customerId?: string, tenantId: string, body: { name?: string, website?: string, tenantAdminUserIds?: string[] } }} params
     */
    updateTenant: build.mutation({
      query: ({ customerId, tenantId, body }) => ({
        url: getScopedTenantMutationUrl(customerId, tenantId),
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'Tenant', id: tenantId },
        { type: 'Tenant', id: 'LIST' },
        { type: 'User', id: 'LIST' },
      ],
    }),

    /**
     * POST /customers/:customerId/tenants/:tenantId/enable
     * POST /tenants/:tenantId/enable
     * Re-enables a disabled tenant.
     * Customer-admin flows use the customer-scoped route; super-admin flows
     * keep the entity-scoped fallback.
     *
     * @param {{ customerId?: string, tenantId: string }} params
     */
    enableTenant: build.mutation({
      query: ({ customerId, tenantId }) => ({
        url: getScopedTenantMutationUrl(customerId, tenantId, '/enable'),
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'Tenant', id: tenantId },
        { type: 'Tenant', id: 'LIST' },
      ],
    }),

    /**
     * POST /customers/:customerId/tenants/:tenantId/disable
     * POST /tenants/:tenantId/disable
     * Disables a tenant with immediate effect.
     * Customer-admin flows use the customer-scoped route; super-admin flows
     * keep the entity-scoped fallback.
     *
     * @param {{ customerId?: string, tenantId: string }} params
     */
    disableTenant: build.mutation({
      query: ({ customerId, tenantId }) => ({
        url: getScopedTenantMutationUrl(customerId, tenantId, '/disable'),
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'Tenant', id: tenantId },
        { type: 'Tenant', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useTenantContextCatalogueQuery,
  useListTenantsQuery,
  useLazyListTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useEnableTenantMutation,
  useDisableTenantMutation,
} = tenantApi
