import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminFrameworkPackageEditor from './SuperAdminFrameworkPackageEditor.jsx'

const navigateMock = vi.fn()
const addToastMock = vi.fn()
const createFrameworkPackageMock = vi.fn()
const updateFrameworkPackageMock = vi.fn()

let paramsMock = {}
let frameworkPackageQueryMock = { data: null, isLoading: false, error: null }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => paramsMock,
  }
})

vi.mock('../../components/Toaster', () => ({
  useToaster: () => ({ addToast: addToastMock }),
}))

vi.mock('../../components/CustomerSearchSelect', () => ({
  default: ({
    id,
    label,
    selectedIds = [],
    onChange,
    helperText,
    error,
    disabled,
  }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} role="combobox" disabled={disabled} aria-label={label} readOnly />
      {helperText ? <span>{helperText}</span> : null}
      {error ? <span role="alert">{error}</span> : null}
      {selectedIds.map((customerId) => (
        <span key={customerId}>{customerId === 'cust-acme' ? 'Acme Corp' : customerId}</span>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(['cust-acme'])}
      >
        Select Acme Corp
      </button>
    </div>
  ),
}))

vi.mock('../../store/api/runtimeControlApi.js', () => ({
  useCreateFrameworkPackageMutation: () => [createFrameworkPackageMock, { isLoading: false }],
  useGetFrameworkPackageQuery: () => frameworkPackageQueryMock,
  useListFrameworkPackagesQuery: () => ({ data: { data: [] } }),
  useListFrameworkRegistriesQuery: () => ({
    data: {
      data: [
        {
          frameworkKey: 'VMF',
          name: 'Value Management Framework',
          status: 'ACTIVE',
        },
      ],
    },
  }),
  useListValidationRegistryQuery: () => ({
    data: {
      data: [
        {
          key: 'required-sections-check',
          label: 'Required Sections',
          status: 'ACTIVE',
          packageUsable: true,
          supportedFrameworkKeys: ['VMF'],
        },
      ],
    },
  }),
  useListWorkflowPoliciesQuery: () => ({
    data: {
      data: [
        {
          key: 'vmf-submit-gate',
          name: 'VMF Submit Gate',
          status: 'ACTIVE',
          frameworkKeys: ['VMF'],
        },
      ],
    },
  }),
  useListUiContractsQuery: () => ({
    data: {
      data: [
        {
          id: 'ui-contract-vmf-ui-contract-v1',
          uiContractKey: 'vmf-ui-contract-v1',
          name: 'VMF UI Contract v1',
          status: 'ACTIVE',
          frameworkKeys: ['VMF'],
        },
      ],
    },
  }),
  useLazyListRuntimePathsQuery: () => [
    vi.fn(),
    {
      data: {
        data: [
          {
            pathKey: 'framework_state.sections.customer_problem',
            label: 'Customer Problem Section',
            status: 'ACTIVE',
            frameworkKeys: ['VMF'],
            scope: 'FRAMEWORK_STATE',
            category: 'SECTION',
            allowedOperations: ['READ', 'BIND'],
          },
        ],
      },
      isFetching: false,
    },
  ],
  useUpdateFrameworkPackageMutation: () => [updateFrameworkPackageMock, { isLoading: false }],
}))

const buildLoadedPackage = () => ({
  data: {
    data: {
      id: 'pkg-live-2',
      frameworkKey: 'VMF',
      frameworkName: 'Value Management Framework',
      version: '2.3.1',
      packageKey: 'vmf-core',
      packageName: 'VMF Core Package',
      packageScope: 'SYSTEM',
      packageType: 'STANDARD',
      description: 'Existing package.',
      status: 'DRAFT',
      visibility: 'INTERNAL_ONLY',
      customerAccessMode: 'ALL_CUSTOMERS',
      assignedCustomerIds: [],
      sections: [
        {
          sectionKey: 'customer_problem',
          runtimePath: 'framework_state.sections.customer_problem',
          required: true,
          validationKeys: ['required-sections-check'],
          notes: '',
        },
      ],
      executionModel: {
        mode: 'EVENT_DRIVEN',
        stateModel: 'LIFECYCLE_BASED',
        evaluationMode: 'POLICY_DRIVEN',
      },
      runtimeSettings: {
        enablePreviewMode: true,
        enableRuntimeValidation: true,
        requireValidationBeforePublish: true,
        allowManualValidationRun: true,
        allowPolicyRetry: true,
        retryPolicy: 'RETRY_ONCE',
        defaultTimeoutMs: 30000,
        maxPolicyExecutionsPerRun: 10,
      },
      validationConfig: [],
      workflowPolicyConfig: [],
      validationBindings: [
        {
          validationKey: 'required-sections-check',
          trigger: 'ON_SUBMIT',
          blocking: true,
          priority: 100,
          freshnessMinutes: null,
          enabled: true,
          notes: '',
        },
      ],
      workflowBindings: [
        {
          policyKey: 'vmf-submit-gate',
          executionContext: 'ON_SUBMIT',
          priority: 100,
          enabled: true,
          notes: '',
        },
      ],
      uiContractKey: 'vmf-ui-contract-v1',
      stateModelKey: null,
      stateModelVersion: null,
      stateModelMode: 'INTERNAL',
      availableOutputKeys: [],
      defaultOutputStyles: [],
      allowCustomerOutputDefinitions: false,
      artifactRetentionDays: 365,
      allowOutputRevisionHistory: true,
    },
  },
  isLoading: false,
  error: null,
})

describe('SuperAdminFrameworkPackageEditor', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    addToastMock.mockClear()
    createFrameworkPackageMock.mockReset()
    updateFrameworkPackageMock.mockReset()
    paramsMock = {}
    frameworkPackageQueryMock = { data: null, isLoading: false, error: null }
  })

  it('marks tab labels when validation errors live inside tab panels', async () => {
    const user = userEvent.setup()
    render(<SuperAdminFrameworkPackageEditor />)

    await user.click(screen.getByRole('tab', { name: /^access$/i }))
    await user.selectOptions(screen.getByRole('combobox', { name: /visibility/i }), 'CUSTOMER_VISIBLE')
    await user.selectOptions(screen.getByRole('combobox', { name: /customer access/i }), 'SELECTED_CUSTOMERS')
    await user.click(screen.getByRole('button', { name: /create framework package/i }))

    expect(screen.getByText(/assigned customers are required/i)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /access .*1 validation errors/i })).toBeInTheDocument()
  })

  it('saves package updates directly from the editor', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    updateFrameworkPackageMock.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { id: 'pkg-live-2' } }),
    })

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    expect(screen.queryByLabelText(/^state model$/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(updateFrameworkPackageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          packageId: 'pkg-live-2',
          executionModel: expect.objectContaining({
            mode: 'EVENT_DRIVEN',
            stateModel: 'LIFECYCLE_BASED',
            evaluationMode: 'POLICY_DRIVEN',
          }),
          sections: expect.arrayContaining([
            expect.objectContaining({
              sectionKey: 'customer_problem',
              runtimePath: 'framework_state.sections.customer_problem',
              validationKeys: ['required-sections-check'],
            }),
          ]),
          validationBindings: expect.arrayContaining([
            expect.objectContaining({
              validationKey: 'required-sections-check',
              trigger: 'ON_SUBMIT',
            }),
          ]),
          workflowBindings: expect.arrayContaining([
            expect.objectContaining({
              policyKey: 'vmf-submit-gate',
              executionContext: 'ON_SUBMIT',
            }),
          ]),
          uiContractKey: 'vmf-ui-contract-v1',
          stateModelKey: null,
          stateModelVersion: null,
          stateModelMode: 'INTERNAL',
        }),
      )
    })
    expect(navigateMock).toHaveBeenCalledWith(
      '/super-admin/runtime-control/framework-packages',
      { state: { runtimeControlSaved: true } },
    )
  })

  it('assigns selected customers through the customer picker', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.visibility = 'CUSTOMER_VISIBLE'
    frameworkPackageQueryMock.data.data.customerAccessMode = 'SELECTED_CUSTOMERS'
    updateFrameworkPackageMock.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { id: 'pkg-live-2' } }),
    })

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: /^access$/i }))

    const customerPicker = screen.getByRole('combobox', { name: /assigned customers/i })
    await waitFor(() => {
      expect(customerPicker).not.toBeDisabled()
    })
    await user.click(screen.getByRole('button', { name: /select acme corp/i }))
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(updateFrameworkPackageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          packageId: 'pkg-live-2',
          visibility: 'CUSTOMER_VISIBLE',
          customerAccessMode: 'SELECTED_CUSTOMERS',
          assignedCustomerIds: ['cust-acme'],
        }),
      )
    })
  })

  it('keeps selected runtime path and derived key when adding a package section', async () => {
    const user = userEvent.setup()
    render(<SuperAdminFrameworkPackageEditor />)

    await user.click(screen.getByRole('tab', { name: /^sections$/i }))
    await user.click(screen.getByRole('button', { name: /add section/i }))

    const runtimePathInput = screen.getByRole('combobox', { name: /runtime path/i })
    await user.click(runtimePathInput)
    await user.type(runtimePathInput, 'customer')
    await user.click(await screen.findByRole('option', {
      name: /framework_state\.sections\.customer_problem/i,
    }))

    await waitFor(() => {
      expect(screen.getByLabelText(/^section key$/i)).toHaveValue('customer_problem')
    })

    const saveSectionButton = screen.getByRole('button', { name: /save section/i })
    await waitFor(() => {
      expect(saveSectionButton).not.toBeDisabled()
    })
    await user.click(saveSectionButton)

    await waitFor(() => {
      expect(screen.getByText('customer_problem')).toBeInTheDocument()
      expect(screen.getByText('framework_state.sections.customer_problem')).toBeInTheDocument()
    })
    expect(screen.queryByText(/runtime path required/i)).not.toBeInTheDocument()
  })

  it('shows the API error when a save fails', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    updateFrameworkPackageMock.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 409,
          data: {
            error: {
              code: 'CONFLICT',
              message: 'Framework key and version must be unique.',
              requestId: 'pkg-conflict-1',
            },
          },
        }),
    })

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(addToastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to update framework package',
          description: 'Framework key and version must be unique. (Ref: pkg-conflict-1)',
          variant: 'error',
        }),
      )
    })
  })
})
