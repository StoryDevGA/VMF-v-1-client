import { acquisitionRunFromResponse, acquisitionRunFromError } from './acquisitionRunContract.js'

// Temporary transport ownership only. Canonical history belongs to the server.
export const createAcquisitionRequestTracker = (scope, sessionRevision) => {
  let pending = null
  let predecessorRunId = null
  let inFlight = false
  let savedBasis = null
  return {
    scope, sessionRevision,
    get pending() { return pending },
    get inFlight() { return inFlight },
    begin(operation, check = false) {
      if (inFlight || check && !pending || !check && (pending || savedBasis === operation.body.expectedUpdatedAt)) return null
      if (!check) pending = {
        ...operation,
        body: structuredClone({ ...operation.body, requestKey: crypto.randomUUID(),
          ...(predecessorRunId ? { predecessorRunId } : {}) }),
      }
      inFlight = true
      return { operation: pending, checking: check }
    },
    settle(attempt, payload, error = false) {
      if (pending !== attempt.operation) return null
      const read = error ? acquisitionRunFromError : acquisitionRunFromResponse
      const run = read(payload, scope, pending.body.requestKey)
      if (run && ['SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED'].includes(run.status)) {
        if (run.canonicalSaved) savedBasis = pending.body.expectedUpdatedAt
        pending = null
        predecessorRunId = run.status === 'SUCCEEDED' ? null : run.runId
      }
      return run
    },
    release(attempt) { if (pending === attempt.operation || !pending) inFlight = false },
  }
}
