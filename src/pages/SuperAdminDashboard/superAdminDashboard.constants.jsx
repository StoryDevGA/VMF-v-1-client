import {
  MdHelpOutline,
  MdMarkEmailUnread,
  MdMonitorHeart,
  MdSettings,
  MdTune,
} from 'react-icons/md'

export const PRIMARY_ACTIONS = [
  {
    key: 'monitoring',
    title: 'Platform Monitoring',
    description:
      'Review platform health and operational telemetry across environments.',
    to: '/super-admin/system-monitoring',
    icon: <MdMonitorHeart aria-hidden="true" />,
  },
  {
    key: 'invitations',
    title: 'Invitation Management',
    description:
      'Create, resend, and revoke onboarding invitations for customer administrators.',
    to: '/super-admin/invitations',
    icon: <MdMarkEmailUnread aria-hidden="true" />,
  },
  {
    key: 'license-levels',
    title: 'Licence Levels',
    description:
      'Create and update governance licence tiers and feature entitlements.',
    to: '/super-admin/license-levels',
    icon: <MdTune aria-hidden="true" />,
  },
  {
    key: 'customers',
    title: 'Customer Governance',
    description:
      'Manage customers, lifecycle status, and canonical admin assignment flows.',
    to: '/super-admin/customers',
    icon: <MdSettings aria-hidden="true" />,
  },
  {
    key: 'versioning',
    title: 'System Versioning',
    description:
      'Review and update platform governance policy versions with step-up controls.',
    to: '/super-admin/system-versioning',
    icon: <MdSettings aria-hidden="true" />,
  },
  {
    key: 'audit-logs',
    title: 'Audit Logs',
    description:
      'Query immutable audit records and run integrity verification checks.',
    to: '/super-admin/audit-logs',
    icon: <MdMonitorHeart aria-hidden="true" />,
  },
  {
    key: 'denied-access',
    title: 'Denied Access Logs',
    description:
      'Review authorization denials across platform workflows for audit visibility.',
    to: '/super-admin/denied-access-logs',
    icon: <MdMonitorHeart aria-hidden="true" />,
  },
]

export const SUPPORT_ACTIONS = [
  {
    key: 'monitoring',
    label: 'Monitoring',
    to: '/super-admin/system-monitoring',
    icon: <MdMonitorHeart aria-hidden="true" />,
  },
  {
    key: 'invitations',
    label: 'Invitations',
    to: '/super-admin/invitations',
    icon: <MdMarkEmailUnread aria-hidden="true" />,
  },
  {
    key: 'license-levels',
    label: 'Licence Levels',
    to: '/super-admin/license-levels',
    icon: <MdTune aria-hidden="true" />,
  },
  {
    key: 'customers',
    label: 'Customers',
    to: '/super-admin/customers',
    icon: <MdSettings aria-hidden="true" />,
  },
  {
    key: 'versioning',
    label: 'Versioning',
    to: '/super-admin/system-versioning',
    icon: <MdSettings aria-hidden="true" />,
  },
  {
    key: 'audit-logs',
    label: 'Audit Logs',
    to: '/super-admin/audit-logs',
    icon: <MdMonitorHeart aria-hidden="true" />,
  },
  {
    key: 'denied-access',
    label: 'Denied Access',
    to: '/super-admin/denied-access-logs',
    icon: <MdMonitorHeart aria-hidden="true" />,
  },
  {
    key: 'help',
    label: 'Help Center',
    to: '/help',
    icon: <MdHelpOutline aria-hidden="true" />,
  },
]
