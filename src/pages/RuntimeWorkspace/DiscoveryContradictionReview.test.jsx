import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  useGetRuntimeDiscoveryContradictionsQuery,
  useReviewRuntimeDiscoveryContradictionMutation,
} from '../../store/api/runtimeInstanceApi.js'
import DiscoveryContradictionReview from './DiscoveryContradictionReview'

vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetRuntimeDiscoveryContradictionsQuery: vi.fn(),
  useReviewRuntimeDiscoveryContradictionMutation: vi.fn(),
}))

let query
let payload
const mutate = vi.fn()
const unwrap = vi.fn()
const refetch = vi.fn()
const renderReview = () => render(<DiscoveryContradictionReview runtimeInstanceId="runtime-1" />)
const openPair = () => fireEvent.click(screen.getByRole('button', { name: 'View evidence pair' }))
const complete = (disposition = 'NOT_CONTRADICTORY') => {
  fireEvent.change(screen.getByLabelText('Decision'), { target: { value: disposition } })
  fireEvent.change(screen.getByLabelText(/Rationale/), { target: { value: 'Different reporting periods.' } })
  fireEvent.click(screen.getByRole('checkbox'))
}

beforeEach(() => {
  vi.clearAllMocks()
  payload = {
    runtimeUpdatedAt: '2026-09-03T00:00:00.000Z', canReview: true,
    candidates: [{
      contradictionId: 'pair-1', domain: 'Company', severity: 'HIGH', basis: 'Different employee counts',
      evidencePairHash: `sha256:${'a'.repeat(64)}`, reviewStatus: 'UNREVIEWED', latestReview: null,
      evidence: [1, 2].map((id) => ({ evidenceObjectId: `evidence-${id}`, sourceId: `source-${id}`,
        sourceType: 'WEBSITE', lineageRef: `lineage-${id}`, extractedFact: `Full fact ${id}\nAdditional context ${id}`,
        reviewStatus: 'ACCEPTED', validationStatus: 'VALIDATED' })),
    }],
  }
  query = { currentData: { data: payload }, isFetching: false, isLoading: false, refetch }
  useGetRuntimeDiscoveryContradictionsQuery.mockImplementation(() => query)
  unwrap.mockReset().mockResolvedValue({ data: {} })
  mutate.mockReturnValue({ unwrap })
  useReviewRuntimeDiscoveryContradictionMutation.mockReturnValue([mutate, { isLoading: false }])
})

describe('DiscoveryContradictionReview', () => {
  it('shows the complete evidence pair, provenance and latest review without truncating facts', () => {
    payload.candidates[0].evidence[0].extractedFact = 'Long fact '.repeat(500) + '<script>literal only</script>'
    payload.candidates[0].latestReview = { disposition: 'REOPENED', reviewedBy: 'reviewer-1', reviewedAt: '2026-09-02T12:00:00Z', rationale: 'Reopened because the evidence changed.' }
    renderReview()
    openPair()
    const first = screen.getByRole('region', { name: 'Evidence 1' })
    expect(first).toHaveTextContent(payload.candidates[0].evidence[0].extractedFact)
    expect(first.querySelector('script')).toBeNull()
    expect(first).toHaveTextContent('source-1')
    expect(first).toHaveTextContent('lineage-1')
    expect(first).toHaveTextContent('ACCEPTED')
    expect(first).toHaveTextContent('VALIDATED')
    expect(screen.getByRole('region', { name: 'Evidence 2' })).toHaveTextContent('Additional context 2')
    const history = screen.getByRole('region', { name: 'Latest review' })
    expect(history).toHaveTextContent('reviewer-1')
    expect(history).toHaveTextContent('2026-09-02T12:00:00Z')
    expect(history).toHaveTextContent('Reopened because the evidence changed.')
    expect(screen.getByRole('button', { name: 'Save review' })).toBeDisabled()
  })

  it.each(['NOT_CONTRADICTORY', 'CONFIRMED', 'REOPENED'])('submits %s once with exact snapshot and explicit confirmation', async (disposition) => {
    renderReview()
    openPair()
    complete(disposition)
    fireEvent.click(screen.getByRole('button', { name: 'Save review' }))
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1))
    expect(mutate).toHaveBeenCalledWith({ runtimeInstanceId: 'runtime-1', contradictionId: 'pair-1', body: {
      expectedUpdatedAt: payload.runtimeUpdatedAt, expectedEvidencePairHash: payload.candidates[0].evidencePairHash,
      disposition, rationale: 'Different reporting periods.', confirm: true,
    } })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('UNREVIEWED')).toBeInTheDocument()
  })

  it('requires an explicit decision, trimmed 10–2000 character rationale and checkbox; edits reset confirmation', () => {
    renderReview()
    openPair()
    const save = screen.getByRole('button', { name: 'Save review' })
    fireEvent.change(screen.getByLabelText(/Rationale/), { target: { value: 'Valid explanation' } })
    fireEvent.click(screen.getByRole('checkbox'))
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Decision'), { target: { value: 'CONFIRMED' } })
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    for (const rationale of ['         x', '123456789', 'x'.repeat(2001)]) {
      fireEvent.change(screen.getByLabelText(/Rationale/), { target: { value: rationale } })
      fireEvent.click(screen.getByRole('checkbox'))
      expect(save).toBeDisabled()
    }
    fireEvent.change(screen.getByLabelText(/Rationale/), { target: { value: 'x'.repeat(2000) } })
    fireEvent.click(screen.getByRole('checkbox'))
    expect(save).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Close', exact: true }))
    expect(mutate).not.toHaveBeenCalled()
  })

  it('loads locked or stale runtimes for read-only inspection and directs to an editable revision', () => {
    payload.canReview = false
    renderReview()
    expect(useGetRuntimeDiscoveryContradictionsQuery).toHaveBeenCalledWith({ runtimeInstanceId: 'runtime-1' }, { skip: false })
    expect(screen.getByText(/Use an editable, current revision to submit/)).toBeInTheDocument()
    openPair()
    expect(screen.getByRole('region', { name: 'Evidence 1' })).toBeInTheDocument()
    expect(screen.getByLabelText('Decision')).toBeDisabled()
    expect(screen.getByRole('checkbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save review' })).toBeDisabled()
  })

  it.each(['empty hash', 'missing evidence', 'missing fact'])('disables review for %s', (reason) => {
    if (reason === 'empty hash') payload.candidates[0].evidencePairHash = ''
    if (reason === 'missing evidence') payload.candidates[0].evidence.pop()
    if (reason === 'missing fact') payload.candidates[0].evidence[0].extractedFact = ''
    renderReview()
    openPair()
    expect(screen.getByText(/pair is incomplete or invalid/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save review' })).toBeDisabled()
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it.each(['runtime', 'hash', 'permission', 'fetching', 'read error'])('blocks an open review after a %s change', (change) => {
    const view = renderReview()
    openPair()
    complete()
    if (change === 'runtime') query = { ...query, currentData: { data: { ...payload, runtimeUpdatedAt: 'later' } } }
    if (change === 'hash') query = { ...query, currentData: { data: { ...payload, candidates: [{ ...payload.candidates[0], evidencePairHash: 'changed' }] } } }
    if (change === 'permission') query = { ...query, currentData: { data: { ...payload, canReview: false } } }
    if (change === 'fetching') query = { ...query, isFetching: true }
    if (change === 'read error') query = { ...query, error: { status: 403 } }
    view.rerender(<DiscoveryContradictionReview runtimeInstanceId="runtime-1" />)
    expect(screen.getByRole('button', { name: 'Save review' })).toBeDisabled()
    expect(mutate).not.toHaveBeenCalled()
  })

  it.each([403, 409, 422, 500])('does not retry or claim success on PATCH %s', async (status) => {
    unwrap.mockRejectedValue({ status })
    renderReview()
    openPair()
    complete()
    fireEvent.click(screen.getByRole('button', { name: 'Save review' }))
    await waitFor(() => expect(screen.getByText(status === 409 ? /runtime or evidence changed/ : /Review was not confirmed saved/)).toBeInTheDocument())
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Save review' })).toBeDisabled()
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(refetch).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('guards repeated clicks while the mutation is unresolved and waits for server data', async () => {
    let finish
    unwrap.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    renderReview()
    openPair()
    complete()
    const save = screen.getByRole('button', { name: 'Save review' })
    fireEvent.click(save)
    fireEvent.click(save)
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('UNREVIEWED')).toBeInTheDocument()
    finish({ data: {} })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it.each(['UNREVIEWED', 'STALE', 'NOT_CONTRADICTORY', 'CONFIRMED', 'REOPENED'])('displays authoritative %s without deriving gate state', (status) => {
    payload.candidates[0].reviewStatus = status
    renderReview()
    expect(screen.getByText(status)).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('distinguishes loading, denied access and an empty result; refresh only reads', () => {
    query = { ...query, currentData: undefined, isLoading: true, isFetching: true }
    const view = renderReview()
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    expect(screen.queryByText('No contradiction candidates.')).not.toBeInTheDocument()
    query = { ...query, isLoading: false, isFetching: false, error: { status: 403 } }
    view.rerender(<DiscoveryContradictionReview runtimeInstanceId="runtime-1" />)
    expect(screen.getByRole('alert')).toHaveTextContent('VMF update permission')
    query = { ...query, error: undefined, currentData: { data: { ...payload, candidates: [] } } }
    view.rerender(<DiscoveryContradictionReview runtimeInstanceId="runtime-1" />)
    expect(screen.getByText('No contradiction candidates.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh reviews' }))
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(mutate).not.toHaveBeenCalled()
  })
})
