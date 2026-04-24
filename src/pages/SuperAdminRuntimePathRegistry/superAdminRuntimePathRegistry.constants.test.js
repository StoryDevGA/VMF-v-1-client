import { describe, expect, it } from 'vitest'
import { buildRuntimePathRegistryStableId } from './superAdminRuntimePathRegistry.constants.js'

describe('buildRuntimePathRegistryStableId', () => {
  it('matches the API stable-id format including the hash suffix', () => {
    const stableId = buildRuntimePathRegistryStableId('framework_state.lifecycle.stage')

    expect(stableId).toMatch(/^path-framework-state-lifecycle-stage-[a-z0-9]+$/)
    expect(stableId).not.toBe('path-framework-state-lifecycle-stage')
  })
})
