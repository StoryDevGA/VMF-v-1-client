/**
 * AppInit Tests
 *
 * Covers:
 * - Renders children when no refresh token exists (idle state)
 * - Shows spinner when status is loading
 * - Triggers getMe when a refresh token is available
 * - (FE-05) resolvedPermissions from bootstrap getMe are stored in auth state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../../store/api/baseApi.js'
import authReducer from '../../store/slices/authSlice.js'
import { AppInit } from './AppInit'

vi.mock('../../store/api/authApi.js', () => ({
  useLazyGetMeQuery: vi.fn(),
}))

// Mock tokenStorage
vi.mock('../../utils/tokenStorage.js', () => ({
  hasRefreshToken: vi.fn(() => false),
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(() => null),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  isTokenExpired: vi.fn(() => false),
}))

import { useLazyGetMeQuery } from '../../store/api/authApi.js'
import { hasRefreshToken } from '../../utils/tokenStorage.js'

function createTestStore(preloadedState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
    preloadedState,
  })
}

describe('AppInit', () => {
  const triggerGetMe = vi.fn()

  beforeEach(() => {
    vi.restoreAllMocks()
    triggerGetMe.mockReset()
    useLazyGetMeQuery.mockReturnValue([triggerGetMe, {}])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children immediately when no refresh token exists', () => {
    hasRefreshToken.mockReturnValue(false)

    const store = createTestStore()
    render(
      <Provider store={store}>
        <AppInit>
          <div>App Content</div>
        </AppInit>
      </Provider>,
    )

    expect(screen.getByText('App Content')).toBeInTheDocument()
  })

  it('shows spinner when auth status is loading', () => {
    hasRefreshToken.mockReturnValue(false)

    const store = createTestStore({
      auth: { user: null, status: 'loading' },
    })
    render(
      <Provider store={store}>
        <AppInit>
          <div>App Content</div>
        </AppInit>
      </Provider>,
    )

    expect(screen.getByText(/restoring session/i)).toBeInTheDocument()
    expect(screen.queryByText('App Content')).not.toBeInTheDocument()
  })

  it('dispatches setLoading when refresh token exists', () => {
    hasRefreshToken.mockReturnValue(true)

    const store = createTestStore()
    render(
      <Provider store={store}>
        <AppInit>
          <div>App Content</div>
        </AppInit>
      </Provider>,
    )

    // Status should have transitioned to 'loading' via setLoading dispatch
    const state = store.getState()
    expect(state.auth.status).toBe('loading')
    expect(triggerGetMe).toHaveBeenCalledTimes(1)
  })

  it('revalidates the session when the window regains focus', () => {
    hasRefreshToken.mockReturnValue(true)

    const store = createTestStore({
      auth: { user: { id: 'u-1' }, status: 'authenticated', customerScopes: [], resolvedPermissions: null },
    })

    render(
      <Provider store={store}>
        <AppInit>
          <div>App Content</div>
        </AppInit>
      </Provider>,
    )

    triggerGetMe.mockClear()
    window.dispatchEvent(new Event('focus'))

    expect(triggerGetMe).toHaveBeenCalledTimes(1)
  })

  it('revalidates the session when the document becomes visible again', () => {
    hasRefreshToken.mockReturnValue(true)

    const store = createTestStore({
      auth: { user: { id: 'u-1' }, status: 'authenticated', customerScopes: [], resolvedPermissions: null },
    })

    render(
      <Provider store={store}>
        <AppInit>
          <div>App Content</div>
        </AppInit>
      </Provider>,
    )

    triggerGetMe.mockClear()

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })

    document.dispatchEvent(new Event('visibilitychange'))

    expect(triggerGetMe).toHaveBeenCalledTimes(1)
  })

  it('(FE-05) stores resolvedPermissions in auth state when bootstrap getMe resolves with them', () => {
    // Simulate what happens after getMe onQueryStarted calls setCredentials:
    // permission refresh behavior is deterministic — resolved permissions arrive
    // on bootstrap via AppInit→getMe and on token refresh via attemptRefresh→/auth/me.
    const store = createTestStore()

    store.dispatch({
      type: 'auth/setCredentials',
      payload: {
        user: { id: 'u-1', email: 'test@example.com', name: 'Test' },
        customerScopes: [],
        resolvedPermissions: {
          platform: { roleKeys: ['CUSTOMER_ADMIN'], permissions: ['SYSTEM_HEALTH_VIEW'] },
          customers: [{ customerId: 'cust-1', roleKeys: ['CUSTOMER_ADMIN'], permissions: ['USER_VIEW', 'TENANT_VIEW'] }],
          tenants: [],
        },
      },
    })

    const state = store.getState()
    expect(state.auth.resolvedPermissions).not.toBeNull()
    expect(state.auth.resolvedPermissions.platform.permissions).toContain('SYSTEM_HEALTH_VIEW')
    expect(state.auth.resolvedPermissions.customers[0].permissions).toContain('USER_VIEW')
    expect(state.auth.status).toBe('authenticated')
  })
})
