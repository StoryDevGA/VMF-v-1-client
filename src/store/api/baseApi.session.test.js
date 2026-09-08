import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const { rawQuery } = vi.hoisted(() => ({ rawQuery: vi.fn() }))
vi.mock('@reduxjs/toolkit/query/react', async (importOriginal) => ({ ...(await importOriginal()), fetchBaseQuery: () => rawQuery }))
import { baseQueryWithReauth, getConfiguredMaxRetries } from './baseApi.js'
import { setTokens, clearTokens, getAccessToken, getRefreshToken } from '../../utils/tokenStorage.js'

const jwt = (expires = 3600) => `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + expires }))}.signature`
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done }); return { promise, resolve } }
const apiFor = (controller = new AbortController()) => ({ dispatch: vi.fn(), signal: controller.signal })
const pathOf = (args) => typeof args === 'string' ? args : args.url
const pair = () => ({ data: { data: { accessToken: jwt(), refreshToken: 'rotated' } } })
const tick = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve() }

beforeEach(() => { clearTokens(); rawQuery.mockReset() })
afterEach(() => vi.useRealTimers())

describe('session-scoped token recovery', () => {
  it('does not begin token rotation for an already canceled request', async () => {
    setTokens({ accessToken: jwt(-1), refreshToken: 'original' })
    const controller = new AbortController()
    controller.abort()
    expect(await baseQueryWithReauth('/canceled', apiFor(controller), {})).toMatchObject({ error: { error: 'AbortError' } })
    expect(rawQuery).not.toHaveBeenCalled()
  })

  it.each([true, false])('shares one refresh for parallel requests (proactive=%s)', async (proactive) => {
    setTokens({ accessToken: jwt(proactive ? -1 : 3600), refreshToken: 'original' })
    const refresh = deferred()
    rawQuery.mockImplementation((args) => {
      const path = pathOf(args)
      if (path === '/auth/refresh') return refresh.promise
      if (path === '/auth/me') return { data: { user: { id: 'user-1' } } }
      return getRefreshToken() === 'original' ? { error: { status: 401 } } : { data: path }
    })
    const api = apiFor()
    const first = baseQueryWithReauth('/first', api, {})
    const second = baseQueryWithReauth('/second', api, {})
    await tick()
    expect(rawQuery.mock.calls.filter(([args]) => pathOf(args) === '/auth/refresh')).toHaveLength(1)
    refresh.resolve(pair())
    expect(await Promise.all([first, second])).toEqual([{ data: '/first' }, { data: '/second' }])
    expect(api.dispatch.mock.calls.filter(([action]) => action.type === 'auth/clearCredentials')).toHaveLength(0)
  })

  it('clears the current failed refresh once and does not send expired proactive requests', async () => {
    setTokens({ accessToken: jwt(-1), refreshToken: 'original' })
    const refresh = deferred()
    rawQuery.mockReturnValue(refresh.promise)
    const api = apiFor()
    const first = baseQueryWithReauth('/first', api, {})
    const second = baseQueryWithReauth('/second', api, {})
    refresh.resolve({ error: { status: 401 } })
    await Promise.all([first, second])
    expect(rawQuery).toHaveBeenCalledTimes(1)
    expect(api.dispatch).toHaveBeenCalledTimes(1)
    expect(api.dispatch).toHaveBeenCalledWith({ type: 'auth/clearCredentials' })
    expect(getAccessToken()).toBeNull()
  })

  it.each(['failure', 'success'])('ignores old refresh %s after a new login', async (outcome) => {
    setTokens({ accessToken: jwt(-1), refreshToken: 'original' })
    const refresh = deferred()
    rawQuery.mockReturnValue(refresh.promise)
    const api = apiFor()
    const request = baseQueryWithReauth('/old-account', api, {})
    setTokens({ accessToken: 'new-login-access', refreshToken: 'new-login-refresh' })
    refresh.resolve(outcome === 'failure' ? { error: { status: 401 } } : pair())
    expect(await request).toMatchObject({ error: { data: { code: 'SESSION_CHANGED' } } })
    expect(getAccessToken()).toBe('new-login-access')
    expect(getRefreshToken()).toBe('new-login-refresh')
    expect(api.dispatch).not.toHaveBeenCalled()
    expect(rawQuery).toHaveBeenCalledTimes(1)
  })

  it('does not restore an old session after logout while refresh is pending', async () => {
    setTokens({ accessToken: jwt(-1), refreshToken: 'original' })
    const refresh = deferred()
    rawQuery.mockReturnValue(refresh.promise)
    const api = apiFor()
    const request = baseQueryWithReauth('/old-account', api, {})
    clearTokens()
    refresh.resolve(pair())
    await request
    expect(getAccessToken()).toBeNull()
    expect(api.dispatch).not.toHaveBeenCalled()
  })

  it('ignores old permission hydration after a newer login', async () => {
    setTokens({ accessToken: jwt(-1), refreshToken: 'original' })
    const me = deferred()
    rawQuery.mockImplementation((args) => pathOf(args) === '/auth/refresh' ? pair() : me.promise)
    const api = apiFor()
    const request = baseQueryWithReauth('/old-account', api, {})
    await tick()
    setTokens({ accessToken: 'new-login-access', refreshToken: 'new-login-refresh' })
    me.resolve({ data: { user: { id: 'old-user' } } })
    expect(await request).toMatchObject({ error: { data: { code: 'SESSION_CHANGED' } } })
    expect(api.dispatch.mock.calls.map(([action]) => action.type)).toEqual(['auth/tokenRefreshed'])
    expect(rawQuery.mock.calls.map(([args]) => pathOf(args))).toEqual(['/auth/refresh', '/auth/me'])
  })

  it('reuses the rotated token for a delayed 401 without another refresh', async () => {
    setTokens({ accessToken: jwt(), refreshToken: 'original' })
    const delayed = deferred()
    rawQuery.mockImplementation((args) => {
      const path = pathOf(args)
      if (path === '/auth/refresh') return pair()
      if (path === '/auth/me') return { data: { user: { id: 'same-user' } } }
      if (getRefreshToken() === 'rotated') return { data: path }
      return path === '/delayed' ? delayed.promise : { error: { status: 401 } }
    })
    const api = apiFor()
    const older = baseQueryWithReauth('/delayed', api, {})
    await baseQueryWithReauth('/fast', api, {})
    delayed.resolve({ error: { status: 401 } })
    expect(await older).toEqual({ data: '/delayed' })
    expect(rawQuery.mock.calls.filter(([args]) => pathOf(args) === '/auth/refresh')).toHaveLength(1)
  })

  it('lets an initiating caller abort without canceling shared refresh or logging out its waiter', async () => {
    setTokens({ accessToken: jwt(-1), refreshToken: 'original' })
    const refresh = deferred()
    rawQuery.mockImplementation((args) => pathOf(args) === '/auth/refresh' ? refresh.promise : { data: {} })
    const controller = new AbortController()
    const initiator = baseQueryWithReauth('/gone', apiFor(controller), {})
    const api = apiFor()
    const waiter = baseQueryWithReauth('/live', api, {})
    controller.abort()
    expect(await initiator).toMatchObject({ error: { error: 'AbortError' } })
    expect(rawQuery.mock.calls[0][1].signal.aborted).toBe(false)
    refresh.resolve(pair())
    expect(await waiter).toEqual({ data: {} })
    expect(rawQuery.mock.calls.some(([args]) => pathOf(args) === '/gone')).toBe(false)
    expect(api.dispatch.mock.calls.some(([action]) => action.type === 'auth/clearCredentials')).toBe(false)
  })
})

describe('bounded retry behavior', () => {
  it('returns 429 immediately while preserving Retry-After for recovery messaging', async () => {
    vi.useFakeTimers()
    rawQuery.mockResolvedValue({ error: { status: 429 }, meta: { response: { headers: new Headers({ 'retry-after': '900' }) } } })
    expect(await baseQueryWithReauth('/limited', apiFor(), {})).toMatchObject({ error: { status: 429, data: { retryAfterSeconds: 900 } } })
    expect(rawQuery).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('caps both configured retry count and long Retry-After delays', async () => {
    vi.useFakeTimers()
    rawQuery.mockResolvedValue({ error: { status: 503 }, meta: { response: { headers: new Headers({ 'retry-after': '900' }) } } })
    const request = baseQueryWithReauth('/unavailable', apiFor(), { maxRetries: 999 })
    await tick()
    await vi.advanceTimersByTimeAsync(29_999)
    expect(rawQuery).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(30_001)
    expect(await request).toMatchObject({ error: { status: 503 } })
    expect(rawQuery).toHaveBeenCalledTimes(3)
    expect(getConfiguredMaxRetries({ maxRetries: 999 })).toBe(2)
  })

  it('cancels pending retry timers without another network request', async () => {
    vi.useFakeTimers()
    rawQuery.mockResolvedValue({ error: { status: 503 } })
    const controller = new AbortController()
    const request = baseQueryWithReauth('/unavailable', apiFor(controller), {})
    await tick()
    controller.abort()
    expect(await request).toMatchObject({ error: { error: 'AbortError' } })
    expect(rawQuery).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not retry a write', async () => {
    rawQuery.mockResolvedValue({ error: { status: 503 } })
    await baseQueryWithReauth({ url: '/mutation', method: 'POST' }, apiFor(), {})
    expect(rawQuery).toHaveBeenCalledTimes(1)
  })
})
