import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import QualityView from './QualityView.jsx'
import { filterQualityCandidates, readQualityCandidates } from './intelligenceQualityModel.js'

const candidate = (id = 'candidate-market', domain = 'Market', fact = 'Market is global') => ({
  contradictionId: id, domain, basis: 'Deterministic negation-language check.', severity: 'MEDIUM', reviewStatus: 'UNREVIEWED',
  evidenceObjectIds: [`${id}-a`, `${id}-b`],
  evidence: [{ evidenceObjectId: `${id}-a`, extractedFact: fact, reviewStatus: 'ACCEPTED', sourceType: 'DOCUMENT' }],
})
const response = { data: { candidates: [candidate(), candidate('candidate-products', 'Products', 'A different product claim')] } }
const show = props => render(<QualityView response={response} onSelectView={vi.fn()} {...props} />)

describe('bounded Quality read model', () => {
  it('uses only validated evidence references and candidate-specific latest review', () => {
    const row = candidate()
    row.evidence.push({ evidenceObjectId: 'other', extractedFact: 'Unrelated evidence' })
    row.latestReview = { contradictionId: 'different', rationale: 'Unrelated review' }
    const result = readQualityCandidates({ response: { data: { candidates: [row] } } })
    expect(result.candidates[0].evidence).toHaveLength(1)
    expect(result.candidates[0].latestReview).toBeNull()
    expect(result.candidates[0]).not.toHaveProperty('priority')
  })
  it('caps candidate previews and strips detail on a 403', () => {
    const result = readQualityCandidates({ error: { status: 403 }, response,
      discovery: { discoveryHealth: { contradictionCandidates: Array.from({ length: 10 }, (_, index) => candidate(`preview-${index}`)) } } })
    expect(result.candidates).toHaveLength(8)
    expect(result.candidates.every(row => !row.evidence.length && !row.latestReview)).toBe(true)
    expect(result.preview).toBe(true)
  })
  it('does not convert errors or missing reads into empty success', () => {
    expect(readQualityCandidates({ response, error: { status: 503 } }).candidates).toBeNull()
    expect(readQualityCandidates({ error: { status: 403 } }).candidates).toBeNull()
    expect(readQualityCandidates({ response: { data: {} } }).candidates).toBeNull()
    expect(readQualityCandidates({ response, isLoading: true }).candidates).toBeNull()
    expect(readQualityCandidates({ response: { data: { candidates: [] } } }).candidates).toEqual([])
  })
  it('searches the returned set by ID, domain and detection basis', () => {
    const { candidates } = readQualityCandidates({ response })
    expect(filterQualityCandidates(candidates, 'All', ' PRODUCTS ')).toHaveLength(1)
    expect(filterQualityCandidates(candidates, 'All', 'candidate-market')).toHaveLength(1)
    expect(filterQualityCandidates(candidates, 'All', 'negation')).toHaveLength(2)
    expect(filterQualityCandidates(candidates, 'Missing coverage', '')).toEqual([])
  })
})

describe('Quality view', () => {
  it('changes the detail with selection and clears it when search excludes the candidate', async () => {
    const user = userEvent.setup()
    show()
    expect(screen.getByText('“Market is global”')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /candidate-products · Contradiction/ }))
    expect(screen.getByText('“A different product claim”')).toBeInTheDocument()
    expect(screen.queryByText('“Market is global”')).not.toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Search quality findings' }), 'not present')
    expect(screen.getByText('No candidates match this search.')).toBeInTheDocument()
    expect(screen.queryByText('“A different product claim”')).not.toBeInTheDocument()
  })
  it('preserves unavailable type states without suggesting no issues exist', async () => {
    show()
    await userEvent.setup().click(within(screen.getByRole('group', { name: 'Finding type filter' })).getByRole('button', { name: 'Weak confidence' }))
    expect(screen.getByText('Weak confidence findings are not supplied by the available API.')).toBeInTheDocument()
    expect(screen.queryByText('No contradiction candidates returned for this revision.')).not.toBeInTheDocument()
  })
  it('keeps governance unavailable and states verified lock explicitly', () => {
    show({ locked: true })
    expect(screen.getByText('This revision is locked. Governed resolution is unavailable here.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm governed action' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Resolution rationale' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Filter by priority' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Start highest priority →' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'View complete history' })).toBeDisabled()
  })
  it('shows 403 preview separately from failure and successful empty', () => {
    const view = show({ error: { status: 403 }, discovery: { discoveryHealth: { contradictionCandidates: [candidate()] } } })
    expect(screen.getByText('Contradiction preview only. Evidence detail requires update permission.')).toBeInTheDocument()
    expect(screen.queryByText('“Market is global”')).not.toBeInTheDocument()
    view.rerender(<QualityView response={response} error={{ status: 500 }} onSelectView={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Refresh to retry')
    expect(screen.queryByRole('heading', { name: 'Market contradiction candidate' })).not.toBeInTheDocument()
    view.rerender(<QualityView response={{ data: { candidates: [] } }} onSelectView={vi.fn()} />)
    expect(screen.getByText('No contradiction candidates returned for this revision.')).toBeInTheDocument()
  })
  it('does not expose stale detail while a refresh is in progress', () => {
    show({ isLoading: true })
    expect(screen.getByText('Loading quality candidates…')).toBeInTheDocument()
    expect(screen.queryByText('“Market is global”')).not.toBeInTheDocument()
  })
  it('opens an honest explanation and returns focus to its trigger', async () => {
    const user = userEvent.setup()
    show()
    const trigger = screen.getByRole('button', { name: 'Recommendation availability' })
    await user.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Advisor recommendation explanation' })).toHaveTextContent('No recorded Advisor recommendation')
    await user.click(screen.getByRole('button', { name: 'Close', exact: true }))
    expect(trigger).toHaveFocus()
  })
  it('keeps history candidate-specific and never calls it complete', () => {
    const row = candidate()
    row.latestReview = { contradictionId: row.contradictionId, disposition: 'CONFIRMED', rationale: 'Real saved reason', reviewedAt: '2026-10-01T10:00:00Z' }
    show({ response: { data: { candidates: [row] } } })
    expect(screen.getByText('Real saved reason')).toBeInTheDocument()
    expect(screen.getByText(/Latest review only; not complete history/)).toBeInTheDocument()
  })
  it('uses the shared navigation callbacks for Graph and Overview', async () => {
    const onSelectView = vi.fn()
    const user = userEvent.setup()
    show({ onSelectView })
    await user.click(screen.getByRole('button', { name: 'View in Intelligence Graph →' }))
    expect(onSelectView).toHaveBeenLastCalledWith('Intelligence Graph')
    await user.click(screen.getByRole('button', { name: 'Return to Intelligence overview →' }))
    expect(onSelectView).toHaveBeenLastCalledWith('Overview')
  })
})


it.each([['NOT_CONTRADICTORY', 'Not Contradictory', 'success'], ['CONFIRMED', 'Confirmed', 'danger'], ['UNREVIEWED', 'Unreviewed', 'warning'], ['STALE', 'Stale', 'neutral']])('uses the disposition tone for %s', (status, label, tone) => {
  const row = { ...candidate(), reviewStatus: status }
  show({ response: { data: { candidates: [row] } } })
  expect(screen.getByText(label).closest('.badge')).toHaveClass(`badge--${tone}`)
})


const previewProps = { error: { status: 403 }, discovery: { discoveryHealth: { contradictionCandidates: [candidate()] } } }
it('opens the availability explanation for a validated 403 preview without exposing evidence', async () => {
  show(previewProps)
  const user = userEvent.setup()
  const trigger = screen.getByRole('button', { name: 'Recommendation availability' })
  await user.click(trigger)
  expect(screen.getByRole('dialog')).toHaveTextContent('Deterministic negation-language check.')
  expect(screen.queryByText('“Market is global”')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Close', exact: true }))
  expect(trigger).toHaveFocus()
})
it.each([{ isLoading: true }, { error: { status: 503 } }, { ...previewProps, discovery: {} }])('dismisses a preview explanation when its read becomes unavailable (%j)', async next => {
  const view = show(previewProps)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Recommendation availability' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  view.rerender(<QualityView {...next} onSelectView={vi.fn()} />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  view.rerender(<QualityView {...previewProps} onSelectView={vi.fn()} />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
