/**
 * Runtime Control dashboard for SUPER_ADMIN users.
 */

import {
  MdExtension,
  MdInventory2,
  MdRule,
  MdSmartToy,
  MdTune,
} from 'react-icons/md'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Link } from '../../components/Link'
import { Status } from '../../components/Status'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import {
  getEnabledRuntimeControlModuleRouteKeys,
  getSuperAdminRoute,
} from '../../constants/superAdminNavigation.js'
import './SuperAdminRuntimeControl.css'

const SYSTEM_VERSIONING_ROUTE = getSuperAdminRoute('systemVersioning')
const ENABLED_MODULE_ROUTE_KEYS = new Set(getEnabledRuntimeControlModuleRouteKeys())

const RUNTIME_CONTROL_MODULES = Object.freeze([
  {
    routeKey: 'frameworkPackages',
    description: 'Define framework identity, version, status, defaults, and compatibility guardrails.',
    taskKey: 'FE-05',
    Icon: MdInventory2,
  },
  {
    routeKey: 'agents',
    description: 'Register runtime agents and manage the metadata that governs where they can be used.',
    taskKey: 'FE-06',
    Icon: MdSmartToy,
  },
  {
    routeKey: 'skills',
    description: 'Register reusable runtime skills and capture the compatibility metadata they depend on.',
    taskKey: 'FE-07',
    Icon: MdExtension,
  },
  {
    routeKey: 'workflowPolicies',
    description: 'Define policy sequencing, workflow gating, and compatibility rules across runtime resources.',
    taskKey: 'FE-08',
    Icon: MdRule,
  },
]).map((module) => ({
  ...module,
  route: getSuperAdminRoute(module.routeKey),
  isAvailableNow: ENABLED_MODULE_ROUTE_KEYS.has(module.routeKey),
}))

function SuperAdminRuntimeControl() {
  const { user } = useAuthorization()

  return (
    <section
      className="super-admin-runtime-control container"
      aria-label="Runtime Control dashboard"
    >
      <Card variant="elevated" className="super-admin-runtime-control__hero">
        <Card.Body className="super-admin-runtime-control__hero-body">
          <div className="super-admin-runtime-control__hero-copy">
            <div className="super-admin-runtime-control__hero-eyebrow">
              <Badge
                variant="info"
                size="sm"
                pill
                outline
                icon={<MdTune aria-hidden="true" />}
              >
                Phase 1B route group
              </Badge>
              <Status variant="info" size="sm">
                Dashboard live
              </Status>
            </div>

            <p className="super-admin-runtime-control__role">Super Administrator</p>
            <h1 className="super-admin-runtime-control__title">Runtime Control</h1>
            <p className="super-admin-runtime-control__subtitle">
              Stage the first control-plane modules, keep System Versioning stable, and
              deliver the Runtime Control catalogue surfaces in sequence.
            </p>
            {user?.name ? (
              <p className="super-admin-runtime-control__signed-in">
                Signed in as <strong>{user.name}</strong>
              </p>
            ) : null}
          </div>

          <div
            className="super-admin-runtime-control__hero-note"
            role="note"
            aria-label="Runtime Control delivery state"
          >
            <h2 className="super-admin-runtime-control__hero-note-title">
              Current delivery state
            </h2>
            <p className="super-admin-runtime-control__hero-note-copy">
              Framework Packages, Agents, Skills, and Workflow Policies are now live as
              the first Runtime Control catalogue pages while the legacy System
              Versioning route stays available.
            </p>
          </div>
        </Card.Body>
      </Card>

      <div className="super-admin-runtime-control__layout">
        <Card variant="elevated" className="super-admin-runtime-control__bridge-card">
          <Card.Header className="super-admin-runtime-control__bridge-header">
            <div className="super-admin-runtime-control__bridge-eyebrow">
              <Badge variant="success" size="sm" pill outline>
                Available now
              </Badge>
              <Status variant="success" size="sm" showIcon>
                Legacy bridge
              </Status>
            </div>
            <h2 className="super-admin-runtime-control__section-title">System Versioning</h2>
            <p className="super-admin-runtime-control__section-copy">
              Keep the existing route stable while Runtime Control expands into the new
              catalogue pages.
            </p>
          </Card.Header>
          <Card.Body className="super-admin-runtime-control__bridge-body">
            <Link
              to={SYSTEM_VERSIONING_ROUTE.to}
              className="super-admin-runtime-control__bridge-link"
              variant="subtle"
              underline="none"
            >
              <span className="super-admin-runtime-control__bridge-link-copy">
                <span className="super-admin-runtime-control__bridge-link-label">
                  Open {SYSTEM_VERSIONING_ROUTE.label}
                </span>
                <span className="super-admin-runtime-control__bridge-link-meta">
                  Existing deep links remain stable
                </span>
              </span>
            </Link>
            <p className="super-admin-runtime-control__bridge-helper">
              Compatibility path: <code>{SYSTEM_VERSIONING_ROUTE.to}</code>
            </p>
          </Card.Body>
        </Card>

        <section
          className="super-admin-runtime-control__modules"
          aria-label="Runtime Control module rollout"
        >
          <div className="super-admin-runtime-control__modules-header">
            <p className="super-admin-runtime-control__modules-eyebrow">
              First-wave module surfaces
            </p>
            <h2 className="super-admin-runtime-control__section-title">
              Phase 1B catalogue surfaces
            </h2>
            <p className="super-admin-runtime-control__section-copy">
              The first four Runtime Control catalogue pages are now live as the Phase 1B
              surface set. System Versioning remains available as the legacy bridge route.
            </p>
          </div>

          <div
            className="super-admin-runtime-control__module-grid"
            role="list"
            aria-label="Planned Runtime Control modules"
          >
            {RUNTIME_CONTROL_MODULES.map((module) => {
              const ModuleIcon = module.Icon

              return (
                <article
                  key={module.route.key}
                  className="super-admin-runtime-control__module-item"
                  role="listitem"
                >
                  <Card variant="elevated" className="super-admin-runtime-control__module-card">
                    <Card.Header className="super-admin-runtime-control__module-header">
                      <div className="super-admin-runtime-control__module-eyebrow">
                        <span
                          className="super-admin-runtime-control__module-icon"
                          aria-hidden="true"
                        >
                          <ModuleIcon />
                        </span>
                        <Badge variant="warning" size="sm" pill outline>
                          {module.taskKey}
                        </Badge>
                        <Status
                          variant={module.isAvailableNow ? 'success' : 'warning'}
                          size="sm"
                          showIcon
                        >
                          {module.isAvailableNow ? 'Available now' : 'Planned next'}
                        </Status>
                      </div>
                      <h3 className="super-admin-runtime-control__module-title">
                        {module.route.label}
                      </h3>
                      <p className="super-admin-runtime-control__module-description">
                        {module.description}
                      </p>
                    </Card.Header>
                    <Card.Body className="super-admin-runtime-control__module-body">
                      {module.isAvailableNow ? (
                        <>
                          <Link
                            to={module.route.to}
                            className="super-admin-runtime-control__module-link"
                            variant="subtle"
                            underline="none"
                          >
                            <span className="super-admin-runtime-control__bridge-link-copy">
                              <span className="super-admin-runtime-control__bridge-link-label">
                                Open {module.route.label}
                              </span>
                              <span className="super-admin-runtime-control__bridge-link-meta">
                                Live catalogue surface
                              </span>
                            </span>
                          </Link>
                          <p className="super-admin-runtime-control__module-path-label">
                            Active route
                          </p>
                          <code className="super-admin-runtime-control__module-path">
                            {module.route.to}
                          </code>
                          <p className="super-admin-runtime-control__module-note">
                            Delivered in {module.taskKey}. This catalogue surface is now live in
                            Runtime Control.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="super-admin-runtime-control__module-path-label">
                            Target route
                          </p>
                          <code className="super-admin-runtime-control__module-path">
                            {module.route.to}
                          </code>
                          <p className="super-admin-runtime-control__module-note">
                            Route and page activation land in {module.taskKey} and remain staged
                            until that section is completed.
                          </p>
                        </>
                      )}
                    </Card.Body>
                  </Card>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </section>
  )
}

export default SuperAdminRuntimeControl
