import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import AcquisitionRunHistory from './AcquisitionRunHistory.jsx'
const reads = vi.hoisted(() => ({ history: {}, detail: {}, historyArgs: vi.fn(), detailArgs: vi.fn(), refresh: vi.fn(), refreshDetail: vi.fn() }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetAcquisitionRunsQuery: (...args) => { reads.historyArgs(...args); return { ...reads.history, refetch: reads.refresh } },
  useGetAcquisitionRunQuery: (...args) => { reads.detailArgs(...args); return { ...reads.detail, refetch: reads.refreshDetail } },
}))
const scope = { runtimeInstanceId: 'revision-key', customerId: 'customer-id', tenantId: 'tenant-id' }
const runId = '12345678-1234-4123-8123-123456789abc'
const run = { contractVersion: 'acquisition-run.v1', runId, requestKey: '12345678-1234-4123-8123-123456789abd',
  scope: { ...scope, runtimeInstanceKey: scope.runtimeInstanceId }, status: 'FAILED', canonicalSaved: false, basisStateVersion: 'rsv2:basis',
  outcomes: [{ kind: 'BRIEF', inputIndex: 0, status: 'FAILED', evidenceObjectCount: 0 }],
  audit: { admissionId: 'a', startId: 'b', terminalId: 'c' }, currency: 'HISTORICAL_OUTPUT' }
const Location = () => <p data-testid="location">{useLocation().search}</p>
const mount = (props = {}, route = '/app/intelligence?view=context&revisionId=revision-key') => render(<MemoryRouter initialEntries={[route]}>
  <AcquisitionRunHistory scope={scope} active canAcquire onRetry={vi.fn()} {...props} /><Location />
</MemoryRouter>)
beforeEach(() => {
  reads.historyArgs.mockClear(); reads.detailArgs.mockClear(); reads.refresh.mockClear(); reads.refreshDetail.mockClear()
  reads.history = { currentData: { data: { contractVersion: 'acquisition-run.v1', scope: run.scope, items: [structuredClone(run)], hasMore: false } } }
  reads.detail = { currentData: { data: structuredClone(run) } }
})
describe('recorded acquisition Runs', () => {
  it('refreshes the unavailable exact selected receipt while preserving scope and selected Run', async () => {
    reads.detail = { error: { status: 503 } }
    mount({}, `/app/intelligence?view=context&acquisitionRunId=${runId}`)
    await userEvent.click(screen.getByRole('button', { name: 'Refresh selected Run receipt' }))
    expect(reads.refreshDetail).toHaveBeenCalledOnce()
    expect(reads.refresh).not.toHaveBeenCalled()
    expect(screen.getByTestId('location')).toHaveTextContent(`acquisitionRunId=${runId}`)
    expect(reads.detailArgs).toHaveBeenLastCalledWith({ ...scope, runId }, { skip: false })
  })
  it.each([42, 'UNRECOGNISED'])('rejects unsafe or unrecognised currency %s without rendering it', currency => {
    reads.detail.currentData.data.currency = currency
    mount({}, `/app/intelligence?acquisitionRunId=${runId}`)
    expect(screen.getByText('Exact Run receipt unavailable in this revision. Refresh or inspect another recorded Run.')).toBeVisible()
    expect(screen.queryByRole('button', { name: /Prepare explicit retry/ })).not.toBeInTheDocument()
  })
  it('opens an exact Run preserving revision/tab scope in the shareable route', async () => {
    mount(); await userEvent.click(screen.getByRole('button', { name: `Inspect Run ${runId}` }))
    expect(screen.getByTestId('location')).toHaveTextContent(`view=context&revisionId=revision-key&acquisitionRunId=${runId}`)
    expect(reads.detailArgs).toHaveBeenLastCalledWith({ ...scope, runId }, { skip: false })
    expect(screen.getByRole('region', { name: 'Selected acquisition Run' })).toHaveTextContent('FAILED · Revision not saved')
  })
  it('prepares retry only from an exact read, while locked inspection stays available', async () => {
    const retry = vi.fn(); mount({ onRetry: retry }, `/app/intelligence?view=context&acquisitionRunId=${runId}`)
    await userEvent.click(screen.getByRole('button', { name: 'Prepare explicit retry of this Run' }))
    expect(retry).toHaveBeenCalledWith(run)
  })
  it('locked detail inspection offers no retry', () => {
    mount({ locked: true }, `/app/intelligence?acquisitionRunId=${runId}`)
    expect(screen.getByText('BRIEF 1: FAILED · 0 evidence objects')).toBeVisible()
    expect(screen.queryByRole('button', { name: /Prepare explicit retry/ })).not.toBeInTheDocument()
  })
  it.each(['other-scope', 'other-run', 'missing-contract', 'invalid-outcome'])('does not display a %s detail as the exact selected receipt', kind => {
    const invalid = structuredClone(run)
    if (kind === 'other-scope') invalid.scope.tenantId = 'other-tenant'
    if (kind === 'other-run') invalid.runId = run.requestKey
    if (kind === 'missing-contract') delete invalid.contractVersion
    if (kind === 'invalid-outcome') invalid.outcomes[0].evidenceObjectCount = 999
    reads.detail.currentData.data = invalid
    mount({}, `/app/intelligence?acquisitionRunId=${runId}`)
    expect(screen.getByText('Exact Run receipt unavailable in this revision. Refresh or inspect another recorded Run.')).toBeVisible()
    expect(screen.queryByRole('button', { name: /Prepare explicit retry/ })).not.toBeInTheDocument()
  })
  it('pages server history explicitly without presenting first-page counts as complete history', async () => {
    reads.history.currentData.data.hasMore = true; reads.history.currentData.data.nextCursor = 'safe-next-cursor'
    mount(); expect(screen.getByText('More recorded Runs are available. History entries are previews; open a Run to verify its receipt.')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Next Runs' }))
    expect(reads.historyArgs).toHaveBeenLastCalledWith({ ...scope, cursor: 'safe-next-cursor' }, { skip: false })
  })
  it('does not render cached history from another scope or use cached data as current', () => {
    reads.history = { data: reads.history.currentData }
    mount(); expect(screen.getByText('Run history unavailable. Refresh to verify recorded executions.')).toBeVisible()
    expect(screen.queryByRole('button', { name: `Inspect Run ${runId}` })).not.toBeInTheDocument()
  })
})
