/**
 * System Monitoring API Slice (RTK Query)
 *
 * Frontend Spec §5.2 / §8:
 * - System health status
 * - Dependency monitoring
 * - Performance metrics
 * - Health trends
 * - Alert lifecycle
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
      query: () => ({
        url: '../../metrics',
        responseHandler: 'text',
      }),
      providesTags: [{ type: 'System', id: 'METRICS' }],
    }),

    /**
     * GET /health/trends
     * Time-bucketed performance trends (SUPER_ADMIN only).
     */
    getHealthTrends: build.query({
      query: ({ window = '1h', bucket = '1m' } = {}) => ({
        url: '../../health/trends',
        params: { window, bucket },
      }),
      providesTags: [{ type: 'System', id: 'TRENDS' }],
    }),

    /**
     * GET /health/alerts
     * Alert lifecycle feed (SUPER_ADMIN only).
     */
    getHealthAlerts: build.query({
      query: ({ status = 'active', limit = 100 } = {}) => ({
        url: '../../health/alerts',
        params: { status, limit },
      }),
      providesTags: (_result, _error, { status = 'active' } = {}) => [
        { type: 'System', id: `ALERTS-${String(status).toUpperCase()}` },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetSystemHealthQuery,
  useGetDetailedHealthQuery,
  useGetSystemMetricsQuery,
  useGetHealthTrendsQuery,
  useGetHealthAlertsQuery,
} = systemApi
