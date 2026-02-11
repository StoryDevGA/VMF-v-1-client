/**
 * System Monitoring API Slice (RTK Query)
 *
 * Frontend Spec §5.2 / §8:
 * - System health status
 * - Dependency monitoring
 * - Performance metrics
 */

import { baseApi } from './baseApi.js'

export const systemApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * GET /health
     * Public health summary endpoint.
     * Uses ../../ to break out of the /api/v1 baseUrl prefix.
     */
    getSystemHealth: build.query({
      query: () => '../../health',
      providesTags: [{ type: 'System', id: 'HEALTH' }],
    }),

    /**
     * GET /health/detailed
     * Detailed dependency health endpoint (SUPER_ADMIN intended).
     */
    getDetailedHealth: build.query({
      query: () => '../../health/detailed',
      providesTags: [{ type: 'System', id: 'DETAILED' }],
    }),

    /**
     * GET /metrics
     * Prometheus metrics endpoint (SUPER_ADMIN only).
     */
    getSystemMetrics: build.query({
      query: () => '../../metrics',
      providesTags: [{ type: 'System', id: 'METRICS' }],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetSystemHealthQuery,
  useGetDetailedHealthQuery,
  useGetSystemMetricsQuery,
} = systemApi
