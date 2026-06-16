import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SuperAdminRuntimeControl from './SuperAdminRuntimeControl'

vi.mock('../../hooks/useAuthorization.js', () => ({
  useAuthorization: vi.fn(),
}))

import { useAuthorization } from '../../hooks/useAuthorization.js'

function renderRuntimeControl() {
  return render(
    <MemoryRouter initialEntries={['/super-admin/runtime-control']}>
      <Routes>
        <Route
          path="/super-admin/runtime-control"
          element={<SuperAdminRuntimeControl />}
        />
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

describe('SuperAdminRuntimeControl page', () => {
  it('renders the Runtime Control dashboard and keeps System Versioning available', () => {
    renderRuntimeControl()

    expect(screen.getByRole('heading', { name: /runtime control/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument()
    expect(screen.getByText(/phase 1b route group/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /current delivery state/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open system versioning/i })).toHaveAttribute(
      'href',
      '/super-admin/system-versioning',
    )
    expect(screen.getByText('/super-admin/system-versioning')).toBeInTheDocument()
  })

  it('shows all nine catalogue modules as live Runtime Control surfaces', () => {
    renderRuntimeControl()

    expect(screen.getByRole('heading', { name: /phase 1b catalogue surfaces/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /framework registry/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /framework packages/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^agents$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^skills$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /runtime paths/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /skill roles/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /workflow policies/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /ui contracts/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /knowledge packs/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open framework registry/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/framework-registry',
    )
    expect(screen.getByRole('link', { name: /open framework packages/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/framework-packages',
    )
    expect(screen.getByRole('link', { name: /open agents/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/agents',
    )
    expect(screen.getByRole('link', { name: /open skills/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/skills',
    )
    expect(screen.getByRole('link', { name: /open runtime paths/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/runtime-paths',
    )
    expect(screen.getByRole('link', { name: /open skill roles/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/skill-roles',
    )
    expect(screen.getByRole('link', { name: /open workflow policies/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/workflow-policies',
    )
    expect(screen.getByRole('link', { name: /open ui contracts/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/ui-contracts',
    )
    expect(screen.getByRole('link', { name: /open knowledge packs/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/knowledge-packs',
    )
  })
})
