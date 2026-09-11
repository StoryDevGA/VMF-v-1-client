import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import DisplayRevisionPanel from './DisplayRevisionPanel.jsx'

const check = vi.fn()
const apply = vi.fn()
let query
vi.mock('../../store/api/runtimeControlApi.js', () => ({
  useGetFrameworkPackageDisplayBindingQuery: () => query,
  useCheckFrameworkPackageDisplayRevisionMutation: () => [check, { isLoading: false }],
  useApplyFrameworkPackageDisplayRevisionMutation: () => [apply, { isLoading: false }],
}))
const contracts = ['revision-a', 'revision-b'].map((uiContractKey) => ({
  uiContractKey, name: uiContractKey, status: 'ACTIVE', versionStatus: 'ACTIVE',
}))
const response = (uiContractKey = 'revision-a', compatible = true) => ({
  uiContractKey, compatible, checkpointHash: 'a'.repeat(64), issues: [],
})
const view = () => render(<MemoryRouter><DisplayRevisionPanel packageId="package-a" contracts={contracts} /></MemoryRouter>)
const select = (user, key = 'revision-a') => user.selectOptions(screen.getByLabelText('Revised display contract'), key)

describe('DisplayRevisionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    query = { data: { data: { uiContractKey: 'base', updatedAt: null } } }
    check.mockImplementation(() => ({ unwrap: () => Promise.resolve(response()) }))
    apply.mockImplementation(() => ({ unwrap: () => Promise.resolve({ data: {} }) }))
  })
  it('requires an exact compatible checkpoint and explicit confirmation', async () => {
    const user = userEvent.setup()
    view()
    expect(screen.getByRole('button', { name: 'Apply display revision' })).toBeDisabled()
    await select(user)
    await user.click(screen.getByRole('button', { name: 'Check display compatibility' }))
    expect(check).toHaveBeenCalledWith({ packageId: 'package-a', uiContractKey: 'revision-a' })
    await user.click(screen.getByRole('button', { name: 'Apply display revision' }))
    expect(apply).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Use for new runtimes' }))
    expect(apply).toHaveBeenCalledWith({ packageId: 'package-a', uiContractKey: 'revision-a',
      expectedUiContractKey: 'base', checkpointHash: 'a'.repeat(64) })
    expect(await screen.findByText(/Display revision applied for new runtimes/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply display revision' })).toBeDisabled()
  })
  it('cancels without applying', async () => {
    const user = userEvent.setup()
    view()
    await select(user)
    await user.click(screen.getByRole('button', { name: 'Check display compatibility' }))
    await user.click(screen.getByRole('button', { name: 'Apply display revision' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(apply).not.toHaveBeenCalled()
  })
  it('blocks a failed checkpoint and shows its reason', async () => {
    check.mockReturnValue({ unwrap: () => Promise.resolve({
      ...response(), compatible: false, issues: [{ code: 'STRUCTURAL', message: 'Runtime paths changed.' }],
    }) })
    const user = userEvent.setup()
    view()
    await select(user)
    await user.click(screen.getByRole('button', { name: 'Check display compatibility' }))
    expect(await screen.findByText('Runtime paths changed.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply display revision' })).toBeDisabled()
  })
  it('discards late checkpoint responses after candidate changes', async () => {
    let complete
    check.mockReturnValue({ unwrap: () => new Promise((resolve) => { complete = resolve }) })
    const user = userEvent.setup()
    view()
    await select(user)
    await user.click(screen.getByRole('button', { name: 'Check display compatibility' }))
    await select(user, 'revision-b')
    complete(response())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply display revision' })).toBeDisabled())
    expect(screen.queryByText('Display compatibility passed')).not.toBeInTheDocument()
  })
  it('invalidates approval when the binding is refreshed', async () => {
    const user = userEvent.setup()
    const rendered = view()
    await select(user)
    await user.click(screen.getByRole('button', { name: 'Check display compatibility' }))
    query = { data: { data: { uiContractKey: 'elsewhere', updatedAt: 'now' } } }
    rendered.rerender(<MemoryRouter><DisplayRevisionPanel packageId="package-a" contracts={contracts} /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Apply display revision' })).toBeDisabled()
  })
  it('clears approval after an apply failure', async () => {
    apply.mockReturnValue({ unwrap: () => Promise.reject({ status: 409,
      data: { error: { code: 'CONFLICT', message: 'The checkpoint is stale. Check again.' } } }) })
    const user = userEvent.setup()
    view()
    await select(user)
    await user.click(screen.getByRole('button', { name: 'Check display compatibility' }))
    await user.click(screen.getByRole('button', { name: 'Apply display revision' }))
    await user.click(screen.getByRole('button', { name: 'Use for new runtimes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The checkpoint is stale.')
    expect(screen.getByRole('button', { name: 'Apply display revision' })).toBeDisabled()
  })
  it('blocks while loading or the current binding cannot be read', () => {
    query = { isLoading: true }
    const rendered = view()
    expect(screen.getByRole('status')).toHaveTextContent('Loading display binding')
    expect(screen.getByLabelText('Revised display contract')).toBeDisabled()
    query = { error: { status: 409, data: { error: { message: 'Live API required.' } } } }
    rendered.rerender(<MemoryRouter><DisplayRevisionPanel packageId="package-a" contracts={contracts} /></MemoryRouter>)
    expect(screen.getByRole('alert')).toHaveTextContent('Live API required.')
    expect(screen.getByRole('button', { name: 'Check display compatibility' })).toBeDisabled()
  })
})
