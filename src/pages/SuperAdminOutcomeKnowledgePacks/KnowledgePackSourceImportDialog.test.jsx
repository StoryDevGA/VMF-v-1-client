import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { KnowledgePackSourceImportDialog } from './KnowledgePackSourceImportDialog.jsx'
import { EMPTY_KNOWLEDGE_PACK_SOURCE_IMPORT_FORM } from './superAdminOutcomeKnowledgePacks.constants.js'

const { preview } = vi.hoisted(() => ({ preview: vi.fn() }))
vi.mock('../../store/api/outcomeKnowledgePacksApi.js', () => ({ usePreviewKnowledgePackImportMetadataMutation: () => [preview, {}] }))
const metadata = { label: 'Canonical name', knowledgeAssetId: 'QA-001', capabilityKey: 'qa-pack', packType: 'STYLE',
  purposeCategory: 'STYLE', knowledgeLayer: 'STYLE', executionMode: 'PROVIDER_CONTEXT', visibility: 'PLATFORM',
  workspaceCompatibility: ['OUTCOME'], runtimeConsumers: ['Outcome Studio'], description: 'Source description.' }
const loaded = (filename) => ({ filename, contentFormat: 'MARKDOWN', extractedText: '# Source text' })
const response = (values = metadata) => ({ data: { metadata: values, sourceMetadata: values, fieldErrors: {} } })
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done }); return { promise, resolve } }

function Harness({ read = async (file) => loaded(file.name), submit = vi.fn(), open = true }) {
  const [form, setForm] = useState(EMPTY_KNOWLEDGE_PACK_SOURCE_IMPORT_FORM)
  const [errors, setErrors] = useState({})
  return <KnowledgePackSourceImportDialog open={open} form={form} fieldErrors={errors} onClose={() => {}}
    onSubmit={submit} readSourceFile={read} onFileReadError={(err) => setErrors({ filename: err.message })}
    onFileMetadata={({ _fieldErrors = {}, ...values }) => { setForm((current) => ({ ...current, ...values })); setErrors(_fieldErrors) }}
    onFormChange={(key, value) => { setForm((current) => ({ ...current, [key]: value, metadataOverrides: [key] })); setErrors({}) }} />
}
beforeEach(() => { vi.clearAllMocks(); preview.mockImplementation(() => ({ unwrap: async () => response() })) })
async function upload(user, name = 'canonical.md') {
  await user.upload(screen.getByLabelText('Source document file'), new File(['source'], name))
}
async function next(user) { await user.click(screen.getByRole('button', { name: 'Next' })) }

it('keeps forward and reverse keyboard focus inside the import dialog, skipping disabled and hidden controls', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  const close = screen.getByRole('button', { name: 'Close dialog' })
  const cancel = screen.getByRole('button', { name: 'Cancel' })
  expect(screen.getByRole('heading', { name: 'Source', level: 3 })).toHaveFocus()
  await user.tab()
  expect(screen.getByLabelText('Source document file')).toHaveFocus()
  await user.tab({ shift: true })
  expect(close).toHaveFocus()
  await user.tab({ shift: true })
  expect(cancel).toHaveFocus()
  await user.tab()
  expect(close).toHaveFocus()
  cancel.hidden = true
  close.focus()
  await user.tab({ shift: true })
  expect(screen.getByLabelText('Source document file')).toHaveFocus()
  cancel.hidden = false
  await upload(user)
  screen.getByRole('button', { name: 'Next' }).focus()
  await user.tab()
  expect(close).toHaveFocus()
})

it('hydrates all eleven fields across compact steps, shows provenance and validates before submit', async () => {
  const user = userEvent.setup(); const submit = vi.fn(); render(<Harness submit={submit} />)
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  await upload(user); await next(user)
  expect(screen.getByLabelText(/Name/)).toHaveValue(metadata.label)
  expect(screen.getByLabelText(/Knowledge Asset ID/)).toHaveValue(metadata.knowledgeAssetId)
  expect(screen.getByLabelText(/Capability Key/)).toHaveValue(metadata.capabilityKey)
  expect(screen.getByLabelText('Description')).toHaveValue(metadata.description)
  expect(screen.getAllByText('From selected file.')).toHaveLength(4)
  await user.clear(screen.getByLabelText(/Name/)); await user.type(screen.getByLabelText(/Name/), 'Override name')
  expect(screen.getByText(/Manual override/)).toBeInTheDocument()
  await next(user)
  expect(screen.getByLabelText(/Draft Pack Type/)).toHaveValue('STYLE')
  expect(screen.getByLabelText(/Purpose Category/)).toHaveValue('STYLE')
  expect(screen.getByLabelText(/Knowledge Layer/)).toHaveValue('STYLE')
  expect(screen.getByRole('checkbox', { name: 'Outcome' })).toBeChecked()
  await next(user)
  expect(screen.getByLabelText('Execution Mode')).toHaveValue('PROVIDER_CONTEXT')
  expect(screen.getByLabelText('Visibility')).toHaveValue('PLATFORM')
  expect(screen.getByLabelText('Runtime Consumers')).toHaveValue('Outcome Studio')
  await next(user)
  expect(submit).not.toHaveBeenCalled()
  expect(preview).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole('button', { name: 'Create Draft' }))
  expect(preview).toHaveBeenLastCalledWith(expect.objectContaining({ metadata: { ...metadata, label: 'Override name' }, metadataOverrides: ['label'] }))
  expect(submit).toHaveBeenCalledTimes(1)
})

it('ignores an older file read after a newer file is selected', async () => {
  const user = userEvent.setup(); const old = deferred()
  render(<Harness read={(file) => file.name === 'old.md' ? old.promise : Promise.resolve(loaded(file.name))} />)
  await upload(user, 'old.md'); await upload(user, 'new.md')
  await act(async () => old.resolve(loaded('old.md')))
  expect(screen.getAllByText('new.md').length).toBeGreaterThan(0)
  expect(screen.queryByText('old.md')).not.toBeInTheDocument()
  expect(preview).toHaveBeenCalledTimes(1)
})

it('ignores older API preview responses and clears prior content on a failed replacement', async () => {
  const user = userEvent.setup(); const old = deferred()
  preview.mockReturnValueOnce({ unwrap: () => old.promise })
  render(<Harness read={(file) => file.name === 'bad.md' ? Promise.reject(new Error('Read failed')) : Promise.resolve(loaded(file.name))} />)
  await upload(user, 'old.md'); await upload(user, 'new.md')
  await act(async () => old.resolve(response({ ...metadata, label: 'Stale' })))
  await next(user); expect(screen.getByLabelText(/Name/)).toHaveValue('Canonical name')
  await user.click(screen.getByRole('button', { name: 'Back' })); await upload(user, 'bad.md')
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  expect(screen.queryByLabelText('Extracted text preview')).not.toBeInTheDocument()
})

it('invalidates pending previews when closed and reopened and restores body scrolling', async () => {
  const user = userEvent.setup(); const old = deferred(); preview.mockReturnValueOnce({ unwrap: () => old.promise })
  const view = render(<Harness />); await upload(user)
  view.rerender(<Harness open={false} />)
  expect(document.body.style.overflow).not.toBe('hidden')
  view.rerender(<Harness />); await act(async () => old.resolve(response()))
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
})

it('keeps malformed source and incomplete API responses blocking', async () => {
  const user = userEvent.setup(); preview.mockReturnValueOnce({ unwrap: async () => ({ data: { metadata: {}, sourceMetadata: {}, fieldErrors: { extractedText: 'Invalid YAML. Correct the file.' } } }) })
  render(<Harness />); await upload(user)
  expect(screen.getByRole('alert')).toHaveTextContent('Invalid YAML')
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  preview.mockReturnValueOnce({ unwrap: async () => ({ data: {} }) })
  await upload(user, 'second.md')
  expect(screen.getByRole('alert')).toHaveTextContent('incomplete response')
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
})

it('supports non-Markdown source imports without metadata preview and preserves binary data', async () => {
  const user = userEvent.setup(); const submit = vi.fn()
  render(<Harness submit={submit} read={async () => ({ filename: 'source.docx', contentFormat: 'DOCX', contentBase64: 'UEsDBA==', extractedText: '' })} />)
  await upload(user, 'source.docx'); for (let i = 0; i < 4; i += 1) await next(user)
  await user.click(screen.getByRole('button', { name: 'Create Draft' }))
  expect(preview).not.toHaveBeenCalled(); expect(submit).toHaveBeenCalledTimes(1)
})

it('focuses each step heading, exposes labeled errors, and blocks Enter without a file', async () => {
  const user = userEvent.setup(); render(<Harness />)
  expect(screen.getByRole('heading', { name: 'Source', exact: true })).toHaveFocus()
  fireEvent.submit(screen.getByRole('button', { name: 'Next' }).closest('form'))
  expect(screen.getByRole('heading', { name: 'Source', exact: true })).toBeInTheDocument()
  await upload(user); await next(user)
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Identity' })).toHaveFocus())
  await user.tab(); expect(screen.getByLabelText(/Name/)).toHaveFocus()
})

it('shows safe defaults for undeclared modes and omits absent optional purpose during validation', async () => {
  const user = userEvent.setup(); const submit = vi.fn()
  const partial = { ...metadata }
  delete partial.purposeCategory
  delete partial.executionMode
  delete partial.visibility
  preview.mockReturnValueOnce({ unwrap: async () => response(partial) })
  render(<Harness submit={submit} />); await upload(user)
  for (let i = 0; i < 3; i += 1) await next(user)
  expect(screen.getByLabelText('Execution Mode')).toHaveValue('PROVIDER_CONTEXT')
  expect(screen.getByLabelText('Visibility')).toHaveValue('PLATFORM')
  await next(user); await user.click(screen.getByRole('button', { name: 'Create Draft' }))
  const sent = preview.mock.calls.at(-1)[0].metadata
  expect(sent).not.toHaveProperty('purposeCategory')
  expect(sent.executionMode).toBe('PROVIDER_CONTEXT')
  expect(submit).toHaveBeenCalledTimes(1)
})
