import { beforeEach, describe, expect, it, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
const { rawQuery } = vi.hoisted(() => ({ rawQuery: vi.fn() }))
vi.mock('@reduxjs/toolkit/query/react', async original => ({ ...await original(), fetchBaseQuery: () => rawQuery }))
import { buildPrivateDocxCandidatesQuery, buildPrivateDocxPreviewBundleQuery, docxPreviewApi } from './docxPreviewApi.js'
import { clearTokens } from '../../utils/tokenStorage.js'
describe('saved private DOCX read endpoints', () => {
  const args = { runtimeInstanceId: 'runtime/3', candidateId: 'candidate?one', customerId: 'customer', tenantId: 'tenant', sessionRevision: 8 }
  const store = () => configureStore({ reducer: { [docxPreviewApi.reducerPath]: docxPreviewApi.reducer }, middleware: defaults => defaults().concat(docxPreviewApi.middleware) })
  beforeEach(() => { clearTokens(); rawQuery.mockReset() })
  it('encodes identifiers and sends only customer/tenant scope, never session cache identity', () => {
    expect(buildPrivateDocxCandidatesQuery(args)).toBe('/runtime-instances/runtime%2F3/outcome-studio/docx-candidates?customerId=customer&tenantId=tenant')
    expect(buildPrivateDocxPreviewBundleQuery(args)).toBe('/runtime-instances/runtime%2F3/outcome-studio/docx-candidates/candidate%3Fone/page-preview-bundle?customerId=customer&tenantId=tenant')
  })
  it('never automatically retries a refused bundle and removes its cache after unsubscribe', async () => {
    rawQuery.mockResolvedValue({ error: { status: 503, data: { code: 'DOCX_PREVIEW_BLOCKED' } } })
    const state = store(), request = state.dispatch(docxPreviewApi.endpoints.getPrivateDocxPreviewBundle.initiate(args))
    expect((await request).error.status).toBe(503); expect(rawQuery).toHaveBeenCalledTimes(1)
    request.unsubscribe(); await new Promise(resolve => setTimeout(resolve, 20))
    expect(docxPreviewApi.endpoints.getPrivateDocxPreviewBundle.select(args)(state.getState()).status).toBe('uninitialized')
  })
  it('separates shared-user customer and session cache entries even when session identity is absent from wire', async () => {
    rawQuery.mockResolvedValue({ data: { data: { preview: null } } })
    const state = store(), requests = [args, { ...args, customerId: 'other' }, { ...args, sessionRevision: 9 }]
      .map(input => state.dispatch(docxPreviewApi.endpoints.getPrivateDocxPreviewBundle.initiate(input)))
    await Promise.all(requests); expect(rawQuery).toHaveBeenCalledTimes(3)
    requests.forEach(request => request.unsubscribe()); state.dispatch(docxPreviewApi.util.resetApiState())
  })
  it('rejects a bundle promise completed after logout instead of caching its content', async () => {
    let release
    rawQuery.mockReturnValue(new Promise(resolve => { release = resolve }))
    const state = store(), request = state.dispatch(docxPreviewApi.endpoints.getPrivateDocxPreviewBundle.initiate(args))
    clearTokens(); release({ data: { data: { preview: { privateContent: 'Old session' } } } })
    const result = await request
    expect(result.data).toBeUndefined(); expect(result.error.data.code).toBe('SESSION_CHANGED')
    request.unsubscribe(); state.dispatch(docxPreviewApi.util.resetApiState())
  })
})
