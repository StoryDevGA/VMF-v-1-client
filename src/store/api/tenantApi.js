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

export const tenantApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
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
              ...result.data.map((t) => ({ type: 'Tenant', id: t._id })),
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
      invalidatesTags: [{ type: 'Tenant', id: 'LIST' }],
    }),

    /**
     * PATCH /tenants/:tenantId
     * Updates tenant name, website, or admin user IDs.
     *
     * @param {{ tenantId: string, body: { name?: string, website?: string, tenantAdminUserIds?: string[] } }} params
     */
    updateTenant: build.mutation({
      query: ({ tenantId, body }) => ({
        url: `/tenants/${tenantId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'Tenant', id: tenantId },
        { type: 'Tenant', id: 'LIST' },
      ],
    }),

    /**
     * POST /tenants/:tenantId/enable
     * Re-enables a disabled tenant.
     *
     * @param {{ tenantId: string }} params
     */
    enableTenant: build.mutation({
      query: ({ tenantId }) => ({
        url: `/tenants/${tenantId}/enable`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'Tenant', id: tenantId },
        { type: 'Tenant', id: 'LIST' },
      ],
    }),

    /**
     * POST /tenants/:tenantId/disable
     * Disables a tenant with immediate effect.
     *
     * @param {{ tenantId: string }} params
     */
    disableTenant: build.mutation({
      query: ({ tenantId }) => ({
        url: `/tenants/${tenantId}/disable`,
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
  useListTenantsQuery,
  useLazyListTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useEnableTenantMutation,
  useDisableTenantMutation,
} = tenantApi
