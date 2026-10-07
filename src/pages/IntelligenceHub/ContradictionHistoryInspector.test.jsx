import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import ContradictionHistoryInspector from './ContradictionHistoryInspector.jsx'

const state = vi.hoisted(() => ({ read: {}, query: vi.fn(), refresh: vi.fn(), revision: 0, buttons: {} }))
vi.mock('../../utils/tokenStorage.js', () => ({ getSessionRevision: () => state.revision }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({ useGetRuntimeStateContradictionHistoryQuery: (...args) => { state.query(...args); return state.read } }))
vi.mock('../../components/Button', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, Button: props => { if (typeof props.children === 'string') state.buttons[props.children] = props.onClick; return <actual.Button {...props} /> } }
})
const scope = { runtimeInstanceId: 'revision', customerId: 'customer', tenantId: 'tenant', stateVersion: 'rsv2:current', sessionRevision: 0 }
const row = { contractVersion: 'discovery-contradiction-review-v1', reviewId: '5b4d1f42-d7e2-4a3f-af5c-000000000004', runtimeInstanceId: 'revision-id',
  contradictionId: 'finding', evidencePairHash: 'sha256:' + 'a'.repeat(64), disposition: 'NOT_CONTRADICTORY', rationale: 'Recorded human rationale.',
  reviewEpoch: '', reviewedBy: '64b000000000000000000001', reviewedAt: '2026-10-06T10:00:00.000Z', reviewedStateVersion: 'rsv2:original' }
const response = history => ({ data: { contractVersion: 'intelligence-contradiction-history.v1', source: 'runtime_state_v2.contradiction_history', currency: 'AS_READ',
  readAt: '2026-10-06T11:00:00.000Z', control: { ...scope, id: 'revision-id', runtimeInstanceKey: 'revision' },
  readReceipt: { source: 'runtime_state_v2.contradiction_history', bounded: true, fullLegacyFrameworkStateFetched: false,
    maxTimeMS: 2000, requestTimeoutMS: 6000, workTimeoutMS: 5500, cleanupReserveMS: 500, maxSerializedPayloadBytes: 524288, serializedPayloadBytes: 1000 },
  history: { available: true, completeness: 'COMPLETE_STORED_HISTORY', reason: null, findingId: 'finding', page: 1, pageSize: 10, total: 1, totalPages: 1,
    basis: 'RECORDED_DECISIONS', currentness: 'NOT_ASSESSED', auditReferences: 'UNAVAILABLE', recalculation: 'UNAVAILABLE', records: [row], ...history } } })
beforeEach(() => { state.revision = 0; state.buttons = {}; state.query.mockClear(); state.refresh.mockClear(); state.read = { currentData: response(), refetch: state.refresh } })
const show = props => render(<ContradictionHistoryInspector scope={scope} findingId="finding" {...props} />)
const open = () => userEvent.click(screen.getByRole('button', { name: 'View recorded decisions' }))
describe('exact read-only contradiction history inspection', () => {
  it('subscribes only while open, exposes original recorded basis and unmounts on close', async () => {
    show(); expect(state.query).not.toHaveBeenCalled(); await open()
    expect(state.query).toHaveBeenLastCalledWith({ ...scope, findingId: 'finding', page: 1, pageSize: 10 }, { refetchOnMountOrArgChange: true })
    expect(screen.getByText('Recorded human rationale.')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Inspect recorded decision basis'))
    expect(screen.getByText('Original state version rsv2:original')).toBeInTheDocument()
    expect(screen.getByText(/Audit references and recalculation history are unavailable/)).toBeInTheDocument()
    const retry = state.buttons['Refresh decisions']; await userEvent.click(screen.getByRole('button', { name: 'Close decisions' }))
    act(() => retry()); expect(state.refresh).not.toHaveBeenCalled(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View recorded decisions' })).toHaveFocus()
  })
  it('restores the exact opener on Escape without retaining a history subscription', async () => {
    show(); await open(); fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View recorded decisions' })).toHaveFocus()
  })
  it('hides old rows while fetching or error, permits explicit retry in same scope', async () => {
    const view = show(); await open(); const retained = state.buttons['Refresh decisions']
    state.read = { ...state.read, isFetching: true }; view.rerender(<ContradictionHistoryInspector scope={scope} findingId="finding" />)
    expect(screen.queryByText('Recorded human rationale.')).not.toBeInTheDocument(); act(() => retained()); expect(state.refresh).not.toHaveBeenCalled()
    state.read = { ...state.read, isFetching: false, error: { status: 503 } }; view.rerender(<ContradictionHistoryInspector scope={scope} findingId="finding" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Recorded decisions unavailable')
    await userEvent.click(screen.getByRole('button', { name: 'Refresh decisions' })); expect(state.refresh).toHaveBeenCalledOnce()
  })
  it('pages without reusing cached previous-page data and rejects retained old page callback', async () => {
    state.read.currentData = response({ total: 11, totalPages: 2, records: Array.from({ length: 10 }, (_, index) => ({ ...row,
      reviewId: `5b4d1f42-d7e2-4a3f-af5c-${String(index).padStart(12, '0')}` })) })
    show(); await open(); const old = state.buttons['Next decisions']; await userEvent.click(screen.getByRole('button', { name: 'Next decisions' }))
    expect(state.query.mock.calls.at(-1)[0].page).toBe(2); expect(screen.queryByText('Recorded human rationale.')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Recorded decision history' })).toHaveFocus()
    act(() => old()); expect(state.query.mock.calls.at(-1)[0].page).toBe(2)
  })
  it('retained callbacks cannot refresh after live session change or unmount', async () => {
    const view = show(); await open(); const refresh = state.buttons['Refresh decisions']; state.revision = 1
    act(() => refresh()); expect(state.refresh).not.toHaveBeenCalled(); state.revision = 0; view.unmount(); act(() => refresh()); expect(state.refresh).not.toHaveBeenCalled()
  })
  it('absent history is distinct from empty; disabled/preview scope never starts a read', async () => {
    const view = show({ disabled: true }); expect(screen.getByRole('button', { name: 'View recorded decisions' })).toBeDisabled(); expect(state.query).not.toHaveBeenCalled()
    view.rerender(<ContradictionHistoryInspector scope={scope} findingId="finding" />)
    state.read.currentData = response({ available: false, completeness: 'UNAVAILABLE', reason: 'HISTORY_NOT_RECORDED', total: null, totalPages: null, records: [] })
    await open(); expect(screen.getByText(/No history receipt is recorded/)).toBeInTheDocument()
  })
})
