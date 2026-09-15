import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function BrokenChild() {
  throw new Error('render failure')
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps a render failure inside an accessible recovery surface', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Reload the application to try again.',
    )
    expect(screen.getByRole('button', { name: 'Reload application' })).toBeInTheDocument()
  })

  it('renders children when no error has occurred', () => {
    render(
      <ErrorBoundary>
        <p>Healthy application</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('Healthy application')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Something went wrong' })).not.toBeInTheDocument()
  })
})
