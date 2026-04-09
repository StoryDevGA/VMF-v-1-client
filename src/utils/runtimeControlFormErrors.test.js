import { describe, expect, it } from 'vitest'
import { normalizeError } from './errors.js'
import { getRuntimeControlFieldErrorMap } from './runtimeControlFormErrors.js'

describe('getRuntimeControlFieldErrorMap', () => {
  it('maps explicit field pointers from normalized app errors', () => {
    const appError = normalizeError({
      status: 409,
      data: {
        error: {
          code: 'CONFLICT',
          message: 'Framework key must be unique.',
          details: {
            field: 'frameworkKey',
            reason: 'FRAMEWORK_REGISTRY_KEY_CONFLICT',
          },
        },
      },
    })

    expect(
      getRuntimeControlFieldErrorMap(appError, ['frameworkKey', 'compatibleWorkflowKeys']),
    ).toEqual({
      frameworkKey: 'Framework key must be unique.',
    })
  })

  it('maps keyed validation payloads for runtime-control forms', () => {
    const appError = normalizeError({
      status: 422,
      data: {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Please check the form for errors.',
          details: {
            frameworkKey: 'Selected framework key is not available.',
            compatibleWorkflowKeys: {
              message: 'Compatible workflow keys contain an unsupported key.',
            },
          },
        },
      },
    })

    expect(
      getRuntimeControlFieldErrorMap(appError, ['frameworkKey', 'compatibleWorkflowKeys']),
    ).toEqual({
      frameworkKey: 'Selected framework key is not available.',
      compatibleWorkflowKeys: 'Compatible workflow keys contain an unsupported key.',
    })
  })
})
