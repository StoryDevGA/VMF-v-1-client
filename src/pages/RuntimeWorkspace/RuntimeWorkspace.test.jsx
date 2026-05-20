import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import { useGetRuntimeRendererQuery } from '../../store/api/runtimeInstanceApi.js'
import RuntimeWorkspace from './RuntimeWorkspace'

vi.mock('../../store/api/runtimeInstanceApi.js', () => ({
  useGetRuntimeRendererQuery: vi.fn(),
}))

const rendererPayload = {
  runtimeInstance: {
    id: 'runtime-1',
    runtimeInstanceKey: 'value-narrative-001',
    runtimeType: 'VALUE_NARRATIVE',
    status: 'ACTIVE',
    executionStatus: 'IDLE',
    name: 'Acme Value Narrative',
    packageKey: 'vmf-standard-2-3-1',
    packageVersion: '2.3.1',
  },
  package: {
    packageName: 'VMF Standard',
    packageKey: 'vmf-standard-2-3-1',
    frameworkVersion: '2.3.1',
  },
  lifecycle: {
    stage: 'DRAFT',
  },
  sections: [
    {
      key: 'customer_problem',
      runtimePath: 'framework_state.sections.customer_problem',
      label: 'Customer Problem',
      control: 'TEXTAREA',
      required: true,
      helpText: 'Describe the core problem.',
      placeholder: 'Example: Proposal creation is slow.',
      value: 'Proposal creation is slow.',
      editable: true,
      validationKeys: ['required-sections-check'],
      validationMessages: [],
    },
  ],
  actions: [
    {
      actionKey: 'SUBMIT_FOR_REVIEW',
      buttonLabel: 'Submit for Review',
      enabled: true,
      requiresConfirmation: true,
      policyKey: 'submit-for-review-policy',
    },
  ],
  signals: [],
  activity: [],
  diagnostics: {
    renderTraceId: 'render-test',
    configWarnings: [
      {
        code: 'UI_CONTRACT_SECTION_MISSING',
        message: 'Fallback presentation was applied.',
      },
    ],
  },
}

function renderRuntimeWorkspace(initialEntry = '/app/runtime/value-narrative-001') {
  return render(
    <ToasterProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/app/runtime/:runtimeInstanceId" element={<RuntimeWorkspace />} />
        </Routes>
      </MemoryRouter>
    </ToasterProvider>,
  )
}

describe('RuntimeWorkspace', () => {
  beforeEach(() => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: { data: rendererPayload },
      isLoading: false,
      isFetching: false,
      error: null,
    })
  })

  it('renders server-projected runtime sections, actions, signals, activity, and diagnostics', () => {
    renderRuntimeWorkspace()

    expect(useGetRuntimeRendererQuery).toHaveBeenCalledWith(
      { runtimeInstanceId: 'value-narrative-001' },
      { skip: false },
    )
    const actionBar = screen.getByRole('group', { name: /runtime workspace actions/i })
    const backButton = within(actionBar).getByRole('button', { name: /^back$/i })
    expect(backButton).toHaveClass('btn--outline', 'btn--sm')
    expect(screen.getByRole('heading', { name: 'Acme Value Narrative' })).toBeInTheDocument()
    expect(screen.getByText('value-narrative-001')).toBeInTheDocument()
    expect(screen.getByText('VMF Standard / 2.3.1')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()

    const sections = screen.getByRole('main', { name: /runtime sections/i })
    expect(within(sections).getByRole('heading', { name: /customer problem/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/customer problem/i)).toHaveValue('Proposal creation is slow.')
    expect(screen.getByText('framework_state.sections.customer_problem')).toBeInTheDocument()
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByText('Read only preview')).toBeInTheDocument()

    const sidePanel = screen.getByRole('complementary', { name: /runtime renderer side panel/i })
    expect(within(sidePanel).getByText(/runtime action execution is not live in this preview/i)).toBeInTheDocument()
    expect(within(sidePanel).getByRole('button', { name: /submit for review/i })).toBeDisabled()
    expect(within(sidePanel).getByText(/no runtime signals/i)).toBeInTheDocument()
    expect(within(sidePanel).getByText(/no runtime activity/i)).toBeInTheDocument()
    expect(within(sidePanel).getByText('UI_CONTRACT_SECTION_MISSING')).toBeInTheDocument()
  })

  it('shows a loading state before the renderer projection arrives', () => {
    useGetRuntimeRendererQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      error: null,
    })

    renderRuntimeWorkspace()

    expect(screen.getByText(/loading runtime workspace/i)).toBeInTheDocument()
  })
})
