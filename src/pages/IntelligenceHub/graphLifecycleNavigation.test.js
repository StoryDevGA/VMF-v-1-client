import { describe, expect, it } from 'vitest'
import { readGraphLifecycle, graphContextReturnHref, readGraphInspection } from './intelligenceGraphModel.js'
describe('Graph lifecycle basis', () => {
  it.each([{ locked: true }, { state: 'LOCKED' }, { lockedAt: '2026-10-06T10:00:00.000Z' }])('recognises recorded locked basis %j', lock => {
    expect(readGraphLifecycle({ lock })).toBe('LOCKED')
  })
  it.each([{ locked: false }, { state: 'UNLOCKED' }])('recognises editable lifecycle without implying authority %j', lock => {
    expect(readGraphLifecycle({ lock })).toBe('UNLOCKED')
  })
  it.each([undefined, {}, { locked: 'true' }, { state: 'INVENTED' }, { locked: false, state: 'LOCKED' }, { locked: true, state: 'UNLOCKED' },
    { locked: false, lockedAt: '2026-10-06T10:00:00.000Z' }, { lockedAt: 'invalid' }, { lockedAt: true }])('withholds uncertain or contradictory basis %j', lock => {
    expect(readGraphLifecycle({ lock })).toBe('UNAVAILABLE')
  })
  it.each([{ loading: true }, { error: { status: 503 } }])('does not retain a lock label while the current read is unavailable', flags => {
    expect(readGraphLifecycle({ lock: { locked: true }, ...flags })).toBe('UNAVAILABLE')
  })
})
describe('scoped Graph return from Context', () => {
  const context = 'workspace:revision:customer:tenant'
  const initial = () => new URLSearchParams({ runtimeInstanceId: 'workspace', revisionId: 'revision', view: 'context', graphContextReturn: 'inspection',
    graphInspectionContext: context, graphMode: 'Impact', graphQuery: 'Proof & exact', graphObjectId: 'source:outside', graphObjectView: 'object', graphAfterEdgeKey: 'edge:a:047' })
  it('returns the exact scoped inspection with only its explicit marker removed', () => {
    const params = initial(), href = graphContextReturnHref(params, context), returned = new URL(href, 'http://local')
    expect(returned.pathname).toBe('/app/intelligence'); expect(returned.searchParams.get('view')).toBe('intelligence-graph')
    expect(returned.searchParams.has('graphContextReturn')).toBe(false)
    expect(readGraphInspection(returned.searchParams, context)).toEqual(readGraphInspection(params, context))
  })
  it.each(['duplicate', 'wrong marker', 'wrong scope', 'group', 'malformed', 'unknown mode'])('rejects %s navigation', condition => {
    const params = initial()
    if (condition === 'duplicate') params.append('graphContextReturn', 'inspection')
    if (condition === 'wrong marker') params.set('graphContextReturn', 'https://outside')
    if (condition === 'wrong scope') params.set('graphInspectionContext', 'other')
    if (condition === 'group') params.set('graphObjectView', 'group')
    if (condition === 'malformed') params.set('graphObjectId', 'source:\nprivate')
    if (condition === 'unknown mode') params.set('graphMode', 'Invented')
    expect(graphContextReturnHref(params, context)).toBe('')
  })
})
