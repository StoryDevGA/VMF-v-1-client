/**
 * SuperAdminDashboard Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
  it('renders grouped launch cards for super admins', () => {
    renderDashboard()

    expect(screen.getByRole('heading', { name: /super admin workspace/i })).toBeInTheDocument()
    expect(screen.getByText(/phased launch surface/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /customer governance/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /runtime control/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /runtime observability/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /customers/i })).toHaveAttribute(
      'href',
      '/super-admin/customers',
    )
    expect(screen.getByRole('link', { name: /licence levels/i })).toHaveAttribute(
      'href',
      '/super-admin/license-levels',
    )
    expect(screen.getByRole('link', { name: /runtime control open now/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control',
    )
    expect(screen.getByRole('link', { name: /system versioning/i })).toHaveAttribute(
      'href',
      '/super-admin/system-versioning',
    )
    expect(screen.getByRole('link', { name: /framework packages open now/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/framework-packages',
    )
    expect(screen.getByRole('link', { name: /agents open now/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/agents',
    )
    expect(screen.getByRole('link', { name: /skills open now/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/skills',
    )
    expect(screen.getByRole('link', { name: /workflow policies open now/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/workflow-policies',
    )
    expect(screen.getByRole('link', { name: /ui contracts open now/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/ui-contracts',
    )
    expect(screen.getByRole('link', { name: /monitoring/i })).toHaveAttribute(
      'href',
      '/super-admin/system-monitoring',
    )
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument()
  })

  it('shows the signed-in super-admin identity', () => {
    renderDashboard()

    expect(screen.getByText('Super Admin')).toBeInTheDocument()
    expect(screen.getByText(/signed in as/i)).toBeInTheDocument()
  })

  it('shows the current rollout note and staged Runtime Control modules', () => {
    renderDashboard()

    const runtimeControlCard = screen
      .getByRole('heading', { name: /runtime control/i })
      .closest('.super-admin-dashboard__group-card')

    expect(runtimeControlCard).not.toBeNull()
    expect(screen.getByRole('heading', { name: /current rollout/i })).toBeInTheDocument()
    expect(screen.getByText(/runtime control now has a dedicated dashboard/i)).toBeInTheDocument()
    expect(within(runtimeControlCard).getByRole('link', { name: /runtime control open now/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control',
    )
    expect(within(runtimeControlCard).getByRole('link', { name: /framework packages open now/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/framework-packages',
    )
    expect(within(runtimeControlCard).getByRole('link', { name: /agents open now/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/agents',
    )
    expect(within(runtimeControlCard).getByRole('link', { name: /skills open now/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/skills',
    )
    expect(within(runtimeControlCard).getByRole('link', { name: /workflow policies open now/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/workflow-policies',
    )
    expect(within(runtimeControlCard).getByRole('link', { name: /ui contracts open now/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/ui-contracts',
    )
  })
})
