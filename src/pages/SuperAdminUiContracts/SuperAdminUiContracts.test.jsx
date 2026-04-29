import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SuperAdminUiContracts from './SuperAdminUiContracts.jsx'
import {
  INITIAL_UI_CONTRACT_FORM,
  validateUIContractForm,
} from './superAdminUiContracts.constants.js'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../store/api/runtimeControlApi.js', () => ({
  useListUiContractsQuery: vi.fn(() => ({
    data: {
      data: [
        {
          id: 'ui-contract-vmf-ui-contract-v1',
          uiContractKey: 'vmf-ui-contract-v1',
          name: 'VMF UI Contract',
          status: 'ACTIVE',
          frameworkKeys: ['VMF'],
          sections: [{ sectionKey: 'customer-problem' }],
          actions: [{ actionKey: 'SUBMIT_FOR_REVIEW' }],
          updatedAt: '2026-04-29T08:00:00.000Z',
        },
      ],
      meta: { page: 1, totalPages: 1, total: 1 },
    },
    isFetching: false,
    error: null,
  })),
}))

describe('SuperAdminUiContracts page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    await user.click(screen.getByRole('button', { name: /^create$/i }))
    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/ui-contracts/new')

    await user.selectOptions(
      screen.getByLabelText(/actions for vmf-ui-contract-v1/i),
      'Edit',
    )
    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/ui-contracts/ui-contract-vmf-ui-contract-v1')
  })

  it('validates required UI Contract fields and JSON arrays', () => {
    const { errors } = validateUIContractForm({
      ...INITIAL_UI_CONTRACT_FORM,
      uiContractKey: '',
      name: '',
      frameworkKeys: '',
      sectionsJson: '{',
    })

    expect(errors.uiContractKey).toBe('UI Contract key is required.')
    expect(errors.name).toBe('Name is required.')
    expect(errors.frameworkKeys).toBe('Select at least one framework.')
    expect(errors.sections).toBe('Value must be valid JSON.')
  })
})
