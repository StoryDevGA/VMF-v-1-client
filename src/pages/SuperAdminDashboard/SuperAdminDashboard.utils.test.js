import { describe, expect, it } from 'vitest'
import {
  formatTokenLabel,
  formatUptime,
  getLaunchInsight,
  getResponseTotal,
  getStatusVariant,
} from './SuperAdminDashboard.utils.js'

describe('SuperAdminDashboard utilities', () => {
  it('formats token labels and status variants for dashboard signals', () => {
    expect(formatTokenLabel('PASS_WITH_WARNINGS')).toBe('Pass With Warnings')
    expect(formatTokenLabel('', 'Fallback')).toBe('Fallback')
    expect(getStatusVariant('healthy')).toBe('success')
    expect(getStatusVariant('unknown')).toBe('neutral')
  })

  it('formats uptime without zero-minute noise', () => {
    expect(formatUptime(7200)).toBe('2h')
    expect(formatUptime(7500)).toBe('2h 5m')
    expect(formatUptime(45)).toBe('1m')
    expect(formatUptime(null)).toBe('Not available')
  })

  it('reads total counts from response metadata before array fallbacks', () => {
    expect(getResponseTotal({ data: [{}], meta: { total: 42 } })).toBe(42)
    expect(getResponseTotal({ data: { data: [{}, {}] } })).toBe(2)
    expect(getResponseTotal({ data: [] })).toBe(0)
    expect(getResponseTotal(null)).toBeNull()
  })

  it('builds launch insights for counts and health-backed links', () => {
    expect(getLaunchInsight({
      link: { key: 'skills' },
      counts: { runtimeSkills: 36 },
    })).toMatchObject({
      value: '36',
      meta: 'skills',
      variant: 'info',
    })

    expect(getLaunchInsight({
      link: { key: 'system-monitoring' },
      healthData: { status: 'degraded' },
      healthError: null,
    })).toMatchObject({
      type: 'status',
      value: 'Degraded',
      variant: 'warning',
    })
  })
})
