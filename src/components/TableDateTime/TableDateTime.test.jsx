import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TableDateTime } from './TableDateTime'

describe('TableDateTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders relative date and time parts for valid values', () => {
    const now = new Date(2026, 2, 5, 15, 0)
    vi.useFakeTimers()
    vi.setSystemTime(now)

    render(<TableDateTime value={new Date(2026, 2, 5, 14, 30).toISOString()} />)

    const node = screen.getByText('Today').closest('time')
    expect(node).not.toBeNull()
    expect(node).toHaveAttribute('datetime', new Date(2026, 2, 5, 14, 30).toISOString())
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('14:30')).toBeInTheDocument()
  })

  it('uses Yesterday for the preceding local calendar day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 5, 15, 0))

    render(<TableDateTime value={new Date(2026, 2, 4, 9, 15).toISOString()} />)

    expect(screen.getByText('Yesterday')).toBeInTheDocument()
    expect(screen.getByText('09:15')).toBeInTheDocument()
  })

  it('renders fallback when value is invalid', () => {
    render(<TableDateTime value="invalid" fallback="N/A" />)
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })
})
