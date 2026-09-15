import { Card } from '../../components/Card'
import { Link } from '../../components/Link'
import { Status } from '../../components/Status'
import './CustomerJourneyPlaceholder.css'

const CREDIT_REQUEST = 'mailto:angus@storylineos.com?subject=StorylineOS%20credit%20request&body=Customer%20or%20workspace%20context%3A%20%0ARequested%20credit%20amount%3A%20%0AIntended%20use%3A%20'

const CONTENT = Object.freeze({
  'Website Analysis': {
    eyebrow: 'Signal workspace',
    title: 'Website Analysis',
    description: 'Start with a focused review of the website evidence you want StorylineOS to understand.',
    next: 'Add a website source to begin the analysis.',
  },
  'Document Improvement': {
    eyebrow: 'Signal workspace',
    title: 'Document Improvement',
    description: 'Bring a document into a clearer, more useful shape with evidence-aware review.',
    next: 'Add a document to begin improvement work.',
  },
  Credits: {
    eyebrow: 'Account support',
    title: 'Credits',
    description: 'Credits are managed manually for V1. There is no card payment flow.',
    next: 'Email the StorylineOS team with the context and amount you need.',
  },
  Account: {
    eyebrow: 'Account',
    title: 'Account',
    description: 'Review your account context and access support from the customer workspace.',
    next: 'Account controls will appear here as the customer surface is connected.',
  },
  'Intelligence Hub': {
    eyebrow: 'Core workspace preview',
    title: 'Intelligence Hub',
    description: 'A Core view for moving between accepted understanding, evidence, and review work.',
    next: 'This destination is reserved for the next bound Core workspace surface.',
  },
  'Intelligence Quality': {
    eyebrow: 'Core workspace preview',
    title: 'Intelligence Quality',
    description: 'A Core view for checking the quality signals that support the current workspace.',
    next: 'This destination is reserved for the next bound Core workspace surface.',
  },
  'Workspace Structure': {
    eyebrow: 'Core workspace preview',
    title: 'Workspace Structure',
    description: 'Review how the selected workspace is organised and which package provenance supports it.',
    next: 'Workspace Structure will be connected to the selected workspace data.',
  },
  'Outcome Studio': {
    eyebrow: 'Core workspace preview',
    title: 'Outcome Studio',
    description: 'Work with StoryLineOS to shape an outcome from the current workspace context.',
    next: 'Open a Project Workspace to work with its linked Outcome Studio.',
    link: { label: 'Open Project Workspaces', to: '/app/workspaces/vmf' },
  },
  Assets: {
    eyebrow: 'Core workspace preview',
    title: 'Assets',
    description: 'Keep approved customer-facing outputs visible with their assurance details.',
    next: 'Assets will be connected to the selected workspace outputs.',
  },
  'Review & evidence': {
    eyebrow: 'Core workspace preview',
    title: 'Review & evidence',
    description: 'Review items and things to verify before an outcome is treated as ready for its next step.',
    next: 'Review details will be connected to the selected workspace evidence.',
  },
  'Attention Centre': {
    eyebrow: 'Core workspace review',
    title: 'Attention Centre',
    description: 'Review customer-readable items that need attention across the selected workspace.',
    next: 'Grouped review items and workspace checks will appear here as the Core review surface is connected.',
    link: { label: 'Return to Customer Home', to: '/app/dashboard' },
  },
  'Activity Centre': {
    eyebrow: 'Core workspace activity',
    title: 'Activity Centre',
    description: 'See what changed, where it happened, and whether the customer needs to act.',
    next: 'Workspace, review, source, and output activity will appear here from bounded activity summaries.',
    link: { label: 'Return to Customer Home', to: '/app/dashboard' },
  },
})

export function CustomerJourneyPlaceholder({ section }) {
  const content = CONTENT[section] ?? CONTENT.Account
  const isCredits = section === 'Credits'

  return (
    <main className="customer-journey" aria-labelledby="customer-journey-title">
      <div className="customer-journey__container">
        <p className="customer-journey__eyebrow">{content.eyebrow}</p>
        <div className="customer-journey__heading">
          <div>
            <h1 id="customer-journey-title">{content.title}</h1>
            <p>{content.description}</p>
          </div>
          <Status variant="info" size="sm">V1 surface</Status>
        </div>

        <Card className="customer-journey__card" variant="elevated">
          <Card.Body>
            <p className="customer-journey__label">Next step</p>
            <h2>{content.next}</h2>
            {isCredits ? (
              <Link
                href={CREDIT_REQUEST}
                variant="primary"
                underline="none"
                className="customer-journey__action"
              >
                Request more credit
              </Link>
            ) : null}
            {content.link ? (
              <Link to={content.link.to} variant="primary" underline="none" className="customer-journey__action">
                {content.link.label}
              </Link>
            ) : null}
          </Card.Body>
        </Card>
      </div>
    </main>
  )
}

export default CustomerJourneyPlaceholder

