import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Link } from '../../components/Link'
import { Badge } from '../../components/Badge'
import { Accordion } from '../../components/Accordion'
import { MdInfoOutline, MdErrorOutline } from 'react-icons/md'
import { displayHubCount } from './intelligenceHubModel.js'
import { readEvidenceReadiness } from './evidenceReadinessModel.js'
import { sourceProcessingLabel, sourceProcessingExplanation } from './sourceSummaryModel.js'
import { inventoryLabel, inventoryExplanation } from './evidenceInventoryModel.js'
import EvidenceInventoryDetails from './EvidenceInventoryDetails.jsx'
import RecordedLockBasisDetails from './RecordedLockBasisDetails.jsx'
import { lockBasisLabel } from './lockBasisModel.js'
import './EvidenceReadinessView.css'

const classifications = [
  ['verified', 'Verified', 'A current authorised validation record supports a named assertion against a stated check and evidence basis. Acceptance alone is insufficient.'],
  ['reported', 'Reported', 'A statement attributed to its source, without implying independent verification.'],
  ['hypothesis', 'Hypothesis', 'An explicitly labelled unvalidated assumption or approved interpretation, with its origin preserved.'],
  ['unresolved', 'Unresolved', 'A recorded material question or dependency remains unresolved. Missing classification is unknown, not Unresolved.'],
  ['contradicted', 'Contradicted', 'A current confirmed contradiction applies to the named assertion. A detector candidate alone is insufficient.'],
  ['confirmation', 'Requires confirmation', 'A specific recorded confirmation requirement remains outstanding, with its required actor and action identified.'],
]
const anchors = [
  ['Highest validated state', 'View supporting evidence'],
  ['First broken link', 'Inspect the source gap'],
  ['Current constraint', 'Review what is missing'],
]

function ReadinessPanel({ eyebrow, title, hint, className = '', children }) {
  return <Card variant="outlined" className={`evidence-readiness__panel ${className}`}><Card.Body>
    <header><div><span>{eyebrow}</span><h3>{title}</h3></div>{hint ? <small>{hint}</small> : null}</header>
    {children}
  </Card.Body></Card>
}

export default function EvidenceReadinessView({ renderer, lockBasis, lockBasisLoading, sourceSummary, sourceSummaryLoading, inventory, inventoryLoading, evidenceResponse, evidenceError, evidenceLoading, candidateResponse, candidateError, candidateLoading, acquisitionHref, onSelectView }) {
  const model = readEvidenceReadiness({ renderer, sourceSummary, sourceSummaryLoading, evidenceResponse, evidenceError, evidenceLoading, candidateResponse, candidateError, candidateLoading })
  const count = model.candidates.candidates?.length
  return <section className="evidence-readiness" aria-label="Evidence readiness details">
    <div className="evidence-readiness__controls"><span>View state <strong>{model.label}</strong></span><Button variant="outline" size="sm" title="Opens Sources; no source synchronisation is performed here." onClick={() => onSelectView('Sources')}>Inspect sources</Button></div>
    <section className={`evidence-readiness__banner evidence-readiness__banner--${model.tone}`} aria-labelledby="evidence-readiness-state">
      <i aria-hidden="true">{model.tone === 'ready' ? <MdInfoOutline /> : <MdErrorOutline />}</i>
      <div><span>{model.label}</span><h2 id="evidence-readiness-state">{model.title}</h2><p>{model.description}</p></div>
      <aside><small>Interpretation status</small><strong>{model.interpretation}</strong><small>Current inventory</small><strong>{inventoryLabel(inventory, inventoryLoading)}</strong></aside>
    </section>
    <dl className="evidence-readiness__metrics">
      <div><dt>Evidence status</dt><dd>{model.status}<small>Recorded revision status</small></dd></div>
      <div><dt>Sources connected</dt><dd>{sourceSummaryLoading ? 'Loading…' : displayHubCount(model.sourceCount)}<small>Current revision source registry</small></dd></div>
      <div><dt>Records read</dt><dd>{inventoryLoading ? 'Loading…' : inventory ? inventory.evidence.readCount : 'Unavailable'}<small>{inventory ? `${inventory.evidence.expectedCount} expected · current inventory` : 'Expected count unavailable'}</small></dd></div>
      <div><dt>Sections with enough evidence</dt><dd>Unavailable<small>Sufficiency assessment unavailable</small></dd></div>
      <div><dt>Recorded lock snapshot</dt><dd>{lockBasisLabel(lockBasis, lockBasisLoading)}<small>Inspect recorded metadata below</small></dd></div>
    </dl>
    <p className="evidence-readiness__notice" aria-label="Current document processing"><strong>Documents processed: {sourceProcessingLabel(sourceSummary, sourceSummaryLoading)}</strong> · {sourceProcessingExplanation(sourceSummary, sourceSummaryLoading)} Current source records are separate from frozen snapshot membership and target sufficiency.</p>
    <p role="status" className="evidence-readiness__notice" aria-label="Current evidence inventory">{inventoryExplanation(inventory, inventoryLoading)}</p>
    {model.evidenceMessage ? <p role="status" className="evidence-readiness__notice">{model.evidenceMessage}</p> : null}
    <div className="evidence-readiness__primary">
      <ReadinessPanel eyebrow="Next useful action" title={model.next} className="evidence-readiness__action" hint={<Badge variant={model.tone === 'ready' ? 'success' : 'warning'} size="sm">{model.interpretation}</Badge>}>
        <p>{model.hasOpenCandidates ? 'Inspect the returned contradiction candidates and their evidence before making a decision.' : 'Inspect available evidence and the recorded review status for this revision.'}</p>
        <div>{model.total === 0 ? <Link to={acquisitionHref} className="btn btn--primary evidence-readiness__primary-action" underline="none">Add evidence</Link> : <Button size="sm" onClick={() => onSelectView('Intelligence Quality')}>{model.next}</Button>}<Button variant="ghost" size="sm" onClick={() => onSelectView('Sources')}>Inspect source records</Button></div>
        <small>Accepted understanding remains unchanged until a person reviews the evidence and chooses what should happen next.</small>
      </ReadinessPanel>
      <ReadinessPanel eyebrow="Current view" title="Recomputation status unavailable" className="evidence-readiness__current" hint={<MdInfoOutline aria-hidden="true" />}>
        <p>{model.needsRefresh ? 'The recorded evidence pack requires refresh. No recomputation progress or result is supplied.' : 'The existing reads do not report recomputation progress or establish that the current interpretation uses a complete snapshot.'}</p>
        <footer><span>The evidence and interpretation states are shown separately.</span><Button variant="ghost" size="sm" disabled title="No recomputation workflow is connected to this view.">Start recomputation</Button></footer>
      </ReadinessPanel>
    </div>
    <ReadinessPanel eyebrow="Evidence classification" title="Different evidence types need different decisions" hint="Classification is separate from confidence">
      <div className="evidence-readiness__classifications">{classifications.map(([key, title, description]) => <article className={`evidence-readiness__classification evidence-readiness__classification--${key}`} key={key}><header><i aria-hidden="true">●</i><strong>{title}</strong><b aria-label={`${title} count unavailable`}>—</b></header><p>{description}</p></article>)}</div>
      <small className="evidence-readiness__classification-note">Classification totals are unavailable; accepted evidence does not establish verification. Each bucket requires unique current evidence IDs in the declared scope, qualified by assertion and evidence version. Labels may overlap, so buckets need not sum to the total. Unknown or unassessed is separate. Verified and Contradicted on the same assertion and current basis require reconciliation.</small>
    </ReadinessPanel>
    <div className="evidence-readiness__secondary">
      <ReadinessPanel eyebrow="Contradictions and missing constraints" title="What still needs evidence or authority?" hint="Next action stays with the customer team">
        <div className="evidence-readiness__issues">
          <article><i className="evidence-readiness__contradiction" aria-hidden="true">≠</i><div><small>Contradictions</small><strong>{count === undefined ? 'Unavailable' : `${count} returned candidates`}</strong><p>{model.candidates.message || 'Bounded candidate read · up to 8. Candidates require human review; this is not a total of confirmed contradictory claims.'}</p></div><Button variant="ghost" size="sm" onClick={() => onSelectView('Intelligence Quality')}>Review contradictions</Button></article>
          {[
            ['Decision inputs', 'Decision evidence assessment unavailable', 'The read does not establish decision ownership or required approval.', 'Open Context for decision inputs', 'context'],
            ['Economic information', 'Economic authority assessment unavailable', 'No finance approval or quantified-benefit decision is supplied.', 'Open Context for economic information', 'context'],
            ['Source coverage', 'Source sufficiency assessment unavailable', 'Inspect the recorded coverage without inferring sufficient source support.', 'Inspect coverage', 'Coverage'],
          ].map(([label, title, description, action, target]) => <article key={label}><i aria-hidden="true">{target === 'Coverage' ? '○' : '!'}</i><div><small>{label}</small><strong>{title}</strong><p>{description}</p></div>{target === 'context' ? <Link to={acquisitionHref} title="Open Context for inspection in the selected revision. No assessed input gap or action is implied.">{action}</Link> : <Button variant="ghost" size="sm" onClick={() => onSelectView(target)}>{action}</Button>}</article>)}
        </div>
      </ReadinessPanel>
      <ReadinessPanel eyebrow="Current-state anchors" title="Keep the decision path visible" hint="Short explanations, not technical lineage">
        <div className="evidence-readiness__anchors">{anchors.map(([label, action], index) => <article key={label}><i aria-hidden="true">{index + 1}</i><div><small>{label}</small><strong>Unavailable</strong><p>No recorded decision anchor is supplied for this revision.</p><Button variant="ghost" size="sm" disabled title="The exact recorded decision anchor is unavailable; no item-specific handoff can be verified.">{action}</Button></div></article>)}</div>
      </ReadinessPanel>
    </div>
    <Accordion className="evidence-readiness__advanced"><Accordion.Item id="evidence-readiness-inspection"><Accordion.Header itemId="evidence-readiness-inspection">Advanced evidence inspection</Accordion.Header><Accordion.Content itemId="evidence-readiness-inspection"><EvidenceInventoryDetails inventory={inventory} /><RecordedLockBasisDetails model={lockBasis} loading={lockBasisLoading} /><p>{displayHubCount(model.total)} evidence objects in the separate paginated evidence read. This total does not measure document processing or frozen snapshot completeness.</p><p>Frozen source membership, interpretation receipts and recomputation lineage remain unavailable.</p></Accordion.Content></Accordion.Item></Accordion>
    <footer className="evidence-readiness__footer"><Button variant="ghost" size="sm" onClick={() => onSelectView('Review')}>← Review</Button><span>Evidence state and interpretation state remain separate until the next governed decision.</span><Button variant="ghost" size="sm" onClick={() => onSelectView('Readiness & publish')}>Readiness &amp; publish →</Button></footer>
  </section>
}
