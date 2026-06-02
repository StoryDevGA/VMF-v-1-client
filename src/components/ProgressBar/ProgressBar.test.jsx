/**
 * ProgressBar Component Tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar Component', () => {
  it('renders an accessible progressbar with default props', () => {
    render(<ProgressBar />)

    const progress = screen.getByRole('progressbar', { name: 'Progress' })
    expect(progress).toHaveAttribute('max', '100')
    expect(progress).toHaveAttribute('value', '0')
  })

  it('renders label and value text when provided', () => {
    render(<ProgressBar label="Accepted truth" value={40} valueLabel="40%" />)

    expect(screen.getByText('Accepted truth')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Accepted truth' })).toHaveAttribute('value', '40')
    expect(screen.getByRole('progressbar', { name: 'Accepted truth' })).toHaveAttribute('aria-valuetext', '40%')
  })

  it('uses an explicit aria label when provided', () => {
    render(<ProgressBar ariaLabel="4 of 10 tasks completed" label="Tasks" value={40} />)

    expect(screen.getByRole('progressbar', { name: '4 of 10 tasks completed' })).toBeInTheDocument()
  })

  it('uses explicit aria value text when provided', () => {
    render(
      <ProgressBar
        ariaLabel="Company coverage"
        ariaValueText="2 accepted of 3 evidence objects"
        value={67}
        valueLabel="67%"
      />,
    )

    expect(screen.getByRole('progressbar', { name: 'Company coverage' }))
      .toHaveAttribute('aria-valuetext', '2 accepted of 3 evidence objects')
  })

  it('clamps values to the supported range', () => {
    const { rerender } = render(<ProgressBar value={150} max={100} />)

    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '100')

    rerender(<ProgressBar value={-10} max={100} />)

    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0')
  })

  it('renders indeterminate progress by omitting value', () => {
    render(<ProgressBar indeterminate ariaLabel="Loading batch operation" />)

    expect(screen.getByRole('progressbar', { name: 'Loading batch operation' })).not.toHaveAttribute('value')
  })

  it('applies variant, size, and custom classes', () => {
    const { container } = render(
      <ProgressBar className="custom-progress" size="lg" variant="metric" value={70} />,
    )

    const root = container.firstChild
    expect(root).toHaveClass('progress-bar')
    expect(root).toHaveClass('progress-bar--metric')
    expect(root).toHaveClass('progress-bar--lg')
    expect(root).toHaveClass('custom-progress')
  })

  it('falls back to default classes for unsupported variant and size values', () => {
    const { container } = render(<ProgressBar size="huge" variant="loud" value={20} />)

    expect(container.firstChild).toHaveClass('progress-bar--primary')
    expect(container.firstChild).toHaveClass('progress-bar--md')
  })
})
