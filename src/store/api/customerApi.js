/**
 * Customer API Slice
 *
 * RTK Query endpoints for customer management.
 * All endpoints require SUPER_ADMIN role.
 *
 * Endpoints:
 *   - listCustomers      GET  /api/v1/customers
 *   - createCustomer     POST /api/v1/customers
 *   - onboardCustomer    POST /api/v1/super-admin/customers/onboard
 *   - getCustomer        GET  /api/v1/customers/:customerId
 *   - updateCustomer     PATCH /api/v1/customers/:customerId
 *   - updateCustomerStatus PATCH /api/v1/customers/:customerId/status
 *   - assignAdmin        POST /api/v1/customers/:customerId/admins
 *   - replaceCustomerAdmin POST /api/v1/customers/:customerId/admins/replace
 *
 * @module store/api/customerApi
 * @see BACKEND-SPEC.md Customer Management
 */

import { baseApi } from './baseApi.js'

const CUSTOMER_STATUS_MAP = {
  DISABLED: 'INACTIVE',
}

/**
 * Normalize customer lifecycle status for API requests.
 * Keeps compatibility with legacy `DISABLED` callers.
 *
 * @param {string} status
 * @returns {string}
 */
export const normalizeCustomerStatus = (status) => {
  const normalizedStatus = String(status ?? '')
    .trim()
    .toUpperCase()

  if (!normalizedStatus) return ''
  return CUSTOMER_STATUS_MAP[normalizedStatus] ?? normalizedStatus
}

/**
 * Remove empty-string and undefined values from governance payload.
 * This keeps optional fields truly optional while preserving provided values.
 *
 * @param {Record<string, unknown>} governance
 * @returns {Record<string, unknown>}
 */
const sanitizeGovernance = (governance) =>
  Object.fromEntries(
    Object.entries(governance).filter(([, value]) => value !== undefined && value !== ''),
  )

/**
 * Normalize create/update payload for customer governance fields.
 *
 * @param {Record<string, unknown>} payload
 * @param {{ stripCanonicalAdminUserId?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
export const normalizeCustomerPayload = (
  payload = {},
  { stripCanonicalAdminUserId = false } = {},
) => {
  const normalizedPayload = { ...payload }

  if (normalizedPayload.licenseLevelId === '') {
    delete normalizedPayload.licenseLevelId
  }

  if (
    normalizedPayload.governance &&
    typeof normalizedPayload.governance === 'object' &&
    !Array.isArray(normalizedPayload.governance)
  ) {
    const governance = { ...normalizedPayload.governance }

    if (stripCanonicalAdminUserId) {
      delete governance.customerAdminUserId
    }

    const sanitizedGovernance = sanitizeGovernance(governance)
    if (Object.keys(sanitizedGovernance).length > 0) {
      normalizedPayload.governance = sanitizedGovernance
    } else {
      delete normalizedPayload.governance
    }
  }

  return normalizedPayload
}

export const customerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ---- List Customers ---- */
    listCustomers: builder.query({
      query: ({ page = 1, pageSize = 20, q = '', status = '', topology = '' } = {}) => {
        const normalizedStatus = normalizeCustomerStatus(status)
        const params = new URLSearchParams()
        params.set('page', page)
        params.set('pageSize', pageSize)
        if (q) params.set('q', q)
        if (normalizedStatus) params.set('status', normalizedStatus)
        if (topology) params.set('topology', topology)
        return `/customers?${params}`
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ _id }) => ({ type: 'Customer', id: _id })),
              { type: 'Customer', id: 'LIST' },
            ]
          : [{ type: 'Customer', id: 'LIST' }],
    }),

    /* ---- Create Customer ---- */
    createCustomer: builder.mutation({
      query: (body) => ({
        url: '/customers',
        method: 'POST',
        body: normalizeCustomerPayload(body),
      }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }],
    }),

    /* ---- Transactional Onboarding ---- */
    onboardCustomer: builder.mutation({
      query: (body) => ({
        url: '/super-admin/customers/onboard',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Customer', id: 'LIST' },
        { type: 'User', id: 'LIST' },
        { type: 'Tenant', id: 'LIST' },
        { type: 'VMF', id: 'LIST' },
      ],
    }),

    /* ---- Get Single Customer ---- */
    getCustomer: builder.query({
      query: (customerId) => `/customers/${customerId}`,
      providesTags: (result, error, customerId) => [{ type: 'Customer', id: customerId }],
    }),

    /* ---- Update Customer ---- */
    updateCustomer: builder.mutation({
      query: ({ customerId, ...body }) => ({
        url: `/customers/${customerId}`,
        method: 'PATCH',
        body: normalizeCustomerPayload(body, { stripCanonicalAdminUserId: true }),
      }),
      invalidatesTags: (result, error, { customerId }) => [
        { type: 'Customer', id: customerId },
        { type: 'Customer', id: 'LIST' },
      ],
    }),

    /* ---- Update Customer Status ---- */
    updateCustomerStatus: builder.mutation({
      query: ({ customerId, status }) => ({
        url: `/customers/${customerId}/status`,
        method: 'PATCH',
        body: { status: normalizeCustomerStatus(status) },
      }),
      invalidatesTags: (result, error, { customerId }) => [
        { type: 'Customer', id: customerId },
        { type: 'Customer', id: 'LIST' },
      ],
    }),

    /* ---- Assign Customer Admin ----
     * Returns 409 when active canonical admin already exists.
     * Success payload includes `canonicalAdminUserId`.
     */
    assignAdmin: builder.mutation({
      query: ({ customerId, userId }) => ({
        url: `/customers/${customerId}/admins`,
        method: 'POST',
        body: { userId },
      }),
      invalidatesTags: (result, error, { customerId }) => [
        { type: 'Customer', id: customerId },
        { type: 'User', id: 'LIST' },
      ],
    }),

    /* ---- Replace Customer Admin (step-up required)
     * Canonical-pointer replacement flow with deterministic 422/409 errors.
     */
    replaceCustomerAdmin: builder.mutation({
      query: ({ customerId, newUserId, reason, stepUpToken }) => ({
        url: `/customers/${customerId}/admins/replace`,
        method: 'POST',
        body: { newUserId, reason },
        headers: { 'X-Step-Up-Token': stepUpToken },
      }),
      invalidatesTags: (result, error, { customerId }) => [
        { type: 'Customer', id: customerId },
        { type: 'User', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useListCustomersQuery,
  useLazyListCustomersQuery,
  useCreateCustomerMutation,
  useOnboardCustomerMutation,
  useGetCustomerQuery,
  useUpdateCustomerMutation,
  useUpdateCustomerStatusMutation,
  useAssignAdminMutation,
  useReplaceCustomerAdminMutation,
} = customerApi
