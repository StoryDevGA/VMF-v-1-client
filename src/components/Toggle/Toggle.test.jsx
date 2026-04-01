/**
 * Toggle Component Tests
 */

import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toggle } from './Toggle'

describe('Toggle Component', () => {
  it('renders the switch and label', () => {
    render(<Toggle id="test-toggle" label="Enable alerts" />)

    expect(screen.getByRole('switch', { name: 'Enable alerts' })).toBeInTheDocument()
    expect(screen.getByText('Enable alerts')).toBeInTheDocument()
  })

  it('calls onChange when clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    const { rerender } = render(
      <Toggle
        id="test-toggle"
        label="Enable alerts"
        checked={false}
        onChange={handleChange}
      />,
    )

    const toggle = screen.getByRole('switch', { name: 'Enable alerts' })
    await user.click(toggle)

    expect(handleChange).toHaveBeenCalledTimes(1)

    rerender(
      <Toggle
        id="test-toggle"
        label="Enable alerts"
        checked
        onChange={handleChange}
      />,
    )

    expect(toggle).toBeChecked()
  })

  it('does not change when disabled', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <Toggle
        id="test-toggle"
        label="Enable alerts"
        checked={false}
        onChange={handleChange}
        disabled
      />,
    )

    const toggle = screen.getByRole('switch', { name: 'Enable alerts' })
    await user.click(toggle)

    expect(handleChange).not.toHaveBeenCalled()
    expect(toggle).not.toBeChecked()
  })

  it('supports keyboard Space', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <Toggle
        id="test-toggle"
        label="Enable alerts"
        checked={false}
        onChange={handleChange}
      />,
    )

    const toggle = screen.getByRole('switch', { name: 'Enable alerts' })

    toggle.focus()
    await user.keyboard(' ')
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('applies the correct size classes', () => {
    const { container, rerender } = render(<Toggle size="sm" />)
    const toggleContainer = container.querySelector('.toggle-container')

    expect(container.querySelector('.toggle-container')).toHaveClass('toggle-container--sm')
    expect(getComputedStyle(toggleContainer).getPropertyValue('--toggle-track-width').trim()).toBe('40px')
    expect(getComputedStyle(toggleContainer).getPropertyValue('--toggle-track-height').trim()).toBe('22px')

    rerender(<Toggle />)
    expect(container.querySelector('.toggle-container')).toHaveClass('toggle-container--md')
    expect(getComputedStyle(toggleContainer).getPropertyValue('--toggle-track-width').trim()).toBe('48px')
    expect(getComputedStyle(toggleContainer).getPropertyValue('--toggle-track-height').trim()).toBe('26px')
  })

  it('forwards the ref to the input element', () => {
    const ref = createRef()

    render(<Toggle ref={ref} label="Enable alerts" />)

    expect(ref.current).toBeInstanceOf(HTMLInputElement)
    expect(ref.current).toHaveAttribute('role', 'switch')
  })
})
