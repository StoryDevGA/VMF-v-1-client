import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ForceDirectedGraph } from './ForceDirectedGraph.jsx'

const nodes = [
  {
    id: 'source-1',
    label: 'Accepted Source',
    meta: 'Website source / Validated',
    type: 'source',
    typeLabel: 'Source',
  },
  {
    id: 'signal-1',
    label: 'Company Signal',
    meta: 'Company / Supporting',
    type: 'signal',
    typeLabel: 'Signal',
  },
  {
    id: 'truth-1',
    label: 'Customer Problem Accepted Truth',
    meta: 'Customer problem / Validated',
    type: 'section-truth',
    typeLabel: 'Section Truth',
  },
]

const links = [
  {
    id: 'source-signal',
    label: 'Produces',
    source: 'source-1',
    target: 'signal-1',
  },
  {
    id: 'signal-truth',
    label: 'Supports',
    source: 'signal-1',
    target: 'truth-1',
  },
]

describe('ForceDirectedGraph', () => {
  it('renders a labelled force-directed SVG with node details', () => {
    render(
      <ForceDirectedGraph
        ariaLabel="Runtime graph"
        description="Network view includes accepted runtime relationships."
        links={links}
        nodes={nodes}
      />,
    )

    const graph = screen.getByRole('img', { name: 'Runtime graph' })
    expect(graph).toBeInTheDocument()
    expect(graph).toHaveAttribute('viewBox', '0 0 960 560')
    expect(graph.querySelector(':scope > title')).not.toBeInTheDocument()
    expect(screen.getAllByText('Network view includes accepted runtime relationships.')).toHaveLength(2)

    const detail = screen.getByRole('complementary', { name: 'Selected graph node' })
    expect(screen.getByRole('list', { name: 'Graph node types' })).toBeInTheDocument()
    expect(within(detail).getByRole('heading', { name: 'Network Summary' })).toBeInTheDocument()
    expect(within(detail).getByText('3 nodes / 2 links')).toBeInTheDocument()
    expect(within(detail).getByRole('list', { name: 'Network node type counts' })).toBeInTheDocument()

    const signalNode = screen.getByRole('button', { name: /Company Signal/ })
    expect(signalNode.querySelector('title')).toHaveTextContent('Company Signal / Signal / Company / Supporting')

    fireEvent.click(signalNode)

    expect(within(detail).getByRole('heading', { name: 'Company Signal' })).toBeInTheDocument()
    expect(within(detail).getByText('Company / Supporting')).toBeInTheDocument()
    expect(within(detail).getByText('2')).toBeInTheDocument()
    expect(within(detail).getByRole('list', { name: 'Connected graph nodes' })).toBeInTheDocument()
  })

  it('supports keyboard node selection', () => {
    render(<ForceDirectedGraph ariaLabel="Runtime graph" links={links} nodes={nodes} />)

    fireEvent.keyDown(screen.getByRole('button', { name: /Customer Problem Accepted Truth/ }), {
      key: 'Enter',
    })

    const detail = screen.getByRole('complementary', { name: 'Selected graph node' })
    expect(within(detail).getByRole('heading', { name: 'Customer Problem Accepted Truth' })).toBeInTheDocument()
    expect(within(detail).getByText('1')).toBeInTheDocument()
  })

  it('keeps the simulation interactive while a node is dragged', () => {
    render(<ForceDirectedGraph ariaLabel="Runtime graph" links={links} nodes={nodes} />)

    const graph = screen.getByRole('img', { name: 'Runtime graph' })
    const node = screen.getByRole('button', { name: /Company Signal/ })

    fireEvent.pointerDown(node, {
      clientX: 280,
      clientY: 170,
      pointerId: 4,
    })

    expect(node).toHaveClass('force-directed-graph__node--dragging')

    fireEvent.pointerMove(graph, {
      clientX: 340,
      clientY: 220,
      pointerId: 4,
    })
    fireEvent.pointerUp(graph, {
      clientX: 340,
      clientY: 220,
      pointerId: 4,
    })

    expect(node).not.toHaveClass('force-directed-graph__node--dragging')

    const detail = screen.getByRole('complementary', { name: 'Selected graph node' })
    expect(within(detail).getByRole('heading', { name: 'Company Signal' })).toBeInTheDocument()
  })

  it('cancels active drag state when graph data changes', () => {
    const { rerender } = render(<ForceDirectedGraph ariaLabel="Runtime graph" links={links} nodes={nodes} />)

    const node = screen.getByRole('button', { name: /Company Signal/ })

    fireEvent.pointerDown(node, {
      clientX: 280,
      clientY: 170,
      pointerId: 4,
    })

    expect(node).toHaveClass('force-directed-graph__node--dragging')

    rerender(
      <ForceDirectedGraph
        ariaLabel="Runtime graph"
        links={[
          ...links,
          {
            id: 'new-source-truth',
            label: 'Supports',
            source: 'source-1',
            target: 'truth-1',
          },
        ]}
        nodes={nodes}
      />,
    )

    expect(screen.getByRole('button', { name: /Company Signal/ })).not.toHaveClass('force-directed-graph__node--dragging')
  })

  it('supports mouse drag input when pointer events are not emitted', () => {
    render(<ForceDirectedGraph ariaLabel="Runtime graph" links={links} nodes={nodes} />)

    const graph = screen.getByRole('img', { name: 'Runtime graph' })
    const node = screen.getByRole('button', { name: /Accepted Source/ })

    fireEvent.mouseDown(node, {
      button: 0,
      clientX: 220,
      clientY: 160,
    })

    expect(node).toHaveClass('force-directed-graph__node--dragging')

    fireEvent.mouseMove(graph, {
      clientX: 300,
      clientY: 210,
    })
    fireEvent.mouseUp(graph, {
      clientX: 300,
      clientY: 210,
    })

    expect(node).not.toHaveClass('force-directed-graph__node--dragging')
  })

  it('renders an honest empty state when no valid links are available', () => {
    render(
      <ForceDirectedGraph
        ariaLabel="Empty runtime graph"
        emptyMessage="Nothing can be projected."
        links={[{ id: 'missing-link', source: 'source-1', target: 'missing-node' }]}
        nodes={nodes.slice(0, 1)}
      />,
    )

    expect(screen.getByRole('region', { name: 'Empty runtime graph' })).toBeInTheDocument()
    expect(screen.getByText('Nothing can be projected.')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
