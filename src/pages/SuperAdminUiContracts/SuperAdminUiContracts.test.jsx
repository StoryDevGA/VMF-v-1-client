import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SuperAdminUiContracts from './SuperAdminUiContracts.jsx'
import {
  INITIAL_UI_CONTRACT_FORM,
  validateUIContractForm,
} from './superAdminUiContracts.constants.js'

const navigateMock = vi.fn()
const { listUiContractsQueryMock } = vi.hoisted(() => ({
  listUiContractsQueryMock: vi.fn(),
}))

const defaultListResult = {
  data: {
    data: [
      {
        id: 'ui-contract-vmf-ui-contract-v1',
        uiContractKey: 'vmf-ui-contract-v1',
        name: 'VMF UI Contract',
        status: 'ACTIVE',
        componentVersion: 1,
        versionStatus: 'ACTIVE',
        frameworkKeys: ['VMF'],
        sections: [{ sectionKey: 'customer_problem' }],
        actions: [{ actionKey: 'SUBMIT_FOR_REVIEW' }],
        updatedAt: '2026-04-29T08:00:00.000Z',
      },
      {
        id: 'ui-contract-vmf-ui-contract-draft',
        uiContractKey: 'vmf-ui-contract-draft',
        name: 'Draft UI Contract',
        status: 'DRAFT',
        componentVersion: 2,
        versionStatus: 'DRAFT',
        frameworkKeys: ['VMF'],
        sections: [],
        actions: [],
        updatedAt: '2026-04-29T09:00:00.000Z',
      },
    ],
    meta: { page: 1, totalPages: 1, total: 1 },
  },
  isLoading: false,
  isFetching: false,
  error: null,
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../store/api/runtimeControlApi.js', () => ({
  useListUiContractsQuery: listUiContractsQueryMock,
}))

describe('SuperAdminUiContracts page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listUiContractsQueryMock.mockReturnValue(defaultListResult)
  })

  it('renders the UI Contract catalogue and navigates to create/edit flows', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SuperAdminUiContracts />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /ui contracts/i })).toBeInTheDocument()
    expect(screen.getByText('VMF UI Contract')).toBeInTheDocument()
    expect(screen.getByText('vmf-ui-contract-v1')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Action Copy' })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader', { name: 'Actions' })).toHaveLength(1)
    expect(screen.getAllByLabelText('Status: DRAFT')[0]).toHaveClass('status--warning')

    await user.click(screen.getByRole('button', { name: /^create$/i }))
    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/ui-contracts/new')

    await user.selectOptions(
      screen.getByLabelText(/actions for vmf-ui-contract-v1/i),
      'Edit',
    )
    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/ui-contracts/ui-contract-vmf-ui-contract-v1')

    await user.selectOptions(
      screen.getByLabelText(/actions for vmf-ui-contract-v1/i),
      'Clone',
    )
    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/ui-contracts/new?cloneFrom=ui-contract-vmf-ui-contract-v1')
  })

  it('renders version, version status, and lock state in the Version column', () => {
    listUiContractsQueryMock.mockReturnValue({
      ...defaultListResult,
      data: {
        ...defaultListResult.data,
        data: [
          {
            ...defaultListResult.data.data[0],
            isLocked: true,
          },
        ],
      },
    })

    render(
      <MemoryRouter>
        <SuperAdminUiContracts />
      </MemoryRouter>,
    )

    const versionSummary = screen.getByText('v1').closest('.super-admin-ui-contracts__version-summary')

    expect(versionSummary).toBeInTheDocument()
    expect(versionSummary?.firstElementChild).toHaveTextContent('v1')
    expect(within(versionSummary).getByLabelText('Status: ACTIVE')).toHaveClass('status--success')
    expect(within(versionSummary).getByText('Locked')).toBeInTheDocument()
  })

  it('validates required UI Contract fields and structured rows', () => {
    const { errors } = validateUIContractForm({
      ...INITIAL_UI_CONTRACT_FORM,
      uiContractKey: '',
      name: '',
      frameworkKeys: '',
      sections: [
        {
          sectionKey: 'customer_problem',
          label: '',
          displayOrder: 10,
          isVisible: true,
        },
      ],
    })

    expect(errors.uiContractKey).toBe('UI Contract key is required.')
    expect(errors.name).toBe('Name is required.')
    expect(errors.frameworkKeys).toBe('Select at least one framework.')
    expect(errors.sections).toBe('Visible sections require a label.')
  })

  it('keeps runtime paths read-only compatible in UI Contract section presentation rows', () => {
    const { errors, payload } = validateUIContractForm({
      ...INITIAL_UI_CONTRACT_FORM,
      uiContractKey: 'vmf-ui-contract-v2',
      name: 'VMF UI Contract v2',
      sourcePackageKey: 'vmf-2-3-1',
      sourcePackageVersion: '2.3.1',
      sourceFrameworkKey: 'VMF',
      sections: [
        {
          sectionKey: 'customer_problem',
          runtimePath: 'framework_state.sections.customer_problem',
          sourcePackageKey: 'vmf-2-3-1',
          label: 'Customer Problem',
        },
      ],
    }, {
      sourcePackage: {
        packageKey: 'vmf-2-3-1',
        frameworkKey: 'VMF',
        version: '2.3.1',
        sections: [
          {
            sectionKey: 'customer_problem',
            runtimePath: 'framework_state.sections.customer_problem',
            required: true,
          },
        ],
      },
    })

    expect(errors.sections).toBeUndefined()
    expect(payload.sections[0].runtimePath).toBe('framework_state.sections.customer_problem')
    expect(payload.sections[0].source).toBe('PACKAGE')
    expect(payload.sections[0].isCustom).toBe(false)
  })

  it('blocks orphan package-backed UI Contract sections against the selected package', () => {
    const { errors } = validateUIContractForm({
      ...INITIAL_UI_CONTRACT_FORM,
      uiContractKey: 'vmf-ui-contract-v2',
      name: 'VMF UI Contract v2',
      sourcePackageKey: 'vmf-2-3-1',
      sourcePackageVersion: '2.3.1',
      sourceFrameworkKey: 'VMF',
      sections: [
        {
          sectionKey: 'overview',
          runtimePath: 'framework_state.sections.overview',
          sourcePackageKey: 'vmf-2-3-1',
          label: 'Overview',
        },
      ],
    }, {
      sourcePackage: {
        packageKey: 'vmf-2-3-1',
        sections: [
          {
            sectionKey: 'customer_problem',
            runtimePath: 'framework_state.sections.customer_problem',
            required: true,
          },
        ],
      },
    })

    expect(errors.sections).toBe(
      'UI Contract sections must exist in the source package unless marked custom: overview.',
    )
  })

  it('allows explicitly custom UI Contract sections without runtime paths', () => {
    const { errors, payload } = validateUIContractForm({
      ...INITIAL_UI_CONTRACT_FORM,
      uiContractKey: 'vmf-ui-contract-v2',
      name: 'VMF UI Contract v2',
      sections: [
        {
          sectionKey: 'overview',
          source: 'CUSTOM',
          isCustom: true,
          label: 'Overview',
        },
      ],
    })

    expect(errors.sections).toBeUndefined()
    expect(payload.sections[0].runtimePath).toBe('')
    expect(payload.sections[0].source).toBe('CUSTOM')
    expect(payload.sections[0].isCustom).toBe(true)
    expect(payload.deprecatedInVersion).toBeNull()
  })

  it('shows a quiet refresh state instead of skeleton rows after returning from save', () => {
    listUiContractsQueryMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: null,
    })

    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/super-admin/runtime-control/ui-contracts',
          state: { runtimeControlSaved: true },
        }]}
      >
        <SuperAdminUiContracts />
      </MemoryRouter>,
    )

    expect(screen.getByText(/refreshing ui contracts/i)).toBeInTheDocument()
    expect(screen.queryByText(/no ui contracts found/i)).not.toBeInTheDocument()
  })
})
