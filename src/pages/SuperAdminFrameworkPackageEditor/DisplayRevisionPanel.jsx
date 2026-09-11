import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button, ButtonGroup } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Fieldset } from '../../components/Fieldset'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import {
  useGetFrameworkPackageDisplayBindingQuery,
  useCheckFrameworkPackageDisplayRevisionMutation,
  useApplyFrameworkPackageDisplayRevisionMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'

export default function DisplayRevisionPanel({ packageId, contracts = [] }) {
  const location = useLocation()
  const bindingQuery = useGetFrameworkPackageDisplayBindingQuery(packageId)
  const [check, { isLoading: checking }] = useCheckFrameworkPackageDisplayRevisionMutation()
  const [apply, { isLoading: applying }] = useApplyFrameworkPackageDisplayRevisionMutation()
  const [candidate, setCandidate] = useState('')
  const [checkpoint, setCheckpoint] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirming, setConfirming] = useState(false)
  const request = useRef(0)
  useEffect(() => () => { request.current += 1 }, [])
  const binding = bindingQuery.data?.data
  const busy = checking || applying || bindingQuery.isLoading || bindingQuery.isFetching
  const ready = Boolean(!busy && !bindingQuery.error && binding && candidate
    && candidate !== binding.uiContractKey && checkpoint?.compatible === true
    && checkpoint.uiContractKey === candidate && checkpoint.checkpointHash
    && checkpoint.expectedUiContractKey === binding.uiContractKey
    && checkpoint.bindingUpdatedAt === binding.updatedAt)

  const runCheck = async () => {
    const sequence = ++request.current
    setCheckpoint(null)
    setError('')
    setSuccess('')
    try {
      const response = await check({ packageId, uiContractKey: candidate }).unwrap()
      if (request.current !== sequence) return
      setCheckpoint({ ...response,
        expectedUiContractKey: binding.uiContractKey, bindingUpdatedAt: binding.updatedAt })
    } catch (failure) {
      if (request.current === sequence) setError(normalizeError(failure).message)
    }
  }

  const applyRevision = async () => {
    if (!ready) return
    setConfirming(false)
    setError('')
    const sequence = ++request.current
    try {
      await apply({ packageId, uiContractKey: candidate,
        expectedUiContractKey: checkpoint.expectedUiContractKey,
        checkpointHash: checkpoint.checkpointHash }).unwrap()
      if (request.current !== sequence) return
      setCheckpoint(null)
      setSuccess('Display revision applied for new runtimes. Existing runtimes retain their current contract.')
    } catch (failure) {
      if (request.current !== sequence) return
      setCheckpoint(null)
      setError(normalizeError(failure).message)
    }
  }

  return (
    <Fieldset>
      <Fieldset.Legend>Display revision for new runtimes</Fieldset.Legend>
      <Fieldset.Content>
        <p className="super-admin-framework-package-editor__helper">
          Clone and edit a contract in the <Link
            to="/super-admin/runtime-control/ui-contracts"
            state={{ returnTo: `${location.pathname}${location.search}${location.hash}` }}
          >UI Contract Registry</Link>,
          then select the active revision here. Runtime structure changes require a package revision/import.
        </p>
        {bindingQuery.isLoading ? <p role="status">Loading display binding…</p> : null}
        {bindingQuery.error ? <p role="alert">{normalizeError(bindingQuery.error).message}</p> : null}
        {binding ? <p className="super-admin-framework-package-editor__helper">Current contract for new runtimes: {binding.uiContractKey}</p> : null}
        <Select label="Revised display contract" value={candidate} placeholder="Select an active contract"
          options={contracts.filter((row) => row.status === 'ACTIVE' && row.versionStatus === 'ACTIVE')
            .map((row) => ({ value: row.uiContractKey, label: `${row.name || row.uiContractKey} (${row.uiContractKey})` }))}
          disabled={applying || !binding || Boolean(bindingQuery.error)}
          onChange={(event) => {
            request.current += 1
            setCandidate(event.target.value)
            setCheckpoint(null)
            setConfirming(false)
            setError('')
            setSuccess('')
          }} />
        <ButtonGroup>
          <Button type="button" variant="outline" size="sm" loading={checking}
            disabled={busy || !binding || Boolean(bindingQuery.error) || !candidate || candidate === binding.uiContractKey}
            onClick={runCheck}>Check display compatibility</Button>
          <Button type="button" size="sm" disabled={!ready} loading={applying}
            onClick={() => setConfirming(true)}>Apply display revision</Button>
        </ButtonGroup>
        {checkpoint ? <div role="status">
          <Status size="sm" variant={checkpoint.compatible ? 'success' : 'warning'}>
            {checkpoint.compatible ? 'Display compatibility passed' : 'Display revision blocked'}
          </Status>
          {checkpoint.issues?.length ? <ul>{checkpoint.issues.map((issue, index) =>
            <li key={`${issue.code || issue.reason || 'issue'}-${index}`}>{issue.message || issue.code || issue.reason}</li>)}</ul> : null}
        </div> : null}
        {error ? <p role="alert">{error}</p> : null}
        {success ? <p role="status">{success}</p> : null}
        <p className="super-admin-framework-package-editor__helper">
          Existing drafts keep their current display. Recreate a draft explicitly to use the revision; saved evidence is not copied automatically.
        </p>
      </Fieldset.Content>
      <Dialog open={confirming} onClose={() => setConfirming(false)} aria-label="Confirm display revision">
        <Dialog.Header><h2 className="dialog__title">Use this display revision?</h2></Dialog.Header>
        <Dialog.Body><p>Use {candidate} for newly created runtimes. Existing runtimes retain their current contract. Compatibility is checked again before applying.</p></Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
          <Button type="button" size="sm" disabled={!ready} onClick={applyRevision}>Use for new runtimes</Button>
        </Dialog.Footer>
      </Dialog>
    </Fieldset>
  )
}
