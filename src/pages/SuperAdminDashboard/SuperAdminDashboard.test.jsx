/**
 * SuperAdminDashboard Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SuperAdminDashboard from './SuperAdminDashboard'

vi.mock('../../hooks/useAuthorization.js', () => ({
  useAuthorization: vi.fn(),
}))

import { useAuthorization } from '../../hooks/useAuthorization.js'

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/super-admin/dashboard']}>
      <Routes>
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  useAuthorization.mockReturnValue({
    user: { id: 'sa-1', name: 'Super Admin' },
  })
})

describe('SuperAdminDashboard page', () => {
  it('renders a minimal holding page for super admins', () => {
    renderDashboard()

    expect(screen.getByRole('heading', { name: /super admin workspace/i })).toBeInTheDocument()
    expect(screen.getByText(/future modules in progress/i)).toBeInTheDocument()
    expect(screen.getByText(/use the main navigation for customers, licence maintenance, versioning, monitoring, audit, and denied-access workflows/i)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument()
  })

  it('shows the signed-in super-admin identity', () => {
    renderDashboard()

    expect(screen.getByText('Super Admin')).toBeInTheDocument()
    expect(screen.getByText(/signed in as/i)).toBeInTheDocument()
  })

  it('renders the platform summary and planned modules panels', () => {
    renderDashboard()

    expect(screen.getByRole('heading', { name: /current session/i })).toBeInTheDocument()
    expect(screen.getByText('Platform-wide')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /planned dashboard modules/i })).toBeInTheDocument()
    expect(screen.getByText(/platform snapshot/i)).toBeInTheDocument()
    expect(screen.getByText(/security attention queue/i)).toBeInTheDocument()
  })
})
