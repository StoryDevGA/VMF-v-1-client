import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SystemHealthIndicator } from './SystemHealthIndicator'

vi.mock('../../hooks/useSystemMonitoring.js', () => ({
  useSystemMonitoring: vi.fn(),
}))

import { useSystemMonitoring } from '../../hooks/useSystemMonitoring.js'

describe('SystemHealthIndicator', () => {
  it('does not render for non-admin users', () => {
    useSystemMonitoring.mockReturnValue({
      isAdmin: false,
      overallStatus: 'HEALTHY',
      isFetching: false,
    })

    const { container } = render(<SystemHealthIndicator />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders status for admin users', () => {
    useSystemMonitoring.mockReturnValue({
      isAdmin: true,
      overallStatus: 'DEGRADED',
      isFetching: false,
    })

    render(<SystemHealthIndicator />)
    expect(screen.getByRole('status')).toHaveTextContent(/degraded/i)
  })

  it('renders ok variant for HEALTHY status', () => {
    useSystemMonitoring.mockReturnValue({
      isAdmin: true,
      overallStatus: 'HEALTHY',
      isFetching: false,
    })

    render(<SystemHealthIndicator />)
    const indicator = screen.getByRole('status')
    expect(indicator).toHaveClass('system-health-indicator--ok')
  })

  it('renders error variant for DOWN status', () => {
    useSystemMonitoring.mockReturnValue({
      isAdmin: true,
      overallStatus: 'DOWN',
      isFetching: false,
    })

    render(<SystemHealthIndicator />)
    const indicator = screen.getByRole('status')
    expect(indicator).toHaveClass('system-health-indicator--error')
  })

  it('renders warn variant for DEGRADED status', () => {
    useSystemMonitoring.mockReturnValue({
      isAdmin: true,
      overallStatus: 'DEGRADED',
      isFetching: false,
    })

    render(<SystemHealthIndicator />)
    const indicator = screen.getByRole('status')
    expect(indicator).toHaveClass('system-health-indicator--warn')
  })

  it('renders unknown variant for unrecognised status', () => {
    useSystemMonitoring.mockReturnValue({
      isAdmin: true,
      overallStatus: 'STARTING',
      isFetching: false,
    })

    render(<SystemHealthIndicator />)
    const indicator = screen.getByRole('status')
    expect(indicator).toHaveClass('system-health-indicator--unknown')
  })

  it('includes an accessible label with the status', () => {
    useSystemMonitoring.mockReturnValue({
      isAdmin: true,
      overallStatus: 'HEALTHY',
      isFetching: false,
    })

    render(<SystemHealthIndicator />)
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('HEALTHY'),
    )
  })

  it('renders when fetching', () => {
    useSystemMonitoring.mockReturnValue({
      isAdmin: true,
      overallStatus: 'HEALTHY',
      isFetching: true,
    })

    render(<SystemHealthIndicator />)
    const indicators = screen.getAllByRole('status')
    expect(indicators.length).toBeGreaterThanOrEqual(1)
    expect(indicators[0]).toHaveTextContent(/healthy/i)
  })
})
