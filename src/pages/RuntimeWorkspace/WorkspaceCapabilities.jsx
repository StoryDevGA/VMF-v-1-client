import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Link } from '../../components/Link'
import { buildWorkspaceCapabilityCards, formatCapabilityMetric } from './workspaceCapabilitiesModel.js'
import './WorkspaceCapabilities.css'

export function WorkspaceCapabilities(props) {
  const cards = buildWorkspaceCapabilityCards(props)

  return (
    <section className="workspace-capabilities" aria-labelledby="workspace-capabilities-heading">
      <header className="workspace-capabilities__heading">
        <h2 id="workspace-capabilities-heading">Continue your work</h2>
        <p>Each capability shares this selected workspace and project revision.</p>
      </header>

      <div className="workspace-capabilities__grid">
        {cards.map((card) => (
          <Card
            key={card.key}
            variant="default"
            className={`workspace-capabilities__card workspace-capabilities__card--${card.accent}`}
          >
            <Card.Body className="workspace-capabilities__body">
              <div className="workspace-capabilities__title-row">
                <span className="workspace-capabilities__mark" aria-hidden="true">{card.mark}</span>
                <div className="workspace-capabilities__title-copy">
                  <p className="workspace-capabilities__eyebrow">{card.eyebrow}</p>
                  <h3>{card.title}</h3>
                  <Badge
                    variant={card.statusVariant}
                    size="sm"
                    pill
                    outline={card.statusVariant === 'neutral'}
                  >
                    {card.status}
                  </Badge>
                </div>
              </div>
              <p className="workspace-capabilities__description">{card.description}</p>

              <dl className="workspace-capabilities__metrics">
                {card.metrics.map((metric) => (
                  <div className="workspace-capabilities__metric" key={metric.label}>
                    <dt>{metric.label}</dt>
                    <dd aria-label={`${metric.label}: ${props.loading ? 'loading' : metric.value ?? 'unavailable'}`}>
                      {formatCapabilityMetric(metric)}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card.Body>

            <Card.Footer className="workspace-capabilities__footer">
              {card.href ? (
                <Link to={card.href} className="workspace-capabilities__action" underline="hover">
                  {card.action}<span aria-hidden="true"> →</span>
                </Link>
              ) : (
                <span className="workspace-capabilities__action workspace-capabilities__action--disabled" aria-disabled="true">
                  {card.action}<span aria-hidden="true"> →</span>
                </span>
              )}
            </Card.Footer>
          </Card>
        ))}
      </div>
    </section>
  )
}

export default WorkspaceCapabilities
