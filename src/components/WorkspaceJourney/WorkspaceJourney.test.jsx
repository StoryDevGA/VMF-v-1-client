import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { WorkspaceJourney } from './WorkspaceJourney.jsx'

const journeyItems = [
  { key: 'acquire', label: 'Acquire', status: 'Complete', state: 'complete', description: 'Gather context.', to: '/app/intelligence' },
  { key: 'review', label: 'Review', status: 'Review needed', detail: '2 unresolved contradictions · 3 evidence items pending review', state: 'attention', description: 'Resolve findings.', to: '/app/intelligence/quality' },
  { key: 'understand', label: 'Understand', status: '2 of 4 accepted', state: 'attention', description: 'Accept understanding.', to: '/app/workspace-structure' },
  { key: 'create', label: 'Create', status: 'Available', state: 'available', description: 'Create outcomes.', to: '/app/outcome-studio' },
  { key: 'publish', label: 'Publish', status: 'Not published', state: 'available', description: 'Publish approved assets.', to: '/app/outcome-studio' },
]

describe('WorkspaceJourney', () => {
  it('keeps default stages non-navigable until selected context is supplied', () => {
    render(<MemoryRouter><WorkspaceJourney /></MemoryRouter>)

    const stages = screen.getByRole('list', { name: 'Workspace progress stages' })
    expect(within(stages).queryAllByRole('link')).toHaveLength(0)
    expect(within(stages).getByText('Acquire')).toBeInTheDocument()
  })

  it('exposes the destination contracts for each journey stage', () => {
    render(<MemoryRouter><WorkspaceJourney items={journeyItems} /></MemoryRouter>)

    const stages = screen.getByRole('list', { name: 'Workspace progress stages' })
    expect(within(stages).getByRole('link', { name: 'Acquire: Complete' })).toHaveAttribute('href', '/app/intelligence')
    const reviewLink = within(stages).getByRole('link', {
      name: 'Review: Review needed: 2 unresolved contradictions · 3 evidence items pending review',
    })
    expect(reviewLink).toHaveAttribute('href', '/app/intelligence/quality')
    expect(reviewLink).toHaveTextContent('Review needed')
    expect(reviewLink).not.toHaveTextContent('5 items')
    expect(within(stages).getByText('2 unresolved contradictions · 3 evidence items pending review'))
      .toBeInTheDocument()
    expect(within(stages).getByRole('link', { name: 'Understand: 2 of 4 accepted' })).toHaveAttribute('href', '/app/workspace-structure')
    expect(within(stages).getByRole('link', { name: 'Create: Available' })).toHaveAttribute('href', '/app/outcome-studio')
    expect(within(stages).getByRole('link', { name: 'Publish: Not published' })).toHaveAttribute('href', '/app/outcome-studio')
  })

  it('does not navigate when the selected workspace context is unavailable', () => {
    render(<MemoryRouter><WorkspaceJourney items={[{ ...journeyItems[0], to: '' }]} /></MemoryRouter>)

    const stages = screen.getByRole('list', { name: 'Workspace progress stages' })
    expect(within(stages).queryByRole('link', { name: 'Acquire: Complete' })).not.toBeInTheDocument()
    expect(within(stages).getByLabelText('Acquire: Complete')).toHaveAttribute('aria-disabled', 'true')
  })

  it('opens and closes the progress explanation accessibly', () => {
    render(<MemoryRouter><WorkspaceJourney items={journeyItems} /></MemoryRouter>)

    const trigger = screen.getByRole('button', { name: 'How progress works' })
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'How progress works' })
    expect(dialog).toHaveTextContent('not a rigid wizard')
    expect(within(dialog).getByText('Review')).toBeInTheDocument()
    expect(within(dialog).getByText('2 unresolved contradictions · 3 evidence items pending review'))
      .toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close', exact: true }))
    expect(screen.queryByRole('dialog', { name: 'How progress works' })).not.toBeInTheDocument()
  })
})
