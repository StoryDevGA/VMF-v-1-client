import { describe, expect, it } from 'vitest'
import {
  systemApi,
  useGetSystemHealthQuery,
  useGetDetailedHealthQuery,
  useGetSystemMetricsQuery,
  useGetHealthTrendsQuery,
  useGetHealthAlertsQuery,
} from './systemApi.js'

describe('systemApi', () => {
  it('exposes monitoring endpoints', () => {
    expect(systemApi.endpoints).toHaveProperty('getSystemHealth')
    expect(systemApi.endpoints).toHaveProperty('getDetailedHealth')
    expect(systemApi.endpoints).toHaveProperty('getSystemMetrics')
    expect(systemApi.endpoints).toHaveProperty('getHealthTrends')
    expect(systemApi.endpoints).toHaveProperty('getHealthAlerts')
  })

  it('exports query hooks', () => {
    expect(typeof useGetSystemHealthQuery).toBe('function')
    expect(typeof useGetDetailedHealthQuery).toBe('function')
    expect(typeof useGetSystemMetricsQuery).toBe('function')
    expect(typeof useGetHealthTrendsQuery).toBe('function')
    expect(typeof useGetHealthAlertsQuery).toBe('function')
  })

  it('getSystemHealth endpoint should have initiate', () => {
    expect(systemApi.endpoints.getSystemHealth).toBeDefined()
    expect(typeof systemApi.endpoints.getSystemHealth.initiate).toBe('function')
  })

  it('getDetailedHealth endpoint should have initiate', () => {
    expect(systemApi.endpoints.getDetailedHealth).toBeDefined()
    expect(typeof systemApi.endpoints.getDetailedHealth.initiate).toBe('function')
  })

  it('getSystemMetrics endpoint should have initiate', () => {
    expect(systemApi.endpoints.getSystemMetrics).toBeDefined()
    expect(typeof systemApi.endpoints.getSystemMetrics.initiate).toBe('function')
  })

  it('getHealthTrends endpoint should have initiate', () => {
    expect(systemApi.endpoints.getHealthTrends).toBeDefined()
    expect(typeof systemApi.endpoints.getHealthTrends.initiate).toBe('function')
  })

  it('getHealthAlerts endpoint should have initiate', () => {
    expect(systemApi.endpoints.getHealthAlerts).toBeDefined()
    expect(typeof systemApi.endpoints.getHealthAlerts.initiate).toBe('function')
  })

  it('endpoints are defined as expected count', () => {
    const keys = Object.keys(systemApi.endpoints).filter(
      (k) =>
        [
          'getSystemHealth',
          'getDetailedHealth',
          'getSystemMetrics',
          'getHealthTrends',
          'getHealthAlerts',
        ].includes(k),
    )
    expect(keys).toHaveLength(5)
  })
})
