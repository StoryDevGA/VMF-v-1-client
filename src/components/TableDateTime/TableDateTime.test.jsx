import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TableDateTime } from './TableDateTime'

describe('TableDateTime', () => {
  it('renders fixed date and time parts for valid values', () => {
    render(<TableDateTime value="2026-03-05T14:30:00.000Z" />)

    const node = screen.getByText(/\d{4}-\d{2}-\d{2}/).closest('time')
    expect(node).not.toBeNull()
    expect(node).toHaveAttribute('datetime', '2026-03-05T14:30:00.000Z')
    expect(screen.getByText(/^\d{4}-\d{2}-\d{2}$/)).toBeInTheDocument()
    expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeInTheDocument()
  })

  it('renders fallback when value is invalid', () => {
    render(<TableDateTime value="invalid" fallback="N/A" />)
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })
})

