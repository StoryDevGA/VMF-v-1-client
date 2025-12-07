/**
 * Tooltip Component Tests
 *
 * Tests cover:
 * - Rendering and accessibility attributes
 * - Hover and focus triggers
 * - Controlled vs uncontrolled behavior
 * - Positioning and alignment classes
 * - Event handler forwarding
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tooltip } from './Tooltip'

const renderTooltip = (props = {}) =>
  render(
    <Tooltip content="Helpful hint" openDelay={0} closeDelay={0} {...props}>
      <button type="button">Trigger</button>
    </Tooltip>
  )

describe('Tooltip Component', () => {
  const getTooltip = () => screen.getByRole('tooltip', { hidden: true })

  it('renders trigger and tooltip content (hidden by default)', () => {
    renderTooltip()

    const trigger = screen.getByRole('button', { name: 'Trigger' })
    const tooltip = getTooltip()

    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id)
    expect(tooltip).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup()
    renderTooltip()

    await user.hover(screen.getByRole('button'))

    expect(getTooltip()).toHaveAttribute('aria-hidden', 'false')
  })

  it('shows tooltip on focus', async () => {
    const user = userEvent.setup()
    renderTooltip()

    await user.tab()

    expect(getTooltip()).toHaveAttribute('aria-hidden', 'false')
  })

  it('hides tooltip on blur and mouse leave', async () => {
    const user = userEvent.setup()
    renderTooltip()
    const trigger = screen.getByRole('button')

    await user.hover(trigger)
    expect(getTooltip()).toHaveAttribute('aria-hidden', 'false')

    await user.unhover(trigger)
    expect(getTooltip()).toHaveAttribute('aria-hidden', 'true')
  })

  it('supports controlled open state', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <Tooltip content="Controlled" open>
        <button type="button">Trigger</button>
      </Tooltip>
    )

    expect(getTooltip()).toHaveAttribute('aria-hidden', 'false')

    rerender(
      <Tooltip content="Controlled" open={false}>
        <button type="button">Trigger</button>
      </Tooltip>
    )

    await user.hover(screen.getByRole('button'))
    expect(getTooltip()).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies position and alignment classes', () => {
    renderTooltip({ position: 'right', align: 'start' })
    const wrapper = screen.getByRole('button').parentElement
    const tooltip = getTooltip()

    expect(wrapper).toHaveClass('tooltip--right')
    expect(wrapper).toHaveClass('tooltip--align-start')
    expect(tooltip).toHaveAttribute('data-position', 'right')
    expect(tooltip).toHaveAttribute('data-align', 'start')
  })

  it('forwards event handlers on trigger element', async () => {
    const onMouseEnter = vi.fn()
    const user = userEvent.setup()

    render(
      <Tooltip content="Forwarded" openDelay={0} closeDelay={0}>
        <button type="button" onMouseEnter={onMouseEnter}>
          Trigger
        </button>
      </Tooltip>
    )

    await user.hover(screen.getByRole('button'))

    expect(onMouseEnter).toHaveBeenCalled()
    expect(screen.getByRole('tooltip')).toHaveAttribute('aria-hidden', 'false')
  })
})
