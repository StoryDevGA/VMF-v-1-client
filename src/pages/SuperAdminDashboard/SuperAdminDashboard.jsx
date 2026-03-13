/**
 * Super Admin Dashboard Page
 *
 * Minimal holding page for SUPER_ADMIN users.
 */

import { useMemo } from 'react'
import {
  MdOutlineAdminPanelSettings,
  MdOutlineInsights,
  MdOutlineSecurity,
} from 'react-icons/md'
import { AdminHoldingPage } from '../../components/AdminHoldingPage'
import { useAuthorization } from '../../hooks/useAuthorization.js'

function SuperAdminDashboard() {
  const { user } = useAuthorization()

  const summaryItems = useMemo(
    () => [
      { label: 'Access level', value: 'Super Administrator' },
      { label: 'Workspace scope', value: 'Platform-wide' },
      { label: 'Primary focus', value: 'Customer governance, platform health, and audit oversight' },
    ],
    [],
  )

  const futureItems = useMemo(
    () => [
      {
        title: 'Platform snapshot',
        description: 'Reserved for high-level system posture, customer totals, and governance rollups.',
        icon: <MdOutlineAdminPanelSettings aria-hidden="true" />,
      },
      {
        title: 'Recent oversight signals',
        description: 'Reserved for notable operational changes, versioning activity, and audit highlights.',
        icon: <MdOutlineInsights aria-hidden="true" />,
      },
      {
        title: 'Security attention queue',
        description: 'Reserved for denied-access trends, escalations, and action-required alerts.',
        icon: <MdOutlineSecurity aria-hidden="true" />,
      },
    ],
    [],
  )

  return (
    <AdminHoldingPage
      ariaLabel="Super admin dashboard landing page"
      title="Super Admin Workspace"
      subtitle="This landing page is intentionally minimal while platform overview modules are prepared."
      roleLabel="Super Administrator"
      guidance="Use the main navigation for customers, licence maintenance, versioning, monitoring, audit, and denied-access workflows."
      userName={user?.name ?? ''}
      summaryTitle="Current session"
      summarySubtitle="The platform dashboard has been reduced to a clean holding surface while future overview modules are designed."
      summaryItems={summaryItems}
      futureItems={futureItems}
    />
  )
}

export default SuperAdminDashboard
