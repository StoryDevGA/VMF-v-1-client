/**
 * Home Page
 *
 * Landing page for the application
 */

import { Button } from '../../components/Button'
import { Link } from '../../components/Link'
import { Card } from '../../components/Card'
import { MdDesignServices, MdAccessibility, MdPhoneAndroid } from 'react-icons/md'
import './Home.css'

function Home() {
  return (
    <div className="container home">
      <header className="home__header">
        <h1 className="text-fluid-xl">Welcome to StoryLineOS</h1>
        <p className="text-responsive-base home__subtitle">
          A production-ready component framework built with React
        </p>
      </header>

      <section className="home__section">
        <h2 className="text-responsive-lg">Features</h2>
        <div className="grid grid-cols-1 grid-md-3 home__features-grid">
          <Card variant="filled">
            <Card.Header>
              <MdDesignServices /> Design System
            </Card.Header>
            <Card.Body>
              <p className="home__feature-card-body">
                Comprehensive design tokens, responsive utilities, and theming support
              </p>
            </Card.Body>
          </Card>
          <Card variant="filled">
            <Card.Header>
              <MdAccessibility /> Accessible
            </Card.Header>
            <Card.Body>
              <p className="home__feature-card-body">
                WCAG compliant, keyboard navigation, and screen reader support
              </p>
            </Card.Body>
          </Card>
          <Card variant="filled">
            <Card.Header>
              <MdPhoneAndroid /> Responsive
            </Card.Header>
            <Card.Body>
              <p className="home__feature-card-body">
                Mobile-first design that works beautifully on all devices
              </p>
            </Card.Body>
          </Card>
        </div>
      </section>

      <section className="home__cta-section">
        <h2 className="text-responsive-lg">Get Started</h2>
        <div className="home__cta-buttons">
          <Link to="/components" underline="none">
            <Button variant="primary" size="lg">
              View Components
            </Button>
          </Link>
          <Link to="/about" underline="none">
            <Button variant="outline" size="lg">
              About
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Home
