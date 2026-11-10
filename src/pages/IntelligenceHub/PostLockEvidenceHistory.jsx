import { createElement, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, ButtonGroup } from '../../components/Button'
import { Card } from '../../components/Card'
import { useGetRuntimePostLockEvidenceListQuery, useGetRuntimePostLockEvidenceQuery } from '../../store/api/runtimeInstanceApi.js'
import { getSessionRevision } from '../../utils/tokenStorage.js'
import { readPostLockEvidenceList, readSavedPostLockEvidence } from './postLockSubmissionModel.js'
import PostLockImpactPanel from './PostLockImpactPanel.jsx'
import PostLockAdmissionPanel from './PostLockAdmissionPanel.jsx'

const owns = (read, args) => read.isSuccess === true && read.currentData !== undefined && read.originalArgs
  && Object.keys(read.originalArgs).length === Object.keys(args).length
  && Object.keys(args).every(key => read.originalArgs[key] === args[key])
const failure = (error, detail = false) => error?.status === 403
  ? 'You do not have permission to read saved post-lock evidence in this workspace.'
  : error?.status === 409 ? 'The selected locked basis has changed. Refresh the workspace before reopening evidence.'
    : detail ? 'The saved item could not be verified in this workspace. Retry the read or choose another item.'
      : 'Saved post-lock evidence could not be loaded or verified. Retry the read.'

export default function PostLockEvidenceHistory({ scope, renderer, lockBasis, active, checking, sessionRevision, frameKey, actorId, Material }) {
  const [params, setParams] = useSearchParams()
  const [cursor, setCursor] = useState(null)
  const selected = params.get('postLockSubmissionId')
  const validSelection = typeof selected === 'string' && /^[a-f0-9]{64}$/.test(selected)
  const enabled = active && !checking && lockBasis?.available && lockBasis?.frozenInventory?.available
    && getSessionRevision() === sessionRevision
  const args = { ...scope, cursor, sessionRevision, frameKey }
  const detailArgs = { ...scope, submissionId: selected, sessionRevision, frameKey }
  const list = useGetRuntimePostLockEvidenceListQuery(args, { skip: !enabled, refetchOnMountOrArgChange: true })
  const detail = useGetRuntimePostLockEvidenceQuery(detailArgs,
    { skip: !enabled || !validSelection, refetchOnMountOrArgChange: true })
  const frame = { scope, renderer, lockBasis }
  const page = enabled && !list.isFetching && owns(list, args) ? readPostLockEvidenceList(list.currentData, frame) : null
  const receipt = enabled && validSelection && !detail.isFetching && owns(detail, detailArgs)
    ? readSavedPostLockEvidence(detail.currentData, frame, selected) : null
  const open = id => { const next = new URLSearchParams(params); if (id) next.set('postLockSubmissionId', id); else next.delete('postLockSubmissionId'); setParams(next) }
  if (!active) return null
  return <section aria-label="Saved post-lock evidence" className="intelligence-hub__context-workspace">
    <h3>Saved post-lock evidence</h3>
    <p>Reopen original submission receipts. These items remain separate from the locked evidence basis; this list does not show later review or admission decisions.</p>
    {checking || list.isFetching ? <p role="status">Loading saved post-lock evidence…</p>
      : !enabled ? <p>Saved evidence is unavailable until this workspace’s locked basis can be verified.</p>
        : list.error || !page ? <p role="alert">{failure(list.error)}</p>
          : page.items.length ? <ul>{page.items.map(row => <li key={row.submissionId}>
            <Button variant="ghost" size="sm" onClick={() => open(row.submissionId)}>Open {row.evidenceTitle}</Button>
            <p>{row.source.title} · Recorded {row.submittedAt} · Original recording: pending review</p>
          </li>)}</ul> : <p>No saved post-lock evidence in this revision.</p>}
    <ButtonGroup stackOnMobile>
      <Button size="sm" variant="outline" disabled={!enabled || list.isFetching} onClick={() => {
        if (cursor) setCursor(null); else list.refetch()
      }}>Refresh saved evidence</Button>
      {page?.pagination.hasMore ? <Button size="sm" variant="outline" disabled={list.isFetching}
        onClick={() => setCursor(page.pagination.nextCursor)}>Next saved evidence</Button> : null}
    </ButtonGroup>
    {selected ? <Card variant="outlined" role="region" aria-label="Reopened post-lock evidence">
      <Card.Header><h3>Saved original submission</h3></Card.Header><Card.Body>
        {checking || detail.isFetching ? <p role="status">Loading saved source details…</p>
          : detail.error || !receipt ? <p role="alert">{failure(detail.error, true)}</p>
            : <><p>Original recording: pending review, outside the frozen basis.</p>
              <dl className="intelligence-hub__inspection-facts">
                {[['Submission reference', receipt.submissionId], ['Recorded', receipt.submittedAt], ['Recorded by', receipt.submittedBy],
                  ['Receipt', receipt.receipt.id], ['Reason for review', receipt.reason]].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}
              </dl>{createElement(Material, { source: receipt.source, evidence: receipt.evidence })}
              <p>The server verified this original receipt. Supplied source details are not independent factual verification.</p>
              <PostLockImpactPanel key={`${frameKey}:${receipt.submissionId}:${receipt.requestDigest}`} scope={scope}
                receipt={receipt} frameKey={frameKey} sessionRevision={sessionRevision} actorId={actorId} />
              <PostLockAdmissionPanel key={`admission:${frameKey}:${receipt.submissionId}:${receipt.requestDigest}`}
                scope={scope} receipt={receipt} renderer={renderer} lockBasis={lockBasis} frameKey={frameKey}
                sessionRevision={sessionRevision} actorId={actorId} /></>}
        <ButtonGroup stackOnMobile><Button size="sm" variant="outline" disabled={!enabled || !validSelection || detail.isFetching}
          onClick={() => detail.refetch()}>Refresh saved source details</Button>
          <Button size="sm" variant="outline" onClick={() => open(null)}>Close saved item</Button></ButtonGroup>
      </Card.Body></Card> : null}
  </section>
}
