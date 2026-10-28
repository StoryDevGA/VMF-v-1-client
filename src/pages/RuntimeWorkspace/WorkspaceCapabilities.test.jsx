import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { buildWorkspaceCapabilityCards } from './workspaceCapabilitiesModel.js'
import { WorkspaceCapabilities } from './WorkspaceCapabilities.jsx'

const context = {
  workspaceRuntimeInstanceId: 'workspace-root',
  selectedRevisionId: 'selected-revision',
}

describe('WorkspaceCapabilities', () => {
  it('uses verified frozen counts and actual synthetic stage outcomes without suggesting customer output availability', () => {
    const cards = buildWorkspaceCapabilityCards({ ...context, controlledOutcome: { status: 'Controlled run failed', data: {
      basis: { counts: { sources: 8, evidence: 47 } }, run: { status: 'FAILED' },
      stages: [{ stageKey: 'WORKING_DRAFT', status: 'FAILED' }],
    } }, reviewCompletion: { population: { pendingFindings: 0, pendingEvidence: 0, confirmedReadinessBlockers: 0 } } })
    expect(cards[0].metrics.slice(0, 2)).toEqual([{ label: 'Sources', value: 8 }, { label: 'Evidence', value: 47 }])
    expect(cards[1].status).toBe('Review complete')
    expect(cards[3].status).toBe('Controlled run failed')
    expect(cards[3].metrics).toContainEqual({ label: 'ARL', value: null })
    expect(cards[3].metrics).toContainEqual({ label: 'Customer outputs', value: 'Prohibited' })
    expect(cards[3].eyebrow).toBe('CONTROLLED SYNTHETIC TEST')
  })
  it('renders the four prototype cards with context-preserving destination contracts', () => {
    render(
      <MemoryRouter>
        <WorkspaceCapabilities {...context} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Continue your work' })).toBeInTheDocument()
    expect(screen.getByText('Each capability shares this selected workspace and project revision.')).toBeInTheDocument()

    const expectedLinks = [
      ['/app/intelligence?runtimeInstanceId=workspace-root&revisionId=selected-revision', 'Open Intelligence Hub'],
      ['/app/intelligence/quality?runtimeInstanceId=workspace-root&revisionId=selected-revision', 'Review quality findings'],
      ['/app/workspace-structure?runtimeInstanceId=workspace-root&revisionId=selected-revision', 'Continue structure'],
      ['/app/runtime/selected-revision/outcome-studio?workspaceRuntimeInstanceId=workspace-root&revisionId=selected-revision', 'Open Outcome Studio'],
    ]

    for (const [href, label] of expectedLinks) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toHaveAttribute('href', href)
    }
  })

  it('does not substitute prototype sample values when summary data is missing', () => {
    render(
      <MemoryRouter>
        <WorkspaceCapabilities {...context} />
      </MemoryRouter>,
    )

    const hubCard = screen.getByRole('heading', { name: 'Intelligence Hub' }).closest('.card')
    expect(within(hubCard).getByLabelText('Sources: unavailable')).toHaveTextContent('—')
    expect(within(hubCard).getByLabelText('Evidence: unavailable')).toHaveTextContent('—')
    expect(within(hubCard).queryByText('32')).not.toBeInTheDocument()
    expect(within(hubCard).queryByText('773')).not.toBeInTheDocument()
  })

  it('preserves zero summaries and uses an uncapped evidence total', () => {
    render(
      <MemoryRouter>
        <WorkspaceCapabilities
          {...context}
          discovery={{
            sourceRegistrySummary: { count: 0 },
            lineageSummary: { sourceCount: 0 },
            acquisition: { coverage: { score: 90 } },
          }}
          discoveryHealth={{}}
          evidenceDetail={{
            total: 73,
            totalCapped: false,
            sourceRegistry: [{ sourceId: 'source-one' }, { sourceId: 'source-two' }],
            evidenceObjects: [{ evidenceObjectId: 'evidence-one' }, { evidenceObjectId: 'evidence-two' }],
          }}
        />
      </MemoryRouter>,
    )

    const hubCard = screen.getByRole('heading', { name: 'Intelligence Hub' }).closest('.card')
    expect(within(hubCard).getByLabelText('Sources: 0')).toHaveTextContent('0')
    expect(within(hubCard).getByLabelText('Evidence: 73')).toHaveTextContent('73')
    expect(within(hubCard).getByLabelText('Coverage: 90')).toHaveTextContent('90%')
  })

  it('keeps destination navigation disabled when the selected context is incomplete', () => {
    render(
      <MemoryRouter>
        <WorkspaceCapabilities workspaceRuntimeInstanceId="workspace-root" />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: /open intelligence hub/i })).not.toBeInTheDocument()
    expect(screen.getAllByText(/unavailable/i).length).toBeGreaterThan(0)
  })

  it('exposes loading status while the selected workspace summary is loading', () => {
    render(
      <MemoryRouter>
        <WorkspaceCapabilities {...context} loading />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('Loading')).toHaveLength(4)
    expect(screen.getByLabelText('Sources: loading')).toHaveTextContent('—')
  })
})

describe('capability count boundaries', () => {
  it('uses current native inventory counts instead of omitted-array renderer zeros', () => {
    const [hub] = buildWorkspaceCapabilityCards({ discovery: {
      sourceRegistrySummary: { count: 0 }, evidenceObjectSummary: { evidenceObjectCount: 0 },
    }, intelligenceInventory: { sources: { readCount: 8 }, evidence: { readCount: 30 } } })
    expect(hub.metrics.slice(0, 2).map(metric => metric.value)).toEqual([8, 30])
  })
  it('withholds Home counts when its current inventory is unavailable without renderer fallback', () => {
    const [hub] = buildWorkspaceCapabilityCards({ discovery: {
      sourceRegistrySummary: { count: 0 }, evidenceObjectSummary: { evidenceObjectCount: 0 },
    }, intelligenceInventory: null })
    expect(hub.metrics.slice(0, 2).map(metric => metric.value)).toEqual([null, null])
  })
  it('preserves genuine empty native inventory counts', () => {
    const [hub] = buildWorkspaceCapabilityCards({ intelligenceInventory: {
      sources: { readCount: 0 }, evidence: { readCount: 0 },
    } })
    expect(hub.metrics.slice(0, 2).map(metric => metric.value)).toEqual([0, 0])
  })
  it.each([true, undefined])('does not treat capped or unqualified totals as exact: %s', (totalCapped) => {
    const [hub] = buildWorkspaceCapabilityCards({
      evidenceDetail: { total: 100, totalCapped, evidenceObjects: Array(50).fill({}), sourceRegistry: [{ sourceId: 'one' }] },
    })
    expect(hub.metrics[0].value).toBeNull()
    expect(hub.metrics[1].value).toBeNull()
  })
  it('preserves an explicit zero evidence summary over lower-priority counts', () => {
    const [hub] = buildWorkspaceCapabilityCards({
      discovery: { evidenceObjectSummary: { evidenceObjectCount: 0 } },
      evidenceDetail: { total: 73, totalCapped: false },
    })
    expect(hub.metrics[1].value).toBe(0)
  })
})
