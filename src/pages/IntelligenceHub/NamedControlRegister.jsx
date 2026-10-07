import { useState } from 'react'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { Link } from '../../components/Link'
import { MdInfoOutline } from 'react-icons/md'
import AssuranceReviewDetails from './AssuranceReviewDetails.jsx'

const controls = [
  ['REVIEW_COMPLETION', 'Review completion', 'An explicit human receipt records completion of the mandatory review decisions.'],
  ['EXCEPTION_DISCLOSURE', 'Exception disclosure', 'A person confirms that known gaps, contradictions, limitations and permitted exceptions have been accurately disclosed.'],
  ['PUBLICATION_AUTHORISATION', 'Publication authorisation', 'An authorised person grants or refuses the exact Framework Package publication or lock action against its current basis.'],
]

const completionStatus = (review, loading) => loading ? 'Loading…' : !review ? 'Unavailable'
  : !review.latestReceipt ? 'No receipt' : review.latestReceipt.currency === 'CURRENT' ? 'Current receipt' : 'Stale receipt'

export default function NamedControlRegister({ review, loading, summary = false, qualityHref, onSelectView }) {
  const [selectedId, setSelectedId] = useState('REVIEW_COMPLETION')
  const selected = controls.find(([id]) => id === selectedId)
  const status = id => id === 'REVIEW_COMPLETION' ? completionStatus(review, loading) : 'Unavailable'
  if (summary) return <section aria-label="Report human control register"><header><h4>Human control register</h4><small>3 controls</small></header><div className="intelligence-hub__report-controls">{controls.map(([id, title, description]) => <section key={id}><span className="intelligence-hub__report-marker" aria-hidden="true"><MdInfoOutline /></span><div><strong>{title}</strong><small>{description}</small></div><Badge size="sm" pill>{status(id)}</Badge></section>)}</div><p>Machine checks and certification cannot create human approval. Disclosure does not waive mandatory requirements; publication authorisation also requires the actual workspace action authority.</p></section>
  return <div className="intelligence-hub__readiness-browser">
    <section className="intelligence-hub__readiness-register"><header><h3>Human controls and decision history</h3><small>3 controls · select a control to inspect its basis</small></header><div role="region" aria-label="Assurance control register" tabIndex={0}>{controls.map(([id, title, description]) => <Button variant="ghost" size="sm" key={id} className="intelligence-hub__readiness-row" aria-pressed={selectedId === id} onClick={() => setSelectedId(id)}><span className="intelligence-hub__readiness-marker" aria-hidden="true"><MdInfoOutline /></span><span><strong>{title}</strong><small>{description}</small></span><Badge size="sm" pill>{status(id)}</Badge></Button>)}</div></section>
    <section className="intelligence-hub__readiness-detail" aria-label="Selected assurance control" tabIndex={0}><header><p className="intelligence-hub__eyebrow">Selected human control</p><Badge size="sm" pill>{status(selectedId)}</Badge></header><h3>{selected[1]}</h3><p>{selected[2]}</p>
      {selectedId === 'REVIEW_COMPLETION' ? <><AssuranceReviewDetails review={loading ? null : review} loading={loading} /><Button variant="ghost" size="sm" onClick={() => onSelectView('Review')}>Open Review →</Button></>
        : selectedId === 'EXCEPTION_DISCLOSURE' ? <><p>A governed disclosure receipt and its decision history are unavailable. Incomplete inventory or undisclosed known exceptions block readiness. A no-known-exceptions decision requires a complete current basis.</p><p>Disclosure provides transparency; it does not waive mandatory requirements or resolve independent findings.</p><Link to={qualityHref} variant="subtle" className="intelligence-hub__readiness-link">Inspect quality findings →</Link></>
          : <><p>A governed grant, refusal or withdrawal receipt and its decision history are unavailable. A current grant and the actual server action authority are required before execution in Workspace Structure.</p><p>Stale or withdrawn grants cannot establish authorisation. Outcome Studio asset approval retains its own exact-version workflow.</p><p>Inspect the selected revision’s Workspace Structure for the actual package action availability.</p></>}
      <footer>System checks, Truth Quality certification and lifecycle are separate from these human decisions. Accepted evidence and general activity do not establish approval.</footer>
    </section>
  </div>
}
