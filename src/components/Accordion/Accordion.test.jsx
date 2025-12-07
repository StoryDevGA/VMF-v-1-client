/**
 * Accordion Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Accordion } from './Accordion'

describe('Accordion Component', () => {
  // ===========================
  // BASIC RENDERING
  // ===========================

  describe('Basic Rendering', () => {
    it('should render accordion with items', () => {
      render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      expect(screen.getByText('Section 1')).toBeInTheDocument()
      expect(screen.getByText('Content 1')).toBeInTheDocument()
    })

    it('should have default classes', () => {
      const { container } = render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      const accordion = container.querySelector('.accordion')
      expect(accordion).toHaveClass('accordion--default')
      expect(accordion).toHaveClass('accordion--rounded')
    })

    it('should apply custom className', () => {
      const { container } = render(
        <Accordion className="custom-accordion">
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      expect(container.querySelector('.accordion')).toHaveClass('custom-accordion')
    })

    it('should render multiple items', () => {
      render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item id="item-2">
            <Accordion.Header itemId="item-2">Section 2</Accordion.Header>
            <Accordion.Content itemId="item-2">Content 2</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item id="item-3">
            <Accordion.Header itemId="item-3">Section 3</Accordion.Header>
            <Accordion.Content itemId="item-3">Content 3</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      expect(screen.getByText('Section 1')).toBeInTheDocument()
      expect(screen.getByText('Section 2')).toBeInTheDocument()
      expect(screen.getByText('Section 3')).toBeInTheDocument()
    })
  })

  // ===========================
  // VARIANTS
  // ===========================

  describe('Variants', () => {
    it('should apply default variant', () => {
      const { container } = render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      expect(container.querySelector('.accordion')).toHaveClass('accordion--default')
    })

    it('should apply outlined variant', () => {
      const { container } = render(
        <Accordion variant="outlined">
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      expect(container.querySelector('.accordion')).toHaveClass('accordion--outlined')
    })

    it('should apply filled variant', () => {
      const { container } = render(
        <Accordion variant="filled">
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      expect(container.querySelector('.accordion')).toHaveClass('accordion--filled')
    })
  })

  // ===========================
  // CORNER STYLES
  // ===========================

  describe('Corner Styles', () => {
    it('should be rounded by default', () => {
      const { container } = render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      expect(container.querySelector('.accordion')).toHaveClass('accordion--rounded')
    })

    it('should apply square corners when rounded is false', () => {
      const { container } = render(
        <Accordion rounded={false}>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      expect(container.querySelector('.accordion')).toHaveClass('accordion--square')
      expect(container.querySelector('.accordion')).not.toHaveClass('accordion--rounded')
    })
  })

  // ===========================
  // INTERACTIVE BEHAVIOR
  // ===========================

  describe('Interactive Behavior', () => {
    it('should start with all items closed by default', () => {
      const { container } = render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      const item = container.querySelector('.accordion__item')
      expect(item).not.toHaveClass('accordion__item--open')
    })

    it('should open item when header is clicked', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      const header = screen.getByText('Section 1')
      await user.click(header)

      const item = container.querySelector('.accordion__item')
      expect(item).toHaveClass('accordion__item--open')
    })

    it('should close item when clicking opened header', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      const header = screen.getByText('Section 1')

      // Open
      await user.click(header)
      let item = container.querySelector('.accordion__item')
      expect(item).toHaveClass('accordion__item--open')

      // Close
      await user.click(header)
      item = container.querySelector('.accordion__item')
      expect(item).not.toHaveClass('accordion__item--open')
    })

    it('should only allow one item open in single mode (default)', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item id="item-2">
            <Accordion.Header itemId="item-2">Section 2</Accordion.Header>
            <Accordion.Content itemId="item-2">Content 2</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      // Open first item
      await user.click(screen.getByText('Section 1'))
      let items = container.querySelectorAll('.accordion__item')
      expect(items[0]).toHaveClass('accordion__item--open')
      expect(items[1]).not.toHaveClass('accordion__item--open')

      // Open second item - first should close
      await user.click(screen.getByText('Section 2'))
      items = container.querySelectorAll('.accordion__item')
      expect(items[0]).not.toHaveClass('accordion__item--open')
      expect(items[1]).toHaveClass('accordion__item--open')
    })

    it('should allow multiple items open when allowMultiple is true', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Accordion allowMultiple>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item id="item-2">
            <Accordion.Header itemId="item-2">Section 2</Accordion.Header>
            <Accordion.Content itemId="item-2">Content 2</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      // Open first item
      await user.click(screen.getByText('Section 1'))
      // Open second item
      await user.click(screen.getByText('Section 2'))

      const items = container.querySelectorAll('.accordion__item')
      expect(items[0]).toHaveClass('accordion__item--open')
      expect(items[1]).toHaveClass('accordion__item--open')
    })

    it('should respect defaultOpenItems', () => {
      const { container } = render(
        <Accordion defaultOpenItems={['item-1', 'item-2']}>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item id="item-2">
            <Accordion.Header itemId="item-2">Section 2</Accordion.Header>
            <Accordion.Content itemId="item-2">Content 2</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      const items = container.querySelectorAll('.accordion__item')
      expect(items[0]).toHaveClass('accordion__item--open')
      expect(items[1]).toHaveClass('accordion__item--open')
    })
  })

  // ===========================
  // KEYBOARD NAVIGATION
  // ===========================

  describe('Keyboard Navigation', () => {
    it('should toggle item with Enter key', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      const header = screen.getByRole('button', { name: 'Section 1' })
      header.focus()
      await user.keyboard('{Enter}')

      const item = container.querySelector('.accordion__item')
      expect(item).toHaveClass('accordion__item--open')
    })

    it('should toggle item with Space key', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      const header = screen.getByRole('button', { name: 'Section 1' })
      header.focus()
      await user.keyboard(' ')

      const item = container.querySelector('.accordion__item')
      expect(item).toHaveClass('accordion__item--open')
    })
  })

  // ===========================
  // ACCESSIBILITY
  // ===========================

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on header', () => {
      render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      const header = screen.getByRole('button', { name: 'Section 1' })
      expect(header).toHaveAttribute('aria-expanded', 'false')
      expect(header).toHaveAttribute('aria-controls', 'accordion-content-item-1')
      expect(header).toHaveAttribute('type', 'button')
    })

    it('should update aria-expanded when opened', async () => {
      const user = userEvent.setup()
      render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      const header = screen.getByRole('button', { name: 'Section 1' })
      expect(header).toHaveAttribute('aria-expanded', 'false')

      await user.click(header)
      expect(header).toHaveAttribute('aria-expanded', 'true')
    })

    it('should have proper role and aria-hidden on content', () => {
      const { container } = render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      const content = container.querySelector('.accordion__content')
      expect(content).toHaveAttribute('role', 'region')
      expect(content).toHaveAttribute('aria-hidden', 'true')
      expect(content).toHaveAttribute('id', 'accordion-content-item-1')
    })

    it('should update aria-hidden when opened', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      const header = screen.getByText('Section 1')
      const content = container.querySelector('.accordion__content')

      expect(content).toHaveAttribute('aria-hidden', 'true')

      await user.click(header)
      expect(content).toHaveAttribute('aria-hidden', 'false')
    })

    it('should have aria-hidden on icon', () => {
      const { container } = render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      const icon = container.querySelector('.accordion__icon')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  // ===========================
  // CUSTOM CLASSES
  // ===========================

  describe('Custom Classes', () => {
    it('should apply custom className to Item', () => {
      const { container } = render(
        <Accordion>
          <Accordion.Item id="item-1" className="custom-item">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      expect(container.querySelector('.accordion__item')).toHaveClass('custom-item')
    })

    it('should apply custom className to Header', () => {
      const { container } = render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1" className="custom-header">
              Section 1
            </Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      expect(container.querySelector('.accordion__header')).toHaveClass('custom-header')
    })

    it('should apply custom className to Content', () => {
      const { container } = render(
        <Accordion>
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1" className="custom-content">
              Content 1
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      expect(container.querySelector('.accordion__content')).toHaveClass('custom-content')
    })
  })

  // ===========================
  // ERROR HANDLING
  // ===========================

  describe('Error Handling', () => {
    it('should throw error when Item is used outside Accordion', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
        )
      }).toThrow('Accordion.Item must be used within Accordion')

      consoleSpy.mockRestore()
    })

    it('should throw error when Header is used outside Accordion', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<Accordion.Header itemId="item-1">Section 1</Accordion.Header>)
      }).toThrow('Accordion.Header must be used within Accordion')

      consoleSpy.mockRestore()
    })

    it('should throw error when Content is used outside Accordion', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<Accordion.Content itemId="item-1">Content 1</Accordion.Content>)
      }).toThrow('Accordion.Content must be used within Accordion')

      consoleSpy.mockRestore()
    })
  })

  // ===========================
  // COMBINED FEATURES
  // ===========================

  describe('Combined Features', () => {
    it('should handle all props together', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Accordion
          variant="outlined"
          rounded={false}
          allowMultiple
          defaultOpenItems={['item-1']}
          className="custom-accordion"
        >
          <Accordion.Item id="item-1">
            <Accordion.Header itemId="item-1">Section 1</Accordion.Header>
            <Accordion.Content itemId="item-1">Content 1</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item id="item-2">
            <Accordion.Header itemId="item-2">Section 2</Accordion.Header>
            <Accordion.Content itemId="item-2">Content 2</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

      const accordion = container.querySelector('.accordion')
      expect(accordion).toHaveClass('accordion--outlined')
      expect(accordion).toHaveClass('accordion--square')
      expect(accordion).toHaveClass('custom-accordion')

      // First item should be open by default
      let items = container.querySelectorAll('.accordion__item')
      expect(items[0]).toHaveClass('accordion__item--open')

      // Open second item - both should remain open (allowMultiple)
      await user.click(screen.getByText('Section 2'))
      items = container.querySelectorAll('.accordion__item')
      expect(items[0]).toHaveClass('accordion__item--open')
      expect(items[1]).toHaveClass('accordion__item--open')
    })
  })
})
