import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Link } from '../../components/Link'
import { Badge } from '../../components/Badge'
import { Accordion } from '../../components/Accordion'
import { MdInfoOutline, MdErrorOutline } from 'react-icons/md'
import { displayHubCount } from './intelligenceHubModel.js'
import { readEvidenceReadiness } from './evidenceReadinessModel.js'
import './EvidenceReadinessView.css'

const classifications = [
  ['verified', 'Verified', 'Directly supported by reviewed evidence'],
  ['reported', 'Reported', 'Stated by a source but not independently verified'],
  ['hypothesis', 'Hypothesis', 'A useful possibility that needs evidence'],
  ['unresolved', 'Unresolved', 'Relevant evidence exists without a decision'],
  ['contradicted', 'Contradicted', 'Accepted sources make incompatible claims'],
  ['confirmation', 'Requires confirmation', 'An authority or source check is still needed'],
]
const anchors = [
  ['Highest validated state', 'View supporting evidence', 'Review'],
  ['First broken link', 'Inspect the source gap', 'Sources'],
  ['Current constraint', 'Review what is missing', 'Intelligence Quality'],
]

function ReadinessPanel({ eyebrow, title, hint, className = '', children }) {
  return <Card variant="outlined" className={`evidence-readiness__panel ${className}`}><Card.Body>
    <header><div><span>{eyebrow}</span><h3>{title}</h3></div>{hint ? <small>{hint}</small> : null}</header>
    {children}
  </Card.Body></Card>
}

export default function EvidenceReadinessView({ renderer, evidenceResponse, evidenceError, evidenceLoading, candidateResponse, candidateError, candidateLoading, workbenchHref, workspaceHref, onSelectView }) {
  const model = readEvidenceReadiness({ renderer, evidenceResponse, evidenceError, evidenceLoading, candidateResponse, candidateError, candidateLoading })
  const count = model.candidates.candidates?.length
  return <section className="evidence-readiness" aria-label="Evidence readiness details">
    <div className="evidence-readiness__controls"><span>View state <strong>{model.label}</strong></span><Button variant="outline" size="sm" title="Opens Sources; no source synchronisation is performed here." onClick={() => onSelectView('Sources')}>Synchronise sources</Button></div>
    <section className={`evidence-readiness__banner evidence-readiness__banner--${model.tone}`} aria-labelledby="evidence-readiness-state">
      <i aria-hidden="true">{model.tone === 'ready' ? <MdInfoOutline /> : <MdErrorOutline />}</i>
      <div><span>{model.label}</span><h2 id="evidence-readiness-state">{model.title}</h2><p>{model.description}</p></div>
      <aside><small>Interpretation status</small><strong>{model.interpretation}</strong><small>Evidence snapshot</small><strong>Unavailable</strong></aside>
    </section>
    <dl className="evidence-readiness__metrics">
      <div><dt>Evidence status</dt><dd>{model.status}<small>Recorded revision status</small></dd></div>
      <div><dt>Sources connected</dt><dd>{displayHubCount(model.sourceCount)}<small>Selected revision summary</small></dd></div>
      <div><dt>Records read</dt><dd>Unavailable<small>Expected count unavailable</small></dd></div>
      <div><dt>Sections with enough evidence</dt><dd>Unavailable<small>Sufficiency assessment unavailable</small></dd></div>
      <div><dt>Last successful snapshot</dt><dd>Unavailable<small>Snapshot receipt unavailable</small></dd></div>
    </dl>
    {model.evidenceMessage ? <p role="status" className="evidence-readiness__notice">{model.evidenceMessage}</p> : null}
    <div className="evidence-readiness__primary">
      <ReadinessPanel eyebrow="Next useful action" title={model.next} className="evidence-readiness__action" hint={<Badge variant={model.tone === 'ready' ? 'success' : 'warning'} size="sm">{model.interpretation}</Badge>}>
        <p>{model.hasOpenCandidates ? 'Inspect the returned contradiction candidates and their evidence before making a decision.' : 'Inspect available evidence and the recorded review status for this revision.'}</p>
        <div>{model.total === 0 ? <Link to={workbenchHref} className="btn btn--primary evidence-readiness__primary-action" underline="none">Add evidence</Link> : <Button size="sm" onClick={() => onSelectView('Intelligence Quality')}>{model.next}</Button>}<Button variant="ghost" size="sm" onClick={() => onSelectView('Sources')}>Review recently added evidence</Button></div>
        <small>Accepted understanding remains unchanged until a person reviews the evidence and chooses what should happen next.</small>
      </ReadinessPanel>
      <ReadinessPanel eyebrow="Current view" title="Recomputation status unavailable" className="evidence-readiness__current" hint={<MdInfoOutline aria-hidden="true" />}>
        <p>{model.needsRefresh ? 'The recorded evidence pack requires refresh. No recomputation progress or result is supplied.' : 'The existing reads do not report recomputation progress or establish that the current interpretation uses a complete snapshot.'}</p>
        <footer><span>The evidence and interpretation states are shown separately.</span><Button variant="ghost" size="sm" disabled title="No recomputation workflow is connected to this view.">Start recomputation</Button></footer>
      </ReadinessPanel>
    </div>
    <ReadinessPanel eyebrow="Evidence classification" title="Different evidence types need different decisions" hint="Classification is separate from confidence">
      <div className="evidence-readiness__classifications">{classifications.map(([key, title, description]) => <article className={`evidence-readiness__classification evidence-readiness__classification--${key}`} key={key}><header><i aria-hidden="true">●</i><strong>{title}</strong><b aria-label={`${title} count unavailable`}>—</b></header><p>{description}</p></article>)}</div>
      <small className="evidence-readiness__classification-note">Classification totals are unavailable; accepted evidence does not establish verification.</small>
    </ReadinessPanel>
    <div className="evidence-readiness__secondary">
      <ReadinessPanel eyebrow="Contradictions and missing constraints" title="What still needs evidence or authority?" hint="Next action stays with the customer team">
        <div className="evidence-readiness__issues">
          <article><i className="evidence-readiness__contradiction" aria-hidden="true">≠</i><div><small>Contradictions</small><strong>{count === undefined ? 'Unavailable' : `${count} returned candidates`}</strong><p>{model.candidates.message || 'Bounded candidate read · up to 8. Candidates require human review; this is not a total of confirmed contradictory claims.'}</p></div><Button variant="ghost" size="sm" onClick={() => onSelectView('Intelligence Quality')}>Review contradictions</Button></article>
          {[
            ['Decision inputs', 'Decision evidence assessment unavailable', 'The read does not establish decision ownership or required approval.', 'Add decision evidence', 'workbench'],
            ['Economic information', 'Economic authority assessment unavailable', 'No finance approval or quantified-benefit decision is supplied.', 'Strengthen economic evidence', 'workbench'],
            ['Source coverage', 'Source sufficiency assessment unavailable', 'Inspect the recorded coverage without inferring sufficient source support.', 'View coverage gaps', 'Coverage'],
          ].map(([label, title, description, action, target]) => <article key={label}><i aria-hidden="true">{target === 'Coverage' ? '○' : '!'}</i><div><small>{label}</small><strong>{title}</strong><p>{description}</p></div>{target === 'workbench' ? <Link to={workbenchHref} title="Navigation to Evidence Workbench; evidence is not added here.">{action}</Link> : <Button variant="ghost" size="sm" onClick={() => onSelectView(target)}>{action}</Button>}</article>)}
        </div>
      </ReadinessPanel>
      <ReadinessPanel eyebrow="Current-state anchors" title="Keep the decision path visible" hint="Short explanations, not technical lineage">
        <div className="evidence-readiness__anchors">{anchors.map(([label, action, target], index) => <article key={label}><i aria-hidden="true">{index + 1}</i><div><small>{label}</small><strong>Unavailable</strong><p>No recorded decision anchor is supplied for this revision.</p><Button variant="ghost" size="sm" onClick={() => onSelectView(target)}>{action}</Button></div></article>)}</div>
      </ReadinessPanel>
    </div>
    <Accordion className="evidence-readiness__advanced"><Accordion.Item id="evidence-readiness-inspection"><Accordion.Header itemId="evidence-readiness-inspection">Advanced evidence inspection</Accordion.Header><Accordion.Content itemId="evidence-readiness-inspection"><p>{displayHubCount(model.total)} evidence objects in the selected revision read. This total does not measure source records processed or snapshot completeness.</p><p>Source snapshot hashes, ingestion receipts and recomputation lineage are unavailable.</p></Accordion.Content></Accordion.Item></Accordion>
    <footer className="evidence-readiness__footer"><Button variant="ghost" size="sm" onClick={() => onSelectView('Overview')}>← Intelligence overview</Button><span>Evidence state and interpretation state remain separate until the next governed decision.</span><Link to={workspaceHref}>View workspace handoff →</Link></footer>
  </section>
}
