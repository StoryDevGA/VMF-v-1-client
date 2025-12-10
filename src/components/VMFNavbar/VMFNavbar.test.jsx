/**
 * VMFNavbar Component Tests
 *
 * Tests cover:
 * - Rendering and navigation items
 * - Active link highlighting
 * - Progressive navigation (click-based unlocking)
 * - Accessibility
 * - Responsive behavior
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { VMFNavbar } from './VMFNavbar'

const escapeForRegex = (label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const getLink = (label) =>
  screen.getByRole('link', { name: new RegExp(`^${escapeForRegex(label)}$`, 'i') })

describe('VMFNavbar Component', () => {
  describe('Rendering', () => {
    it('should render navigation element', () => {
      render(
        <BrowserRouter>
          <VMFNavbar />
        </BrowserRouter>
      )
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('should render all navigation links', () => {
      render(
        <BrowserRouter>
          <VMFNavbar />
        </BrowserRouter>
      )

      expect(getLink('Dashboard')).toBeInTheDocument()
      expect(getLink('[a]')).toBeInTheDocument()
      expect(getLink('[b]')).toBeInTheDocument()
      expect(getLink('[c]')).toBeInTheDocument()
      expect(getLink('[d]')).toBeInTheDocument()
      expect(getLink('[e]')).toBeInTheDocument()
      expect(getLink('[f]')).toBeInTheDocument()
      expect(getLink('[g]')).toBeInTheDocument()
    })

    it('should render links with correct href attributes', () => {
      render(
        <BrowserRouter>
          <VMFNavbar />
        </BrowserRouter>
      )

      expect(getLink('Dashboard')).toHaveAttribute('href', '/vmf')
      expect(getLink('[a]')).toHaveAttribute('href', '/vmf/a')
      expect(getLink('[b]')).toHaveAttribute('href', '/vmf/b')
      expect(getLink('[c]')).toHaveAttribute('href', '/vmf/c')
      expect(getLink('[d]')).toHaveAttribute('href', '/vmf/d')
      expect(getLink('[e]')).toHaveAttribute('href', '/vmf/e')
      expect(getLink('[f]')).toHaveAttribute('href', '/vmf/f')
      expect(getLink('[g]')).toHaveAttribute('href', '/vmf/g')
    })
  })

  describe('Active Link Highlighting', () => {
    it('should highlight active link on /vmf route', () => {
      render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const dashboardLink = getLink('Dashboard')
      expect(dashboardLink).toHaveClass('vmf-navbar__link--active')
    })

    it('should highlight active link on /vmf/a route', () => {
      render(
        <MemoryRouter initialEntries={['/vmf/a']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const vmfALink = getLink('[a]')
      expect(vmfALink).toHaveClass('vmf-navbar__link--active')
    })

    it('should highlight active link on /vmf/b route', () => {
      render(
        <MemoryRouter initialEntries={['/vmf/b']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const vmfBLink = getLink('[b]')
      expect(vmfBLink).toHaveClass('vmf-navbar__link--active')
    })

    it('should only highlight one link at a time', () => {
      render(
        <MemoryRouter initialEntries={['/vmf/c']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const activeLinks = screen.getAllByRole('link').filter(link =>
        link.classList.contains('vmf-navbar__link--active')
      )
      expect(activeLinks).toHaveLength(1)
      expect(activeLinks[0]).toHaveTextContent('[c]')
    })
  })

  describe('Accessibility', () => {
    it('should have navigation role', () => {
      render(
        <BrowserRouter>
          <VMFNavbar />
        </BrowserRouter>
      )
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('should have aria-label for navigation', () => {
      render(
        <BrowserRouter>
          <VMFNavbar />
        </BrowserRouter>
      )
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'VMF navigation')
    })

    it('should have list structure', () => {
      render(
        <BrowserRouter>
          <VMFNavbar />
        </BrowserRouter>
      )
      const list = screen.getByRole('navigation').querySelector('ul')
      expect(list).toBeInTheDocument()
      expect(list).toHaveClass('vmf-navbar__links')
    })

    it('all links should be keyboard accessible', () => {
      render(
        <BrowserRouter>
          <VMFNavbar />
        </BrowserRouter>
      )
      const links = screen.getAllByRole('link')

      links.forEach(link => {
        link.focus()
        expect(link).toHaveFocus()
      })
    })
  })

  describe('CSS Classes', () => {
    it('should have base vmf-navbar class', () => {
      render(
        <BrowserRouter>
          <VMFNavbar />
        </BrowserRouter>
      )
      expect(screen.getByRole('navigation')).toHaveClass('vmf-navbar')
    })

    it('all links should have base link class', () => {
      render(
        <BrowserRouter>
          <VMFNavbar />
        </BrowserRouter>
      )
      const links = screen.getAllByRole('link')

      links.forEach(link => {
        expect(link).toHaveClass('vmf-navbar__link')
      })
    })

    it('inactive links should not have active class', () => {
      render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const vmfALink = getLink('[a]')
      expect(vmfALink).not.toHaveClass('vmf-navbar__link--active')
    })
  })

  describe('Link Structure', () => {
    it('should render 8 navigation links', () => {
      render(
        <BrowserRouter>
          <VMFNavbar />
        </BrowserRouter>
      )
      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(8)
    })

    it('should render list items in correct order', () => {
      render(
        <BrowserRouter>
          <VMFNavbar />
        </BrowserRouter>
      )
      const links = screen.getAllByRole('link')

      expect(links[0]).toHaveTextContent('Dashboard')
      expect(links[1]).toHaveTextContent('[a]')
      expect(links[2]).toHaveTextContent('[b]')
      expect(links[3]).toHaveTextContent('[c]')
      expect(links[4]).toHaveTextContent('[d]')
      expect(links[5]).toHaveTextContent('[e]')
      expect(links[6]).toHaveTextContent('[f]')
      expect(links[7]).toHaveTextContent('[g]')
    })
  })

  describe('Progressive Navigation', () => {
    describe('Initial State', () => {
    it('should have only Dashboard accessible initially', () => {
      render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const dashboardLink = getLink('Dashboard')
      expect(dashboardLink).not.toHaveClass('vmf-navbar__link--disabled')
      expect(dashboardLink).not.toHaveAttribute('aria-disabled', 'true')
    })

    it('should have all other links disabled initially', () => {
      render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const disabledLinks = ['[a]', '[b]', '[c]', '[d]', '[e]', '[f]', '[g]']

      disabledLinks.forEach(linkName => {
        const link = getLink(linkName)
        expect(link).toHaveClass('vmf-navbar__link--disabled')
        expect(link).toHaveAttribute('aria-disabled', 'true')
      })
    })
  })

    describe('Progressive Unlocking', () => {
      it('should unlock [a] when Dashboard is clicked', () => {
      render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const dashboardLink = getLink('Dashboard')
      const vmfALink = getLink('[a]')

      expect(vmfALink).toHaveClass('vmf-navbar__link--disabled')

      fireEvent.click(dashboardLink)

        expect(vmfALink).not.toHaveClass('vmf-navbar__link--disabled')
        expect(vmfALink).not.toHaveAttribute('aria-disabled', 'true')
      })

      it('should unlock [b] when [a] is clicked', () => {
      render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const dashboardLink = getLink('Dashboard')
      const vmfALink = getLink('[a]')
      const vmfBLink = getLink('[b]')

      // Unlock [a]
      fireEvent.click(dashboardLink)
      expect(vmfBLink).toHaveClass('vmf-navbar__link--disabled')

        // Unlock [b]
        fireEvent.click(vmfALink)
        expect(vmfBLink).not.toHaveClass('vmf-navbar__link--disabled')
      })

      it('should unlock pages sequentially through entire chain', () => {
      render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const pages = ['Dashboard', '[a]', '[b]', '[c]', '[d]', '[e]', '[f]']

      pages.forEach((pageName, index) => {
        const currentLink = getLink(pageName)
        fireEvent.click(currentLink)

        // Check that next page is now unlocked (if not the last page)
        if (index < pages.length - 1) {
          const nextPage = pages[index + 1]
          const nextLink = getLink(nextPage)
          expect(nextLink).not.toHaveClass('vmf-navbar__link--disabled')
        }
      })

      // After clicking through all, [g] should now be unlocked
      const vmfGLink = getLink('[g]')
      expect(vmfGLink).not.toHaveClass('vmf-navbar__link--disabled')
    })
  })

    describe('Disabled Link Behavior', () => {
      it('should prevent navigation when clicking disabled link', () => {
        render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const vmfBLink = getLink('[b]')

      // [b] should be disabled initially (when on Dashboard)
      expect(vmfBLink).toHaveClass('vmf-navbar__link--disabled')

        // Click should be prevented
        const clickEvent = fireEvent.click(vmfBLink)
        expect(clickEvent).toBe(false) // Event was prevented
      })

      it('should not unlock pages when clicking disabled links', () => {
        render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const vmfCLink = getLink('[c]')
      const vmfDLink = getLink('[d]')

      // Try clicking [c] (disabled - two pages ahead)
      fireEvent.click(vmfCLink)

        // [d] should still be disabled
        expect(vmfDLink).toHaveClass('vmf-navbar__link--disabled')
      })
    })

    describe('Backward Navigation', () => {
      it('should allow clicking previously unlocked pages', () => {
        render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const dashboardLink = getLink('Dashboard')
      const vmfALink = getLink('[a]')

      // Unlock [a]
      fireEvent.click(dashboardLink)

        // Should be able to click Dashboard again (backward navigation)
        expect(dashboardLink).not.toHaveClass('vmf-navbar__link--disabled')
        fireEvent.click(dashboardLink)

        // [a] should still be unlocked
        expect(vmfALink).not.toHaveClass('vmf-navbar__link--disabled')
      })

      it('should not re-lock pages when navigating backward', () => {
        render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const dashboardLink = getLink('Dashboard')
      const vmfALink = getLink('[a]')
      const vmfBLink = getLink('[b]')

        // Unlock [a] and [b]
        fireEvent.click(dashboardLink)
        fireEvent.click(vmfALink)

        // Go back to Dashboard
        fireEvent.click(dashboardLink)

        // [a] and [b] should still be unlocked
        expect(vmfALink).not.toHaveClass('vmf-navbar__link--disabled')
        expect(vmfBLink).not.toHaveClass('vmf-navbar__link--disabled')
      })
    })

    describe('CSS Classes - Progressive Navigation', () => {
      it('should apply disabled class to locked links', () => {
        render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const vmfGLink = getLink('[g]')
      expect(vmfGLink).toHaveClass('vmf-navbar__link--disabled')
    })

    it('should remove disabled class when link is unlocked', () => {
      render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const dashboardLink = getLink('Dashboard')
      const vmfALink = getLink('[a]')

      expect(vmfALink).toHaveClass('vmf-navbar__link--disabled')

        fireEvent.click(dashboardLink)

        expect(vmfALink).not.toHaveClass('vmf-navbar__link--disabled')
      })

      it('should maintain active class independently of disabled state', () => {
        render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const dashboardLink = getLink('Dashboard')

      // Dashboard should be active (current route) but not disabled
      expect(dashboardLink).toHaveClass('vmf-navbar__link--active')
        expect(dashboardLink).not.toHaveClass('vmf-navbar__link--disabled')
      })
    })

    describe('Accessibility - Progressive Navigation', () => {
      it('should have aria-disabled="true" on locked links', () => {
        render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const vmfELink = getLink('[e]')
      expect(vmfELink).toHaveAttribute('aria-disabled', 'true')
    })

    it('should not have aria-disabled on unlocked links', () => {
      render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const dashboardLink = getLink('Dashboard')
      const vmfALink = getLink('[a]')

      fireEvent.click(dashboardLink)

        expect(dashboardLink).not.toHaveAttribute('aria-disabled', 'true')
        expect(vmfALink).not.toHaveAttribute('aria-disabled', 'true')
      })
    })

    describe('Deep Linking Support', () => {
      it('should unlock pages up to current route when directly navigating to a page', () => {
        render(
        <MemoryRouter initialEntries={['/vmf/d']}>
          <VMFNavbar />
        </MemoryRouter>
      )

        // When directly navigating to [d], all pages up to [d] should be unlocked
        const dashboardLink = getLink('Dashboard')
        const vmfALink = getLink('[a]')
        const vmfBLink = getLink('[b]')
        const vmfCLink = getLink('[c]')
        const vmfDLink = getLink('[d]')

        expect(dashboardLink).not.toHaveClass('vmf-navbar__link--disabled')
        expect(vmfALink).not.toHaveClass('vmf-navbar__link--disabled')
        expect(vmfBLink).not.toHaveClass('vmf-navbar__link--disabled')
        expect(vmfCLink).not.toHaveClass('vmf-navbar__link--disabled')
        expect(vmfDLink).not.toHaveClass('vmf-navbar__link--disabled')
      })

      it('should keep pages after current route locked when deep linking', () => {
        render(
        <MemoryRouter initialEntries={['/vmf/c']}>
          <VMFNavbar />
        </MemoryRouter>
      )

        // Pages after [c] should still be locked
        const vmfDLink = getLink('[d]')
        const vmfELink = getLink('[e]')
        const vmfFLink = getLink('[f]')
        const vmfGLink = getLink('[g]')

        expect(vmfDLink).toHaveClass('vmf-navbar__link--disabled')
        expect(vmfELink).toHaveClass('vmf-navbar__link--disabled')
        expect(vmfFLink).toHaveClass('vmf-navbar__link--disabled')
        expect(vmfGLink).toHaveClass('vmf-navbar__link--disabled')
      })

      it('should allow progression from deep linked page', () => {
        render(
        <MemoryRouter initialEntries={['/vmf/b']}>
          <VMFNavbar />
        </MemoryRouter>
      )

        const vmfBLink = getLink('[b]')
        const vmfCLink = getLink('[c]')

        // [c] should be locked initially
        expect(vmfCLink).toHaveClass('vmf-navbar__link--disabled')

        // Click [b] (current page) to unlock [c]
        fireEvent.click(vmfBLink)

        // [c] should now be unlocked
        expect(vmfCLink).not.toHaveClass('vmf-navbar__link--disabled')
      })
    })
  })
})
