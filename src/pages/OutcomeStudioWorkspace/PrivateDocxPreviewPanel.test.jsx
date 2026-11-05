import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { useGetPrivateDocxCandidatesQuery, useGetPrivateDocxPreviewBundleQuery } from '../../store/api/docxPreviewApi.js'
import { clearTokens, setAccessToken } from '../../utils/tokenStorage.js'
import PrivateDocxPreviewPanel from './PrivateDocxPreviewPanel.jsx'
import { privateDocxPreviewFixture, masterLinkedPrivateDocxPreviewFixture, controlledSnapshotPreviewFixture, correctedPrivateDocxPreviewFixture,
  approvedPrivateDocxPreviewFixture, previewScopeFixture as scope } from './privateDocxPreview.fixture.js'
vi.mock('../../store/api/docxPreviewApi.js', () => ({ useGetPrivateDocxCandidatesQuery: vi.fn(), useGetPrivateDocxPreviewBundleQuery: vi.fn() }))
describe('read-only saved private document', () => {
  let f, listState, bundleState, createUrl, revokeUrl
  beforeEach(async () => {
    vi.stubGlobal('crypto', webcrypto); f = await privateDocxPreviewFixture(); setAccessToken('generic-test-session')
    listState = { currentData: f.list, refetch: vi.fn() }; bundleState = { currentData: f.bundle }
    useGetPrivateDocxCandidatesQuery.mockImplementation(() => listState); useGetPrivateDocxPreviewBundleQuery.mockImplementation(() => bundleState)
    createUrl = vi.fn().mockImplementation(() => `blob:generic-${Math.random()}`); revokeUrl = vi.fn()
    URL.createObjectURL = createUrl; URL.revokeObjectURL = revokeUrl
  })
  afterEach(() => { act(() => clearTokens()); vi.unstubAllGlobals() })
  const view = () => fireEvent.click(screen.getByRole('button', { name: 'View saved preview' }))
  it('describes five preserved attempts for the new narrow private version without inheriting a verdict', async () => {
    f = await approvedPrivateDocxPreviewFixture()
    const binding = f.candidate.masterBinding
    binding.contractVersion = 'master-linked-private-docx-binding.v4'
    binding.expressionOrigin = 'NARROW_EXPRESSION_PRIVATE_CORRECTION_UNREVIEWED'
    binding.compatibilityReference.version = 'commercial-docx-approved-expression.v2'
    f.candidate.renderer.version = '0.1.5'
    f.candidate.renderer.layoutProfile = 'SOURCE_SCOPED_QUOTATIONS_V2'
    const canonical = value => value && Object.getPrototypeOf(value) === Object.prototype
      ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
    f.candidate.masterBindingFingerprint = await f.hashJson(canonical(binding))
    listState.currentData = f.list
    render(<PrivateDocxPreviewPanel {...scope} />)
    fireEvent.click(screen.getByText('Document lineage'))
    expect(screen.getByText(/wording decision permits this private correction only/)).toHaveTextContent('All five prior attempts remain unchanged; this version has not been reviewed.')
    expect(screen.queryByRole('button', { name: /approve|download|export|review document/i })).not.toBeInTheDocument()
  })
  it('shows wording correction, seven pages and held authority without inheriting any prior review', async () => {
    f = await approvedPrivateDocxPreviewFixture(); listState.currentData = f.list; bundleState.currentData = f.bundle
    render(<PrivateDocxPreviewPanel {...scope} />); view(); await screen.findByRole('img', { name: /document page 1 of 7/ })
    expect(screen.getByText(/Wording correction awaiting review/)).toHaveTextContent('All three earlier review attempts are preserved')
    for (let index = 1; index < 7; index++) fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByRole('img', { name: /document page 7 of 7/ })).toBeInTheDocument()
    fireEvent.click(screen.getByText('Document lineage'))
    expect(screen.getByText(/wording decision permits this private correction only/)).toBeInTheDocument()
    expect(screen.getByText(/wording decision permits this private correction only/)).toHaveTextContent('All three prior attempts remain unchanged')
    fireEvent.click(screen.getByRole('tab', { name: 'Text alternative' })); expect(screen.getByText('A qualified claim.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve|download|export|review document/i })).not.toBeInTheDocument()
  })
  it('shows the corrected seven-page candidate and preserved failed lineage with all actions held', async () => {
    f = await correctedPrivateDocxPreviewFixture(); listState.currentData = f.list; bundleState.currentData = f.bundle
    render(<PrivateDocxPreviewPanel {...scope} />); view()
    await screen.findByRole('img', { name: /document page 1 of 7/ })
    expect(screen.getByText(/Corrected private version/)).toHaveTextContent('failed review are preserved')
    for (let index = 1; index < 7; index++) fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByRole('img', { name: /document page 7 of 7/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    fireEvent.click(screen.getByText('Document lineage'))
    expect(screen.getByText('The original failed review is preserved. This corrected version has not been reviewed.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve|download|export|review document/i })).not.toBeInTheDocument()
  })
  it('labels the controlled snapshot and keeps approval and export unavailable', async () => {
    f = await controlledSnapshotPreviewFixture(); listState.currentData = f.list; bundleState.currentData = f.bundle
    render(<PrivateDocxPreviewPanel {...scope} />); view()
    await screen.findByRole('img', { name: /document page 1 of 6/ })
    expect(screen.getByText(/Controlled Development\/Test snapshot/)).toHaveTextContent('customer approval is unavailable')
    expect(screen.queryByRole('button', { name: /approve|download|export|review document/i })).not.toBeInTheDocument()
  })
  it('does not publish pages when saved preview provenance is missing', async () => {
    f = await controlledSnapshotPreviewFixture(); delete f.bundle.data.preview.storageProvenance
    listState.currentData = f.list; bundleState.currentData = f.bundle
    render(<PrivateDocxPreviewPanel {...scope} />); view()
    await screen.findByText(/could not be verified/)
    expect(screen.queryByRole('img')).not.toBeInTheDocument(); expect(createUrl).not.toHaveBeenCalled()
  })
  it('shows six master-linked pages on the existing surface with approval and delivery held', async () => {
    f = await masterLinkedPrivateDocxPreviewFixture()
    listState.currentData = f.list; bundleState.currentData = f.bundle
    const { unmount } = render(<PrivateDocxPreviewPanel {...scope} />); view()
    await screen.findByRole('img', { name: /document page 1 of 6/ })
    for (let index = 1; index < 6; index++) fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByRole('img', { name: /document page 6 of 6/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByText(/Document review and final approval are still required; delivery is held/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve|download|generate|publish|review document/i })).not.toBeInTheDocument()
    unmount(); expect(revokeUrl).toHaveBeenCalledTimes(6)
  })
  it('shows five exact pages with navigation, labelled text and no final controls', async () => {
    const { unmount } = render(<PrivateDocxPreviewPanel {...scope} />); view()
    await screen.findByRole('img', { name: /document page 1 of 5/ })
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    for (let index = 1; index < 5; index++) fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByRole('img', { name: /document page 5 of 5/ })).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    fireEvent.click(screen.getByRole('tab', { name: 'Text alternative' }))
    expect(screen.getByText('A qualified claim.')).toBeInTheDocument(); expect(document.querySelector('script')).toBeNull()
    expect(screen.queryByRole('button', { name: /approve|download|generate|publish|review document/i })).not.toBeInTheDocument()
    unmount(); expect(createUrl).toHaveBeenCalledTimes(5); expect(revokeUrl).toHaveBeenCalledTimes(5)
  })
  it.each(['loading', 'error', 'empty', 'invalid', 'invalid-row'])('shows %s discovery without stale content', kind => {
    if (kind === 'loading') listState.isFetching = true
    if (kind === 'error') listState.error = { status: 403 }
    if (kind === 'empty') f.list.data.candidates = []
    if (kind === 'invalid') f.list.data.scope.customerId = 'other'
    if (kind === 'invalid-row') f.list.data.candidates = [null]
    render(<PrivateDocxPreviewPanel {...scope} />)
    expect(screen.queryByRole('button', { name: 'View saved preview' })).not.toBeInTheDocument(); expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
  it('preserves live URLs across an identical-props parent render', async () => {
    const { rerender } = render(<PrivateDocxPreviewPanel {...scope} />); view(); const image = await screen.findByRole('img')
    const source = image.getAttribute('src')
    await act(async () => { rerender(<PrivateDocxPreviewPanel {...scope} />) })
    expect(screen.getByRole('img').getAttribute('src')).toBe(source)
    expect(createUrl).toHaveBeenCalledTimes(5); expect(revokeUrl).not.toHaveBeenCalled()
  })
  it('clears the image and text immediately when selecting another candidate', async () => {
    const second = { ...f.candidate, candidateId: 'docx_candidate_87654321-1234-4234-8234-123456789012' }
    f.list.data.candidates.push(second)
    render(<PrivateDocxPreviewPanel {...scope} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: f.candidate.candidateId } }); view(); await screen.findByRole('img')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: second.candidateId } })
    expect(screen.queryByRole('img')).not.toBeInTheDocument(); expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(revokeUrl).toHaveBeenCalledTimes(5)
  })
  it.each(['loading', 'error', 'missing', 'invalid'])('shows %s bundle safely', async kind => {
    if (kind === 'loading') bundleState.isFetching = true
    if (kind === 'error') bundleState.error = { status: 503 }
    if (kind === 'missing') bundleState.currentData = { data: { preview: null } }
    if (kind === 'invalid') bundleState.currentData = { data: {} }
    render(<PrivateDocxPreviewPanel {...scope} />); view()
    if (kind === 'invalid') await screen.findByText(/could not be verified/)
    expect(screen.queryByRole('img')).not.toBeInTheDocument(); expect(createUrl).not.toHaveBeenCalled()
  })
  it.each(['customerId', 'tenantId', 'runtimeInstanceId'].flatMap(key => [['v1', key], ['v2', key], ['approved', key]]))('immediately clears %s old %s content and revokes URLs', async (version, key) => {
    if (version !== 'v1') { f = version === 'approved' ? await approvedPrivateDocxPreviewFixture() : version === 'corrected' ? await correctedPrivateDocxPreviewFixture() : await masterLinkedPrivateDocxPreviewFixture(); listState.currentData = f.list; bundleState.currentData = f.bundle }
    const { rerender } = render(<PrivateDocxPreviewPanel {...scope} />); view(); await screen.findByRole('img')
    rerender(<PrivateDocxPreviewPanel {...scope} {...{ [key]: key === 'runtimeInstanceId' ? '6ad4b3cab439648c0f316453' : '507f1f77bcf86cd799439019' }} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument(); expect(revokeUrl).toHaveBeenCalledTimes(['corrected', 'approved'].includes(version) ? 7 : version === 'v2' ? 6 : 5)
  })
  it.each(['logout', 'account switch'].flatMap(kind => [['v1', kind], ['v2', kind], ['corrected', kind], ['approved', kind]]))('clears %s immediately after %s', async (version, kind) => {
    if (version !== 'v1') { f = version === 'approved' ? await approvedPrivateDocxPreviewFixture() : version === 'corrected' ? await correctedPrivateDocxPreviewFixture() : await masterLinkedPrivateDocxPreviewFixture(); listState.currentData = f.list; bundleState.currentData = f.bundle }
    render(<PrivateDocxPreviewPanel {...scope} />); view(); await screen.findByRole('img')
    act(() => { if (kind === 'logout') clearTokens(); else setAccessToken('other-generic-account') })
    expect(screen.queryByRole('img')).not.toBeInTheDocument(); expect(revokeUrl).toHaveBeenCalledTimes(['corrected', 'approved'].includes(version) ? 7 : version === 'v2' ? 6 : 5)
  })
  it.each(['v1', 'v2', 'corrected', 'approved'])('ignores %s hashing completed after an account switch', async version => {
    if (version !== 'v1') { f = version === 'approved' ? await approvedPrivateDocxPreviewFixture() : version === 'corrected' ? await correctedPrivateDocxPreviewFixture() : await masterLinkedPrivateDocxPreviewFixture(); listState.currentData = f.list; bundleState.currentData = f.bundle }
    let release
    const pending = new Promise(resolve => { release = resolve })
    vi.stubGlobal('crypto', { subtle: { digest: vi.fn(async (...args) => { await pending; return webcrypto.subtle.digest(...args) }) } })
    render(<PrivateDocxPreviewPanel {...scope} />); view()
    act(() => setAccessToken('different-generic-session'))
    await act(async () => { release(); await pending })
    await waitFor(() => expect(screen.queryByRole('img')).not.toBeInTheDocument()); expect(createUrl).not.toHaveBeenCalled()
  })
  it('revokes partially created URLs if publication fails', async () => {
    createUrl.mockReturnValueOnce('blob:first').mockImplementationOnce(() => { throw new Error('Generic allocation failure') })
    render(<PrivateDocxPreviewPanel {...scope} />); view(); await screen.findByText(/could not be verified/)
    expect(revokeUrl).toHaveBeenCalledWith('blob:first'); expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
