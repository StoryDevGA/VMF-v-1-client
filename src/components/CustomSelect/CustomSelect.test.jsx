/**
 * CustomSelect — component tests
 *
 * Tests the reusable combobox-pattern dropdown in isolation.
 * Covers rendering, selection, keyboard navigation, ARIA attributes,
 * loading/disabled states, and action items.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomSelect } from './CustomSelect.jsx'

// ── Polyfills ────────────────────────────────────────────
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () { this.open = true })
  HTMLDialogElement.prototype.close = vi.fn(function () { this.open = false })
  vi.clearAllMocks()
})

// ── Fixtures ─────────────────────────────────────────────
const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
]

const actions = [{ value: '__action__', label: '+ Do something…' }]

function renderSelect(props = {}) {
  const onChange = vi.fn()
  const result = render(
    <CustomSelect
      value={null}
      onChange={onChange}
      options={options}
      ariaLabel="Test select"
      {...props}
    />,
  )
  return { onChange, ...result }
}

// ── Tests ────────────────────────────────────────────────
describe('CustomSelect', () => {
  // ── Rendering ──────────────────────────────────────────

  it('renders a combobox trigger with the given aria-label', () => {
    renderSelect()
    expect(
      screen.getByRole('combobox', { name: 'Test select' }),
    ).toBeInTheDocument()
  })

  it('shows placeholder text when no value is selected', () => {
    renderSelect({ placeholder: 'Pick one…' })
    expect(screen.getByRole('combobox')).toHaveTextContent('Pick one…')
  })

  it('shows the selected option label', () => {
    renderSelect({ value: 'b' })
    expect(screen.getByRole('combobox')).toHaveTextContent('Bravo')
  })

  it('renders a leading icon when provided', () => {
    renderSelect({ icon: <span data-testid="icon">★</span> })
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('does not render the dropdown when closed', () => {
    renderSelect()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  // ── Opening / closing ─────────────────────────────────

  it('opens the dropdown on click', async () => {
    renderSelect()
    await userEvent.click(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('closes the dropdown on a second click', async () => {
    renderSelect()
    const trigger = screen.getByRole('combobox')
    await userEvent.click(trigger)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await userEvent.click(trigger)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes the dropdown on Escape', async () => {
    renderSelect()
    const trigger = screen.getByRole('combobox')
    await userEvent.click(trigger)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes the dropdown on click outside', async () => {
    renderSelect()
    await userEvent.click(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    // Click outside the component
    await userEvent.click(document.body)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  // ── Selection ──────────────────────────────────────────

  it('calls onChange when an option is clicked', async () => {
    const { onChange } = renderSelect()
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByRole('option', { name: 'Bravo' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('closes the dropdown after selecting an option', async () => {
    renderSelect()
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByRole('option', { name: 'Alpha' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('marks the selected option with aria-selected', async () => {
    renderSelect({ value: 'b' })
    await userEvent.click(screen.getByRole('combobox'))
    expect(screen.getByRole('option', { name: 'Bravo' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  // ── Keyboard navigation ───────────────────────────────

  it('opens the dropdown with Enter', async () => {
    renderSelect()
    screen.getByRole('combobox').focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('opens the dropdown with Space', async () => {
    renderSelect()
    screen.getByRole('combobox').focus()
    await userEvent.keyboard(' ')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('opens the dropdown with ArrowDown', async () => {
    renderSelect()
    screen.getByRole('combobox').focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('navigates options with ArrowDown and ArrowUp', async () => {
    renderSelect({ value: 'a' })
    const trigger = screen.getByRole('combobox')
    trigger.focus()
    await userEvent.keyboard('{Enter}')

    // Active should be on 'Alpha' (index 0, matched by value)
    const listbox = screen.getByRole('listbox')
    const optionEls = within(listbox).getAllByRole('option')

    expect(optionEls[0]).toHaveClass('custom-select__option--focused')

    // ArrowDown → Bravo
    await userEvent.keyboard('{ArrowDown}')
    expect(optionEls[1]).toHaveClass('custom-select__option--focused')

    // ArrowDown → Charlie
    await userEvent.keyboard('{ArrowDown}')
    expect(optionEls[2]).toHaveClass('custom-select__option--focused')

    // ArrowDown at end → stays on Charlie
    await userEvent.keyboard('{ArrowDown}')
    expect(optionEls[2]).toHaveClass('custom-select__option--focused')

    // ArrowUp → Bravo
    await userEvent.keyboard('{ArrowUp}')
    expect(optionEls[1]).toHaveClass('custom-select__option--focused')
  })

  it('selects the focused option with Enter', async () => {
    const { onChange } = renderSelect({ value: 'a' })
    screen.getByRole('combobox').focus()
    await userEvent.keyboard('{Enter}')     // open
    await userEvent.keyboard('{ArrowDown}') // move to Bravo
    await userEvent.keyboard('{Enter}')     // select
    expect(onChange).toHaveBeenCalledWith('b')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('jumps to first option with Home', async () => {
    renderSelect({ value: 'c' })
    screen.getByRole('combobox').focus()
    await userEvent.keyboard('{Enter}')

    const optionEls = within(screen.getByRole('listbox')).getAllByRole('option')
    // Active starts on Charlie (index 2)
    expect(optionEls[2]).toHaveClass('custom-select__option--focused')

    await userEvent.keyboard('{Home}')
    expect(optionEls[0]).toHaveClass('custom-select__option--focused')
  })

  it('jumps to last option with End', async () => {
    renderSelect({ value: 'a' })
    screen.getByRole('combobox').focus()
    await userEvent.keyboard('{Enter}')

    const optionEls = within(screen.getByRole('listbox')).getAllByRole('option')
    await userEvent.keyboard('{End}')
    expect(optionEls[2]).toHaveClass('custom-select__option--focused')
  })

  // ── ARIA controls / activedescendant ───────────────────

  it('sets aria-controls on the trigger pointing to the listbox id', async () => {
    renderSelect()
    const trigger = screen.getByRole('combobox')
    await userEvent.click(trigger)

    const listbox = screen.getByRole('listbox')
    expect(trigger).toHaveAttribute('aria-controls', listbox.id)
  })

  it('sets aria-activedescendant to the focused option id', async () => {
    renderSelect({ value: 'a' })
    const trigger = screen.getByRole('combobox')
    trigger.focus()
    await userEvent.keyboard('{Enter}')

    const optionEls = within(screen.getByRole('listbox')).getAllByRole('option')
    expect(trigger).toHaveAttribute('aria-activedescendant', optionEls[0].id)

    await userEvent.keyboard('{ArrowDown}')
    expect(trigger).toHaveAttribute('aria-activedescendant', optionEls[1].id)
  })

  it('clears aria-activedescendant when dropdown is closed', () => {
    renderSelect()
    const trigger = screen.getByRole('combobox')
    expect(trigger).not.toHaveAttribute('aria-activedescendant')
  })

  // ── Loading state ──────────────────────────────────────

  it('shows a spinner when loading', () => {
    renderSelect({ loading: true })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  // ── Disabled state ─────────────────────────────────────

  it('sets aria-disabled and prevents opening when disabled', async () => {
    const { onChange } = renderSelect({ disabled: true })
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveAttribute('aria-disabled', 'true')

    await userEvent.click(trigger)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  // ── Action items ───────────────────────────────────────

  it('renders action items after a separator', async () => {
    renderSelect({ actions })
    await userEvent.click(screen.getByRole('combobox'))
    const action = screen.getByRole('option', { name: /do something/i })
    expect(action).toBeInTheDocument()
    expect(action).toHaveClass('custom-select__option--action')
  })

  it('calls onChange with action value when action is clicked', async () => {
    const { onChange } = renderSelect({ actions })
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByRole('option', { name: /do something/i }))
    expect(onChange).toHaveBeenCalledWith('__action__')
  })

  it('includes action items in keyboard navigation', async () => {
    renderSelect({ value: 'c', actions })
    screen.getByRole('combobox').focus()
    await userEvent.keyboard('{Enter}')

    const optionEls = within(screen.getByRole('listbox')).getAllByRole('option')
    // 3 options + 1 action = 4 total
    expect(optionEls).toHaveLength(4)

    // Navigate to action (End key)
    await userEvent.keyboard('{End}')
    expect(optionEls[3]).toHaveClass('custom-select__option--focused')

    // Select action with Enter
    await userEvent.keyboard('{Enter}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
