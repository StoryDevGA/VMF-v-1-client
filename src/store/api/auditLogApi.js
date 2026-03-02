/**
 * Audit Log API Slice
 *
 * SUPER_ADMIN endpoints for audit-log query and integrity verification.
 */

import { baseApi } from './baseApi.js'

const auditListTag = { type: 'AuditLog', id: 'LIST' }
const auditStatsTag = { type: 'AuditLog', id: 'STATS' }

export const auditLogApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    queryAuditLogs: build.query({
      query: ({
        customerId = '',
        tenantId = '',
        actorUserId = '',
        action = '',
        resourceType = '',
        resourceId = '',
        requestId = '',
        startDate = '',
        endDate = '',
        page = 1,
        pageSize = 50,
      } = {}) => ({
        url: '/audit-logs',
        params: {
          page,
          pageSize,
          ...(customerId ? { customerId } : {}),
          ...(tenantId ? { tenantId } : {}),
          ...(actorUserId ? { actorUserId } : {}),
          ...(action ? { action } : {}),
          ...(resourceType ? { resourceType } : {}),
          ...(resourceId ? { resourceId } : {}),
          ...(requestId ? { requestId } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        },
      }),
      providesTags: [auditListTag],
    }),

    getAuditStats: build.query({
      query: ({ customerId = '', startDate = '', endDate = '' } = {}) => ({
        url: '/audit-logs/stats',
        params: {
          ...(customerId ? { customerId } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        },
      }),
      providesTags: [auditStatsTag],
    }),

    getAuditLogsByRequest: build.query({
      query: (requestId) => `/audit-logs/request/${requestId}`,
      providesTags: (_result, _error, requestId) => [
        { type: 'AuditLog', id: `REQUEST:${requestId}` },
      ],
    }),

    getAuditLogsByResource: build.query({
      query: ({ resourceType, resourceId, page = 1, pageSize = 50 }) => ({
        url: `/audit-logs/resource/${resourceType}/${resourceId}`,
        params: { page, pageSize },
      }),
      providesTags: (_result, _error, { resourceType, resourceId }) => [
        { type: 'AuditLog', id: `RESOURCE:${resourceType}:${resourceId}` },
      ],
    }),

    verifyAuditIntegrity: build.mutation({
      query: (body) => ({
        url: '/audit-logs/verify',
        method: 'POST',
        body,
      }),
      invalidatesTags: [auditListTag, auditStatsTag],
    }),
  }),
  overrideExisting: false,
})

export const {
  useQueryAuditLogsQuery,
  useGetAuditStatsQuery,
  useLazyGetAuditLogsByRequestQuery,
  useLazyGetAuditLogsByResourceQuery,
  useVerifyAuditIntegrityMutation,
} = auditLogApi

