/**
 * Home Page
 *
 * Public landing workspace with clear onboarding paths.
 */

import { useNavigate } from 'react-router-dom'
import {
  MdLaunch,
} from 'react-icons/md'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { useAuth } from '../../hooks/useAuth.js'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import pinwheelIcon from '../../assets/images/icons/pinwheel.svg'
import './Home.css'

function Home() {
  const navigate = useNavigate()
  const { isAuthenticated, status } = useAuth()
  const { isSuperAdmin } = useAuthorization()

  const handlePrimaryAction = () => {
    if (!isAuthenticated) {
      navigate('/app/login')
      return
    }

    navigate(isSuperAdmin ? '/super-admin/dashboard' : '/app/dashboard')
  }

  return (
    <section className="home container" aria-label="Home">
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
                  onClick={handlePrimaryAction}
                  rightIcon={<MdLaunch aria-hidden="true" />}
                  disabled={status === 'loading'}
                >
                  {isAuthenticated ? 'Open Dashboard' : 'Sign In'}
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
      </div>
    </section>
  )
}

export default Home
