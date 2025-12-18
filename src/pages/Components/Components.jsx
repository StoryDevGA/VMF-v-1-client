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
import { Stepper } from '../../components/Stepper'
import { Table } from '../../components/Table'
import { TabView } from '../../components/TabView'
import { MdCheck, MdArrowForward, MdSettings, MdSearch, MdEdit, MdDelete } from 'react-icons/md'
import './Components.css'

const DemoSection = ({ title, description, children }) => (
  <Fieldset variant="outlined" gap="lg" className="components__section">
    <Fieldset.Legend>{title}</Fieldset.Legend>
    <Fieldset.Content className="components__section-content">
      {description ? (
        <p className="text-responsive-base components__description">
          {description}
        </p>
      ) : null}
      {children}
    </Fieldset.Content>
  </Fieldset>
)

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
  const [controlledTooltipOpen, setControlledTooltipOpen] = useState(false)

  // Stepper state
  const [stepperHorizontalActive, setStepperHorizontalActive] = useState(0)
  const [stepperVerticalActive, setStepperVerticalActive] = useState(0)

  // Table state
  const [tableSelectedRows, setTableSelectedRows] = useState(new Set())
  const [tableLoading, setTableLoading] = useState(false)

  // Sample table data
  const tableUsers = [
    { id: 1, name: 'Sarah Johnson', email: 'sarah.j@example.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Michael Chen', email: 'michael.c@example.com', role: 'Editor', status: 'Active' },
    { id: 3, name: 'Emily Rodriguez', email: 'emily.r@example.com', role: 'Viewer', status: 'Inactive' },
    { id: 4, name: 'David Kim', email: 'david.k@example.com', role: 'Editor', status: 'Active' },
    { id: 5, name: 'Lisa Anderson', email: 'lisa.a@example.com', role: 'Admin', status: 'Active' },
  ]

  // Disabled tickbox states (read-only)
  const tickboxDisabledCheckedState = true
  const tickboxDisabledIndeterminateChecked = false

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

  // Stepper handlers - Horizontal
  const handleHorizontalNext = (currentIndex) => {
    setStepperHorizontalActive(currentIndex + 1)
  }

  const handleHorizontalPrev = (currentIndex) => {
    setStepperHorizontalActive(currentIndex - 1)
  }

  // Stepper handlers - Vertical
  const handleVerticalNext = (currentIndex) => {
    setStepperVerticalActive(currentIndex + 1)
  }

  const handleVerticalPrev = (currentIndex) => {
    setStepperVerticalActive(currentIndex - 1)
  }

  // Table handlers
  const handleTableEdit = (row) => {
    addToast({
      title: 'Edit User',
      description: `Editing ${row.name}`,
      variant: 'info'
    })
  }

  const handleTableDelete = (row) => {
    addToast({
      title: 'Delete User',
      description: `Deleted ${row.name}`,
      variant: 'success'
    })
  }

  const handleTableLoadData = () => {
    setTableLoading(true)
    setTimeout(() => setTableLoading(false), 2000)
  }

  return (
    <div className="container components">
      <BrandSwitcher />

      <h1 className="text-fluid-xl">Component Showcase</h1>
      <p className="text-responsive-base components__description">
        Production-ready, accessible components for building modern web applications
      </p>

      <DemoSection
        title="Typewriter Component"
        description="Use the typewriter effect for hero copy, headlines, or inline emphasis with configurable speed, delay, and looping."
      >
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
      </DemoSection>

      <DemoSection title="Button Component">

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
      </DemoSection>

      <DemoSection
        title="Horizontal Scroll Component"
        description="Scroll horizontally with snap alignment and optional navigation buttons. Great for card rails and media strips."
      >

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
      </DemoSection>

      <DemoSection
        title="Tooltip Component"
        description="Hover or focus to see contextual help. Tooltips respect themes, motion preferences, and keyboard access."
      >

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
      </DemoSection>

      <DemoSection
        title="Toaster Component"
        description="Fire off toast notifications with variants and default durations. Positioning and limits are handled by the provider."
      >

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
      </DemoSection>

      <DemoSection title="Link Component">

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
      </DemoSection>

      <DemoSection title="Card Component">

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
      </DemoSection>

      <DemoSection title="Accordion Component">

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
      </DemoSection>

      <DemoSection title="Dialog Component">

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
      </DemoSection>

      <DemoSection title="Fieldset Component">

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
      </DemoSection>

      <DemoSection title="Input Component">
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
      </DemoSection>

      <DemoSection
        title="Tickbox Component"
        description="A custom-styled, accessible checkbox component."
      >

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
      </DemoSection>

      <DemoSection
        title="Radio Component"
        description="A custom-styled, accessible radio button component for single-selection choices."
      >

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
      </DemoSection>

      <DemoSection
        title="Spinner Component"
        description="A simple, accessible loading spinner for indicating ongoing processes."
      >

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
          <h3>Types</h3>
          <div className="components__flex-group--center-spaced">
            <Spinner type="circle" />
            <Spinner type="pinwheel" />
          </div>
        </div>

        <div className="components__subsection">
          <h3>Pinwheel Sizes</h3>
          <div className="components__flex-group--center-spaced">
            <Spinner type="pinwheel" size="sm" />
            <Spinner type="pinwheel" size="md" />
            <Spinner type="pinwheel" size="lg" />
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

        <div className="components__subsection">
          <h3>With Background Colors</h3>
          <div className="components__flex-group--center-spaced">
            <Spinner backgroundColor="rgba(0, 123, 255, 0.1)" color="primary" />
            <Spinner backgroundColor="rgba(40, 167, 69, 0.1)" color="success" />
            <Spinner backgroundColor="rgba(220, 53, 69, 0.1)" color="danger" />
          </div>
        </div>

        <div className="components__subsection">
          <h3>Round Background Options</h3>
          <div className="components__flex-group--center-spaced">
            <Spinner
              backgroundColor="rgba(220, 53, 69, 0.15)"
              color="danger"
              style={{ borderRadius: '50%', padding: '0.5rem' }}
            />
            <Spinner
              backgroundColor="rgba(0, 123, 255, 0.15)"
              color="primary"
              style={{ borderRadius: '50%', padding: '0.5rem' }}
            />
            <Spinner
              backgroundColor="rgba(40, 167, 69, 0.15)"
              color="success"
              style={{ borderRadius: '50%', padding: '0.75rem' }}
              size="lg"
            />
            <Spinner
              type="pinwheel"
              backgroundColor="rgba(40, 167, 69, 0.2)"
              style={{ borderRadius: '50%', padding: '0.75rem' }}
              size="lg"
            />
          </div>
        </div>

        <div className="components__subsection">
          <h3>Pinwheel with Background Colors</h3>
          <div className="components__flex-group--center-spaced">
            <Spinner type="pinwheel" backgroundColor="#f8f9fa" />
            <Spinner type="pinwheel" backgroundColor="rgba(0, 0, 0, 0.05)" />
            <Spinner type="pinwheel" backgroundColor="#e9ecef" size="lg" />
          </div>
        </div>

        <div className="components__subsection">
          <h3>On Dark Background</h3>
          <div style={{ background: '#2c3e50', padding: '2rem', borderRadius: '8px' }}>
            <div className="components__flex-group--center-spaced">
              <Spinner color="inherit" style={{ color: '#fff' }} />
              <Spinner
                color="inherit"
                backgroundColor="rgba(255, 255, 255, 0.1)"
                style={{ color: '#fff' }}
              />
              <Spinner
                type="pinwheel"
                backgroundColor="rgba(255, 255, 255, 0.1)"
              />
            </div>
          </div>
        </div>
      </DemoSection>

      <DemoSection
        title="Status Component"
        description="A flexible status indicator with circle and optional inline text for showing states and activity."
      >

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
      </DemoSection>

      <DemoSection
        title="Select Component"
        description="A custom-styled, accessible select dropdown component."
      >

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
      </DemoSection>

      <DemoSection
        title="Stepper Component"
        description="A professional, accessible stepper for multi-step workflows. Perfect for forms, wizards, and processes that need step-by-step navigation."
      >

        <div className="components__subsection">
          <h3>Horizontal Stepper (Responsive)</h3>
          <p className="components__description">
            Horizontal layout on desktop, automatically switches to vertical on mobile devices.
          </p>

          <Stepper
            key={stepperHorizontalActive}
            defaultActiveStep={stepperHorizontalActive}
            orientation="horizontal"
            prevCallback={handleHorizontalPrev}
            nextCallback={handleHorizontalNext}
          >
            <Stepper.Panel>
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Personal Information</h3>
                <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
                  Enter your basic personal details to get started.
                </p>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                  <Button
                    variant="primary"
                    onClick={() => handleHorizontalNext(0)}
                    disabled={stepperHorizontalActive !== 0}
                  >
                    Next Step
                  </Button>
                </div>
              </div>
            </Stepper.Panel>

            <Stepper.Panel>
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Account Setup</h3>
                <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
                  Create your account credentials and preferences.
                </p>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                  <Button
                    variant="outline"
                    onClick={() => handleHorizontalPrev(1)}
                    disabled={stepperHorizontalActive !== 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleHorizontalNext(1)}
                    disabled={stepperHorizontalActive !== 1}
                  >
                    Next Step
                  </Button>
                </div>
              </div>
            </Stepper.Panel>

            <Stepper.Panel>
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Review & Confirm</h3>
                <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
                  Review your information and complete the setup.
                </p>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                  <Button
                    variant="outline"
                    onClick={() => handleHorizontalPrev(2)}
                    disabled={stepperHorizontalActive !== 2}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      addToast({
                        title: 'Success!',
                        description: 'Setup completed successfully.',
                        variant: 'success'
                      })
                      setStepperHorizontalActive(0)
                    }}
                    disabled={stepperHorizontalActive !== 2}
                  >
                    Complete Setup
                  </Button>
                </div>
              </div>
            </Stepper.Panel>
          </Stepper>
        </div>

        <div className="components__subsection">
          <h3>Vertical Stepper</h3>
          <p className="components__description">
            Vertical layout on all screen sizes, great for sidebars or tall workflows.
          </p>

          <Stepper
            key={stepperVerticalActive}
            defaultActiveStep={stepperVerticalActive}
            orientation="vertical"
            prevCallback={handleVerticalPrev}
            nextCallback={handleVerticalNext}
          >
            <Stepper.Panel>
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Choose Plan</h3>
                <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
                  Select a plan that fits your needs.
                </p>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                  <Button
                    variant="primary"
                    onClick={() => handleVerticalNext(0)}
                    disabled={stepperVerticalActive !== 0}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </Stepper.Panel>

            <Stepper.Panel>
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Payment Details</h3>
                <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
                  Enter your payment information securely.
                </p>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                  <Button
                    variant="outline"
                    onClick={() => handleVerticalPrev(1)}
                    disabled={stepperVerticalActive !== 1}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleVerticalNext(1)}
                    disabled={stepperVerticalActive !== 1}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </Stepper.Panel>

            <Stepper.Panel>
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Confirmation</h3>
                <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
                  Confirm your subscription and get started!
                </p>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                  <Button
                    variant="outline"
                    onClick={() => handleVerticalPrev(2)}
                    disabled={stepperVerticalActive !== 2}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      addToast({
                        title: 'Subscribed!',
                        description: 'Your subscription is now active.',
                        variant: 'success'
                      })
                      setStepperVerticalActive(0)
                    }}
                    disabled={stepperVerticalActive !== 2}
                  >
                    Subscribe
                  </Button>
                </div>
              </div>
            </Stepper.Panel>
          </Stepper>
        </div>

        <div className="components__info-box">
          <h4 className="components__info-title">Stepper Features</h4>
          <ul className="components__info-list">
            <li>Numbered step indicators with visual states (active, completed, inactive)</li>
            <li>Checkmark icons automatically shown for completed steps</li>
            <li>Click completed steps to navigate backward</li>
            <li>Horizontal orientation (responsive - switches to vertical on mobile)</li>
            <li>Vertical orientation (always vertical on all screen sizes)</li>
            <li>Connector lines between steps showing progress</li>
            <li>Customizable navigation with prevCallback and nextCallback</li>
            <li>Full keyboard navigation support (Tab, Enter, Space)</li>
            <li>Comprehensive accessibility (ARIA labels, screen reader support)</li>
            <li>Smooth transitions and animations</li>
          </ul>
        </div>
      </DemoSection>

      <DemoSection
        title="Table Component"
        description="A professional, responsive table for displaying tabular data. Columns automatically collapse into cards on mobile devices (<768px)."
      >

        <div className="components__subsection">
          <h3>Props-Based API</h3>
          <p className="components__description">
            Define columns and pass data array - the simplest approach for basic tables.
          </p>

          <Table
            columns={[
              { key: 'name', label: 'Name', sortable: true },
              { key: 'email', label: 'Email', sortable: true },
              { key: 'role', label: 'Role', sortable: true },
              { key: 'status', label: 'Status' },
            ]}
            data={tableUsers}
            variant="striped"
            hoverable
            ariaLabel="User list"
          />
        </div>

        <div className="components__subsection">
          <h3>Selectable Rows</h3>
          <p className="components__description">
            Enable row selection with checkboxes. Includes select-all functionality.
          </p>

          <Table
            columns={[
              { key: 'name', label: 'Name', sortable: true },
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role' },
            ]}
            data={tableUsers}
            selectable
            selectedRows={tableSelectedRows}
            onSelectChange={setTableSelectedRows}
            variant="default"
            hoverable
          />

          <div className="components__group" style={{ marginTop: 'var(--spacing-md)' }}>
            <p className="components__card-text">
              Selected: {tableSelectedRows.size} {tableSelectedRows.size === 1 ? 'row' : 'rows'}
            </p>
            {tableSelectedRows.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTableSelectedRows(new Set())}
              >
                Clear Selection
              </Button>
            )}
          </div>
        </div>

        <div className="components__subsection">
          <h3>Row Actions</h3>
          <p className="components__description">
            Add action buttons to each row with custom handlers and icons.
          </p>

          <Table
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role' },
            ]}
            data={tableUsers}
            actions={[
              { label: 'Edit', onClick: handleTableEdit, icon: <MdEdit />, variant: 'ghost' },
              { label: 'Delete', onClick: handleTableDelete, icon: <MdDelete />, variant: 'danger' }
            ]}
            variant="default"
            hoverable
          />
        </div>

        <div className="components__subsection">
          <h3>JSX-Based API (Compound Components)</h3>
          <p className="components__description">
            Use compound components for maximum flexibility and control.
          </p>

          <Table variant="bordered" selectable hoverable>
            <Table.Head>
              <Table.Row>
                <Table.SelectAllHeader />
                <Table.Header sortable sortKey="name">Name</Table.Header>
                <Table.Header sortable sortKey="email">Email</Table.Header>
                <Table.Header sortable sortKey="role">Role</Table.Header>
                <Table.Header>Actions</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {tableUsers.map(user => (
                <Table.Row key={user.id} rowId={user.id}>
                  <Table.CheckboxCell rowId={user.id} />
                  <Table.Cell dataLabel="Name">{user.name}</Table.Cell>
                  <Table.Cell dataLabel="Email">{user.email}</Table.Cell>
                  <Table.Cell dataLabel="Role">{user.role}</Table.Cell>
                  <Table.Cell dataLabel="Actions">
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                      <Button size="sm" variant="ghost" leftIcon={<MdEdit />} onClick={() => handleTableEdit(user)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" leftIcon={<MdDelete />} onClick={() => handleTableDelete(user)}>
                        Delete
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>

        <div className="components__subsection">
          <h3>Variants</h3>
          <div className="components__grid--gap-2">
            <div>
              <h4 className="components__section-label">Default</h4>
              <Table
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'role', label: 'Role' },
                ]}
                data={tableUsers.slice(0, 3)}
                variant="default"
              />
            </div>

            <div>
              <h4 className="components__section-label">Striped</h4>
              <Table
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'role', label: 'Role' },
                ]}
                data={tableUsers.slice(0, 3)}
                variant="striped"
              />
            </div>

            <div>
              <h4 className="components__section-label">Bordered</h4>
              <Table
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'role', label: 'Role' },
                ]}
                data={tableUsers.slice(0, 3)}
                variant="bordered"
              />
            </div>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Size & Hover</h3>
          <div className="components__grid--gap-2">
            <div>
              <h4 className="components__section-label">Compact Size</h4>
              <Table
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'role', label: 'Role' },
                ]}
                data={tableUsers.slice(0, 3)}
                size="compact"
                variant="outlined"
              />
            </div>

            <div>
              <h4 className="components__section-label">Hoverable Rows</h4>
              <Table
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'role', label: 'Role' },
                ]}
                data={tableUsers.slice(0, 3)}
                hoverable
                variant="outlined"
              />
            </div>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Loading State</h3>
          <p className="components__description">
            Show skeleton rows while data is loading.
          </p>

          <Table
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role' },
            ]}
            data={tableUsers}
            loading={tableLoading}
            loadingRows={3}
            variant="striped"
          />

          <div className="components__group" style={{ marginTop: 'var(--spacing-md)' }}>
            <Button size="sm" onClick={handleTableLoadData} disabled={tableLoading}>
              {tableLoading ? 'Loading...' : 'Simulate Loading'}
            </Button>
          </div>
        </div>

        <div className="components__subsection">
          <h3>Empty State</h3>
          <p className="components__description">
            Gracefully handle empty data with a default or custom message.
          </p>

          <Table
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role' },
            ]}
            data={[]}
            emptyMessage="No users found. Add users to get started."
            variant="default"
          />
        </div>

        <div className="components__info-box">
          <h4 className="components__info-title">Table Features</h4>
          <ul className="components__info-list">
            <li>Responsive design: Desktop table converts to mobile card layout below 768px</li>
            <li>Hybrid API: Props-based (columns + data) or JSX-based (compound components)</li>
            <li>Sortable columns with visual indicators and keyboard support</li>
            <li>Selectable rows with checkboxes and select-all functionality</li>
            <li>Row actions with custom buttons and handlers</li>
            <li>Multiple variants: default, striped, bordered</li>
            <li>Compact size option for dense layouts</li>
            <li>Hoverable rows with smooth transitions</li>
            <li>Loading state with skeleton rows</li>
            <li>Empty state with customizable message</li>
            <li>Full accessibility: ARIA labels, roles, keyboard navigation</li>
            <li>Mobile-first CSS with data-label attributes for stacked layout</li>
          </ul>
        </div>
      </DemoSection>

      <DemoSection
        title="TabView Component"
        description="A fully accessible, responsive tab navigation component for organizing content. Features keyboard navigation, multiple variants, and smooth transitions."
      >

        <div className="components__subsection">
          <h3>Default Variant</h3>
          <p className="components__description">
            Underline style with indicator below active tab. Perfect for standard navigation.
          </p>

          <TabView defaultActiveTab={0}>
            <TabView.Tab label="Profile">
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h4>Profile Information</h4>
                <p className="components__card-text">
                  View and edit your profile details, including your name, email, and avatar.
                  Keep your information up to date for the best experience.
                </p>
                <Button size="sm" style={{ marginTop: 'var(--spacing-sm)' }}>
                  Edit Profile
                </Button>
              </div>
            </TabView.Tab>

            <TabView.Tab label="Settings">
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h4>Account Settings</h4>
                <p className="components__card-text">
                  Customize your preferences, notification settings, and privacy controls.
                  Make the application work the way you want it to.
                </p>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                  <Tickbox label="Email notifications" onChange={() => {}} />
                  <Tickbox label="SMS alerts" onChange={() => {}} />
                </div>
              </div>
            </TabView.Tab>

            <TabView.Tab label="Activity">
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h4>Recent Activity</h4>
                <p className="components__card-text">
                  Track your recent actions and see a timeline of your activity.
                  Monitor what's been happening with your account.
                </p>
                <ul className="components__list-text" style={{ marginTop: 'var(--spacing-sm)' }}>
                  <li>Logged in from new device - 2 hours ago</li>
                  <li>Updated profile picture - Yesterday</li>
                  <li>Changed password - 3 days ago</li>
                </ul>
              </div>
            </TabView.Tab>

            <TabView.Tab label="Notifications">
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h4>Notification Center</h4>
                <p className="components__card-text">
                  Stay informed with real-time updates about your account activity,
                  messages, and system alerts.
                </p>
                <Status variant="info" style={{ marginTop: 'var(--spacing-sm)' }}>
                  You have 3 unread notifications
                </Status>
              </div>
            </TabView.Tab>
          </TabView>
        </div>

        <div className="components__subsection">
          <h3>Pills Variant</h3>
          <p className="components__description">
            Rounded button-style tabs with filled background. Modern and clean appearance.
          </p>

          <TabView variant="pills" defaultActiveTab={0}>
            <TabView.Tab label="Overview">
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h4>Dashboard Overview</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-sm)' }}>
                  <Card variant="filled">
                    <Card.Header>Total Users</Card.Header>
                    <Card.Body>
                      <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>1,234</p>
                    </Card.Body>
                  </Card>
                  <Card variant="filled">
                    <Card.Header>Active Sessions</Card.Header>
                    <Card.Body>
                      <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>89</p>
                    </Card.Body>
                  </Card>
                </div>
              </div>
            </TabView.Tab>

            <TabView.Tab label="Analytics">
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h4>Analytics Dashboard</h4>
                <p className="components__card-text">
                  View detailed analytics and metrics about your application usage,
                  user engagement, and performance indicators.
                </p>
                <Button size="sm" variant="outline" style={{ marginTop: 'var(--spacing-sm)' }}>
                  View Full Report
                </Button>
              </div>
            </TabView.Tab>

            <TabView.Tab label="Reports">
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h4>Generated Reports</h4>
                <p className="components__card-text">
                  Access and download your generated reports. Export data in various formats
                  for further analysis.
                </p>
              </div>
            </TabView.Tab>
          </TabView>
        </div>

        <div className="components__subsection">
          <h3>Boxed Variant</h3>
          <p className="components__description">
            Tab buttons with borders that connect to content container. Great for documentation.
          </p>

          <TabView variant="boxed" defaultActiveTab={0}>
            <TabView.Tab label="Code">
              <div style={{ padding: 'var(--spacing-md)' }}>
                <pre style={{
                  background: 'var(--color-surface)',
                  padding: 'var(--spacing-sm)',
                  borderRadius: 'var(--border-radius-sm)',
                  overflow: 'auto'
                }}>
{`function Example() {
  return (
    <TabView variant="boxed">
      <TabView.Tab label="Tab 1">
        Content 1
      </TabView.Tab>
    </TabView>
  )
}`}
                </pre>
              </div>
            </TabView.Tab>

            <TabView.Tab label="Preview">
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h4>Component Preview</h4>
                <p className="components__card-text">
                  See the live preview of your component with all the props applied.
                  Test interactivity and visual appearance.
                </p>
                <Button size="sm" style={{ marginTop: 'var(--spacing-sm)' }}>
                  Try It Out
                </Button>
              </div>
            </TabView.Tab>

            <TabView.Tab label="Props">
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h4>Component Props</h4>
                <ul className="components__list-text">
                  <li><code>variant</code>: "default" | "pills" | "boxed"</li>
                  <li><code>orientation</code>: "horizontal" | "vertical"</li>
                  <li><code>defaultActiveTab</code>: number</li>
                  <li><code>onTabChange</code>: (index) =&gt; void</li>
                </ul>
              </div>
            </TabView.Tab>
          </TabView>
        </div>

        <div className="components__subsection">
          <h3>Vertical Orientation</h3>
          <p className="components__description">
            Tabs displayed vertically beside content. Automatically converts to horizontal on mobile (&lt;768px).
          </p>

          <TabView orientation="vertical" defaultActiveTab={0}>
            <TabView.Tab label="General">
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h4>General Settings</h4>
                <p className="components__card-text">
                  Configure general application settings and preferences.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                  <Input label="Application Name" placeholder="My App" />
                  <Input label="Default Language" placeholder="English" />
                </div>
              </div>
            </TabView.Tab>

            <TabView.Tab label="Security">
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h4>Security Settings</h4>
                <p className="components__card-text">
                  Manage security settings, passwords, and authentication methods.
                </p>
                <div style={{ marginTop: 'var(--spacing-sm)' }}>
                  <Button size="sm" variant="outline">Change Password</Button>
                  <Button size="sm" variant="outline" style={{ marginLeft: 'var(--spacing-xs)' }}>Enable 2FA</Button>
                </div>
              </div>
            </TabView.Tab>

            <TabView.Tab label="Privacy">
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h4>Privacy Controls</h4>
                <p className="components__card-text">
                  Control your privacy settings and data sharing preferences.
                </p>
                <div style={{ marginTop: 'var(--spacing-sm)' }}>
                  <Tickbox label="Allow data collection" onChange={() => {}} />
                  <Tickbox label="Share analytics" onChange={() => {}} />
                  <Tickbox label="Marketing emails" onChange={() => {}} />
                </div>
              </div>
            </TabView.Tab>
          </TabView>
        </div>

        <div className="components__subsection">
          <h3>Features & Accessibility</h3>
          <ul className="components__list-text">
            <li>Full keyboard navigation (Arrow keys, Home, End)</li>
            <li>ARIA compliant with proper tab/tabpanel roles</li>
            <li>Active tab indicator with smooth transitions</li>
            <li>Responsive design with horizontal scrolling on overflow</li>
            <li>Touch-friendly with 44px minimum touch targets (48px on mobile)</li>
            <li>Automatic orientation switching on mobile for vertical tabs</li>
            <li>Support for custom tab change callbacks</li>
            <li>Three visual variants: default, pills, boxed</li>
            <li>Smooth content fade-in animation</li>
            <li>Respects prefers-reduced-motion for animations</li>
          </ul>
        </div>
      </DemoSection>

      <section className="components__coming-soon-section">
        <h2 className="text-responsive-lg">Coming Soon</h2>
        <p className="components__description">
          More components are being built following the same production-ready standards:
        </p>
        <ul className="components__list-text">
          <li>Data Grids with virtualization</li>
          <li>Popovers & Dropdowns</li>
          <li>Date & Time pickers</li>
          <li>File upload</li>
          <li>And more...</li>
        </ul>
      </section>
    </div>
  )
}

export default Components
