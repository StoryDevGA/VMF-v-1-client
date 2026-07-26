import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SuperAdminOutcomeStudioReadiness from './SuperAdminOutcomeStudioReadiness.jsx'
import { DEVELOPMENT_TEST_POLICY_VERSION } from './outcomeStudioReadinessForm.js'

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  current: vi.fn(),
  history: vi.fn(),
  references: vi.fn(),
  referenceHistory: vi.fn(),
  updateMutation: vi.fn(),
  updateUnwrap: vi.fn(),
  uploadMutation: vi.fn(),
  uploadUnwrap: vi.fn(),
  approveMutation: vi.fn(),
  approveUnwrap: vi.fn(),
  supersedeMutation: vi.fn(),
  supersedeUnwrap: vi.fn(),
  downloadMutation: vi.fn(),
  downloadUnwrap: vi.fn(),
  referenceQueryArgs: [],
  referenceHistoryQueryArgs: [],
}))

vi.mock('../../components/Toaster', () => ({ useToaster: () => ({ addToast: mocks.addToast }) }))
vi.mock('../../store/api/outcomeStudioReadinessApi.js', () => ({
  useGetOutcomeStudioReadinessQuery: () => mocks.current(),
  useGetOutcomeStudioReadinessHistoryQuery: () => mocks.history(),
  useListOutcomeStudioTestReferencesQuery: (args, options) => {
    mocks.referenceQueryArgs.push({ args, options })
    return mocks.references(args, options)
  },
  useGetOutcomeStudioTestReferenceHistoryQuery: (args, options) => {
    mocks.referenceHistoryQueryArgs.push({ args, options })
    return mocks.referenceHistory(args, options)
  },
  useUpdateOutcomeStudioDevelopmentTestReadinessMutation: () => [mocks.updateMutation, { isLoading: false }],
  useUploadOutcomeStudioTestReferenceMutation: () => [mocks.uploadMutation, { isLoading: false }],
  useApproveOutcomeStudioTestReferenceMutation: () => [mocks.approveMutation, { isLoading: false }],
  useSupersedeOutcomeStudioTestReferenceMutation: () => [mocks.supersedeMutation, { isLoading: false }],
  useDownloadOutcomeStudioTestReferenceMutation: () => [mocks.downloadMutation, { isLoading: false }],
}))

const currentRefetch = vi.fn()
const historyRefetch = vi.fn()
const referencesRefetch = vi.fn()
const approvedDecision = { status: 'APPROVED', productApproverName: 'Pat Product', productApproverRole: 'Product Owner', rationale: 'Approved for controlled TEST engineering.', recordedBy: { id: 'admin-id', name: 'Super Administrator' }, recordedAt: '2026-07-21T10:00:00.000Z' }
const legacyProjection = { data: { revision: 1, policyVersion: 'LEGACY_SLICE_5A_V1', verdict: 'SLICE_5_APPLICATION_BLOCKED', blockers: [{ code: 'RUBRIC_NOT_APPROVED' }], createdBy: 'legacy-admin', createdAt: '2026-07-17T10:00:00.000Z', rubric: { rubricKey: 'must-not-hydrate' } } }
const developmentProjection = { data: { policyVersion: DEVELOPMENT_TEST_POLICY_VERSION, revision: 2, environment: 'TEST', verdict: 'BLOCKED_FOR_TESTING', blockers: [{ code: 'TEST_REFERENCE_EXAMPLES_BLOCKED', gate: 'TEST_REFERENCE_EXAMPLES' }], gateResults: [{ gate: 'QUALITY_RUBRIC', status: 'PASSED' }, { gate: 'TEST_REFERENCE_EXAMPLES', status: 'BLOCKED' }, { gate: 'SAFE_PROVIDER_POLICY', status: 'PASSED' }, { gate: 'PRODUCT_TESTING_APPROVAL', status: 'PASSED' }], rubric: { rubricKey: 'consultancy-quality-rubric', rubricVersion: '1.0', threshold: 85, decision: approvedDecision }, providerPolicy: { providerKey: 'approved-provider', model: 'approved-model', environment: 'TEST', safeContextPolicyKey: 'OUTCOME_STUDIO_PROVIDER_SAFE_CONTEXT_V1', failurePosture: 'FAIL_CLOSED', decision: approvedDecision }, testingApproval: { purpose: 'CONTROLLED_TEST_ENGINEERING_VALIDATION', decision: approvedDecision }, createdBy: 'admin-id', createdAt: '2026-07-21T11:00:00.000Z' } }
const draftReference = { referenceKey: '11111111-1111-4111-8111-111111111111', revision: 1, family: 'PROFESSIONAL_DOCUMENT', title: 'Board paper reference', purpose: '', status: 'DRAFT', originalFileName: 'board-paper.pdf', mimeType: 'application/pdf', byteLength: 120, createdAt: '2026-07-21T09:00:00.000Z' }
const approvedReference = { ...draftReference, referenceKey: '22222222-2222-4222-8222-222222222222', revision: 2, title: 'Approved board paper', status: 'APPROVED', productApproval: approvedDecision }
const approvedReplacement = { ...approvedReference, referenceKey: '33333333-3333-4333-8333-333333333333', title: 'Replacement board paper' }

function setQueries({ current = {}, history = {}, references = {}, referenceHistory = {} } = {}) {
  mocks.current.mockReturnValue({ data: legacyProjection, isLoading: false, isFetching: false, error: null, refetch: currentRefetch, ...current })
  mocks.history.mockReturnValue({ data: { data: [] }, isLoading: false, isFetching: false, error: null, refetch: historyRefetch, ...history })
  mocks.references.mockReturnValue({ data: { data: [], meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }, isLoading: false, isFetching: false, error: null, refetch: referencesRefetch, ...references })
  mocks.referenceHistory.mockReturnValue({ data: { data: [] }, isLoading: false, isFetching: false, error: null, ...referenceHistory })
}

function renderPage() {
  return render(<MemoryRouter><SuperAdminOutcomeStudioReadiness /></MemoryRouter>)
}

async function fillMinimumReadiness(user) {
  await user.type(screen.getByLabelText(/Rubric key/), 'consultancy-quality-rubric')
  await user.type(screen.getByLabelText(/Rubric version/), '1.0')
  await user.type(screen.getByLabelText(/Provider key/), 'approved-provider')
  await user.type(screen.getByLabelText(/Model/), 'approved-model')
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.referenceQueryArgs.length = 0
  mocks.referenceHistoryQueryArgs.length = 0
  currentRefetch.mockResolvedValue({})
  historyRefetch.mockResolvedValue({})
  referencesRefetch.mockResolvedValue({})
  mocks.updateMutation.mockImplementation(() => ({ unwrap: mocks.updateUnwrap }))
  mocks.uploadMutation.mockImplementation(() => ({ unwrap: mocks.uploadUnwrap }))
  mocks.approveMutation.mockImplementation(() => ({ unwrap: mocks.approveUnwrap }))
  mocks.supersedeMutation.mockImplementation(() => ({ unwrap: mocks.supersedeUnwrap }))
  mocks.downloadMutation.mockImplementation(() => ({ unwrap: mocks.downloadUnwrap }))
  mocks.updateUnwrap.mockResolvedValue({ data: developmentProjection.data })
  mocks.uploadUnwrap.mockResolvedValue({ data: draftReference })
  mocks.approveUnwrap.mockResolvedValue({ data: approvedReference })
  mocks.supersedeUnwrap.mockResolvedValue({ data: { ...approvedReference, status: 'SUPERSEDED' } })
  mocks.downloadUnwrap.mockResolvedValue({ blob: new Blob(['pdf'], { type: 'application/pdf' }), filename: 'board-paper.pdf', mimeType: 'application/pdf' })
  URL.createObjectURL = vi.fn(() => 'blob:test-reference')
  URL.revokeObjectURL = vi.fn()
  setQueries()
})

describe('SuperAdminOutcomeStudioReadiness', () => {
  it('uses the standard loading state without flashing readiness content', () => {
    setQueries({ current: { data: undefined, isLoading: true } })
    renderPage()
    expect(screen.getByText('Loading application readiness')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Current readiness' })).not.toBeInTheDocument()
  })

  it('renders the exact four-gate experience and removes retired TEST controls', () => {
    const { container } = renderPage()
    for (const heading of ['Quality rubric', 'TEST reference examples', 'Safe provider policy', 'Product testing approval']) expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    expect(container.querySelector('main')).toBeNull()
    expect(screen.getByRole('region', { name: 'Application Readiness Administration' })).toBeInTheDocument()
    expect(screen.getByText(/Reference approval or supersession does not alter the immutable current readiness verdict/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Legacy policy transition')).toHaveTextContent('blank Development/Test record')
    expect(screen.getByLabelText(/Rubric key/)).toHaveValue('')
    expect(screen.queryByText('Independent authority decisions')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Evidence HTTPS URI')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('SHA-256')).not.toBeInTheDocument()
    expect(screen.queryByText('Named reviewer')).not.toBeInTheDocument()
    expect(screen.getByText('OUTCOME_STUDIO_PROVIDER_SAFE_CONTEXT_V1')).toBeInTheDocument()
  })

  it('hydrates Development/Test fields and renders server-derived gates', async () => {
    setQueries({ current: { data: developmentProjection } })
    renderPage()
    await waitFor(() => expect(screen.getByLabelText(/Rubric key/)).toHaveValue('consultancy-quality-rubric'))
    expect(screen.getByLabelText(/Provider key/)).toHaveValue('approved-provider')
    expect(screen.getByLabelText('Development/Test gate results')).toHaveTextContent('Quality rubricPASSED')
    expect(screen.getByLabelText('Development/Test gate results')).toHaveTextContent('TEST reference examplesBLOCKED')
    expect(screen.queryByLabelText('Legacy policy transition')).not.toBeInTheDocument()
  })

  it('labels mixed readiness history by policy', () => {
    setQueries({ history: { data: { data: [legacyProjection.data, developmentProjection.data] } } })
    renderPage()
    const history = screen.getByRole('list', { name: 'Readiness revision history' })
    expect(within(history).getByText('Legacy Slice 5A policy')).toBeInTheDocument()
    expect(within(history).getByText('Development/Test policy')).toBeInTheDocument()
    expect(within(history).getByText('BLOCKED_FOR_TESTING')).toBeInTheDocument()
  })

  it('shows current, reference, and history loading/error/empty states through standard components', () => {
    setQueries({ references: { data: undefined, isLoading: true }, history: { data: undefined, isLoading: true } })
    const { rerender } = renderPage()
    expect(screen.getByText('Loading TEST references')).toBeInTheDocument()
    expect(screen.getByText('Loading readiness history')).toBeInTheDocument()
    setQueries({ references: { data: undefined, error: { status: 503, data: { code: 'SERVICE_UNAVAILABLE' } } }, history: { data: undefined, error: { status: 500, data: { code: 'SERVER_ERROR' } } } })
    rerender(<MemoryRouter><SuperAdminOutcomeStudioReadiness /></MemoryRouter>)
    expect(screen.getAllByRole('alert')).toHaveLength(2)
  })

  it('validates locally, confirms, and sends only the exact new-policy payload', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Review readiness revision' }))
    expect(mocks.updateMutation).not.toHaveBeenCalled()
    expect(screen.getAllByText('Use a lowercase stable key of 1 to 140 characters')).toHaveLength(2)
    await fillMinimumReadiness(user)
    await user.click(screen.getByRole('button', { name: 'Review readiness revision' }))
    expect(screen.getByRole('heading', { name: 'Record readiness revision?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Record revision' }))
    await waitFor(() => expect(mocks.updateMutation).toHaveBeenCalledTimes(1))
    expect(mocks.updateMutation).toHaveBeenCalledWith({ expectedRevision: 1, rubric: { rubricKey: 'consultancy-quality-rubric', rubricVersion: '1.0', threshold: 85, decision: { status: 'OPEN', productApproverName: '', productApproverRole: '', rationale: '' } }, providerPolicy: { providerKey: 'approved-provider', model: 'approved-model', decision: { status: 'OPEN', productApproverName: '', productApproverRole: '', rationale: '' } }, testingApproval: { decision: { status: 'OPEN', productApproverName: '', productApproverRole: '', rationale: '' } } })
    expect(JSON.stringify(mocks.updateMutation.mock.calls[0][0])).not.toMatch(/policyVersion|createdBy|recordedAt|safeContextPolicyKey|failurePosture|verdict|blockers|contentHash/)
    expect(currentRefetch).toHaveBeenCalled()
    expect(historyRefetch).toHaveBeenCalled()
    expect(referencesRefetch).toHaveBeenCalled()
  })

  it('clears Product attribution when an approval returns to OPEN', async () => {
    const user = userEvent.setup()
    renderPage()
    const rubricSection = screen.getByRole('heading', { name: 'Quality rubric' }).closest('section')
    await user.selectOptions(within(rubricSection).getByLabelText('Product decision'), 'APPROVED')
    await user.type(within(rubricSection).getByLabelText(/Product approver name/), 'Pat Product')
    await user.selectOptions(within(rubricSection).getByLabelText('Product decision'), 'OPEN')
    expect(within(rubricSection).queryByLabelText(/Product approver name/)).not.toBeInTheDocument()
  })

  it('binds server 422 fields and reloads stale readiness conflicts without claiming success', async () => {
    const user = userEvent.setup()
    mocks.updateUnwrap.mockRejectedValueOnce({ status: 422, data: { error: { message: 'Rubric key rejected', details: { path: 'body.rubric.rubricKey' } } } })
    renderPage()
    await fillMinimumReadiness(user)
    await user.click(screen.getByRole('button', { name: 'Review readiness revision' }))
    await user.click(screen.getByRole('button', { name: 'Record revision' }))
    expect(await screen.findByText('Rubric key rejected')).toBeInTheDocument()
    expect(currentRefetch).not.toHaveBeenCalled()
    mocks.updateUnwrap.mockRejectedValueOnce({ status: 409, data: { error: { code: 'OUTCOME_STUDIO_READINESS_REVISION_CONFLICT' } } })
    await user.click(screen.getByRole('button', { name: 'Record revision' }))
    await waitFor(() => expect(currentRefetch).toHaveBeenCalled())
    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Readiness revision changed', variant: 'warning' }))
  })

  it('renders reference lifecycle actions for DRAFT, APPROVED, and SUPERSEDED states', () => {
    setQueries({ references: { data: { data: [draftReference, approvedReference, { ...approvedReference, referenceKey: '44444444-4444-4444-8444-444444444444', status: 'SUPERSEDED' }], meta: { total: 3 } } } })
    renderPage()
    expect(screen.getByRole('table', { name: 'Outcome Studio TEST references' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record approval' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Supersede' })).toBeInTheDocument()
    expect(screen.getAllByText('SUPERSEDED')).toHaveLength(1)
    expect(screen.getByText('Showing 3 of 3 references.')).toBeInTheDocument()
  })

  it('navigates every server page in the TEST reference catalogue', async () => {
    const user = userEvent.setup()
    mocks.references.mockImplementation(({ page }) => ({
      data: {
        data: page === 2 ? [approvedReplacement] : [draftReference],
        meta: { page, pageSize: 25, total: 26, totalPages: 2 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: referencesRefetch,
    }))
    renderPage()
    const pagination = screen.getByRole('navigation', { name: 'TEST reference catalogue pagination' })
    expect(within(pagination).getByText('Page 1 of 2')).toBeInTheDocument()
    expect(within(pagination).getByRole('button', { name: 'First' })).toBeDisabled()
    expect(within(pagination).getByRole('button', { name: 'Previous' })).toBeDisabled()
    await user.click(within(pagination).getByRole('button', { name: 'Last' }))
    expect(await within(pagination).findByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('Replacement board paper')).toBeInTheDocument()
    expect(within(pagination).getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(within(pagination).getByRole('button', { name: 'Last' })).toBeDisabled()
    expect(mocks.referenceQueryArgs.some(({ args, options }) => args.page === 2 && options === undefined)).toBe(true)
  })

  it('disables all catalogue pagination controls while fetching', () => {
    setQueries({ references: { data: { data: [draftReference], meta: { page: 1, pageSize: 25, total: 26, totalPages: 2 } }, isFetching: true } })
    renderPage()
    const pagination = screen.getByRole('navigation', { name: 'TEST reference catalogue pagination' })
    for (const label of ['First', 'Previous', 'Next', 'Last']) expect(within(pagination).getByRole('button', { name: label })).toBeDisabled()
  })

  it('rejects invalid upload metadata before reading and uploads an exact PDF payload', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Upload reference' }))
    const fileInput = screen.getByLabelText('PDF file')
    const invalid = new File(['bad'], 'bad.txt', { type: 'text/plain' })
    fireEvent.change(fileInput, {
      target: {
        files: {
          0: invalid,
          length: 1,
          item: (index) => index === 0 ? invalid : null,
        },
      },
    })
    await user.type(screen.getByLabelText(/Reference title/), 'Reference')
    await user.click(screen.getByRole('button', { name: 'Upload PDF' }))
    const fileError = await screen.findByText('Select a PDF filename without a path')
    expect(fileInput).toHaveAttribute('aria-invalid', 'true')
    expect(fileInput).toHaveAttribute('aria-describedby', fileError.id)
    expect(mocks.uploadMutation).not.toHaveBeenCalled()
    const pdf = new File(['%PDF-1.4\n%%EOF'], 'reference.pdf', { type: 'application/pdf' })
    Object.defineProperty(pdf, 'arrayBuffer', { value: vi.fn().mockResolvedValue(new TextEncoder().encode('%PDF-1.4\n%%EOF').buffer) })
    await user.upload(fileInput, pdf)
    await user.click(screen.getByRole('button', { name: 'Upload PDF' }))
    await waitFor(() => expect(mocks.uploadMutation).toHaveBeenCalledTimes(1))
    expect(mocks.uploadMutation).toHaveBeenCalledWith(expect.objectContaining({ family: 'PROFESSIONAL_DOCUMENT', title: 'Reference', purpose: '', originalFileName: 'reference.pdf', mimeType: 'application/pdf', contentBase64: expect.any(String) }))
    expect(referencesRefetch).toHaveBeenCalled()
  })

  it('requires explicit reference approval confirmation and records exact Product attribution', async () => {
    const user = userEvent.setup()
    setQueries({ references: { data: { data: [draftReference], meta: { total: 1 } } } })
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Record approval' }))
    expect(screen.getByText(/server records your authenticated identity separately/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mocks.approveMutation).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Record approval' }))
    await user.type(screen.getByLabelText(/Product approver name/), 'Pat Product')
    await user.type(screen.getByLabelText(/Product approver role/), 'Product Owner')
    await user.type(screen.getByLabelText(/Approval rationale/), 'Approved for controlled testing.')
    const approvalDialog = screen.getByRole('dialog', { name: 'Record Product approval' })
    await user.click(within(approvalDialog).getByRole('button', { name: 'Record approval' }))
    await waitFor(() => expect(mocks.approveMutation).toHaveBeenCalledWith({ referenceKey: draftReference.referenceKey, expectedRevision: 1, approverName: 'Pat Product', approverRole: 'Product Owner', rationale: 'Approved for controlled testing.' }))
    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Product approval recorded',
      description: expect.stringMatching(/record a new readiness revision/i),
    }))
  })

  it('refetches and closes a stale approval dialog after a 409 conflict', async () => {
    const user = userEvent.setup()
    let resolveRefetch
    referencesRefetch.mockReturnValueOnce(new Promise((resolve) => { resolveRefetch = resolve }))
    mocks.approveUnwrap.mockRejectedValueOnce({ status: 409, data: { error: { code: 'OUTCOME_STUDIO_TEST_REFERENCE_REVISION_CONFLICT' } } })
    setQueries({ references: { data: { data: [draftReference], meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 } } } })
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Record approval' }))
    await user.type(screen.getByLabelText(/Product approver name/), 'Pat Product')
    await user.type(screen.getByLabelText(/Product approver role/), 'Product Owner')
    await user.type(screen.getByLabelText(/Approval rationale/), 'Approved for controlled testing.')
    const dialog = screen.getByRole('dialog', { name: 'Record Product approval' })
    const submitButton = within(dialog).getByRole('button', { name: 'Record approval' })
    await user.click(submitButton)
    await waitFor(() => expect(referencesRefetch).toHaveBeenCalled())
    expect(submitButton).toBeDisabled()
    expect(mocks.approveMutation).toHaveBeenCalledTimes(1)
    resolveRefetch({ data: { meta: { totalPages: 1 } } })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Record Product approval' })).not.toBeInTheDocument())
    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Reference revision changed', variant: 'warning' }))
  })

  it('paginates same-family approved replacements and retains the selected candidate', async () => {
    const user = userEvent.setup()
    const wrongFamily = { ...approvedReplacement, referenceKey: '55555555-5555-4555-8555-555555555555', family: 'INFOGRAPHIC', title: 'Wrong family' }
    mocks.references.mockImplementation(({ page }, options) => {
      if (!options) return { data: { data: [approvedReference], meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 } }, isLoading: false, isFetching: false, error: null, refetch: referencesRefetch }
      return { data: { data: page === 2 ? [approvedReplacement] : [approvedReference, wrongFamily], meta: { page, pageSize: 25, total: 26, totalPages: 2 } }, isLoading: false, isFetching: false, error: null, refetch: referencesRefetch }
    })
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Supersede' }))
    const dialog = screen.getByRole('dialog', { name: 'Supersede TEST reference' })
    const candidatePagination = within(dialog).getByRole('navigation', { name: 'Replacement candidate pagination' })
    expect(within(candidatePagination).getByRole('button', { name: 'First' })).toBeDisabled()
    expect(within(candidatePagination).getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(within(dialog).getByLabelText('Approved replacement')).not.toHaveTextContent('Wrong family')
    await user.click(within(candidatePagination).getByRole('button', { name: 'Next' }))
    expect(within(candidatePagination).getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(within(candidatePagination).getByRole('button', { name: 'Last' })).toBeDisabled()
    const replacementSelect = within(dialog).getByLabelText('Approved replacement')
    await user.selectOptions(replacementSelect, approvedReplacement.referenceKey)
    await user.click(within(candidatePagination).getByRole('button', { name: 'Previous' }))
    expect(within(dialog).getByLabelText('Approved replacement')).toHaveValue(approvedReplacement.referenceKey)
    expect(within(dialog).getByLabelText('Approved replacement')).toHaveTextContent('Replacement board paper')
    await user.type(within(dialog).getByLabelText(/Reason/), 'Higher quality approved example.')
    await user.click(within(dialog).getByRole('button', { name: 'Supersede reference' }))
    await waitFor(() => expect(mocks.supersedeMutation).toHaveBeenCalledWith({ referenceKey: approvedReference.referenceKey, expectedRevision: 2, replacementReferenceKey: approvedReplacement.referenceKey, reason: 'Higher quality approved example.' }))
    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'TEST reference superseded',
      description: expect.stringMatching(/record a new readiness revision/i),
    }))
  })

  it('refetches and closes a stale supersession dialog after a 409 conflict', async () => {
    const user = userEvent.setup()
    let resolveRefetch
    referencesRefetch.mockReturnValueOnce(new Promise((resolve) => { resolveRefetch = resolve }))
    mocks.supersedeUnwrap.mockRejectedValueOnce({ status: 409, data: { error: { code: 'OUTCOME_STUDIO_TEST_REFERENCE_REVISION_CONFLICT' } } })
    setQueries({ references: { data: { data: [approvedReference, approvedReplacement], meta: { page: 1, pageSize: 25, total: 2, totalPages: 1 } } } })
    renderPage()
    const supersedeButtons = screen.getAllByRole('button', { name: 'Supersede' })
    await user.click(supersedeButtons[0])
    const dialog = screen.getByRole('dialog', { name: 'Supersede TEST reference' })
    await user.selectOptions(within(dialog).getByLabelText('Approved replacement'), approvedReplacement.referenceKey)
    await user.type(within(dialog).getByLabelText(/Reason/), 'Higher quality approved example.')
    const submitButton = within(dialog).getByRole('button', { name: 'Supersede reference' })
    await user.click(submitButton)
    await waitFor(() => expect(referencesRefetch).toHaveBeenCalled())
    expect(submitButton).toBeDisabled()
    expect(mocks.supersedeMutation).toHaveBeenCalledTimes(1)
    resolveRefetch({ data: { meta: { totalPages: 1 } } })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Supersede TEST reference' })).not.toBeInTheDocument())
    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Reference revision changed', variant: 'warning' }))
  })

  it('disables replacement pagination while candidates are fetching', async () => {
    const user = userEvent.setup()
    mocks.references.mockImplementation((_args, options) => options
      ? { data: { data: [approvedReplacement], meta: { page: 1, pageSize: 25, total: 26, totalPages: 2 } }, isLoading: false, isFetching: true, error: null, refetch: referencesRefetch }
      : { data: { data: [approvedReference], meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 } }, isLoading: false, isFetching: false, error: null, refetch: referencesRefetch })
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Supersede' }))
    const pagination = within(screen.getByRole('dialog', { name: 'Supersede TEST reference' })).getByRole('navigation', { name: 'Replacement candidate pagination' })
    for (const label of ['First', 'Previous', 'Next', 'Last']) expect(within(pagination).getByRole('button', { name: label })).toBeDisabled()
  })

  it('downloads authenticated reference bytes and reads immutable reference history', async () => {
    const user = userEvent.setup()
    setQueries({ references: { data: { data: [draftReference], meta: { total: 1 } } }, referenceHistory: { data: { data: [draftReference] } } })
    renderPage()
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await user.click(screen.getByRole('button', { name: 'Download' }))
    await waitFor(() => expect(mocks.downloadMutation).toHaveBeenCalledWith(draftReference.referenceKey))
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(anchorClick).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'History' }))
    expect(screen.getByRole('list', { name: 'TEST reference revision history' })).toHaveTextContent('Revision 1')
    anchorClick.mockRestore()
  })

  it('navigates immutable reference history pages', async () => {
    const user = userEvent.setup()
    setQueries({ references: { data: { data: [draftReference], meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 } } } })
    mocks.referenceHistory.mockImplementation(({ page }) => ({ data: { data: [{ ...draftReference, revision: page }], meta: { page, pageSize: 25, total: 26, totalPages: 2 } }, isLoading: false, isFetching: false, error: null }))
    renderPage()
    await user.click(screen.getByRole('button', { name: 'History' }))
    const dialog = screen.getByRole('dialog', { name: 'Reference history' })
    const pagination = within(dialog).getByRole('navigation', { name: 'Reference history pagination' })
    expect(within(dialog).getByText('Revision 1')).toBeInTheDocument()
    expect(within(pagination).getByRole('button', { name: 'First' })).toBeDisabled()
    expect(within(pagination).getByRole('button', { name: 'Previous' })).toBeDisabled()
    await user.click(within(pagination).getByRole('button', { name: 'Last' }))
    expect(await within(dialog).findByText('Revision 2')).toBeInTheDocument()
    expect(within(pagination).getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(within(pagination).getByRole('button', { name: 'Last' })).toBeDisabled()
    expect(mocks.referenceHistoryQueryArgs.some(({ args }) => args.page === 2 && args.pageSize === 25)).toBe(true)
  })

  it('disables reference history pagination while fetching', async () => {
    const user = userEvent.setup()
    setQueries({ references: { data: { data: [draftReference], meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 } } }, referenceHistory: { data: { data: [draftReference], meta: { page: 1, pageSize: 25, total: 26, totalPages: 2 } }, isFetching: true } })
    renderPage()
    await user.click(screen.getByRole('button', { name: 'History' }))
    const pagination = within(screen.getByRole('dialog', { name: 'Reference history' })).getByRole('navigation', { name: 'Reference history pagination' })
    for (const label of ['First', 'Previous', 'Next', 'Last']) expect(within(pagination).getByRole('button', { name: label })).toBeDisabled()
  })
})
