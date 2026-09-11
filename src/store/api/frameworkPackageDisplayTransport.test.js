import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('./baseApi.js', () => ({ baseApi: {
  injectEndpoints: ({ endpoints }) => ({ endpoints: endpoints({ query: (config) => config, mutation: (config) => config }) }),
} }))
import { runtimeControlApi } from './runtimeControlApi.js'

describe('display revision live transport', () => {
  afterEach(() => { delete globalThis.__RUNTIME_CONTROL_API_MOCK__ })
  it.each([
    ['getFrameworkPackageDisplayBinding', 'pkg', 'ui-contract-display-binding', undefined, undefined],
    ['checkFrameworkPackageDisplayRevision', { packageId: 'pkg', uiContractKey: 'revision' },
      'ui-contract-display-checkpoint', 'POST', { uiContractKey: 'revision' }],
    ['applyFrameworkPackageDisplayRevision', { packageId: 'pkg', uiContractKey: 'revision',
      expectedUiContractKey: 'base', checkpointHash: 'hash' }, 'ui-contract-display-binding', 'POST',
    { uiContractKey: 'revision', expectedUiContractKey: 'base', checkpointHash: 'hash' }],
  ])('%s uses the governed endpoint and exact body', async (name, args, suffix, method, body) => {
    globalThis.__RUNTIME_CONTROL_API_MOCK__ = false
    const baseQuery = vi.fn().mockResolvedValue({ data: {} })
    await runtimeControlApi.endpoints[name].queryFn(args, {}, {}, baseQuery)
    expect(baseQuery).toHaveBeenCalledWith({
      url: `/super-admin/runtime-control/framework-packages/pkg/${suffix}`,
      ...(method ? { method, body } : {}),
    }, {}, {})
  })
  it('invalidates the binding, contract and audit after an apply', () => {
    expect(runtimeControlApi.endpoints.applyFrameworkPackageDisplayRevision.invalidatesTags({}, null, { packageId: 'pkg' }))
      .toEqual([{ type: 'RuntimeFrameworkPackage', id: 'pkg' }, 'RuntimeUIContract', 'AuditLog'])
    expect(runtimeControlApi.endpoints.getFrameworkPackageDisplayBinding.providesTags({}, null, 'pkg'))
      .toEqual([{ type: 'RuntimeFrameworkPackage', id: 'pkg' }])
  })
  it('preserves the raw checkpoint payload returned by the API controller', async () => {
    globalThis.__RUNTIME_CONTROL_API_MOCK__ = false
    const checkpoint = { compatible: true, uiContractKey: 'revision', checkpointHash: 'hash', issues: [] }
    const result = await runtimeControlApi.endpoints.checkFrameworkPackageDisplayRevision.queryFn(
      { packageId: 'pkg', uiContractKey: 'revision' }, {}, {}, vi.fn().mockResolvedValue({ data: checkpoint }))
    expect(result.data).toEqual(checkpoint)
    expect(result.data.data).toBeUndefined()
  })
})
