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

  describe('Background color', () => {
    it('should apply backgroundColor to circle spinner', () => {
      const { container } = render(<Spinner backgroundColor="#ff0000" />)
      expect(container.firstChild).toHaveStyle({ backgroundColor: '#ff0000' })
    })

    it('should apply backgroundColor to pinwheel spinner', () => {
      const { container } = render(<Spinner type="pinwheel" backgroundColor="rgba(0, 0, 0, 0.1)" />)
      expect(container.firstChild).toHaveStyle({ backgroundColor: 'rgba(0, 0, 0, 0.1)' })
    })

    it('should not apply backgroundColor style when not provided', () => {
      const { container } = render(<Spinner />)
      expect(container.firstChild).not.toHaveAttribute('style')
    })
  })

  describe('Pinwheel variant', () => {
    it('should render pinwheel type with image element', () => {
      const { container } = render(<Spinner type="pinwheel" />)
      const image = container.querySelector('.spinner__image')
      expect(image).toBeInTheDocument()
      expect(image.tagName).toBe('IMG')
    })

    it('should apply pinwheel type class', () => {
      const { container } = render(<Spinner type="pinwheel" />)
      expect(container.firstChild).toHaveClass('spinner--pinwheel')
      expect(container.firstChild).not.toHaveClass('spinner--circle')
    })

    it('should have correct image accessibility attributes', () => {
      const { container } = render(<Spinner type="pinwheel" />)
      const image = container.querySelector('.spinner__image')
      expect(image).toHaveAttribute('alt', '')
      expect(image).toHaveAttribute('aria-hidden', 'true')
    })

    it('should have correct image src', () => {
      const { container } = render(<Spinner type="pinwheel" />)
      const image = container.querySelector('.spinner__image')
      expect(image).toHaveAttribute('src')
      expect(image.getAttribute('src')).toContain('pinwheel')
    })

    it('should apply size classes to pinwheel', () => {
      const { container } = render(<Spinner type="pinwheel" size="lg" />)
      expect(container.firstChild).toHaveClass('spinner--lg')
    })

    it('should not apply color class to pinwheel type', () => {
      const { container } = render(<Spinner type="pinwheel" color="danger" />)
      expect(container.firstChild).not.toHaveClass('spinner--danger')
    })

    it('should not render image for circle type', () => {
      const { container } = render(<Spinner type="circle" />)
      const image = container.querySelector('.spinner__image')
      expect(image).not.toBeInTheDocument()
    })
  })
})
