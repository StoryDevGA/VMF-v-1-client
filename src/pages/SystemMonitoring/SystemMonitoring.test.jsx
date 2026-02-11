import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SystemMonitoring from './SystemMonitoring'

vi.mock('../../hooks/useSystemMonitoring.js', () => ({
  useSystemMonitoring: vi.fn(),
}))

import { useSystemMonitoring } from '../../hooks/useSystemMonitoring.js'

const makeAdminState = (overrides = {}) => ({
  isAdmin: true,
  overallStatus: 'HEALTHY',
  dependencies: [
    { id: 'db', name: 'Database', status: 'HEALTHY' },
    { id: 'redis', name: 'Redis', status: 'HEALTHY' },
  ],
  metrics: {
    avgResponseMs: 80,
    p95ResponseMs: 120,
    errorRate: 0.01,
    requestsPerMinute: 45,
    uptimePercent: 99.97,
  },
  activeAlerts: [],
  isLoading: false,
  isFetching: false,
  error: null,
  refetchAll: vi.fn(),
  ...overrides,
})

describe('SystemMonitoring page', () => {
  it('shows admin guard message for non-admin users', () => {
    useSystemMonitoring.mockReturnValue({
      isAdmin: false,
    })

    render(<SystemMonitoring />)
    expect(screen.getByText(/admin users only/i)).toBeInTheDocument()
  })

  it('renders dashboard sections for admin users', () => {
    useSystemMonitoring.mockReturnValue(makeAdminState())

    render(<SystemMonitoring />)

    expect(
      screen.getByRole('heading', { name: /system monitoring/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/dependency status/i)).toBeInTheDocument()
    expect(screen.getByText(/performance metrics/i)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /active alerts/i }),
    ).toBeInTheDocument()
  })

  it('displays dependencies in the dependency list', () => {
    useSystemMonitoring.mockReturnValue(makeAdminState())

    render(<SystemMonitoring />)
    expect(screen.getByText('Database')).toBeInTheDocument()
    expect(screen.getByText('Redis')).toBeInTheDocument()
  })

  it('displays performance metric values', () => {
    useSystemMonitoring.mockReturnValue(makeAdminState())

    render(<SystemMonitoring />)
    expect(screen.getByText('80 ms')).toBeInTheDocument()
    expect(screen.getByText('120 ms')).toBeInTheDocument()
    expect(screen.getByText('1.0%')).toBeInTheDocument()
    expect(screen.getByText('99.97%')).toBeInTheDocument()
  })

  it('shows empty alert message when no alerts', () => {
    useSystemMonitoring.mockReturnValue(makeAdminState())

    render(<SystemMonitoring />)
    expect(screen.getByText(/no active alerts/i)).toBeInTheDocument()
  })

  it('renders active alert entries', () => {
    useSystemMonitoring.mockReturnValue(
      makeAdminState({
        activeAlerts: [
          {
            id: 'dep-db',
            level: 'error',
            title: 'Database is DOWN',
            description: 'Connection lost.',
          },
        ],
      }),
    )

    render(<SystemMonitoring />)
    expect(screen.getByText('Database is DOWN')).toBeInTheDocument()
    expect(screen.getByText('Connection lost.')).toBeInTheDocument()
  })

  it('shows error alert when API returns an error', () => {
    useSystemMonitoring.mockReturnValue(
      makeAdminState({ error: { status: 500 } }),
    )

    render(<SystemMonitoring />)
    expect(screen.getByRole('alert')).toHaveTextContent(/unable to load/i)
  })

  it('shows empty dependency message when no data', () => {
    useSystemMonitoring.mockReturnValue(
      makeAdminState({ dependencies: [], isLoading: false }),
    )

    render(<SystemMonitoring />)
    expect(screen.getByText(/no dependency data available/i)).toBeInTheDocument()
  })

  it('calls refetchAll on Refresh button click', async () => {
    const refetchAll = vi.fn()
    useSystemMonitoring.mockReturnValue(makeAdminState({ refetchAll }))

    render(<SystemMonitoring />)
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }))
    expect(refetchAll).toHaveBeenCalledTimes(1)
  })

  it('disables Refresh button while fetching', () => {
    useSystemMonitoring.mockReturnValue(makeAdminState({ isFetching: true }))

    render(<SystemMonitoring />)
    expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled()
  })

  it('renders section label for accessibility', () => {
    useSystemMonitoring.mockReturnValue(makeAdminState())

    render(<SystemMonitoring />)
    expect(
      screen.getByRole('region', { name: /system monitoring/i }),
    ).toBeInTheDocument()
  })
})
