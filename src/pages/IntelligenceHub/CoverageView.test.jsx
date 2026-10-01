import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import CoverageView from './CoverageView.jsx'

const domain = (name, state, count) => ({ domain: name, state, connectedEvidenceCount: count, acceptedEvidenceCount: count, pendingEvidenceCount: 0, rejectedEvidenceCount: 0 })
const coverage = { available: true, coverage: { coverageModel: 'EVIDENCE_DOMAIN_COVERAGE', coveragePercent: 67, totalDomainCount: 3, coveredDomainCount: 2, missingDomains: ['Problems'], domains: [domain('Company', 'STRONG', 2), domain('Services', 'ADEQUATE', 1), domain('Problems', 'MISSING', 0)] } }
const props = () => ({ graphCoverage: coverage, qualityHref: '/quality?workspace=w&revision=r', workbenchHref: '/runtime/r/workbench', onSelectView: vi.fn(), onOpenSources: vi.fn(), isLoading: false })
const show = next => render(<MemoryRouter><CoverageView {...next} /></MemoryRouter>)

describe('CoverageView', () => {
  it('uses graph counts and server states without inventing domain scores or source diversity', () => {
    show({ ...props(), discovery: { acquisitionEffectiveness: { metrics: { coveragePercent: 100, sourceCount: 36 } } } })
    expect(screen.getByText('67%')).toBeInTheDocument()
    expect(screen.queryByText('100%')).not.toBeInTheDocument()
    const detail = within(screen.getByRole('region', { name: 'Selected coverage domain' }))
    expect(detail.getByText('2 objects')).toBeInTheDocument()
    expect(detail.getByText('Per-domain percentage unavailable')).toBeInTheDocument()
    expect(detail.getByText('Source diversity').nextSibling).toHaveTextContent('Unavailable')
    expect(detail.getByText('Connected sources').nextSibling).toHaveTextContent('Unavailable')
    expect(screen.getAllByLabelText('Domain coverage percentage unavailable')).toHaveLength(3)
  })

  it('selects exactly one domain, filters to a matching detail and preserves Missing instead of assigning materiality', async () => {
    const user = userEvent.setup()
    show(props())
    expect(within(screen.getByRole('group', { name: 'Coverage filters' })).getAllByRole('button')).toHaveLength(4)
    const map = within(screen.getByRole('region', { name: 'Coverage domains' }))
    expect(map.getAllByRole('button', { pressed: true })).toHaveLength(1)
    await user.click(map.getByRole('button', { name: /Problems/ }))
    expect(map.getAllByRole('button', { pressed: true })).toHaveLength(1)
    expect(screen.getByRole('region', { name: 'Selected coverage domain' })).toHaveTextContent('Problems domainMissing')
    await user.click(screen.getByRole('button', { name: 'Adequate', exact: true }))
    expect(map.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('region', { name: 'Selected coverage domain' })).toHaveTextContent('Services domainAdequate')
    expect(screen.queryByRole('link', { name: 'Open quality finding →' })).not.toBeInTheDocument()
  })

  it('shows an empty filter without keeping a hidden domain selected', async () => {
    const user = userEvent.setup()
    show({ ...props(), graphCoverage: { ...coverage, coverage: { ...coverage.coverage, domains: [domain('Company', 'STRONG', 2)] } } })
    await user.click(screen.getByRole('button', { name: 'Gaps', exact: true }))
    expect(screen.getByText('No domains match this filter.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Selected coverage domain' })).not.toHaveTextContent('Company domain')
  })

  it.each([{ isLoading: true, expected: 'Loading selected revision coverage…' }, { error: { status: 503 }, expected: 'Coverage could not be loaded. Refresh to retry.' }, { graphCoverage: { available: false, coverage: { ...coverage.coverage, coveragePercent: 0 } }, expected: 'No domain coverage projection is available for this selected revision.' }])('suppresses cached metrics and domains during an unsuccessful read: $expected', next => {
    show({ ...props(), ...next })
    expect(screen.queryByText('67%')).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Coverage domains' })).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(next.expected)
  })

  it('exposes read-only navigation contracts and passes the selected domain to Sources', async () => {
    const user = userEvent.setup()
    const next = props()
    show(next)
    await user.click(screen.getByRole('button', { name: 'View supporting evidence →' }))
    expect(next.onOpenSources).toHaveBeenCalledWith('Company')
    expect(screen.getByRole('link', { name: 'Acquire recommended evidence →' })).toHaveAttribute('href', next.workbenchHref)
    await user.click(screen.getByRole('button', { name: '← Review' }))
    await user.click(screen.getByRole('button', { name: 'Continue to Readiness & publish →' }))
    expect(next.onSelectView.mock.calls).toEqual([['Review'], ['Readiness & publish']])
  })
})
