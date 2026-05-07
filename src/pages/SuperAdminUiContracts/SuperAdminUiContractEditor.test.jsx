import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import SuperAdminUiContractEditor from './SuperAdminUiContractEditor.jsx'

const navigateMock = vi.fn()
const {
  cloneUiContractMock,
  createUiContractMock,
  getUiContractQueryMock,
  listFrameworkPackagesQueryMock,
  listWorkflowPoliciesQueryMock,
  routeParamsMock,
  updateUiContractMock,
} = vi.hoisted(() => ({
  cloneUiContractMock: vi.fn(),
  createUiContractMock: vi.fn(),
  getUiContractQueryMock: vi.fn(),
  listFrameworkPackagesQueryMock: vi.fn(),
  listWorkflowPoliciesQueryMock: vi.fn(),
  routeParamsMock: { value: {} },
  updateUiContractMock: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => routeParamsMock.value,
  }
})

vi.mock('../../store/api/runtimeControlApi.js', () => ({
  useCloneUiContractMutation: () => [cloneUiContractMock, { isLoading: false }],
  useCreateUiContractMutation: () => [createUiContractMock, { isLoading: false }],
  useGetUiContractQuery: getUiContractQueryMock,
  useListFrameworkPackagesQuery: listFrameworkPackagesQueryMock,
  useListWorkflowPoliciesQuery: listWorkflowPoliciesQueryMock,
  useUpdateUiContractMutation: () => [updateUiContractMock, { isLoading: false }],
}))

function renderEditor() {
  return render(
    <MemoryRouter>
      <ToasterProvider>
        <SuperAdminUiContractEditor />
      </ToasterProvider>
    </MemoryRouter>,
  )
}

describe('SuperAdminUiContractEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeParamsMock.value = {}
    getUiContractQueryMock.mockReturnValue({ data: undefined, isLoading: false, error: null })
    listFrameworkPackagesQueryMock.mockReturnValue({
      data: {
        data: [
          {
            id: 'pkg-vmf-231',
            packageKey: 'vmf-2-3-1',
            packageName: 'VMF 2.3.1',
            frameworkKey: 'VMF',
            version: '2.3.1',
            status: 'ACTIVE',
            sections: [
              {
                sectionKey: 'customer_problem',
                runtimePath: 'framework_state.sections.customer_problem',
                required: true,
              },
            ],
            workflowBindings: [{ policyKey: 'submit-for-review' }],
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      error: null,
    })
    listWorkflowPoliciesQueryMock.mockReturnValue({
      data: {
        data: [
          {
            key: 'submit-for-review',
            status: 'ACTIVE',
            governedAction: 'SUBMIT_FOR_REVIEW',
          },
          {
            key: 'approve-gate',
            status: 'ACTIVE',
            governedAction: 'APPROVE',
          },
        ],
      },
      isLoading: false,
      error: null,
    })
  })

  it('syncs package sections into structured UI Contract section rows', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.selectOptions(screen.getByLabelText('Source Package'), 'vmf-2-3-1')
    await user.click(screen.getByRole('tab', { name: /sections/i }))
    await user.click(screen.getByRole('button', { name: /sync sections from package/i }))

    expect(screen.getByText('customer_problem')).toBeInTheDocument()
    expect(screen.getByText('framework_state.sections.customer_problem')).toBeInTheDocument()
    expect(screen.getByText('Customer Problem')).toBeInTheDocument()
    expect(screen.getByText('MAPPED')).toBeInTheDocument()
  })

  it('keeps draft source packages selectable while activating a UI Contract independently', async () => {
    const user = userEvent.setup()
    listFrameworkPackagesQueryMock.mockReturnValue({
      data: {
        data: [
          {
            id: 'pkg-vmf-231',
            packageKey: 'vmf-2-3-1',
            packageName: 'VMF 2.3.1',
            frameworkKey: 'VMF',
            version: '2.3.1',
            status: 'DRAFT',
            sections: [],
            workflowBindings: [],
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      error: null,
    })

    renderEditor()

    await user.selectOptions(screen.getByDisplayValue('DRAFT'), 'ACTIVE')
    const sourcePackage = screen.getByLabelText('Source Package')

    expect(screen.getByRole('option', { name: 'VMF 2.3.1 - VMF - v2.3.1' })).toBeInTheDocument()
    await user.selectOptions(sourcePackage, 'vmf-2-3-1')
    expect(sourcePackage).toHaveValue('vmf-2-3-1')
  })

  it('offers known governed actions even when they are not package workflow bindings', async () => {
    renderEditor()

    const governedAction = document.querySelector('#governed-action')
    expect(governedAction).not.toBeNull()
    const optionLabels = within(governedAction).getAllByRole('option', { hidden: true })
      .map((option) => option.textContent)

    expect(optionLabels).toEqual(expect.arrayContaining([
      'SAVE',
      'ARCHIVE',
      'SUBMIT_FOR_REVIEW',
    ]))
  })

  it('keeps JSON as read-only inspection output', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(screen.getByRole('tab', { name: /json \/ diff/i }))

    const preview = screen.getByLabelText(/ui contract json preview/i)
    expect(within(preview).queryByRole('textbox')).not.toBeInTheDocument()
    expect(preview).toHaveTextContent('"sections"')
  })

  it('derives and displays the selected source package when persisted key is missing', async () => {
    routeParamsMock.value = { uiContractId: 'ui-contract-vmf' }
    getUiContractQueryMock.mockReturnValue({
      data: {
        data: {
          id: 'ui-contract-vmf',
          uiContractKey: 'vmf-ui-contract-v1',
          name: 'VMF UI Contract',
          status: 'ACTIVE',
          frameworkKeys: ['VMF'],
          compatibilityTags: [],
          sourcePackageKey: '',
          sourcePackageVersion: '2.3.1',
          sourceFrameworkKey: 'VMF',
          sections: [
            {
              sectionKey: 'customer_problem',
              runtimePath: 'framework_state.sections.customer_problem',
              sourcePackageKey: 'vmf-2-3-1',
              label: 'Customer Problem',
              displayOrder: 10,
            },
          ],
          lifecycleStages: [],
          actions: [],
        },
      },
      isLoading: false,
      error: null,
    })
    listFrameworkPackagesQueryMock.mockReturnValue({
      data: {
        data: [
          {
            packageKey: '',
            packageName: 'VMF 2.3.1',
            frameworkKey: 'VMF',
            version: '2.3.1',
            status: 'DEPRECATED',
            sections: [],
            workflowBindings: [],
          },
          {
            packageKey: '',
            packageName: 'VMF Duplicate',
            frameworkKey: 'CMF',
            version: '2.3.1',
            status: 'DEPRECATED',
            sections: [],
            workflowBindings: [],
          },
        ],
      },
      isLoading: false,
      error: null,
    })

    renderEditor()

    const sourcePackage = await screen.findByLabelText('Source Package')
    await waitFor(() => expect(sourcePackage).toHaveValue('vmf-2-3-1'))
    expect(screen.getByRole('option', { name: 'VMF 2.3.1 - VMF - v2.3.1' }).selected).toBe(true)
    expect(screen.getAllByRole('option', { name: /VMF .* - VMF - v2\.3\.1/ })).toHaveLength(1)
  })

  it('locks direct editing and offers clone for locked UI Contracts', async () => {
    const user = userEvent.setup()
    routeParamsMock.value = { uiContractId: 'ui-contract-vmf' }
    getUiContractQueryMock.mockReturnValue({
      data: {
        data: {
          id: 'ui-contract-vmf',
          uiContractKey: 'vmf-ui-contract-v1',
          name: 'VMF UI Contract',
          status: 'ACTIVE',
          componentVersion: 1,
          versionStatus: 'ACTIVE',
          lineageId: 'ui-contract-vmf',
          isLocked: true,
          lockedByPackageKeys: ['vmf-qa-manual-951'],
          frameworkKeys: ['VMF'],
          compatibilityTags: [],
          sections: [],
          lifecycleStages: [],
          actions: [],
        },
      },
      isLoading: false,
      error: null,
    })

    renderEditor()

    expect(screen.getByText(/locked runtime control records cannot be edited directly/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /^clone$/i }))
    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/ui-contracts/new?cloneFrom=ui-contract-vmf')
  })

  it('omits immutable UI Contract keys from edit save payloads', async () => {
    const user = userEvent.setup()
    const unwrap = vi.fn().mockResolvedValue({})
    updateUiContractMock.mockReturnValue({ unwrap })
    routeParamsMock.value = { uiContractId: 'ui-contract-vmf' }
    getUiContractQueryMock.mockReturnValue({
      data: {
        data: {
          id: 'ui-contract-vmf',
          uiContractKey: 'vmf-ui-contract-v1',
          name: 'VMF UI Contract',
          status: 'DRAFT',
          componentVersion: 1,
          versionStatus: 'DRAFT',
          lineageId: 'ui-contract-vmf',
          isLocked: false,
          frameworkKeys: ['VMF'],
          compatibilityTags: [],
          sections: [],
          lifecycleStages: [],
          actions: [],
        },
      },
      isLoading: false,
      error: null,
    })

    renderEditor()

    await screen.findByDisplayValue('VMF UI Contract')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(updateUiContractMock).toHaveBeenCalledWith(expect.objectContaining({
      uiContractId: 'ui-contract-vmf',
      name: 'VMF UI Contract',
    }))
    expect(updateUiContractMock.mock.calls[0][0].uiContractKey).toBeUndefined()
  })
})
