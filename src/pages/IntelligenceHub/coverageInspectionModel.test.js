import { describe, expect, it } from 'vitest'
import { readCoverageInspection, writeCoverageInspection } from './coverageInspectionModel.js'
describe('Coverage scoped navigation', () => {
  const context = 'workspace:revision:customer:tenant'
  it('roundtrips exact filter/domain without changing scope or handoff state', () => {
    const params = writeCoverageInspection(new URLSearchParams('revisionId=revision&view=coverage'), context, { filter: 'Strong', selectedDomain: 'Proof' })
    expect(readCoverageInspection(params, context)).toEqual({ filter: 'Strong', selectedDomain: 'Proof', notice: '' })
    expect(params.get('revisionId')).toBe('revision')
    expect(writeCoverageInspection(params, context, { filter: 'Gaps', selectedDomain: '' }).has('coverageDomain')).toBe(false)
  })
  it.each(['duplicate', 'filter', 'domain', 'control', 'wrong scope'])('discloses invalid %s instead of preserving a previous selection', kind => {
    const params = writeCoverageInspection(new URLSearchParams(), context, { filter: 'Strong', selectedDomain: 'Proof' })
    if (kind === 'duplicate') params.append('coverageDomain', 'Company')
    if (kind === 'filter') params.set('coverageFilter', 'Invented')
    if (kind === 'domain') params.set('coverageDomain', 'Finance')
    if (kind === 'control') params.set('coverageDomain', 'Proof\n')
    if (kind === 'wrong scope') params.set('coverageContext', 'other')
    const read = readCoverageInspection(params, context)
    expect(read.selectedDomain).toBe(''); expect(read.notice).not.toBe('')
  })
})
