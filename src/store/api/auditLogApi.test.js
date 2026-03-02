import { describe, it, expect } from 'vitest'
import {
  auditLogApi,
  useQueryAuditLogsQuery,
  useGetAuditStatsQuery,
  useLazyGetAuditLogsByRequestQuery,
  useLazyGetAuditLogsByResourceQuery,
  useVerifyAuditIntegrityMutation,
} from './auditLogApi.js'

describe('auditLogApi', () => {
  it('exposes audit endpoints', () => {
    expect(auditLogApi.endpoints).toHaveProperty('queryAuditLogs')
    expect(auditLogApi.endpoints).toHaveProperty('getAuditStats')
    expect(auditLogApi.endpoints).toHaveProperty('getAuditLogsByRequest')
    expect(auditLogApi.endpoints).toHaveProperty('getAuditLogsByResource')
    expect(auditLogApi.endpoints).toHaveProperty('verifyAuditIntegrity')
  })

  it('exports query hooks', () => {
    expect(typeof useQueryAuditLogsQuery).toBe('function')
    expect(typeof useGetAuditStatsQuery).toBe('function')
    expect(typeof useLazyGetAuditLogsByRequestQuery).toBe('function')
    expect(typeof useLazyGetAuditLogsByResourceQuery).toBe('function')
  })

  it('exports mutation hooks', () => {
    expect(typeof useVerifyAuditIntegrityMutation).toBe('function')
  })
})

