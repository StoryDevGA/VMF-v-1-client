import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import EvidenceReadinessView from './EvidenceReadinessView.jsx'
import { readEvidenceReadiness } from './evidenceReadinessModel.js'

const renderer = { discovery: { state: { status: 'ACCEPTED' }, needsRefresh: false, sourceRegistrySummary: { count: 0 }, discoveryHealth: { readiness: { state: 'READY' } } } }
const evidenceResponse = { data: { evidenceObjects: [{ evidenceObjectId: 'a' }], total: 853 } }
const candidateResponse = { data: { candidates: [{ contradictionId: 'one', domain: 'Market', reviewStatus: 'UNREVIEWED' }] } }
const props = { renderer, evidenceResponse, candidateResponse }
const read = changes => readEvidenceReadiness({ ...props, ...changes })
const show = changes => render(<MemoryRouter><EvidenceReadinessView {...props} workbenchHref="/app/runtime/rev-2/workbench" workspaceHref="/app/runtime/rev-2" onSelectView={vi.fn()} {...changes} /></MemoryRouter>)

describe('Evidence readiness contract', () => {
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
  it('does not substitute evidence counts or review statuses for ingestion or classifications', async () => {
    const user = userEvent.setup()
    show()
    expect(screen.getByText('Records read').nextElementSibling).toHaveTextContent('Unavailable')
    expect(screen.getByText('Last successful snapshot').nextElementSibling).toHaveTextContent('Unavailable')
    for (const name of ['Verified', 'Reported', 'Hypothesis', 'Unresolved', 'Contradicted', 'Requires confirmation']) {
      expect(screen.getByLabelText(`${name} count unavailable`)).toHaveTextContent('—')
    }
    expect(screen.getByRole('button', { name: 'Start recomputation' })).toBeDisabled()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Advanced evidence inspection' }))
    expect(screen.getByText(/853 evidence objects in the selected revision read/)).toBeVisible()
    expect(screen.queryByText('No recomputation needed')).not.toBeInTheDocument()
  })
  it('routes informational actions without mutation and preserves passed destinations', async () => {
    const user = userEvent.setup()
    const onSelectView = vi.fn()
    show({ onSelectView })
    for (const [name, target] of [['Synchronise sources', 'Sources'], ['View coverage gaps', 'Coverage'], ['← Intelligence overview', 'Overview']]) {
      await user.click(screen.getByRole('button', { name, exact: true }))
      expect(onSelectView).toHaveBeenLastCalledWith(target)
    }
    await user.click(screen.getByRole('button', { name: 'Review open issues', exact: true }))
    expect(onSelectView).toHaveBeenLastCalledWith('Intelligence Quality')
    await user.click(screen.getByRole('button', { name: 'Review recently added evidence', exact: true }))
    expect(onSelectView).toHaveBeenLastCalledWith('Sources')
    expect(screen.getByRole('link', { name: 'Add decision evidence' })).toHaveAttribute('href', '/app/runtime/rev-2/workbench')
    expect(screen.getByRole('link', { name: 'View workspace handoff →' })).toHaveAttribute('href', '/app/runtime/rev-2')
  })
  it('retains unavailable candidate and summary errors rather than reporting zero', () => {
    show({ evidenceError: { status: 503 }, candidateError: { status: 403 } })
    expect(screen.getByRole('status')).toHaveTextContent('Evidence summary could not be loaded')
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
    await user.click(screen.getByRole('button', { name: 'Review recently added evidence', exact: true }))
    expect(onSelectView).toHaveBeenLastCalledWith('Sources')
  })
  it('shows an evidence navigation link only for a verified empty read', () => {
    show({ evidenceResponse: { data: { evidenceObjects: [], total: 0 } }, candidateResponse: { data: { candidates: [] } } })
    expect(screen.getByRole('link', { name: 'Add evidence', exact: true })).toHaveAttribute('href', '/app/runtime/rev-2/workbench')
  })
})
