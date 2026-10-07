import { COVERAGE_DOMAINS } from './coverageReadModel.js'
const keys = ['coverageContext', 'coverageFilter', 'coverageDomain']
export function readCoverageInspection(params, contextKey) {
  const defaults = { filter: 'All', selectedDomain: '', notice: '' }
  if (!keys.some(key => params.has(key))) return defaults
  if (params.get('coverageContext') !== contextKey) return { ...defaults, notice: 'Coverage inspection belongs to another context. Choose a filter or domain to reset it.' }
  const filter = params.get('coverageFilter') || 'All', selectedDomain = params.get('coverageDomain') || ''
  if (keys.some(key => params.getAll(key).length > 1) || !['All', 'Strong', 'Adequate', 'Gaps'].includes(filter)
    || (selectedDomain && !COVERAGE_DOMAINS.includes(selectedDomain))) return { ...defaults, notice: 'Coverage inspection link is invalid. Choose a filter or domain to reset it.' }
  return { filter, selectedDomain, notice: '' }
}
export function writeCoverageInspection(params, contextKey, inspection) {
  const next = new URLSearchParams(params)
  next.set('coverageContext', contextKey); next.set('coverageFilter', inspection.filter)
  if (inspection.selectedDomain) next.set('coverageDomain', inspection.selectedDomain); else next.delete('coverageDomain')
  return next
}
