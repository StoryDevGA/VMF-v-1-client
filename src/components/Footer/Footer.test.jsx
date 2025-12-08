/**
 * Footer Component Tests
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { format } from 'date-fns'
import { Footer } from './Footer'

// Wrapper for React Router context
const RouterWrapper = ({ children }) => <BrowserRouter>{children}</BrowserRouter>

afterEach(() => {
  vi.useRealTimers()
})

describe('Footer Component', () => {
  // ===========================
  // BASIC RENDERING
  // ===========================

  describe('Basic Rendering', () => {
    it('should render footer element', () => {
      render(
        <RouterWrapper>
          <Footer />
        </RouterWrapper>
      )
      const footer = screen.getByRole('contentinfo')
      expect(footer).toBeInTheDocument()
      expect(footer).toHaveClass('footer')
    })

    it('should render with custom className', () => {
      render(
        <RouterWrapper>
          <Footer className="custom-footer" />
        </RouterWrapper>
      )
      const footer = screen.getByRole('contentinfo')
      expect(footer).toHaveClass('footer')
      expect(footer).toHaveClass('custom-footer')
    })
  })

  // ===========================
  // COPYRIGHT
  // ===========================

  describe('Copyright', () => {
    it('should render copyright text', () => {
      render(
        <RouterWrapper>
          <Footer copyright="Test Company" />
        </RouterWrapper>
      )
      expect(screen.getByText(/Test Company/)).toBeInTheDocument()
    })

    it('should include current year by default', () => {
      const currentYear = new Date().getFullYear()
      render(
        <RouterWrapper>
          <Footer copyright="Test Company" />
        </RouterWrapper>
      )
      expect(screen.getByText(new RegExp(`© ${currentYear}`))).toBeInTheDocument()
    })

    it('should not show year when showYear is false', () => {
      const currentYear = new Date().getFullYear()
      render(
        <RouterWrapper>
          <Footer copyright="Test Company" showYear={false} />
        </RouterWrapper>
      )
      expect(screen.queryByText(new RegExp(`© ${currentYear}`))).not.toBeInTheDocument()
      expect(screen.getByText('Test Company')).toBeInTheDocument()
    })

    it('should not render copyright section when copyright is not provided', () => {
      render(
        <RouterWrapper>
          <Footer />
        </RouterWrapper>
      )
      expect(screen.queryByText(/©/)).not.toBeInTheDocument()
    })
  })

  // ===========================
  // DATE & TIME
  // ===========================

  describe('Date & Time', () => {
    it('should render the current date and time', () => {
      vi.useFakeTimers()
      const mockDate = new Date('2025-02-10T15:30:45Z')
      vi.setSystemTime(mockDate)

      render(
        <RouterWrapper>
          <Footer copyright="Date Test" />
        </RouterWrapper>
      )

      expect(screen.getByText(format(mockDate, 'EEEE, MMMM d, yyyy'))).toBeInTheDocument()
      expect(screen.getByText(format(mockDate, 'hh:mm:ss a'))).toBeInTheDocument()
    })
  })

  // ===========================
  // SECTIONS
  // ===========================

  describe('Sections', () => {
    it('should render section with title', () => {
      const sections = [
        {
          title: 'Products',
          links: []
        }
      ]
      render(
        <RouterWrapper>
          <Footer sections={sections} />
        </RouterWrapper>
      )
      expect(screen.getByText('Products')).toBeInTheDocument()
    })

    it('should render multiple sections', () => {
      const sections = [
        { title: 'Products' },
        { title: 'Company' },
        { title: 'Resources' }
      ]
      render(
        <RouterWrapper>
          <Footer sections={sections} />
        </RouterWrapper>
      )
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Company')).toBeInTheDocument()
      expect(screen.getByText('Resources')).toBeInTheDocument()
    })

    it('should render section without title', () => {
      const sections = [
        {
          content: 'Custom content here'
        }
      ]
      render(
        <RouterWrapper>
          <Footer sections={sections} />
        </RouterWrapper>
      )
      expect(screen.getByText('Custom content here')).toBeInTheDocument()
    })

    it('should render custom content in section', () => {
      const sections = [
        {
          title: 'About',
          content: <p>Custom paragraph content</p>
        }
      ]
      render(
        <RouterWrapper>
          <Footer sections={sections} />
        </RouterWrapper>
      )
      expect(screen.getByText('About')).toBeInTheDocument()
      expect(screen.getByText('Custom paragraph content')).toBeInTheDocument()
    })
  })

  // ===========================
  // LINKS
  // ===========================

  describe('Links', () => {
    it('should render links in section', () => {
      const sections = [
        {
          title: 'Products',
          links: [
            { label: 'Features', to: '/features' },
            { label: 'Pricing', to: '/pricing' }
          ]
        }
      ]
      render(
        <RouterWrapper>
          <Footer sections={sections} />
        </RouterWrapper>
      )
      expect(screen.getByText('Features')).toBeInTheDocument()
      expect(screen.getByText('Pricing')).toBeInTheDocument()
    })

    it('should render internal links with to prop', () => {
      const sections = [
        {
          title: 'Navigation',
          links: [{ label: 'Home', to: '/' }]
        }
      ]
      render(
        <RouterWrapper>
          <Footer sections={sections} />
        </RouterWrapper>
      )
      const link = screen.getByText('Home')
      expect(link).toHaveAttribute('href', '/')
    })

    it('should render external links with href prop', () => {
      const sections = [
        {
          title: 'Social',
          links: [
            {
              label: 'Twitter',
              href: 'https://twitter.com',
              external: true
            }
          ]
        }
      ]
      render(
        <RouterWrapper>
          <Footer sections={sections} />
        </RouterWrapper>
      )
      const link = screen.getByText('Twitter')
      expect(link).toHaveAttribute('href', 'https://twitter.com')
    })

    it('should render links with openInNewTab', () => {
      const sections = [
        {
          title: 'External',
          links: [
            {
              label: 'GitHub',
              href: 'https://github.com',
              openInNewTab: true
            }
          ]
        }
      ]
      render(
        <RouterWrapper>
          <Footer sections={sections} />
        </RouterWrapper>
      )
      const link = screen.getByText(/GitHub/)
      expect(link).toHaveAttribute('target', '_blank')
    })

    it('should render multiple links in section', () => {
      const sections = [
        {
          title: 'Company',
          links: [
            { label: 'About', to: '/about' },
            { label: 'Team', to: '/team' },
            { label: 'Careers', to: '/careers' }
          ]
        }
      ]
      render(
        <RouterWrapper>
          <Footer sections={sections} />
        </RouterWrapper>
      )
      expect(screen.getByText('About')).toBeInTheDocument()
      expect(screen.getByText('Team')).toBeInTheDocument()
      expect(screen.getByText('Careers')).toBeInTheDocument()
    })
  })

  // ===========================
  // COMPLEX SCENARIOS
  // ===========================

  describe('Complex Scenarios', () => {
    it('should render complete footer with all features', () => {
      const currentYear = new Date().getFullYear()
      const sections = [
        {
          title: 'Product',
          links: [
            { label: 'Features', to: '/features' },
            { label: 'Pricing', to: '/pricing' }
          ]
        },
        {
          title: 'Company',
          links: [
            { label: 'About', to: '/about' },
            { label: 'Blog', href: 'https://blog.example.com', external: true }
          ]
        },
        {
          title: 'Connect',
          content: <p>Follow us on social media</p>
        }
      ]

      render(
        <RouterWrapper>
          <Footer sections={sections} copyright="Example Inc." />
        </RouterWrapper>
      )

      // Check sections
      expect(screen.getByText('Product')).toBeInTheDocument()
      expect(screen.getByText('Company')).toBeInTheDocument()
      expect(screen.getByText('Connect')).toBeInTheDocument()

      // Check links
      expect(screen.getByText('Features')).toBeInTheDocument()
      expect(screen.getByText('Pricing')).toBeInTheDocument()
      expect(screen.getByText('About')).toBeInTheDocument()
      expect(screen.getByText('Blog')).toBeInTheDocument()

      // Check content
      expect(screen.getByText('Follow us on social media')).toBeInTheDocument()

      // Check copyright
      expect(screen.getByText(new RegExp(`© ${currentYear} Example Inc.`))).toBeInTheDocument()
    })

    it('should handle empty sections array', () => {
      render(
        <RouterWrapper>
          <Footer sections={[]} copyright="Test Company" />
        </RouterWrapper>
      )
      expect(screen.getByText(/Test Company/)).toBeInTheDocument()
    })
  })

  // ===========================
  // ACCESSIBILITY
  // ===========================

  describe('Accessibility', () => {
    it('should have contentinfo role', () => {
      render(
        <RouterWrapper>
          <Footer />
        </RouterWrapper>
      )
      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    })

    it('should render links with proper list structure', () => {
      const sections = [
        {
          title: 'Navigation',
          links: [
            { label: 'Home', to: '/' },
            { label: 'About', to: '/about' }
          ]
        }
      ]
      render(
        <RouterWrapper>
          <Footer sections={sections} />
        </RouterWrapper>
      )
      const lists = screen.getAllByRole('list')
      expect(lists.length).toBeGreaterThan(0)
    })
  })
})
