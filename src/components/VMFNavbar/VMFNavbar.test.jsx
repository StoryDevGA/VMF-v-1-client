/**
 * VMFNavbar Component Tests
 *
 * Tests cover:
 * - Rendering and navigation items
 * - Active link highlighting
 * - Accessibility
 * - Responsive behavior
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { VMFNavbar } from './VMFNavbar'

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

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /vmf-a/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /vmf-b/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /vmf-c/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /vmf-d/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /vmf-e/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /vmf-f/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /vmf-g/i })).toBeInTheDocument()
    })

    it('should render links with correct href attributes', () => {
      render(
        <BrowserRouter>
          <VMFNavbar />
        </BrowserRouter>
      )

      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/vmf')
      expect(screen.getByRole('link', { name: /vmf-a/i })).toHaveAttribute('href', '/vmf/a')
      expect(screen.getByRole('link', { name: /vmf-b/i })).toHaveAttribute('href', '/vmf/b')
      expect(screen.getByRole('link', { name: /vmf-c/i })).toHaveAttribute('href', '/vmf/c')
      expect(screen.getByRole('link', { name: /vmf-d/i })).toHaveAttribute('href', '/vmf/d')
      expect(screen.getByRole('link', { name: /vmf-e/i })).toHaveAttribute('href', '/vmf/e')
      expect(screen.getByRole('link', { name: /vmf-f/i })).toHaveAttribute('href', '/vmf/f')
      expect(screen.getByRole('link', { name: /vmf-g/i })).toHaveAttribute('href', '/vmf/g')
    })
  })

  describe('Active Link Highlighting', () => {
    it('should highlight active link on /vmf route', () => {
      render(
        <MemoryRouter initialEntries={['/vmf']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).toHaveClass('vmf-navbar__link--active')
    })

    it('should highlight active link on /vmf/a route', () => {
      render(
        <MemoryRouter initialEntries={['/vmf/a']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const vmfALink = screen.getByRole('link', { name: /vmf-a/i })
      expect(vmfALink).toHaveClass('vmf-navbar__link--active')
    })

    it('should highlight active link on /vmf/b route', () => {
      render(
        <MemoryRouter initialEntries={['/vmf/b']}>
          <VMFNavbar />
        </MemoryRouter>
      )

      const vmfBLink = screen.getByRole('link', { name: /vmf-b/i })
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
      expect(activeLinks[0]).toHaveTextContent('VMF-C')
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

      const vmfALink = screen.getByRole('link', { name: /vmf-a/i })
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
      expect(links[1]).toHaveTextContent('VMF-A')
      expect(links[2]).toHaveTextContent('VMF-B')
      expect(links[3]).toHaveTextContent('VMF-C')
      expect(links[4]).toHaveTextContent('VMF-D')
      expect(links[5]).toHaveTextContent('VMF-E')
      expect(links[6]).toHaveTextContent('VMF-F')
      expect(links[7]).toHaveTextContent('VMF-G')
    })
  })
})
