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
import { Dialog } from '../../components/Dialog'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Tickbox } from '../../components/Tickbox'
import { Radio } from '../../components/Radio'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { Select } from '../../components/Select'
import { Tooltip } from '../../components/Tooltip'
import { useToaster } from '../../components/Toaster'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Typewriter } from '../../components/Typewriter'
import { BrandSwitcher } from '../../components/BrandSwitcher'
import { MdCheck, MdArrowForward, MdSettings, MdSearch } from 'react-icons/md'
import './Components.css'

function Components() {
  const { addToast } = useToaster()
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sizeDialogOpen, setSizeDialogOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [tickboxState, setTickboxState] = useState({
    unchecked: false,
    checked: true,
  })
  const [selectedRadioOption, setSelectedRadioOption] = useState('option1')
  const [selectedRadioSize, setSelectedRadioSize] = useState('md')
  const [selectedRadioState, setSelectedRadioState] = useState('active')
  const [selectValue, setSelectValue] = useState('')
  const [tickboxSizeSmChecked, setTickboxSizeSmChecked] = useState(false)
  const [tickboxSizeMdChecked, setTickboxSizeMdChecked] = useState(true)
  const [tickboxSizeLgChecked, setTickboxSizeLgChecked] = useState(false)
  const [tickboxIndeterminateChecked, setTickboxIndeterminateChecked] = useState(false)
  const [tickboxDisabledCheckedState, setTickboxDisabledCheckedState] = useState(true) // For tick-disabled-checked
  const [tickboxDisabledIndeterminateChecked, setTickboxDisabledIndeterminateChecked] = useState(false) // For tick-disabled-indeterminate
  const [controlledTooltipOpen, setControlledTooltipOpen] = useState(false)
  const scrollItems = [
    { title: 'Design Tokens', copy: 'Single source of truth for spacing, colors, and typography.' },
    { title: 'Responsive Grid', copy: 'Mobile-first utilities that scale with your layout.' },
    { title: 'Theming', copy: 'Swap palettes instantly with CSS custom properties.' },
    { title: 'Accessibility', copy: 'WCAG-first components with keyboard and screen reader support.' },
    { title: 'Performance', copy: 'Lazy loading, code splitting, and lightweight CSS.' },
    { title: 'Testing', copy: 'Components ship with comprehensive tests out of the box.' },
  ]

  const handleTickboxChange = (e) => {
    const { id, checked } = e.target
    setTickboxState((prev) => ({ ...prev, [id]: checked }))
  }

  const handleTickboxSizeSmChange = (e) => setTickboxSizeSmChecked(e.target.checked)
  const handleTickboxSizeMdChange = (e) => setTickboxSizeMdChecked(e.target.checked)
  const handleTickboxSizeLgChange = (e) => setTickboxSizeLgChecked(e.target.checked)
  const handleTickboxIndeterminateChange = (e) => setTickboxIndeterminateChecked(e.target.checked)
  const handleTickboxDisabledCheckedChange = () => {} // No-op for disabled
  const handleTickboxDisabledIndeterminateChange = () => {} // No-op for disabled

  const handleRadioOptionChange = (e) => {
    setSelectedRadioOption(e.target.value)
  }

  const handleRadioSizeChange = (e) => {
    setSelectedRadioSize(e.target.value)
  }

  const handleRadioStateChange = (e) => {
    setSelectedRadioState(e.target.value)
  }

  const handleSelectChange = (e) => {
    setSelectValue(e.target.value)
  }

  const handleAsyncAction = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  const triggerToast = (variant) => {
    addToast({
      title: variant === 'success' ? 'Success' : variant === 'error' ? 'Error' : variant === 'warning' ? 'Warning' : 'Info',
      description:
        variant === 'success'
          ? 'Operation completed successfully.'
          : variant === 'error'
            ? 'Something went wrong. Please retry.'
            : variant === 'warning'
              ? 'Heads up: check the details.'
              : 'Here is some neutral information.',
      variant
    })
  }

  return (
    <div className="container components">
      <BrandSwitcher />

      <h1 className="text-fluid-xl">Component Showcase</h1>
      <p className="text-responsive-base components__description">
        Production-ready, accessible components for building modern web applications
      </p>

      <Fieldset variant="outlined" gap="lg" className="components__fieldset">
        <Fieldset.Legend>Typewriter Component</Fieldset.Legend>
        <Fieldset.Content className="components__flex-column">
          <p className="components__description components__max-width">
            Use the typewriter effect for hero copy, headlines, or inline emphasis with configurable speed, delay, and looping.
          </p>

          <div className="components__grid--300">
            <Card variant="elevated" hoverable>
              <Card.Header>Default</Card.Header>
              <Card.Body className="components__typewriter-demo">
                <Typewriter text="Production-ready typewriter effect." />
              </Card.Body>
            </Card>

            <Card variant="outlined" hoverable>
              <Card.Header>Looping with Custom Speed</Card.Header>
              <Card.Body className="components__typewriter-demo components__flex-column--sm">
                <Typewriter
                  text="Modern. Accessible. Fast."
                  speed={80}
                  delay={150}
                  loop
                  pauseBetween={900}
                />
                <p className="components__card-text">
                  Adjust speed, delay, and loop to fit your tone.
                </p>
              </Card.Body>
            </Card>
          </div>
        </Fieldset.Content>
      </Fieldset>

      <section className="components__section">
        <h2 className="text-responsive-lg">Button Component</h2>

        <div className="components__subsection">
          <h3>Variants</h3>
          <div className="components__flex-group">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Sizes</h3>
          <div className="components__flex-group--center">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </div>

        <div className="components__subsection">
          <h3>States</h3>
          <div className="components__flex-group">
            <Button disabled>Disabled</Button>
            <Button loading={loading} onClick={handleAsyncAction}>
              {loading ? 'Loading...' : 'Click to Load'}
            </Button>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Double Outline</h3>
          <div className="components__flex-group">
            <Button variant="outline" doubleOutline>Outline Double</Button>
            <Button variant="primary" doubleOutline>Primary Double</Button>
            <Button variant="secondary" doubleOutline>Secondary Double</Button>
            <Button variant="danger" doubleOutline>Danger Double</Button>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Square (No Border Radius)</h3>
          <div className="components__flex-group">
            <Button variant="primary" square>Square Primary</Button>
            <Button variant="outline" square>Square Outline</Button>
            <Button variant="danger" square>Square Danger</Button>
            <Button variant="outline" square doubleOutline>Square Double</Button>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Icons</h3>
          <div className="components__flex-group">
            <Button variant="primary" leftIcon={<MdCheck />} rightIcon={<MdArrowForward />}>
              Save &amp; Continue
            </Button>
            <Button variant="outline" leftIcon={<MdSettings />}>
              Settings
            </Button>
            <Button variant="ghost" iconOnly aria-label="Preferences" leftIcon={<MdSettings />} />
          </div>
        </div>

        <div className="components__subsection">
          <h3>Full Width</h3>
          <div className="components__group">
            <Button fullWidth>Full Width Button</Button>
          </div>
        </div>
      </section>

      <section className="components__section">
        <h2 className="text-responsive-lg">Horizontal Scroll Component</h2>
        <p className="components__description">
          Scroll horizontally with snap alignment and optional navigation buttons. Great for card rails and media strips.
        </p>

        <div className="components__group">
          <HorizontalScroll ariaLabel="Feature highlights">
            {scrollItems.map((item) => (
              <Card
                key={item.title}
                variant="outlined"
                hoverable
                style={{ minWidth: '240px', flex: '0 0 auto' }}
              >
                <Card.Header>{item.title}</Card.Header>
                <Card.Body className="components__card-secondary">
                  {item.copy}
                </Card.Body>
              </Card>
            ))}
          </HorizontalScroll>
        </div>

        <div className="components__subsection">
          <h3>Mixed Card Styles</h3>
          <HorizontalScroll ariaLabel="Mixed card examples" gap="lg">
            <Card variant="elevated" hoverable style={{ maxWidth: '280px', flex: '0 0 auto' }}>
              <Card.Header>Elevated Design</Card.Header>
              <Card.Body>
                Elevated cards with shadow effects stand out beautifully in horizontal scrolls.
              </Card.Body>
              <Card.Footer>
                <Button size="sm">Explore</Button>
              </Card.Footer>
            </Card>

            <Card variant="filled" hoverable style={{ maxWidth: '280px', flex: '0 0 auto' }}>
              <Card.Header>Filled Style</Card.Header>
              <Card.Body>
                Subtle background colors create a softer, more integrated appearance in your layouts.
              </Card.Body>
              <Card.Footer>
                <Button size="sm" variant="outline">Learn More</Button>
              </Card.Footer>
            </Card>

            <Card variant="outlined" hoverable style={{ maxWidth: '280px', flex: '0 0 auto' }}>
              <Card.Header>Outlined Cards</Card.Header>
              <Card.Body>
                Emphasized borders provide clear visual separation between content sections.
              </Card.Body>
              <Card.Footer>
                <Button size="sm" variant="ghost">View</Button>
              </Card.Footer>
            </Card>

            <Card variant="default" hoverable style={{ maxWidth: '280px', flex: '0 0 auto' }}>
              <Card.Header>Default Variant</Card.Header>
              <Card.Body>
                Clean, minimal design that works perfectly for any type of content presentation.
              </Card.Body>
              <Card.Footer>
                <Button size="sm">Read More</Button>
              </Card.Footer>
            </Card>

            <Card variant="elevated" clickable onClick={() => alert('Card 5 clicked!')} style={{ maxWidth: '280px', flex: '0 0 auto' }}>
              <Card.Header>Interactive Card</Card.Header>
              <Card.Body>
                Clickable cards respond to user interaction with smooth animations and feedback.
              </Card.Body>
              <Card.Footer style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                Click anywhere to interact
              </Card.Footer>
            </Card>

            <Card variant="filled" hoverable rounded={false} style={{ maxWidth: '280px', flex: '0 0 auto' }}>
              <Card.Header>Sharp Corners</Card.Header>
              <Card.Body>
                Square cards offer a modern, geometric aesthetic for technical or formal content.
              </Card.Body>
              <Card.Footer>
                <Button size="sm" variant="outline">Details</Button>
              </Card.Footer>
            </Card>
          </HorizontalScroll>
        </div>
      </section>

      <section className="components__section">
        <h2 className="text-responsive-lg">Tooltip Component</h2>
        <p className="components__description">
          Hover or focus to see contextual help. Tooltips respect themes, motion preferences, and keyboard access.
        </p>

        <div className="components__grid--240">
          <Card variant="outlined">
            <Card.Header>Placements</Card.Header>
            <Card.Body className="components__flex-group">
              <Tooltip content="Top tooltip">
                <Button size="sm">Top</Button>
              </Tooltip>
              <Tooltip content="Right tooltip" position="right">
                <Button size="sm">Right</Button>
              </Tooltip>
              <Tooltip content="Bottom tooltip" position="bottom">
                <Button size="sm">Bottom</Button>
              </Tooltip>
              <Tooltip content="Left tooltip" position="left">
                <Button size="sm">Left</Button>
              </Tooltip>
            </Card.Body>
          </Card>

          <Card variant="outlined">
            <Card.Header>Alignment</Card.Header>
            <Card.Body className="components__flex-group">
              <Tooltip content="Aligned start" position="bottom" align="start">
                <Button size="sm">Start</Button>
              </Tooltip>
              <Tooltip content="Aligned center" position="bottom" align="center">
                <Button size="sm">Center</Button>
              </Tooltip>
              <Tooltip content="Aligned end" position="bottom" align="end">
                <Button size="sm">End</Button>
              </Tooltip>
            </Card.Body>
          </Card>

          <Card variant="outlined">
            <Card.Header>Controlled</Card.Header>
            <Card.Body className="components__flex-column--sm">
              <Tooltip content="Controlled tooltip" open={controlledTooltipOpen}>
                <Button size="sm" onClick={() => setControlledTooltipOpen((open) => !open)}>
                  {controlledTooltipOpen ? 'Hide Tooltip' : 'Show Tooltip'}
                </Button>
              </Tooltip>
              <p className="components__card-text">
                Click toggles visibility; hover/focus do not override controlled state.
              </p>
            </Card.Body>
          </Card>

          <Card variant="outlined">
            <Card.Header>Instant / Default Open</Card.Header>
            <Card.Body className="components__flex-group">
              <Tooltip content="Opens immediately" openDelay={0} closeDelay={0}>
                <Button size="sm">Instant</Button>
              </Tooltip>
              <Tooltip content="Visible by default" defaultOpen>
                <Button size="sm" variant="secondary">
                  Default Open
                </Button>
              </Tooltip>
            </Card.Body>
          </Card>
        </div>
      </section>

      <section className="components__section">
        <h2 className="text-responsive-lg">Toaster Component</h2>
        <p className="components__description">
          Fire off toast notifications with variants and default durations. Positioning and limits are handled by the provider.
        </p>

        <div className="components__grid--220">
          <Card variant="outlined">
            <Card.Header>Quick Triggers</Card.Header>
            <Card.Body className="components__flex-group--sm">
              <Button size="sm" onClick={() => triggerToast('success')}>Success</Button>
              <Button size="sm" variant="secondary" onClick={() => triggerToast('info')}>Info</Button>
              <Button size="sm" variant="outline" onClick={() => triggerToast('warning')}>Warning</Button>
              <Button size="sm" variant="danger" onClick={() => triggerToast('error')}>Error</Button>
            </Card.Body>
          </Card>
          <Card variant="outlined">
            <Card.Header>Example Copy</Card.Header>
            <Card.Body>
              <p className="components__card-text--normal">
                Toasts auto-dismiss after the default duration and are capped to the maximum queue size. Use them for lightweight, non-blocking feedback.
              </p>
            </Card.Body>
          </Card>
        </div>
      </section>

      <section className="components__section">
        <h2 className="text-responsive-lg">Link Component</h2>

        <div className="components__subsection">
          <h3>Variants</h3>
          <div className="components__flex-group">
            <Link to="/about" variant="primary">Primary Link</Link>
            <Link to="/about" variant="secondary">Secondary Link</Link>
            <Link to="/about" variant="subtle">Subtle Link</Link>
            <Link to="/about" variant="danger">Danger Link</Link>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Underline Styles</h3>
          <div className="components__flex-group">
            <Link to="/about" underline="none">No Underline</Link>
            <Link to="/about" underline="hover">Hover Underline</Link>
            <Link to="/about" underline="always">Always Underlined</Link>
          </div>
        </div>

        <div className="components__subsection">
          <h3>External Links</h3>
          <div className="components__flex-group">
            <Link href="https://react.dev">React Docs</Link>
            <Link href="https://vitejs.dev" openInNewTab>Vite Docs</Link>
            <Link href="https://github.com" variant="secondary" openInNewTab>GitHub</Link>
          </div>
        </div>

        <div className="components__subsection">
          <h3>States</h3>
          <div className="components__flex-group">
            <Link to="/about">Normal Link</Link>
            <Link to="/about" disabled>Disabled Link</Link>
          </div>
        </div>

        <div className="components__subsection">
          <h3>In Paragraphs</h3>
          <p className="components__paragraph">
            Links in paragraphs automatically get subtle underlines for better readability.
            For example, check out the <Link to="/components">components page</Link> or
            read our <Link to="/about">about section</Link> to learn more.
          </p>
        </div>
      </section>

      <section className="components__section">
        <h2 className="text-responsive-lg">Card Component</h2>

        <div className="components__subsection">
          <h3>Variants</h3>
          <div className="components__grid">
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

        <div className="components__subsection">
          <h3>Interactive Cards</h3>
          <div className="components__grid">
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

        <div className="components__subsection">
          <h3>Corner Styles</h3>
          <div className="components__grid">
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

        <div className="components__subsection">
          <h3>Card with Image</h3>
          <div className="components__grid--300">
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

        <div className="components__subsection">
          <h3>User Profile Cards</h3>
          <div className="components__grid--280">
            <Card variant="outlined">
              <Card.Body>
                <div className="components__user-profile-avatar">
                  <Avatar name="Sarah Johnson" size="lg" status="online" />
                  <div>
                    <h4 className="components__user-profile-name">Sarah Johnson</h4>
                    <p className="components__user-profile-role">
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
                <div className="components__user-profile-avatar">
                  <Avatar name="Michael Chen" size="lg" status="away" shape="rounded" />
                  <div>
                    <h4 className="components__user-profile-name">Michael Chen</h4>
                    <p className="components__user-profile-role">
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
                <div className="components__user-profile-avatar">
                  <Avatar name="Emily Rodriguez" size="lg" status="busy" />
                  <div>
                    <h4 className="components__user-profile-name">Emily Rodriguez</h4>
                    <p className="components__user-profile-role">
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

      <section className="components__section">
        <h2 className="text-responsive-lg">Accordion Component</h2>

        <div className="components__subsection">
          <h3>Variants</h3>
          <div className="components__grid--gap-2">
            <div>
              <h4 className="components__section-label">Default</h4>
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
              <h4 className="components__section-label">Outlined</h4>
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
              <h4 className="components__section-label">Filled</h4>
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

        <div className="components__subsection">
          <h3>Corner Styles</h3>
          <div className="components__grid--gap-2">
            <div>
              <h4 className="components__section-label">Rounded (Default)</h4>
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
              <h4 className="components__section-label">Square</h4>
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

        <div className="components__subsection">
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

        <div className="components__subsection">
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

      <section className="components__section">
        <h2 className="text-responsive-lg">Dialog Component</h2>

        <div className="components__subsection">
          <h3>Basic Dialog</h3>
          <div className="components__group">
            <Button onClick={() => setDialogOpen(true)}>Open Basic Dialog</Button>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
              <Dialog.Header>
                <h2>Welcome</h2>
              </Dialog.Header>
              <Dialog.Body>
                This is a professional dialog component built on the native HTML dialog element.
                It features smooth animations, focus management, and full accessibility support.
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setDialogOpen(false)}>
                  Confirm
                </Button>
              </Dialog.Footer>
            </Dialog>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Dialog Sizes</h3>
          <div className="components__flex-group">
            <Button size="sm" onClick={() => setSizeDialogOpen(true)}>Open Large Dialog</Button>

            <Dialog open={sizeDialogOpen} onClose={() => setSizeDialogOpen(false)} size="lg">
              <Dialog.Header>
                <h2>Large Dialog</h2>
              </Dialog.Header>
              <Dialog.Body>
                <p>This is a large dialog (720px wide on desktop, full width on mobile).</p>
                <p className="components__group">
                  Dialogs support multiple sizes: sm (400px), md (560px), lg (720px), xl (960px), and full (viewport).
                </p>
                <p className="components__group">
                  All sizes are responsive and adapt to smaller screens automatically.
                </p>
              </Dialog.Body>
              <Dialog.Footer>
                <Button onClick={() => setSizeDialogOpen(false)}>Close</Button>
              </Dialog.Footer>
            </Dialog>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Confirmation Dialog</h3>
          <div className="components__group">
            <Button variant="danger" onClick={() => setConfirmDialogOpen(true)}>
              Delete Item
            </Button>

            <Dialog
              open={confirmDialogOpen}
              onClose={() => setConfirmDialogOpen(false)}
              size="sm"
              variant="centered"
            >
              <Dialog.Header>
                <h2>Confirm Deletion</h2>
              </Dialog.Header>
              <Dialog.Body>
                Are you sure you want to delete this item? This action cannot be undone.
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => setConfirmDialogOpen(false)}>
                  Delete
                </Button>
              </Dialog.Footer>
            </Dialog>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Form Dialog</h3>
          <div className="components__group">
            <Button onClick={() => setFormDialogOpen(true)}>Add New Item</Button>

            <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} size="md">
              <Dialog.Header>
                <h2>Add New Item</h2>
              </Dialog.Header>
              <Dialog.Body>
                <form
                  id="item-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    setFormDialogOpen(false)
                  }}
                  className="components__flex-column--md"
                >
                  <div>
                    <label htmlFor="item-name" className="components__label">
                      Name:
                    </label>
                    <input
                      id="item-name"
                      type="text"
                      required
                      style={{
                        width: '100%',
                        padding: 'var(--spacing-sm)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--border-radius-sm)',
                        fontSize: 'var(--font-size-base)',
                        fontFamily: 'var(--font-sans)',
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="item-description" className="components__label">
                      Description:
                    </label>
                    <textarea
                      id="item-description"
                      rows="4"
                      style={{
                        width: '100%',
                        padding: 'var(--spacing-sm)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--border-radius-sm)',
                        fontSize: 'var(--font-size-base)',
                        fontFamily: 'var(--font-sans)',
                        resize: 'vertical',
                      }}
                    ></textarea>
                  </div>
                </form>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setFormDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" form="item-form">
                  Save
                </Button>
              </Dialog.Footer>
            </Dialog>
          </div>
        </div>

        <div className="components__info-box">
          <h4 className="components__info-title">Dialog Features</h4>
          <ul className="components__info-list">
            <li>Built on native HTML &lt;dialog&gt; element</li>
            <li>Smooth scale-in and backdrop fade animations</li>
            <li>Close on ESC key (configurable)</li>
            <li>Close on backdrop click (configurable)</li>
            <li>Automatic focus trap and management</li>
            <li>Multiple sizes: sm, md, lg, xl, full</li>
            <li>Responsive on all screen sizes</li>
            <li>Full keyboard and screen reader support</li>
          </ul>
        </div>
      </section>

      <section className="components__section">
        <h2 className="text-responsive-lg">Fieldset Component</h2>

        <div className="components__subsection">
          <h3>Basic Fieldset</h3>
          <Fieldset>
            <Fieldset.Legend>Contact Information</Fieldset.Legend>
            <Fieldset.Content>
              <input
                type="text"
                placeholder="Name"
                style={{
                  flex: '1 1 250px',
                  padding: 'var(--spacing-sm)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: 'var(--font-size-base)',
                }}
              />
              <input
                type="email"
                placeholder="Email"
                style={{
                  flex: '1 1 250px',
                  padding: 'var(--spacing-sm)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: 'var(--font-size-base)',
                }}
              />
              <input
                type="tel"
                placeholder="Phone"
                style={{
                  flex: '1 1 200px',
                  padding: 'var(--spacing-sm)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: 'var(--font-size-base)',
                }}
              />
            </Fieldset.Content>
          </Fieldset>
        </div>

        <div className="components__subsection">
          <h3>Variants</h3>
          <div className="components__grid">
            <div>
              <h4 className="components__section-label">Default</h4>
              <Fieldset variant="default">
                <Fieldset.Legend>Default Style</Fieldset.Legend>
                <Fieldset.Content>
                  <Button size="sm">Button 1</Button>
                  <Button size="sm" variant="outline">Button 2</Button>
                  <Button size="sm" variant="ghost">Button 3</Button>
                </Fieldset.Content>
              </Fieldset>
            </div>

            <div>
              <h4 className="components__section-label">Outlined</h4>
              <Fieldset variant="outlined">
                <Fieldset.Legend>Outlined Style</Fieldset.Legend>
                <Fieldset.Content>
                  <Button size="sm">Button 1</Button>
                  <Button size="sm" variant="outline">Button 2</Button>
                  <Button size="sm" variant="ghost">Button 3</Button>
                </Fieldset.Content>
              </Fieldset>
            </div>

            <div>
              <h4 className="components__section-label">Filled</h4>
              <Fieldset variant="filled">
                <Fieldset.Legend>Filled Style</Fieldset.Legend>
                <Fieldset.Content>
                  <Button size="sm">Button 1</Button>
                  <Button size="sm" variant="outline">Button 2</Button>
                  <Button size="sm" variant="ghost">Button 3</Button>
                </Fieldset.Content>
              </Fieldset>
            </div>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Gap Sizes</h3>
          <div className="components__grid">
            <div>
              <h4 className="components__section-label">Small Gap</h4>
              <Fieldset variant="outlined" gap="sm">
                <Fieldset.Legend>Gap: Small</Fieldset.Legend>
                <Fieldset.Content>
                  <Button size="sm">Save</Button>
                  <Button size="sm" variant="outline">Cancel</Button>
                  <Button size="sm" variant="danger">Delete</Button>
                </Fieldset.Content>
              </Fieldset>
            </div>

            <div>
              <h4 className="components__section-label">Medium Gap (Default)</h4>
              <Fieldset variant="outlined" gap="md">
                <Fieldset.Legend>Gap: Medium</Fieldset.Legend>
                <Fieldset.Content>
                  <Button size="sm">Save</Button>
                  <Button size="sm" variant="outline">Cancel</Button>
                  <Button size="sm" variant="danger">Delete</Button>
                </Fieldset.Content>
              </Fieldset>
            </div>

            <div>
              <h4 className="components__section-label">Large Gap</h4>
              <Fieldset variant="outlined" gap="lg">
                <Fieldset.Legend>Gap: Large</Fieldset.Legend>
                <Fieldset.Content>
                  <Button size="sm">Save</Button>
                  <Button size="sm" variant="outline">Cancel</Button>
                  <Button size="sm" variant="danger">Delete</Button>
                </Fieldset.Content>
              </Fieldset>
            </div>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Flex Wrapping</h3>
          <Fieldset variant="outlined">
            <Fieldset.Legend>Responsive Form Fields</Fieldset.Legend>
            <Fieldset.Content>
              <input
                type="text"
                placeholder="First Name"
                style={{
                  flex: '1 1 200px',
                  padding: 'var(--spacing-sm)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: 'var(--font-size-base)',
                }}
              />
              <input
                type="text"
                placeholder="Last Name"
                style={{
                  flex: '1 1 200px',
                  padding: 'var(--spacing-sm)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: 'var(--font-size-base)',
                }}
              />
              <input
                type="email"
                placeholder="Email Address"
                style={{
                  flex: '1 1 300px',
                  padding: 'var(--spacing-sm)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: 'var(--font-size-base)',
                }}
              />
              <input
                type="tel"
                placeholder="Phone Number"
                style={{
                  flex: '1 1 200px',
                  padding: 'var(--spacing-sm)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: 'var(--font-size-base)',
                }}
              />
            </Fieldset.Content>
          </Fieldset>
        </div>

        <div className="components__subsection">
          <h3>Disabled State</h3>
          <Fieldset variant="outlined" disabled>
            <Fieldset.Legend>Disabled Form Section</Fieldset.Legend>
            <Fieldset.Content>
              <input
                type="text"
                placeholder="Disabled Input"
                style={{
                  flex: '1 1 200px',
                  padding: 'var(--spacing-sm)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: 'var(--font-size-base)',
                }}
              />
              <input
                type="email"
                placeholder="Disabled Email"
                style={{
                  flex: '1 1 200px',
                  padding: 'var(--spacing-sm)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: 'var(--font-size-base)',
                }}
              />
              <Button size="sm">Disabled Button</Button>
            </Fieldset.Content>
          </Fieldset>
        </div>

        <div className="components__info-box">
          <h4 className="components__info-title">Fieldset Features</h4>
          <ul className="components__info-list">
            <li>Built on native HTML &lt;fieldset&gt; and &lt;legend&gt; elements</li>
            <li>Legend naturally breaks the border</li>
            <li>Flex content layout with automatic wrapping</li>
            <li>Configurable gap sizes (sm, md, lg, xl)</li>
            <li>Multiple variants (default, outlined, filled)</li>
            <li>Native disabled state for all form controls</li>
            <li>Fully accessible and semantic HTML</li>
            <li>Responsive on all screen sizes</li>
          </ul>
        </div>
      </section>

      <section className="components__section">
        <h2 className="text-responsive-lg">Input Component</h2>

        <div className="components__subsection">
          <h3>Floating Label Animation</h3>
          <div className="components__grid-inputs">
            <Input
              label="Email Address"
              placeholder="Enter your email"
              type="email"
              id="demo-email"
            />
            <Input
              label="Full Name"
              placeholder="John Doe"
              type="text"
              id="demo-name"
            />
            <Input
              label="Password"
              placeholder="Enter password"
              type="password"
              id="demo-password"
            />
            <Input
              label="Search"
              placeholder="Search"
              leftIcon={<MdSearch />}
              id="demo-search"
            />
          </div>
          <p className="components__footer-note">
            Labels automatically float (shrink and move outside) when you focus or type in the input.
            Placeholders appear in very light text (30% opacity).
          </p>
        </div>

        <div className="components__subsection">
          <h3>Variants</h3>
          <div className="components__grid">
            <div>
              <h4 className="components__section-label">Default</h4>
              <div className="components__max-width">
                <Input
                  label="Default Input"
                  placeholder="Subtle 1px border"
                  variant="default"
                  id="variant-default"
                />
              </div>
            </div>

            <div>
              <h4 className="components__section-label">Outlined</h4>
              <div className="components__max-width">
                <Input
                  label="Outlined Input"
                  placeholder="Emphasized 2px border"
                  variant="outlined"
                  id="variant-outlined"
                />
              </div>
            </div>

            <div>
              <h4 className="components__section-label">Filled</h4>
              <div className="components__max-width">
                <Input
                  label="Filled Input"
                  placeholder="Subtle background color"
                  variant="filled"
                  id="variant-filled"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Sizes</h3>
          <div className="components__grid-inputs">
            <Input
              label="Small Input"
              placeholder="Compact size for tight spaces"
              size="sm"
              id="size-sm"
            />
            <Input
              label="Medium Input (Default)"
              placeholder="Standard size for most use cases"
              size="md"
              id="size-md"
            />
            <Input
              label="Large Input"
              placeholder="Prominent size for key fields"
              size="lg"
              id="size-lg"
            />
          </div>
        </div>

        <div className="components__subsection">
          <h3>Error States</h3>
          <div className="components__grid-inputs">
            <Input
              label="Email"
              placeholder="email@example.com"
              type="email"
              error="Please enter a valid email address"
              defaultValue="invalid-email"
              id="error-email"
            />
            <Input
              label="Username"
              placeholder="Choose a username"
              error="This username is already taken"
              defaultValue="admin"
              id="error-username"
            />
          </div>
          <p className="components__footer-note">
            Error messages are announced to screen readers and displayed with clear visual indicators.
          </p>
        </div>

        <div className="components__subsection">
          <h3>Helper Text</h3>
          <div className="components__grid-inputs">
            <Input
              label="Password"
              placeholder="Enter a secure password"
              type="password"
              helperText="Must be at least 8 characters with uppercase, lowercase, and numbers"
              id="helper-password"
            />
            <Input
              label="Phone Number"
              placeholder="(555) 123-4567"
              type="tel"
              helperText="Include area code for faster verification"
              id="helper-phone"
            />
          </div>
        </div>

        <div className="components__subsection">
          <h3>Required Fields</h3>
          <div className="components__grid-inputs">
            <Input
              label="Email Address"
              placeholder="your@email.com"
              type="email"
              required
              id="required-email"
            />
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              required
              id="required-name"
            />
          </div>
          <p className="components__footer-note">
            Required fields are marked with a red asterisk (*) and have the required HTML attribute.
          </p>
        </div>

        <div className="components__subsection">
          <h3>Input Types</h3>
          <div className="components__grid-inputs">
            <Input
              label="Email"
              type="email"
              placeholder="user@example.com"
              id="type-email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              id="type-password"
            />
            <Input
              label="Number"
              type="number"
              placeholder="Enter a number"
              id="type-number"
            />
            <Input
              label="Telephone"
              type="tel"
              placeholder="(555) 123-4567"
              id="type-tel"
            />
            <Input
              label="URL"
              type="url"
              placeholder="https://example.com"
              id="type-url"
            />
            <Input
              label="Search"
              type="search"
              placeholder="Search..."
              id="type-search"
            />
          </div>
          <p className="components__footer-note">
            Using the correct input type improves mobile keyboards and built-in browser validation.
          </p>
        </div>

        <div className="components__subsection">
          <h3>Disabled State</h3>
          <div className="components__grid-inputs">
            <Input
              label="Disabled Input"
              value="You cannot edit this field"
              disabled
              id="disabled-1"
            />
            <Input
              label="Account Type"
              value="Premium Member"
              disabled
              helperText="Contact support to change your account type"
              id="disabled-2"
            />
          </div>
        </div>

        <div className="components__subsection">
          <h3>Full Width</h3>
          <div className="components__group">
            <Input
              label="Full Width Input"
              placeholder="Takes the full width of its container"
              fullWidth
              id="fullwidth-1"
            />
          </div>
          <div className="components__group">
            <Input
              label="Newsletter Signup"
              placeholder="Enter your email to subscribe"
              type="email"
              fullWidth
              helperText="We'll never share your email with anyone else"
              id="fullwidth-2"
            />
          </div>
        </div>

        <div className="components__subsection">
          <h3>Form Example</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              alert('Form submitted!')
            }}
            style={{ marginTop: '1rem', maxWidth: '600px' }}
          >
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <Input
                label="First Name"
                placeholder="John"
                required
                id="form-firstname"
              />
              <Input
                label="Last Name"
                placeholder="Doe"
                required
                id="form-lastname"
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="john.doe@example.com"
                required
                helperText="We'll send confirmation to this email"
                id="form-email"
              />
              <Input
                label="Password"
                type="password"
                placeholder="Create a secure password"
                required
                helperText="Minimum 8 characters"
                id="form-password"
              />
              <Input
                label="Phone Number"
                type="tel"
                placeholder="(555) 123-4567"
                id="form-phone"
              />
              <div className="components__group">
                <Button type="submit" fullWidth>
                  Create Account
                </Button>
              </div>
            </div>
          </form>
        </div>

        <div className="components__info-box">
          <h4 className="components__info-title">Input Features</h4>
          <ul className="components__info-list">
            <li>Smooth floating label animation (shrinks to 75% and moves outside)</li>
            <li>Very light placeholder text (30% opacity) separate from label</li>
            <li>Three variants: default, outlined, filled</li>
            <li>Three sizes: sm, md, lg</li>
            <li>Error states with red border and descriptive messages</li>
            <li>Helper text for additional guidance</li>
            <li>Required field indicator (red asterisk)</li>
            <li>Full support for all HTML input types</li>
            <li>Disabled state with reduced opacity</li>
            <li>Full width option for responsive layouts</li>
            <li>Ref forwarding for programmatic focus</li>
            <li>Full ARIA attributes and accessibility support</li>
          </ul>
        </div>
      </section>

      <section className="components__section">
        <h2 className="text-responsive-lg">Tickbox Component</h2>
        <p className="text-responsive-base components__description">
          A custom-styled, accessible checkbox component.
        </p>

        <div className="components__subsection">
          <h3>Sizes</h3>
          <div className="components__flex-column">
            <Tickbox id="tick-sm" size="sm" label="Small Tickbox" checked={tickboxSizeSmChecked} onChange={handleTickboxSizeSmChange} />
            <Tickbox id="tick-md" size="md" label="Medium Tickbox (Default)" checked={tickboxSizeMdChecked} onChange={handleTickboxSizeMdChange} />
            <Tickbox id="tick-lg" size="lg" label="Large Tickbox" checked={tickboxSizeLgChecked} onChange={handleTickboxSizeLgChange} />
          </div>
        </div>

        <div className="components__subsection">
          <h3>States</h3>
          <div className="components__flex-column">
            <Tickbox
              id="unchecked"
              label="Unchecked"
              checked={tickboxState.unchecked}
              onChange={handleTickboxChange}
            />
            <Tickbox
              id="checked"
              label="Checked"
              checked={tickboxState.checked}
              onChange={handleTickboxChange}
            />
            <Tickbox
              id="tick-indeterminate"
              label="Indeterminate"
              indeterminate={true}
              checked={tickboxIndeterminateChecked}
              onChange={handleTickboxIndeterminateChange}
            />
            <Tickbox id="tick-disabled" label="Disabled" disabled /> {/* No `checked` prop, so not controlled */}
            <Tickbox
              id="tick-disabled-checked"
              label="Disabled & Checked"
              disabled
              checked={tickboxDisabledCheckedState}
              onChange={handleTickboxDisabledCheckedChange}
            />
            <Tickbox
              id="tick-disabled-indeterminate"
              label="Disabled & Indeterminate"
              disabled
              indeterminate
              checked={tickboxDisabledIndeterminateChecked}
              onChange={handleTickboxDisabledIndeterminateChange}
            />
          </div>
        </div>
      </section>

      <section className="components__section">
        <h2 className="text-responsive-lg">Radio Component</h2>
        <p className="text-responsive-base components__description">
          A custom-styled, accessible radio button component for single-selection choices.
        </p>

        <div className="components__subsection">
          <h3>Sizes</h3>
          <div className="components__flex-column">
            <Radio
              id="radio-size-sm"
              name="radio-sizes"
              value="sm"
              label="Small Radio"
              size="sm"
              checked={selectedRadioSize === 'sm'}
              onChange={handleRadioSizeChange}
            />
            <Radio
              id="radio-size-md"
              name="radio-sizes"
              value="md"
              label="Medium Radio (Default)"
              size="md"
              checked={selectedRadioSize === 'md'}
              onChange={handleRadioSizeChange}
            />
            <Radio
              id="radio-size-lg"
              name="radio-sizes"
              value="lg"
              label="Large Radio"
              size="lg"
              checked={selectedRadioSize === 'lg'}
              onChange={handleRadioSizeChange}
            />
          </div>
        </div>

        <div className="components__subsection">
          <h3>States</h3>
          <div className="components__flex-column">
            <Radio
              id="radio-state-active"
              name="radio-states"
              value="active"
              label="Active Radio"
              checked={selectedRadioState === 'active'}
              onChange={handleRadioStateChange}
            />
            <Radio
              id="radio-state-disabled"
              name="radio-states"
              value="disabled"
              label="Disabled Radio"
              disabled
              checked={selectedRadioState === 'disabled'}
              onChange={handleRadioStateChange}
            />
            <Radio
              id="radio-state-disabled-checked"
              name="radio-states"
              value="disabled-checked"
              label="Disabled & Checked"
              disabled
              checked={true}
              onChange={handleRadioStateChange}
            />
          </div>
        </div>

        <div className="components__subsection">
          <h3>Radio Group</h3>
          <fieldset className="components__dialog-content">
            <legend style={{ padding: '0 0.5rem', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text)' }}>Choose an Option:</legend>
            <div className="components__flex-column">
              <Radio
                id="radio-opt1"
                name="radio-options"
                value="option1"
                label="Option 1"
                checked={selectedRadioOption === 'option1'}
                onChange={handleRadioOptionChange}
              />
              <Radio
                id="radio-opt2"
                name="radio-options"
                value="option2"
                label="Option 2"
                checked={selectedRadioOption === 'option2'}
                onChange={handleRadioOptionChange}
              />
              <Radio
                id="radio-opt3"
                name="radio-options"
                value="option3"
                label="Option 3"
                checked={selectedRadioOption === 'option3'}
                onChange={handleRadioOptionChange}
              />
            </div>
          </fieldset>
        </div>
      </section>

      <section className="components__section">
        <h2 className="text-responsive-lg">Spinner Component</h2>
        <p className="text-responsive-base components__description">
          A simple, accessible loading spinner for indicating ongoing processes.
        </p>

        <div className="components__subsection">
          <h3>Sizes</h3>
          <div className="components__flex-group--center-spaced">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </div>
        </div>

        <div className="components__subsection">
          <h3>Colors</h3>
          <div className="components__flex-group--center-spaced">
            <Spinner color="primary" />
            <Spinner color="secondary" />
            <Spinner color="success" />
            <Spinner color="danger" />
            <Spinner color="info" />
            <div style={{ color: 'purple' }}>
              <Spinner color="inherit" />
            </div>
          </div>
        </div>

        <div className="components__subsection">
          <h3>In Buttons</h3>
          <div className="components__flex-group--center-spaced">
            <Button loading>
              <Spinner size="sm" color="inherit" /> Loading
            </Button>
            <Button variant="outline" loading>
              <Spinner size="sm" color="inherit" /> Loading
            </Button>
            <Button variant="danger" loading>
              <Spinner size="sm" color="inherit" /> Loading
            </Button>
          </div>
        </div>
      </section>

      <section className="components__section">
        <h2 className="text-responsive-lg">Status Component</h2>
        <p className="text-responsive-base components__description">
          A flexible status indicator with circle and optional inline text for showing states and activity.
        </p>

        <div className="components__subsection">
          <h3>Variants</h3>
          <div className="components__flex-column">
            <Status variant="success">Active</Status>
            <Status variant="warning">Pending</Status>
            <Status variant="error">Failed</Status>
            <Status variant="info">Processing</Status>
            <Status variant="neutral">Inactive</Status>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Sizes</h3>
          <div className="components__flex-column">
            <Status variant="success" size="sm">Small Status</Status>
            <Status variant="info" size="md">Medium Status (Default)</Status>
            <Status variant="warning" size="lg">Large Status</Status>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Indicator Only (No Text)</h3>
          <div className="components__flex-group">
            <Status variant="success" />
            <Status variant="warning" />
            <Status variant="error" />
            <Status variant="info" />
            <Status variant="neutral" />
          </div>
        </div>

        <div className="components__subsection">
          <h3>With Icons</h3>
          <div className="components__flex-group components__flex-wrap">
            <Status variant="success" showIcon>
              Healthy
            </Status>
            <Status variant="warning" showIcon>
              Pending
            </Status>
            <Status variant="error" showIcon>
              Action Needed
            </Status>
            <Status variant="info" showIcon>
              Info
            </Status>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Pulse Animation</h3>
          <div className="components__flex-column">
            <Status variant="success" pulse>Online</Status>
            <Status variant="error" pulse>Alert</Status>
            <Status variant="info" pulse>Syncing</Status>
          </div>
        </div>

        <div className="components__subsection">
          <h3>User Status Examples</h3>
          <div className="components__grid--280">
            <Card variant="outlined">
              <Card.Body>
                <div className="components__user-profile-avatar">
                  <Avatar name="Sarah Johnson" size="lg" />
                  <div>
                    <h4 className="components__user-profile-name">Sarah Johnson</h4>
                    <Status variant="success" size="sm">Online</Status>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Card variant="outlined">
              <Card.Body>
                <div className="components__user-profile-avatar">
                  <Avatar name="Michael Chen" size="lg" />
                  <div>
                    <h4 className="components__user-profile-name">Michael Chen</h4>
                    <Status variant="warning" size="sm">Away</Status>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Card variant="outlined">
              <Card.Body>
                <div className="components__user-profile-avatar">
                  <Avatar name="Emily Rodriguez" size="lg" />
                  <div>
                    <h4 className="components__user-profile-name">Emily Rodriguez</h4>
                    <Status variant="error" size="sm">Busy</Status>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>

        <div className="components__subsection">
          <h3>System Status Examples</h3>
          <div className="components__grid">
            <Card variant="filled">
              <Card.Header>Server Status</Card.Header>
              <Card.Body className="components__flex-column">
                <Status variant="success">API Server: Running</Status>
                <Status variant="success">Database: Connected</Status>
                <Status variant="warning">Cache: Warming Up</Status>
              </Card.Body>
            </Card>

            <Card variant="filled">
              <Card.Header>Deployment Pipeline</Card.Header>
              <Card.Body className="components__flex-column">
                <Status variant="success">Build: Passed</Status>
                <Status variant="info" pulse>Tests: Running</Status>
                <Status variant="neutral">Deploy: Waiting</Status>
              </Card.Body>
            </Card>

            <Card variant="filled">
              <Card.Header>Service Health</Card.Header>
              <Card.Body className="components__flex-column">
                <Status variant="success">Authentication: Healthy</Status>
                <Status variant="error">Email Service: Down</Status>
                <Status variant="success">File Storage: Healthy</Status>
              </Card.Body>
            </Card>
          </div>
        </div>

        <div className="components__info-box">
          <h4 className="components__info-title">Status Features</h4>
          <ul className="components__info-list">
            <li>Circle indicator with optional inline text</li>
            <li>Five variants: success, warning, error, info, neutral</li>
            <li>Three sizes: sm, md, lg</li>
            <li>Optional pulse animation for active states</li>
            <li>Flexible - works with or without text label</li>
            <li>Full accessibility with role="status" and ARIA labels</li>
            <li>Respects prefers-reduced-motion for animations</li>
            <li>High contrast mode support</li>
          </ul>
        </div>
      </section>

      <section className="components__section">
        <h2 className="text-responsive-lg">Select Component</h2>
        <p className="text-responsive-base components__description">
          A custom-styled, accessible select dropdown component.
        </p>

        <div className="components__subsection">
          <h3>Basic Select</h3>
          <div className="components__max-width--400">
            <Select
              id="basic-select"
              label="Choose a Framework"
              value={selectValue}
              onChange={handleSelectChange}
              options={[
                { value: 'react', label: 'React' },
                { value: 'vue', label: 'Vue' },
                { value: 'angular', label: 'Angular' },
                { value: 'svelte', label: 'Svelte' },
              ]}
              placeholder="Select a framework..."
            />
          </div>
        </div>

        <div className="components__subsection">
          <h3>Sizes</h3>
          <div className="components__grid--narrow-max">
            <Select
              id="select-sm"
              size="sm"
              label="Small"
              options={[
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' },
                { value: 'option3', label: 'Option 3' },
              ]}
              placeholder="Small Select"
            />
            <Select
              id="select-md"
              size="md"
              label="Medium"
              options={[
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' },
                { value: 'option3', label: 'Option 3' },
              ]}
              placeholder="Medium Select"
            />
            <Select
              id="select-lg"
              size="lg"
              label="Large"
              options={[
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' },
                { value: 'option3', label: 'Option 3' },
              ]}
              placeholder="Large Select"
            />
          </div>
        </div>

        <div className="components__subsection">
          <h3>States</h3>
          <div className="components__grid--narrow-max">
            <Select
              id="select-error"
              label="Error State"
              options={[
                { value: 'red', label: 'Red' },
                { value: 'blue', label: 'Blue' },
                { value: 'green', label: 'Green' },
              ]}
              placeholder="Select an option"
              error="This field is required"
            />
            <Select
              id="select-helper"
              label="With Helper Text"
              options={[
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' },
              ]}
              placeholder="Select an option"
              helperText="Choose the best option for your project."
            />
            <Select
              id="select-disabled"
              label="Disabled State"
              options={[
                { value: 'disabled1', label: 'Option 1' },
                { value: 'disabled2', label: 'Option 2' },
                { value: 'disabled3', label: 'Option 3' },
              ]}
              placeholder="Disabled"
              disabled
            />
          </div>
        </div>
      </section>

      <section className="components__coming-soon-section">
        <h2 className="text-responsive-lg">Coming Soon</h2>
        <p className="components__description">
          More components are being built following the same production-ready standards:
        </p>
        <ul className="components__list-text">
          <li>Tables & Data Grids</li>
          <li>Tooltips & Popovers</li>
          <li>Select & Dropdown menus</li>
          <li>Checkbox & Radio buttons</li>
          <li>And more...</li>
        </ul>
      </section>
    </div>
  )
}

export default Components
