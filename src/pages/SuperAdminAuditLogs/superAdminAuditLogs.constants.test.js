import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  ACTION_OPTIONS,
  EVENT_CATEGORY_OPTIONS,
  EVENT_SEVERITY_OPTIONS,
  RESOURCE_TYPE_OPTIONS,
  SYSTEM_EVENT_TYPE_OPTIONS,
} from './superAdminAuditLogs.constants.js'

const testDirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(testDirname, '../../../..')
const apiAuditServicePath = path.join(
  workspaceRoot,
  'VMF-v-1-api/src/services/auditService.js',
)
const apiGovernanceAuditEventsPath = path.join(
  workspaceRoot,
  'VMF-v-1-api/src/services/governanceAudit/governanceAuditEvents.js',
)

const sortedValues = (values) =>
  [...values].sort((left, right) => left.localeCompare(right))

const optionValues = (options) =>
  sortedValues(options.map((option) => option.value).filter(Boolean))

const loadBackendRegistrySnapshot = () => {
  const script = `
const auditService = await import(${JSON.stringify(pathToFileURL(apiAuditServicePath).href)})
const governanceAuditEvents = await import(${JSON.stringify(pathToFileURL(apiGovernanceAuditEventsPath).href)})

process.stdout.write(JSON.stringify({
  auditActions: Object.values(auditService.AUDIT_ACTIONS),
  resourceTypes: Object.values(auditService.RESOURCE_TYPES),
  systemEventTypes: Object.values(governanceAuditEvents.GOVERNANCE_AUDIT_EVENTS).map((event) => event.eventKey),
  eventCategories: Object.values(governanceAuditEvents.GOVERNANCE_AUDIT_EVENT_CATEGORIES),
  eventSeverities: Object.values(governanceAuditEvents.GOVERNANCE_AUDIT_SEVERITIES),
}))
`

  return JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: workspaceRoot,
      encoding: 'utf8',
    }),
  )
}

describe('SuperAdminAuditLogs constants parity', () => {
  it('keeps Audit Logs filter constants aligned with backend audit registries', () => {
    const backendRegistries = loadBackendRegistrySnapshot()

    expect(optionValues(ACTION_OPTIONS)).toEqual(
      sortedValues(backendRegistries.auditActions),
    )
    expect(optionValues(RESOURCE_TYPE_OPTIONS)).toEqual(
      sortedValues(backendRegistries.resourceTypes),
    )
    expect(optionValues(SYSTEM_EVENT_TYPE_OPTIONS)).toEqual(
      sortedValues(backendRegistries.systemEventTypes),
    )
    expect(optionValues(EVENT_CATEGORY_OPTIONS)).toEqual(
      sortedValues(backendRegistries.eventCategories),
    )
    expect(optionValues(EVENT_SEVERITY_OPTIONS)).toEqual(
      sortedValues(backendRegistries.eventSeverities),
    )
  })
})
