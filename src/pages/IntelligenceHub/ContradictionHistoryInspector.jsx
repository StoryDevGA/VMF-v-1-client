import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { useGetRuntimeStateContradictionHistoryQuery } from '../../store/api/runtimeInstanceApi.js'
import { getSessionRevision } from '../../utils/tokenStorage.js'
import { displayHubToken } from './intelligenceHubModel.js'
import { readContradictionHistory } from './contradictionHistoryModel.js'

function HistoryContent({ scope, findingId, onClose }) {
  const [page, setPage] = useState(1)
  const read = useGetRuntimeStateContradictionHistoryQuery({ ...scope, findingId, page, pageSize: 10 }, { refetchOnMountOrArgChange: true })
  const busy = Boolean(read.isLoading || read.isFetching)
  const model = readContradictionHistory({ response: read.currentData, scope, findingId, page, loading: busy, error: read.error })
  const frame = useRef(null)
  const content = useRef(null)
  useLayoutEffect(() => {
    frame.current = { scope, findingId, page, model, busy, read }
    return () => { frame.current = null }
  }, [scope, findingId, page, model, busy, read])
  const owned = () => frame.current?.scope === scope && frame.current.findingId === findingId && frame.current.page === page
    && frame.current.model === model && !frame.current.busy && getSessionRevision() === scope.sessionRevision
  const refresh = () => { if (owned() && !read.isUninitialized) { content.current?.focus(); read.refetch() } }
  const changePage = next => { if (owned() && model?.available && Math.abs(next - page) === 1 && next >= 1 && next <= model.totalPages) { content.current?.focus(); setPage(next) } }
  return <>
    <Dialog.Header><h2>Recorded contradiction decisions</h2><Button size="sm" variant="outline" onClick={onClose}>Close decisions</Button></Dialog.Header>
    <Dialog.Body className="intelligence-quality__history-body"><div className="intelligence-quality__history-content" ref={content} role="region" aria-label="Recorded decision history" tabIndex={0}>
      <p>{findingId}</p><p>Historical records in reverse recorded order. Inspect the current finding to establish its present disposition. Audit references and recalculation history are unavailable here.</p>
      {busy ? <p role="status">Loading recorded decisions…</p> : !model ? <p role="alert">Recorded decisions unavailable. Refresh to verify the exact scope and current read.</p>
        : !model.available ? <p role="status">{model.reason === 'HISTORY_NOT_RECORDED' ? 'No history receipt is recorded.' : 'Stored decision history could not be verified.'} Refresh to inspect again.</p>
          : <><p>{model.total} recorded decisions · Page {page} of {model.totalPages} · Complete retained history for this finding. Read at {model.readAt}.</p>
            {model.records.length ? model.records.map(row => <article key={row.reviewId} className="intelligence-quality__review intelligence-quality__history-record">
              <h3>{displayHubToken(row.disposition)}</h3><p>{row.rationale}</p><p>Reviewer {row.reviewedBy} · {row.reviewedAt}</p>
              <details><summary>Inspect recorded decision basis</summary><p>Decision {row.reviewId}</p><p>Original state version {row.reviewedStateVersion}</p><p>Evidence pair {row.evidencePairHash}</p><p>Review epoch {row.reviewEpoch || 'Legacy empty epoch'}</p>
                {row.requestKey ? <><p>Request {row.requestKey}</p><p>Original request time basis {row.requestExpectedUpdatedAt}</p><p>Request fingerprint {row.requestPayloadHash}</p></> : <p>Retry identity was not recorded for this decision.</p>}</details>
            </article>) : <p>No recorded decisions on this history page.</p>}</>}
    </div></Dialog.Body>
    <Dialog.Footer><Button size="sm" variant="outline" disabled={busy} onClick={refresh}>Refresh decisions</Button>
      <Button size="sm" variant="outline" disabled={busy || !model?.available || page <= 1} onClick={() => changePage(page - 1)}>Previous decisions</Button>
      <Button size="sm" variant="outline" disabled={busy || !model?.available || page >= model.totalPages} onClick={() => changePage(page + 1)}>Next decisions</Button></Dialog.Footer>
  </>
}

export default function ContradictionHistoryInspector({ scope, findingId, disabled }) {
  const [open, setOpen] = useState(false)
  const frame = useRef(null)
  const opener = useRef(null)
  const restoreFocus = useRef(false)
  const owner = useMemo(() => ({ scope, findingId }), [scope, findingId])
  useLayoutEffect(() => { frame.current = { owner, disabled }; return () => { frame.current = null } }, [owner, disabled])
  const owned = () => frame.current?.owner === owner && !frame.current.disabled && scope && getSessionRevision() === scope.sessionRevision
  useLayoutEffect(() => {
    if (!open && restoreFocus.current) {
      restoreFocus.current = false
      if (frame.current?.owner === owner && !disabled && scope && getSessionRevision() === scope.sessionRevision) opener.current?.focus()
    }
  }, [open, owner, disabled, scope])
  const close = () => { if (owned()) { restoreFocus.current = true; setOpen(false) } }
  return <><Button size="sm" variant="ghost" className="intelligence-quality__text-action" disabled={disabled || !scope} onClick={event => { if (owned()) { opener.current = event.currentTarget; setOpen(true) } }}>View recorded decisions</Button>
    {open && !disabled && scope ? <Dialog open onClose={close} size="lg" className="intelligence-quality__dialog" showCloseButton={false} aria-label="Recorded contradiction decisions">
      <HistoryContent scope={scope} findingId={findingId} onClose={close} />
    </Dialog> : null}</>
}
