/**
 * AppInit Tests
 *
 * Covers:
 * - Renders children when no refresh token exists (idle state)
 * - Shows spinner when status is loading
 * - Triggers getMe when a refresh token is available
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../../store/api/baseApi.js'
import authReducer from '../../store/slices/authSlice.js'
import { AppInit } from './AppInit'

// Mock tokenStorage
vi.mock('../../utils/tokenStorage.js', () => ({
  hasRefreshToken: vi.fn(() => false),
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(() => null),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  isTokenExpired: vi.fn(() => false),
}))

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
  beforeEach(() => {
    vi.restoreAllMocks()
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
  })
})
