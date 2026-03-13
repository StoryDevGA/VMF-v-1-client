import { MdOutlineDashboardCustomize, MdOutlineUpcoming } from 'react-icons/md'
import { Badge } from '../Badge'
import { Card } from '../Card'
import { Status } from '../Status'
import './AdminHoldingPage.css'

export function AdminHoldingPage({
  ariaLabel,
  title,
  subtitle,
  roleLabel,
  guidance,
  userName,
  summaryTitle,
  summarySubtitle,
  summaryItems = [],
  controls = null,
  futureTitle = 'Planned dashboard modules',
  futureSubtitle = 'This space is being held for future overview and signal modules.',
  futureItems = [],
}) {
  return (
    <section className="admin-holding-page container" aria-label={ariaLabel}>
      <Card variant="elevated" className="admin-holding-page__hero">
        <Card.Body className="admin-holding-page__hero-body">
          <div className="admin-holding-page__hero-copy">
            <div className="admin-holding-page__eyebrow">
              <Badge
                variant="info"
                size="sm"
                pill
                outline
                icon={<MdOutlineDashboardCustomize aria-hidden="true" />}
              >
                Holding Page
              </Badge>
              <Status variant="info" size="sm" className="admin-holding-page__status">
                Future modules in progress
              </Status>
            </div>
            {roleLabel ? <p className="admin-holding-page__role">{roleLabel}</p> : null}
            <h1 className="admin-holding-page__title">{title}</h1>
            <p className="admin-holding-page__subtitle">{subtitle}</p>
            {userName ? (
              <p className="admin-holding-page__signed-in">
                Signed in as <strong>{userName}</strong>
              </p>
            ) : null}
          </div>

          <div className="admin-holding-page__note" role="note" aria-label="Workspace guidance">
            <h2 className="admin-holding-page__note-title">Navigation first</h2>
            <p className="admin-holding-page__note-copy">{guidance}</p>
          </div>
        </Card.Body>
      </Card>

      <div className="admin-holding-page__grid">
        <Card variant="filled" className="admin-holding-page__panel">
          <Card.Header className="admin-holding-page__panel-header">
            <h2 className="admin-holding-page__panel-title">{summaryTitle}</h2>
            <p className="admin-holding-page__panel-subtitle">{summarySubtitle}</p>
          </Card.Header>
          <Card.Body className="admin-holding-page__panel-body">
            {controls ? <div className="admin-holding-page__controls">{controls}</div> : null}
            <dl className="admin-holding-page__facts">
              {summaryItems.map((item) => (
                <div key={item.label} className="admin-holding-page__fact">
                  <dt className="admin-holding-page__fact-label">{item.label}</dt>
                  <dd className="admin-holding-page__fact-value">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Card.Body>
        </Card>

        <Card variant="filled" className="admin-holding-page__panel">
          <Card.Header className="admin-holding-page__panel-header">
            <h2 className="admin-holding-page__panel-title">{futureTitle}</h2>
            <p className="admin-holding-page__panel-subtitle">{futureSubtitle}</p>
          </Card.Header>
          <Card.Body className="admin-holding-page__panel-body">
            <ul className="admin-holding-page__future-list">
              {futureItems.map((item) => (
                <li key={item.title} className="admin-holding-page__future-item">
                  <span className="admin-holding-page__future-icon" aria-hidden="true">
                    {item.icon ?? <MdOutlineUpcoming />}
                  </span>
                  <div className="admin-holding-page__future-copy">
                    <h3 className="admin-holding-page__future-title">{item.title}</h3>
                    <p className="admin-holding-page__future-description">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card.Body>
        </Card>
      </div>
    </section>
  )
}

export default AdminHoldingPage
