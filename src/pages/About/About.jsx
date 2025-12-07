/**
 * About Page
 *
 * Information about the project
 */

function About() {
  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      <h1>About StoryLineOS</h1>

      <section style={{ marginTop: '2rem' }}>
        <h2>Project Overview</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-md)', lineHeight: 'var(--line-height-relaxed)' }}>
          StoryLineOS is a production-ready component framework built with modern web technologies and best practices.
          Every component is designed to be accessible, responsive, and maintainable.
        </p>
      </section>

      <section style={{ marginTop: '3rem' }}>
        <h2>Technology Stack</h2>
        <div className="grid grid-cols-1 grid-md-2" style={{ marginTop: '1rem', gap: 'var(--spacing-lg)' }}>
          <div>
            <h3>Frontend</h3>
            <ul style={{ marginTop: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
              <li>React 18.3</li>
              <li>React Router 6</li>
              <li>Vite 5.4 (Build tool)</li>
            </ul>
          </div>
          <div>
            <h3>Testing</h3>
            <ul style={{ marginTop: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
              <li>Vitest</li>
              <li>React Testing Library</li>
              <li>User Event Testing</li>
            </ul>
          </div>
        </div>
      </section>

      <section style={{ marginTop: '3rem' }}>
        <h2>Design Principles</h2>
        <div style={{ marginTop: '1rem' }}>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3>DRY (Don't Repeat Yourself)</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
              Design tokens and reusable components eliminate duplication
            </p>
          </div>

          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3>Accessibility First</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
              WCAG compliant, keyboard navigation, ARIA attributes, screen reader support
            </p>
          </div>

          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3>Mobile-First Responsive</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
              All components work beautifully on mobile, tablet, and desktop
            </p>
          </div>

          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3>Single Source of Truth</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
              Centralized design tokens make theming and updates effortless
            </p>
          </div>

          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3>Comprehensive Testing</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
              Every component has thorough test coverage for reliability
            </p>
          </div>

          <div>
            <h3>Production-Ready</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
              Code follows best practices: modularity, documentation, and maintainability
            </p>
          </div>
        </div>
      </section>

      <section style={{ marginTop: '3rem' }}>
        <h2>Architecture</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-md)', lineHeight: 'var(--line-height-relaxed)' }}>
          The project follows a monorepo structure with separate client and API directories.
          The frontend uses a component-based architecture with a comprehensive design system,
          responsive utilities, and theme support for easy customization.
        </p>
      </section>

      <section style={{ marginTop: '3rem', padding: 'var(--spacing-xl)', backgroundColor: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)' }}>
        <h2>Documentation</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)' }}>
          Comprehensive documentation is available in the <code>/docs</code> directory, covering:
        </p>
        <ul style={{ marginTop: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
          <li>Design system (colors, typography, spacing)</li>
          <li>Responsive design patterns</li>
          <li>Theming system</li>
          <li>Component API references</li>
          <li>Best practices and guidelines</li>
        </ul>
      </section>
    </div>
  )
}

export default About
