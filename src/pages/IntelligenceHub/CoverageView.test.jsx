import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import CoverageView from './CoverageView.jsx'

const domain = (name, state, count) => ({ domain: name, state, connectedEvidenceCount: count, acceptedEvidenceCount: count, pendingEvidenceCount: 0, rejectedEvidenceCount: 0 })
const coverage = { available: true, coverage: { coverageModel: 'EVIDENCE_DOMAIN_COVERAGE', coveragePercent: 67, totalDomainCount: 3, coveredDomainCount: 2, missingDomains: ['Problems'], domains: [domain('Company', 'STRONG', 2), domain('Services', 'ADEQUATE', 1), domain('Problems', 'MISSING', 0)] } }
const props = () => ({ graphCoverage: coverage, qualityHref: '/quality?workspace=w&revision=r', acquisitionHref: '/runtime/r/workbench', onSelectView: vi.fn(), onOpenSources: vi.fn(), isLoading: false })
function CoverageHarness({ next }) {
  const [inspection, setInspection] = useState(next.inspection || { filter: 'All', selectedDomain: '', notice: '' })
  return <CoverageView {...next} inspection={inspection} onInspectionChange={patch => setInspection(previous => ({ ...previous, ...patch }))} />
}
const show = next => render(<MemoryRouter><CoverageHarness next={next} /></MemoryRouter>)

describe('CoverageView', () => {
  it.each(['COMPLETE', 'PARTIAL'])('qualifies %s source facts and keeps unknown kinds separate', completeness => {
    const facts = { contractVersion: 'dig-connected-source-facts.v1', basis: 'RECORDED_CONNECTED_ACCEPTED_EVIDENCE',
      resolvedSourceCount: 1, unresolvedEvidenceCount: completeness === 'PARTIAL' ? 1 : 0,
      sourceCompleteness: completeness, unknownSourceTypeCount: 1, typeCompleteness: 'COMPLETE', sourceTypeCounts: [] }
    show({ ...props(), graphCoverage: { ...coverage, coverage: { ...coverage.coverage, domains: [{ ...coverage.coverage.domains[0], sourceFacts: facts }] } } })
    const detail = within(screen.getByRole('region', { name: 'Selected coverage domain' }))
    expect(detail.getByText('Source diversity').nextSibling).toHaveTextContent('0 recorded source kinds')
    expect(detail.getByText('Connected sources').nextSibling).toHaveTextContent(completeness === 'COMPLETE' ? '1 recorded identities' : 'Unavailable')
    expect(detail.getByText(/1 resolved source identities have an unknown kind/)).toBeInTheDocument()
    expect(detail.getByText(/do not establish independent corroboration/)).toBeInTheDocument()
    if (completeness === 'PARTIAL') expect(detail.getByText(/lower bound/)).toHaveTextContent('1 connected evidence objects have unresolved provenance')
  })
  it.each(['filtered', 'missing', 'invalid'])('does not substitute a domain for a %s request', kind => {
    show({ ...props(), inspection: { filter: kind === 'filtered' ? 'Gaps' : 'All', selectedDomain: kind === 'missing' ? 'Proof' : 'Company', notice: kind === 'invalid' ? 'Invalid inspection; reset it.' : '' } })
    const detail = screen.getByRole('region', { name: 'Selected coverage domain' })
    expect(detail).not.toHaveTextContent('Company')
    expect(screen.queryByRole('button', { name: 'Search domain sources' })).not.toBeInTheDocument()
  })
  it('drops current details if the selected domain disappears from the current read', () => {
    const next = props(), inspection = { filter: 'All', selectedDomain: 'Company', notice: '' }
    const { rerender } = render(<MemoryRouter><CoverageView {...next} inspection={inspection} onInspectionChange={vi.fn()} /></MemoryRouter>)
    expect(screen.getByRole('region', { name: 'Selected coverage domain' })).toHaveTextContent('Company')
    rerender(<MemoryRouter><CoverageView {...next} graphCoverage={{ ...coverage, coverage: { ...coverage.coverage, domains: [domain('Services', 'ADEQUATE', 1)] } }} inspection={inspection} onInspectionChange={vi.fn()} /></MemoryRouter>)
    expect(screen.getByRole('region', { name: 'Selected coverage domain' })).not.toHaveTextContent('Services')
  })
  it('uses graph counts and server states without inventing domain scores or source diversity', () => {
    show({ ...props(), discovery: { acquisitionEffectiveness: { metrics: { coveragePercent: 100, sourceCount: 36 } } } })
    expect(screen.getByText('67%')).toBeInTheDocument()
    expect(screen.queryByText('100%')).not.toBeInTheDocument()
    const detail = within(screen.getByRole('region', { name: 'Selected coverage domain' }))
    expect(detail.getByText('2',{exact:true})).toBeInTheDocument()
    expect(detail.getByText(/Per-domain percentage unavailable/)).toBeInTheDocument()
    expect(detail.getByText('Source diversity').nextSibling).toHaveTextContent('Unavailable')
    expect(detail.getByText('Connected sources').nextSibling).toHaveTextContent('Unavailable')
    expect(screen.queryByLabelText('Domain coverage percentage unavailable')).not.toBeInTheDocument()
  })

  it('selects exactly one domain, filters to a matching detail and preserves Missing instead of assigning materiality', async () => {
    const user = userEvent.setup()
    show(props())
    expect(within(screen.getByRole('group', { name: 'Coverage filters' })).getAllByRole('button')).toHaveLength(4)
    const map = within(screen.getByRole('region', { name: 'Coverage domains' }))
    expect(map.getAllByRole('button', { pressed: true })).toHaveLength(1)
    await user.click(map.getByRole('button', { name: /Problems/ }))
    expect(map.getAllByRole('button', { pressed: true })).toHaveLength(1)
    expect(screen.getByRole('region', { name: 'Selected coverage domain' })).toHaveTextContent('ProblemsMissing')
    await user.click(screen.getByRole('button', { name: 'Adequate', exact: true }))
    expect(map.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('region', { name: 'Selected coverage domain' })).toHaveTextContent('ServicesAdequate')
    expect(screen.getByRole('link', { name: 'Open Intelligence Quality →' })).toHaveAttribute('href', '/quality?workspace=w&revision=r')
  })

  it('shows an empty filter without keeping a hidden domain selected', async () => {
    const user = userEvent.setup()
    show({ ...props(), graphCoverage: { ...coverage, coverage: { ...coverage.coverage, domains: [domain('Company', 'STRONG', 2)] } } })
    await user.click(screen.getByRole('button', { name: 'Gaps', exact: true }))
    expect(screen.getByText('No domains match this filter.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Selected coverage domain' })).not.toHaveTextContent('Company')
  })

  it.each([{ isLoading: true, expected: 'Loading selected revision coverage…' }, { error: { status: 503 }, expected: 'Coverage could not be loaded. Refresh to retry.' }, { graphCoverage: { available: false, coverage: { ...coverage.coverage, coveragePercent: 0 } }, expected: 'No domain coverage projection is available for this selected revision.' }])('suppresses cached metrics and domains during an unsuccessful read: $expected', next => {
    show({ ...props(), ...next })
    expect(screen.queryByText('67%')).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Coverage domains' })).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Coverage read status' })).toHaveTextContent(next.expected)
  })

  it('exposes read-only navigation contracts and passes the selected domain to Sources', async () => {
    const user = userEvent.setup()
    const next = props()
    show(next)
    await user.click(screen.getByRole('button', { name: 'Search domain sources' }))
    expect(next.onOpenSources).toHaveBeenCalledWith('Company')
    expect(screen.getByRole('link', { name: 'Gather evidence' })).toHaveAttribute('href', next.acquisitionHref)
    await user.click(screen.getByRole('button', { name: 'After lock' }))
    await user.click(screen.getByRole('button', { name: 'Intelligence Graph' }))
    expect(next.onSelectView.mock.calls).toEqual([['After lock'], ['Intelligence Graph']])
  })

  it.each([{ isLoading: true }, { error: { status: 503 } }])('keeps the approved footer journey available during an unsuccessful coverage read %#', async state => {
    const next = { ...props(), ...state }, user = userEvent.setup()
    show(next)
    await user.click(screen.getByRole('button', { name: 'After lock' }))
    await user.click(screen.getByRole('button', { name: 'Intelligence Graph' }))
    expect(next.onSelectView.mock.calls).toEqual([['After lock'], ['Intelligence Graph']])
  })
})

const coverageGuardCalls=vi.hoisted(()=>({handlers:{}}))
vi.mock('../../components/Button',async original=>{const actual=await original();return {...actual,Button:props=>{const text=Array.isArray(props.children)?props.children.filter(c=>typeof c==='string').join(''):props.children;if(typeof text==='string')coverageGuardCalls.handlers[text]=props.onClick;return <actual.Button {...props}/>}}})
it('matches the three-summary structure and inspects actual domain basis',async()=>{
  show(props());expect(screen.getByLabelText('Coverage summary')).toHaveTextContent('67%Domain coverage2 of 3Domains supported1Missing domains')
  const opener=screen.getByRole('button',{name:'Inspect evidence and source basis'});await userEvent.click(opener)
  const dialog=screen.getByRole('dialog',{name:'Company: evidence and source basis'});expect(dialog).toHaveTextContent('Not supplied');expect(within(dialog).getAllByRole('option')).toHaveLength(1)
  await userEvent.click(screen.getByRole('button',{name:'Back to Coverage'}));expect(opener).toHaveFocus()
})
it.each([{active:false},{canInspect:false},{stateVersion:'new-version'},{route:'new-route'},{isLoading:true},{error:{status:503}},{graphCoverage:{available:false}}])('invalidates inspector and retained actions on owner departure %j',changes=>{
  const next=props(),inspection={filter:'All',selectedDomain:'Company',notice:''};const tree=extra=><MemoryRouter><CoverageView {...next} inspection={inspection} onInspectionChange={vi.fn()} {...extra}/></MemoryRouter>
  const view=render(tree());fireEvent.click(screen.getByRole('button',{name:'Inspect evidence and source basis'}));const retained=coverageGuardCalls.handlers['Search domain sources']
  view.rerender(tree(changes));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();act(()=>retained());expect(next.onOpenSources).not.toHaveBeenCalled()
  view.rerender(tree());expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
