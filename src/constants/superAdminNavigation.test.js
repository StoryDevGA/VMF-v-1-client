import { describe, expect, it } from 'vitest'
import {
  getSuperAdminDashboardGroups,
  getLegacySuperAdminNavigationEntries,
  getPhase1aSuperAdminNavigationEntries,
  getSuperAdminRoute,
} from './superAdminNavigation.js'

describe('superAdminNavigation', () => {
  it('keeps the legacy super-admin navigation grouped in the current order', () => {
    const entries = getLegacySuperAdminNavigationEntries()

    expect(entries.map((entry) => entry.key)).toEqual([
      'system-admin',
      'customer-admin',
      'system-health',
    ])
    expect(entries[0].label).toBe('System Admin')
    expect(entries[0].links.map((link) => link.label)).toEqual([
      'Versioning',
      'Licence Maintenance',
      'Role Definitions',
    ])
    expect(entries[1]).toMatchObject({
      type: 'link',
      key: 'customer-admin',
      label: 'Customer Admin',
      to: '/super-admin/customers',
    })
    expect(entries[2].label).toBe('System Health')
    expect(entries[2].links.map((link) => link.label)).toEqual([
      'Monitoring',
      'Audit Logs',
      'Denied Access',
    ])
  })

  it('locks the Phase 1A taxonomy without surfacing invitations as a primary nav item', () => {
    const entries = getPhase1aSuperAdminNavigationEntries()

    expect(entries.map((entry) => entry.label)).toEqual([
      'Customer Governance',
      'Runtime Control',
      'Runtime Observability',
    ])
    expect(entries[0].links.map((link) => link.label)).toEqual([
      'Customers',
      'Licence Levels',
      'Roles and Permissions',
    ])
    expect(entries[1].links.map((link) => link.label)).toEqual([
      'Runtime Control',
      'System Versioning',
      'Framework Registry',
      'Framework Packages',
      'Agents',
      'Skills',
      'Workflow Policies',
    ])
    expect(entries[2].links.map((link) => link.label)).toEqual([
      'Monitoring',
      'Audit Logs',
      'Denied Access Logs',
    ])
    expect(
      entries.flatMap((entry) => entry.links ?? []).find((link) => link.key === 'invitations'),
    ).toBeUndefined()
  })

  it('stores compatibility and future-phase route metadata in the shared catalog', () => {
    expect(getSuperAdminRoute('invitations')).toMatchObject({
      key: 'invitations',
      to: '/super-admin/customers?view=invitations',
      compatibilityPath: '/super-admin/invitations',
      isCompatibilityOnly: true,
    })

    expect(getSuperAdminRoute('runtimeControl')).toMatchObject({
      key: 'runtime-control',
      to: '/super-admin/runtime-control',
      availability: 'phase-1b',
    })
  })

  it('provides grouped dashboard launch metadata for the live Super Admin dashboard', () => {
    const groups = getSuperAdminDashboardGroups()

    expect(groups.map((group) => group.label)).toEqual([
      'Customer Governance',
      'Runtime Control',
      'Runtime Observability',
    ])
    expect(groups[0].activeLinks.map((link) => link.label)).toEqual([
      'Customers',
      'Licence Levels',
      'Roles and Permissions',
    ])
    expect(groups[1].activeLinks.map((link) => link.label)).toEqual([
      'Runtime Control',
      'System Versioning',
      'Framework Registry',
      'Framework Packages',
      'Agents',
      'Skills',
      'Workflow Policies',
    ])
    expect(groups[1].upcomingLinks.map((link) => link.label)).toEqual([])
  })
})
