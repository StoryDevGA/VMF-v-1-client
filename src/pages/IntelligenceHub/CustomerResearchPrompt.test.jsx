import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import CustomerResearchPrompt from './CustomerResearchPrompt.jsx'
import { readAcquisitionRun } from './acquisitionRunContract.js'
import { clearTokens, getSessionRevision } from '../../utils/tokenStorage.js'

const reads = vi.hoisted(() => ({ sources: vi.fn(), history: vi.fn(), detail: vi.fn() }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetRuntimeStateSourcesQuery: (...args) => reads.sources(...args),
  useGetAcquisitionRunsQuery: (...args) => reads.history(...args),
  useGetAcquisitionRunQuery: (...args) => reads.detail(...args),
}))
// Invented material below is unit-only, never application research or a grant.
const scope = { runtimeInstanceId: 'unit-revision', customerId: '1'.repeat(24), tenantId: '2'.repeat(24), stateVersion: 'rsv2:unit' }
const stamp = '2026-11-26T10:00:00.000Z'
const runId = '12345678-1234-4123-8123-123456789abc'
const requestKey = '12345678-1234-4123-8123-123456789abd'
const attemptId = '12345678-1234-4123-8123-123456789abf'
const hash = letter => 'sha256:' + letter.repeat(64)
const source = (id = 's1', url = 'https://unit.example/recorded') => ({ sourceId: id, label: 'Recorded ' + id, sourceType: 'WEBSITE',
  sourceRef: url, reviewStatus: 'UNREVIEWED', stateVersion: scope.stateVersion, sourceStateVersion: scope.stateVersion })
const sourcePage = (page = 1, rows = [source()], total = rows.length) => ({ data: {
  contractVersion: 'intelligence-source-registry.v1', control: { ...scope, id: scope.runtimeInstanceId },
  scope, stateVersion: scope.stateVersion, currency: 'AS_READ', page, pageSize: 25, sourceRegistry: rows,
  total, totalPages: Math.max(1, Math.ceil(total / 25)), totalCapped: false, hasMore: page < Math.max(1, Math.ceil(total / 25)), completeness: 'COMPLETE',
} })
const run = () => {
  const value = { contractVersion: 'public-research-run.v1', plannerVersion: 'public-research-planner.v1', runId, requestKey,
    executionAttemptId: attemptId, actorUserId: '4'.repeat(24), actionKey: 'BUILD_EVIDENCE_PACK', authority: 'VMF_UPDATE', acquisitionProfile: 'STANDARD',
    scope: { ...scope, runtimeInstanceId: '3'.repeat(24), runtimeInstanceKey: scope.runtimeInstanceId }, basisStateVersion: 'rsv2:basis',
    basisUpdatedAt: '2026-11-13T09:00:00.000Z', observedStateVersion: scope.stateVersion, status: 'SUCCEEDED', canonicalSaved: true, outputStateVersion: 'rsv2:public-output', currency: 'CURRENT_OUTPUT',
    createdAt: stamp, startedAt: stamp, completedAt: stamp, cancellation: { eligible: false, executionAttemptId: attemptId },
    researchConfiguration: { configurationVersion: '12345678-1234-4123-8123-123456789abe', configurationHash: hash('a'), saveAuditId: 'a'.repeat(24) },
    audit: { admissionId: 'a', startId: 'b', terminalId: 'c', saveId: 'save' },
    outcomes: [{ kind: 'SEARCH', inputIndex: 0, status: 'SUCCEEDED', evidenceObjectCount: 0 },
      { kind: 'REGISTRY', inputIndex: 0, status: 'SUCCEEDED', evidenceObjectCount: 0 },
      { kind: 'WEBSITE', inputIndex: 0, status: 'SUCCEEDED', sourceId: 'unit-original', evidenceObjectCount: 3 }],
    publicResearch: { mode: 'LIVE', classification: 'NATIVE_PUBLIC_RESEARCH', liveExecutionEnabled: true, planHash: hash('a'), policyHash: hash('b'),
      receiptHash: hash('c'), releaseId: requestKey, operationCount: 3, completedOperationCount: 3, bytesRead: 100, reservedCostMicros: 0, elapsedMsRecorded: 50, modelTokens: 0,
      limits: { maxSearchRequests: 1, maxRegistryRequests: 1, maxPages: 1, maxPageBytes: 320000, maxJsonBytes: 16384, maxTotalBytes: 350000,
        maxElapsedMs: 10000, maxRequestMs: 1000, maxCostMicros: 0, searchRequestCostMicros: 0, registryRequestCostMicros: 0, concurrency: 1, retries: 0, redirects: 0, modelTokens: 0 },
      categories: ['SEARCH', 'WEBSITE', 'REGISTRY'].map(key => ({ key, status: 'SUCCEEDED', completedCount: 1, failedCount: 0, unknownCount: 0, evidenceObjectCount: key === 'WEBSITE' ? 3 : 0 })),
      receipts: ['SEARCH', 'REGISTRY', 'WEBSITE'].map((category, ordinal) => ({ ordinal, category, phase: 'RECORDED', inputIndex: 0,
        requestHash: hash('d'), responseTextHash: hash('e'), httpStatus: 200, bytesRead: category === 'WEBSITE' ? 80 : 10, elapsedMs: 10,
        providerRequestId: category === 'SEARCH' ? 'unit-request' : null, sourceId: category === 'WEBSITE' ? 'unit-original' : null, evidenceObjectCount: category === 'WEBSITE' ? 3 : 0 })),
      qualifications: ['Unit-only receipt shape; not runtime permission.'] } }
  value.discovery = { classification: 'DISCOVERY_METADATA_ONLY', originalEvidence: false, status: 'SUCCESS', retrievedAt: stamp,
    requestHash: hash('d'), responseHash: hash('e'), queryBinding: { contractVersion: 'tavily-query-binding.v2', submittedQuery: 'site:unit.example Unit',
      providerQuery: 'Unit', normalization: 'LEADING_APPROVED_SITE_OPERATOR_REMOVED' },
    items: [{ url: 'https://unit.example/discovered', title: 'Unit discovery', snippet: 'Unit-only snippet', resultOrder: 1 }] }
  return value
}
const historyPage = (items = [run()], extra = {}) => ({ data: { contractVersion: 'acquisition-run.v1',
  scope: { ...scope, runtimeInstanceKey: scope.runtimeInstanceId }, observedStateVersion: scope.stateVersion, items, hasMore: false, ...extra } })
const props = () => ({ scope: { ...scope, sessionRevision: getSessionRevision() }, basisUpdatedAt: stamp,
  savedBrief: { companyName: 'Unit company', companyWebsite: 'https://unit.example/', notes: 'Unit saved notes' },
  active: true, disabled: false, onClose: vi.fn() })
const preview = () => screen.getByLabelText('Research prompt from saved context')
const originalCopyCommand = Object.getOwnPropertyDescriptor(document, 'execCommand')
const copyCommand = implementation => {
  const command = vi.fn(implementation)
  Object.defineProperty(document, 'execCommand', { configurable: true, value: command })
  return command
}
afterEach(() => {
  if (originalCopyCommand) Object.defineProperty(document, 'execCommand', originalCopyCommand)
  else delete document.execCommand
})
beforeEach(() => {
  clearTokens()
  reads.sources.mockReset().mockImplementation(args => ({ currentData: sourcePage(args.page), refetch: vi.fn() }))
  reads.history.mockReset().mockReturnValue({ currentData: historyPage(), refetch: vi.fn() })
  reads.detail.mockReset().mockReturnValue({ currentData: { data: run() }, refetch: vi.fn() })
})

it('uses an actual strict reader for the unit Run shape', () => expect(readAcquisitionRun(run(), scope)).toBeTruthy())
it('starts with no categories/links, reads only pages, and exports selected external categories and customer requests', async () => {
  const user = userEvent.setup(); render(<CustomerResearchPrompt {...props()} />)
  expect(screen.getAllByRole('checkbox').every(item => !item.checked)).toBe(true)
  expect(reads.detail.mock.lastCall[1].skip).toBe(true)
  await user.click(screen.getByRole('checkbox', { name: 'LinkedIn' }))
  await user.click(screen.getByRole('checkbox', { name: /Recorded s1/ }))
  await user.type(screen.getByLabelText('Customer research questions / gaps (optional)'), 'Check whether support is independently documented.')
  expect(preview().value).toContain('Selected external source categories: LinkedIn')
  expect(preview().value).not.toContain('\nGITHUB\n')
  expect(preview().value).toContain('https://unit.example/recorded')
  expect(preview().value).toContain('Check whether support is independently documented.')
  await user.click(screen.getByRole('button', { name: 'Copy prompt' }))
  expect(await navigator.clipboard.readText()).toBe(preview().value)
  expect(reads.detail.mock.calls.every(([, options]) => options.skip)).toBe(true)
})
it('requires an explicit saved Run selection and keeps discovery qualification', async () => {
  const user = userEvent.setup(); render(<CustomerResearchPrompt {...props()} />)
  expect(screen.queryByRole('checkbox', { name: /Unit discovery/ })).toBeNull()
  await user.selectOptions(screen.getByLabelText('Saved research Run'), runId)
  expect(reads.detail.mock.lastCall[1].skip).toBe(false)
  await user.click(screen.getByRole('checkbox', { name: /Unit discovery/ }))
  expect(preview().value).toContain('Search discovery only, not original evidence')
  expect(preview().value).toContain(runId); expect(preview().value).not.toContain('Unit-only snippet')
})
it.each(['control', 'scope', 'state', 'row', 'page', 'error', 'loading', 'missing', 'count'])('rejects a %s source read instead of exporting stale rows', kind => {
  const value = sourcePage()
  if (kind === 'control') value.data.control.tenantId = 'other'
  if (kind === 'scope') value.data.scope = { ...scope, customerId: 'other' }
  if (kind === 'state') value.data.stateVersion = 'rsv2:other'
  if (kind === 'row') value.data.sourceRegistry[0].sourceStateVersion = 'rsv2:other'
  if (kind === 'page') value.data.page = 2
  if (kind === 'count') value.data.total = 2
  reads.sources.mockReturnValue({ currentData: kind === 'missing' ? undefined : value, data: sourcePage(),
    error: kind === 'error' ? { status: 503 } : undefined, isFetching: kind === 'loading' })
  render(<CustomerResearchPrompt {...props()} />)
  expect(screen.queryByRole('checkbox', { name: /Recorded s1/ })).toBeNull()
  expect(screen.getByRole('region', { name: 'Existing source links' })).toHaveTextContent(/unavailable|Loading/)
})
it.each(['javascript:alert(1)', 'https://user:secret@unit.example/', 'https://unit.example/?token=secret', 'report.pdf'])('does not offer unsafe/non-public pointer %s', url => {
  reads.sources.mockReturnValue({ currentData: sourcePage(1, [source('unsafe', url)]) })
  render(<CustomerResearchPrompt {...props()} />)
  expect(screen.queryByRole('checkbox', { name: /Recorded unsafe/ })).toBeNull()
})
it('strips source fragments from displayed/exported pointers', async () => {
  const user = userEvent.setup()
  reads.sources.mockReturnValue({ currentData: sourcePage(1, [source('s1', 'https://unit.example/recorded#token=secret')]) })
  render(<CustomerResearchPrompt {...props()} />)
  expect(screen.queryByText(/token=secret/)).toBeNull()
  await user.click(screen.getByRole('checkbox', { name: /Recorded s1/ }))
  expect(preview().value).not.toContain('token=secret')
})
it('preserves selected snapshots across bounded source pages without reading all pages', async () => {
  const user = userEvent.setup()
  reads.sources.mockImplementation(args => ({ currentData: sourcePage(args.page, args.page === 1
    ? Array.from({ length: 25 }, (_, i) => source('s' + i, 'https://unit.example/p' + i)) : [source('last', 'https://unit.example/last')], 26) }))
  render(<CustomerResearchPrompt {...props()} />)
  await user.click(screen.getByRole('checkbox', { name: /Recorded s0 —/ }))
  await user.click(screen.getByRole('button', { name: 'Next source page' }))
  await user.click(screen.getByRole('checkbox', { name: /Recorded last/ }))
  expect(preview().value).toContain('https://unit.example/p0')
  expect(preview().value).toContain('https://unit.example/last')
  expect(new Set(reads.sources.mock.calls.map(([args]) => args.page))).toEqual(new Set([1, 2]))
})
it('uses capped paging without fabricating total availability', async () => {
  const user = userEvent.setup(), payload = sourcePage(1, Array.from({ length: 25 }, (_, i) => source('s' + i)), 25)
  Object.assign(payload.data, { total: null, totalPages: null, totalCapped: true, hasMore: null, completeness: 'PARTIAL' })
  reads.sources.mockReturnValue({ currentData: payload })
  render(<CustomerResearchPrompt {...props()} />)
  expect(screen.getByText(/Source page 1 · partial total/)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Next source page' }))
  expect(reads.sources.mock.lastCall[0].page).toBe(2)
})
it('blocks copying affected selected links during failed reads but allows removing them', async () => {
  const user = userEvent.setup(), base = props(), view = render(<CustomerResearchPrompt {...base} />)
  await user.click(screen.getByRole('checkbox', { name: /Recorded s1/ }))
  reads.sources.mockReturnValue({ error: { status: 503 } })
  view.rerender(<CustomerResearchPrompt {...base} />)
  expect(screen.getByRole('button', { name: 'Copy prompt' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Remove selected link Recorded s1' }))
  expect(screen.getByRole('button', { name: 'Copy prompt' })).toBeEnabled()
})
it.each(['scope', 'state', 'brief', 'basis', 'session'])('resets local selections on %s owner change', async kind => {
  const user = userEvent.setup(), base = props(), view = render(<CustomerResearchPrompt {...base} />)
  await user.click(screen.getByRole('checkbox', { name: 'GitHub' }))
  await user.type(screen.getByLabelText('Customer research questions / gaps (optional)'), 'Unit question')
  const changed = kind === 'scope' ? { scope: { ...base.scope, tenantId: 'other' } } : kind === 'state' ? { scope: { ...base.scope, stateVersion: 'rsv2:next' } }
    : kind === 'brief' ? { savedBrief: { ...base.savedBrief, notes: 'New saved note' } } : kind === 'basis' ? { basisUpdatedAt: '2026-11-26T11:00:00.000Z' } : {}
  if (kind === 'session') act(() => clearTokens())
  view.rerender(<CustomerResearchPrompt {...base} {...changed} />)
  expect(screen.getByRole('checkbox', { name: 'GitHub' })).not.toBeChecked()
  expect(screen.getByLabelText('Customer research questions / gaps (optional)')).toHaveValue('')
})
it.each(['selection', 'disabled-restored', 'unmount', 'session'])('ignores late clipboard success after %s', async kind => {
  const user = userEvent.setup(), base = props(); let finish
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const view = render(<CustomerResearchPrompt {...base} />)
  await user.click(screen.getByRole('button', { name: 'Copy prompt' }))
  if (kind === 'selection') await user.click(screen.getByRole('checkbox', { name: 'GitHub' }))
  if (kind === 'disabled-restored') { view.rerender(<CustomerResearchPrompt {...base} disabled />); view.rerender(<CustomerResearchPrompt {...base} />) }
  if (kind === 'unmount') view.unmount()
  if (kind === 'session') act(() => clearTokens())
  await act(async () => finish())
  expect(screen.queryByText(/Prompt copied/)).toBeNull(); write.mockRestore()
})
it('supports StrictMode copy and keyboard-accessible current frame', async () => {
  const user = userEvent.setup(); render(<StrictMode><CustomerResearchPrompt {...props()} /></StrictMode>)
  await user.click(screen.getByRole('checkbox', { name: 'GitHub' }))
  await user.click(screen.getByRole('button', { name: 'Copy prompt' }))
  await waitFor(() => expect(screen.getByText(/Prompt copied/)).toBeVisible())
})
it('does not invoke the fallback when the clipboard API succeeds', async () => {
  const user = userEvent.setup(), command = copyCommand(() => true)
  render(<CustomerResearchPrompt {...props()} />)
  await user.click(screen.getByRole('button', { name: 'Copy prompt' }))
  expect(await screen.findByText(/Prompt copied/)).toBeVisible()
  expect(command).not.toHaveBeenCalled()
})
it.each(['rejected', 'missing'])('copies the exact existing preview automatically when clipboard is %s', async kind => {
  const user = userEvent.setup()
  const clipboard = navigator.clipboard, write = clipboard.writeText
  clipboard.writeText = kind === 'missing' ? undefined : vi.fn().mockRejectedValue(new Error('Unit permission refusal'))
  try {
    const command = copyCommand(() => {
      expect(document.activeElement).toBe(preview())
      expect(preview().selectionStart).toBe(0)
      expect(preview().selectionEnd).toBe(preview().value.length)
      expect(preview()).toHaveAttribute('readonly')
      return true
    })
    render(<CustomerResearchPrompt {...props()} />)
    preview().setSelectionRange(2, 7, 'backward')
    const button = screen.getByRole('button', { name: 'Copy prompt' })
    await user.click(button)
    expect(await screen.findByText(/Prompt copied/)).toBeVisible()
    expect(command).toHaveBeenCalledTimes(1)
    expect(command).toHaveBeenCalledWith('copy')
    expect(button).toHaveFocus()
    expect([preview().selectionStart, preview().selectionEnd, preview().selectionDirection]).toEqual([2, 7, 'backward'])
  } finally { clipboard.writeText = write }
})
it.each(['false', 'throw'])('reports failure and restores focus when fallback returns %s', async result => {
  const user = userEvent.setup()
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Unit clipboard refusal'))
  copyCommand(() => { if (result === 'throw') throw new Error('Unit copy refusal'); return false })
  render(<CustomerResearchPrompt {...props()} />)
  const button = screen.getByRole('button', { name: 'Copy prompt' })
  await user.click(button)
  expect(await screen.findByText(/copy it manually/)).toBeVisible()
  expect(screen.queryByText(/Prompt copied/)).toBeNull()
  expect(button).toHaveFocus()
  write.mockRestore()
})
it.each(['selection', 'disabled-restored', 'unmount', 'session', 'scope', 'newer-copy'])('does not fallback after a late rejection following %s', async kind => {
  const user = userEvent.setup(), base = props(); let reject
  const write = vi.spyOn(navigator.clipboard, 'writeText')
    .mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail }))
    .mockResolvedValue(undefined)
  const command = copyCommand(() => true)
  const view = render(<CustomerResearchPrompt {...base} />)
  await user.click(screen.getByRole('button', { name: 'Copy prompt' }))
  if (kind === 'selection') await user.click(screen.getByRole('checkbox', { name: 'GitHub' }))
  if (kind === 'disabled-restored') { view.rerender(<CustomerResearchPrompt {...base} disabled />); view.rerender(<CustomerResearchPrompt {...base} />) }
  if (kind === 'unmount') view.unmount()
  if (kind === 'session') act(() => clearTokens())
  if (kind === 'scope') view.rerender(<CustomerResearchPrompt {...base} scope={{ ...base.scope, tenantId: 'other' }} />)
  if (kind === 'newer-copy') await user.click(screen.getByRole('button', { name: 'Copy prompt' }))
  await act(async () => reject(new Error('Unit late refusal')))
  expect(command).not.toHaveBeenCalled()
  expect(screen.queryByText(/copy it manually/)).toBeNull()
  if (kind !== 'newer-copy') expect(screen.queryByText(/Prompt copied/)).toBeNull()
  write.mockRestore()
})
it('rejects a Run list observed against another current state', () => {
  const value = historyPage(); value.data.observedStateVersion = 'rsv2:other'
  reads.history.mockReturnValue({ currentData: value })
  render(<CustomerResearchPrompt {...props()} />)
  expect(screen.queryByLabelText('Saved research Run')).toBeNull()
})
it('rejects an exact Run detail observed against another current state while preserving historical basis semantics', async () => {
  const user = userEvent.setup(), value = run(); value.observedStateVersion = 'rsv2:other'
  reads.detail.mockReturnValue({ currentData: { data: value } })
  render(<CustomerResearchPrompt {...props()} />)
  await user.selectOptions(screen.getByLabelText('Saved research Run'), runId)
  expect(screen.queryByRole('checkbox', { name: /Unit discovery/ })).toBeNull()
})
it('keeps malformed displayed source metadata inside normalized safe link fields', () => {
  const row = { ...source(), label: { invalid: 'unit' }, publicResearchProvenance: { category: { invalid: 'unit' } } }
  reads.sources.mockReturnValue({ currentData: sourcePage(1, [row]) })
  expect(() => render(<CustomerResearchPrompt {...props()} />)).not.toThrow()
  expect(screen.queryByText(/\[object Object\]/)).toBeNull()
})
it('limits distinct selected links while retaining multiple selected origins for one URL', async () => {
  const user = userEvent.setup()
  reads.sources.mockReturnValue({ currentData: sourcePage(1, Array.from({ length: 21 }, (_, i) => source('s' + i, 'https://unit.example/p' + i)), 21) })
  render(<CustomerResearchPrompt {...props()} />)
  for (let i = 0; i < 20; i++) fireEvent.click(screen.getByRole('checkbox', { name: new RegExp('Recorded s' + i + ' —') }))
  await user.click(screen.getByRole('checkbox', { name: /Recorded s20 —/ }))
  expect(screen.getByRole('alert')).toHaveTextContent('Select up to 20 distinct links')
  expect(screen.getByRole('checkbox', { name: /Recorded s20 —/ })).not.toBeChecked()
})
it('keeps selected source and discovery origins without counting a repeated URL twice', async () => {
  const user = userEvent.setup(), value = run()
  value.discovery.items[0].url = 'https://unit.example/recorded'
  reads.detail.mockReturnValue({ currentData: { data: value } })
  render(<CustomerResearchPrompt {...props()} />)
  await user.click(screen.getByRole('checkbox', { name: /Recorded s1/ }))
  await user.selectOptions(screen.getByLabelText('Saved research Run'), runId)
  await user.click(screen.getByRole('checkbox', { name: /Unit discovery/ }))
  expect(screen.getByText(/1 of 20 distinct links selected/)).toBeTruthy()
  expect(preview().value).toContain('Recorded source pointer')
  expect(preview().value).toContain('Search discovery only')
})
it('uses explicit Run cursor navigation without automatic history scans', async () => {
  const user = userEvent.setup()
  reads.history.mockImplementation(args => ({ currentData: args.cursor ? historyPage([]) : historyPage([run()], { hasMore: true, nextCursor: 'unit-cursor' }) }))
  render(<CustomerResearchPrompt {...props()} />)
  expect(reads.history.mock.calls.every(([args]) => args.cursor === null)).toBe(true)
  await user.click(screen.getByRole('button', { name: 'Next Run page' }))
  expect(reads.history.mock.lastCall[0].cursor).toBe('unit-cursor')
  expect(reads.detail.mock.lastCall[1].skip).toBe(true)
  await user.click(screen.getByRole('button', { name: 'Previous Run page' }))
  expect(reads.history.mock.lastCall[0].cursor).toBeNull()
})
it.each(['list-error', 'detail-error', 'detail-state'])('blocks stale selected Search export for %s', async kind => {
  const user = userEvent.setup(), base = props(), view = render(<CustomerResearchPrompt {...base} />)
  await user.selectOptions(screen.getByLabelText('Saved research Run'), runId)
  await user.click(screen.getByRole('checkbox', { name: /Unit discovery/ }))
  if (kind === 'list-error') reads.history.mockReturnValue({ error: { status: 503 } })
  else if (kind === 'detail-error') reads.detail.mockReturnValue({ error: { status: 503 } })
  else { const changed = run(); changed.observedStateVersion = 'rsv2:other'; reads.detail.mockReturnValue({ currentData: { data: changed } }) }
  view.rerender(<CustomerResearchPrompt {...base} />)
  expect(screen.getByRole('button', { name: 'Copy prompt' })).toBeDisabled()
})
it('rejects oversize customer questions instead of silently treating them as assessed gaps', () => {
  render(<CustomerResearchPrompt {...props()} />)
  fireEvent.change(screen.getByLabelText('Customer research questions / gaps (optional)'), { target: { value: 'x'.repeat(4001) } })
  expect(screen.getByRole('button', { name: 'Copy prompt' })).toBeDisabled()
  expect(screen.getByRole('alert')).toHaveTextContent('4000')
})
