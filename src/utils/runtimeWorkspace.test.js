import { describe, expect, it } from 'vitest'
import {
  formatRuntimeTokenLabel,
  getExecutionStateVariant,
  getRuntimeExecutionState,
  getRuntimeInstanceDisplayId,
  getRuntimeInstanceRouteId,
  getRuntimeLifecycleStatus,
  getRuntimeReadinessLabel,
  getRuntimeReadinessVariant,
  getRuntimeStatusVariant,
  getRuntimeWorkspaceRoute,
  getRuntimeWorkTypePrefix,
} from './runtimeWorkspace.js'

describe('runtimeWorkspace utilities', () => {
  it('formats runtime work type prefixes and display labels', () => {
    expect(getRuntimeWorkTypePrefix('VALUE_NARRATIVE')).toBe('VN')
    expect(getRuntimeWorkTypePrefix('deal_analysis')).toBe('DA')
    expect(getRuntimeWorkTypePrefix('unknown_work')).toBe('RT')
    expect(getRuntimeWorkTypePrefix(null)).toBe('RT')
    expect(getRuntimeWorkTypePrefix('')).toBe('RT')
    expect(formatRuntimeTokenLabel('NOT_STARTED')).toBe('Not Started')
    expect(formatRuntimeTokenLabel('')).toBe('--')
  })

  it('uses explicit runtime instance identifiers before honest fallbacks', () => {
    expect(getRuntimeInstanceDisplayId({ runtimeInstanceId: 'VN-2026-000124' }, 'VALUE_NARRATIVE'))
      .toBe('VN-2026-000124')
    expect(getRuntimeInstanceDisplayId({ runtimeInstanceKey: 'value-narrative-001' }, 'VALUE_NARRATIVE'))
      .toBe('value-narrative-001')
    expect(getRuntimeInstanceDisplayId({ runtimeId: 'DA-2026-000021' }, 'DEAL_ANALYSIS'))
      .toBe('DA-2026-000021')
    expect(getRuntimeInstanceDisplayId({ id: 'vmf-123' }, 'VALUE_NARRATIVE'))
      .toBe('VN - Pending runtime ID')
    expect(getRuntimeInstanceRouteId({ runtimeInstanceKey: 'value-narrative-001', id: 'runtime-1' }))
      .toBe('value-narrative-001')
    expect(getRuntimeInstanceRouteId({ id: 'runtime-1' }))
      .toBe('runtime-1')
    expect(getRuntimeWorkspaceRoute({ runtimeInstanceKey: 'value-narrative-001' }))
      .toBe('/app/runtime/value-narrative-001')
    expect(getRuntimeWorkspaceRoute('value narrative/001'))
      .toBe('/app/runtime/value%20narrative%2F001')
    expect(getRuntimeWorkspaceRoute({}))
      .toBe('/app/workspaces/vmf')
  })

  it('maps runtime lifecycle and execution state variants separately', () => {
    expect(getRuntimeLifecycleStatus({ runtimeStatus: 'ready', lifecycleStatus: 'draft' })).toBe('READY')
    expect(getRuntimeLifecycleStatus({ lifecycleStatus: 'published' })).toBe('PUBLISHED')
    expect(getRuntimeExecutionState({ executionState: 'queued' })).toBe('QUEUED')
    expect(getRuntimeExecutionState({ executionStatus: 'idle' })).toBe('IDLE')
    expect(getRuntimeStatusVariant('blocked')).toBe('danger')
    expect(getRuntimeStatusVariant('unknown_status')).toBe('neutral')
    expect(getExecutionStateVariant('idle')).toBe('neutral')
    expect(getExecutionStateVariant('running')).toBe('success')
    expect(getExecutionStateVariant('waiting_approval')).toBe('warning')
    expect(getExecutionStateVariant('error')).toBe('danger')
    expect(getExecutionStateVariant('paused')).toBe('warning')
  })

  it('summarises runtime readiness from existing evidence fields without inventing activity', () => {
    expect(getRuntimeReadinessLabel({
      completionState: 'COMPLETE',
      validationStatus: 'READY',
      lockStatus: 'LOCKED',
      snapshotStatus: 'BOUND',
    })).toBe('Execution ready')
    expect(getRuntimeReadinessLabel({})).toBe('Pending runtime engine')
    expect(getRuntimeReadinessLabel({ validationStatus: 'NOT_RUN' })).toBe('Readiness pending')
    expect(getRuntimeReadinessLabel({ validationStatus: 'FAILED' })).toBe('Execution blocked')
    expect(getRuntimeReadinessVariant('Execution ready')).toBe('success')
    expect(getRuntimeReadinessVariant('Execution blocked')).toBe('danger')
    expect(getRuntimeReadinessVariant('Readiness pending')).toBe('warning')
    expect(getRuntimeReadinessVariant('Pending runtime engine')).toBe('info')
  })
})
