import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PostLockEvidenceHistory from './PostLockEvidenceHistory.jsx'
import { getSessionRevision } from '../../utils/tokenStorage.js'

const calls = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), refresh: vi.fn() }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetRuntimePostLockEvidenceListQuery: (...args) => calls.list(...args),
  useGetRuntimePostLockEvidenceQuery: (...args) => calls.detail(...args),
}))
const scope = { runtimeInstanceId: 'r', customerId: 'c', tenantId: 't' }
const mount = () => render(<MemoryRouter><PostLockEvidenceHistory scope={scope} active sessionRevision={getSessionRevision()}
  frameKey="owned" lockBasis={{ available: true, frozenInventory: { available: true } }} Material={() => null} /></MemoryRouter>)
beforeEach(() => {
  vi.resetAllMocks()
  calls.list.mockReturnValue({ isFetching: false, error: { status: 503 }, refetch: calls.refresh })
  calls.detail.mockReturnValue({ isUninitialized: true })
})
describe('saved evidence read states', () => {
  it('shows loading without stale data', () => {
    calls.list.mockReturnValue({ isFetching: true }); mount()
    expect(screen.getByRole('status')).toHaveTextContent('Loading saved post-lock evidence')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it('explains denied access', () => {
    calls.list.mockReturnValue({ error: { status: 403 } }); mount()
    expect(screen.getByRole('alert')).toHaveTextContent('do not have permission')
  })
  it('offers a read-only retry after failure', async () => {
    mount(); await userEvent.click(screen.getByRole('button', { name: 'Refresh saved evidence' }))
    expect(calls.refresh).toHaveBeenCalledOnce()
    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded or verified')
  })
  it('rejects a cached response with different arguments', () => {
    calls.list.mockReturnValue({ isSuccess: true, currentData: { data: { items: [{ evidenceTitle: 'Other customer secret' }] } }, originalArgs: { ...scope, customerId: 'other' } })
    mount(); expect(screen.queryByText('Other customer secret')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeVisible()
  })
})
