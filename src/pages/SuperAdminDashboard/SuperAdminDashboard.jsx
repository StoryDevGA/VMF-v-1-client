/**
 * Super Admin Dashboard Page
 *
 * Grouped launch surface for SUPER_ADMIN users.
 */

import { useMemo } from 'react'
import {
  MdAltRoute,
  MdAssignmentTurnedIn,
  MdBadge,
  MdBlock,
  MdDashboard,
  MdDataObject,
  MdFactCheck,
  MdHistory,
  MdHub,
  MdInventory2,
  MdMonitorHeart,
  MdOutlineAdminPanelSettings,
  MdOutlineSecurity,
  MdPeople,
  MdPolicy,
  MdPsychology,
  MdSmartToy,
  MdTune,
  MdWorkspacePremium,
} from 'react-icons/md'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Link } from '../../components/Link'
import { Status } from '../../components/Status'
import { getSuperAdminDashboardGroups } from '../../constants/superAdminNavigation.js'
import { useGetAuditStatsQuery } from '../../store/api/auditLogApi.js'
import { useListCustomersQuery } from '../../store/api/customerApi.js'
import { useListLicenseLevelsQuery } from '../../store/api/licenseLevelApi.js'
import { useListOutcomeKnowledgePacksQuery } from '../../store/api/outcomeKnowledgePacksApi.js'
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
import {
  DASHBOARD_COUNT_QUERY,
  DASHBOARD_COUNT_QUERY_OPTIONS,
  formatNumber,
  formatTokenLabel,
  formatUptime,
  getLaunchInsight,
  getResponseTotal,
  getStatusVariant,
} from './SuperAdminDashboard.utils.js'
import './SuperAdminDashboard.css'

const GROUP_ICON_MAP = {
  'customer-governance': MdOutlineSecurity,
  'runtime-control': MdTune,
  'runtime-observability': MdMonitorHeart,
}

const LINK_ICON_MAP = {
  customers: MdPeople,
  'license-levels': MdWorkspacePremium,
  roles: MdBadge,
  'system-versioning': MdDataObject,
  'system-monitoring': MdMonitorHeart,
  'audit-logs': MdHistory,
  'denied-access-logs': MdBlock,
  'runtime-control': MdDashboard,
  'framework-registry': MdHub,
  'runtime-paths': MdAltRoute,
  'skill-roles': MdOutlineSecurity,
  skills: MdPsychology,
  'validation-registry': MdFactCheck,
  agents: MdSmartToy,
  'workflow-policies': MdPolicy,
  'framework-packages': MdInventory2,
  'ui-contracts': MdAssignmentTurnedIn,
}

function getHealthSignal({ healthData, isFetching, error }) {
  const healthStatus = String(healthData?.status ?? '').trim().toLowerCase()
  const value = error
    ? 'Unavailable'
    : healthStatus
      ? formatTokenLabel(healthStatus)
      : isFetching
        ? 'Checking'
        : 'Unknown'

  return {
    key: 'api-health',
    label: 'API health',
    icon: MdMonitorHeart,
    value,
    variant: error ? 'error' : getStatusVariant(healthStatus),
    meta: isFetching ? 'Refreshing health' : 'Live health endpoint',
  }
}

function getUptimeSignal({ healthData }) {
  return {
    key: 'api-uptime',
    label: 'API uptime',
    icon: MdOutlineAdminPanelSettings,
    value: formatUptime(healthData?.uptime),
    meta: healthData?.version ? `Version ${healthData.version}` : 'Service runtime',
  }
}

function getAuditSignal({ auditStats, isFetching }) {
  const topAction = auditStats?.byAction?.[0]
  const topActionLabel = topAction?._id
    ? `${String(topAction._id)} ${formatNumber(topAction.count)}`
    : 'No top event yet'

  return {
    key: 'audit-evidence',
    label: 'Audit evidence',
    icon: MdHistory,
    value: formatNumber(auditStats?.total),
    meta: isFetching ? 'Refreshing stats' : `Top ${topActionLabel}`,
  }
}

function DashboardHeroSignal({ signal }) {
  const SignalIcon = signal.icon

  return (
    <div className="super-admin-dashboard__hero-metric super-admin-dashboard__hero-metric--signal">
      <dt>
        <span className="super-admin-dashboard__hero-metric-icon" aria-hidden="true">
          <SignalIcon />
        </span>
        <span>{signal.label}</span>
      </dt>
      <dd>
        {signal.variant ? (
          <Status variant={signal.variant} size="sm" showIcon>
            {signal.value}
          </Status>
        ) : (
          <span className="super-admin-dashboard__hero-metric-value">{signal.value}</span>
        )}
        <span className="super-admin-dashboard__hero-metric-meta">{signal.meta}</span>
      </dd>
    </div>
  )
}

function LaunchInsight({ insight }) {
  if (!insight) {
    return null
  }

  if (insight.type === 'status') {
    return (
      <Status variant={insight.variant} size="sm" showIcon className="super-admin-dashboard__launch-status">
        {insight.value}
      </Status>
    )
  }

  return (
    <Badge
      variant={insight.variant}
      size="sm"
      pill
      outline
      className="super-admin-dashboard__launch-badge"
    >
      {insight.value}
    </Badge>
  )
}

function DashboardLaunchLink({
  groupIcon,
  link,
  counts,
  healthData,
  healthError,
  isRuntimeControlEnabled,
}) {
  const LinkIcon = LINK_ICON_MAP[link.key] ?? groupIcon
  const insight = getLaunchInsight({
    link,
    counts,
    healthData,
    healthError,
    isRuntimeControlEnabled,
  })

  return (
    <li className="super-admin-dashboard__launch-item">
      <Link
        to={link.to}
        className="super-admin-dashboard__launch-link"
        variant="subtle"
        underline="none"
      >
        <span className="super-admin-dashboard__launch-icon" aria-hidden="true">
          <LinkIcon />
        </span>
        <span className="super-admin-dashboard__launch-copy">
          <span className="super-admin-dashboard__launch-heading">
            <span className="super-admin-dashboard__launch-label">{link.label}</span>
            <LaunchInsight insight={insight} />
          </span>
          {insight?.meta ? (
            <span className="super-admin-dashboard__launch-meta">{insight.meta}</span>
          ) : null}
        </span>
      </Link>
    </li>
  )
}

function DashboardGroupSection({ group, counts, healthData, healthError }) {
  const GroupIcon = GROUP_ICON_MAP[group.key] ?? MdOutlineAdminPanelSettings
  const isRuntimeControlEnabled = group.key === 'runtime-control'
    && group.activeLinks.some((link) => link.key === 'runtime-control')

  return (
    <Card
      variant="default"
      className={`super-admin-dashboard__section-card super-admin-dashboard__section-card--${group.key}`}
      role="listitem"
    >
      <Card.Body className="super-admin-dashboard__section-body">
        <div className="super-admin-dashboard__section-summary">
          <div className="super-admin-dashboard__section-meta">
            <span className="super-admin-dashboard__section-icon" aria-hidden="true">
              <GroupIcon />
            </span>
            <Badge variant="info" size="sm" pill outline>
              {group.activeLinks.length} available
            </Badge>
            <Status variant={group.status.variant} size="sm" showIcon>
              {group.status.label}
            </Status>
          </div>

          <div className="super-admin-dashboard__section-copy">
            <h2 className="super-admin-dashboard__section-title">{group.label}</h2>
            <p className="super-admin-dashboard__section-description">{group.description}</p>
          </div>
        </div>

        <nav className="super-admin-dashboard__launch-panel" aria-label={`${group.label} launch links`}>
          <ul
            className={`super-admin-dashboard__launch-grid super-admin-dashboard__launch-grid--${group.key}`}
          >
            {group.activeLinks.map((link) => (
              <DashboardLaunchLink
                key={link.key}
                groupIcon={GroupIcon}
                link={link}
                counts={counts}
                healthData={healthData}
                healthError={healthError}
                isRuntimeControlEnabled={isRuntimeControlEnabled}
              />
            ))}
          </ul>
        </nav>
      </Card.Body>
    </Card>
  )
}

function SuperAdminDashboard() {
  const dashboardGroups = useMemo(() => getSuperAdminDashboardGroups(), [])
  const {
    data: healthResponse,
    isFetching: isHealthFetching,
    error: healthError,
  } = useGetSystemHealthQuery(undefined, { refetchOnMountOrArgChange: true })
  const {
    data: auditStatsResponse,
    isFetching: isAuditStatsFetching,
  } = useGetAuditStatsQuery(undefined, { refetchOnMountOrArgChange: true })
  const { data: customerResponse } = useListCustomersQuery(DASHBOARD_COUNT_QUERY, DASHBOARD_COUNT_QUERY_OPTIONS)
  const { data: licenseLevelResponse } = useListLicenseLevelsQuery(DASHBOARD_COUNT_QUERY, DASHBOARD_COUNT_QUERY_OPTIONS)
  const { data: roleResponse } = useListRolesQuery(DASHBOARD_COUNT_QUERY, DASHBOARD_COUNT_QUERY_OPTIONS)
  const { data: deniedAccessResponse } = useListDeniedAccessLogsQuery(DASHBOARD_COUNT_QUERY, DASHBOARD_COUNT_QUERY_OPTIONS)
  const { data: frameworkRegistryResponse } = useListFrameworkRegistriesQuery(DASHBOARD_COUNT_QUERY, DASHBOARD_COUNT_QUERY_OPTIONS)
  const { data: runtimePathResponse } = useListRuntimePathsQuery(DASHBOARD_COUNT_QUERY, DASHBOARD_COUNT_QUERY_OPTIONS)
  const { data: skillRoleResponse } = useListSkillRolesQuery(DASHBOARD_COUNT_QUERY, DASHBOARD_COUNT_QUERY_OPTIONS)
  const { data: runtimeSkillResponse } = useListRuntimeSkillsQuery(DASHBOARD_COUNT_QUERY, DASHBOARD_COUNT_QUERY_OPTIONS)
  const { data: validationRegistryResponse } = useListValidationRegistryQuery(DASHBOARD_COUNT_QUERY, DASHBOARD_COUNT_QUERY_OPTIONS)
  const { data: runtimeAgentResponse } = useListRuntimeAgentsQuery(DASHBOARD_COUNT_QUERY, DASHBOARD_COUNT_QUERY_OPTIONS)
  const { data: workflowPolicyResponse } = useListWorkflowPoliciesQuery(DASHBOARD_COUNT_QUERY, DASHBOARD_COUNT_QUERY_OPTIONS)
  const { data: frameworkPackageResponse } = useListFrameworkPackagesQuery(DASHBOARD_COUNT_QUERY, DASHBOARD_COUNT_QUERY_OPTIONS)
  const { data: uiContractResponse } = useListUiContractsQuery(DASHBOARD_COUNT_QUERY, DASHBOARD_COUNT_QUERY_OPTIONS)
  const { data: knowledgePackResponse } = useListOutcomeKnowledgePacksQuery(DASHBOARD_COUNT_QUERY, DASHBOARD_COUNT_QUERY_OPTIONS)
  const healthData = healthResponse?.data ?? healthResponse ?? {}
  const auditStats = auditStatsResponse?.data ?? auditStatsResponse ?? {}
  const counts = {
    customers: getResponseTotal(customerResponse),
    licenseLevels: getResponseTotal(licenseLevelResponse),
    roles: getResponseTotal(roleResponse),
    auditLogs: Number.isFinite(Number(auditStats?.total)) ? Number(auditStats.total) : null,
    deniedAccessLogs: getResponseTotal(deniedAccessResponse),
    frameworkRegistries: getResponseTotal(frameworkRegistryResponse),
    runtimePaths: getResponseTotal(runtimePathResponse),
    skillRoles: getResponseTotal(skillRoleResponse),
    runtimeSkills: getResponseTotal(runtimeSkillResponse),
    validationRegistry: getResponseTotal(validationRegistryResponse),
    runtimeAgents: getResponseTotal(runtimeAgentResponse),
    workflowPolicies: getResponseTotal(workflowPolicyResponse),
    frameworkPackages: getResponseTotal(frameworkPackageResponse),
    uiContracts: getResponseTotal(uiContractResponse),
    knowledgePacks: getResponseTotal(knowledgePackResponse),
  }
  const operationalSignals = [
    getHealthSignal({
      healthData,
      isFetching: isHealthFetching,
      error: healthError,
    }),
    getUptimeSignal({ healthData }),
    getAuditSignal({
      auditStats,
      isFetching: isAuditStatsFetching,
    }),
  ]

  return (
    <section className="super-admin-dashboard container" aria-label="Super admin dashboard landing page">
      <Card variant="default" className="super-admin-dashboard__hero">
        <Card.Body className="super-admin-dashboard__hero-body">
          <div className="super-admin-dashboard__hero-copy">
            <div className="super-admin-dashboard__hero-heading">
              <h1 className="super-admin-dashboard__hero-title">Super Admin Workspace</h1>
              <p className="super-admin-dashboard__hero-description">
                Launch governed customer, runtime, and observability surfaces from one control plane.
              </p>
            </div>
          </div>

          <dl className="super-admin-dashboard__hero-metrics" aria-label="Operational signals">
            {operationalSignals.map((signal) => (
              <DashboardHeroSignal key={signal.key} signal={signal} />
            ))}
          </dl>
        </Card.Body>
      </Card>

      <div className="super-admin-dashboard__sections" role="list" aria-label="Super Admin launch groups">
        {dashboardGroups.map((group) => (
          <DashboardGroupSection
            key={group.key}
            group={group}
            counts={counts}
            healthData={healthData}
            healthError={healthError}
          />
        ))}
      </div>
    </section>
  )
}

export default SuperAdminDashboard
