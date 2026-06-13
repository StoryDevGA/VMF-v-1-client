import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RuntimeGraphPanel } from './RuntimeGraphPanel.jsx'

const graphProjection = {
  available: true,
  graphVersion: '2.2',
  nodes: [
    {
      nodeId: 'source-1',
      nodeType: 'SOURCE',
      entityDisplayName: 'Source',
      label: 'https://raw-source.example/private',
      textContent: 'raw source text should not render',
    },
    {
      nodeId: 'evidence-1',
      nodeType: 'EVIDENCE',
      coverageDomain: 'company',
      entityDisplayName: 'Evidence',
      label: 'raw evidence label should not render',
      metadata: {
        validationStatus: 'VALIDATED',
      },
    },
    {
      nodeId: 'section-truth-1',
      nodeType: 'SECTION_TRUTH',
      entityDisplayName: 'Section Truth',
      label: 'Customer Problem Accepted Truth',
      sectionKey: 'customer_problem',
      metadata: {
        readinessContribution: 'SUPPORTING',
        validationStatus: 'VALIDATED',
      },
    },
    {
      nodeId: 'hidden-1',
      nodeType: 'INTELLIGENCE',
      entityDisplayName: 'Intelligence',
      label: 'Hidden intelligence',
      customerVisible: false,
    },
  ],
  edges: [
    {
      edgeId: 'edge-1',
      edgeType: 'SOURCE_PRODUCES_EVIDENCE',
      relationshipDisplayName: 'Source Produces Evidence',
      fromNodeId: 'source-1',
      toNodeId: 'evidence-1',
      customerVisible: true,
    },
    {
      edgeId: 'edge-2',
      edgeType: 'INTELLIGENCE_SUPPORTS_SECTION_TRUTH',
      relationshipDisplayName: 'Intelligence Supports Section Truth',
      fromNodeId: 'evidence-1',
      toNodeId: 'section-truth-1',
      customerVisible: true,
    },
    {
      edgeId: 'hidden-edge',
      edgeType: 'NODE_HAS_SIGNAL',
      relationshipDisplayName: 'Hidden Signal',
      fromNodeId: 'hidden-1',
      toNodeId: 'section-truth-1',
      customerVisible: true,
    },
  ],
}

describe('RuntimeGraphPanel', () => {
  it('renders customer-visible relationships without raw source or evidence labels', () => {
    render(<RuntimeGraphPanel graph={graphProjection} />)

    const graphPanel = screen.getByRole('region', { name: /runtime intelligence graph/i })
    expect(within(graphPanel).getByText('Runtime Intelligence Graph')).toBeInTheDocument()
    expect(within(graphPanel).getByText('3 nodes / 3 relationships')).toBeInTheDocument()
    expect(within(graphPanel).getByText('v2.2')).toBeInTheDocument()
    expect(within(graphPanel).getByRole('button', { name: 'Open full-screen graph' })).toBeInTheDocument()
    expect(
      within(graphPanel).getByRole('img', { name: 'Runtime intelligence force-directed network' }),
    ).toBeInTheDocument()
    expect(within(graphPanel).getAllByText('Network view includes 3 of 3 nodes and 2 of 2 validated links.')).toHaveLength(2)
    expect(within(graphPanel).getByText('Showing 2 of 3 customer-visible relationships.')).toBeInTheDocument()

    const relationshipList = within(graphPanel).getByRole('list', { name: 'Runtime intelligence relationships' })
    const relationships = within(relationshipList).getAllByRole('listitem')
    expect(relationships).toHaveLength(2)
    expect(within(relationshipList).getByText('Source Produces Evidence')).toBeInTheDocument()
    expect(within(relationshipList).getByText('Intelligence Supports Section Truth')).toBeInTheDocument()
    expect(within(relationshipList).getAllByText('Company Evidence')).toHaveLength(2)
    expect(within(relationshipList).getByText('Customer Problem Accepted Truth')).toBeInTheDocument()

    expect(screen.queryByText('https://raw-source.example/private')).not.toBeInTheDocument()
    expect(screen.queryByText('raw source text should not render')).not.toBeInTheDocument()
    expect(screen.queryByText('raw evidence label should not render')).not.toBeInTheDocument()
    expect(screen.queryByText('Hidden intelligence')).not.toBeInTheDocument()
    expect(screen.queryByText('Hidden Signal')).not.toBeInTheDocument()
  })

  it('excludes malformed graph ids while preserving valid numeric ids', () => {
    render(<RuntimeGraphPanel graph={{
      available: true,
      nodes: [
        {
          nodeId: 'source-1',
          nodeType: 'SOURCE',
          entityDisplayName: 'Source',
          label: 'https://valid-source.example/private',
        },
        {
          nodeId: '   ',
          nodeType: 'EVIDENCE',
          coverageDomain: 'services',
          entityDisplayName: 'Evidence',
          label: 'invalid blank id evidence should not render',
        },
        {
          nodeId: 0,
          nodeType: 'EVIDENCE',
          coverageDomain: 'company',
          entityDisplayName: 'Evidence',
          label: 'raw numeric id evidence should not render',
        },
      ],
      edges: [
        {
          edgeId: 'valid-numeric-edge',
          edgeType: 'SOURCE_PRODUCES_EVIDENCE',
          relationshipDisplayName: 'Source Produces Evidence',
          fromNodeId: 'source-1',
          toNodeId: 0,
        },
        {
          edgeId: 'invalid-blank-edge',
          edgeType: 'SOURCE_PRODUCES_EVIDENCE',
          relationshipDisplayName: 'Blank Id Edge',
          fromNodeId: 'source-1',
          toNodeId: '   ',
        },
        {
          edgeId: 'missing-node-edge',
          edgeType: 'SOURCE_PRODUCES_EVIDENCE',
          relationshipDisplayName: 'Missing Node Edge',
          fromNodeId: 'missing-node',
          toNodeId: 0,
        },
      ],
    }} />)

    expect(screen.getByText('2 nodes / 2 relationships')).toBeInTheDocument()
    expect(screen.getAllByText('Network view includes 2 of 2 nodes and 1 of 1 validated links.')).toHaveLength(2)
    expect(screen.getByText('Showing 1 of 2 customer-visible relationships.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Company Evidence/ })).toBeInTheDocument()
    expect(screen.queryByText('invalid blank id evidence should not render')).not.toBeInTheDocument()
    expect(screen.queryByText('raw numeric id evidence should not render')).not.toBeInTheDocument()
    expect(screen.queryByText('Blank Id Edge')).not.toBeInTheDocument()
    expect(screen.queryByText('Missing Node Edge')).not.toBeInTheDocument()
  })

  it('opens the force-directed graph in a full-size dialog', () => {
    render(<RuntimeGraphPanel graph={graphProjection} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open full-screen graph' }))

    const dialog = screen.getByRole('dialog', { name: 'Runtime Intelligence Graph' })
    expect(dialog).toHaveClass('runtime-graph-panel__dialog')
    expect(within(dialog).getByRole('img', {
      name: 'Runtime intelligence force-directed network full-screen view',
    })).toBeInTheDocument()
    expect(within(dialog).getByText('3 nodes / 3 relationships. Network view includes 3 of 3 nodes and 2 of 2 validated links.')).toBeInTheDocument()
  })

  it('bounds relationship rows while preserving projected counts', () => {
    const nodes = Array.from({ length: 40 }, (_, index) => ({
      nodeId: `node-${index}`,
      nodeType: index % 2 === 0 ? 'EVIDENCE' : 'INTELLIGENCE',
      entityDisplayName: index % 2 === 0 ? 'Evidence' : 'Intelligence',
      label: `Projected node ${index}`,
    }))
    const edges = Array.from({ length: 24 }, (_, index) => ({
      edgeId: `edge-${index}`,
      edgeType: 'EVIDENCE_DERIVES_INTELLIGENCE',
      relationshipDisplayName: 'Evidence Derives Intelligence',
      fromNodeId: `node-${index}`,
      toNodeId: `node-${index + 1}`,
    }))

    render(<RuntimeGraphPanel graph={{ available: true, nodes, edges }} />)

    expect(screen.getByText('40 nodes / 24 relationships')).toBeInTheDocument()
    expect(screen.getAllByText('Network view includes 25 of 40 nodes and 24 of 24 validated links.')).toHaveLength(2)
    expect(screen.getByText('Showing 8 of 24 customer-visible relationships.')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Runtime intelligence relationships' }).children).toHaveLength(8)
  })

  it('balances the capped network sample across relationship types', () => {
    const evidenceNodes = Array.from({ length: 40 }, (_, index) => ({
      nodeId: `evidence-chain-${index}`,
      nodeType: index % 2 === 0 ? 'EVIDENCE' : 'INTELLIGENCE',
      coverageDomain: index % 2 === 0 ? 'company' : undefined,
      entityDisplayName: index % 2 === 0 ? 'Evidence' : 'Intelligence',
      label: `Projected chain node ${index}`,
    }))
    const sourceNodes = [
      {
        nodeId: 'source-late',
        nodeType: 'SOURCE',
        entityDisplayName: 'Source',
        label: 'https://source.example/private',
        metadata: {
          sourceType: 'website',
        },
      },
      {
        nodeId: 'evidence-late',
        nodeType: 'EVIDENCE',
        coverageDomain: 'markets',
        entityDisplayName: 'Evidence',
        label: 'raw late evidence should not render',
      },
    ]
    const evidenceEdges = Array.from({ length: 20 }, (_, index) => ({
      edgeId: `evidence-edge-${index}`,
      edgeType: 'EVIDENCE_DERIVES_INTELLIGENCE',
      relationshipDisplayName: 'Evidence Derives Intelligence',
      fromNodeId: `evidence-chain-${index * 2}`,
      toNodeId: `evidence-chain-${index * 2 + 1}`,
    }))
    const lateSourceEdge = {
      edgeId: 'late-source-edge',
      edgeType: 'SOURCE_PRODUCES_EVIDENCE',
      relationshipDisplayName: 'Source Produces Evidence',
      fromNodeId: 'source-late',
      toNodeId: 'evidence-late',
    }

    render(<RuntimeGraphPanel graph={{
      available: true,
      edges: [...evidenceEdges, lateSourceEdge],
      nodes: [...evidenceNodes, ...sourceNodes],
    }} />)

    expect(screen.getByRole('button', { name: /Website Source/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Markets Evidence/ })).toBeInTheDocument()
    expect(screen.getByText('42 nodes / 21 relationships')).toBeInTheDocument()
  })

  it('shows an honest empty relationship state', () => {
    render(<RuntimeGraphPanel graph={{ available: true, nodes: [], edges: [] }} />)

    expect(screen.getByText('No customer-visible graph relationships are projected yet.')).toBeInTheDocument()
  })

  it('fails closed for loading, error, and unavailable graph states', () => {
    const { rerender } = render(<RuntimeGraphPanel loading />)

    expect(screen.getByText('Loading graph projection...')).toBeInTheDocument()

    rerender(<RuntimeGraphPanel error={{ status: 500 }} />)
    expect(screen.getByText('Graph projection is unavailable right now.')).toBeInTheDocument()

    rerender(<RuntimeGraphPanel graph={{ available: false }} />)
    expect(screen.getByText('Rebuild the Intelligence Graph to project runtime relationships.')).toBeInTheDocument()
  })
})
