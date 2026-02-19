/**
 * Customer API Slice
 *
 * RTK Query endpoints for customer management.
 * All endpoints require SUPER_ADMIN role.
 *
 * Endpoints:
 *   - listCustomers      GET  /api/v1/customers
 *   - createCustomer     POST /api/v1/customers
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

export const customerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ---- List Customers ---- */
    listCustomers: builder.query({
      query: ({ page = 1, pageSize = 20, q = '', status = '' } = {}) => {
        const params = new URLSearchParams()
        params.set('page', page)
        params.set('pageSize', pageSize)
        if (q) params.set('q', q)
        if (status) params.set('status', status)
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
        body,
      }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }],
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
        body,
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
        body: { status },
      }),
      invalidatesTags: (result, error, { customerId }) => [
        { type: 'Customer', id: customerId },
        { type: 'Customer', id: 'LIST' },
      ],
    }),

    /* ---- Assign Customer Admin ---- */
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

    /* ---- Replace Customer Admin (step-up required) ---- */
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
  useGetCustomerQuery,
  useUpdateCustomerMutation,
  useUpdateCustomerStatusMutation,
  useAssignAdminMutation,
  useReplaceCustomerAdminMutation,
} = customerApi
