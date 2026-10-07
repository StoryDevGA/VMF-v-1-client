import { afterEach, expect, it, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { runtimeInstanceApi } from './runtimeInstanceApi.js'

let store
const NativeRequest = globalThis.Request
afterEach(() => { store?.dispatch(runtimeInstanceApi.util.resetApiState()); vi.unstubAllGlobals() })
const setup = response => {
  // Native Request cannot consume JSDOM's cross-realm AbortSignal. This
  // transport fixture checks route/retry behavior, not cancellation.
  vi.stubGlobal('Request', class extends NativeRequest {
    constructor(input, options) {
      super(typeof input === 'string' ? new URL(input, 'http://localhost').toString() : input,
        options ? { ...options, signal: undefined } : options)
    }
  })
  const transport = vi.fn(async () => response.clone())
  vi.stubGlobal('fetch', transport)
  store = configureStore({ reducer: { [runtimeInstanceApi.reducerPath]: runtimeInstanceApi.reducer },
    middleware: getDefault => getDefault().concat(runtimeInstanceApi.middleware) })
  return transport
}
const scope = { runtimeInstanceId: 'revision/a', customerId: 'customer-a', tenantId: 'tenant-a' }

it('executes registered Run reads with exact encoded scope, cursor and selected identity', async () => {
  const transport = setup(new Response(JSON.stringify({ data: {} }), { headers: { 'content-type': 'application/json' } }))
  const list = store.dispatch(runtimeInstanceApi.endpoints.getAcquisitionRuns.initiate({ ...scope, cursor: 'cursor/&=' }))
  expect((await list).error).toBeUndefined()
  let url = new URL(transport.mock.lastCall[0].url)
  expect(url.pathname).toMatch(/\/runtime-instances\/revision%2Fa\/acquisition-runs$/)
  expect(Object.fromEntries(url.searchParams)).toEqual({ customerId: scope.customerId, tenantId: scope.tenantId, cursor: 'cursor/&=' })
  const detail = store.dispatch(runtimeInstanceApi.endpoints.getAcquisitionRun.initiate({ ...scope, runId: 'selected/run' }))
  expect((await detail).error).toBeUndefined()
  url = new URL(transport.mock.lastCall[0].url)
  expect(url.pathname).toMatch(/\/acquisition-runs\/selected%2Frun$/)
  expect(Object.fromEntries(url.searchParams)).toEqual({ customerId: scope.customerId, tenantId: scope.tenantId })
  expect(transport.mock.lastCall[0].method).toBe('GET')
  list.unsubscribe(); detail.unsubscribe()
})

it('keeps Run read failures explicit without automatic repeated heavy reads', async () => {
  const transport = setup(new Response(JSON.stringify({ error: { message: 'Receipt unavailable' } }), {
    status: 503, headers: { 'content-type': 'application/json' },
  }))
  const request = store.dispatch(runtimeInstanceApi.endpoints.getAcquisitionRuns.initiate(scope))
  expect((await request).error.status).toBe(503)
  expect(transport).toHaveBeenCalledTimes(1)
  request.unsubscribe()
})
