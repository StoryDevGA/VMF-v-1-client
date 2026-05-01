import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import SuperAdminUiContractEditor from './SuperAdminUiContractEditor.jsx'

const navigateMock = vi.fn()
const {
  createUiContractMock,
  getUiContractQueryMock,
  listFrameworkPackagesQueryMock,
  routeParamsMock,
  updateUiContractMock,
} = vi.hoisted(() => ({
  createUiContractMock: vi.fn(),
  getUiContractQueryMock: vi.fn(),
  listFrameworkPackagesQueryMock: vi.fn(),
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
  useCreateUiContractMutation: () => [createUiContractMock, { isLoading: false }],
  useGetUiContractQuery: getUiContractQueryMock,
  useListFrameworkPackagesQuery: listFrameworkPackagesQueryMock,
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
})
