import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import EvidenceReadinessView from './EvidenceReadinessView.jsx'
import { readEvidenceReadiness } from './evidenceReadinessModel.js'
import { evidenceInventoryFixture } from '../../test/evidenceInventoryFixture.js'

const renderer = { discovery: { state: { status: 'ACCEPTED' }, needsRefresh: false, sourceRegistrySummary: { count: 0 }, discoveryHealth: { readiness: { state: 'READY' } } } }
const evidenceResponse = { data: { evidenceObjects: [{ evidenceObjectId: 'a' }], total: 853 } }
const candidateResponse = { data: { candidates: [{ contradictionId: 'one', domain: 'Market', reviewStatus: 'UNREVIEWED' }] } }
const props = { renderer, evidenceResponse, candidateResponse }
const read = changes => readEvidenceReadiness({ ...props, ...changes })
const show = changes => render(<MemoryRouter><EvidenceReadinessView {...props} acquisitionHref="/app/intelligence?runtimeInstanceId=root&revisionId=rev-2&view=context" onSelectView={vi.fn()} {...changes} /></MemoryRouter>)

describe('Evidence readiness contract', () => {
  it('reads the canonical source population independently from evidence completeness', () => {
    expect(read({ sourceSummary: { uniqueSourceCount: 36 }, evidenceError: { status: 503 } }).sourceCount).toBe(36)
    expect(read({ sourceSummary: { uniqueSourceCount: 36 }, sourceSummaryLoading: true }).sourceCount).toBeNull()
    expect(read({ sourceSummary: null, renderer: { discovery: { sourceRegistrySummary: { count: 99 } } } }).sourceCount).toBeNull()
  })
  it('reconciles source conflict without discarding independently recorded readiness', () => {
    expect(read().total).toBe(853)
    expect(read().sourceCount).toBeNull()
    expect(read({ evidenceError: { status: 503 } }).interpretation).toBe('Ready')
    expect(read({ evidenceError: { status: 503 } }).total).toBeNull()
  })
  it.each([null, '853', -1, Infinity])('does not admit invalid totals %s', total => {
    expect(read({ evidenceResponse: { data: { evidenceObjects: [], total } } }).total).toBeNull()
    expect(read({ evidenceResponse: { data: { evidenceObjects: [], total } } }).sourceCount).toBeNull()
  })
  it('distinguishes verified empty, capped, loading and absent reads', () => {
    expect(read({ evidenceResponse: { data: { evidenceObjects: [], total: 0 } } }).tone).toBe('empty')
    expect(read({ evidenceResponse: { data: { evidenceObjects: [], total: 853, totalCapped: true } } }).total).toBeNull()
    expect(read({ evidenceLoading: true }).total).toBeNull()
    expect(read({ evidenceResponse: undefined }).total).toBeNull()
  })
  it('keeps refreshed flag and bounded candidates separate from snapshot and classification assertions', () => {
    expect(read().needsRefresh).toBe(false)
    expect(read().candidates.candidates).toHaveLength(1)
    expect(read({ renderer: { discovery: { needsRefresh: true } } }).label).toBe('Evidence refresh required')
    expect(read({ candidateError: { status: 503 } }).candidates.candidates).toBeNull()
  })
  it('keeps dismissed candidates separate from the Quality navigation action', () => {
    const model = read({ candidateResponse: { data: { candidates: [{ contradictionId: 'closed', reviewStatus: 'NOT_CONTRADICTORY' }] } } })
    expect(model.hasOpenCandidates).toBe(false)
    expect(model.next).toBe('Review open issues')
    expect(model.tone).toBe('ready')
  })
})

describe('Evidence readiness view', () => {
  it('does not navigate from an unavailable exact decision anchor', async () => {
    const select = vi.fn(); show({ onSelectView: select })
    for (const name of ['View supporting evidence', 'Inspect the source gap', 'Review what is missing']) {
      const button = screen.getByRole('button', { name, exact: true })
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('title', expect.stringContaining('exact recorded decision anchor is unavailable'))
      await userEvent.click(button)
    }
    expect(select).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Review recently added evidence' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Context for economic information' })).toHaveAttribute('href', '/app/intelligence?runtimeInstanceId=root&revisionId=rev-2&view=context')
  })
  it('shows complete current inventory and mapping qualification independently of frozen and target readiness', async () => {
    show({ inventory: evidenceInventoryFixture() })
    expect(screen.getByText('Records read').nextElementSibling).toHaveTextContent('853')
    expect(screen.getByLabelText('Current evidence inventory')).toHaveTextContent('mapping remains unassessed')
    expect(screen.getByText('Sections with enough evidence').nextElementSibling).toHaveTextContent('Unavailable')
    expect(screen.getByText('Recorded lock snapshot').nextElementSibling).toHaveTextContent('Unavailable')
    await userEvent.click(screen.getByRole('button', { name: 'Advanced evidence inspection' }))
    expect(screen.getByText('a'.repeat(64))).toBeVisible()
    expect(screen.getByText('source-one · ' + 'b'.repeat(64))).toBeVisible()
    expect(screen.getByRole('button', { name: 'Start recomputation' })).toBeDisabled()
  })
  it('hides old receipt counts while a refresh is checking the scope', () => {
    show({ inventory: null, inventoryLoading: true })
    expect(screen.getByText('Records read').nextElementSibling).toHaveTextContent('Loading…')
    expect(screen.getByLabelText('Current evidence inventory')).toHaveTextContent('Reading the current evidence inventory')
  })
  it('keeps current source processing separate from snapshot and sufficiency when evidence fails', () => {
    show({ sourceSummary: { sourceCompleteness: 'COMPLETE', uniqueSourceCount: 36, processingCompleteness: 'PARTIAL', knownProcessedCount: 1, unknownCount: 26, staleCount: 0 }, evidenceError: { status: 503 } })
    expect(screen.getByText('Sources connected').nextElementSibling).toHaveTextContent('36')
    expect(screen.getByLabelText('Current document processing')).toHaveTextContent('Unavailable · 1 verified, 26 unknown')
    expect(screen.getByText('Records read').nextElementSibling).toHaveTextContent('Unavailable')
    expect(screen.getByText('Sections with enough evidence').nextElementSibling).toHaveTextContent('Unavailable')
    expect(screen.getByRole('button', { name: 'Start recomputation' })).toBeDisabled()
  })
  it('hides retained source values during summary loading', () => {
    show({ sourceSummary: { uniqueSourceCount: 36, processingCompleteness: 'COMPLETE', documentsProcessed: 27 }, sourceSummaryLoading: true })
    expect(screen.getByText('Sources connected').nextElementSibling).toHaveTextContent('Loading…')
    expect(screen.getByLabelText('Current document processing')).toHaveTextContent('Documents processed: Loading…')
    expect(screen.queryByText('36')).not.toBeInTheDocument()
  })
  it('does not substitute evidence counts or review statuses for ingestion or classifications', async () => {
    const user = userEvent.setup()
    show()
    expect(screen.getByText('Records read').nextElementSibling).toHaveTextContent('Unavailable')
    expect(screen.getByText('Recorded lock snapshot').nextElementSibling).toHaveTextContent('Unavailable')
    for (const name of ['Verified', 'Reported', 'Hypothesis', 'Unresolved', 'Contradicted', 'Requires confirmation']) {
      expect(screen.getByLabelText(`${name} count unavailable`)).toHaveTextContent('—')
    }
    expect(screen.getByText(/A current authorised validation record/)).toHaveTextContent('Acceptance alone is insufficient.')
    expect(screen.getByText(/A current confirmed contradiction/)).toHaveTextContent('A detector candidate alone is insufficient.')
    expect(screen.getByText(/A recorded material question/)).toHaveTextContent('Missing classification is unknown, not Unresolved.')
    expect(screen.getByText(/A specific recorded confirmation requirement/)).toHaveTextContent('required actor and action identified')
    expect(screen.getByText(/Classification totals are unavailable/)).toHaveTextContent('unique current evidence IDs')
    expect(screen.getByText(/Classification totals are unavailable/)).toHaveTextContent('Labels may overlap, so buckets need not sum to the total.')
    expect(screen.getByText(/Classification totals are unavailable/)).toHaveTextContent('Verified and Contradicted on the same assertion and current basis require reconciliation.')
    expect(screen.queryByText('Directly supported by reviewed evidence')).not.toBeInTheDocument()
    expect(screen.queryByText('Accepted sources make incompatible claims')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start recomputation' })).toBeDisabled()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Advanced evidence inspection' }))
    expect(screen.getByText(/853 evidence objects in the separate paginated evidence read/)).toBeVisible()
    expect(screen.queryByText('No recomputation needed')).not.toBeInTheDocument()
  })
  it('routes informational actions without mutation and preserves passed destinations', async () => {
    const user = userEvent.setup()
    const onSelectView = vi.fn()
    show({ onSelectView })
    for (const [name, target] of [['Inspect sources', 'Sources'], ['Inspect coverage', 'Coverage'], ['← Review', 'Review'], ['Readiness & publish →', 'Readiness & publish']]) {
      await user.click(screen.getByRole('button', { name, exact: true }))
      expect(onSelectView).toHaveBeenLastCalledWith(target)
    }
    await user.click(screen.getByRole('button', { name: 'Review open issues', exact: true }))
    expect(onSelectView).toHaveBeenLastCalledWith('Intelligence Quality')
    await user.click(screen.getByRole('button', { name: 'Inspect source records', exact: true }))
    expect(onSelectView).toHaveBeenLastCalledWith('Sources')
    expect(screen.getByRole('link', { name: 'Open Context for decision inputs' })).toHaveAttribute('href', '/app/intelligence?runtimeInstanceId=root&revisionId=rev-2&view=context')
    expect(screen.queryByRole('link', { name: 'View workspace handoff →' })).not.toBeInTheDocument()
  })
  it('retains unavailable candidate and summary errors rather than reporting zero', () => {
    show({ evidenceError: { status: 503 }, candidateError: { status: 403 } })
    expect(screen.getByText('Evidence summary could not be loaded. Refresh to retry.')).toHaveAttribute('role', 'status')
    expect(screen.getByLabelText('Current evidence inventory')).toHaveAttribute('role', 'status')
    const issues = screen.getByText('What still needs evidence or authority?').closest('.card')
    expect(within(issues).getByText('No contradiction preview is available for this revision.', { exact: false })).toBeInTheDocument()
    expect(screen.queryByText('0 returned candidates')).not.toBeInTheDocument()
  })
  it.each([[], [{ contradictionId: 'closed', reviewStatus: 'NOT_CONTRADICTORY' }]])('keeps prototype navigation when candidates are not open: %j', async candidates => {
    const user = userEvent.setup()
    const onSelectView = vi.fn()
    show({ candidateResponse: { data: { candidates } }, onSelectView })
    await user.click(screen.getByRole('button', { name: 'Review open issues', exact: true }))
    expect(onSelectView).toHaveBeenLastCalledWith('Intelligence Quality')
    await user.click(screen.getByRole('button', { name: 'Inspect source records', exact: true }))
    expect(onSelectView).toHaveBeenLastCalledWith('Sources')
  })
  it('shows an evidence navigation link only for a verified empty read', () => {
    show({ evidenceResponse: { data: { evidenceObjects: [], total: 0 } }, candidateResponse: { data: { candidates: [] } } })
    expect(screen.getByRole('link', { name: 'Add evidence', exact: true })).toHaveAttribute('href', '/app/intelligence?runtimeInstanceId=root&revisionId=rev-2&view=context')
  })
})
