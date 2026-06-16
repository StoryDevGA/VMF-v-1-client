/**
 * SuperAdminDashboard Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SuperAdminDashboard from './SuperAdminDashboard'

vi.mock('../../store/api/auditLogApi.js', () => ({
  useGetAuditStatsQuery: vi.fn(),
}))

vi.mock('../../store/api/customerApi.js', () => ({
  useListCustomersQuery: vi.fn(),
}))

vi.mock('../../store/api/licenseLevelApi.js', () => ({
  useListLicenseLevelsQuery: vi.fn(),
}))

vi.mock('../../store/api/roleApi.js', () => ({
  useListRolesQuery: vi.fn(),
}))

vi.mock('../../store/api/runtimeControlApi.js', () => ({
  useListFrameworkPackagesQuery: vi.fn(),
  useListFrameworkRegistriesQuery: vi.fn(),
  useListRuntimeAgentsQuery: vi.fn(),
  useListRuntimePathsQuery: vi.fn(),
  useListRuntimeSkillsQuery: vi.fn(),
  useListSkillRolesQuery: vi.fn(),
  useListUiContractsQuery: vi.fn(),
  useListValidationRegistryQuery: vi.fn(),
  useListWorkflowPoliciesQuery: vi.fn(),
}))

vi.mock('../../store/api/superAdminAuditApi.js', () => ({
  useListDeniedAccessLogsQuery: vi.fn(),
}))

vi.mock('../../store/api/systemApi.js', () => ({
  useGetSystemHealthQuery: vi.fn(),
}))

import { useGetAuditStatsQuery } from '../../store/api/auditLogApi.js'
import { useListCustomersQuery } from '../../store/api/customerApi.js'
import { useListLicenseLevelsQuery } from '../../store/api/licenseLevelApi.js'
import { useListRolesQuery } from '../../store/api/roleApi.js'
import {
  useListFrameworkPackagesQuery,
  useListFrameworkRegistriesQuery,
  useListRuntimeAgentsQuery,
  useListRuntimePathsQuery,
  useListRuntimeSkillsQuery,
  useListSkillRolesQuery,
  useListUiContractsQuery,
  useListValidationRegistryQuery,
  useListWorkflowPoliciesQuery,
} from '../../store/api/runtimeControlApi.js'
import { useListDeniedAccessLogsQuery } from '../../store/api/superAdminAuditApi.js'
import { useGetSystemHealthQuery } from '../../store/api/systemApi.js'

const listResponse = (total) => ({
  data: [],
  meta: {
    total,
    totalCount: total,
  },
})

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/super-admin/dashboard']}>
      <Routes>
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
      </Routes>
    </MemoryRouter>,
  )
}

function getHeroMetric(label) {
  return screen.getByText(label).closest('.super-admin-dashboard__hero-metric')
}

beforeEach(() => {
  vi.clearAllMocks()

  useGetSystemHealthQuery.mockReturnValue({
    data: { status: 'healthy', uptime: 7200, version: 'test-version' },
    isFetching: false,
    error: null,
  })
  useGetAuditStatsQuery.mockReturnValue({
    data: {
      data: {
        total: 550,
        byAction: [{ _id: 'PACKAGE_VALIDATED', count: 12 }],
        byResourceType: [],
      },
    },
    isFetching: false,
  })
  useListCustomersQuery.mockReturnValue({ data: listResponse(8) })
  useListLicenseLevelsQuery.mockReturnValue({ data: listResponse(4) })
  useListRolesQuery.mockReturnValue({ data: listResponse(6) })
  useListDeniedAccessLogsQuery.mockReturnValue({ data: listResponse(2) })
  useListFrameworkRegistriesQuery.mockReturnValue({ data: listResponse(1) })
  useListRuntimePathsQuery.mockReturnValue({ data: listResponse(199) })
  useListSkillRolesQuery.mockReturnValue({ data: listResponse(14) })
  useListRuntimeSkillsQuery.mockReturnValue({ data: listResponse(36) })
  useListValidationRegistryQuery.mockReturnValue({ data: listResponse(50) })
  useListRuntimeAgentsQuery.mockReturnValue({ data: listResponse(12) })
  useListWorkflowPoliciesQuery.mockReturnValue({ data: listResponse(16) })
  useListFrameworkPackagesQuery.mockReturnValue({ data: listResponse(3) })
  useListUiContractsQuery.mockReturnValue({ data: listResponse(1) })
})

describe('SuperAdminDashboard page', () => {
  it('renders grouped launch sections for super admins', () => {
    renderDashboard()

    expect(screen.getByRole('heading', { name: /super admin workspace/i })).toBeInTheDocument()
    expect(
      screen.getByText(/launch governed customer, runtime, and observability surfaces/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /customer governance/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /runtime control/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /runtime observability/i })).toBeInTheDocument()
    expect(screen.getAllByText('3 available')).toHaveLength(2)
    expect(screen.getAllByText('12 available')).toHaveLength(1)
    expect(within(getHeroMetric('API health')).getByText('Healthy')).toBeInTheDocument()
    expect(within(getHeroMetric('API uptime')).getByText('2h')).toBeInTheDocument()
    expect(within(getHeroMetric('Audit evidence')).getByText('550')).toBeInTheDocument()
    expect(screen.getByText(/top PACKAGE_VALIDATED 12/i)).toBeInTheDocument()
    expect(screen.queryByText(/open now/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /customers.*8.*customers/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /skills.*36.*skills/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /runtime paths.*199.*paths/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /audit logs.*550.*logs/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /customers/i })).toHaveAttribute(
      'href',
      '/super-admin/customers',
    )
    expect(screen.getByRole('link', { name: /licence levels/i })).toHaveAttribute(
      'href',
      '/super-admin/license-levels',
    )
    expect(screen.getByRole('link', { name: /runtime control.*runtime modules/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control',
    )
    expect(screen.getByRole('link', { name: /system versioning/i })).toHaveAttribute(
      'href',
      '/super-admin/system-versioning',
    )
    expect(screen.getByRole('link', { name: /framework packages.*packages/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/framework-packages',
    )
    expect(screen.getByRole('link', { name: /agents.*agents/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/agents',
    )
    expect(screen.getByRole('link', { name: /skills.*skills/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/skills',
    )
    expect(screen.getByRole('link', { name: /workflow policies.*policies/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/workflow-policies',
    )
    expect(screen.getByRole('link', { name: /ui contracts.*contracts/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/ui-contracts',
    )
    expect(screen.getByRole('link', { name: /knowledge packs/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/knowledge-packs',
    )
    expect(screen.getByRole('link', { name: /monitoring/i })).toHaveAttribute(
      'href',
      '/super-admin/system-monitoring',
    )
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument()
  })

  it('uses a compact hero without the old account copy', () => {
    renderDashboard()

    expect(screen.queryByText(/signed in as/i)).not.toBeInTheDocument()
    expect(screen.getByText(/manage customers, invitation workflows/i)).toBeInTheDocument()
    expect(screen.getByText(/manage the live control-plane modules/i)).toBeInTheDocument()
    expect(screen.getByText(/review platform monitoring/i)).toBeInTheDocument()
  })

  it('renders the Runtime Control modules inside the Runtime Control launch section', () => {
    renderDashboard()

    const runtimeControlSection = screen
      .getByRole('heading', { name: /runtime control/i })
      .closest('.super-admin-dashboard__section-card')

    expect(runtimeControlSection).not.toBeNull()
    expect(within(runtimeControlSection).getByRole('link', { name: /runtime control.*runtime modules/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control',
    )
    expect(within(runtimeControlSection).getByRole('link', { name: /framework packages.*packages/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/framework-packages',
    )
    expect(within(runtimeControlSection).getByRole('link', { name: /agents.*agents/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/agents',
    )
    expect(within(runtimeControlSection).getByRole('link', { name: /skills.*skills/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/skills',
    )
    expect(within(runtimeControlSection).getByRole('link', { name: /workflow policies.*policies/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/workflow-policies',
    )
    expect(within(runtimeControlSection).getByRole('link', { name: /ui contracts.*contracts/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/ui-contracts',
    )
    expect(within(runtimeControlSection).getByRole('link', { name: /knowledge packs/i })).toHaveAttribute(
      'href',
      '/super-admin/runtime-control/knowledge-packs',
    )
  })
})
