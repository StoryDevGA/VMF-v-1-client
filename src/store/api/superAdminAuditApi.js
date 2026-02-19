/**
 * Super Admin Audit API Slice
 *
 * Access-denied visibility endpoints.
 */

import { baseApi } from './baseApi.js'

const auditListTag = { type: 'AuditLog', id: 'DENIED_ACCESS_LIST' }

export const superAdminAuditApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listDeniedAccessLogs: build.query({
      query: ({
        page = 1,
        pageSize = 20,
        actorUserId = '',
        startDate = '',
        endDate = '',
      } = {}) => ({
        url: '/super-admin/denied-access-logs',
        params: {
          page,
          pageSize,
          ...(actorUserId ? { actorUserId } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        },
      }),
      providesTags: [auditListTag],
    }),
  }),
  overrideExisting: false,
})

export const { useListDeniedAccessLogsQuery } = superAdminAuditApi
