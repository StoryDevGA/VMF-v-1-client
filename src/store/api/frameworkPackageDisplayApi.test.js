import { afterEach, describe, expect, it } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { runtimeControlApi } from './runtimeControlApi.js'

describe('display revision API mock boundary', () => {
  afterEach(() => { delete globalThis.__RUNTIME_CONTROL_API_MOCK__ })
  it.each([
    ['getFrameworkPackageDisplayBinding', 'package-a'],
    ['checkFrameworkPackageDisplayRevision', { packageId: 'package-a', uiContractKey: 'revision' }],
    ['applyFrameworkPackageDisplayRevision', { packageId: 'package-a', uiContractKey: 'revision',
      expectedUiContractKey: 'base', checkpointHash: 'a'.repeat(64) }],
  ])('%s never fabricates live evidence in mock mode', async (endpoint, args) => {
    globalThis.__RUNTIME_CONTROL_API_MOCK__ = true
    const store = configureStore({ reducer: { [runtimeControlApi.reducerPath]: runtimeControlApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(runtimeControlApi.middleware) })
    const result = await store.dispatch(runtimeControlApi.endpoints[endpoint].initiate(args))
    expect(result.error).toMatchObject({ status: 409, data: { error: {
      code: 'CONFLICT', details: { reason: 'DISPLAY_REVISION_REQUIRES_LIVE_API' },
    } } })
    store.dispatch(runtimeControlApi.util.resetApiState())
  })
})
