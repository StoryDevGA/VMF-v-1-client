/**
 * Footer Component Tests
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { format } from 'date-fns'
import { Footer } from './Footer'

// Wrapper for React Router context
const RouterWrapper = ({ children }) => <BrowserRouter>{children}</BrowserRouter>

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
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
    it('should render StoryLineOS copyright text', () => {
      render(
        <RouterWrapper>
          <Footer />
        </RouterWrapper>
      )
      expect(screen.getByText(/StoryLineOS. All rights reserved./)).toBeInTheDocument()
    })

    it('should include current year', () => {
      const currentYear = new Date().getFullYear()
      render(
        <RouterWrapper>
          <Footer />
        </RouterWrapper>
      )
      expect(screen.getByText(new RegExp(`© ${currentYear} StoryLineOS. All rights reserved.`))).toBeInTheDocument()
    })

    it('should always render copyright', () => {
      render(
        <RouterWrapper>
          <Footer />
        </RouterWrapper>
      )
      expect(screen.getByText(/©/)).toBeInTheDocument()
    })
  })

  describe('Version Metadata', () => {
    it('should render version from version.json when available', async () => {
      const builtAtIso = '2026-02-10T11:52:26.009Z'
      const builtAtDate = new Date(builtAtIso)
      const yyyy = builtAtDate.getFullYear()
      const mm = String(builtAtDate.getMonth() + 1).padStart(2, '0')
      const dd = String(builtAtDate.getDate()).padStart(2, '0')
      const hh = String(builtAtDate.getHours()).padStart(2, '0')
      const min = String(builtAtDate.getMinutes()).padStart(2, '0')
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local'
      const expectedBuildTime = `${yyyy}-${mm}-${dd} ${hh}:${min} ${tz}`

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          version: '0.0.0',
          builtAt: builtAtIso,
          environment: 'staging'
        }),
      })

      render(
        <RouterWrapper>
          <Footer />
        </RouterWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(`v0.0.0 • ${expectedBuildTime} • STAGING`)).toBeInTheDocument()
      })
    })

    it('should render fallback text when version file is unavailable', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('missing'))

      render(
        <RouterWrapper>
          <Footer />
        </RouterWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Version unavailable')).toBeInTheDocument()
      })
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
          <Footer />
        </RouterWrapper>
      )

      expect(screen.getByText(format(mockDate, 'MMM d, yyyy'))).toBeInTheDocument()
      expect(screen.getByText(format(mockDate, 'hh:mm a'))).toBeInTheDocument()
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
  })
})

