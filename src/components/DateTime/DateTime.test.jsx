/**
 * DateTime Component Tests
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { format } from 'date-fns'
import { DateTime } from './DateTime'

afterEach(() => {
  vi.useRealTimers()
})

describe('DateTime Component', () => {
  it('should render the formatted date and time', () => {
    vi.useFakeTimers()
    const mockDate = new Date('2025-02-10T15:30:45Z')
    vi.setSystemTime(mockDate)

    render(<DateTime />)

    expect(screen.getByText(format(mockDate, 'EEEE, MMMM d, yyyy'))).toBeInTheDocument()
    expect(screen.getByText(format(mockDate, 'hh:mm:ss a'))).toBeInTheDocument()
  })

  it('should update the time on the provided interval', async () => {
    vi.useFakeTimers()
    const start = new Date('2025-02-10T15:30:45Z')
    vi.setSystemTime(start)

    render(<DateTime updateInterval={1000} />)

    const firstTime = format(start, 'hh:mm:ss a')
    expect(screen.getByText(firstTime)).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    const next = new Date(start.getTime() + 1000)
    expect(screen.getByText(format(next, 'hh:mm:ss a'))).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    vi.useFakeTimers()
    const mockDate = new Date('2025-02-10T15:30:45Z')
    vi.setSystemTime(mockDate)

    render(<DateTime className="custom-class" />)
    const wrapper = screen
      .getByText(format(mockDate, 'hh:mm:ss a'))
      .closest('.datetime')
    expect(wrapper).toHaveClass('custom-class')
  })
})
