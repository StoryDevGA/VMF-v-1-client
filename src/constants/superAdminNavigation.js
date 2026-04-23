export const SUPER_ADMIN_NAV_MODES = Object.freeze({
  LEGACY: 'legacy',
  PHASE_1A: 'phase-1a',
})

export const SUPER_ADMIN_ROUTE_PHASES = Object.freeze({
  PHASE_1A: 'phase-1a',
  PHASE_1B: 'phase-1b',
})

export const SUPER_ADMIN_GROUP_LABELS = Object.freeze({
  [SUPER_ADMIN_NAV_MODES.LEGACY]: Object.freeze({
    systemAdmin: 'System Admin',
    customerAdmin: 'Customer Admin',
    systemHealth: 'System Health',
  }),
  [SUPER_ADMIN_NAV_MODES.PHASE_1A]: Object.freeze({
    customerGovernance: 'Customer Governance',
    runtimeControl: 'Runtime Control',
    runtimeObservability: 'Runtime Observability',
  }),
})

const ENABLED_FLAG_VALUES = new Set(['1', 'true', 'yes', 'on'])

export function isSuperAdminRuntimeControlEnabled() {
  const rawFlag = import.meta.env.VITE_ENABLE_SUPER_ADMIN_RUNTIME_CONTROL

  if (rawFlag === undefined || rawFlag === null || String(rawFlag).trim() === '') {
    return true
  }

  return ENABLED_FLAG_VALUES.has(String(rawFlag).trim().toLowerCase())
}

const PHASE_1A_GROUP_ROUTE_KEYS = Object.freeze({
  'customer-governance': Object.freeze(['customers', 'licenseLevels', 'roles']),
  'runtime-control': Object.freeze(['systemVersioning']),
  'runtime-observability': Object.freeze(['systemMonitoring', 'auditLogs', 'deniedAccessLogs']),
})

const PHASE_1B_GROUP_ROUTE_KEYS = Object.freeze({
  'runtime-control': Object.freeze(['frameworkRegistry', 'runtimePaths', 'skillRoles', 'skills', 'validationRegistry', 'agents', 'workflowPolicies', 'frameworkPackages']),
})

const ENABLED_RUNTIME_CONTROL_MODULE_ROUTE_KEYS = Object.freeze([
  'frameworkRegistry',
  'runtimePaths',
  'skillRoles',
  'skills',
  'validationRegistry',
  'agents',
  'workflowPolicies',
  'frameworkPackages',
])

const SUPER_ADMIN_DASHBOARD_GROUP_CATALOG = Object.freeze({
  'customer-governance': Object.freeze({
    key: 'customer-governance',
    label: SUPER_ADMIN_GROUP_LABELS[SUPER_ADMIN_NAV_MODES.PHASE_1A].customerGovernance,
    description: 'Manage customers, invitation workflows, licence levels, and role governance.',
    status: Object.freeze({
      label: 'Available now',
      variant: 'success',
    }),
    activeRouteKeys: PHASE_1A_GROUP_ROUTE_KEYS['customer-governance'],
    upcomingRouteKeys: Object.freeze([]),
    upcomingTitle: '',
    helperCopy: '',
  }),
  'runtime-observability': Object.freeze({
    key: 'runtime-observability',
    label: SUPER_ADMIN_GROUP_LABELS[SUPER_ADMIN_NAV_MODES.PHASE_1A].runtimeObservability,
    description: 'Review platform monitoring, audit history, and denied-access oversight signals.',
    status: Object.freeze({
      label: 'Available now',
      variant: 'success',
    }),
    activeRouteKeys: PHASE_1A_GROUP_ROUTE_KEYS['runtime-observability'],
    upcomingRouteKeys: Object.freeze([]),
    upcomingTitle: '',
    helperCopy: '',
  }),
})

export const SUPER_ADMIN_ROUTE_CATALOG = Object.freeze({
  customers: Object.freeze({
    key: 'customers',
    to: '/super-admin/customers',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1A,
    labels: Object.freeze({
      canonical: 'Customers',
      legacyNav: 'Customers',
      phase1aNav: 'Customers',
      guidance: 'customers',
    }),
  }),
  invitations: Object.freeze({
    key: 'invitations',
    to: '/super-admin/customers?view=invitations',
    compatibilityPath: '/super-admin/invitations',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1A,
    isCompatibilityOnly: true,
    labels: Object.freeze({
      canonical: 'Invitations',
      legacyNav: 'Invitations',
      phase1aNav: 'Invitations',
      guidance: 'invitations',
    }),
  }),
  licenseLevels: Object.freeze({
    key: 'license-levels',
    to: '/super-admin/license-levels',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1A,
    labels: Object.freeze({
      canonical: 'Licence Levels',
      legacyNav: 'Licence Maintenance',
      phase1aNav: 'Licence Levels',
      guidance: 'licence maintenance',
    }),
  }),
  roles: Object.freeze({
    key: 'roles',
    to: '/super-admin/roles',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1A,
    labels: Object.freeze({
      canonical: 'Roles and Permissions',
      legacyNav: 'Role Definitions',
      phase1aNav: 'Roles and Permissions',
      guidance: 'roles and permissions',
    }),
  }),
  systemVersioning: Object.freeze({
    key: 'system-versioning',
    to: '/super-admin/system-versioning',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1A,
    labels: Object.freeze({
      canonical: 'System Versioning',
      legacyNav: 'Versioning',
      phase1aNav: 'System Versioning',
      futureNav: 'Version Rollout and Migration',
      guidance: 'versioning',
    }),
  }),
  systemMonitoring: Object.freeze({
    key: 'system-monitoring',
    to: '/super-admin/system-monitoring',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1A,
    labels: Object.freeze({
      canonical: 'Monitoring',
      legacyNav: 'Monitoring',
      phase1aNav: 'Monitoring',
      guidance: 'monitoring',
    }),
  }),
  auditLogs: Object.freeze({
    key: 'audit-logs',
    to: '/super-admin/audit-logs',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1A,
    labels: Object.freeze({
      canonical: 'Audit Logs',
      legacyNav: 'Audit Logs',
      phase1aNav: 'Audit Logs',
      guidance: 'audit',
    }),
  }),
  deniedAccessLogs: Object.freeze({
    key: 'denied-access-logs',
    to: '/super-admin/denied-access-logs',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1A,
    labels: Object.freeze({
      canonical: 'Denied Access Logs',
      legacyNav: 'Denied Access',
      phase1aNav: 'Denied Access Logs',
      guidance: 'denied-access',
    }),
  }),
  runtimeControl: Object.freeze({
    key: 'runtime-control',
    to: '/super-admin/runtime-control',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1B,
    labels: Object.freeze({
      canonical: 'Runtime Control',
      legacyNav: 'Runtime Control',
      phase1aNav: 'Runtime Control',
      guidance: 'runtime control',
    }),
  }),
  frameworkRegistry: Object.freeze({
    key: 'framework-registry',
    to: '/super-admin/runtime-control/framework-registry',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1B,
    labels: Object.freeze({
      canonical: 'Framework Registry',
      legacyNav: 'Framework Registry',
      phase1aNav: 'Framework Registry',
    }),
  }),
  frameworkPackages: Object.freeze({
    key: 'framework-packages',
    to: '/super-admin/runtime-control/framework-packages',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1B,
    labels: Object.freeze({
      canonical: 'Framework Packages',
      legacyNav: 'Framework Packages',
      phase1aNav: 'Framework Packages',
    }),
  }),
  agents: Object.freeze({
    key: 'agents',
    to: '/super-admin/runtime-control/agents',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1B,
    labels: Object.freeze({
      canonical: 'Agents',
      legacyNav: 'Agents',
      phase1aNav: 'Agents',
    }),
  }),
  skills: Object.freeze({
    key: 'skills',
    to: '/super-admin/runtime-control/skills',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1B,
    labels: Object.freeze({
      canonical: 'Skills',
      legacyNav: 'Skills',
      phase1aNav: 'Skills',
    }),
  }),
  validationRegistry: Object.freeze({
    key: 'validation-registry',
    to: '/super-admin/runtime-control/validation-registry',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1B,
    labels: Object.freeze({
      canonical: 'Validation Registry',
      legacyNav: 'Validation Registry',
      phase1aNav: 'Validation Registry',
    }),
  }),
  runtimePaths: Object.freeze({
    key: 'runtime-paths',
    to: '/super-admin/runtime-control/runtime-paths',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1B,
    labels: Object.freeze({
      canonical: 'Runtime Paths',
      legacyNav: 'Runtime Paths',
      phase1aNav: 'Runtime Paths',
    }),
  }),
  skillRoles: Object.freeze({
    key: 'skill-roles',
    to: '/super-admin/runtime-control/skill-roles',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1B,
    labels: Object.freeze({
      canonical: 'Skill Roles',
      legacyNav: 'Skill Roles',
      phase1aNav: 'Skill Roles',
    }),
  }),
  workflowPolicies: Object.freeze({
    key: 'workflow-policies',
    to: '/super-admin/runtime-control/workflow-policies',
    availability: SUPER_ADMIN_ROUTE_PHASES.PHASE_1B,
    labels: Object.freeze({
      canonical: 'Workflow Policies',
      legacyNav: 'Workflow Policies',
      phase1aNav: 'Workflow Policies',
    }),
  }),
})

export function getEnabledRuntimeControlModuleRouteKeys() {
  if (!isSuperAdminRuntimeControlEnabled()) {
    return []
  }

  return [...ENABLED_RUNTIME_CONTROL_MODULE_ROUTE_KEYS]
}

function getPlannedRuntimeControlModuleRouteKeys() {
  const enabledRouteKeys = new Set(getEnabledRuntimeControlModuleRouteKeys())

  return PHASE_1B_GROUP_ROUTE_KEYS['runtime-control'].filter(
    (routeKey) => !enabledRouteKeys.has(routeKey),
  )
}

function resolveRouteLabel(route, labelVariant) {
  return route.labels[labelVariant] ?? route.labels.canonical
}

function buildRoute(routeKey, labelVariant) {
  const route = SUPER_ADMIN_ROUTE_CATALOG[routeKey]

  if (!route) {
    throw new Error(`Unknown Super Admin route key: ${routeKey}`)
  }

  return {
    key: route.key,
    label: resolveRouteLabel(route, labelVariant),
    canonicalLabel: route.labels.canonical,
    to: route.to,
    availability: route.availability,
    compatibilityPath: route.compatibilityPath ?? null,
    isCompatibilityOnly: route.isCompatibilityOnly ?? false,
    futureLabel: route.labels.futureNav ?? null,
  }
}

export function getSuperAdminRoute(routeKey, { labelVariant = 'canonical' } = {}) {
  return buildRoute(routeKey, labelVariant)
}

export function getSuperAdminRoutes(routeKeys, options) {
  return routeKeys.map((routeKey) => getSuperAdminRoute(routeKey, options))
}

export function getLegacySuperAdminNavigationEntries() {
  return [
    {
      type: 'group',
      key: 'system-admin',
      label: SUPER_ADMIN_GROUP_LABELS[SUPER_ADMIN_NAV_MODES.LEGACY].systemAdmin,
      links: getSuperAdminRoutes(['systemVersioning', 'licenseLevels', 'roles'], {
        labelVariant: 'legacyNav',
      }),
    },
    {
      type: 'link',
      key: 'customer-admin',
      label: SUPER_ADMIN_GROUP_LABELS[SUPER_ADMIN_NAV_MODES.LEGACY].customerAdmin,
      to: getSuperAdminRoute('customers').to,
    },
    {
      type: 'group',
      key: 'system-health',
      label: SUPER_ADMIN_GROUP_LABELS[SUPER_ADMIN_NAV_MODES.LEGACY].systemHealth,
      links: getSuperAdminRoutes(['systemMonitoring', 'auditLogs', 'deniedAccessLogs'], {
        labelVariant: 'legacyNav',
      }),
    },
  ]
}

export function getPhase1aSuperAdminNavigationEntries({ includePhase1bRoutes = false } = {}) {
  const runtimeControlLinks = getSuperAdminRoutes(
    [
      ...getEnabledRuntimeControlModuleRouteKeys(),
    ],
    {
      labelVariant: 'phase1aNav',
    },
  )

  if (includePhase1bRoutes) {
    runtimeControlLinks.push(
      ...getSuperAdminRoutes(getPlannedRuntimeControlModuleRouteKeys(), {
        labelVariant: 'phase1aNav',
      }),
    )
  }

  return [
    {
      type: 'group',
      key: 'customer-governance',
      label: SUPER_ADMIN_GROUP_LABELS[SUPER_ADMIN_NAV_MODES.PHASE_1A].customerGovernance,
      links: getSuperAdminRoutes(PHASE_1A_GROUP_ROUTE_KEYS['customer-governance'], {
        labelVariant: 'phase1aNav',
      }),
    },
    {
      type: 'group',
      key: 'runtime-control',
      label: SUPER_ADMIN_GROUP_LABELS[SUPER_ADMIN_NAV_MODES.PHASE_1A].runtimeControl,
      links: runtimeControlLinks,
    },
    {
      type: 'group',
      key: 'runtime-observability',
      label: SUPER_ADMIN_GROUP_LABELS[SUPER_ADMIN_NAV_MODES.PHASE_1A].runtimeObservability,
      links: getSuperAdminRoutes(PHASE_1A_GROUP_ROUTE_KEYS['runtime-observability'], {
        labelVariant: 'phase1aNav',
      }),
    },
  ]
}

function buildRuntimeControlDashboardGroup() {
  const runtimeControlEnabled = isSuperAdminRuntimeControlEnabled()
  const enabledModuleRouteKeys = getEnabledRuntimeControlModuleRouteKeys()
  const plannedModuleRouteKeys = getPlannedRuntimeControlModuleRouteKeys()
  const hasPlannedModuleRouteKeys = plannedModuleRouteKeys.length > 0

  return {
    key: 'runtime-control',
    label: SUPER_ADMIN_GROUP_LABELS[SUPER_ADMIN_NAV_MODES.PHASE_1A].runtimeControl,
    description: runtimeControlEnabled
      ? hasPlannedModuleRouteKeys
        ? 'Launch the Runtime Control dashboard, keep System Versioning stable, and stage the first control-plane modules.'
        : 'Launch the Runtime Control dashboard, keep System Versioning stable, and manage the live control-plane modules.'
      : 'Control platform runtime configuration through the current versioning bridge and the next runtime-control modules.',
    status: runtimeControlEnabled
      ? {
          label: 'Dashboard live',
          variant: 'info',
        }
      : {
          label: 'Phase 1B pending',
          variant: 'warning',
        },
    activeRouteKeys: runtimeControlEnabled
      ? ['runtimeControl', ...PHASE_1A_GROUP_ROUTE_KEYS['runtime-control'], ...enabledModuleRouteKeys]
      : [...PHASE_1A_GROUP_ROUTE_KEYS['runtime-control']],
    upcomingRouteKeys: plannedModuleRouteKeys,
    upcomingTitle: runtimeControlEnabled
      ? hasPlannedModuleRouteKeys
        ? 'Next module surfaces'
        : ''
      : 'Planned next',
    helperCopy: runtimeControlEnabled
      ? hasPlannedModuleRouteKeys
        ? 'Framework Registry, Runtime Paths, Skill Roles, Skills, Agents, Workflow Policies, and Framework Packages are now live from the Runtime Control dashboard.'
        : 'All Runtime Control catalogue surfaces are now live.'
      : 'Framework Registry, Runtime Paths, Skill Roles, Skills, Agents, Workflow Policies, and Framework Packages stay queued until the Runtime Control route group is enabled.',
  }
}

export function getSuperAdminDashboardGroups() {
  return [
    SUPER_ADMIN_DASHBOARD_GROUP_CATALOG['customer-governance'],
    buildRuntimeControlDashboardGroup(),
    SUPER_ADMIN_DASHBOARD_GROUP_CATALOG['runtime-observability'],
  ].map((group) => ({
    key: group.key,
    label: group.label,
    description: group.description,
    status: group.status,
    activeLinks: getSuperAdminRoutes(group.activeRouteKeys),
    upcomingLinks: getSuperAdminRoutes(group.upcomingRouteKeys),
    upcomingTitle: group.upcomingTitle,
    helperCopy: group.helperCopy,
  }))
}
