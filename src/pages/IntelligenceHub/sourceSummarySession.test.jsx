import { afterEach, beforeEach, it, expect, vi } from 'vitest'
import { act, render, screen, waitFor, cleanup } from '@testing-library/react'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { useSyncExternalStore } from 'react'
const { rawQuery } = vi.hoisted(() => ({ rawQuery: vi.fn() }))
vi.mock('@reduxjs/toolkit/query/react', async original => ({ ...(await original()), fetchBaseQuery: () => rawQuery }))
import { runtimeInstanceApi, buildRuntimeStateSourceSummaryQuery, buildRuntimeStateEvidenceInventoryQuery, useGetRuntimeRendererQuery,
  useGetRuntimeDiscoveryContradictionsQuery, useGetRuntimeStateSourceSummaryQuery, useGetRuntimeStateEvidenceInventoryQuery } from '../../store/api/runtimeInstanceApi.js'
import { getSessionRevision, subscribeToSession, setTokens, clearTokens } from '../../utils/tokenStorage.js'

const scope = { runtimeInstanceId: 'same-revision', customerId: 'same-customer', tenantId: 'same-tenant' }
const endpoints = ['getRuntimeRenderer', 'getRuntimeDiscoveryContradictions', 'getRuntimeStateSourceSummary', 'getRuntimeStateEvidenceInventory']
const token = () => `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`
let store
beforeEach(() => {
  clearTokens(); rawQuery.mockReset(); setTokens({ accessToken: token(), refreshToken: 'initial' })
  store = configureStore({ reducer: { [runtimeInstanceApi.reducerPath]: runtimeInstanceApi.reducer },
    middleware: getDefault => getDefault().concat(runtimeInstanceApi.middleware) })
})
afterEach(() => { cleanup(); store.dispatch(runtimeInstanceApi.util.resetApiState()); clearTokens() })
function CurrentReads() {
  const sessionRevision = useSyncExternalStore(subscribeToSession, getSessionRevision, getSessionRevision)
  const args = { ...scope, sessionRevision }
  const renderer = useGetRuntimeRendererQuery(args)
  const authority = useGetRuntimeDiscoveryContradictionsQuery(args)
  const summary = useGetRuntimeStateSourceSummaryQuery(args)
  const inventory = useGetRuntimeStateEvidenceInventoryQuery(args)
  return <output>{[renderer, authority, summary, inventory].map(read => read.currentData?.marker || 'UNVERIFIED').join('|')}</output>
}
it('same-scope replacement login cannot reuse cached renderer, authority or summary basis', async () => {
  rawQuery.mockResolvedValue({ data: { marker: 'PRIOR_SESSION' } })
  render(<Provider store={store}><CurrentReads /></Provider>)
  await waitFor(() => expect(screen.getByText('PRIOR_SESSION|PRIOR_SESSION|PRIOR_SESSION|PRIOR_SESSION')).toBeInTheDocument())
  const pending = []
  rawQuery.mockImplementation(() => new Promise(resolve => pending.push(resolve)))
  act(() => setTokens({ accessToken: token(), refreshToken: 'replacement' }))
  expect(screen.getByText('UNVERIFIED|UNVERIFIED|UNVERIFIED|UNVERIFIED')).toBeInTheDocument()
  await waitFor(() => expect(pending).toHaveLength(4))
  await act(async () => { pending.forEach(resolve => resolve({ data: { marker: 'CURRENT_SESSION' } })) })
  await waitFor(() => expect(screen.getByText('CURRENT_SESSION|CURRENT_SESSION|CURRENT_SESSION|CURRENT_SESSION')).toBeInTheDocument())
})
it.each(['getRuntimeStateSourceSummary', 'getRuntimeStateEvidenceInventory'])('late old-session %s response fails SESSION_CHANGED and cannot fill the replacement cache', async endpoint => {
  const pending = []
  rawQuery.mockImplementation(() => new Promise(resolve => pending.push(resolve)))
  const oldArgs = { ...scope, sessionRevision: getSessionRevision() }
  const oldRequest = store.dispatch(runtimeInstanceApi.endpoints[endpoint].initiate(oldArgs))
  await waitFor(() => expect(pending).toHaveLength(1))
  setTokens({ accessToken: token(), refreshToken: 'replacement' })
  const newArgs = { ...scope, sessionRevision: getSessionRevision() }
  const newRequest = store.dispatch(runtimeInstanceApi.endpoints[endpoint].initiate(newArgs))
  await waitFor(() => expect(pending).toHaveLength(2))
  pending[1]({ data: { marker: 'CURRENT' } }); await newRequest
  pending[0]({ data: { marker: 'OLD' } }); await oldRequest
  expect(runtimeInstanceApi.endpoints[endpoint].select(newArgs)(store.getState()).data.marker).toBe('CURRENT')
  expect(runtimeInstanceApi.endpoints[endpoint].select(oldArgs)(store.getState()).error.data.code).toBe('SESSION_CHANGED')
  oldRequest.unsubscribe(); newRequest.unsubscribe()
})
it('ordinary token rotation preserves the session cache identity and sends no local session argument', async () => {
  rawQuery.mockResolvedValue({ data: { marker: 'CURRENT' } })
  const sessionRevision = getSessionRevision(), args = { ...scope, sessionRevision }
  await Promise.all(endpoints.map(endpoint => store.dispatch(runtimeInstanceApi.endpoints[endpoint].initiate(args))))
  setTokens({ accessToken: token(), refreshToken: 'rotated' }, { preserveSession: true })
  expect(getSessionRevision()).toBe(sessionRevision)
  expect(buildRuntimeStateSourceSummaryQuery(args)).toBe('/runtime-instances/same-revision/state/source-summary?customerId=same-customer&tenantId=same-tenant')
  expect(buildRuntimeStateEvidenceInventoryQuery(args)).toBe('/runtime-instances/same-revision/state/evidence-inventory?customerId=same-customer&tenantId=same-tenant')
  expect(rawQuery.mock.calls.every(([query]) => !String(typeof query === 'string' ? query : query.url).includes('sessionRevision'))).toBe(true)
})
