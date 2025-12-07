/**
 * Home Page
 *
 * Landing page for the application
 */

import { Button } from '../../components/Button'
import { Link } from '../../components/Link'

function Home() {
  return (
    <div className="container" style={{ paddingTop: '3rem' }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="text-responsive-xl">Welcome to StoryLineOS</h1>
        <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
          A production-ready component framework built with React
        </p>
      </header>

      <section style={{ marginTop: '3rem' }}>
        <h2>Features</h2>
        <div className="grid grid-cols-1 grid-md-3" style={{ marginTop: '2rem' }}>
          <div style={{ padding: 'var(--spacing-lg)', backgroundColor: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)' }}>
            <h3>🎨 Design System</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)' }}>
              Comprehensive design tokens, responsive utilities, and theming support
            </p>
          </div>
          <div style={{ padding: 'var(--spacing-lg)', backgroundColor: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)' }}>
            <h3>♿ Accessible</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)' }}>
              WCAG compliant, keyboard navigation, and screen reader support
            </p>
          </div>
          <div style={{ padding: 'var(--spacing-lg)', backgroundColor: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)' }}>
            <h3>📱 Responsive</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)' }}>
              Mobile-first design that works beautifully on all devices
            </p>
          </div>
        </div>
      </section>

      <section style={{ marginTop: '3rem', textAlign: 'center' }}>
        <h2>Get Started</h2>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
          <Link to="/components" style={{ textDecoration: 'none' }}>
            <Button variant="primary" size="lg">
              View Components
            </Button>
          </Link>
          <Link to="/about" style={{ textDecoration: 'none' }}>
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
