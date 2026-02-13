/**
 * Select Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from './Select'

const options = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
]

describe('Select Component', () => {
  it('should render with label and options', () => {
    render(<Select id="test" label="Test Select" options={options} />)
    expect(screen.getByLabelText('Test Select')).toBeInTheDocument()
    expect(screen.getAllByRole('option').length).toBe(3)
  })

  it('should render a placeholder', () => {
    render(<Select id="test" label="Test Select" options={options} placeholder="Select one..." />)
    const placeholder = screen.getByText('Select one...')
    expect(placeholder).toBeInTheDocument()
    expect(placeholder).toBeDisabled()
  })

  it('should call onChange when an option is selected', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    const { rerender } = render(
      <Select
        id="test"
        label="Test Select"
        options={options}
        onChange={handleChange}
        value="option1"
      />
    )
    const select = screen.getByLabelText('Test Select')

    await user.selectOptions(select, 'option2')

    expect(handleChange).toHaveBeenCalledTimes(1)

    // Rerender with new value to verify the select updates
    rerender(
      <Select
        id="test"
        label="Test Select"
        options={options}
        onChange={handleChange}
        value="option2"
      />
    )
    expect(select).toHaveValue('option2')
  })

  it('should be disabled when the disabled prop is true', () => {
    render(<Select id="test" label="Test Select" options={options} disabled />)
    expect(screen.getByLabelText('Test Select')).toBeDisabled()
  })

  it('should display an error message', () => {
    render(<Select id="test" label="Test Select" options={options} error="This field is required" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
    expect(screen.getByLabelText('Test Select')).toHaveAttribute('aria-invalid', 'true')
  })

  it('should display helper text', () => {
    render(<Select id="test" label="Test Select" options={options} helperText="Please choose an option" />)
    expect(screen.getByText('Please choose an option')).toBeInTheDocument()
  })

  it('should apply size classes', () => {
    const { container, rerender } = render(<Select id="test" size="sm" />)
    expect(container.querySelector('.select-container')).toHaveClass('select-container--sm')
    expect(container.querySelector('.select')).toHaveClass('select--sm')

    rerender(<Select id="test" size="lg" />)
    expect(container.querySelector('.select-container')).toHaveClass('select-container--lg')
    expect(container.querySelector('.select')).toHaveClass('select--lg')
  })

  it('should apply placeholder class only when placeholder is shown', () => {
    const { container, rerender } = render(
      <Select
        id="test"
        label="Test Select"
        options={options}
        placeholder="Select one..."
        value=""
        onChange={() => {}}
      />,
    )
    expect(container.querySelector('.select')).toHaveClass('select--placeholder')

    rerender(
      <Select
        id="test"
        label="Test Select"
        options={options}
        placeholder="Select one..."
        value="option1"
        onChange={() => {}}
      />,
    )
    expect(container.querySelector('.select')).not.toHaveClass('select--placeholder')
  })

  it('should not include a false class name when a value exists', () => {
    render(
      <Select
        id="test"
        label="Test Select"
        options={options}
        value="option1"
        onChange={() => {}}
      />,
    )
    const select = screen.getByLabelText('Test Select')
    expect(select.className).not.toMatch(/\bfalse\b/)
  })

  it('should generate an id when one is not provided', () => {
    render(<Select label="Test Select" options={options} helperText="Please choose an option" />)
    const select = screen.getByLabelText('Test Select')
    const helper = screen.getByText('Please choose an option')

    expect(select).toHaveAttribute('id')
    expect(select.id).toBeTruthy()
    expect(helper.id).toBe(`${select.id}-helper`)
    expect(select).toHaveAttribute('aria-describedby', helper.id)
  })

  it('should render a decorative arrow icon', () => {
    const { container } = render(<Select id="test" label="Test Select" options={options} />)
    expect(container.querySelector('.select-arrow')).toBeInTheDocument()
  })
})
