import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IntelligenceHub from './IntelligenceHub.jsx'

const state = vi.hoisted(() => ({ current: true, wrongTenant: false, error: null, tenant: 'tenant-1', quality: vi.fn(), refresh: vi.fn() }))
vi.mock('../../hooks/useTenantContext.js', () => ({ useTenantContext: () => ({ customerId: 'customer-1', tenantId: state.tenant }) }))
vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetRuntimeRendererQuery: ({ runtimeInstanceId }) => ({ currentData: { data: {
    runtimeInstance: { id: runtimeInstanceId, customerId: 'customer-1', tenantId: state.wrongTenant ? 'other' : state.tenant, name: 'Selected workspace' },
    revision: { rootRuntimeInstanceKey: 'root', revisionNumber: 2, lineage: [{ relationship: 'CURRENT', runtimeInstanceId }] },
    lock: { locked: true },
  } }, refetch: state.refresh }),
  useGetRuntimeDiscoveryContradictionsQuery: (...args) => {
    state.quality(...args)
    const data = { data: { candidates: [{ contradictionId: 'first', domain: 'Market', basis: 'Recorded detection basis', evidenceObjectIds: ['e1'], evidence: [{ evidenceObjectId: 'e1', extractedFact: 'Current selected fact' }] }] } }
    return { data, currentData: state.current ? data : undefined, error: state.error, refetch: state.refresh }
  },
  useGetRuntimeStateEvidenceQuery: () => ({}),
  useGetRuntimeStateGraphManifestQuery: () => ({}),
  useGetRuntimeStateGraphProjectionQuery: () => ({}),
  useGetRuntimeIntelligenceGraphCoverageQuery: () => ({}),
}))

function Harness() {
  const navigate = useNavigate()
  const location = useLocation()
  return <><button onClick={() => navigate('/quality?runtimeInstanceId=root&revisionId=revision-3')}>Other revision</button><output aria-label="Route">{location.pathname}{location.search}</output><Routes><Route path="/quality" element={<IntelligenceHub quality />} /><Route path="/app/intelligence" element={<p>Hub destination</p>} /></Routes></>
}
const show = () => render(<MemoryRouter initialEntries={['/quality?runtimeInstanceId=root&revisionId=revision-2']}><Harness /></MemoryRouter>)

describe('Quality selected-context integration', () => {
  beforeEach(() => { state.current = true; state.wrongTenant = false; state.error = null; state.tenant = 'tenant-1'; state.quality.mockClear(); state.refresh.mockClear() })
  it('keys the bounded read by revision and selected customer/tenant', () => {
    show()
    expect(state.quality.mock.calls.at(-1)).toEqual([{ runtimeInstanceId: 'revision-2', customerId: 'customer-1', tenantId: 'tenant-1' }, { skip: false }])
    expect(screen.getByRole('tab', { name: 'Intelligence Quality' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('This revision is locked. Governed resolution is unavailable here.')).toBeInTheDocument()
  })
  it('blocks detail reads and rendering when renderer scope conflicts', () => {
    state.wrongTenant = true
    show()
    expect(state.quality.mock.calls.at(-1)[1].skip).toBe(true)
    expect(screen.getByText('The returned revision is outside the selected customer or tenant.')).toBeInTheDocument()
    expect(screen.queryByText('“Current selected fact”')).not.toBeInTheDocument()
  })
  it('ignores retained data when currentData is missing', () => {
    state.current = false
    show()
    expect(screen.queryByText('“Current selected fact”')).not.toBeInTheDocument()
    expect(screen.getByText('No contradiction read is available for this revision.')).toBeInTheDocument()
  })
  it('does not use retained detail on a permission failure', () => {
    state.error = { status: 403 }
    show()
    expect(screen.queryByText('“Current selected fact”')).not.toBeInTheDocument()
    expect(screen.getByText('Evidence detail requires update permission. No contradiction preview is available for this revision.')).toBeInTheDocument()
  })
  it('resets search, selection and open explanations on revision changes', async () => {
    const user = userEvent.setup()
    show()
    await user.type(screen.getByRole('textbox', { name: 'Search quality findings' }), 'Market')
    await user.click(screen.getByRole('button', { name: 'Recommendation availability' }))
    await user.click(screen.getByRole('button', { name: 'Other revision' }))
    expect(screen.getByRole('textbox', { name: 'Search quality findings' })).toHaveValue('')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(state.quality.mock.calls.at(-1)[0].runtimeInstanceId).toBe('revision-3')
  })
  it('preserves context when returning to Graph or Overview', async () => {
    show()
    await userEvent.setup().click(screen.getByRole('button', { name: '← Intelligence Graph' }))
    expect(screen.getByLabelText('Route')).toHaveTextContent('/app/intelligence?runtimeInstanceId=root&revisionId=revision-2&view=intelligence-graph')
  })
  it('refreshes renderer and candidates together', async () => {
    show()
    await userEvent.setup().click(screen.getByRole('button', { name: '↻ Refresh' }))
    expect(state.refresh).toHaveBeenCalledTimes(2)
  })
})
