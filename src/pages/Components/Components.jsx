/**
 * Components Page
 *
 * Showcase of all available components
 */

import { useState } from 'react'
import { Button } from '../../components/Button'
import { Link } from '../../components/Link'
import { Card } from '../../components/Card'
import { Avatar } from '../../components/Avatar'
import { Accordion } from '../../components/Accordion'

function Components() {
  const [loading, setLoading] = useState(false)

  const handleAsyncAction = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      <h1 className="text-fluid-xl">Component Showcase</h1>
      <p className="text-responsive-base" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)' }}>
        Production-ready, accessible components for building modern web applications
      </p>

      <section style={{ marginTop: '3rem' }}>
        <h2 className="text-responsive-lg">Button Component</h2>

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
        <h2 className="text-responsive-lg">Link Component</h2>

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

      <section style={{ marginTop: '3rem' }}>
        <h2 className="text-responsive-lg">Card Component</h2>

        <div style={{ marginTop: '2rem' }}>
          <h3>Variants</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <Card variant="default">
              <Card.Header>Default Card</Card.Header>
              <Card.Body>Basic bordered card with clean design.</Card.Body>
            </Card>

            <Card variant="outlined">
              <Card.Header>Outlined Card</Card.Header>
              <Card.Body>Emphasized 2px border for prominence.</Card.Body>
            </Card>

            <Card variant="elevated">
              <Card.Header>Elevated Card</Card.Header>
              <Card.Body>Professional shadow effect for depth.</Card.Body>
            </Card>

            <Card variant="filled">
              <Card.Header>Filled Card</Card.Header>
              <Card.Body>Subtle background color variant.</Card.Body>
            </Card>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>Interactive Cards</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <Card hoverable variant="elevated">
              <Card.Header>Hoverable Card</Card.Header>
              <Card.Body>Hover me! I lift up with a smooth animation.</Card.Body>
            </Card>

            <Card clickable onClick={() => alert('Card clicked!')}>
              <Card.Header>Clickable Card</Card.Header>
              <Card.Body>Click me! The entire card is interactive.</Card.Body>
            </Card>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>Corner Styles</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <Card rounded variant="elevated">
              <Card.Header>Rounded Corners</Card.Header>
              <Card.Body>Smooth, modern rounded corners (default).</Card.Body>
            </Card>

            <Card rounded={false} variant="elevated">
              <Card.Header>Square Corners</Card.Header>
              <Card.Body>Sharp, minimal square corners.</Card.Body>
            </Card>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>Card with Image</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <Card variant="elevated" hoverable>
              <Card.Image
                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop"
                alt="Mountain landscape"
              />
              <Card.Header>Mountain Adventure</Card.Header>
              <Card.Body>
                Explore breathtaking mountain landscapes and discover hidden trails.
              </Card.Body>
              <Card.Footer>
                <Button size="sm">Learn More</Button>
                <Button size="sm" variant="outline">Share</Button>
              </Card.Footer>
            </Card>

            <Card variant="elevated" hoverable>
              <Card.Image
                src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=200&fit=crop"
                alt="Night sky"
              />
              <Card.Header>Stargazing Guide</Card.Header>
              <Card.Body>
                Perfect spots and times for observing the night sky.
              </Card.Body>
              <Card.Footer>
                <Button size="sm">Read Guide</Button>
                <Button size="sm" variant="outline">Bookmark</Button>
              </Card.Footer>
            </Card>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>User Profile Cards</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <Card variant="outlined">
              <Card.Body>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Avatar name="Sarah Johnson" size="lg" status="online" />
                  <div>
                    <h4 style={{ margin: 0 }}>Sarah Johnson</h4>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                      Product Designer
                    </p>
                  </div>
                </div>
              </Card.Body>
              <Card.Footer>
                <Button size="sm" variant="outline" fullWidth>View Profile</Button>
              </Card.Footer>
            </Card>

            <Card variant="outlined">
              <Card.Body>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Avatar name="Michael Chen" size="lg" status="away" shape="rounded" />
                  <div>
                    <h4 style={{ margin: 0 }}>Michael Chen</h4>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                      Software Engineer
                    </p>
                  </div>
                </div>
              </Card.Body>
              <Card.Footer>
                <Button size="sm" variant="outline" fullWidth>View Profile</Button>
              </Card.Footer>
            </Card>

            <Card variant="outlined">
              <Card.Body>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Avatar name="Emily Rodriguez" size="lg" status="busy" />
                  <div>
                    <h4 style={{ margin: 0 }}>Emily Rodriguez</h4>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                      UX Researcher
                    </p>
                  </div>
                </div>
              </Card.Body>
              <Card.Footer>
                <Button size="sm" variant="outline" fullWidth>View Profile</Button>
              </Card.Footer>
            </Card>
          </div>
        </div>
      </section>

      <section style={{ marginTop: '3rem' }}>
        <h2 className="text-responsive-lg">Accordion Component</h2>

        <div style={{ marginTop: '2rem' }}>
          <h3>Variants</h3>
          <div style={{ display: 'grid', gap: '2rem', marginTop: '1rem' }}>
            <div>
              <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Default</h4>
              <Accordion variant="default">
                <Accordion.Item id="default-1">
                  <Accordion.Header itemId="default-1">What is this component?</Accordion.Header>
                  <Accordion.Content itemId="default-1">
                    This is a professional accordion component with smooth animations, keyboard navigation, and full accessibility support.
                  </Accordion.Content>
                </Accordion.Item>
                <Accordion.Item id="default-2">
                  <Accordion.Header itemId="default-2">How does it work?</Accordion.Header>
                  <Accordion.Content itemId="default-2">
                    Click on section headers to expand and collapse content. Only one section can be open at a time by default.
                  </Accordion.Content>
                </Accordion.Item>
                <Accordion.Item id="default-3">
                  <Accordion.Header itemId="default-3">Can I customize it?</Accordion.Header>
                  <Accordion.Content itemId="default-3">
                    Yes! The accordion supports multiple variants, custom styling, and various configuration options.
                  </Accordion.Content>
                </Accordion.Item>
              </Accordion>
            </div>

            <div>
              <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Outlined</h4>
              <Accordion variant="outlined">
                <Accordion.Item id="outlined-1">
                  <Accordion.Header itemId="outlined-1">Emphasized Borders</Accordion.Header>
                  <Accordion.Content itemId="outlined-1">
                    The outlined variant features 2px borders for a more prominent, attention-grabbing appearance.
                  </Accordion.Content>
                </Accordion.Item>
                <Accordion.Item id="outlined-2">
                  <Accordion.Header itemId="outlined-2">Perfect for Standalone</Accordion.Header>
                  <Accordion.Content itemId="outlined-2">
                    This style works great for standalone accordions that need to stand out on the page.
                  </Accordion.Content>
                </Accordion.Item>
              </Accordion>
            </div>

            <div>
              <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Filled</h4>
              <Accordion variant="filled">
                <Accordion.Item id="filled-1">
                  <Accordion.Header itemId="filled-1">Subtle Background</Accordion.Header>
                  <Accordion.Content itemId="filled-1">
                    The filled variant adds a subtle background color for a softer, more integrated look.
                  </Accordion.Content>
                </Accordion.Item>
                <Accordion.Item id="filled-2">
                  <Accordion.Header itemId="filled-2">Visual Separation</Accordion.Header>
                  <Accordion.Content itemId="filled-2">
                    Great for creating visual hierarchy and separating different content sections.
                  </Accordion.Content>
                </Accordion.Item>
              </Accordion>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>Corner Styles</h3>
          <div style={{ display: 'grid', gap: '2rem', marginTop: '1rem' }}>
            <div>
              <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Rounded (Default)</h4>
              <Accordion variant="outlined" rounded>
                <Accordion.Item id="rounded-1">
                  <Accordion.Header itemId="rounded-1">Smooth Rounded Corners</Accordion.Header>
                  <Accordion.Content itemId="rounded-1">
                    Modern, friendly appearance with rounded corners that match the design system.
                  </Accordion.Content>
                </Accordion.Item>
              </Accordion>
            </div>

            <div>
              <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Square</h4>
              <Accordion variant="outlined" rounded={false}>
                <Accordion.Item id="square-1">
                  <Accordion.Header itemId="square-1">Sharp Square Corners</Accordion.Header>
                  <Accordion.Content itemId="square-1">
                    Clean, minimal aesthetic with sharp corners for a more formal or technical look.
                  </Accordion.Content>
                </Accordion.Item>
              </Accordion>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>Allow Multiple Open</h3>
          <Accordion variant="outlined" allowMultiple defaultOpenItems={['multi-1']}>
            <Accordion.Item id="multi-1">
              <Accordion.Header itemId="multi-1">Multiple Sections Open</Accordion.Header>
              <Accordion.Content itemId="multi-1">
                With <code>allowMultiple=true</code>, users can have multiple sections expanded at the same time.
                This is useful when users need to compare or reference multiple sections.
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item id="multi-2">
              <Accordion.Header itemId="multi-2">Independent Toggle</Accordion.Header>
              <Accordion.Content itemId="multi-2">
                Each section toggles independently without affecting the others. Try opening this section
                while the one above stays open!
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item id="multi-3">
              <Accordion.Header itemId="multi-3">Great for Settings</Accordion.Header>
              <Accordion.Content itemId="multi-3">
                This mode is perfect for settings panels, documentation, or any content where users
                might want to view multiple sections simultaneously.
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>FAQ Example</h3>
          <Accordion variant="default" defaultOpenItems={['faq-1']}>
            <Accordion.Item id="faq-1">
              <Accordion.Header itemId="faq-1">What are your pricing options?</Accordion.Header>
              <Accordion.Content itemId="faq-1">
                We offer flexible pricing plans starting at $9/month for individuals, $29/month for teams,
                and custom enterprise pricing for organizations with advanced needs.
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item id="faq-2">
              <Accordion.Header itemId="faq-2">Do you offer a free trial?</Accordion.Header>
              <Accordion.Content itemId="faq-2">
                Yes! All plans include a 14-day free trial with full access to all features. No credit card required.
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item id="faq-3">
              <Accordion.Header itemId="faq-3">What support options are available?</Accordion.Header>
              <Accordion.Content itemId="faq-3">
                We provide email support for all plans, priority support for team plans, and dedicated support
                with SLA guarantees for enterprise customers.
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item id="faq-4">
              <Accordion.Header itemId="faq-4">Can I cancel anytime?</Accordion.Header>
              <Accordion.Content itemId="faq-4">
                Absolutely! You can cancel your subscription at any time with no cancellation fees. Your access
                continues until the end of your current billing period.
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item id="faq-5">
              <Accordion.Header itemId="faq-5">Is my data secure?</Accordion.Header>
              <Accordion.Content itemId="faq-5">
                Yes, we take security seriously. All data is encrypted in transit and at rest, and we're compliant
                with SOC 2 Type II, GDPR, and CCPA standards.
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </div>
      </section>

      <section style={{ marginTop: '4rem', padding: 'var(--spacing-xl)', backgroundColor: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-lg)' }}>
        <h2 className="text-responsive-lg">Coming Soon</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)' }}>
          More components are being built following the same production-ready standards:
        </p>
        <ul style={{ marginTop: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
          <li>Input fields & Forms</li>
          <li>Modals & Dialogs</li>
          <li>Tables & Data Grids</li>
          <li>Tooltips & Popovers</li>
          <li>And more...</li>
        </ul>
      </section>
    </div>
  )
}

export default Components
