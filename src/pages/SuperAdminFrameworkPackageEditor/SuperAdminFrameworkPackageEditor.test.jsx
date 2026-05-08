import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminFrameworkPackageEditor from './SuperAdminFrameworkPackageEditor.jsx'

const navigateMock = vi.fn()
const addToastMock = vi.fn()
const createFrameworkPackageMock = vi.fn()
const updateFrameworkPackageMock = vi.fn()
const runFrameworkPackageCheckpointMock = vi.fn()
const validateFrameworkPackageMock = vi.fn()
const activateFrameworkPackageMock = vi.fn()
const packageIntegrityRefetchMock = vi.fn()
const packageRefetchMock = vi.fn()
const packageDependenciesRefetchMock = vi.fn()
const packageCheckpointRefetchMock = vi.fn()

let paramsMock = {}
let frameworkPackageQueryMock = { data: null, isLoading: false, error: null, refetch: packageRefetchMock }
let frameworkPackageDependenciesQueryMock = {
  data: {
    data: {
      summary: {
        agents: 1,
        skills: 1,
        runtimePaths: 1,
        validations: 1,
        workflowPolicies: 1,
        uiContract: 1,
      },
      agents: [],
      skills: [],
      runtimePaths: [],
      validations: [],
      workflowPolicies: [],
      uiContract: null,
    },
  },
  isLoading: false,
  error: null,
  refetch: packageDependenciesRefetchMock,
}
let frameworkPackageIntegrityQueryMock = {
  data: {
    data: {
      status: 'PASS',
      summary: { pass: 3, warn: 0, fail: 0 },
      checks: [],
    },
  },
  isFetching: false,
  error: null,
  refetch: packageIntegrityRefetchMock,
}
let frameworkPackageLatestCheckpointQueryMock = {
  data: {
    data: {
      status: 'PASS',
      mode: 'ACTIVATION',
      summary: { totalChecks: 3, passed: 3, warnings: 0, failed: 0, resolvedReferences: 6 },
      timestamp: '2026-05-01T12:00:00.000Z',
      issues: [],
      errors: [],
      warnings: [],
      passedChecks: [],
    },
  },
  refetch: packageCheckpointRefetchMock,
}
let frameworkPackageAuditQueryMock = {
  data: {
    data: [
      {
        id: 'audit-1',
        ts: '2026-05-01T12:00:00.000Z',
        actorUserId: 'qa-user',
        action: 'FRAMEWORK_PACKAGE_UPDATED',
        summary: 'Updated framework package.',
      },
    ],
  },
  isLoading: false,
  error: null,
}

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

const activeUiContractRow = {
  id: 'ui-contract-vmf-ui-contract-v1',
  uiContractKey: 'vmf-ui-contract-v1',
  name: 'VMF UI Contract v1',
  status: 'ACTIVE',
  frameworkKeys: ['VMF'],
  sourcePackageVersion: '2.3.1',
  compatibilityMode: 'INHERITED_MINOR',
  sections: [
    {
      sectionKey: 'customer_problem',
      runtimePath: 'framework_state.sections.customer_problem',
      source: 'PACKAGE',
      isCustom: false,
    },
  ],
}

const draftUiContractRow = {
  id: 'ui-contract-standard-ui-contract-2-3-1',
  uiContractKey: 'standard-ui-contract-2-3-1',
  name: 'Standard UI Contract 2.3.1',
  status: 'DRAFT',
  frameworkKeys: ['VMF'],
  sourcePackageVersion: '2.3.1',
  compatibilityMode: 'INHERITED_MINOR',
  sections: [
    {
      sectionKey: 'customer_problem',
      runtimePath: 'framework_state.sections.customer_problem',
      source: 'PACKAGE',
      isCustom: false,
    },
  ],
}

const cloneTestRow = (row) => JSON.parse(JSON.stringify(row))
let uiContractRowsMock = [cloneTestRow(activeUiContractRow)]
let listUiContractsQueryArgs = []

vi.mock('../../store/api/runtimeControlApi.js', () => ({
  useCreateFrameworkPackageMutation: () => [createFrameworkPackageMock, { isLoading: false }],
  useActivateFrameworkPackageMutation: () => [activateFrameworkPackageMock, { isLoading: false }],
  useGetFrameworkPackageAuditQuery: () => frameworkPackageAuditQueryMock,
  useGetFrameworkPackageDependenciesQuery: () => frameworkPackageDependenciesQueryMock,
  useGetFrameworkPackageIntegrityQuery: () => frameworkPackageIntegrityQueryMock,
  useGetFrameworkPackageLatestCheckpointQuery: () => frameworkPackageLatestCheckpointQueryMock,
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
  useListUiContractsQuery: ({ q = '', status = '', frameworkKey = '', pageSize } = {}) => {
    listUiContractsQueryArgs.push({ q, status, frameworkKey, pageSize })
    const normalizedSearch = String(q ?? '').trim().toLowerCase()
    const normalizedStatus = String(status ?? '').trim().toUpperCase()
    const normalizedFrameworkKey = String(frameworkKey ?? '').trim().toUpperCase()
    const rows = uiContractRowsMock.filter((row) => {
      const matchesSearch = !normalizedSearch
        || String(row.uiContractKey ?? '').toLowerCase().includes(normalizedSearch)
        || String(row.name ?? '').toLowerCase().includes(normalizedSearch)
      const matchesStatus = !normalizedStatus || row.status === normalizedStatus
      const matchesFramework = !normalizedFrameworkKey || (row.frameworkKeys ?? []).includes(normalizedFrameworkKey)
      return matchesSearch && matchesStatus && matchesFramework
    })
    return { data: { data: rows.map((row) => cloneTestRow(row)) } }
  },
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
  useRunFrameworkPackageCheckpointMutation: () => [runFrameworkPackageCheckpointMock, { isLoading: false }],
  useValidateFrameworkPackageMutation: () => [validateFrameworkPackageMock, { isLoading: false }],
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
      validationBindings: [
        {
          bindingKey: 'required-sections-on-submit',
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
      uiContractBinding: {
        key: 'vmf-ui-contract-v1',
        version: '2.3.1',
        status: 'ACTIVE',
        compatibilityMode: 'INHERITED_MINOR',
        resolvedAt: '2026-05-01T12:00:00.000Z',
      },
      stateModelKey: null,
      stateModelVersion: null,
      stateModelMode: 'INTERNAL',
      stateBindingMode: 'STRICT',
      statePersistence: 'SESSION',
      stateContractNotes: '',
      availableOutputKeys: [],
      defaultOutputStyles: [],
      allowCustomerOutputDefinitions: false,
      artifactRetentionDays: 365,
      allowOutputRevisionHistory: true,
    },
  },
  isLoading: false,
  error: null,
  refetch: packageRefetchMock,
})

describe('SuperAdminFrameworkPackageEditor', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    addToastMock.mockClear()
    createFrameworkPackageMock.mockReset()
    updateFrameworkPackageMock.mockReset()
    runFrameworkPackageCheckpointMock.mockReset()
    validateFrameworkPackageMock.mockReset()
    activateFrameworkPackageMock.mockReset()
    packageIntegrityRefetchMock.mockReset()
    packageRefetchMock.mockReset()
    packageDependenciesRefetchMock.mockReset()
    packageCheckpointRefetchMock.mockReset()
    paramsMock = {}
    frameworkPackageQueryMock = { data: null, isLoading: false, error: null, refetch: packageRefetchMock }
    frameworkPackageDependenciesQueryMock = {
      data: {
        data: {
          summary: {
            agents: 1,
            skills: 1,
            runtimePaths: 1,
            validations: 1,
            workflowPolicies: 1,
            uiContract: 1,
          },
          agents: [],
          skills: [],
          runtimePaths: [],
          validations: [],
          workflowPolicies: [],
          uiContract: null,
        },
      },
      isLoading: false,
      error: null,
      refetch: packageDependenciesRefetchMock,
    }
    frameworkPackageIntegrityQueryMock = {
      data: {
        data: {
          status: 'PASS',
          summary: { pass: 3, warn: 0, fail: 0 },
          checks: [],
        },
      },
      isFetching: false,
      error: null,
      refetch: packageIntegrityRefetchMock,
    }
    frameworkPackageLatestCheckpointQueryMock = {
      data: {
        data: {
          status: 'PASS',
          mode: 'ACTIVATION',
          summary: { totalChecks: 3, passed: 3, warnings: 0, failed: 0, resolvedReferences: 6 },
          timestamp: '2026-05-01T12:00:00.000Z',
          issues: [],
          errors: [],
          warnings: [],
          passedChecks: [],
        },
      },
      refetch: packageCheckpointRefetchMock,
    }
    frameworkPackageAuditQueryMock = {
      data: {
        data: [
          {
            id: 'audit-1',
            ts: '2026-05-01T12:00:00.000Z',
            actorUserId: 'qa-user',
            action: 'FRAMEWORK_PACKAGE_UPDATED',
            summary: 'Updated framework package.',
          },
        ],
      },
      isLoading: false,
      error: null,
    }
    uiContractRowsMock = [cloneTestRow(activeUiContractRow)]
    listUiContractsQueryArgs = []
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
          stateBindingMode: 'STRICT',
          statePersistence: 'SESSION',
        }),
      )
    })
    const savedPayload = updateFrameworkPackageMock.mock.calls[0][0]
    expect(savedPayload).not.toHaveProperty('validationConfig')
    expect(savedPayload).not.toHaveProperty('workflowPolicyConfig')
    expect(savedPayload).not.toHaveProperty('compatibleWorkflowKeys')
    expect(savedPayload).not.toHaveProperty('defaultAgentIds')
    expect(savedPayload).not.toHaveProperty('requiredSkillIds')
    expect(savedPayload).not.toHaveProperty('validationRules')
    expect(savedPayload).not.toHaveProperty('isDefault')
    expect(navigateMock).toHaveBeenCalledWith(
      '/super-admin/runtime-control/framework-packages',
      { state: { runtimeControlSaved: true } },
    )
  })

  it('runs package validation from the editor header and surfaces checkpoint failures', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageLatestCheckpointQueryMock = {
      data: {
        data: {
          status: 'NOT_RUN',
          summary: { totalChecks: 0, passed: 0, warnings: 0, failed: 0 },
          timestamp: null,
          issues: [],
          errors: [],
          warnings: [],
          passedChecks: [],
        },
      },
      refetch: packageCheckpointRefetchMock,
    }
    validateFrameworkPackageMock.mockReturnValue({
      unwrap: () => Promise.reject({
        status: 422,
        data: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Runtime Architecture Checkpoint failed.',
            checkpoint: {
              status: 'FAIL',
              summary: { totalChecks: 4, passed: 3, warnings: 0, failed: 1 },
              errors: [
                {
                  code: 'UI_CONTRACT_KEY',
                  path: 'uiContractKey',
                  message: 'UI Contract must be ACTIVE.',
                },
              ],
            },
          },
        },
      }),
    })

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /validate package/i }))

    await waitFor(() => {
      expect(validateFrameworkPackageMock).toHaveBeenCalledWith({ packageId: 'pkg-live-2' })
    })
    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Checkpoint failed',
      variant: 'error',
    }))
    expect(screen.getByText(/runtime-ready: fail/i)).toBeInTheDocument()
  })

  it('keeps activation disabled until a positive checkpoint has run', async () => {
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.status = 'VALIDATED'
    frameworkPackageLatestCheckpointQueryMock = {
      data: {
        data: {
          status: 'NOT_RUN',
          summary: { totalChecks: 0, passed: 0, warnings: 0, failed: 0 },
          timestamp: null,
          issues: [],
          errors: [],
          warnings: [],
          passedChecks: [],
        },
      },
      refetch: packageCheckpointRefetchMock,
    }

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    expect(screen.getAllByRole('button', { name: /activate package/i })[0]).toBeDisabled()
    expect(screen.getByText(/runtime-ready: not run/i)).toBeInTheDocument()
  })

  it('uses checkpoint severity in the integrity table after a failed checkpoint', async () => {
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageIntegrityQueryMock = {
      data: {
        data: {
          status: 'WARN',
          summary: { pass: 3, warn: 1, fail: 0 },
          checks: [
            {
              key: 'uiContract.required',
              group: 'UI Contract Integrity',
              severity: 'WARN',
              field: 'uiContractKey',
              message: 'UI Contract is required before validation when sections are configured.',
            },
          ],
        },
      },
      isFetching: false,
      error: null,
      refetch: packageIntegrityRefetchMock,
    }
    frameworkPackageLatestCheckpointQueryMock = {
      data: {
        data: {
          status: 'FAIL',
          summary: { totalChecks: 4, passed: 3, warnings: 0, failed: 1 },
          timestamp: '2026-05-07T13:52:07.000Z',
          errors: [
            {
              code: 'UI_CONTRACT_KEY',
              severity: 'BLOCKING',
              source: 'Runtime Architecture Checkpoint',
              path: 'uiContractKey',
              message: 'UI Contract is required before validation when sections are configured.',
            },
          ],
          warnings: [],
          passedChecks: [],
        },
      },
      refetch: packageCheckpointRefetchMock,
    }

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    const issueCell = screen.getByText('UI Contract is required before validation when sections are configured.')
    const row = issueCell.closest('tr')
    expect(row).not.toBeNull()
    expect(within(row).getByText('FAIL')).toBeInTheDocument()
    expect(screen.getByText('FAIL: 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Checkpoint FAIL')).toHaveClass(
      'super-admin-framework-package-editor__summary-card--checkpoint-error',
    )
  })

  it('re-runs the checkpoint from the integrity tab without promoting the package', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageLatestCheckpointQueryMock = {
      data: {
        data: {
          status: 'NOT_RUN',
          summary: { totalChecks: 0, passed: 0, warnings: 0, failed: 0 },
          timestamp: null,
          errors: [],
          warnings: [],
          passedChecks: [],
        },
      },
      refetch: packageCheckpointRefetchMock,
    }
    runFrameworkPackageCheckpointMock.mockReturnValue({
      unwrap: () => Promise.resolve({
        data: {
          status: 'FAIL',
          summary: { totalChecks: 4, passed: 3, warnings: 0, failed: 1 },
          timestamp: '2026-05-07T13:52:07.000Z',
          errors: [
            {
              code: 'UI_CONTRACT_KEY',
              severity: 'BLOCKING',
              path: 'uiContractKey',
              message: 'UI Contract is required before validation when sections are configured.',
            },
          ],
          warnings: [],
          passedChecks: [],
        },
      }),
    })

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: /^integrity$/i }))
    await user.click(screen.getByRole('button', { name: /re-run checkpoint/i }))

    await waitFor(() => {
      expect(runFrameworkPackageCheckpointMock).toHaveBeenCalledWith({
        packageId: 'pkg-live-2',
        mode: 'FULL',
        persist: true,
      })
    })
    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Checkpoint failed',
      variant: 'error',
    }))
    expect(validateFrameworkPackageMock).not.toHaveBeenCalled()
  })

  it('confirms package activation from a validated package', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.status = 'VALIDATED'
    activateFrameworkPackageMock.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { id: 'pkg-live-2', status: 'ACTIVE' } }),
    })

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    await user.click(screen.getAllByRole('button', { name: /activate package/i })[0])

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/once activated, direct editing is locked/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /^activate package$/i }))

    await waitFor(() => {
      expect(activateFrameworkPackageMock).toHaveBeenCalledWith({ packageId: 'pkg-live-2' })
    })
    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Framework package activated',
      variant: 'success',
    }))
  })

  it('enables activation after a checkpoint with warnings', async () => {
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.status = 'VALIDATED'
    frameworkPackageLatestCheckpointQueryMock = {
      data: {
        data: {
          status: 'PASS_WITH_WARNINGS',
          mode: 'FULL',
          summary: { totalChecks: 4, passed: 3, warnings: 1, failed: 0, resolvedReferences: 2 },
          timestamp: '2026-05-07T13:42:00.000Z',
          runBy: { id: 'sa-local', name: 'Super Admin' },
          issues: [],
          errors: [],
          warnings: [{ code: 'RAC-WARN-001', message: 'Non-blocking warning.' }],
          passedChecks: [],
        },
      },
      refetch: packageCheckpointRefetchMock,
    }

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    const activateButton = screen.getAllByRole('button', { name: /activate package/i })[0]
    expect(activateButton).toBeEnabled()
    const summary = screen.getByLabelText(/runtime release summary/i)
    expect(within(summary).getByText(/^PASS$/i)).toBeInTheDocument()
    expect(within(summary).getAllByText(/with warnings/i).length).toBeGreaterThan(0)
  })

  it('adds the same validation twice with distinct stable binding ids', async () => {
    const user = userEvent.setup()
    createFrameworkPackageMock.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { id: 'pkg-new' } }),
    })

    render(<SuperAdminFrameworkPackageEditor />)

    await user.type(screen.getByLabelText(/^version$/i), '0.5.34')
    await user.click(screen.getByRole('tab', { name: /^validation$/i }))
    const validationPicker = screen.getByLabelText(/add validation binding/i)

    await user.selectOptions(validationPicker, 'required-sections-check')
    await user.selectOptions(validationPicker, 'required-sections-check')

    expect(screen.getByText(/binding id: required-sections-check-on-submit$/i)).toBeInTheDocument()
    expect(screen.getByText(/binding id: required-sections-check-on-submit-2/i)).toBeInTheDocument()

    const triggerFields = screen.getAllByLabelText(/^trigger$/i)
    const priorityFields = screen.getAllByLabelText(/^priority$/i)

    await user.selectOptions(triggerFields[0], 'ON_SAVE')
    await user.clear(priorityFields[0])
    await user.type(priorityFields[0], '125')
    await user.clear(priorityFields[1])
    await user.type(priorityFields[1], '225')

    expect(screen.getByText(/binding id: required-sections-check-on-submit$/i)).toBeInTheDocument()
    expect(screen.getByText(/binding id: required-sections-check-on-submit-2/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /create framework package/i }))

    await waitFor(() => {
      expect(createFrameworkPackageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          validationBindings: expect.arrayContaining([
            expect.objectContaining({
              bindingKey: 'required-sections-check-on-submit',
              validationKey: 'required-sections-check',
              trigger: 'ON_SAVE',
              priority: 125,
            }),
            expect.objectContaining({
              bindingKey: 'required-sections-check-on-submit-2',
              validationKey: 'required-sections-check',
              trigger: 'ON_SUBMIT',
              priority: 225,
            }),
          ]),
        }),
      )
    })
  })

  it('warns when legacy package config is synthesized into canonical bindings', async () => {
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.validationBindings = []
    frameworkPackageQueryMock.data.data.workflowBindings = []
    frameworkPackageQueryMock.data.data.validationConfig = [
      {
        validationKey: 'required-sections-check',
        enabled: true,
      },
    ]
    frameworkPackageQueryMock.data.data.workflowPolicyConfig = [
      {
        policyKey: 'vmf-submit-gate',
        enabled: true,
        executionOrder: 100,
      },
    ]

    render(<SuperAdminFrameworkPackageEditor />)

    expect(await screen.findByText(/legacy contract/i)).toBeInTheDocument()
    expect(screen.getByText(/canonical bindings synthesized/i)).toBeInTheDocument()
  })

  it('resolves a selected draft UI Contract that is outside the active picker list', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.uiContractKey = 'standard-ui-contract-2-3-1'
    frameworkPackageQueryMock.data.data.uiContractBinding = {
      key: 'standard-ui-contract-2-3-1',
      version: '2.3.1',
      status: 'DRAFT',
      compatibilityMode: 'INHERITED_MINOR',
      resolvedAt: '2026-05-06T14:30:00.000Z',
    }
    uiContractRowsMock = [
      cloneTestRow(activeUiContractRow),
      cloneTestRow(draftUiContractRow),
    ]

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: /^ui contract$/i }))

    expect(screen.getByRole('combobox', { name: /selected contract/i }))
      .toHaveValue('standard-ui-contract-2-3-1')
    expect(listUiContractsQueryArgs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        q: 'standard-ui-contract-2-3-1',
        pageSize: 25,
      }),
    ]))
    expect(screen.getByText(/Contract: DRAFT/i)).toBeInTheDocument()
    expect(screen.getByText(/Compatibility: PASS/i)).toBeInTheDocument()
    expect(screen.getByText(/Missing mappings: 0/i)).toBeInTheDocument()
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
    expect(screen.getByText(/runtime paths that allow BIND are selectable/i)).toBeInTheDocument()

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

  it('shows identity tabs before runtime package configuration tabs', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    const tabLabels = screen.getAllByRole('tab').map((tab) => tab.textContent)
    expect(tabLabels.slice(0, 3)).toEqual(['Framework Identity', 'Package Identity', 'Access'])
    expect(screen.getByRole('combobox', { name: /framework key/i })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /package key/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^package identity$/i }))

    expect(screen.getByRole('textbox', { name: /package key/i })).toHaveValue('vmf-core')
    expect(screen.getByRole('textbox', { name: /description/i })).toHaveValue('Existing package.')

    expect(screen.getByRole('tab', { name: /^framework identity$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^package identity$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^access$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^sections$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^runtime$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^validation$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^workflows$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^outputs$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^ui contract$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^state contract$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^dependencies$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^integrity$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^audit$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^json \/ diff$/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /^agents$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /^skills$/i })).not.toBeInTheDocument()
  })

  it('surfaces checkpoint evidence in the runtime release summary', async () => {
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.status = 'ACTIVE'
    frameworkPackageQueryMock.data.data.isDefault = true
    frameworkPackageQueryMock.data.data.dependencyLock = {
      status: 'PASS',
      resolvedAt: '2026-05-07T13:42:00.000Z',
      references: [
        { collectionKey: 'RuntimePathRegistry', key: 'framework_state.sections.customer_problem' },
        { collectionKey: 'UIContract', key: 'vmf-ui-contract-v1' },
      ],
    }
    frameworkPackageLatestCheckpointQueryMock = {
      data: {
        data: {
          status: 'PASS',
          mode: 'ACTIVATION',
          summary: {
            totalChecks: 27,
            passed: 27,
            warnings: 0,
            failed: 0,
            resolvedReferences: 2,
          },
          timestamp: '2026-05-07T13:42:00.000Z',
          runBy: { id: 'sa-local', name: 'Super Admin' },
          issues: [],
          errors: [],
          warnings: [],
          passedChecks: [],
        },
      },
      refetch: packageCheckpointRefetchMock,
    }

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    const summary = screen.getByLabelText(/runtime release summary/i)
    expect(within(summary).getByText(/Lifecycle: Active/i)).toBeInTheDocument()
    expect(within(summary).getByText(/Checkpoint: PASS/i)).toBeInTheDocument()
    expect(within(summary).getByText(/Last Run: 2026-05-07/i)).toBeInTheDocument()
    expect(within(summary).getByText(/Mode: ACTIVATION/i)).toBeInTheDocument()
    expect(within(summary).getByText(/Checks: 27\/27/i)).toBeInTheDocument()
    expect(within(summary).getByText(/Snapshot: Locked - 2 refs/i)).toBeInTheDocument()
    expect(within(summary).getByText(/Run By: Super Admin/i)).toBeInTheDocument()
    expect(within(summary).getAllByText(/Default Package/i).length).toBeGreaterThan(0)
    expect(within(summary).getByText(/checkpoint evidence certifies architecture readiness/i)).toBeInTheDocument()
  })

  it('surfaces preview dependency snapshots before validation locks them', async () => {
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.status = 'DRAFT'
    frameworkPackageQueryMock.data.data.dependencyLock = null
    frameworkPackageLatestCheckpointQueryMock = {
      data: {
        data: {
          status: 'PASS',
          mode: 'FULL',
          summary: {
            totalChecks: 5,
            passed: 5,
            warnings: 0,
            failed: 0,
            resolvedReferences: 3,
          },
          timestamp: '2026-05-07T13:42:00.000Z',
          runBy: { id: 'sa-local', name: 'Super Admin' },
          dependencyLockPreview: {
            status: 'PASS',
            references: [
              { collectionKey: 'RuntimePathRegistry', key: 'framework_state.sections.customer_problem' },
              { collectionKey: 'UIContract', key: 'vmf-ui-contract-v1' },
              { collectionKey: 'WorkflowPolicy', key: 'vmf-submit-gate' },
            ],
          },
          issues: [],
          errors: [],
          warnings: [],
          passedChecks: [],
        },
      },
      refetch: packageCheckpointRefetchMock,
    }

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    const summary = screen.getByLabelText(/runtime release summary/i)
    expect(within(summary).getByText(/Snapshot: Preview - 3 refs/i)).toBeInTheDocument()
  })

  it('uses the shared paginated table pattern for resolved dependency rows', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageDependenciesQueryMock = {
      data: {
        data: {
          summary: {
            agents: 0,
            skills: 0,
            runtimePaths: 6,
            validations: 0,
            workflowPolicies: 0,
            uiContract: 0,
          },
          agents: [],
          skills: [],
          runtimePaths: Array.from({ length: 6 }, (_, index) => ({
            id: `runtime-path-${index + 1}`,
            key: `framework_state.sections.extra_${index + 1}`,
            name: `Extra Runtime Path ${index + 1}`,
            status: 'ACTIVE',
            issues: [],
          })),
          validations: [],
          workflowPolicies: [],
          uiContract: null,
        },
      },
      isLoading: false,
      error: null,
    }

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: /^dependencies$/i }))

    expect(screen.getByRole('table', { name: /framework package dependencies/i })).toBeInTheDocument()
    expect(screen.getByText('Extra Runtime Path 1')).toBeInTheDocument()
    expect(screen.queryByText('Extra Runtime Path 6')).not.toBeInTheDocument()

    const pagination = screen.getByRole('navigation', {
      name: /framework package dependencies pagination/i,
    })
    expect(screen.getByLabelText(/dependency summary/i)).toHaveClass(
      'super-admin-framework-package-editor__summary-chip-row',
    )
    expect(within(pagination).getByText('Page 1 of 2')).toBeInTheDocument()

    await user.click(within(pagination).getByRole('button', { name: /^next$/i }))

    expect(screen.getByText('Extra Runtime Path 6')).toBeInTheDocument()
    expect(within(pagination).getByText('Page 2 of 2')).toBeInTheDocument()
  })

  it('requires external state contracts to provide a key and version', async () => {
    const user = userEvent.setup()
    render(<SuperAdminFrameworkPackageEditor />)

    await user.click(screen.getByRole('tab', { name: /^state contract$/i }))
    await user.selectOptions(screen.getByRole('combobox', { name: /^state model mode$/i }), 'EXTERNAL')
    await user.click(screen.getByRole('button', { name: /create framework package/i }))

    expect(screen.getByText(/state model key is required when state model mode is external/i)).toBeInTheDocument()
    expect(screen.getByText(/state model version is required when state model mode is external/i)).toBeInTheDocument()
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
