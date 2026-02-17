/**
 * Input Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

describe('Input Component', () => {
  // ===========================
  // BASIC RENDERING
  // ===========================

  describe('Basic Rendering', () => {
    it('should render input element', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('should render with label', () => {
      render(<Input label="Email" id="email" />)
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter your email" />)
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
    })

    it('should have default classes', () => {
      const { container } = render(<Input />)
      const inputContainer = container.querySelector('.input-container')
      expect(inputContainer).toHaveClass('input-container--default')
      expect(inputContainer).toHaveClass('input-container--md')
    })
  })

  // ===========================
  // FLOATING LABEL
  // ===========================

  describe('Floating Label', () => {
    it('should float label on focus', async () => {
      const user = userEvent.setup()
      const { container } = render(<Input label="Email" id="email" />)

      const input = screen.getByLabelText('Email')
      const label = container.querySelector('.input-label')

      expect(label).not.toHaveClass('input-label--floating')

      await user.click(input)
      expect(label).toHaveClass('input-label--floating')
    })

    it('should keep label floating when input has value', async () => {
      const user = userEvent.setup()
      const { container } = render(<Input label="Email" id="email" />)

      const input = screen.getByLabelText('Email')
      const label = container.querySelector('.input-label')

      await user.type(input, 'test@example.com')
      await user.tab() // Blur

      expect(label).toHaveClass('input-label--floating')
    })

    it('should show label in normal position when empty and not focused', async () => {
      const user = userEvent.setup()
      const { container } = render(<Input label="Email" id="email" />)

      const input = screen.getByLabelText('Email')
      const label = container.querySelector('.input-label')

      await user.click(input)
      expect(label).toHaveClass('input-label--floating')

      await user.tab() // Blur without value

      expect(label).not.toHaveClass('input-label--floating')
    })

    it('should float label when defaultValue is provided', () => {
      const { container } = render(<Input label="Email" defaultValue="test@example.com" id="email" />)

      const label = container.querySelector('.input-label')
      expect(label).toHaveClass('input-label--floating')
    })
  })

  describe('Icons', () => {
    it('should render left icon', () => {
      const { container } = render(<Input leftIcon={<span data-testid="left-icon" />} />)
      expect(container.querySelector('.input__icon--left')).toBeInTheDocument()
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    })

    it('should render right icon', () => {
      const { container } = render(<Input rightIcon={<span data-testid="right-icon" />} />)
      expect(container.querySelector('.input__icon--right')).toBeInTheDocument()
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })
  })

  // ===========================
  // SIZES
  // ===========================

  describe('Sizes', () => {
    it('should apply small size', () => {
      const { container } = render(<Input size="sm" />)
      expect(container.querySelector('.input-container')).toHaveClass('input-container--sm')
      expect(container.querySelector('.input')).toHaveClass('input--sm')
    })

    it('should apply medium size (default)', () => {
      const { container } = render(<Input />)
      expect(container.querySelector('.input-container')).toHaveClass('input-container--md')
      expect(container.querySelector('.input')).toHaveClass('input--md')
    })

    it('should apply large size', () => {
      const { container } = render(<Input size="lg" />)
      expect(container.querySelector('.input-container')).toHaveClass('input-container--lg')
      expect(container.querySelector('.input')).toHaveClass('input--lg')
    })
  })

  // ===========================
  // VARIANTS
  // ===========================

  describe('Variants', () => {
    it('should apply default variant', () => {
      const { container } = render(<Input />)
      expect(container.querySelector('.input-container')).toHaveClass('input-container--default')
    })

    it('should apply outlined variant', () => {
      const { container } = render(<Input variant="outlined" />)
      expect(container.querySelector('.input-container')).toHaveClass('input-container--outlined')
    })

    it('should apply filled variant', () => {
      const { container } = render(<Input variant="filled" />)
      expect(container.querySelector('.input-container')).toHaveClass('input-container--filled')
    })
  })

  // ===========================
  // ERROR STATE
  // ===========================

  describe('Error State', () => {
    it('should render error message', () => {
      render(<Input error="This field is required" id="test" />)
      expect(screen.getByText('This field is required')).toBeInTheDocument()
    })

    it('should apply error class', () => {
      const { container } = render(<Input error="Error" />)
      expect(container.querySelector('.input-container')).toHaveClass('input-container--error')
    })

    it('should set aria-invalid when error exists', () => {
      render(<Input error="Error" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('should link error with aria-describedby', () => {
      render(<Input error="Error message" id="test-input" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error')
    })
  })

  // ===========================
  // HELPER TEXT
  // ===========================

  describe('Helper Text', () => {
    it('should render helper text', () => {
      render(<Input helperText="Enter a valid email address" id="test" />)
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    })

    it('should not show helper text when error exists', () => {
      render(<Input helperText="Helper" error="Error" id="test" />)
      expect(screen.queryByText('Helper')).not.toBeInTheDocument()
      expect(screen.getByText('Error')).toBeInTheDocument()
    })

    it('should link helper text with aria-describedby', () => {
      render(<Input helperText="Helper text" id="test-input" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'test-input-helper')
    })
  })

  // ===========================
  // DISABLED STATE
  // ===========================

  describe('Disabled State', () => {
    it('should disable input', () => {
      render(<Input disabled />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('should apply disabled class', () => {
      const { container } = render(<Input disabled />)
      expect(container.querySelector('.input-container')).toHaveClass('input-container--disabled')
    })
  })

  // ===========================
  // REQUIRED FIELD
  // ===========================

  describe('Required Field', () => {
    it('should mark field as required', () => {
      render(<Input required />)
      expect(screen.getByRole('textbox')).toBeRequired()
    })

    it('should show asterisk for required fields with label', () => {
      render(<Input label="Email" required id="email" />)
      const label = screen.getByText('*')
      expect(label).toBeInTheDocument()
    })
  })

  // ===========================
  // FULL WIDTH
  // ===========================

  describe('Full Width', () => {
    it('should apply full width class', () => {
      const { container } = render(<Input fullWidth />)
      expect(container.querySelector('.input-container')).toHaveClass('input-container--full-width')
    })
  })

  // ===========================
  // INPUT TYPES
  // ===========================

  describe('Input Types', () => {
    it('should render text input by default', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'text')
    })

    it('should render email input', () => {
      render(<Input type="email" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('should render password input', () => {
      render(<Input type="password" />)
      const input = document.querySelector('input[type="password"]')
      expect(input).toBeInTheDocument()
    })

    it('should render number input', () => {
      render(<Input type="number" />)
      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('type', 'number')
    })
  })

  describe('Password Toggle', () => {
    it('should render password toggle by default for password fields', () => {
      render(<Input type="password" />)
      expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument()
    })

    it('should not render password toggle for non-password fields', () => {
      render(<Input type="email" />)
      expect(screen.queryByRole('button', { name: /show password/i })).not.toBeInTheDocument()
    })

    it('should allow disabling password toggle explicitly', () => {
      render(<Input type="password" showPasswordToggle={false} />)
      expect(screen.queryByRole('button', { name: /show password/i })).not.toBeInTheDocument()
    })

    it('should toggle password visibility', async () => {
      const user = userEvent.setup()
      render(<Input id="password-input" label="Password" type="password" showPasswordToggle />)

      const input = screen.getByLabelText('Password')
      const toggle = screen.getByRole('button', { name: /show password/i })

      expect(input).toHaveAttribute('type', 'password')

      await user.click(toggle)
      expect(input).toHaveAttribute('type', 'text')
      expect(toggle).toHaveAttribute('aria-label', 'Hide password')

      await user.click(toggle)
      expect(input).toHaveAttribute('type', 'password')
      expect(toggle).toHaveAttribute('aria-label', 'Show password')
    })

    it('should disable the password toggle when input is disabled', () => {
      render(<Input type="password" showPasswordToggle disabled />)
      expect(screen.getByRole('button', { name: /show password/i })).toBeDisabled()
    })
  })

  // ===========================
  // EVENT HANDLERS
  // ===========================

  describe('Event Handlers', () => {
    it('should call onFocus handler', async () => {
      const handleFocus = vi.fn()
      const user = userEvent.setup()

      render(<Input onFocus={handleFocus} />)
      await user.click(screen.getByRole('textbox'))

      expect(handleFocus).toHaveBeenCalledTimes(1)
    })

    it('should call onBlur handler', async () => {
      const handleBlur = vi.fn()
      const user = userEvent.setup()

      render(<Input onBlur={handleBlur} />)
      const input = screen.getByRole('textbox')

      await user.click(input)
      await user.tab()

      expect(handleBlur).toHaveBeenCalledTimes(1)
    })

    it('should call onChange handler', async () => {
      const handleChange = vi.fn()
      const user = userEvent.setup()

      render(<Input onChange={handleChange} />)
      await user.type(screen.getByRole('textbox'), 'test')

      expect(handleChange).toHaveBeenCalled()
    })
  })

  // ===========================
  // ACCESSIBILITY
  // ===========================

  describe('Accessibility', () => {
    it('should associate label with input via htmlFor', () => {
      render(<Input label="Email" id="email-input" />)
      const input = screen.getByLabelText('Email')
      expect(input).toHaveAttribute('id', 'email-input')
    })

    it('should have role="alert" for error message', () => {
      render(<Input error="Error message" id="test" />)
      const error = screen.getByRole('alert')
      expect(error).toHaveTextContent('Error message')
    })

    it('should support custom attributes', () => {
      render(<Input data-testid="custom-input" aria-label="Custom Input" />)
      const input = screen.getByTestId('custom-input')
      expect(input).toHaveAttribute('aria-label', 'Custom Input')
    })
  })

  // ===========================
  // REF FORWARDING
  // ===========================

  describe('Ref Forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = { current: null }
      render(<Input ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })
  })
})
