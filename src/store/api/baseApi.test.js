import { describe, expect, it } from 'vitest'
import { getConfiguredMaxRetries } from './baseApi.js'

describe('baseApi retry configuration', () => {
  it('keeps the global retry default when no endpoint override is supplied', () => {
    expect(getConfiguredMaxRetries()).toBe(2)
    expect(getConfiguredMaxRetries({})).toBe(2)
  })

  it('honours a non-negative endpoint retry override', () => {
    expect(getConfiguredMaxRetries({ maxRetries: 0 })).toBe(0)
    expect(getConfiguredMaxRetries({ maxRetries: 1 })).toBe(1)
  })

  it('rejects invalid endpoint retry overrides', () => {
    expect(getConfiguredMaxRetries({ maxRetries: -1 })).toBe(2)
    expect(getConfiguredMaxRetries({ maxRetries: '0' })).toBe(2)
  })
})
