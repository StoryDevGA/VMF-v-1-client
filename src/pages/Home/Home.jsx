/**
 * Home Page
 *
 * Public landing workspace with clear onboarding paths.
 */

import { useNavigate } from 'react-router-dom'
import {
  MdAutoGraph,
  MdHandshake,
  MdInsights,
  MdLaunch,
} from 'react-icons/md'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import pinwheelIcon from '../../assets/images/icons/pinwheel.svg'
import './Home.css'

const HOME_WORKFLOWS = [
  {
    title: 'Narrative Framework',
    description:
      'Build and refine value messaging frameworks with customer context and role scope.',
    action: 'Open Dashboard',
    to: '/app/dashboard',
    icon: <MdAutoGraph aria-hidden="true" />,
  },
  {
    title: 'Customer Administration',
    description:
      'Manage customer users, role assignments, and operational access controls.',
    action: 'Manage Users',
    to: '/app/administration/edit-users',
    icon: <MdHandshake aria-hidden="true" />,
  },
  {
    title: 'Platform Monitoring',
    description:
      'Review platform health signals, telemetry trends, and escalation readiness.',
    action: 'View Monitoring',
    to: '/super-admin/system-monitoring',
    icon: <MdInsights aria-hidden="true" />,
  },
]

function Home() {
  const navigate = useNavigate()

  return (
    <section className="home" aria-label="Home">
      <header className="home__header">
        <p className="home__eyebrow">Platform Workspace</p>
        <h1 className="home__title">StoryLineOS Home</h1>
        <p className="home__subtitle">
          Centralize customer story operations, administration workflows, and
          platform visibility from one landing surface.
        </p>
      </header>

      <div className="home__layout">
        <Fieldset
          variant="default"
          gap="lg"
          className="home__panel home__panel--hero"
        >
          <Fieldset.Legend className="home__panel-legend">
            <h2 className="home__panel-title">Get Started</h2>
          </Fieldset.Legend>
          <Fieldset.Content className="home__hero-content">
            <div className="home__hero-copy">
              <h3 className="home__hero-heading">
                Move from story strategy to execution with less friction.
              </h3>
              <p className="home__hero-description">
                Use role-aware dashboards to manage customer administration and
                operational insights without context switching.
              </p>
              <div className="home__hero-actions">
                <Button
                  size="lg"
                  className="home__hero-action"
                  onClick={() => navigate('/app/dashboard')}
                  rightIcon={<MdLaunch aria-hidden="true" />}
                >
                  Open Dashboard
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="home__hero-action"
                  onClick={() => navigate('/help')}
                >
                  Help Center
                </Button>
              </div>
            </div>

            <Card variant="default" className="home__hero-card">
              <Card.Header className="home__hero-card-header">
                <img
                  src={pinwheelIcon}
                  alt="StoryLineOS logo"
                  className="home__hero-brand-icon"
                />
                <h3 className="home__hero-card-title">Workspace Signal</h3>
              </Card.Header>
              <Card.Body className="home__hero-card-body">
                <p className="home__hero-card-copy">
                  Narrative clarity and execution speed improve when context and
                  controls stay connected.
                </p>
                <ul className="home__hero-card-list">
                  <li>Role-aware workflow entry points</li>
                  <li>Customer context alignment</li>
                  <li>Integrated operational visibility</li>
                </ul>
              </Card.Body>
            </Card>
          </Fieldset.Content>
        </Fieldset>

        <Fieldset
          variant="default"
          gap="lg"
          className="home__panel home__panel--workflows"
        >
          <Fieldset.Legend className="home__panel-legend">
            <h2 className="home__panel-title">Core Workflows</h2>
          </Fieldset.Legend>
          <Fieldset.Content className="home__workflows" role="list">
            {HOME_WORKFLOWS.map((workflow) => (
              <article
                key={workflow.title}
                className="home__workflow-card"
                role="listitem"
              >
                <div className="home__workflow-header">
                  <span className="home__workflow-icon">{workflow.icon}</span>
                  <h3 className="home__workflow-title">{workflow.title}</h3>
                </div>
                <p className="home__workflow-description">
                  {workflow.description}
                </p>
                <div className="home__workflow-footer">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => navigate(workflow.to)}
                    rightIcon={<MdLaunch aria-hidden="true" />}
                  >
                    {workflow.action}
                  </Button>
                </div>
              </article>
            ))}
          </Fieldset.Content>
        </Fieldset>
      </div>
    </section>
  )
}

export default Home
