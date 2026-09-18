import { Card } from '../../components/Card'
import { Link } from '../../components/Link'

export function SignalHome({
  copy,
  hasWebsiteEntitlement = false,
  hasDocumentsEntitlement = false,
  creditBalances,
  isLoadingCredits = false,
  creditsError = false,
}) {
  const getCreditValue = (value) => {
    if (isLoadingCredits) return 'Loading…'
    if (creditsError) return 'Unavailable'
    return Number.isFinite(Number(value)) ? Number(value) : 0
  }

  return (
    <>
      <section className="customer-home__hero" aria-labelledby="customer-home-title">
        <div>
          <p className="customer-home__eyebrow">{copy.eyebrow}</p>
          <h1 id="customer-home-title">{copy.title}</h1>
          <p className="customer-home__description">{copy.description}</p>
        </div>
      </section>

      <section className="customer-home__signal-workspace" aria-labelledby="signal-start-title">
        <div className="customer-home__signal-intro">
          <p className="customer-home__eyebrow">Signal workspace</p>
          <h2 id="signal-start-title">What would you like to improve today?</h2>
          <p>Start with a website or a document. Each route is deliberately bounded, credit-aware, and designed to show the value of StoryLineOS without exposing the full workspace.</p>
        </div>
        <aside className="customer-home__credit-panel" aria-label="Available Signal credits">
          <p className="customer-home__card-kicker">Available credits</p>
          <div className="customer-home__credit-balance">
            <div><strong>{getCreditValue(creditBalances?.documentImprovement)}</strong><span>Document improvement</span></div>
            <div><strong>{getCreditValue(creditBalances?.websiteAnalysis)}</strong><span>Website analysis</span></div>
          </div>
          <p className="customer-home__credit-panel-copy">Credits are separate for each Signal product. No credit is consumed until approval or final report creation.</p>
          <Link to="/app/credits" underline="none" className="customer-home__button">Request credits</Link>
        </aside>
        <div className="customer-home__journeys">
          {hasWebsiteEntitlement ? <Card className="customer-home__journey" variant="outlined">
            <Card.Body>
              <p className="customer-home__card-kicker">WA Website analysis</p>
              <h3>Analyse a customer website</h3>
              <p>Enter one public URL, usually the homepage. StoryLineOS reviews what the site appears to say, where the message is weak, and what should improve first.</p>
              <ul className="customer-home__journey-list">
                <li>One URL as the source basis</li>
                <li>Framework-led analysis preview</li>
                <li>Final website recommendation report</li>
              </ul>
              <Link to="/app/website-analysis" underline="none" className="customer-home__button">Start Website Analysis →</Link>
            </Card.Body>
          </Card> : null}
          {hasDocumentsEntitlement ? <Card className="customer-home__journey" variant="outlined">
            <Card.Body>
              <p className="customer-home__card-kicker">DI Document improvement</p>
              <h3>Improve one source document</h3>
              <p>Upload or select one document, lock it as the evidence basis, then use Conversation to create a governed customer-ready outcome.</p>
              <ul className="customer-home__journey-list">
                <li>One uploaded document as the source basis</li>
                <li>Limitations accepted before generation</li>
                <li>Outcome saved into the same Assets library</li>
              </ul>
              <Link to="/app/document-improvement" underline="none" className="customer-home__button">Start Document Improvement →</Link>
            </Card.Body>
          </Card> : null}
        </div>
      </section>
    </>
  )
}
