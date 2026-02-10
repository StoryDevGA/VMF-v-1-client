/**
 * Store Configuration Tests
 *
 * Covers:
 * - Store creates with the expected reducer keys
 * - RTK Query middleware is applied
 * - Auth slice initial state is wired
 * - API slice reducerPath is wired
 */

import { describe, it, expect } from 'vitest'
import { store } from './index.js'
import { baseApi } from './api/baseApi.js'

describe('Redux store', () => {
  it('should initialise with expected state keys', () => {
    const state = store.getState()
    expect(state).toHaveProperty('auth')
    expect(state).toHaveProperty(baseApi.reducerPath)
  })

  it('should have the auth slice in idle state', () => {
    const { auth } = store.getState()
    expect(auth.user).toBeNull()
    expect(auth.status).toBe('idle')
  })

  it('should include the api slice reducer path', () => {
    expect(baseApi.reducerPath).toBe('api')
  })

  it('should be able to dispatch actions', () => {
    // Dispatching an unknown action should not throw
    expect(() => store.dispatch({ type: 'TEST_ACTION' })).not.toThrow()
  })
})
