import {
  MdHelpOutline,
  MdMarkEmailUnread,
  MdMonitorHeart,
  MdSettings,
  MdTune,
} from 'react-icons/md'
import { getSuperAdminRoute } from '../../constants/superAdminNavigation.js'

const monitoringRoute = getSuperAdminRoute('systemMonitoring', {
  labelVariant: 'legacyNav',
})
const invitationsRoute = getSuperAdminRoute('invitations', {
  labelVariant: 'legacyNav',
})
const licenseLevelsRoute = getSuperAdminRoute('licenseLevels', {
  labelVariant: 'legacyNav',
})
const customersRoute = getSuperAdminRoute('customers')
const versioningRoute = getSuperAdminRoute('systemVersioning', {
  labelVariant: 'legacyNav',
})
const auditLogsRoute = getSuperAdminRoute('auditLogs', {
  labelVariant: 'legacyNav',
})
const deniedAccessLogsRoute = getSuperAdminRoute('deniedAccessLogs', {
  labelVariant: 'legacyNav',
})

export const PRIMARY_ACTIONS = [
  {
    key: monitoringRoute.key,
    title: 'Platform Monitoring',
    description:
      'Review platform health and operational telemetry across environments.',
    to: monitoringRoute.to,
    icon: <MdMonitorHeart aria-hidden="true" />,
  },
  {
    key: invitationsRoute.key,
    title: 'Invitation Management',
    description:
      'Create, resend, and revoke onboarding invitations for customer administrators.',
    to: invitationsRoute.to,
    icon: <MdMarkEmailUnread aria-hidden="true" />,
  },
  {
    key: licenseLevelsRoute.key,
    title: licenseLevelsRoute.canonicalLabel,
    description:
      'Create and update governance licence tiers and feature entitlements.',
    to: licenseLevelsRoute.to,
    icon: <MdTune aria-hidden="true" />,
  },
  {
    key: customersRoute.key,
    title: 'Customer Governance',
    description:
      'Manage customers, lifecycle status, and canonical admin assignment flows.',
    to: customersRoute.to,
    icon: <MdSettings aria-hidden="true" />,
  },
  {
    key: versioningRoute.key,
    title: versioningRoute.canonicalLabel,
    description:
      'Review and update platform governance policy versions with step-up controls.',
    to: versioningRoute.to,
    icon: <MdSettings aria-hidden="true" />,
  },
  {
    key: auditLogsRoute.key,
    title: 'Audit Logs',
    description:
      'Query immutable audit records and run integrity verification checks.',
    to: auditLogsRoute.to,
    icon: <MdMonitorHeart aria-hidden="true" />,
  },
  {
    key: deniedAccessLogsRoute.key,
    title: deniedAccessLogsRoute.canonicalLabel,
    description:
      'Review authorization denials across platform workflows for audit visibility.',
    to: deniedAccessLogsRoute.to,
    icon: <MdMonitorHeart aria-hidden="true" />,
  },
]

export const SUPPORT_ACTIONS = [
  {
    key: monitoringRoute.key,
    label: monitoringRoute.label,
    to: monitoringRoute.to,
    icon: <MdMonitorHeart aria-hidden="true" />,
  },
  {
    key: invitationsRoute.key,
    label: invitationsRoute.label,
    to: invitationsRoute.to,
    icon: <MdMarkEmailUnread aria-hidden="true" />,
  },
  {
    key: licenseLevelsRoute.key,
    label: licenseLevelsRoute.canonicalLabel,
    to: licenseLevelsRoute.to,
    icon: <MdTune aria-hidden="true" />,
  },
  {
    key: customersRoute.key,
    label: customersRoute.label,
    to: customersRoute.to,
    icon: <MdSettings aria-hidden="true" />,
  },
  {
    key: versioningRoute.key,
    label: versioningRoute.label,
    to: versioningRoute.to,
    icon: <MdSettings aria-hidden="true" />,
  },
  {
    key: auditLogsRoute.key,
    label: auditLogsRoute.label,
    to: auditLogsRoute.to,
    icon: <MdMonitorHeart aria-hidden="true" />,
  },
  {
    key: deniedAccessLogsRoute.key,
    label: deniedAccessLogsRoute.label,
    to: deniedAccessLogsRoute.to,
    icon: <MdMonitorHeart aria-hidden="true" />,
  },
  {
    key: 'help',
    label: 'Help Center',
    to: '/help',
    icon: <MdHelpOutline aria-hidden="true" />,
  },
]
