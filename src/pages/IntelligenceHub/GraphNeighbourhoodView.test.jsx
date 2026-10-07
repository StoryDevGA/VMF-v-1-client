import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import GraphNeighbourhoodView from './GraphNeighbourhoodView.jsx'
import { buildGraphViewModel, readGraphInspection, writeGraphInspection, graphSourceParams, graphSourceReturnHref } from './intelligenceGraphModel.js'
import { graphNeighbourhoodFixture } from '../../test/graphNeighbourhoodFixture.js'
const makeRead = options => { const graph = graphNeighbourhoodFixture(options).graph, model = buildGraphViewModel(graph); return { graph, page: graph.neighbourhood, model, selected: model.nodes[0] } }
describe('bounded selected connections', () => {
  it('navigates an exact external identity and focuses the stable inspection region', async () => {
    const onInspect = vi.fn(), onOpenSource = vi.fn()
    render(<GraphNeighbourhoodView read={makeRead()} onInspect={onInspect} onOpenSource={onOpenSource} onRetry={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Connected evidence 000/ }))
    expect(onInspect).toHaveBeenCalledWith('evidence:000'); expect(screen.getByRole('region', { name: 'Selected object neighbourhood' })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: /Open selected object/ }))
    expect(onOpenSource).toHaveBeenCalledWith({ sourceId: 'recorded-source' })
  })
  it('keeps page counts separate and exposes a possible continuation', async () => {
    const onPage = vi.fn()
    render(<GraphNeighbourhoodView read={makeRead({ size: 48 })} onPage={onPage} onInspect={vi.fn()} onOpenSource={vi.fn()} onRetry={vi.fn()} />)
    expect(screen.getByText(/48 recorded one-hop/)).toHaveTextContent('Whole graph: 100 objects and 150 relationships')
    await userEvent.click(screen.getByRole('button', { name: 'Next relationship page' }))
    expect(onPage).toHaveBeenCalledWith('edge:a:047')
  })
  it('withholds private details and navigation while retaining structural count', () => {
    render(<GraphNeighbourhoodView read={makeRead({ privateEndpoint: true })} onRetry={vi.fn()} />)
    expect(screen.queryByText('evidence:000')).not.toBeInTheDocument()
    expect(screen.getByText('Recorded connection; details unavailable.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Connected evidence/ })).not.toBeInTheDocument()
  })
  it('keeps first-page recovery on unavailable continuations and disables it while loading', async () => {
    const onPage = vi.fn(), onRetry = vi.fn()
    const { rerender } = render(<GraphNeighbourhoodView afterEdgeKey="edge:a:047" onPage={onPage} onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: 'First relationship page' })); expect(onPage).toHaveBeenCalledWith('')
    rerender(<GraphNeighbourhoodView loading afterEdgeKey="edge:a:047" onPage={onPage} onRetry={onRetry} />)
    expect(screen.getByRole('button', { name: 'First relationship page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Retry connections' })).toBeDisabled()
    expect(within(screen.getByRole('region')).getByRole('status')).toHaveTextContent('Loading')
  })
  it('preserves cursor through exact Sources return and clears it on changed selection/mode/search', () => {
    const context = 'workspace:revision:customer:tenant', inspection = { mode: 'Impact', selectedKey: 'source:outside', objectView: 'object', search: '', afterEdgeKey: '' }
    const initial = writeGraphInspection(new URLSearchParams('revisionId=revision'), context, inspection)
    const paged = writeGraphInspection(initial, context, { ...inspection, afterEdgeKey: 'edge:a:047' })
    expect(readGraphInspection(paged, context).afterEdgeKey).toBe('edge:a:047')
    const href = graphSourceReturnHref(graphSourceParams(paged, context, { sourceId: 'recorded-source' }), context)
    expect(new URL(href, 'http://local').searchParams.get('graphAfterEdgeKey')).toBe('edge:a:047')
    for (const patch of [{ mode: 'Journey' }, { selectedKey: 'different' }, { search: 'Proof' }, { objectView: 'group' }]) {
      expect(writeGraphInspection(paged, context, { ...inspection, afterEdgeKey: 'edge:a:047', ...patch }).has('graphAfterEdgeKey')).toBe(false)
    }
    paged.append('graphAfterEdgeKey', 'duplicate'); expect(readGraphInspection(paged, context).invalid).toBe(true)
  })
})
