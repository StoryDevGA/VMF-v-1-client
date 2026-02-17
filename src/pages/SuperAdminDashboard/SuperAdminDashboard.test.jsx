/**
 * SuperAdminDashboard Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SuperAdminDashboard from './SuperAdminDashboard'

vi.mock('../../hooks/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../hooks/useAuthorization.js', () => ({
  useAuthorization: vi.fn(),
}))

import { useAuth } from '../../hooks/useAuth.js'
import { useAuthorization } from '../../hooks/useAuthorization.js'

const mockLogout = vi.fn().mockResolvedValue(undefined)

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/super-admin/dashboard']}>
      <Routes>
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/login" element={<div>Super Admin Login</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  useAuthorization.mockReturnValue({
    user: { id: 'sa-1', name: 'Super Admin' },
  })

  useAuth.mockReturnValue({
    logout: mockLogout,
    logoutResult: { isLoading: false },
  })
})

describe('SuperAdminDashboard page', () => {
  it('renders the dashboard heading and primary action links', () => {
    renderDashboard()

    expect(
      screen.getByRole('heading', { name: /super admin dashboard/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /open customer console/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /open platform monitoring/i }),
    ).toBeInTheDocument()
  })

  it('shows the signed-in super-admin identity', () => {
    renderDashboard()
    expect(screen.getByText('Super Admin')).toBeInTheDocument()
    expect(screen.getByText(/signed in as/i)).toBeInTheDocument()
  })

  it('orders quick links as Customers, Monitoring, Help Center', () => {
    renderDashboard()

    const quickLinksCard = screen
      .getByRole('heading', { name: /^quick links$/i })
      .closest('.card')

    if (!quickLinksCard) {
      throw new Error('Quick links card not found')
    }

    const quickLinks = within(quickLinksCard).getAllByRole('link')
    expect(quickLinks.map((link) => link.textContent?.trim())).toEqual([
      'Customers',
      'Monitoring',
      'Help Center',
    ])
  })

  it('logs out and navigates to super-admin login', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await user.click(screen.getByRole('button', { name: /sign out/i }))
    expect(mockLogout).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      expect(screen.getByText('Super Admin Login')).toBeInTheDocument()
    })
  })
})
