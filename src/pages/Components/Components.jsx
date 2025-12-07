/**
 * Components Page
 *
 * Showcase of all available components
 */

import { useState } from 'react'
import { Button } from '../../components/Button'
import { Link } from '../../components/Link'

function Components() {
  const [loading, setLoading] = useState(false)

  const handleAsyncAction = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      <h1>Component Showcase</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)' }}>
        Production-ready, accessible components for building modern web applications
      </p>

      <section style={{ marginTop: '3rem' }}>
        <h2>Button Component</h2>

        <div style={{ marginTop: '2rem' }}>
          <h3>Variants</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>Sizes</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>States</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Button disabled>Disabled</Button>
            <Button loading={loading} onClick={handleAsyncAction}>
              {loading ? 'Loading...' : 'Click to Load'}
            </Button>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>Double Outline</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Button variant="outline" doubleOutline>Outline Double</Button>
            <Button variant="primary" doubleOutline>Primary Double</Button>
            <Button variant="secondary" doubleOutline>Secondary Double</Button>
            <Button variant="danger" doubleOutline>Danger Double</Button>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>Square (No Border Radius)</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Button variant="primary" square>Square Primary</Button>
            <Button variant="outline" square>Square Outline</Button>
            <Button variant="danger" square>Square Danger</Button>
            <Button variant="outline" square doubleOutline>Square Double</Button>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>Full Width</h3>
          <div style={{ marginTop: '1rem' }}>
            <Button fullWidth>Full Width Button</Button>
          </div>
        </div>
      </section>

      <section style={{ marginTop: '3rem' }}>
        <h2>Link Component</h2>

        <div style={{ marginTop: '2rem' }}>
          <h3>Variants</h3>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Link to="/about" variant="primary">Primary Link</Link>
            <Link to="/about" variant="secondary">Secondary Link</Link>
            <Link to="/about" variant="subtle">Subtle Link</Link>
            <Link to="/about" variant="danger">Danger Link</Link>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>Underline Styles</h3>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Link to="/about" underline="none">No Underline</Link>
            <Link to="/about" underline="hover">Hover Underline</Link>
            <Link to="/about" underline="always">Always Underlined</Link>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>External Links</h3>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Link href="https://react.dev">React Docs</Link>
            <Link href="https://vitejs.dev" openInNewTab>Vite Docs</Link>
            <Link href="https://github.com" variant="secondary" openInNewTab>GitHub</Link>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>States</h3>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Link to="/about">Normal Link</Link>
            <Link to="/about" disabled>Disabled Link</Link>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>In Paragraphs</h3>
          <p style={{ marginTop: '1rem', maxWidth: '600px', lineHeight: 'var(--line-height-relaxed)' }}>
            Links in paragraphs automatically get subtle underlines for better readability.
            For example, check out the <Link to="/components">components page</Link> or
            read our <Link to="/about">about section</Link> to learn more.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '4rem', padding: 'var(--spacing-xl)', backgroundColor: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)' }}>
        <h2>Coming Soon</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)' }}>
          More components are being built following the same production-ready standards:
        </p>
        <ul style={{ marginTop: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
          <li>Input fields</li>
          <li>Forms</li>
          <li>Cards</li>
          <li>Modals</li>
          <li>And more...</li>
        </ul>
      </section>
    </div>
  )
}

export default Components
