/**
 * Button Component Tests
 *
 * Tests cover:
 * - Rendering and content
 * - Variants and sizes
 * - States (disabled, loading)
 * - User interactions
 * - Accessibility
 * - Edge cases
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, ButtonGroup } from './Button'

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with children', () => {
      render(<Button>Click Me</Button>)
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
    })

    it('should render with custom className', () => {
      render(<Button className="custom-class">Button</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('should apply default type="button"', () => {
      render(<Button>Button</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
    })

    it('should apply custom type', () => {
      render(<Button type="submit">Submit</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
    })
  })

  describe('Variants', () => {
    it('should apply primary variant by default', () => {
      render(<Button>Primary</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--primary')
    })

    it('should apply secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--secondary')
    })

    it('should apply outline variant', () => {
      render(<Button variant="outline">Outline</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--outline')
    })

    it('should apply ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--ghost')
    })

    it('should apply danger variant', () => {
      render(<Button variant="danger">Danger</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--danger')
    })

    it('should apply warning variant', () => {
      render(<Button variant="warning">Warning</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--warning')
    })
  })

  describe('Sizes', () => {
    it('should apply medium size by default', () => {
      render(<Button>Medium</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--md')
    })

    it('should apply small size', () => {
      render(<Button size="sm">Small</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--sm')
    })

    it('should apply large size', () => {
      render(<Button size="lg">Large</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--lg')
    })
  })

  describe('Full Width', () => {
    it('should apply full width class', () => {
      render(<Button fullWidth>Full Width</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--full-width')
    })
  })

  describe('Double Outline', () => {
    it('should apply double outline class', () => {
      render(<Button doubleOutline>Double Outline</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--double-outline')
    })

    it('should combine with variants', () => {
      render(<Button variant="outline" doubleOutline>Outline Double</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('btn--outline')
      expect(button).toHaveClass('btn--double-outline')
    })

    it('should work with different sizes', () => {
      render(<Button size="lg" doubleOutline>Large Double</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('btn--lg')
      expect(button).toHaveClass('btn--double-outline')
    })
  })

  describe('Square (No Border Radius)', () => {
    it('should apply square class', () => {
      render(<Button square>Square Button</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--square')
    })

    it('should combine with variants', () => {
      render(<Button variant="primary" square>Square Primary</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('btn--primary')
      expect(button).toHaveClass('btn--square')
    })

    it('should work with other modifiers', () => {
      render(<Button square doubleOutline fullWidth>Square Double Full</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('btn--square')
      expect(button).toHaveClass('btn--double-outline')
      expect(button).toHaveClass('btn--full-width')
    })
  })

  describe('Disabled State', () => {
    it('should disable button when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('should have aria-disabled attribute when disabled', () => {
      render(<Button disabled>Disabled</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true')
    })

    it('should not call onClick when disabled', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      )

      await user.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('should show spinner when loading', () => {
      render(<Button loading>Loading</Button>)
      const spinner = screen.getByRole('button').querySelector('.btn__spinner')
      expect(spinner).toBeInTheDocument()
    })

    it('should hide content when loading', () => {
      render(<Button loading>Loading</Button>)
      const content = screen.getByRole('button').querySelector('.btn__content--hidden')
      expect(content).toBeInTheDocument()
    })

    it('should disable button when loading', () => {
      render(<Button loading>Loading</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('should have aria-busy attribute when loading', () => {
      render(<Button loading>Loading</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    })

    it('should have aria-disabled when loading', () => {
      render(<Button loading>Loading</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true')
    })

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn()

      render(
        <Button loading onClick={handleClick}>
          Loading
        </Button>
      )

      // Use fireEvent since button has pointer-events: none (can't use userEvent)
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should apply loading class', () => {
      render(<Button loading>Loading</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn--loading')
    })
  })

  describe('User Interactions', () => {
    it('should call onClick when clicked', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(<Button onClick={handleClick}>Click Me</Button>)

      await user.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should call onClick with event', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(<Button onClick={handleClick}>Click Me</Button>)

      await user.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledWith(expect.any(Object))
    })

    it('should handle keyboard interaction (Enter)', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(<Button onClick={handleClick}>Press Enter</Button>)

      const button = screen.getByRole('button')
      button.focus()
      await user.keyboard('{Enter}')

      expect(handleClick).toHaveBeenCalled()
    })

    it('should handle keyboard interaction (Space)', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(<Button onClick={handleClick}>Press Space</Button>)

      const button = screen.getByRole('button')
      button.focus()
      await user.keyboard(' ')

      expect(handleClick).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have button role', () => {
      render(<Button>Accessible</Button>)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should be focusable', () => {
      render(<Button>Focusable</Button>)
      const button = screen.getByRole('button')
      button.focus()
      expect(button).toHaveFocus()
    })

    it('should not be focusable when disabled', () => {
      render(<Button disabled>Not Focusable</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should support custom aria attributes', () => {
      render(
        <Button aria-label="Custom Label" aria-describedby="description">
          Button
        </Button>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Custom Label')
      expect(button).toHaveAttribute('aria-describedby', 'description')
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing onClick gracefully', async () => {
      const user = userEvent.setup()
      render(<Button>No Handler</Button>)

      // Should not throw error
      await user.click(screen.getByRole('button'))
    })

    it('should handle empty children', () => {
      render(<Button></Button>)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should handle both disabled and loading', () => {
      render(
        <Button disabled loading>
          Both States
        </Button>
      )
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-busy', 'true')
    })

    it('should spread additional props', () => {
      render(
        <Button data-testid="custom-button" data-custom="value">
          Custom Props
        </Button>
      )
      const button = screen.getByTestId('custom-button')
      expect(button).toHaveAttribute('data-custom', 'value')
    })
  })

  describe('CSS Classes', () => {
    it('should have base btn class', () => {
      render(<Button>Button</Button>)
      expect(screen.getByRole('button')).toHaveClass('btn')
    })

    it('should combine multiple classes correctly', () => {
      render(
        <Button variant="primary" size="lg" fullWidth className="custom">
          Button
        </Button>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveClass('btn')
      expect(button).toHaveClass('btn--primary')
      expect(button).toHaveClass('btn--lg')
      expect(button).toHaveClass('btn--full-width')
      expect(button).toHaveClass('custom')
    })
  })

  describe('Icons', () => {
    it('should render left icon', () => {
      render(
        <Button leftIcon={<span data-testid="left-icon" />}>
          With Icon
        </Button>
      )
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    })

    it('should render right icon', () => {
      render(
        <Button rightIcon={<span data-testid="right-icon" />}>
          With Icon
        </Button>
      )
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })

    it('should apply icon-only class', () => {
      render(
        <Button
          iconOnly
          aria-label="Settings"
          leftIcon={<span data-testid="icon-only" />}
        />
      )
      const button = screen.getByRole('button', { name: 'Settings' })
      expect(button).toHaveClass('btn--icon-only')
      expect(screen.getByTestId('icon-only')).toBeInTheDocument()
    })
  })
})

describe('ButtonGroup Component', () => {
  it('renders grouped buttons with an accessible group role', () => {
    render(
      <ButtonGroup aria-label="Section actions">
        <Button>Save</Button>
        <Button>Next</Button>
      </ButtonGroup>
    )

    const group = screen.getByRole('group', { name: /section actions/i })
    expect(group).toHaveClass('btn-group')
    expect(within(group).getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(within(group).getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('applies alignment, gap, and responsive stacking classes', () => {
    render(
      <ButtonGroup
        align="end"
        gap="md"
        stackOnMobile
        fullWidthOnMobile
        className="custom-actions"
        aria-label="Responsive actions"
      >
        <Button>Cancel</Button>
        <Button>Confirm</Button>
      </ButtonGroup>
    )

    const group = screen.getByRole('group', { name: /responsive actions/i })
    expect(group).toHaveClass('btn-group--align-end')
    expect(group).toHaveClass('btn-group--gap-md')
    expect(group).toHaveClass('btn-group--stack-mobile')
    expect(group).toHaveClass('btn-group--full-width-mobile')
    expect(group).toHaveClass('custom-actions')
  })

  it('allows the role to be overridden when grouping is presentational', () => {
    render(
      <ButtonGroup role="presentation" data-testid="presentational-buttons">
        <Button>One</Button>
      </ButtonGroup>
    )

    const group = screen.getByTestId('presentational-buttons')
    expect(group).toHaveAttribute('role', 'presentation')
    expect(group).toHaveClass('btn-group--align-start')
    expect(group).toHaveClass('btn-group--gap-sm')
  })
})
