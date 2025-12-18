/**
 * TabView Component Tests
 *
 * Tests cover:
 * - Rendering and content
 * - Tab selection and switching
 * - Variants and orientations
 * - Keyboard navigation
 * - User interactions
 * - Accessibility
 * - Edge cases
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TabView } from './TabView'

describe('TabView Component', () => {
  describe('Rendering', () => {
    it('should render tabs with labels', () => {
      render(
        <TabView>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
          <TabView.Tab label="Tab 3">Content 3</TabView.Tab>
        </TabView>
      )

      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Tab 3' })).toBeInTheDocument()
    })

    it('should render with custom className', () => {
      render(
        <TabView className="custom-class">
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
        </TabView>
      )

      const tabview = screen.getByRole('tablist').parentElement
      expect(tabview).toHaveClass('custom-class')
    })

    it('should have tablist role', () => {
      render(
        <TabView>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
        </TabView>
      )

      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('should render tabpanels for each tab', () => {
      render(
        <TabView>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
        </TabView>
      )

      const tabpanels = screen.getAllByRole('tabpanel', { hidden: true })
      expect(tabpanels).toHaveLength(2)
    })
  })

  describe('Default Active Tab', () => {
    it('should make first tab active by default', () => {
      render(
        <TabView>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
        </TabView>
      )

      const firstTab = screen.getByRole('tab', { name: 'Tab 1' })
      expect(firstTab).toHaveAttribute('aria-selected', 'true')
      expect(firstTab).toHaveClass('tabview__tab--active')
    })

    it('should respect defaultActiveTab prop', () => {
      render(
        <TabView defaultActiveTab={1}>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
          <TabView.Tab label="Tab 3">Content 3</TabView.Tab>
        </TabView>
      )

      const secondTab = screen.getByRole('tab', { name: 'Tab 2' })
      expect(secondTab).toHaveAttribute('aria-selected', 'true')
      expect(secondTab).toHaveClass('tabview__tab--active')
    })

    it('should show content of default active tab', () => {
      render(
        <TabView defaultActiveTab={1}>
          <TabView.Tab label="Tab 1">First Content</TabView.Tab>
          <TabView.Tab label="Tab 2">Second Content</TabView.Tab>
        </TabView>
      )

      expect(screen.getByText('Second Content')).toBeVisible()
    })
  })

  describe('Tab Switching', () => {
    it('should switch tabs when clicked', async () => {
      const user = userEvent.setup()

      render(
        <TabView>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
        </TabView>
      )

      const secondTab = screen.getByRole('tab', { name: 'Tab 2' })
      await user.click(secondTab)

      expect(secondTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('Content 2')).toBeVisible()
    })

    it('should hide previous tab content when switching', async () => {
      const user = userEvent.setup()

      render(
        <TabView>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
        </TabView>
      )

      expect(screen.getByText('Content 1')).toBeVisible()

      await user.click(screen.getByRole('tab', { name: 'Tab 2' }))

      expect(screen.getByText('Content 1')).not.toBeVisible()
      expect(screen.getByText('Content 2')).toBeVisible()
    })

    it('should call onTabChange callback when tab changes', async () => {
      const handleTabChange = vi.fn()
      const user = userEvent.setup()

      render(
        <TabView onTabChange={handleTabChange}>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
        </TabView>
      )

      await user.click(screen.getByRole('tab', { name: 'Tab 2' }))

      expect(handleTabChange).toHaveBeenCalledWith(1)
    })

    it('should update active class when switching tabs', async () => {
      const user = userEvent.setup()

      render(
        <TabView>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
        </TabView>
      )

      const firstTab = screen.getByRole('tab', { name: 'Tab 1' })
      const secondTab = screen.getByRole('tab', { name: 'Tab 2' })

      expect(firstTab).toHaveClass('tabview__tab--active')
      expect(secondTab).not.toHaveClass('tabview__tab--active')

      await user.click(secondTab)

      expect(firstTab).not.toHaveClass('tabview__tab--active')
      expect(secondTab).toHaveClass('tabview__tab--active')
    })
  })

  describe('Keyboard Navigation - Horizontal', () => {
    it('should navigate to next tab with ArrowRight', async () => {
      const user = userEvent.setup()

      render(
        <TabView orientation="horizontal">
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
        </TabView>
      )

      const firstTab = screen.getByRole('tab', { name: 'Tab 1' })
      firstTab.focus()

      await user.keyboard('{ArrowRight}')

      const secondTab = screen.getByRole('tab', { name: 'Tab 2' })
      expect(secondTab).toHaveFocus()
      expect(secondTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should navigate to previous tab with ArrowLeft', async () => {
      const user = userEvent.setup()

      render(
        <TabView orientation="horizontal" defaultActiveTab={1}>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
        </TabView>
      )

      const secondTab = screen.getByRole('tab', { name: 'Tab 2' })
      secondTab.focus()

      await user.keyboard('{ArrowLeft}')

      const firstTab = screen.getByRole('tab', { name: 'Tab 1' })
      expect(firstTab).toHaveFocus()
      expect(firstTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should wrap to first tab when ArrowRight on last tab', async () => {
      const user = userEvent.setup()

      render(
        <TabView orientation="horizontal" defaultActiveTab={2}>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
          <TabView.Tab label="Tab 3">Content 3</TabView.Tab>
        </TabView>
      )

      const thirdTab = screen.getByRole('tab', { name: 'Tab 3' })
      thirdTab.focus()

      await user.keyboard('{ArrowRight}')

      const firstTab = screen.getByRole('tab', { name: 'Tab 1' })
      expect(firstTab).toHaveFocus()
    })

    it('should wrap to last tab when ArrowLeft on first tab', async () => {
      const user = userEvent.setup()

      render(
        <TabView orientation="horizontal">
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
          <TabView.Tab label="Tab 3">Content 3</TabView.Tab>
        </TabView>
      )

      const firstTab = screen.getByRole('tab', { name: 'Tab 1' })
      firstTab.focus()

      await user.keyboard('{ArrowLeft}')

      const thirdTab = screen.getByRole('tab', { name: 'Tab 3' })
      expect(thirdTab).toHaveFocus()
    })

    it('should navigate to first tab with Home key', async () => {
      const user = userEvent.setup()

      render(
        <TabView defaultActiveTab={2}>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
          <TabView.Tab label="Tab 3">Content 3</TabView.Tab>
        </TabView>
      )

      const thirdTab = screen.getByRole('tab', { name: 'Tab 3' })
      thirdTab.focus()

      await user.keyboard('{Home}')

      const firstTab = screen.getByRole('tab', { name: 'Tab 1' })
      expect(firstTab).toHaveFocus()
      expect(firstTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should navigate to last tab with End key', async () => {
      const user = userEvent.setup()

      render(
        <TabView>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
          <TabView.Tab label="Tab 3">Content 3</TabView.Tab>
        </TabView>
      )

      const firstTab = screen.getByRole('tab', { name: 'Tab 1' })
      firstTab.focus()

      await user.keyboard('{End}')

      const thirdTab = screen.getByRole('tab', { name: 'Tab 3' })
      expect(thirdTab).toHaveFocus()
      expect(thirdTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('Keyboard Navigation - Vertical', () => {
    it('should navigate with ArrowDown in vertical orientation', async () => {
      const user = userEvent.setup()

      render(
        <TabView orientation="vertical">
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
        </TabView>
      )

      const firstTab = screen.getByRole('tab', { name: 'Tab 1' })
      firstTab.focus()

      await user.keyboard('{ArrowDown}')

      const secondTab = screen.getByRole('tab', { name: 'Tab 2' })
      expect(secondTab).toHaveFocus()
      expect(secondTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should navigate with ArrowUp in vertical orientation', async () => {
      const user = userEvent.setup()

      render(
        <TabView orientation="vertical" defaultActiveTab={1}>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
        </TabView>
      )

      const secondTab = screen.getByRole('tab', { name: 'Tab 2' })
      secondTab.focus()

      await user.keyboard('{ArrowUp}')

      const firstTab = screen.getByRole('tab', { name: 'Tab 1' })
      expect(firstTab).toHaveFocus()
      expect(firstTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('Variants', () => {
    it('should apply default variant by default', () => {
      render(
        <TabView>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
        </TabView>
      )

      const tabview = screen.getByRole('tablist').parentElement
      expect(tabview).toHaveClass('tabview--default')
    })

    it('should apply pills variant', () => {
      render(
        <TabView variant="pills">
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
        </TabView>
      )

      const tabview = screen.getByRole('tablist').parentElement
      expect(tabview).toHaveClass('tabview--pills')
    })

    it('should apply boxed variant', () => {
      render(
        <TabView variant="boxed">
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
        </TabView>
      )

      const tabview = screen.getByRole('tablist').parentElement
      expect(tabview).toHaveClass('tabview--boxed')
    })
  })

  describe('Orientation', () => {
    it('should apply horizontal orientation by default', () => {
      render(
        <TabView>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
        </TabView>
      )

      const tabview = screen.getByRole('tablist').parentElement
      expect(tabview).toHaveClass('tabview--horizontal')
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'horizontal')
    })

    it('should apply vertical orientation', () => {
      render(
        <TabView orientation="vertical">
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
        </TabView>
      )

      const tabview = screen.getByRole('tablist').parentElement
      expect(tabview).toHaveClass('tabview--vertical')
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on tabs', () => {
      render(
        <TabView>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
        </TabView>
      )

      const firstTab = screen.getByRole('tab', { name: 'Tab 1' })
      const secondTab = screen.getByRole('tab', { name: 'Tab 2' })

      expect(firstTab).toHaveAttribute('aria-selected', 'true')
      expect(firstTab).toHaveAttribute('aria-controls', 'tabpanel-0')
      expect(firstTab).toHaveAttribute('id', 'tab-0')
      expect(firstTab).toHaveAttribute('tabIndex', '0')

      expect(secondTab).toHaveAttribute('aria-selected', 'false')
      expect(secondTab).toHaveAttribute('tabIndex', '-1')
    })

    it('should have proper ARIA attributes on tabpanels', () => {
      render(
        <TabView>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
        </TabView>
      )

      const tabpanels = screen.getAllByRole('tabpanel', { hidden: true })

      expect(tabpanels[0]).toHaveAttribute('id', 'tabpanel-0')
      expect(tabpanels[0]).toHaveAttribute('aria-labelledby', 'tab-0')
      expect(tabpanels[0]).not.toHaveAttribute('hidden')

      expect(tabpanels[1]).toHaveAttribute('id', 'tabpanel-1')
      expect(tabpanels[1]).toHaveAttribute('aria-labelledby', 'tab-1')
      expect(tabpanels[1]).toHaveAttribute('hidden')
    })

    it('should be keyboard focusable', () => {
      render(
        <TabView>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
        </TabView>
      )

      const firstTab = screen.getByRole('tab', { name: 'Tab 1' })
      firstTab.focus()

      expect(firstTab).toHaveFocus()
    })

    it('should have type="button" on tab elements', () => {
      render(
        <TabView>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
        </TabView>
      )

      const tab = screen.getByRole('tab', { name: 'Tab 1' })
      expect(tab).toHaveAttribute('type', 'button')
    })
  })

  describe('Edge Cases', () => {
    it('should handle single tab', () => {
      render(
        <TabView>
          <TabView.Tab label="Only Tab">Only Content</TabView.Tab>
        </TabView>
      )

      expect(screen.getByRole('tab', { name: 'Only Tab' })).toBeInTheDocument()
      expect(screen.getByText('Only Content')).toBeVisible()
    })

    it('should handle missing onTabChange gracefully', async () => {
      const user = userEvent.setup()

      render(
        <TabView>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
          <TabView.Tab label="Tab 2">Content 2</TabView.Tab>
        </TabView>
      )

      await user.click(screen.getByRole('tab', { name: 'Tab 2' }))

      expect(screen.getByText('Content 2')).toBeVisible()
    })

    it('should spread additional props', () => {
      render(
        <TabView data-testid="custom-tabview" data-custom="value">
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
        </TabView>
      )

      const tabview = screen.getByTestId('custom-tabview')
      expect(tabview).toHaveAttribute('data-custom', 'value')
    })

    it('should handle complex content in tabs', () => {
      render(
        <TabView>
          <TabView.Tab label="Tab 1">
            <div>
              <h2>Title</h2>
              <p>Paragraph</p>
              <button>Action</button>
            </div>
          </TabView.Tab>
        </TabView>
      )

      expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument()
      expect(screen.getByText('Paragraph')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })
  })

  describe('CSS Classes', () => {
    it('should have base tabview class', () => {
      render(
        <TabView>
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
        </TabView>
      )

      const tabview = screen.getByRole('tablist').parentElement
      expect(tabview).toHaveClass('tabview')
    })

    it('should combine multiple classes correctly', () => {
      render(
        <TabView variant="pills" orientation="vertical" className="custom">
          <TabView.Tab label="Tab 1">Content 1</TabView.Tab>
        </TabView>
      )

      const tabview = screen.getByRole('tablist').parentElement
      expect(tabview).toHaveClass('tabview')
      expect(tabview).toHaveClass('tabview--pills')
      expect(tabview).toHaveClass('tabview--vertical')
      expect(tabview).toHaveClass('custom')
    })
  })
})
