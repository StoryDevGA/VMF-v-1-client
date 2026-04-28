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

vi.mock('../../components/StepUpAuthForm', () => ({
  StepUpAuthForm: ({ onStepUpComplete, onCancel }) => (
    <div>
      <p>Mock Step-Up Form</p>
      <button type="button" onClick={() => onStepUpComplete?.('mock-step-up-token', 900)}>
        Mock Verify
      </button>
      {onCancel ? (
        <button type="button" onClick={onCancel}>
          Mock Cancel
        </button>
      ) : null}
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
  useListValidationRegistryQuery: () => ({ data: { data: [] } }),
  useListWorkflowPoliciesQuery: () => ({ data: { data: [] } }),
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
      sections: [],
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

  it('opens step-up verification before saving and sends the token with package updates', async () => {
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

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(screen.getByRole('heading', { name: /verify before saving changes/i })).toBeInTheDocument()
    expect(screen.getByText(/mock step-up form/i)).toBeInTheDocument()
    expect(updateFrameworkPackageMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /mock verify/i }))

    await waitFor(() => {
      expect(updateFrameworkPackageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          packageId: 'pkg-live-2',
          stepUpToken: 'mock-step-up-token',
        }),
      )
    })
    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/framework-packages')
  })

  it('reopens step-up guidance when the API rejects a save with a step-up error', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    updateFrameworkPackageMock.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 403,
          data: {
            error: {
              code: 'STEP_UP_INVALID',
              message: 'Step-up token expired or invalid.',
              requestId: 'step-up-expired-1',
            },
          },
        }),
    })

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /save changes/i }))
    await user.click(screen.getByRole('button', { name: /mock verify/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /verify before saving changes/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('alert')).toHaveTextContent(/step-up token expired or invalid/i)
    expect(screen.getByRole('alert')).toHaveTextContent(/\(Ref: step-up-expired-1\)/i)
  })
})
