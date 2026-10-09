import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import SourcesView from './SourcesView.jsx'

const flow = vi.hoisted(() => ({ pending: false, record: vi.fn(), refetch: vi.fn(), refreshed: vi.fn() }))
vi.mock('../../utils/tokenStorage.js', () => ({ getSessionRevision: () => 1, subscribeToSession: () => () => {} }))
const hash = `sha256:${'a'.repeat(64)}`
const control = { id: 'runtime-1', customerId: 'customer-1', tenantId: 'tenant-1', stateVersion: 'version-1' }
const facts = { authenticity: 'AUTHENTIC', sourceOrigin: 'Original publisher', organizationRelationship: 'External',
  independenceGroup: 'publisher-1', supportingReference: 'review:fixture', rationale: 'Checked original source.' }
const review = { ...facts, status: 'RECORDED_REVIEW', contractVersion: 'source-recorded-review.v1', sourceFingerprint: hash,
  reviewedBy: '64b000000000000000000001', reviewedAt: '2026-10-09T10:01:00Z' }
const source = { sourceId: 'source-1', label: 'Original publisher', sourceType: 'WEBSITE', materialFingerprint: hash,
  verificationContext: review }
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useRecordRuntimeSourceVerificationMutation: () => [flow.record],
  useGetRuntimeStateSourcesQuery: () => ({ currentData: { data: { control, sourceRegistry: [source], total: 1,
    totalPages: 1 } }, isFetching: flow.pending, refetch: flow.refetch }),
  useGetRuntimeStateEvidenceQuery: () => ({ currentData: { data: { control, sourceRegistry: [source], evidenceObjects: [],
    total: 0, totalPages: 1 } }, refetch: flow.refetch }),
}))
const props = { workspaceId: 'workspace-1', revisionId: control.id, customerId: control.customerId,
  tenantId: control.tenantId, stateVersion: control.stateVersion, active: true, canRead: true, locked: false,
  onSelectView: vi.fn(), onOpen: vi.fn(), onSourceReviewed: flow.refreshed,
  reviewAuthority: { canReviewEvidence: true, control, runtimeUpdatedAt: '2026-10-09T10:00:00Z' } }
beforeEach(() => { vi.clearAllMocks(); flow.pending = false; flow.refreshed.mockResolvedValue(true)
  flow.refetch.mockResolvedValue({ data: { data: { control: { ...control, stateVersion: 'version-2' }, sourceRegistry: [source] } } }) })

it('completes parent refresh after mutation invalidation temporarily unmounts the form', async () => {
  let finish
  flow.record.mockReturnValue({ unwrap: () => new Promise(resolve => { finish = resolve }) })
  const view = render(<MemoryRouter><SourcesView {...props} /></MemoryRouter>)
  await userEvent.click(screen.getByRole('button', { name: 'Record source review' }))
  flow.pending = true
  view.rerender(<MemoryRouter><SourcesView {...props} /></MemoryRouter>)
  expect(screen.queryByRole('button', { name: 'Record source review' })).not.toBeInTheDocument()
  finish({ data: { sourceId: source.sourceId, stateVersion: 'version-2', verificationContext: review } })
  await waitFor(() => expect(flow.refreshed).toHaveBeenCalledTimes(1))
})

it('rejects a late receipt after navigation changes the runtime scope', async () => {
  let finish
  flow.record.mockReturnValue({ unwrap: () => new Promise(resolve => { finish = resolve }) })
  const view = render(<MemoryRouter><SourcesView {...props} /></MemoryRouter>)
  await userEvent.click(screen.getByRole('button', { name: 'Record source review' }))
  view.rerender(<MemoryRouter><SourcesView {...props} revisionId="different-runtime" /></MemoryRouter>)
  finish({ data: { sourceId: source.sourceId, stateVersion: 'version-2', verificationContext: review } })
  await new Promise(resolve => setTimeout(resolve, 0))
  expect(flow.refreshed).not.toHaveBeenCalled()
})
