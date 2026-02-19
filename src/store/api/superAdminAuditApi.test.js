import { describe, it, expect } from 'vitest'
import {
  superAdminAuditApi,
  useListDeniedAccessLogsQuery,
} from './superAdminAuditApi.js'

describe('superAdminAuditApi', () => {
  it('exposes denied-access endpoint', () => {
    expect(superAdminAuditApi.endpoints).toHaveProperty('listDeniedAccessLogs')
  })

  it('exports query hook', () => {
    expect(typeof useListDeniedAccessLogsQuery).toBe('function')
  })
})
