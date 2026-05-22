import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_TABLE_PAGE_SIZE } from '../../components/Table'
import SuperAdminFrameworkPackageEditor from './SuperAdminFrameworkPackageEditor.jsx'
import {
  FRAMEWORK_PACKAGE_OUTPUT_KEY_OPTIONS,
  FRAMEWORK_PACKAGE_OUTPUT_STYLE_OPTIONS,
  FRAMEWORK_PACKAGE_VALIDATION_TRIGGER_OPTIONS,
  FRAMEWORK_PACKAGE_WORKFLOW_EXECUTION_CONTEXT_OPTIONS,
} from '../SuperAdminFrameworkPackages/superAdminFrameworkPackages.constants.js'

const navigateMock = vi.fn()
const addToastMock = vi.fn()
const createFrameworkPackageMock = vi.fn()
const cloneFrameworkPackageMock = vi.fn()
const updateFrameworkPackageMock = vi.fn()
const runFrameworkPackageCheckpointMock = vi.fn()
const validateFrameworkPackageMock = vi.fn()
const activateFrameworkPackageMock = vi.fn()
const validateRuntimeOperationMock = vi.fn()
const packageIntegrityRefetchMock = vi.fn()
const packageRefetchMock = vi.fn()
const packageDependenciesRefetchMock = vi.fn()
const packageCheckpointRefetchMock = vi.fn()
const runtimeValidationHistoryRefetchMock = vi.fn()
const runtimeActivationReadinessRefetchMock = vi.fn()
const runtimeActivationHistoryRefetchMock = vi.fn()

let paramsMock = {}
let searchParamsMock = new URLSearchParams()
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
let runtimeValidationHistoryQueryMock = {
  data: {
    data: [],
  },
  isLoading: false,
  error: null,
  refetch: runtimeValidationHistoryRefetchMock,
}
let runtimeActivationReadinessQueryMock = {
  data: {
    data: {
      ready: true,
      status: 'READY',
      dependencyLockState: 'LOCKED',
      dependencyReferenceCount: 1,
      runtimeVerdict: {
        status: 'PASS',
        result: 'ALLOW',
        mode: 'STRICT',
        auditPersisted: true,
      },
      requirements: [
        { key: 'packageStatus', status: 'PASS', reason: 'FRAMEWORK_PACKAGE_VALIDATED', message: 'Package is validated.' },
        { key: 'checkpoint', status: 'PASS', reason: 'RUNTIME_CHECKPOINT_READY', message: 'Checkpoint evidence allows activation.' },
        { key: 'runtimeVerdict', status: 'PASS', reason: 'RUNTIME_VERDICT_ALLOW', message: 'Runtime Validation verdict allows activation.' },
        { key: 'dependencyLock', status: 'PASS', reason: 'DEPENDENCY_LOCK_LOCKED', message: 'Dependency lock evidence is certified.' },
      ],
      blockingReasons: [],
    },
  },
  isLoading: false,
  isFetching: false,
  refetch: runtimeActivationReadinessRefetchMock,
}
let runtimeActivationHistoryQueryMock = {
  data: {
    data: [],
  },
  refetch: runtimeActivationHistoryRefetchMock,
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => paramsMock,
    useSearchParams: () => [searchParamsMock],
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
  useCloneFrameworkPackageMutation: () => [cloneFrameworkPackageMock, { isLoading: false }],
  useActivateFrameworkPackageMutation: () => [activateFrameworkPackageMock, { isLoading: false }],
  useGetFrameworkPackageAuditQuery: () => frameworkPackageAuditQueryMock,
  useGetFrameworkPackageDependenciesQuery: () => frameworkPackageDependenciesQueryMock,
  useGetFrameworkPackageIntegrityQuery: () => frameworkPackageIntegrityQueryMock,
  useGetFrameworkPackageLatestCheckpointQuery: () => frameworkPackageLatestCheckpointQueryMock,
  useGetFrameworkPackageQuery: () => frameworkPackageQueryMock,
  useGetRuntimeActivationReadinessQuery: () => runtimeActivationReadinessQueryMock,
  useGetRuntimeActivationHistoryQuery: () => runtimeActivationHistoryQueryMock,
  useGetRuntimeValidationHistoryQuery: () => runtimeValidationHistoryQueryMock,
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
  useValidateRuntimeOperationMutation: () => [validateRuntimeOperationMock, { isLoading: false }],
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
    cloneFrameworkPackageMock.mockReset()
    updateFrameworkPackageMock.mockReset()
    runFrameworkPackageCheckpointMock.mockReset()
    validateFrameworkPackageMock.mockReset()
    activateFrameworkPackageMock.mockReset()
    validateRuntimeOperationMock.mockReset()
    packageIntegrityRefetchMock.mockReset()
    packageRefetchMock.mockReset()
    packageDependenciesRefetchMock.mockReset()
    packageCheckpointRefetchMock.mockReset()
    runtimeValidationHistoryRefetchMock.mockReset()
    runtimeActivationReadinessRefetchMock.mockReset()
    runtimeActivationHistoryRefetchMock.mockReset()
    paramsMock = {}
    searchParamsMock = new URLSearchParams()
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
    runtimeValidationHistoryQueryMock = {
      data: {
        data: [],
      },
      isLoading: false,
      error: null,
      refetch: runtimeValidationHistoryRefetchMock,
    }
    runtimeActivationReadinessQueryMock = {
      data: {
        data: {
          ready: true,
          status: 'READY',
          dependencyLockState: 'LOCKED',
          dependencyReferenceCount: 1,
          runtimeVerdict: {
            status: 'PASS',
            result: 'ALLOW',
            mode: 'STRICT',
            auditPersisted: true,
          },
          requirements: [
            { key: 'packageStatus', status: 'PASS', reason: 'FRAMEWORK_PACKAGE_VALIDATED', message: 'Package is validated.' },
            { key: 'checkpoint', status: 'PASS', reason: 'RUNTIME_CHECKPOINT_READY', message: 'Checkpoint evidence allows activation.' },
            { key: 'runtimeVerdict', status: 'PASS', reason: 'RUNTIME_VERDICT_ALLOW', message: 'Runtime Validation verdict allows activation.' },
            { key: 'dependencyLock', status: 'PASS', reason: 'DEPENDENCY_LOCK_LOCKED', message: 'Dependency lock evidence is certified.' },
          ],
          blockingReasons: [],
        },
      },
      isLoading: false,
      isFetching: false,
      refetch: runtimeActivationReadinessRefetchMock,
    }
    runtimeActivationHistoryQueryMock = {
      data: {
        data: [],
      },
      refetch: runtimeActivationHistoryRefetchMock,
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

  it('clones a loaded package through the clone endpoint allowlist', async () => {
    const user = userEvent.setup()
    searchParamsMock = new URLSearchParams('cloneFrom=pkg-live-2')
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.status = 'VALIDATED'
    cloneFrameworkPackageMock.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { id: 'pkg-clone-241' } }),
    })

    render(<SuperAdminFrameworkPackageEditor />)

    expect(await screen.findByRole('heading', { name: /clone framework package/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^version$/i)).toHaveValue('')

    await user.type(screen.getByLabelText(/^version$/i), '2.4.1')
    await user.click(screen.getByRole('tab', { name: /^package identity$/i }))
    await user.type(screen.getByRole('textbox', { name: /package key/i }), 'vmf-clone-241')
    expect(screen.getByRole('textbox', { name: /^package name$/i })).toHaveValue('VMF Core Package Clone')

    await user.click(screen.getByRole('button', { name: /save clone/i }))

    await waitFor(() => {
      expect(cloneFrameworkPackageMock).toHaveBeenCalledWith({
        packageId: 'pkg-live-2',
        version: '2.4.1',
        packageKey: 'vmf-clone-241',
        packageName: 'VMF Core Package Clone',
        description: 'Existing package.',
      })
    })
    expect(createFrameworkPackageMock).not.toHaveBeenCalled()
    expect(updateFrameworkPackageMock).not.toHaveBeenCalled()
    expect(navigateMock).toHaveBeenCalledWith(
      '/super-admin/runtime-control/framework-packages',
      { state: { runtimeControlSaved: true } },
    )
  })

  it('does not show clone unavailable while the clone source is still loading', async () => {
    searchParamsMock = new URLSearchParams('cloneFrom=pkg-live-2')
    frameworkPackageQueryMock = {
      data: null,
      isLoading: true,
      error: null,
      refetch: packageRefetchMock,
    }

    render(<SuperAdminFrameworkPackageEditor />)

    expect(await screen.findByRole('heading', { name: /clone framework package/i })).toBeInTheDocument()
    expect(screen.getByText(/loading framework package/i)).toBeInTheDocument()
    expect(screen.queryByText(/clone not available/i)).not.toBeInTheDocument()
  })

  it('keeps operator clone override fields when the source package refetches', async () => {
    const user = userEvent.setup()
    searchParamsMock = new URLSearchParams('cloneFrom=pkg-live-2')
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.status = 'VALIDATED'

    const { rerender } = render(<SuperAdminFrameworkPackageEditor />)

    expect(await screen.findByRole('heading', { name: /clone framework package/i })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/^version$/i), '2.4.1')
    await user.click(screen.getByRole('tab', { name: /^package identity$/i }))
    await user.type(screen.getByRole('textbox', { name: /package key/i }), 'vmf-clone-241')

    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.status = 'VALIDATED'
    frameworkPackageQueryMock.data.data.packageName = 'VMF Core Package Refetched'
    rerender(<SuperAdminFrameworkPackageEditor />)

    await user.click(screen.getByRole('tab', { name: /^framework identity$/i }))
    expect(screen.getByLabelText(/^version$/i)).toHaveValue('2.4.1')
    await user.click(screen.getByRole('tab', { name: /^package identity$/i }))
    expect(screen.getByRole('textbox', { name: /package key/i })).toHaveValue('vmf-clone-241')
    expect(screen.getByRole('textbox', { name: /^package name$/i })).toHaveValue('VMF Core Package Clone')
  })

  it('blocks direct clone URLs for draft package sources', async () => {
    searchParamsMock = new URLSearchParams('cloneFrom=pkg-live-2')
    frameworkPackageQueryMock = buildLoadedPackage()

    render(<SuperAdminFrameworkPackageEditor />)

    expect(await screen.findByRole('heading', { name: /clone framework package/i })).toBeInTheDocument()
    expect(screen.getByText(/clone not available/i)).toBeInTheDocument()
    expect(screen.getByText(/only active or validated framework packages can be cloned/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save clone/i })).toBeDisabled()
  })

  it('keeps draft package editor in direct-edit mode without clone actions', async () => {
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()

    render(<SuperAdminFrameworkPackageEditor />)

    expect((await screen.findAllByText(/lifecycle: draft/i)).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /clone package/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /validate package/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /activate package/i })).toBeDisabled()
  })

  it('offers clone and evidence actions instead of direct editing for active packages', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.status = 'ACTIVE'

    render(<SuperAdminFrameworkPackageEditor />)

    expect(await screen.findByText(/active framework packages cannot be edited directly/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clone package/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dependency snapshot/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /checkpoint history/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /validate package/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clone package/i }))

    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/framework-packages/new?cloneFrom=pkg-live-2')
  })

  it('offers clone and activation actions for validated packages while blocking direct save', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.status = 'VALIDATED'

    render(<SuperAdminFrameworkPackageEditor />)

    expect(await screen.findByText(/validated packages are locked for direct edits/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clone package/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /validate package/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /activate package/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /clone package/i }))

    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/framework-packages/new?cloneFrom=pkg-live-2')
  })

  it('renders deprecated packages as view-only without clone or lifecycle actions', async () => {
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.status = 'DEPRECATED'

    render(<SuperAdminFrameworkPackageEditor />)

    expect(await screen.findByText(/deprecated framework packages are retained for audit/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /clone package/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /validate package/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /activate package/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
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
    expect(screen.getAllByText(/activation readiness: fail/i).length).toBeGreaterThan(0)
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
    expect(screen.getAllByText(/activation readiness: not run/i).length).toBeGreaterThan(0)
    const readinessNotice = screen.getByRole('status', { name: /runtime readiness notice/i })
    expect(readinessNotice).toHaveClass('card', 'card--outlined')
    expect(within(readinessNotice).getByRole('button', { name: /view checkpoint/i })).toBeInTheDocument()
  })

  it('shows imported dependency lock evidence without treating it as a checkpoint pass', async () => {
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.status = 'DRAFT'
    frameworkPackageQueryMock.data.data.lastCheckpointStatus = 'PASS'
    frameworkPackageQueryMock.data.data.lastCheckpointAt = '2026-05-07T13:42:00.000Z'
    frameworkPackageQueryMock.data.data.lastCheckpointResult = null
    frameworkPackageQueryMock.data.data.dependencyLock = {
      status: 'PASS',
      packageKey: 'vmf-core',
      packageVersion: '2.3.1',
      references: [
        { collectionKey: 'RuntimePathRegistry', key: 'framework_state.sections.customer_problem' },
        { collectionKey: 'UIContract', key: 'vmf-ui-contract-v1' },
      ],
    }
    frameworkPackageLatestCheckpointQueryMock = {
      data: {
        data: {
          status: 'NOT_RUN',
          mode: null,
          summary: { totalChecks: 0, passed: 0, warnings: 0, failed: 0, resolvedReferences: 2 },
          timestamp: null,
          runBy: null,
          dependencyLockPreview: frameworkPackageQueryMock.data.data.dependencyLock,
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
    expect(within(summary).getByText(/Checkpoint: Not Run/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Status: Checkpoint: ,Not Run/i)).toHaveClass('status--warning')
    expect(within(summary).getByText('Runs')).toBeInTheDocument()
    expect(within(summary).getByText(/Snapshot: Locked - 2 refs/i)).toBeInTheDocument()
    expect(within(summary).getByText(/Imported dependency snapshot evidence is available/i)).toBeInTheDocument()
    expect(within(summary).queryByText(/Checkpoint: PASS/i)).not.toBeInTheDocument()
  })

  it('uses checkpoint severity in the integrity table after a failed checkpoint', async () => {
    const user = userEvent.setup()
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

    await user.click(screen.getByRole('tab', { name: /^integrity$/i }))

    const issueCell = screen.getByText('UI Contract is required before validation when sections are configured.')
    const row = issueCell.closest('tr')
    expect(row).not.toBeNull()
    expect(within(row).getByText('FAIL')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Failures')).getByText('1')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Passed checks')).getByText('3')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Warnings')).getByText('0')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /re-run checkpoint/i })).toHaveClass('btn--primary')
    expect(screen.getByLabelText('Checkpoint FAIL')).toHaveClass(
      'super-admin-framework-package-editor__summary-card--checkpoint-error',
    )
  })

  it('summarizes dense integrity path evidence and opens the full detail on demand', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageLatestCheckpointQueryMock = {
      data: {
        data: {
          status: 'FAIL',
          summary: { totalChecks: 4, passed: 3, warnings: 0, failed: 1 },
          timestamp: '2026-05-07T13:52:07.000Z',
          errors: [
            {
              code: 'SECTIONS_INTEGRITY',
              severity: 'BLOCKING',
              source: 'Runtime Architecture Checkpoint',
              path: 'sections',
              message: 'Section runtime paths must be ACTIVE, FRAMEWORK_STATE/SECTION, allow BIND, and be compatible with "VMF": framework_state.core.targeting, framework_state.core.value_drivers, framework_state.discovery.outputs.',
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

    expect(screen.getByText('Section runtime paths must be ACTIVE, FRAMEWORK_STATE/SECTION, allow BIND, and be compatible with "VMF"')).toBeInTheDocument()
    expect(screen.getByText('3 runtime paths')).toBeInTheDocument()
    expect(screen.queryByText(/framework_state.discovery.outputs\./)).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^integrity$/i }))
    await user.click(screen.getByRole('button', { name: /view details/i }))

    const dialog = screen.getByRole('dialog', { name: /integrity message details/i })
    expect(within(dialog).getByText('Runtime Paths (3)')).toBeInTheDocument()
    expect(within(dialog).getByText('framework_state.core.targeting')).toBeInTheDocument()
    expect(within(dialog).getByText('framework_state.core.value_drivers')).toBeInTheDocument()
    expect(within(dialog).getByText('framework_state.discovery.outputs')).toBeInTheDocument()
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
    expect(within(dialog).getByText(/framework key:\s*VMF/i)).toBeInTheDocument()
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

  it('keeps package option constants aligned with backend enum and seeded package values', () => {
    expect(FRAMEWORK_PACKAGE_VALIDATION_TRIGGER_OPTIONS.map((option) => option.value)).toEqual([
      'ON_SAVE',
      'ON_SUBMIT',
      'ON_VALIDATE',
      'ON_STAGE_CHANGE',
      'ON_PUBLISH',
      'MANUAL',
    ])

    expect(FRAMEWORK_PACKAGE_WORKFLOW_EXECUTION_CONTEXT_OPTIONS.map((option) => option.value)).toEqual([
      'ON_CREATE',
      'ON_SAVE',
      'ON_RUN',
      'ON_SUBMIT',
      'ON_REVIEW_START',
      'ON_STAGE_ENTER',
      'ON_STAGE_EXIT',
      'ON_APPROVAL',
      'ON_APPROVE',
      'ON_SECTION_BUILD',
      'ON_SECTION_GENERATE',
      'ON_SECTION_REGENERATE',
      'ON_DISCOVERY_COMPLETE',
      'ON_POSITIONING_COMPLETE',
      'ON_PROOF_COMPLETE',
      'ON_ECONOMICS_COMPLETE',
      'ON_TRAP_ANALYSIS_COMPLETE',
      'ON_VALIDATE',
      'ON_DEAL_MODE_REQUEST',
      'ON_SPD_COMPILE',
      'ON_RENDER',
      'ON_QUERY',
      'ON_PUBLISH',
    ])

    expect(FRAMEWORK_PACKAGE_OUTPUT_KEY_OPTIONS.map((option) => option.value)).toEqual([
      'full-report',
      'executive-summary',
      'value-drivers',
      'discovery',
      'decision-context',
      'positioning',
      'proof-plan',
      'economics',
      'competitive-trap-map',
      'deal-readiness',
      'service-spine',
      'integrity-audit',
      'validation-audit',
      'state-audit',
    ])

    expect(FRAMEWORK_PACKAGE_OUTPUT_STYLE_OPTIONS.map((option) => option.value)).toEqual([
      'developed-executive-technical',
    ])
  })

  it('renders backend-supported validation and workflow dropdown values from seeded packages', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.validationBindings = [
      {
        bindingKey: 'required-sections-on-validate',
        validationKey: 'required-sections-check',
        trigger: 'ON_VALIDATE',
        blocking: true,
        priority: 100,
        freshnessMinutes: null,
        enabled: true,
        notes: '',
      },
    ]
    frameworkPackageQueryMock.data.data.workflowBindings = [
      {
        policyKey: 'vmf-submit-gate',
        executionContext: 'ON_QUERY',
        priority: 100,
        enabled: true,
        notes: '',
      },
    ]
    frameworkPackageQueryMock.data.data.availableOutputKeys = [
      'full-report',
      'executive-summary',
      'integrity-audit',
    ]
    frameworkPackageQueryMock.data.data.defaultOutputStyles = [
      'developed-executive-technical',
    ]

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: /^validation$/i }))
    expect(screen.getByLabelText(/^trigger$/i)).toHaveValue('ON_VALIDATE')
    expect(within(screen.getByLabelText(/^trigger$/i)).getByRole('option', { name: 'On validate' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^workflows$/i }))
    expect(screen.getByLabelText(/^execution context$/i)).toHaveValue('ON_QUERY')
    expect(within(screen.getByLabelText(/^execution context$/i)).getByRole('option', { name: 'On query' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^outputs$/i }))
    expect(screen.getByLabelText(/full report/i)).toBeChecked()
    expect(screen.getByLabelText(/executive summary/i)).toBeChecked()
    expect(screen.getByLabelText(/integrity audit/i)).toBeChecked()
    expect(screen.getByLabelText(/developed executive \+ technical/i)).toBeChecked()
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
    expect(screen.getByRole('tab', { name: /^runtime validation$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^audit$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^json \/ diff$/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /^agents$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /^skills$/i })).not.toBeInTheDocument()
  })

  it('runs a runtime validation mutation probe from the Runtime Validation tab', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    validateRuntimeOperationMock.mockReturnValue({
      unwrap: () => Promise.resolve({
        data: {
          validationId: 'rvl-test',
          status: 'PASS',
          result: 'ALLOW',
          mode: 'STRICT',
          operationType: 'STATE_WRITE',
          operation: 'WRITE',
          runtimePath: 'framework_state.sections.customer_problem',
          packageId: 'pkg-live-2',
          frameworkKey: 'VMF',
          issues: [{
            code: 'RVL-EXECUTION-009',
            severity: 'INFO',
            message: 'Runtime validation passed.',
            path: '',
            source: 'runtime-validation-engine',
          }],
          summary: { totalChecks: 1, passed: 1, warnings: 0, failed: 0 },
          timestamp: '2026-05-08T12:00:00.000Z',
        },
      }),
    })

    render(<SuperAdminFrameworkPackageEditor />)

    await user.click(screen.getByRole('tab', { name: /^runtime validation$/i }))
    await user.click(screen.getByRole('button', { name: /run mutation probe/i }))

    await waitFor(() => {
      expect(validateRuntimeOperationMock).toHaveBeenCalledWith(expect.objectContaining({
        operationType: 'STATE_WRITE',
        packageId: 'pkg-live-2',
        frameworkKey: 'VMF',
        runtimePath: 'framework_state.sections.customer_problem',
        skillRoleKey: 'VALIDATOR',
        mode: 'STRICT',
        isPackageLevelValidation: true,
      }))
    })
    expect(runtimeActivationReadinessRefetchMock).toHaveBeenCalled()
    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Runtime validation passed',
      variant: 'success',
    }))
    const validationSummary = screen.getByLabelText(/runtime validation summary/i)
    expect(within(validationSummary).getByText('Current Validation State')).toBeInTheDocument()
    expect(within(validationSummary).getByText('VALID')).toBeInTheDocument()
    const stateHelpButton = screen.getByRole('button', { name: /runtime validation state help/i })
    const modeHelpButton = screen.getByRole('button', { name: /runtime validation mode help/i })
    expect(stateHelpButton.querySelector('svg')).not.toBeNull()
    expect(modeHelpButton.querySelector('svg')).not.toBeNull()

    await user.hover(modeHelpButton)
    const modeTooltip = await screen.findByRole('tooltip')
    expect(modeTooltip).toHaveTextContent(/STRICT blocks blocking findings/i)
    expect(modeHelpButton).toHaveAttribute('aria-expanded', 'true')

    await user.unhover(modeHelpButton)
    await waitFor(() => {
      expect(modeHelpButton).toHaveAttribute('aria-expanded', 'false')
    })

    await user.click(stateHelpButton)
    const stateTooltip = await screen.findByRole('tooltip')
    expect(stateTooltip).toHaveTextContent(/in-session runtime validation passed/i)
    expect(modeHelpButton).toHaveAttribute('aria-expanded', 'false')
    expect(stateHelpButton).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(stateHelpButton).toHaveAttribute('aria-expanded', 'false')
    })
    expect(runtimeValidationHistoryRefetchMock).toHaveBeenCalled()
  })

  it('surfaces blocked runtime validation probes from the Runtime Validation tab', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    validateRuntimeOperationMock.mockReturnValue({
      unwrap: () => Promise.reject({
        status: 422,
        data: {
          error: {
            code: 'RUNTIME_VALIDATION_FAILED',
            message: 'Runtime validation blocked this operation.',
            validation: {
              validationId: 'rvl-blocked-test',
              status: 'FAIL',
              result: 'BLOCK',
              mode: 'STRICT',
              operationType: 'STATE_WRITE',
              operation: 'WRITE',
              runtimePath: 'framework_state.sections.customer_problem',
              packageId: 'pkg-live-2',
              frameworkKey: 'VMF',
              issues: [{
                code: 'RVL-SCOPE-001',
                severity: 'BLOCKING',
                message: 'Runtime path is outside the write boundary.',
                path: 'runtimePath',
                source: 'runtime-skill-role-boundary-validator',
              }],
              summary: { totalChecks: 1, passed: 0, warnings: 0, failed: 1 },
              timestamp: '2026-05-08T12:00:00.000Z',
            },
          },
        },
      }),
    })

    render(<SuperAdminFrameworkPackageEditor />)

    await user.click(screen.getByRole('tab', { name: /^runtime validation$/i }))
    await user.click(screen.getByRole('button', { name: /run mutation probe/i }))

    await waitFor(() => {
      expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Runtime validation blocked',
        variant: 'error',
      }))
    })
    expect(screen.getByText(/Last Result: FAIL/i)).toBeInTheDocument()
    const validationSummary = screen.getByLabelText(/runtime validation summary/i)
    expect(within(validationSummary).getAllByText('BLOCKED').length).toBeGreaterThan(0)
    expect(screen.getByText('RVL-SCOPE-001')).toBeInTheDocument()
    const issueTable = screen.getByRole('table', { name: /runtime validation issue details/i })
    expect(within(issueTable).getByText('BLOCKING')).toBeInTheDocument()
    expect(runtimeValidationHistoryRefetchMock).toHaveBeenCalled()
  })

  it('surfaces generic runtime validation probe failures', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    validateRuntimeOperationMock.mockReturnValue({
      unwrap: () => Promise.reject({
        status: 503,
        data: {
          error: {
            message: 'Runtime validation service unavailable.',
          },
        },
      }),
    })

    render(<SuperAdminFrameworkPackageEditor />)

    await user.click(screen.getByRole('tab', { name: /^runtime validation$/i }))
    await user.click(screen.getByRole('button', { name: /run mutation probe/i }))

    await waitFor(() => {
      expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Failed to run runtime validation',
        variant: 'error',
      }))
    })
    expect(screen.getByText(/Last Result: NOT RUN/i)).toBeInTheDocument()
    expect(runtimeValidationHistoryRefetchMock).not.toHaveBeenCalled()
  })

  it('uses audit status for runtime validation history while preserving operation tokens', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.dependencyLock = {
      status: 'PASS',
      resolvedAt: '2026-05-08T12:00:00.000Z',
      packageKey: 'vmf-core',
      packageVersion: '2.3.1',
      references: [
        { collectionKey: 'RuntimePathRegistry', id: 'runtime-path-customer-problem', key: 'framework_state.sections.customer_problem' },
      ],
    }
    frameworkPackageDependenciesQueryMock = {
      ...frameworkPackageDependenciesQueryMock,
      data: {
        data: {
          ...frameworkPackageDependenciesQueryMock.data.data,
          runtimePaths: [
            {
              id: 'mongo-runtime-path-customer-problem',
              stableId: 'runtime-path-customer-problem',
              pathKey: 'framework_state.sections.customer_problem',
              key: 'framework_state.sections.customer_problem',
              status: 'ACTIVE',
              issues: [],
            },
          ],
        },
      },
    }
    runtimeValidationHistoryQueryMock = {
      data: {
        data: [
          {
            id: 'rvl-audit-1',
            createdAt: '2026-05-08T12:00:00.000Z',
            status: 'FAIL',
            result: 'BLOCK',
            severity: 'WARNING',
            mode: 'STRICT',
            operationType: 'STATE_WRITE',
            runtimePath: 'framework_state.sections.customer_problem',
            message: 'Runtime validation blocked this operation.',
            actorId: 'sa-local',
            issues: [
              {
                code: 'RVL-DEPENDENCY-008',
                severity: 'ERROR',
                message: 'Dependency lock snapshot missing.',
                path: 'packageId',
                source: 'runtime-dependency-validator',
              },
            ],
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: runtimeValidationHistoryRefetchMock,
    }

    render(<SuperAdminFrameworkPackageEditor />)

    await user.click(screen.getByRole('tab', { name: /^runtime validation$/i }))

    const auditTable = screen.getByRole('table', { name: /runtime validation audit history/i })
    expect(within(auditTable).getByText('FAIL')).toBeInTheDocument()
    expect(within(auditTable).queryByText('BLOCK')).not.toBeInTheDocument()
    expect(within(auditTable).getByText('ERROR')).toBeInTheDocument()
    expect(within(auditTable).getByText('STATE_WRITE')).toBeInTheDocument()
    expect(within(auditTable).queryByText('STATE WRITE')).not.toBeInTheDocument()
    expect(screen.getByText('Runtime Validation Summary')).toBeInTheDocument()
    const validationSummary = screen.getByLabelText(/runtime validation summary/i)
    expect(within(validationSummary).getByText('Current Validation State')).toBeInTheDocument()
    expect(within(validationSummary).getAllByText('INVALIDATED').length).toBeGreaterThan(0)
    expect(screen.getByText(/1 blocking \/ 0 warnings \/ 0 informational/i)).toBeInTheDocument()
    expect(screen.getByText(/snapshot: not recorded/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /open details for RVL-DEPENDENCY-008/i }))
    expect(screen.getByRole('dialog', { name: /runtime validation code details/i })).toBeInTheDocument()
    expect(screen.getByText('Dependency lock snapshot missing')).toBeInTheDocument()
    expect(screen.getByText(/runtime execution cannot proceed because the framework package does not have a frozen dependency boundary/i)).toBeInTheDocument()
    expect(screen.getByText(/run dependency resolution and lock the package/i)).toBeInTheDocument()
    expect(screen.getByText(/STORYLINEOS-RUNTIME-CONTROL-VERSIONING-LOCKING-STANDARD-SPEC/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^close$/i }))

    await user.selectOptions(screen.getByLabelText('Severity'), 'ERROR')
    expect(screen.getByText(/Showing 1 of 1 runtime validation audit rows/i)).toBeInTheDocument()
    expect(within(auditTable).getByText('framework_state.sections.customer_problem')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Severity'), 'CRITICAL')
    expect(screen.getByText(/Showing 0 of 1 runtime validation audit rows/i)).toBeInTheDocument()
    expect(within(auditTable).queryByText('framework_state.sections.customer_problem')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Severity'), 'ERROR')
    expect(screen.getByText(/Showing 1 of 1 runtime validation audit rows/i)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Mode'), 'AUDIT_ONLY')
    expect(screen.getByText(/Showing 0 of 1 runtime validation audit rows/i)).toBeInTheDocument()
    expect(within(auditTable).queryByText('framework_state.sections.customer_problem')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Mode'), '')
    expect(screen.getByText(/Showing 1 of 1 runtime validation audit rows/i)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Result'), 'PASS')
    expect(screen.getByText(/Showing 0 of 1 runtime validation audit rows/i)).toBeInTheDocument()
    expect(within(auditTable).queryByText('framework_state.sections.customer_problem')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /clear filters/i }))

    const runtimePathFilter = document.getElementById('runtime-validation-filter-runtime-path')
    expect(runtimePathFilter).toBeInTheDocument()
    await user.type(runtimePathFilter, 'customer_problem')
    expect(screen.getByText(/Showing 1 of 1 runtime validation audit rows/i)).toBeInTheDocument()
    await user.clear(runtimePathFilter)
    await user.type(runtimePathFilter, 'missing_path')
    expect(screen.getByText(/Showing 0 of 1 runtime validation audit rows/i)).toBeInTheDocument()
    expect(within(auditTable).queryByText('framework_state.sections.customer_problem')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /clear filters/i }))

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-05-09' } })
    expect(screen.getByLabelText('To')).toHaveAttribute('min', '2026-05-09')
    expect(screen.getByText(/Showing 0 of 1 runtime validation audit rows/i)).toBeInTheDocument()
    expect(within(auditTable).queryByText('framework_state.sections.customer_problem')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-05-01' } })
    expect(screen.getByLabelText('From')).toHaveAttribute('max', '2026-05-01')
    expect(screen.getByRole('alert')).toHaveTextContent(/from to be on or before to/i)
    await user.click(screen.getByRole('button', { name: /clear filters/i }))

    await user.click(within(auditTable).getByRole('button', {
      name: /open runtime path registry entry for framework_state\.sections\.customer_problem/i,
    }))
    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/runtime-paths/runtime-path-customer-problem/edit')
  }, 10000)

  it('treats historical runtime validation PASS as stale until the checkpoint has run', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.dependencyLock = {
      status: 'PASS',
      resolvedAt: '2026-05-08T12:00:00.000Z',
      packageKey: 'vmf-core',
      packageVersion: '2.3.1',
      references: [
        { collectionKey: 'RuntimePathRegistry', id: 'runtime-path-customer-problem', key: 'framework_state.sections.customer_problem' },
      ],
    }
    frameworkPackageLatestCheckpointQueryMock = {
      data: {
        data: {
          status: 'NOT_RUN',
          mode: null,
          summary: { totalChecks: 0, passed: 0, warnings: 0, failed: 0, resolvedReferences: 1 },
          timestamp: null,
          runBy: null,
          dependencyLockPreview: frameworkPackageQueryMock.data.data.dependencyLock,
          issues: [],
          errors: [],
          warnings: [],
          passedChecks: [],
        },
      },
      refetch: packageCheckpointRefetchMock,
    }
    runtimeValidationHistoryQueryMock = {
      data: {
        data: [
          {
            id: 'rvl-history-pass',
            validationId: 'rvl-history-pass',
            status: 'PASS',
            result: 'ALLOW',
            severity: 'INFO',
            mode: 'STRICT',
            operationType: 'STATE_WRITE',
            runtimePath: 'framework_state.sections.customer_problem',
            message: 'Runtime validation allowed this operation.',
            issues: [],
            createdAt: '2026-05-08T12:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: runtimeValidationHistoryRefetchMock,
    }

    render(<SuperAdminFrameworkPackageEditor />)

    await user.click(screen.getByRole('tab', { name: /^runtime validation$/i }))

    expect(screen.getByText(/Last Result: PASS/i)).toBeInTheDocument()
    const validationSummary = screen.getByLabelText(/runtime validation summary/i)
    expect(within(validationSummary).getAllByText('STALE').length).toBeGreaterThan(0)
    expect(within(validationSummary).queryByText('VALID')).not.toBeInTheDocument()
    expect(within(validationSummary).getByText('Rerun Required')).toBeInTheDocument()
    expect(within(validationSummary).getByText('Last Result')).toBeInTheDocument()
    expect(within(validationSummary).getByText('Last Outcome')).toBeInTheDocument()
    expect(within(validationSummary).getByText('PASS')).toHaveAttribute('data-status', 'PASS')
    expect(within(validationSummary).getByText('PASS')).toHaveAttribute('data-stale', 'true')
    expect(within(validationSummary).getByText('ALLOW')).toHaveAttribute('data-decision', 'ALLOW')
    expect(within(validationSummary).getByText('ALLOW')).toHaveAttribute('data-stale', 'true')
    expect(screen.getByText(/Run the Runtime Architecture Checkpoint before treating it as current package readiness evidence/i)).toBeInTheDocument()
    const checkpointRelationship = screen.getByLabelText(/architecture checkpoint and runtime validation relationship/i)
    expect(within(checkpointRelationship).getByLabelText(/Status: Not Run/i)).toHaveClass('status--warning')
  })

  it('keeps runtime validation audit fallbacks forensic and avoids unresolved path navigation', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageDependenciesQueryMock = {
      ...frameworkPackageDependenciesQueryMock,
      data: {
        data: {
          ...frameworkPackageDependenciesQueryMock.data.data,
          runtimePaths: [
            {
              id: 'runtime-path-orphan-object-id',
              pathId: 'runtime-path-orphan-path-id',
              stableId: '',
              pathKey: 'framework_state.sections.orphan',
              key: 'framework_state.sections.orphan',
              status: 'ACTIVE',
              issues: [],
            },
          ],
        },
      },
    }
    runtimeValidationHistoryQueryMock = {
      data: {
        data: [
          {
            createdAt: '2026-05-08T12:00:00.000Z',
            status: 'WARN',
            result: 'ALLOW',
            severity: 'INFO',
            mode: '',
            operationType: 'STATE_WRITE',
            runtimePath: 'framework_state.sections.orphan',
            message: 'Runtime validation returned an unmapped code.',
            issues: [
              {
                code: 'RVL-NEW-999',
                severity: 'WARN',
                message: 'New validation code.',
                path: 'runtimePath',
                source: 'runtime-validation-engine',
              },
            ],
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: runtimeValidationHistoryRefetchMock,
    }

    render(<SuperAdminFrameworkPackageEditor />)

    await user.click(screen.getByRole('tab', { name: /^runtime validation$/i }))

    expect(screen.getByText('Unknown actor')).toBeInTheDocument()
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument()

    const auditTable = screen.getByRole('table', { name: /runtime validation audit history/i })
    expect(within(auditTable).queryByText('STRICT')).not.toBeInTheDocument()
    expect(within(auditTable).getAllByText('--').length).toBeGreaterThan(0)
    expect(within(auditTable).getAllByText('WARN').length).toBeGreaterThan(0)
    expect(within(auditTable).getByText('framework_state.sections.orphan')).toBeInTheDocument()
    expect(screen.getByTitle(/registered, but it does not expose a stable id/i)).toBeInTheDocument()
    expect(within(auditTable).queryByRole('button', {
      name: /open runtime path registry entry for framework_state\.sections\.orphan/i,
    })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /open details for RVL-NEW-999/i }))
    expect(screen.getByText(/not yet mapped to a detailed operator explanation/i)).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/super-admin/runtime-control/runtime-paths/framework_state.sections.orphan/edit'),
    )
  })

  it('distinguishes empty runtime validation history from filtered-out rows', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    runtimeValidationHistoryQueryMock = {
      data: { data: [] },
      isLoading: false,
      error: null,
      refetch: runtimeValidationHistoryRefetchMock,
    }

    render(<SuperAdminFrameworkPackageEditor />)

    await user.click(screen.getByRole('tab', { name: /^runtime validation$/i }))

    expect(screen.getByLabelText(/Status: Last Result: ,NOT RUN/i)).toHaveClass('status--warning')
    const validationSummary = screen.getByLabelText(/runtime validation summary/i)
    expect(within(validationSummary).getByLabelText(/Status: Not Run/i)).toHaveClass('status--warning')
    expect(screen.getByText(/No runtime validation audit rows yet. Run the mutation probe to create one./i)).toBeInTheDocument()
    expect(screen.queryByText(/No runtime validation audit rows match the current filters./i)).not.toBeInTheDocument()
  })

  it('shows the runtime validation audit loading state without rendering the history table', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    runtimeValidationHistoryQueryMock = {
      data: { data: [] },
      isLoading: true,
      error: null,
      refetch: runtimeValidationHistoryRefetchMock,
    }

    render(<SuperAdminFrameworkPackageEditor />)

    await user.click(screen.getByRole('tab', { name: /^runtime validation$/i }))

    expect(screen.getByText(/Loading runtime validation audit stream/i)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: /runtime validation audit history/i })).not.toBeInTheDocument()
  })

  it('surfaces copyable activation evidence identifiers in the runtime release summary', async () => {
    const user = userEvent.setup()
    const originalClipboard = navigator.clipboard
    const originalExecCommand = document.execCommand
    const writeText = vi.fn().mockResolvedValue()
    const execCommand = vi.fn(() => true)

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    })

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
    runtimeActivationHistoryQueryMock = {
      data: {
        data: [
          {
            id: 'runtime-activation-snapshot-1',
            activationId: 'activation-vmf-2-3-1-20260514085339-fcdd4b7e',
            deploymentId: 'deployment-vmf-global-production--20260514085339-fcdd4b7e',
            dependencySnapshotId: 'dep-lock-vmf-2-3-1',
            dependencySnapshotHash: 'sha256-dep-lock-vmf-2-3-1',
            activationStatus: 'ACTIVE',
            activatedAt: '2026-05-07T13:42:00.000Z',
          },
        ],
      },
      refetch: runtimeActivationHistoryRefetchMock,
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
    const evidenceIdentifiers = within(summary).getByLabelText(/runtime evidence identifiers/i)
    const evidenceToggle = within(evidenceIdentifiers).getByRole('button', {
      name: /runtime evidence identifiers/i,
    })
    const runtimeEvidenceRows = [
      ['Activation ID', 'activation-vmf-2-3-1-20260514085339-fcdd4b7e'],
      ['Deployment ID', 'deployment-vmf-global-production--20260514085339-fcdd4b7e'],
      ['Dependency Snapshot', 'dep-lock-vmf-2-3-1'],
      ['Dependency Hash', 'sha256-dep-lock-vmf-2-3-1'],
    ]

    expect(evidenceToggle).toHaveAttribute('aria-expanded', 'false')
    for (const [, value] of runtimeEvidenceRows) {
      expect(within(evidenceIdentifiers).queryByText(value)).not.toBeInTheDocument()
    }

    await user.click(evidenceToggle)
    expect(evidenceToggle).toHaveAttribute('aria-expanded', 'true')

    for (const [label, value] of runtimeEvidenceRows) {
      expect(within(evidenceIdentifiers).getByText(label)).toBeInTheDocument()
      expect(within(evidenceIdentifiers).getByText(value)).toBeInTheDocument()
      await user.click(within(evidenceIdentifiers).getByRole('button', {
        name: new RegExp(`^Copy ${label}$`, 'i'),
      }))

      expect(writeText).toHaveBeenLastCalledWith(value)
      expect(addToastMock).toHaveBeenLastCalledWith(expect.objectContaining({
        title: `${label} copied`,
        variant: 'success',
      }))
    }

    expect(execCommand).not.toHaveBeenCalled()

    const dependencyHash = 'sha256-dep-lock-vmf-2-3-1'
    const setData = vi.fn()

    execCommand.mockImplementation(() => {
      const copyEvent = new Event('copy', { bubbles: true, cancelable: true })

      Object.defineProperty(copyEvent, 'clipboardData', {
        configurable: true,
        value: { setData },
      })
      document.dispatchEvent(copyEvent)
      return true
    })
    writeText.mockRejectedValueOnce(new Error('Clipboard blocked'))

    await user.click(within(evidenceIdentifiers).getByRole('button', {
      name: /^Copy Dependency Hash$/i,
    }))

    expect(setData).toHaveBeenCalledWith('text/plain', dependencyHash)
    expect(addToastMock).toHaveBeenLastCalledWith(expect.objectContaining({
      title: 'Dependency Hash copied',
      variant: 'success',
    }))

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: originalExecCommand,
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    })
  })

  it('omits activation dependency evidence rows when older snapshots do not carry those identifiers', async () => {
    const user = userEvent.setup()

    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.status = 'ACTIVE'
    frameworkPackageQueryMock.data.data.isDefault = true
    frameworkPackageQueryMock.data.data.dependencyLock = {
      status: 'PASS',
      snapshotId: 'dep-lock-current-not-activation',
      snapshotHash: 'sha256-current-not-activation',
      resolvedAt: '2026-05-07T13:42:00.000Z',
      references: [
        { collectionKey: 'RuntimePathRegistry', key: 'framework_state.sections.customer_problem' },
      ],
    }
    runtimeActivationHistoryQueryMock = {
      data: {
        data: [
          {
            id: 'runtime-activation-snapshot-legacy',
            activationId: 'activation-vmf-2-3-1-legacy',
            deploymentId: 'deployment-vmf-global-production-legacy',
            activationStatus: 'ACTIVE',
            activatedAt: '2026-05-07T13:42:00.000Z',
          },
        ],
      },
      refetch: runtimeActivationHistoryRefetchMock,
    }

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    const summary = screen.getByLabelText(/runtime release summary/i)
    const evidenceIdentifiers = within(summary).getByLabelText(/runtime evidence identifiers/i)
    const evidenceToggle = within(evidenceIdentifiers).getByRole('button', {
      name: /runtime evidence identifiers/i,
    })

    expect(within(evidenceToggle).getByText('2 IDs')).toBeInTheDocument()
    await user.click(evidenceToggle)

    expect(within(evidenceIdentifiers).getByText('Activation ID')).toBeInTheDocument()
    expect(within(evidenceIdentifiers).getByText('Deployment ID')).toBeInTheDocument()
    expect(within(evidenceIdentifiers).queryByText('Dependency Snapshot')).not.toBeInTheDocument()
    expect(within(evidenceIdentifiers).queryByText('Dependency Hash')).not.toBeInTheDocument()
    expect(within(evidenceIdentifiers).queryByText('dep-lock-current-not-activation')).not.toBeInTheDocument()
    expect(within(evidenceIdentifiers).queryByText('sha256-current-not-activation')).not.toBeInTheDocument()
  })

  it('cleans up clipboard fallback listeners and textarea when execCommand throws', async () => {
    const user = userEvent.setup()
    const originalClipboard = navigator.clipboard
    const originalExecCommand = document.execCommand
    const writeText = vi.fn().mockRejectedValue(new Error('Clipboard blocked'))
    const execCommand = vi.fn(() => {
      throw new Error('execCommand blocked')
    })

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    })

    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageQueryMock.data.data.status = 'ACTIVE'
    frameworkPackageQueryMock.data.data.isDefault = true
    runtimeActivationHistoryQueryMock = {
      data: {
        data: [
          {
            id: 'runtime-activation-snapshot-1',
            activationId: 'activation-vmf-2-3-1-20260514085339-fcdd4b7e',
            deploymentId: 'deployment-vmf-global-production--20260514085339-fcdd4b7e',
            dependencySnapshotId: 'dep-lock-vmf-2-3-1',
            dependencySnapshotHash: 'sha256-dep-lock-vmf-2-3-1',
            activationStatus: 'ACTIVE',
          },
        ],
      },
      refetch: runtimeActivationHistoryRefetchMock,
    }

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    const summary = screen.getByLabelText(/runtime release summary/i)
    const evidenceIdentifiers = within(summary).getByLabelText(/runtime evidence identifiers/i)
    await user.click(within(evidenceIdentifiers).getByRole('button', {
      name: /runtime evidence identifiers/i,
    }))

    const textareaCountBefore = document.body.querySelectorAll('textarea').length
    await user.click(within(evidenceIdentifiers).getByRole('button', {
      name: /^Copy Activation ID$/i,
    }))

    await waitFor(() => {
      expect(addToastMock).toHaveBeenLastCalledWith(expect.objectContaining({
        title: 'Unable to copy identifier',
        variant: 'error',
      }))
    })
    expect(document.body.querySelectorAll('textarea')).toHaveLength(textareaCountBefore)

    const setData = vi.fn()
    const copyEvent = new Event('copy', { bubbles: true, cancelable: true })
    Object.defineProperty(copyEvent, 'clipboardData', {
      configurable: true,
      value: { setData },
    })
    document.dispatchEvent(copyEvent)

    expect(setData).not.toHaveBeenCalled()
    expect(copyEvent.defaultPrevented).toBe(false)

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: originalExecCommand,
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    })
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
    const extraRuntimePathCount = DEFAULT_TABLE_PAGE_SIZE + 1
    frameworkPackageDependenciesQueryMock = {
      data: {
        data: {
          summary: {
            agents: 0,
            skills: 0,
            runtimePaths: extraRuntimePathCount,
            validations: 0,
            workflowPolicies: 0,
            uiContract: 0,
          },
          agents: [],
          skills: [],
          runtimePaths: Array.from({ length: extraRuntimePathCount }, (_, index) => ({
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
    expect(screen.queryByText(`Extra Runtime Path ${extraRuntimePathCount}`)).not.toBeInTheDocument()

    const pagination = screen.getByRole('navigation', {
      name: /framework package dependencies pagination/i,
    })
    expect(screen.getByRole('group', { name: /dependency filters/i })).toHaveClass(
      'super-admin-framework-package-editor__summary-chip-row',
    )
    expect(within(pagination).getByText('Page 1 of 2')).toBeInTheDocument()

    await user.click(within(pagination).getByRole('button', { name: /^next$/i }))

    expect(screen.getByText(`Extra Runtime Path ${extraRuntimePathCount}`)).toBeInTheDocument()
    expect(within(pagination).getByText('Page 2 of 2')).toBeInTheDocument()
  })

  it('filters resolved dependencies by summary chip and opens dependency records', async () => {
    const user = userEvent.setup()
    paramsMock = { packageId: 'pkg-live-2' }
    frameworkPackageQueryMock = buildLoadedPackage()
    frameworkPackageDependenciesQueryMock = {
      data: {
        data: {
          summary: {
            agents: 2,
            skills: 1,
            runtimePaths: 1,
            validations: 1,
            workflowPolicies: 1,
            uiContract: 1,
          },
          agents: [
            { id: 'agent-reviewer', key: 'agent-reviewer', name: 'Reviewer Agent', status: 'ACTIVE', issues: [] },
            {
              id: '',
              key: 'agent-missing',
              name: 'Missing Agent',
              status: 'MISSING',
              issues: ['Agent not found'],
            },
          ],
          skills: [
            { id: 'skill-observe', key: 'skill-observe', name: 'ODDF Observe', status: 'ACTIVE', issues: [] },
          ],
          runtimePaths: [
            {
              id: 'runtime-path-section',
              key: 'framework_state.sections.summary',
              name: 'Section Summary',
              status: 'ACTIVE',
              issues: [],
            },
          ],
          validations: [
            {
              id: 'validation-required-sections',
              key: 'required-sections-check',
              name: 'Required Sections',
              status: 'ACTIVE',
              issues: [],
            },
          ],
          workflowPolicies: [
            { id: 'policy-submit-gate', key: 'vmf-submit-gate', name: 'VMF Submit Gate', status: 'ACTIVE', issues: [] },
          ],
          uiContract: {
            id: 'ui-contract-vmf',
            key: 'vmf-ui-contract-v1',
            name: 'VMF UI Contract',
            status: 'ACTIVE',
            issues: [],
          },
        },
      },
      isLoading: false,
      error: null,
      refetch: packageDependenciesRefetchMock,
    }

    render(<SuperAdminFrameworkPackageEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('2.3.1')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: /^dependencies$/i }))

    expect(screen.getByRole('group', { name: /dependency filters/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /all dependencies: 7/i })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: /resolved skills: 1/i }))

    expect(screen.getByRole('button', { name: /resolved skills: 1/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('ODDF Observe')).toBeInTheDocument()
    expect(screen.queryByText('Reviewer Agent')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /open skill oddf observe/i }))

    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/skills/skill-observe')

    navigateMock.mockClear()
    await user.click(screen.getByRole('button', { name: /resolved agents: 2/i }))
    expect(screen.getByText('Reviewer Agent')).toBeInTheDocument()
    expect(screen.getByText('Missing Agent')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /open agent reviewer agent/i }))
    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/agents/agent-reviewer')
    navigateMock.mockClear()
    expect(screen.queryByRole('button', { name: /open agent missing agent/i })).not.toBeInTheDocument()
    expect(screen.getByText('agent-missing')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /validations: 1/i }))
    await user.click(screen.getByRole('button', { name: /open validation required sections/i }))
    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/validation-registry/validation-required-sections')
    navigateMock.mockClear()

    await user.click(screen.getByRole('button', { name: /workflow policies: 1/i }))
    await user.click(screen.getByRole('button', { name: /open workflow policy vmf submit gate/i }))
    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/workflow-policies/policy-submit-gate/edit')
    navigateMock.mockClear()

    await user.click(screen.getByRole('button', { name: /ui contract: 1/i }))
    await user.click(screen.getByRole('button', { name: /open ui contract vmf ui contract/i }))
    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/ui-contracts/ui-contract-vmf')
    navigateMock.mockClear()

    await user.click(screen.getByRole('button', { name: /runtime paths: 1/i }))
    await user.click(screen.getByRole('button', { name: /open runtime path section summary/i }))

    expect(navigateMock).toHaveBeenCalledWith('/super-admin/runtime-control/runtime-paths/runtime-path-section/edit')
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
