import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import QualityView from './QualityView.jsx'
import { filterQualityCandidates, readQualityCandidates, readQualityInspection } from './intelligenceQualityModel.js'

const candidate = (id = 'candidate-market', domain = 'Market', fact = 'Market is global') => ({
  contradictionId: id, domain, basis: 'Deterministic negation-language check.', severity: 'MEDIUM', reviewStatus: 'UNREVIEWED',
  evidenceObjectIds: [`${id}-a`, `${id}-b`],
  evidence: [{ evidenceObjectId: `${id}-a`, extractedFact: fact, reviewStatus: 'ACCEPTED', sourceType: 'DOCUMENT' }],
})
const response = { data: { candidates: [candidate(), candidate('candidate-products', 'Products', 'A different product claim')] } }
const show = props => render(<QualityView response={response} onSelectView={vi.fn()} {...props} />)

describe('scoped Quality inspection parser', () => {
  const context = 'workspace:revision:customer:tenant'
  const params = () => new URLSearchParams({ qualityInspectionContext: context, qualityPopulation: 'Recorded dispositions', qualityType: 'Contradiction', qualityQuery: ' Market ' })
  it('restores exact scoped enums and preserves query whitespace', () => {
    expect(readQualityInspection(params(), context)).toEqual({ population: 'Recorded dispositions', type: 'Contradiction', search: ' Market ', page: 1, sort: 'ID_ASC', invalid: false })
  })
  it.each(['workspace:other:customer:tenant', 'workspace:revision:other:tenant', 'workspace:revision:customer:other'])('ignores filters for another scope %s', scope => {
    expect(readQualityInspection(params(), scope)).toEqual({ population: null, type: 'All', search: '', page: 1, sort: 'ID_ASC', invalid: false })
  })
  it.each([['qualityPopulation', 'closed'], ['qualityType', 'constructor'], ['qualityQuery', 'x'.repeat(241)], ['qualityQuery', 'bad\u0000text'],
    ['qualityPage', '0'], ['qualityPage', '01'], ['qualityPage', '1.5'], ['qualityPage', '1001'], ['qualitySort', 'PRIORITY']])('rejects invalid matching-scope %s', (key, value) => {
    const input = params(); input.set(key, value)
    expect(readQualityInspection(input, context)).toEqual({ population: null, type: 'All', search: '', page: 1, sort: 'ID_ASC', invalid: true })
  })
  it('rejects duplicate inspection values', () => {
    const input = params(); input.append('qualityType', 'All')
    expect(readQualityInspection(input, context).invalid).toBe(true)
  })
  it('restores scoped independent page and ID order without losing other filters', () => {
    const input = params(); input.set('qualityPage', '2'); input.set('qualitySort', 'ID_DESC')
    expect(readQualityInspection(input, context)).toMatchObject({ population: 'Recorded dispositions', search: ' Market ', page: 2, sort: 'ID_DESC', invalid: false })
    input.append('qualityPage', '2'); expect(readQualityInspection(input, context).invalid).toBe(true)
  })
})

describe('Quality decision populations', () => {
  const rows = ['UNREVIEWED', 'REOPENED', 'STALE', 'NOT_CONTRADICTORY', 'CONFIRMED', 'UNKNOWN'].map(status => ({
    ...candidate(status, status), reviewStatus: status,
    ...(status === 'STALE' ? { latestReview: { contradictionId: status, disposition: 'NOT_CONTRADICTORY', rationale: 'Earlier evidence basis', reviewedAt: '2026-10-01T10:00:00Z' } } : {}),
  }))
  it('defaults to outstanding decisions, keeps stale reassessment, and exposes dispositions separately', async () => {
    show({ response: { data: { candidates: rows } } })
    const user = userEvent.setup()
    const queue = () => screen.getAllByRole('button').filter(button => button.textContent.includes(' · Contradiction')).map(button => button.textContent)
    expect(queue()).toHaveLength(3)
    expect(queue().some(value => value.includes('STALE'))).toBe(true)
    expect(queue().some(value => value.includes('NOT_CONTRADICTORY'))).toBe(false)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Finding population' }), 'Recorded dispositions')
    expect(queue()).toHaveLength(3)
    expect(queue().some(value => value.includes('NOT_CONTRADICTORY'))).toBe(true)
    expect(queue().some(value => value.includes('CONFIRMED'))).toBe(true)
    await user.click(screen.getByRole('button', { name: /STALE · Contradiction/ }))
    expect(screen.getByText('Stale review; not a current decision', { exact: false })).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Finding population' }), 'Detected candidates')
    expect(queue()).toHaveLength(6)
  })
  it.each(['NOT_CONTRADICTORY', 'CONFIRMED'])('opens exact current %s links without putting them in open decisions', async status => {
    show({ response: { data: { candidates: rows } }, findingId: status })
    expect(screen.getByRole('combobox', { name: 'Finding population' })).toHaveValue('Recorded dispositions')
    expect(screen.getByRole('heading', { name: `${status === 'CONFIRMED' ? 'Confirmed' : 'Not Contradictory'} contradiction candidate` })).toBeInTheDocument()
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Finding population' }), 'Open decisions')
    expect(screen.getByText(/exact linked finding is outside the selected population/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm governed action' })).not.toBeInTheDocument()
  })
  it('keeps unknown status out of both open and recorded populations but inspectable by exact link', () => {
    show({ response: { data: { candidates: rows } }, findingId: 'UNKNOWN' })
    expect(screen.getByRole('combobox', { name: 'Finding population' })).toHaveValue('Detected candidates')
    expect(screen.getByRole('heading', { name: 'Unknown contradiction candidate' })).toBeInTheDocument()
  })
  it('makes the Open findings metric select open decisions while retaining an exact completed finding link', async () => {
    show({ response: { data: { candidates: rows } }, findingId: 'NOT_CONTRADICTORY' })
    const metric = screen.getByRole('button', { name: /Open findings Complete findings read unavailable/ })
    expect(metric).toHaveAttribute('aria-pressed', 'false')
    await userEvent.setup().click(metric)
    expect(metric).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('combobox', { name: 'Finding population' })).toHaveValue('Open decisions')
    expect(screen.getByText(/exact linked finding is outside the selected population/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /NOT_CONTRADICTORY · Contradiction/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm governed action' })).not.toBeInTheDocument()
  })
  it('does not infer current review state from a renderer preview', () => {
    const preview = readQualityCandidates({ error: { status: 403 }, discovery: { discoveryHealth: { contradictionCandidates: rows } } })
    expect(preview.candidates.every(row => row.status === '' && row.latestReview === null)).toBe(true)
    show({ error: { status: 403 }, discovery: { discoveryHealth: { contradictionCandidates: rows } } })
    expect(screen.getByRole('combobox', { name: 'Finding population' })).toHaveValue('Detected candidates')
    expect(screen.getByRole('combobox', { name: 'Finding population' })).toBeDisabled()
  })
})

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
  it('opens each explicit evidence/source pair without changing locked truth', async () => {
    const row = candidate()
    row.evidence = row.evidenceObjectIds.map((id, index) => ({ evidenceObjectId: id, sourceId: `source-${index}`, extractedFact: `Fact ${index}` }))
    const onOpenSource = vi.fn()
    show({ response: { data: { candidates: [row] } }, locked: true, onOpenSource })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Open evidence A in Sources →' }))
    expect(onOpenSource).toHaveBeenLastCalledWith(row.contradictionId, 'source-0', row.evidenceObjectIds[0])
    await user.click(screen.getByRole('button', { name: 'Open evidence B in Sources →' }))
    expect(onOpenSource).toHaveBeenLastCalledWith(row.contradictionId, 'source-1', row.evidenceObjectIds[1])
    expect(screen.getByRole('button', { name: 'Confirm governed action' })).toBeDisabled()
  })
  it.each(['', 'x'.repeat(241)])('does not infer an exact source from lineage when explicit source ID is invalid', sourceId => {
    const row = candidate(); row.evidence[0].sourceId = sourceId; row.evidence[0].lineageRef = 'lineage:real-source:proof'
    const onOpenSource = vi.fn()
    show({ response: { data: { candidates: [row] } }, onOpenSource })
    expect(screen.getByRole('button', { name: 'Open evidence A in Sources →' })).toBeDisabled()
    expect(onOpenSource).not.toHaveBeenCalled()
  })
  it('disables exact provenance navigation for an oversized evidence identity', () => {
    const row = candidate(); row.evidenceObjectIds[0] = 'e'.repeat(241)
    row.evidence[0] = { sourceId: 'source-valid', evidenceObjectId: row.evidenceObjectIds[0], extractedFact: 'Recorded fact' }
    show({ response: { data: { candidates: [row] } }, onOpenSource: vi.fn() })
    expect(screen.getByRole('button', { name: 'Open evidence A in Sources →' })).toBeDisabled()
  })
  it('records only a selected supported disposition with the exact pair and human rationale', async () => {
    const user = userEvent.setup()
    const row = { ...candidate(), evidencePairHash: 'sha256:' + 'a'.repeat(64) }
    const actions = { canReviewFinding: true, decideFinding: vi.fn().mockResolvedValue(true) }
    show({ response: { data: { candidates: [row] } }, actions })
    const confirm = screen.getByRole('button', { name: 'Confirm governed action' })
    expect(confirm).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Not contradictory', exact: true }))
    await user.type(screen.getByRole('textbox', { name: 'Resolution rationale' }), 'The statements describe compatible contexts.')
    expect(confirm).toBeEnabled()
    await user.click(confirm)
    expect(screen.getByRole('status', { name: 'Quality decision status' })).toHaveFocus()
    expect(actions.decideFinding).toHaveBeenCalledWith(expect.objectContaining({ id: row.contradictionId, evidencePairHash: row.evidencePairHash }), 'NOT_CONTRADICTORY', 'The statements describe compatible contexts.')
    expect(screen.getByRole('textbox', { name: 'Resolution rationale' })).toHaveValue('')
  })
  it('does not substitute another candidate for an unavailable exact finding link', () => {
    show({ findingId: 'absent' })
    expect(screen.getByText('The exact linked finding is unavailable in this read. No other finding is substituted.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Market contradiction candidate' })).not.toBeInTheDocument()
  })
  it('requires a valid pair basis even when action authority is available', () => {
    show({ actions: { canReviewFinding: true, decideFinding: vi.fn() } })
    expect(screen.getByRole('button', { name: 'Not contradictory', exact: true })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Resolution rationale' })).toBeDisabled()
  })
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
    expect(screen.getByRole('button', { name: 'View recorded decisions' })).toBeDisabled()
  })
  it('shows 403 preview separately from failure and successful empty', () => {
    const view = show({ error: { status: 403 }, discovery: { discoveryHealth: { contradictionCandidates: [candidate()] } } })
    expect(screen.getByText('Contradiction preview only. Evidence detail requires update permission.')).toBeInTheDocument()
    expect(screen.queryByText('“Market is global”')).not.toBeInTheDocument()
    view.rerender(<QualityView response={response} error={{ status: 500 }} onSelectView={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Refresh to retry')
    expect(screen.queryByRole('heading', { name: 'Market contradiction candidate' })).not.toBeInTheDocument()
    view.rerender(<QualityView response={{ data: { candidates: [] } }} onSelectView={vi.fn()} />)
    expect(screen.getByText('No open decisions in the returned candidates. This does not prove whole-revision completion.')).toBeInTheDocument()
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
  it('hands exact evidence to Graph independently from locked mutation authority and retains Overview navigation', async () => {
    const onSelectView = vi.fn()
    const onOpenGraph = vi.fn()
    const user = userEvent.setup()
    show({ onSelectView, onOpenGraph, canOpenGraph: () => true, locked: true })
    await user.click(screen.getByRole('button', { name: 'Inspect evidence A in Graph →' }))
    expect(onOpenGraph).toHaveBeenLastCalledWith('candidate-market', 'candidate-market-a')
    expect(onSelectView).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Return to Intelligence overview →' }))
    expect(onSelectView).toHaveBeenLastCalledWith('Overview')
  })
})


it.each([['NOT_CONTRADICTORY', 'Not Contradictory', 'success'], ['CONFIRMED', 'Confirmed', 'danger'], ['UNREVIEWED', 'Unreviewed', 'warning'], ['STALE', 'Stale', 'neutral']])('uses the disposition tone for %s', (status, label, tone) => {
  const row = { ...candidate(), reviewStatus: status }
  show({ response: { data: { candidates: [row] } }, findingId: row.contradictionId })
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
