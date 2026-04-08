/**
 * Super Admin Dashboard Page
 *
 * Grouped launch surface for SUPER_ADMIN users.
 */

import { useMemo } from 'react'
import {
  MdMonitorHeart,
  MdOutlineAdminPanelSettings,
  MdOutlineDashboardCustomize,
  MdTune,
} from 'react-icons/md'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Link } from '../../components/Link'
import { Status } from '../../components/Status'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { getSuperAdminDashboardGroups } from '../../constants/superAdminNavigation.js'
import './SuperAdminDashboard.css'

const GROUP_ICON_MAP = {
  'customer-governance': MdOutlineAdminPanelSettings,
  'runtime-control': MdTune,
  'runtime-observability': MdMonitorHeart,
}

function SuperAdminDashboard() {
  const { user } = useAuthorization()

  const dashboardGroups = useMemo(() => getSuperAdminDashboardGroups(), [])

  return (
    <section className="super-admin-dashboard container" aria-label="Super admin dashboard landing page">
      <Card variant="elevated" className="super-admin-dashboard__hero">
        <Card.Body className="super-admin-dashboard__hero-body">
          <div className="super-admin-dashboard__hero-copy">
            <div className="super-admin-dashboard__hero-eyebrow">
              <Badge
                variant="info"
                size="sm"
                pill
                outline
                icon={<MdOutlineDashboardCustomize aria-hidden="true" />}
              >
                Phased launch surface
              </Badge>
              <Status variant="info" size="sm">
                Runtime Control live
              </Status>
            </div>
            <p className="super-admin-dashboard__role">Super Administrator</p>
            <h1 className="super-admin-dashboard__title">Super Admin Workspace</h1>
            <p className="super-admin-dashboard__subtitle">
              Launch governance, runtime-control, and observability workflows from one grouped workspace.
            </p>
            {user?.name ? (
              <p className="super-admin-dashboard__signed-in">
                Signed in as <strong>{user.name}</strong>
              </p>
            ) : null}
          </div>

          <div className="super-admin-dashboard__hero-note" role="note" aria-label="Current rollout">
            <h2 className="super-admin-dashboard__hero-note-title">Current rollout</h2>
            <p className="super-admin-dashboard__hero-note-copy">
              Customer Governance and Runtime Observability links are available now. Runtime Control now
              has a dedicated dashboard, while System Versioning remains the legacy bridge route until
              Framework Packages, Agents, Skills, and Workflow Policies are live.
            </p>
          </div>
        </Card.Body>
      </Card>

      <div className="super-admin-dashboard__group-grid" role="list" aria-label="Super Admin launch groups">
        {dashboardGroups.map((group) => {
          const GroupIcon = GROUP_ICON_MAP[group.key] ?? MdOutlineAdminPanelSettings

          return (
            <article key={group.key} className="super-admin-dashboard__group-item" role="listitem">
              <Card variant="elevated" className="super-admin-dashboard__group-card">
                <Card.Header className="super-admin-dashboard__group-header">
                  <div className="super-admin-dashboard__group-eyebrow">
                    <span className="super-admin-dashboard__group-icon" aria-hidden="true">
                      <GroupIcon />
                    </span>
                    <Badge variant="info" size="sm" pill outline>
                      {group.activeLinks.length} available
                    </Badge>
                    {group.upcomingLinks.length > 0 ? (
                      <Badge variant="warning" size="sm" pill outline>
                        {group.upcomingLinks.length} planned
                      </Badge>
                    ) : null}
                  </div>

                  <div className="super-admin-dashboard__group-title-row">
                    <h2 className="super-admin-dashboard__group-title">{group.label}</h2>
                    <Status variant={group.status.variant} size="sm" showIcon>
                      {group.status.label}
                    </Status>
                  </div>

                  <p className="super-admin-dashboard__group-description">{group.description}</p>
                </Card.Header>

                <Card.Body className="super-admin-dashboard__group-body">
                  <ul className="super-admin-dashboard__launch-list">
                    {group.activeLinks.map((link) => (
                      <li key={link.key} className="super-admin-dashboard__launch-item">
                        <Link
                          to={link.to}
                          className="super-admin-dashboard__launch-link"
                          variant="subtle"
                          underline="none"
                        >
                          <span className="super-admin-dashboard__launch-copy">
                            <span className="super-admin-dashboard__launch-label">{link.label}</span>
                            <span className="super-admin-dashboard__launch-meta">Open now</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>

                  {group.upcomingLinks.length > 0 ? (
                    <div className="super-admin-dashboard__upcoming" aria-label={`${group.label} planned modules`}>
                      <p className="super-admin-dashboard__upcoming-title">{group.upcomingTitle}</p>
                      <p className="super-admin-dashboard__upcoming-copy">{group.helperCopy}</p>
                      <div className="super-admin-dashboard__upcoming-list">
                        {group.upcomingLinks.map((link) => (
                          <Badge key={link.key} variant="warning" size="sm" pill outline>
                            {link.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Card.Body>
              </Card>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default SuperAdminDashboard
