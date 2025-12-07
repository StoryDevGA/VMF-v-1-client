/**
 * Spinner Component Tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner } from './Spinner'

describe('Spinner Component', () => {
  it('should render with role status and sr-only text', () => {
    render(<Spinner />)
    const spinner = screen.getByRole('status')
    expect(spinner).toBeInTheDocument()
    expect(screen.getByText('Loading...')).toHaveClass('sr-only')
  })

  it('should apply default size and color classes', () => {
    const { container } = render(<Spinner />)
    expect(container.firstChild).toHaveClass('spinner--md')
    expect(container.firstChild).toHaveClass('spinner--primary')
  })

  it('should apply specified size class', () => {
    const { container } = render(<Spinner size="lg" />)
    expect(container.firstChild).toHaveClass('spinner--lg')
    expect(container.firstChild).not.toHaveClass('spinner--md')
  })

  it('should apply specified color class', () => {
    const { container } = render(<Spinner color="danger" />)
    expect(container.firstChild).toHaveClass('spinner--danger')
    expect(container.firstChild).not.toHaveClass('spinner--primary')
  })

  it('should apply additional className', () => {
    const { container } = render(<Spinner className="custom-spinner" />)
    expect(container.firstChild).toHaveClass('custom-spinner')
  })
})
