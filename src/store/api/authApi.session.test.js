import { describe, expect, it, vi } from 'vitest'
const { definitions } = vi.hoisted(() => ({ definitions: {} }))
vi.mock('./baseApi.js', () => ({ baseApi: { injectEndpoints: ({ endpoints }) => {
  Object.assign(definitions, endpoints({ query: (config) => config, mutation: (config) => config }))
  return {}
} } }))
import './authApi.js'
import { clearTokens, getSessionRevision, getTokenRevision, setTokens } from '../../utils/tokenStorage.js'

describe('profile hydration session ownership', () => {
  it.each([{ name: 'AbortError', message: 'Aborted' }, { status: 'FETCH_ERROR', error: 'AbortError' }])('does not log out a canceled profile caller (%j)', async (error) => {
    setTokens({ accessToken: 'current', refreshToken: 'current-refresh' })
    const dispatch = vi.fn()
    await definitions.getMe.onQueryStarted(undefined, { dispatch, queryFulfilled: Promise.reject({ error }) })
    expect(dispatch).not.toHaveBeenCalled()
  })

  it.each(['resolve', 'reject'])('ignores a stale getMe %s after login changes', async (outcome) => {
    setTokens({ accessToken: 'old', refreshToken: 'old-refresh' })
    let resolve; let reject
    const queryFulfilled = new Promise((success, failure) => { resolve = success; reject = failure })
    const dispatch = vi.fn()
    const pending = definitions.getMe.onQueryStarted(undefined, { dispatch, queryFulfilled })
    setTokens({ accessToken: 'new', refreshToken: 'new-refresh' })
    if (outcome === 'resolve') resolve({ data: { data: { user: { id: 'old-user' } } } })
    else reject(new Error('Old request failed'))
    await pending
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('permits profile hydration across internal token rotation in the same session', async () => {
    setTokens({ accessToken: 'old', refreshToken: 'old-refresh' })
    const session = getSessionRevision()
    const token = getTokenRevision()
    let resolve
    const queryFulfilled = new Promise((success) => { resolve = success })
    const dispatch = vi.fn()
    const pending = definitions.getMe.onQueryStarted(undefined, { dispatch, queryFulfilled })
    setTokens({ accessToken: 'renewed', refreshToken: 'renewed-refresh' }, { preserveSession: true })
    expect(getSessionRevision()).toBe(session)
    expect(getTokenRevision()).toBeGreaterThan(token)
    resolve({ data: { data: { user: { id: 'same-user' } } } })
    await pending
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'auth/setCredentials', payload: expect.objectContaining({ user: { id: 'same-user' } }) }))
    clearTokens()
    expect(getSessionRevision()).toBeGreaterThan(session)
  })
})
