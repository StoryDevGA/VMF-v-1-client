import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { Fieldset } from '../../components/Fieldset'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { TabView } from '../../components/TabView'
import { Table } from '../../components/Table'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import { useToaster } from '../../components/Toaster'
import CustomerSearchSelect from '../../components/CustomerSearchSelect'
import RuntimePathSearchSelect from '../../components/RuntimePathSearchSelect'
import {
  useCreateFrameworkPackageMutation,
  useGetFrameworkPackageAuditQuery,
  useGetFrameworkPackageDependenciesQuery,
  useGetFrameworkPackageIntegrityQuery,
  useGetFrameworkPackageQuery,
  useListFrameworkPackagesQuery,
  useListFrameworkRegistriesQuery,
  useListUiContractsQuery,
  useListValidationRegistryQuery,
  useListWorkflowPoliciesQuery,
  useUpdateFrameworkPackageMutation,
} from '../../store/api/runtimeControlApi.js'
import {
  normalizeError,
} from '../../utils/errors.js'
import { getRuntimeControlFieldErrorMap } from '../../utils/runtimeControlFormErrors.js'
import {
  buildFrameworkRegistryAllowedKeys,
  buildFrameworkRegistryNameLookup,
  buildFrameworkRegistryOptions,
} from '../SuperAdminFrameworkRegistry/superAdminFrameworkRegistry.constants.js'
import {
  FRAMEWORK_PACKAGE_CUSTOMER_ACCESS_OPTIONS,
  FRAMEWORK_PACKAGE_EVALUATION_MODE_OPTIONS,
  FRAMEWORK_PACKAGE_EXECUTION_MODE_OPTIONS,
  FRAMEWORK_PACKAGE_OUTPUT_KEY_OPTIONS,
  FRAMEWORK_PACKAGE_OUTPUT_STYLE_OPTIONS,
  FRAMEWORK_PACKAGE_FORM_STATUS_OPTIONS,
  FRAMEWORK_PACKAGE_RETRY_POLICY_OPTIONS,
  FRAMEWORK_PACKAGE_SCOPE_OPTIONS,
  FRAMEWORK_PACKAGE_STATE_BINDING_MODE_OPTIONS,
  FRAMEWORK_PACKAGE_STATE_MODEL_OPTIONS,
  FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODE_OPTIONS,
  FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES,
  FRAMEWORK_PACKAGE_STATE_PERSISTENCE_OPTIONS,
  FRAMEWORK_PACKAGE_STATUSES,
  FRAMEWORK_PACKAGE_TYPE_OPTIONS,
  FRAMEWORK_PACKAGE_VALIDATION_TRIGGER_OPTIONS,
  FRAMEWORK_PACKAGE_VISIBILITY_OPTIONS,
  FRAMEWORK_PACKAGE_WORKFLOW_EXECUTION_CONTEXT_OPTIONS,
  INITIAL_FRAMEWORK_PACKAGE_FORM,
  deriveSectionKeyFromRuntimePath,
  formatFrameworkPackageStatus,
  getFrameworkPackageStatusVariant,
  hasLegacyFrameworkPackageContractFields,
  mapFrameworkPackageToForm,
  normalizeRuntimePath,
  normalizeSectionKey,
  parseCustomerIdList,
  formatCustomerIdList,
  validateFrameworkPackageForm,
} from '../SuperAdminFrameworkPackages/superAdminFrameworkPackages.constants.js'
import '../SuperAdminFrameworkPackages/SuperAdminFrameworkPackages.css'
import '../SuperAdminFrameworkPackages/FrameworkPackageListView.css'
import './SuperAdminFrameworkPackageEditor.css'

const SERVER_ERROR_FIELDS = Object.freeze([
  'frameworkKey',
  'frameworkName',
  'packageKey',
  'packageName',
  'version',
  'description',
  'status',
  'visibility',
  'customerAccessMode',
  'assignedCustomerIds',
  'sections',
  'sectionsText',
  'executionModel',
  'runtimeSettings',
  'validationBindings',
  'workflowBindings',
  'uiContractKey',
  'stateModelKey',
  'stateModelVersion',
  'stateModelMode',
  'stateBindingMode',
  'statePersistence',
  'stateContractNotes',
  'availableOutputKeys',
  'defaultOutputStyles',
  'artifactRetentionDays',
])

const TABLE_PAGE_SIZE = 5

const buildDefaultFrameworkPackageForm = (registryRows) => {
  const [firstRegistry] = registryRows

  if (!firstRegistry) {
    return {
      ...INITIAL_FRAMEWORK_PACKAGE_FORM,
      frameworkKey: '',
      frameworkName: '',
      sections: [],
      runtimeSettings: { ...INITIAL_FRAMEWORK_PACKAGE_FORM.runtimeSettings },
      executionModel: { ...INITIAL_FRAMEWORK_PACKAGE_FORM.executionModel },
      validationBindings: [],
      workflowBindings: [],
      uiContractKey: '',
    }
  }

  return {
    ...INITIAL_FRAMEWORK_PACKAGE_FORM,
    frameworkKey: String(firstRegistry.frameworkKey ?? '').trim(),
    frameworkName: String(firstRegistry.name ?? '').trim(),
    sections: [],
    runtimeSettings: { ...INITIAL_FRAMEWORK_PACKAGE_FORM.runtimeSettings },
    executionModel: { ...INITIAL_FRAMEWORK_PACKAGE_FORM.executionModel },
    validationBindings: [],
    workflowBindings: [],
    uiContractKey: '',
  }
}

const EMPTY_SECTION_DRAFT = Object.freeze({
  sectionKey: '',
  runtimePath: '',
  required: true,
  validationKeys: Object.freeze([]),
  notes: '',
})

const updateRuntimeSetting = (setForm, key, value) => {
  setForm((current) => ({
    ...current,
    runtimeSettings: {
      ...current.runtimeSettings,
      [key]: value,
    },
  }))
}

const updateExecutionModel = (setForm, key, value) => {
  setForm((current) => ({
    ...current,
    executionModel: {
      ...current.executionModel,
      [key]: value,
    },
  }))
}

const removeSection = (setForm, index) => {
  setForm((current) => ({
    ...current,
    sections: (current.sections ?? []).filter((_, sectionIndex) => sectionIndex !== index),
  }))
}

const addValidationBinding = (setForm, validationKey) => {
  if (!validationKey) return
  setForm((current) => ({
    ...current,
    validationBindings: [
      ...(current.validationBindings ?? []),
      {
        validationKey,
        trigger: 'ON_SUBMIT',
        blocking: true,
        priority: ((current.validationBindings ?? []).length + 1) * 100,
        freshnessMinutes: '',
        enabled: true,
        notes: '',
      },
    ].filter((item, index, list) =>
      list.findIndex((candidate) =>
        candidate.validationKey === item.validationKey
        && candidate.trigger === item.trigger,
      ) === index,
    ),
  }))
}

const updateValidationBinding = (setForm, index, key, value) => {
  setForm((current) => ({
    ...current,
    validationBindings: (current.validationBindings ?? []).map((binding, bindingIndex) =>
      bindingIndex === index ? { ...binding, [key]: value } : binding,
    ),
  }))
}

const removeValidationBinding = (setForm, index) => {
  setForm((current) => ({
    ...current,
    validationBindings: (current.validationBindings ?? []).filter((_, bindingIndex) => bindingIndex !== index),
  }))
}

const addWorkflowBinding = (setForm, policyKey) => {
  if (!policyKey) return
  setForm((current) => ({
    ...current,
    workflowBindings: [
      ...(current.workflowBindings ?? []),
      {
        policyKey,
        executionContext: 'ON_SUBMIT',
        priority: ((current.workflowBindings ?? []).length + 1) * 100,
        enabled: true,
        notes: '',
      },
    ].filter((item, index, list) =>
      list.findIndex((candidate) =>
        candidate.policyKey === item.policyKey
        && candidate.executionContext === item.executionContext,
      ) === index,
    ),
  }))
}

const updateWorkflowBinding = (setForm, index, key, value) => {
  setForm((current) => ({
    ...current,
    workflowBindings: (current.workflowBindings ?? []).map((binding, bindingIndex) =>
      bindingIndex === index ? { ...binding, [key]: value } : binding,
    ),
  }))
}

const removeWorkflowBinding = (setForm, index) => {
  setForm((current) => ({
    ...current,
    workflowBindings: (current.workflowBindings ?? []).filter((_, bindingIndex) => bindingIndex !== index),
  }))
}

const countErrorsForFields = (errors, fields) => fields.filter((field) => errors[field]).length

const parseDelimitedKeyList = (value) => [
  ...new Set(
    String(value ?? '')
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  ),
]

const toggleDelimitedKeyListValue = (currentValue, optionValue, checked) => {
  const currentItems = parseDelimitedKeyList(currentValue)
  const nextItems = checked
    ? [...new Set([...currentItems, optionValue])]
    : currentItems.filter((item) => item !== optionValue)

  return nextItems.join('\n')
}

const getTableTotalPages = (rowCount, pageSize = TABLE_PAGE_SIZE) =>
  Math.max(1, Math.ceil(Number(rowCount || 0) / pageSize))

const getClampedPage = (page, totalPages) =>
  Math.min(Math.max(Number(page) || 1, 1), Math.max(Number(totalPages) || 1, 1))

const getPaginatedRows = (rows, page, pageSize = TABLE_PAGE_SIZE) => {
  const currentPage = getClampedPage(page, getTableTotalPages(rows.length, pageSize))
  const startIndex = (currentPage - 1) * pageSize
  return rows.slice(startIndex, startIndex + pageSize)
}

function TablePagination({ currentPage, totalPages, onPageChange, ariaLabel }) {
  if (totalPages <= 1) return null

  return (
    <div
      className="super-admin-framework-packages__pagination"
      role="navigation"
      aria-label={ariaLabel}
    >
      <div className="super-admin-framework-packages__pagination-controls">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
        >
          First
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
      </div>

      <p className="super-admin-framework-packages__pagination-info">
        Page {currentPage} of {totalPages}
      </p>

      <div className="super-admin-framework-packages__pagination-controls">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
        >
          Last
        </Button>
      </div>
    </div>
  )
}

function TableSurface({
  ariaLabel,
  columns,
  data,
  emptyMessage,
  paginationLabel,
  currentPage,
  totalPages,
  onPageChange,
}) {
  return (
    <>
      <HorizontalScroll
        className="super-admin-framework-packages__table-wrap"
        ariaLabel={ariaLabel}
        gap="sm"
      >
        <Table
          className="super-admin-framework-packages__table"
          columns={columns}
          data={data}
          variant="striped"
          hoverable
          emptyMessage={emptyMessage}
          ariaLabel={ariaLabel}
        />
      </HorizontalScroll>
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        ariaLabel={paginationLabel}
      />
    </>
  )
}

const renderTabLabel = (label, count = 0) => (
  <span className="super-admin-framework-package-editor__tab-label">
    <span>{label}</span>
    {count > 0 ? (
      <>
        <span className="super-admin-framework-package-editor__tab-error-count" aria-hidden="true">
          ({count})
        </span>
        <span className="sr-only"> ({count} validation errors)</span>
      </>
    ) : null}
  </span>
)

const getCheckStatusVariant = (status) => {
  const normalized = String(status ?? '').trim().toUpperCase()
  if (normalized === 'PASS' || normalized === 'ACTIVE') return 'success'
  if (normalized === 'FAIL' || normalized === 'MISSING') return 'error'
  if (normalized === 'WARN' || normalized === 'WARNING') return 'warning'
  return 'neutral'
}

const formatDateTime = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

const formatIssueList = (issues = []) =>
  Array.isArray(issues) && issues.length > 0 ? issues.join(' ') : 'None'

const getAuditActorLabel = (actor) => {
  if (!actor) return '--'
  if (typeof actor === 'string') return actor
  return actor.name || actor.email || actor.id || actor._id || '--'
}

function PackageEditorLoadingState() {
  return (
    <Card variant="elevated" className="super-admin-framework-packages__card super-admin-framework-package-editor__loading-card">
      <Card.Body className="super-admin-framework-packages__card-body super-admin-framework-package-editor__loading-body">
        <Spinner size="lg" />
        <p className="super-admin-framework-package-editor__helper">Loading framework package...</p>
      </Card.Body>
    </Card>
  )
}

function PackageEditorErrorState({ message, onBack }) {
  return (
    <Card variant="elevated" className="super-admin-framework-packages__card super-admin-framework-package-editor__error-card">
      <Card.Body className="super-admin-framework-packages__card-body super-admin-framework-package-editor__loading-body">
        <p className="super-admin-framework-package-editor__error" role="alert">
          {message}
        </p>
        <div className="super-admin-framework-package-editor__top-actions">
          <Button variant="outline" size="sm" onClick={onBack}>
            Back
          </Button>
        </div>
      </Card.Body>
    </Card>
  )
}

function SectionHeader({ id, title, copy }) {
  return (
    <div className="super-admin-framework-package-editor__section-header">
      <h2 id={id} className="super-admin-framework-package-editor__section-title">{title}</h2>
      <p className="super-admin-framework-package-editor__section-copy">{copy}</p>
    </div>
  )
}

function SuperAdminFrameworkPackageEditor() {
  const navigate = useNavigate()
  const { packageId = '' } = useParams()
  const { addToast } = useToaster()
  const isEditMode = Boolean(packageId)

  const [form, setForm] = useState({
    ...INITIAL_FRAMEWORK_PACKAGE_FORM,
    sections: [],
    executionModel: { ...INITIAL_FRAMEWORK_PACKAGE_FORM.executionModel },
    runtimeSettings: { ...INITIAL_FRAMEWORK_PACKAGE_FORM.runtimeSettings },
    validationBindings: [],
    workflowBindings: [],
    uiContractKey: '',
  })
  const [errors, setErrors] = useState({})
  const [activeTab, setActiveTab] = useState(0)
  const [showRawJson, setShowRawJson] = useState(false)
  const [tablePages, setTablePages] = useState({
    sections: 1,
    dependencies: 1,
    integrity: 1,
    audit: 1,
  })
  const [sectionDialog, setSectionDialog] = useState({
    open: false,
    index: -1,
    draft: { ...EMPTY_SECTION_DRAFT },
  })
  const sectionDialogRef = useRef({
    open: false,
    index: -1,
    draft: { ...EMPTY_SECTION_DRAFT },
  })

  const {
    data: packageResponse,
    isLoading: isPackageLoading,
    error: packageError,
  } = useGetFrameworkPackageQuery(packageId, {
    skip: !isEditMode,
  })

  const {
    data: dependencyResponse,
    isLoading: isDependenciesLoading,
    error: dependencyError,
  } = useGetFrameworkPackageDependenciesQuery(packageId, {
    skip: !isEditMode,
  })

  const {
    data: integrityResponse,
    isFetching: isIntegrityFetching,
    error: integrityError,
    refetch: refetchIntegrity,
  } = useGetFrameworkPackageIntegrityQuery(packageId, {
    skip: !isEditMode,
  })

  const {
    data: auditResponse,
    isLoading: isAuditLoading,
    error: auditError,
  } = useGetFrameworkPackageAuditQuery({ packageId, page: 1, pageSize: 20 }, {
    skip: !isEditMode,
  })

  const { data: packageListResponse } = useListFrameworkPackagesQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })

  const { data: registryResponse } = useListFrameworkRegistriesQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })

  const { data: validationRegistryResponse } = useListValidationRegistryQuery({
    page: 1,
    pageSize: 100,
    status: 'ACTIVE',
    frameworkKey: form.frameworkKey || undefined,
    packageUsable: 'true',
  })

  const { data: workflowPolicyResponse } = useListWorkflowPoliciesQuery({
    page: 1,
    pageSize: 100,
    status: 'ACTIVE',
    frameworkKey: form.frameworkKey || undefined,
  })

  const { data: uiContractResponse } = useListUiContractsQuery({
    page: 1,
    pageSize: 100,
    status: 'ACTIVE',
    frameworkKey: form.frameworkKey || undefined,
    version: form.version || undefined,
  })

  const [createFrameworkPackage, { isLoading: isCreating }] = useCreateFrameworkPackageMutation()
  const [updateFrameworkPackage, { isLoading: isUpdating }] = useUpdateFrameworkPackageMutation()
  const isSaving = isCreating || isUpdating

  const registryRows = useMemo(() => registryResponse?.data ?? [], [registryResponse?.data])
  const frameworkOptions = buildFrameworkRegistryOptions(registryRows).filter((option) => option.value)
  const frameworkNameLookup = buildFrameworkRegistryNameLookup(registryRows)
  const supportedFrameworkKeys = buildFrameworkRegistryAllowedKeys(registryRows)
  const existingPackages = packageListResponse?.data ?? []
  const loadedPackage = packageResponse?.data ?? null
  const packageAppError = packageError ? normalizeError(packageError) : null
  const dependencyAppError = dependencyError ? normalizeError(dependencyError) : null
  const integrityAppError = integrityError ? normalizeError(integrityError) : null
  const auditAppError = auditError ? normalizeError(auditError) : null
  const legacyContractFieldsDetected = useMemo(
    () => isEditMode && hasLegacyFrameworkPackageContractFields(loadedPackage),
    [isEditMode, loadedPackage],
  )

  const validationOptions = useMemo(
    () =>
      (validationRegistryResponse?.data ?? [])
        .filter((row) =>
          String(row.status ?? '').toUpperCase() === 'ACTIVE'
          && row.packageUsable !== false
          && (!form.frameworkKey || (row.supportedFrameworkKeys ?? []).includes(form.frameworkKey)),
        )
        .map((row) => ({
          value: row.key,
          label: `${row.label ?? row.key} (${row.key})`,
        })),
    [form.frameworkKey, validationRegistryResponse],
  )

  const workflowPolicyOptions = useMemo(
    () =>
      (workflowPolicyResponse?.data ?? [])
        .filter((row) =>
          String(row.status ?? '').toUpperCase() === 'ACTIVE'
          && (!form.frameworkKey || (row.frameworkKeys ?? []).includes(form.frameworkKey)),
        )
        .map((row) => ({
          value: row.key,
          label: `${row.name ?? row.key} (${row.key})`,
        })),
    [form.frameworkKey, workflowPolicyResponse],
  )

  const uiContractOptions = useMemo(
    () => [
      { value: '', label: 'No UI Contract selected' },
      ...(uiContractResponse?.data ?? [])
        .filter((row) =>
          String(row.status ?? '').toUpperCase() === 'ACTIVE'
          && (!form.frameworkKey || (row.frameworkKeys ?? []).includes(form.frameworkKey)),
        )
        .map((row) => ({
          value: row.uiContractKey,
          label: `${row.name ?? row.uiContractKey} (${row.uiContractKey})`,
        })),
    ],
    [form.frameworkKey, uiContractResponse],
  )

  const uiContractRows = useMemo(
    () => uiContractResponse?.data ?? [],
    [uiContractResponse],
  )

  const selectedUiContract = useMemo(
    () => uiContractRows.find((row) => row.uiContractKey === form.uiContractKey) ?? null,
    [form.uiContractKey, uiContractRows],
  )

  const uiContractCompatibility = useMemo(() => {
    const packageSections = Array.isArray(form.sections) ? form.sections : []
    const packageSectionKeys = packageSections
      .map((section) => normalizeSectionKey(section.sectionKey))
      .filter(Boolean)
    const packageSectionByKey = new Map(packageSections.map((section) => [
      normalizeSectionKey(section.sectionKey),
      normalizeRuntimePath(section.runtimePath),
    ]))

    if (packageSectionKeys.length === 0) {
      return {
        status: 'PASS',
        message: 'No package sections require UI Contract mappings yet.',
        missing: [],
        orphaned: [],
        mismatched: [],
      }
    }

    if (!form.uiContractKey) {
      return {
        status: 'FAIL',
        message: 'Select a UI Contract before validating a package with sections.',
        missing: packageSectionKeys,
        orphaned: [],
        mismatched: [],
      }
    }

    const contractSections = Array.isArray(selectedUiContract?.sections) ? selectedUiContract.sections : []
    const mappedSections = contractSections.filter((section) =>
      section?.isCustom !== true
      && String(section?.source ?? '').trim().toUpperCase() !== 'CUSTOM')
    const mappedSectionByKey = new Map(mappedSections.map((section) => [
      normalizeSectionKey(section.sectionKey),
      normalizeRuntimePath(section.runtimePath),
    ]))
    const missing = packageSectionKeys.filter((sectionKey) => !mappedSectionByKey.has(sectionKey))
    const orphaned = [...mappedSectionByKey.keys()].filter((sectionKey) => !packageSectionByKey.has(sectionKey))
    const mismatched = packageSectionKeys.filter((sectionKey) =>
      mappedSectionByKey.has(sectionKey)
      && mappedSectionByKey.get(sectionKey) !== packageSectionByKey.get(sectionKey))

    if (!selectedUiContract) {
      return {
        status: 'WARN',
        message: 'The selected UI Contract is not in the active compatibility list.',
        missing,
        orphaned,
        mismatched,
      }
    }

    if (missing.length > 0 || orphaned.length > 0 || mismatched.length > 0) {
      return {
        status: 'FAIL',
        message: 'Package sections and UI Contract sections need alignment before validation.',
        missing,
        orphaned,
        mismatched,
      }
    }

    return {
      status: 'PASS',
      message: 'Package sections match the selected UI Contract mappings.',
      missing,
      orphaned,
      mismatched,
    }
  }, [form.sections, form.uiContractKey, selectedUiContract])

  const uiContractBinding = loadedPackage?.uiContractBinding ?? null
  const dependencyData = dependencyResponse?.data ?? null
  const integrityData = integrityResponse?.data ?? null
  const auditRows = auditResponse?.data ?? []
  const dependencyRows = useMemo(() => [
    ...(dependencyData?.agents ?? []).map((row) => ({ ...row, type: 'Agent' })),
    ...(dependencyData?.skills ?? []).map((row) => ({ ...row, type: 'Skill' })),
    ...(dependencyData?.runtimePaths ?? []).map((row) => ({ ...row, type: 'Runtime Path' })),
    ...(dependencyData?.validations ?? []).map((row) => ({ ...row, type: 'Validation' })),
    ...(dependencyData?.workflowPolicies ?? []).map((row) => ({ ...row, type: 'Workflow Policy' })),
    ...(dependencyData?.uiContract ? [{ ...dependencyData.uiContract, type: 'UI Contract' }] : []),
  ], [dependencyData])
  const integrityRows = integrityData?.checks ?? []
  const activePackageLocked = isEditMode && form.status === FRAMEWORK_PACKAGE_STATUSES.ACTIVE
  const validatedStructureLocked = isEditMode && form.status === FRAMEWORK_PACKAGE_STATUSES.VALIDATED
  const runtimeStructureLocked = activePackageLocked || validatedStructureLocked

  const closeSectionDialog = () => {
    const nextDialog = {
      open: false,
      index: -1,
      draft: { ...EMPTY_SECTION_DRAFT },
    }
    sectionDialogRef.current = nextDialog
    setSectionDialog(nextDialog)
  }

  const openAddSectionDialog = () => {
    const nextDialog = {
      open: true,
      index: -1,
      draft: { ...EMPTY_SECTION_DRAFT, validationKeys: [] },
    }
    sectionDialogRef.current = nextDialog
    setSectionDialog(nextDialog)
  }

  const openEditSectionDialog = (section, index) => {
    const nextDialog = {
      open: true,
      index,
      draft: {
        ...EMPTY_SECTION_DRAFT,
        ...section,
        sectionKey: normalizeSectionKey(section.sectionKey),
        runtimePath: normalizeRuntimePath(section.runtimePath),
        required: section.required !== false,
        validationKeys: Array.isArray(section.validationKeys) ? [...section.validationKeys] : [],
        notes: String(section.notes ?? '').trim(),
      },
    }
    sectionDialogRef.current = nextDialog
    setSectionDialog(nextDialog)
  }

  const updateSectionDraft = (key, value) => {
    const nextDialog = {
      ...sectionDialogRef.current,
      draft: {
        ...sectionDialogRef.current.draft,
        [key]: value,
      },
    }
    sectionDialogRef.current = nextDialog
    setSectionDialog(nextDialog)
  }

  const applySelectedSectionRuntimePath = (runtimePathValue) => {
    const runtimePath = normalizeRuntimePath(runtimePathValue)
    const sectionKey = deriveSectionKeyFromRuntimePath(runtimePath)
    const nextDialog = {
      ...sectionDialogRef.current,
      draft: {
        ...sectionDialogRef.current.draft,
        runtimePath,
        sectionKey: sectionKey || sectionDialogRef.current.draft.sectionKey,
      },
    }
    sectionDialogRef.current = nextDialog
    setSectionDialog(nextDialog)
  }

  const handleSectionRuntimePathChange = (selectedRuntimePaths) => {
    const [runtimePath = ''] = selectedRuntimePaths
    applySelectedSectionRuntimePath(runtimePath)
  }

  const handleSectionRuntimePathSelect = (runtimePathRow) => {
    const runtimePath = normalizeRuntimePath(runtimePathRow?.pathKey)
    if (!runtimePath) return
    applySelectedSectionRuntimePath(runtimePath)
  }

  const handleSaveSection = () => {
    const currentDialog = sectionDialogRef.current
    const nextSection = {
      sectionKey: normalizeSectionKey(currentDialog.draft.sectionKey),
      runtimePath: normalizeRuntimePath(currentDialog.draft.runtimePath),
      required: currentDialog.draft.required !== false,
      validationKeys: Array.isArray(currentDialog.draft.validationKeys)
        ? currentDialog.draft.validationKeys
        : [],
      notes: String(currentDialog.draft.notes ?? '').trim(),
    }
    setForm((current) => {
      const currentSections = current.sections ?? []
      const nextSections = currentDialog.index >= 0
        ? currentSections.map((section, index) =>
            index === currentDialog.index ? nextSection : section,
          )
        : [...currentSections, nextSection]

      return {
        ...current,
        sections: nextSections,
      }
    })
    setErrors((current) => {
      const remainingErrors = { ...current }
      delete remainingErrors.sections
      delete remainingErrors.sectionsText
      return remainingErrors
    })
    closeSectionDialog()
  }

  const sectionRows = useMemo(
    () => (form.sections ?? []).map((section, index) => ({
      ...section,
      id: `${section.sectionKey || 'section'}-${index}`,
      index,
    })),
    [form.sections],
  )

  const sectionColumns = [
    {
      key: 'sectionKey',
      label: 'Section Key',
      width: '18%',
      render: (sectionKey) => (
        <code className="super-admin-framework-package-editor__code-token">
          {sectionKey || '--'}
        </code>
      ),
    },
    {
      key: 'runtimePath',
      label: 'Runtime Path',
      width: '42%',
      render: (runtimePath) => (
        <span className="super-admin-framework-package-editor__path-token">
          {runtimePath || 'Runtime path required'}
        </span>
      ),
    },
    {
      key: 'required',
      label: 'Required',
      width: '12%',
      render: (required) => (
        <Badge variant={required !== false ? 'success' : 'neutral'} size="sm" pill>
          {required !== false ? 'Required' : 'Optional'}
        </Badge>
      ),
    },
    {
      key: 'validationKeys',
      label: 'Validation',
      width: '14%',
      render: (validationKeys) => {
        const count = Array.isArray(validationKeys) ? validationKeys.length : 0
        return count > 0 ? `${count} key${count === 1 ? '' : 's'}` : 'Future'
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '14%',
      render: (_value, row) => (
        <div className="super-admin-framework-package-editor__table-actions">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => openEditSectionDialog(row, row.index)}
            disabled={runtimeStructureLocked}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeSection(setForm, row.index)}
            disabled={runtimeStructureLocked}
          >
            Remove
          </Button>
        </div>
      ),
    },
  ]

  useEffect(() => {
    if (!isEditMode || !loadedPackage) return undefined

    const timeoutId = window.setTimeout(() => {
      setForm(mapFrameworkPackageToForm(loadedPackage))
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [isEditMode, loadedPackage])

  useEffect(() => {
    if (isEditMode || !Array.isArray(registryRows) || registryRows.length === 0) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setForm((current) =>
        current.frameworkKey ? current : buildDefaultFrameworkPackageForm(registryRows),
      )
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [isEditMode, registryRows])

  const navigateToFrameworkPackages = (options) => {
    navigate('/super-admin/runtime-control/framework-packages', options)
  }

  const handleBack = () => {
    navigateToFrameworkPackages()
  }

  const setEditorTablePage = (tableKey, nextPage, totalPages) => {
    setTablePages((current) => ({
      ...current,
      [tableKey]: getClampedPage(nextPage, totalPages),
    }))
  }

  const executeSave = async (payload) => {
    try {
      if (isEditMode) {
        await updateFrameworkPackage({ packageId, ...payload }).unwrap()
        addToast({
          title: 'Framework package updated',
          description: 'Changes were saved successfully.',
          variant: 'success',
        })
      } else {
        await createFrameworkPackage(payload).unwrap()
        addToast({
          title: 'Framework package created',
          description: `${payload.frameworkKey} ${payload.version} is now available in the catalogue.`,
          variant: 'success',
        })
      }

      navigateToFrameworkPackages({ state: { runtimeControlSaved: true } })
    } catch (err) {
      const appError = normalizeError(err)
      const fieldErrors = getRuntimeControlFieldErrorMap(appError, SERVER_ERROR_FIELDS)

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
        return
      }
      addToast({
        title: isEditMode ? 'Failed to update framework package' : 'Failed to create framework package',
        description: appError.message,
        variant: 'error',
      })
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrors({})

    if (activePackageLocked) {
      addToast({
        title: 'Active package is locked',
        description: 'Clone the active package before making runtime contract changes.',
        variant: 'warning',
      })
      return
    }

    const { errors: nextErrors, payload } = validateFrameworkPackageForm(
      form,
      existingPackages,
      packageId,
      supportedFrameworkKeys,
    )
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    await executeSave(payload)
  }

  const pageTitle = isEditMode ? 'Framework Package Editor' : 'Create Framework Package'
  const canAssignCustomers =
    form.visibility === 'CUSTOMER_VISIBLE'
    && form.customerAccessMode === 'SELECTED_CUSTOMERS'
  const selectedCustomerIds = useMemo(
    () => parseCustomerIdList(form.assignedCustomerIds),
    [form.assignedCustomerIds],
  )
  const tabErrorCounts = {
    access: countErrorsForFields(errors, ['visibility', 'customerAccessMode', 'assignedCustomerIds']),
    sections: countErrorsForFields(errors, ['sections', 'sectionsText']),
    runtime: countErrorsForFields(errors, ['runtimeSettings', 'executionModel']),
    validation: countErrorsForFields(errors, ['validationBindings']),
    workflows: countErrorsForFields(errors, ['workflowBindings']),
    outputs: countErrorsForFields(errors, ['availableOutputKeys', 'defaultOutputStyles', 'artifactRetentionDays']),
    uiContract: countErrorsForFields(errors, ['uiContractKey']),
    stateContract: countErrorsForFields(errors, [
      'stateModelKey',
      'stateModelVersion',
      'stateModelMode',
      'stateBindingMode',
      'statePersistence',
      'stateContractNotes',
    ]),
  }

  const currentPackageJson = useMemo(() => {
    const { payload } = validateFrameworkPackageForm(
      form,
      existingPackages,
      packageId,
      supportedFrameworkKeys,
    )
    return {
      ...(loadedPackage ?? {}),
      ...payload,
      uiContractBinding,
    }
  }, [existingPackages, form, loadedPackage, packageId, supportedFrameworkKeys, uiContractBinding])

  const sectionTableTotalPages = getTableTotalPages(sectionRows.length)
  const sectionTablePage = getClampedPage(tablePages.sections, sectionTableTotalPages)
  const paginatedSectionRows = getPaginatedRows(sectionRows, sectionTablePage)

  const dependencyTableTotalPages = getTableTotalPages(dependencyRows.length)
  const dependencyTablePage = getClampedPage(tablePages.dependencies, dependencyTableTotalPages)
  const paginatedDependencyRows = getPaginatedRows(dependencyRows, dependencyTablePage)

  const integrityTableTotalPages = getTableTotalPages(integrityRows.length)
  const integrityTablePage = getClampedPage(tablePages.integrity, integrityTableTotalPages)
  const paginatedIntegrityRows = getPaginatedRows(integrityRows, integrityTablePage)

  const auditTableTotalPages = getTableTotalPages(auditRows.length)
  const auditTablePage = getClampedPage(tablePages.audit, auditTableTotalPages)
  const paginatedAuditRows = getPaginatedRows(auditRows, auditTablePage)

  return (
    <section
      className="super-admin-framework-packages super-admin-framework-package-editor container"
      aria-label="Framework package editor"
    >
      <header className="super-admin-framework-packages__header">
        <h1 className="super-admin-framework-packages__title">{pageTitle}</h1>
        <p className="super-admin-framework-packages__subtitle">
          Assemble deployable framework blueprints with governed access, sections, runtime settings,
          validations, workflow policies, and future output placeholders.
        </p>
      </header>

      <Fieldset className="super-admin-framework-package-editor__fieldset">
        <Fieldset.Legend className="sr-only">Framework package editor</Fieldset.Legend>
        {isEditMode && isPackageLoading ? <PackageEditorLoadingState /> : null}
        {isEditMode && packageAppError ? (
          <PackageEditorErrorState message={packageAppError.message} onBack={handleBack} />
        ) : null}

        {!isPackageLoading && !packageAppError ? (
          <Card variant="elevated" className="super-admin-framework-packages__card super-admin-framework-package-editor__card">
            <form className="super-admin-framework-package-editor__form" onSubmit={handleSubmit} noValidate>
              <Card.Body className="super-admin-framework-packages__card-body super-admin-framework-packages__card-body--compact super-admin-framework-package-editor__card-body">
                <div className="super-admin-framework-package-editor__top-actions">
                  <Button type="button" variant="outline" size="sm" onClick={handleBack}>
                    Back
                  </Button>
                </div>

                {isEditMode ? (
                  <div className="super-admin-framework-packages__token-list" aria-label="Package status summary">
                    <Status size="md" showIcon variant={getFrameworkPackageStatusVariant(form.status)}>
                      Status: {formatFrameworkPackageStatus(form.status)}
                    </Status>
                    {loadedPackage?.isDefault ? (
                      <Badge variant="success" size="md" pill outline>
                        Default Package
                      </Badge>
                    ) : null}
                  </div>
                ) : null}

                <div className="super-admin-framework-package-editor__intro">
                  <p className="super-admin-framework-package-editor__form-title">
                    {isEditMode
                      ? 'Editor surface for an existing framework package.'
                      : 'Editor surface for a new framework package.'}
                  </p>
                  <p className="super-admin-framework-packages__table-note">
                    Keep package identity visible while configuring package-specific runtime blueprint tabs.
                    Skills and Agents are resolved dependencies, not direct package selections.
                  </p>
                </div>

                {legacyContractFieldsDetected ? (
                  <div className="super-admin-framework-package-editor__legacy-warning" role="status" aria-live="polite">
                    <Badge variant="warning" size="sm" pill outline>
                      Legacy Contract
                    </Badge>
                    <p className="super-admin-framework-package-editor__helper">
                      This package includes deprecated package-level config. The editor is showing canonical bindings synthesized from that data, and saving will keep only the canonical package contract.
                    </p>
                  </div>
                ) : null}

                {activePackageLocked || validatedStructureLocked ? (
                  <div
                    className="super-admin-framework-packages__token-list"
                    role="status"
                    aria-live="polite"
                  >
                    <Status size="md" showIcon variant={activePackageLocked ? 'error' : 'warning'}>
                      {activePackageLocked ? 'Active Locked' : 'Runtime Structure Locked'}
                    </Status>
                    <p className="super-admin-framework-packages__table-note">
                      {activePackageLocked
                        ? 'Active framework packages cannot be edited directly. Clone flow is required for changes.'
                        : 'Validated packages lock sections, runtime paths, validation bindings, workflow bindings, UI Contract binding, and State Contract runtime fields.'}
                    </p>
                  </div>
                ) : null}

                <section className="super-admin-framework-package-editor__basic-section" aria-labelledby="framework-package-editor-basic-information">
                  <SectionHeader
                    id="framework-package-editor-basic-information"
                    title="Basic Information"
                    copy="Define the package identity and lifecycle metadata that downstream Runtime Control resources reference."
                  />
                  <div className="super-admin-framework-package-editor__identity-layout">
                    <div className="super-admin-framework-package-editor__field-group">
                      <div className="super-admin-framework-package-editor__field-group-header">
                        <h3 className="super-admin-framework-package-editor__field-group-title">Framework identity</h3>
                        <p className="super-admin-framework-package-editor__field-group-copy">
                          Bind this package to the source framework and release lifecycle.
                        </p>
                      </div>
                      <div className="super-admin-framework-package-editor__field-grid">
                        <Select
                          id="framework-package-editor-framework-key"
                          label="Framework Key"
                          value={form.frameworkKey}
                          options={frameworkOptions}
                          onChange={(event) => {
                            const nextKey = event.target.value
                            setForm((current) => ({
                              ...current,
                              frameworkKey: nextKey,
                              frameworkName: frameworkNameLookup[nextKey] ?? current.frameworkName,
                            }))
                          }}
                          error={errors.frameworkKey}
                          disabled={runtimeStructureLocked}
                        />
                        <Input
                          id="framework-package-editor-framework-name"
                          label="Framework Name"
                          value={form.frameworkName}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, frameworkName: event.target.value }))
                          }
                          error={errors.frameworkName}
                          disabled={activePackageLocked}
                          fullWidth
                        />
                        <Input
                          id="framework-package-editor-version"
                          label="Version"
                          value={form.version}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, version: event.target.value }))
                          }
                          error={errors.version}
                          helperText="Use semantic version format, for example 2.3.1."
                          disabled={runtimeStructureLocked}
                          fullWidth
                        />
                        <Select
                          id="framework-package-editor-status"
                          label="Lifecycle State"
                          value={form.status}
                          options={isEditMode && form.status === FRAMEWORK_PACKAGE_STATUSES.ACTIVE
                            ? [{ value: FRAMEWORK_PACKAGE_STATUSES.ACTIVE, label: 'Active' }]
                            : FRAMEWORK_PACKAGE_FORM_STATUS_OPTIONS}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, status: event.target.value }))
                          }
                          disabled={activePackageLocked}
                        />
                      </div>
                    </div>
                    <div className="super-admin-framework-package-editor__field-group">
                      <div className="super-admin-framework-package-editor__field-group-header">
                        <h3 className="super-admin-framework-package-editor__field-group-title">Package identity</h3>
                        <p className="super-admin-framework-package-editor__field-group-copy">
                          Define how this version appears in the package catalogue.
                        </p>
                      </div>
                      <div className="super-admin-framework-package-editor__field-grid">
                        <Select
                          id="framework-package-editor-package-scope"
                          label="Package Scope"
                          value={form.packageScope}
                          options={FRAMEWORK_PACKAGE_SCOPE_OPTIONS}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, packageScope: event.target.value }))
                          }
                          disabled={activePackageLocked}
                        />
                        <Select
                          id="framework-package-editor-package-type"
                          label="Package Type"
                          value={form.packageType}
                          options={FRAMEWORK_PACKAGE_TYPE_OPTIONS}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, packageType: event.target.value }))
                          }
                          disabled={activePackageLocked}
                        />
                        <Input
                          id="framework-package-editor-package-key"
                          label="Package Key"
                          value={form.packageKey}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, packageKey: event.target.value }))
                          }
                          error={errors.packageKey}
                          helperText="Drafts can default from framework and version; validation requires a package key."
                          disabled={runtimeStructureLocked}
                          fullWidth
                        />
                        <Input
                          id="framework-package-editor-package-name"
                          label="Package Name"
                          value={form.packageName}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, packageName: event.target.value }))
                          }
                          error={errors.packageName}
                          disabled={activePackageLocked}
                          fullWidth
                        />
                      </div>
                    </div>
                  </div>
                  <Textarea
                    id="framework-package-editor-description"
                    label="Description"
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, description: event.target.value }))
                    }
                    error={errors.description}
                    rows={3}
                    disabled={activePackageLocked}
                    fullWidth
                  />
                </section>

                <TabView
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  variant="pills"
                  size="sm"
                  evenTabs
                  className="super-admin-framework-package-editor__tabs"
                  aria-label="Framework package editor sections"
                >
                  <TabView.Tab label={renderTabLabel('Access', tabErrorCounts.access)}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Access"
                        copy="Control whether this package remains internal or becomes available to customer workspaces."
                      />
                      <div className="super-admin-framework-package-editor__grid">
                        <Select
                          id="framework-package-editor-visibility"
                          label="Visibility"
                          value={form.visibility}
                          options={FRAMEWORK_PACKAGE_VISIBILITY_OPTIONS}
                          onChange={(event) =>
                            setForm((current) => {
                              const visibility = event.target.value
                              if (visibility === 'INTERNAL_ONLY') {
                                return {
                                  ...current,
                                  visibility,
                                  customerAccessMode: 'ALL_CUSTOMERS',
                                  assignedCustomerIds: '',
                                }
                              }

                              return { ...current, visibility }
                            })
                          }
                          disabled={activePackageLocked}
                        />
                        <Select
                          id="framework-package-editor-customer-access-mode"
                          label="Customer Access"
                          value={form.customerAccessMode}
                          options={FRAMEWORK_PACKAGE_CUSTOMER_ACCESS_OPTIONS}
                          onChange={(event) => {
                            const customerAccessMode = event.target.value
                            setForm((current) => ({
                              ...current,
                              customerAccessMode,
                              assignedCustomerIds: customerAccessMode === 'ALL_CUSTOMERS'
                                ? ''
                                : current.assignedCustomerIds,
                            }))
                          }}
                          disabled={activePackageLocked || form.visibility === 'INTERNAL_ONLY'}
                          error={errors.customerAccessMode}
                        />
                      </div>
                      <CustomerSearchSelect
                        id="framework-package-editor-assigned-customers"
                        label="Assigned Customers"
                        helperText={canAssignCustomers
                          ? 'Search and select active customers from the Customer table.'
                          : 'Available only when visibility is customer visible and access is selected customers.'}
                        selectedIds={selectedCustomerIds}
                        onChange={(nextCustomerIds) =>
                          setForm((current) => ({
                            ...current,
                            assignedCustomerIds: formatCustomerIdList(nextCustomerIds),
                          }))
                        }
                        error={errors.assignedCustomerIds}
                        disabled={activePackageLocked || !canAssignCustomers}
                      />
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Sections', tabErrorCounts.sections)}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Sections"
                        copy="Define the structured framework sections this package exposes and requires at runtime."
                      />
                      {errors.sections || errors.sectionsText ? (
                        <p className="super-admin-framework-package-editor__error" role="alert">
                          {errors.sections || errors.sectionsText}
                        </p>
                      ) : null}
                      <div className="super-admin-framework-package-editor__toolbar">
                        <p className="super-admin-framework-package-editor__helper">
                          Package sections define what exists and where it binds in framework_state. Labels, help text,
                          placeholders, and display order belong in the selected UI Contract.
                        </p>
                        <Button type="button" variant="outline" size="sm" onClick={openAddSectionDialog} disabled={runtimeStructureLocked}>
                          Add Section
                        </Button>
                      </div>
                      <TableSurface
                        ariaLabel="Package sections"
                        columns={sectionColumns}
                        data={paginatedSectionRows}
                        emptyMessage="No sections configured yet. Add the runtime sections this package should expose."
                        paginationLabel="Package sections pagination"
                        currentPage={sectionTablePage}
                        totalPages={sectionTableTotalPages}
                        onPageChange={(nextPage) =>
                          setEditorTablePage('sections', nextPage, sectionTableTotalPages)
                        }
                      />
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Runtime', tabErrorCounts.runtime)}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Runtime"
                        copy="Configure runtime behavior for package execution without storing runtime instance data."
                      />
                      <div className="super-admin-framework-package-editor__field-group">
                        <div className="super-admin-framework-package-editor__field-group-header">
                          <h3 className="super-admin-framework-package-editor__field-group-title">Execution Model</h3>
                          <p className="super-admin-framework-package-editor__field-group-copy">
                            Define how this package evaluates validations and workflow policies at runtime.
                          </p>
                        </div>
                        <div className="super-admin-framework-package-editor__field-grid">
                          <Select
                            id="framework-package-editor-execution-mode"
                            label="Execution Mode"
                            value={form.executionModel?.mode ?? 'EVENT_DRIVEN'}
                            options={FRAMEWORK_PACKAGE_EXECUTION_MODE_OPTIONS}
                            onChange={(event) => updateExecutionModel(setForm, 'mode', event.target.value)}
                            disabled={runtimeStructureLocked}
                          />
                          <Select
                            id="framework-package-editor-runtime-state-model"
                            label="Runtime State Model"
                            value={form.executionModel?.stateModel ?? 'LIFECYCLE_BASED'}
                            options={FRAMEWORK_PACKAGE_STATE_MODEL_OPTIONS}
                            onChange={(event) => updateExecutionModel(setForm, 'stateModel', event.target.value)}
                            disabled={runtimeStructureLocked}
                          />
                          <Select
                            id="framework-package-editor-evaluation-mode"
                            label="Evaluation Mode"
                            value={form.executionModel?.evaluationMode ?? 'POLICY_DRIVEN'}
                            options={FRAMEWORK_PACKAGE_EVALUATION_MODE_OPTIONS}
                            onChange={(event) => updateExecutionModel(setForm, 'evaluationMode', event.target.value)}
                            disabled={runtimeStructureLocked}
                          />
                        </div>
                      </div>
                      <div className="super-admin-framework-package-editor__option-panel">
                        <Tickbox
                          id="framework-package-editor-runtime-preview"
                          label="Enable preview mode"
                          checked={Boolean(form.runtimeSettings?.enablePreviewMode)}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'enablePreviewMode', event.target.checked)
                          }
                          disabled={runtimeStructureLocked}
                        />
                        <Tickbox
                          id="framework-package-editor-runtime-validation"
                          label="Enable runtime validation"
                          checked={Boolean(form.runtimeSettings?.enableRuntimeValidation)}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'enableRuntimeValidation', event.target.checked)
                          }
                          disabled={runtimeStructureLocked}
                        />
                        <Tickbox
                          id="framework-package-editor-runtime-publish-validation"
                          label="Require validation before publish"
                          checked={Boolean(form.runtimeSettings?.requireValidationBeforePublish)}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'requireValidationBeforePublish', event.target.checked)
                          }
                          disabled={runtimeStructureLocked}
                        />
                        <Tickbox
                          id="framework-package-editor-runtime-manual-validation"
                          label="Allow manual validation run"
                          checked={Boolean(form.runtimeSettings?.allowManualValidationRun)}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'allowManualValidationRun', event.target.checked)
                          }
                          disabled={runtimeStructureLocked}
                        />
                      </div>
                      <div className="super-admin-framework-package-editor__grid">
                        <Select
                          id="framework-package-editor-retry-policy"
                          label="Retry Policy"
                          value={form.runtimeSettings?.retryPolicy ?? 'RETRY_ONCE'}
                          options={FRAMEWORK_PACKAGE_RETRY_POLICY_OPTIONS}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'retryPolicy', event.target.value)
                          }
                          disabled={runtimeStructureLocked}
                        />
                        <Input
                          id="framework-package-editor-timeout-ms"
                          label="Default Timeout (ms)"
                          type="number"
                          value={form.runtimeSettings?.defaultTimeoutMs ?? 30000}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'defaultTimeoutMs', event.target.value)
                          }
                          disabled={runtimeStructureLocked}
                          fullWidth
                        />
                        <Input
                          id="framework-package-editor-max-policies"
                          label="Max Policy Executions"
                          type="number"
                          value={form.runtimeSettings?.maxPolicyExecutionsPerRun ?? 10}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'maxPolicyExecutionsPerRun', event.target.value)
                          }
                          disabled={runtimeStructureLocked}
                          fullWidth
                        />
                      </div>
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Validation', tabErrorCounts.validation)}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Validation"
                        copy="Select active, package-usable validation registry entries compatible with this package framework."
                      />
                      <Select
                        id="framework-package-editor-validation-picker"
                        label="Add Validation Binding"
                        value=""
                        options={[
                          { value: '', label: validationOptions.length ? 'Select validation' : 'No compatible validations' },
                          ...validationOptions,
                        ]}
                        onChange={(event) => addValidationBinding(setForm, event.target.value)}
                        helperText="Only ACTIVE, package-usable, framework-compatible validations are shown."
                        error={errors.validationBindings}
                        disabled={runtimeStructureLocked}
                      />
                      <div className="super-admin-framework-package-editor__row-list">
                        {(form.validationBindings ?? []).length === 0 ? (
                          <p className="super-admin-framework-package-editor__helper">
                            No validation bindings configured.
                          </p>
                        ) : null}
                        {(form.validationBindings ?? []).map((item, index) => (
                          <div className="super-admin-framework-package-editor__config-row" key={`${item.validationKey}-${item.trigger}-${index}`}>
                            <div className="super-admin-framework-package-editor__row-header">
                              <h3 className="super-admin-framework-package-editor__row-title">{item.validationKey}</h3>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeValidationBinding(setForm, index)} disabled={runtimeStructureLocked}>
                                Remove
                              </Button>
                            </div>
                            <div className="super-admin-framework-package-editor__field-grid">
                              <Select
                                id={`framework-package-editor-validation-trigger-${index}`}
                                label="Trigger"
                                value={item.trigger ?? 'ON_SUBMIT'}
                                options={FRAMEWORK_PACKAGE_VALIDATION_TRIGGER_OPTIONS}
                                onChange={(event) => updateValidationBinding(setForm, index, 'trigger', event.target.value)}
                                disabled={runtimeStructureLocked}
                              />
                              <Input
                                id={`framework-package-editor-validation-priority-${index}`}
                                label="Priority"
                                type="number"
                                value={item.priority ?? 100}
                                onChange={(event) => updateValidationBinding(setForm, index, 'priority', event.target.value)}
                                disabled={runtimeStructureLocked}
                                fullWidth
                              />
                              <Input
                                id={`framework-package-editor-validation-freshness-${index}`}
                                label="Freshness Minutes"
                                type="number"
                                value={item.freshnessMinutes ?? ''}
                                onChange={(event) => updateValidationBinding(setForm, index, 'freshnessMinutes', event.target.value)}
                                disabled={runtimeStructureLocked}
                                fullWidth
                              />
                            </div>
                            <div className="super-admin-framework-package-editor__option-panel super-admin-framework-package-editor__option-panel--inline">
                              <Tickbox
                                id={`framework-package-editor-validation-blocking-${index}`}
                                label="Blocking"
                                checked={item.blocking !== false}
                                onChange={(event) => updateValidationBinding(setForm, index, 'blocking', event.target.checked)}
                                disabled={runtimeStructureLocked}
                              />
                              <Tickbox
                                id={`framework-package-editor-validation-enabled-${index}`}
                                label="Enabled"
                                checked={item.enabled !== false}
                                onChange={(event) => updateValidationBinding(setForm, index, 'enabled', event.target.checked)}
                                disabled={runtimeStructureLocked}
                              />
                            </div>
                            <Textarea
                              id={`framework-package-editor-validation-notes-${index}`}
                              label="Notes"
                              value={item.notes ?? ''}
                              onChange={(event) => updateValidationBinding(setForm, index, 'notes', event.target.value)}
                              rows={2}
                              disabled={runtimeStructureLocked}
                              fullWidth
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Workflows', tabErrorCounts.workflows)}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Workflows"
                        copy="Select active Workflow Policies compatible with the package framework."
                      />
                      <Select
                        id="framework-package-editor-workflow-picker"
                        label="Add Workflow Binding"
                        value=""
                        options={[
                          { value: '', label: workflowPolicyOptions.length ? 'Select workflow policy' : 'No compatible policies' },
                          ...workflowPolicyOptions,
                        ]}
                        onChange={(event) => addWorkflowBinding(setForm, event.target.value)}
                        helperText="Only ACTIVE, framework-compatible workflow policies are shown."
                        error={errors.workflowBindings}
                        disabled={runtimeStructureLocked}
                      />
                      <div className="super-admin-framework-package-editor__row-list">
                        {(form.workflowBindings ?? []).length === 0 ? (
                          <p className="super-admin-framework-package-editor__helper">
                            No workflow bindings configured.
                          </p>
                        ) : null}
                        {(form.workflowBindings ?? []).map((item, index) => (
                          <div className="super-admin-framework-package-editor__config-row" key={`${item.policyKey}-${item.executionContext}-${index}`}>
                            <div className="super-admin-framework-package-editor__row-header">
                              <h3 className="super-admin-framework-package-editor__row-title">{item.policyKey}</h3>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeWorkflowBinding(setForm, index)} disabled={runtimeStructureLocked}>
                                Remove
                              </Button>
                            </div>
                            <div className="super-admin-framework-package-editor__field-grid">
                              <Select
                                id={`framework-package-editor-workflow-context-${index}`}
                                label="Execution Context"
                                value={item.executionContext ?? 'ON_SUBMIT'}
                                options={FRAMEWORK_PACKAGE_WORKFLOW_EXECUTION_CONTEXT_OPTIONS}
                                onChange={(event) => updateWorkflowBinding(setForm, index, 'executionContext', event.target.value)}
                                disabled={runtimeStructureLocked}
                              />
                              <Input
                                id={`framework-package-editor-workflow-priority-${index}`}
                                label="Priority"
                                type="number"
                                value={item.priority ?? 100}
                                onChange={(event) => updateWorkflowBinding(setForm, index, 'priority', event.target.value)}
                                disabled={runtimeStructureLocked}
                                fullWidth
                              />
                              <Tickbox
                                id={`framework-package-editor-workflow-enabled-${index}`}
                                label="Enabled"
                                checked={item.enabled !== false}
                                onChange={(event) => updateWorkflowBinding(setForm, index, 'enabled', event.target.checked)}
                                disabled={runtimeStructureLocked}
                              />
                            </div>
                            <Textarea
                              id={`framework-package-editor-workflow-notes-${index}`}
                              label="Notes"
                              value={item.notes ?? ''}
                              onChange={(event) => updateWorkflowBinding(setForm, index, 'notes', event.target.value)}
                              rows={2}
                              disabled={runtimeStructureLocked}
                              fullWidth
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Outputs', tabErrorCounts.outputs)}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Outputs"
                        copy="Reserve package output metadata for the future Output Library without execution bindings."
                      />
                      <p className="super-admin-framework-package-editor__helper">
                        Outputs are configured in the Output Library in a future release. This package only stores metadata placeholders.
                      </p>
                      <div className="super-admin-framework-package-editor__grid super-admin-framework-package-editor__grid--wide">
                        <div className="super-admin-framework-package-editor__option-panel">
                          <span className="super-admin-framework-package-editor__summary-label">Available Output Keys</span>
                          {FRAMEWORK_PACKAGE_OUTPUT_KEY_OPTIONS.map((option) => (
                            <Tickbox
                              key={option.value}
                              id={`framework-package-editor-available-output-key-${option.value}`}
                              label={option.label}
                              checked={parseDelimitedKeyList(form.availableOutputKeys).includes(option.value)}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  availableOutputKeys: toggleDelimitedKeyListValue(
                                    current.availableOutputKeys,
                                    option.value,
                                    event.target.checked,
                                  ),
                                }))
                              }
                              disabled={activePackageLocked}
                            />
                          ))}
                          <p className="super-admin-framework-package-editor__helper">
                            Placeholder only. No output engine behavior is invoked.
                          </p>
                        </div>
                        <div className="super-admin-framework-package-editor__option-panel">
                          <span className="super-admin-framework-package-editor__summary-label">Default Output Styles</span>
                          {FRAMEWORK_PACKAGE_OUTPUT_STYLE_OPTIONS.map((option) => (
                            <Tickbox
                              key={option.value}
                              id={`framework-package-editor-default-output-style-${option.value}`}
                              label={option.label}
                              checked={parseDelimitedKeyList(form.defaultOutputStyles).includes(option.value)}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  defaultOutputStyles: toggleDelimitedKeyListValue(
                                    current.defaultOutputStyles,
                                    option.value,
                                    event.target.checked,
                                  ),
                                }))
                              }
                              disabled={activePackageLocked}
                            />
                          ))}
                        </div>
                      </div>
                      <Input
                        id="framework-package-editor-artifact-retention-days"
                        label="Artifact Retention Days"
                        type="number"
                        value={form.artifactRetentionDays}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, artifactRetentionDays: event.target.value }))
                        }
                        disabled={activePackageLocked}
                        fullWidth
                      />
                      <div className="super-admin-framework-package-editor__option-panel">
                        <Tickbox
                          id="framework-package-editor-allow-customer-output-definitions"
                          label="Allow customer custom output definitions"
                          checked={Boolean(form.allowCustomerOutputDefinitions)}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, allowCustomerOutputDefinitions: event.target.checked }))
                          }
                          disabled={activePackageLocked}
                        />
                        <Tickbox
                          id="framework-package-editor-allow-output-revision-history"
                          label="Allow output revision history"
                          checked={Boolean(form.allowOutputRevisionHistory)}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, allowOutputRevisionHistory: event.target.checked }))
                          }
                          disabled={activePackageLocked}
                        />
                      </div>
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('UI Contract', tabErrorCounts.uiContract)}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="UI Contract"
                        copy="Select and inspect the presentation contract that maps package sections to renderer controls."
                      />
                      <div className="super-admin-framework-package-editor__field-grid">
                        <Select
                          id="framework-package-editor-ui-contract"
                          label="Selected Contract"
                          value={form.uiContractKey ?? ''}
                          options={uiContractOptions}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, uiContractKey: event.target.value }))
                          }
                          helperText="Packages reference UI Contracts; presentation authoring stays in the UI Contract Registry."
                          error={errors.uiContractKey}
                          disabled={runtimeStructureLocked}
                        />
                      </div>
                      <div
                        className="super-admin-framework-packages__token-list super-admin-framework-package-editor__summary-chip-row"
                        aria-label="UI Contract status summary"
                      >
                        <Status
                          size="md"
                          showIcon
                          variant={getCheckStatusVariant(selectedUiContract?.status ?? uiContractBinding?.status)}
                        >
                          Contract: {selectedUiContract?.status ?? uiContractBinding?.status ?? 'Not selected'}
                        </Status>
                        <Status size="md" showIcon variant={getCheckStatusVariant(uiContractCompatibility.status)}>
                          Compatibility: {uiContractCompatibility.status}
                        </Status>
                      </div>
                      <div
                        className="super-admin-framework-packages__token-list super-admin-framework-package-editor__summary-chip-row"
                        aria-label="UI Contract version summary"
                      >
                        <Badge variant="neutral" size="md" pill outline>
                          UI Contract Version: {selectedUiContract?.sourcePackageVersion ?? uiContractBinding?.version ?? '--'}
                        </Badge>
                        <Badge variant="neutral" size="md" pill outline>
                          Package Version: {form.version || '--'}
                        </Badge>
                        <Badge variant="neutral" size="md" pill outline>
                          Compatibility Mode: {selectedUiContract?.compatibilityMode ?? uiContractBinding?.compatibilityMode ?? '--'}
                        </Badge>
                        <Badge variant="neutral" size="md" pill outline>
                          Resolved At: {uiContractBinding?.resolvedAt ? formatDateTime(uiContractBinding.resolvedAt) : '--'}
                        </Badge>
                      </div>
                      <div className="super-admin-framework-package-editor__toolbar">
                        <p className="super-admin-framework-package-editor__helper">{uiContractCompatibility.message}</p>
                        <div className="super-admin-framework-package-editor__table-actions">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!form.uiContractKey}
                            onClick={() => {
                              const targetId = selectedUiContract?.id || form.uiContractKey
                              navigate(`/super-admin/runtime-control/ui-contracts/${targetId}`)
                            }}
                          >
                            Open UI Contract
                          </Button>
                        </div>
                      </div>
                      <div
                        className="super-admin-framework-packages__token-list super-admin-framework-package-editor__summary-chip-row"
                        aria-label="UI Contract mapping summary"
                      >
                        <Badge variant={uiContractCompatibility.missing.length > 0 ? 'warning' : 'success'} size="md" pill outline>
                          Missing mappings: {uiContractCompatibility.missing.length}
                        </Badge>
                        <Badge variant={uiContractCompatibility.orphaned.length > 0 ? 'warning' : 'success'} size="md" pill outline>
                          Orphaned mappings: {uiContractCompatibility.orphaned.length}
                        </Badge>
                        <Badge variant={uiContractCompatibility.mismatched.length > 0 ? 'warning' : 'success'} size="md" pill outline>
                          Runtime path mismatches: {uiContractCompatibility.mismatched.length}
                        </Badge>
                      </div>
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('State Contract', tabErrorCounts.stateContract)}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="State Contract"
                        copy="Define state model resolution, binding strictness, persistence, and implementation notes."
                      />
                      <div className="super-admin-framework-package-editor__field-grid">
                        <Select
                          id="framework-package-editor-state-model-mode"
                          label="State Model Mode"
                          value={form.stateModelMode ?? FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL}
                          options={FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODE_OPTIONS}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              stateModelMode: event.target.value,
                              stateModelKey: event.target.value === FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL
                                ? ''
                                : current.stateModelKey,
                              stateModelVersion: event.target.value === FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL
                                ? ''
                                : current.stateModelVersion,
                            }))
                          }
                          error={errors.stateModelMode}
                          disabled={runtimeStructureLocked}
                        />
                        <Input
                          id="framework-package-editor-state-model-key"
                          label="State Model Key"
                          value={form.stateModelKey ?? ''}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, stateModelKey: event.target.value }))
                          }
                          helperText="Text fallback until the State Model Registry exists."
                          error={errors.stateModelKey}
                          disabled={runtimeStructureLocked || form.stateModelMode === FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL}
                          fullWidth
                        />
                        <Input
                          id="framework-package-editor-state-model-version"
                          label="State Model Version"
                          value={form.stateModelVersion ?? ''}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, stateModelVersion: event.target.value }))
                          }
                          helperText="Use semantic version format for external state models."
                          error={errors.stateModelVersion}
                          disabled={runtimeStructureLocked || form.stateModelMode === FRAMEWORK_PACKAGE_STATE_MODEL_REFERENCE_MODES.INTERNAL}
                          fullWidth
                        />
                        <Select
                          id="framework-package-editor-state-binding-mode"
                          label="State Binding Mode"
                          value={form.stateBindingMode ?? 'STRICT'}
                          options={FRAMEWORK_PACKAGE_STATE_BINDING_MODE_OPTIONS}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, stateBindingMode: event.target.value }))
                          }
                          error={errors.stateBindingMode}
                          disabled={runtimeStructureLocked}
                        />
                        <Select
                          id="framework-package-editor-state-persistence"
                          label="State Persistence"
                          value={form.statePersistence ?? 'SESSION'}
                          options={FRAMEWORK_PACKAGE_STATE_PERSISTENCE_OPTIONS}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, statePersistence: event.target.value }))
                          }
                          error={errors.statePersistence}
                          disabled={runtimeStructureLocked}
                        />
                      </div>
                      <Textarea
                        id="framework-package-editor-state-contract-notes"
                        label="Notes"
                        value={form.stateContractNotes ?? ''}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, stateContractNotes: event.target.value }))
                        }
                        error={errors.stateContractNotes}
                        rows={4}
                        disabled={activePackageLocked}
                        fullWidth
                      />
                      <p className="super-admin-framework-package-editor__helper">
                        Internal mode uses framework_state.sections.*. External mode is future-ready and requires a key and version before save.
                      </p>
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Dependencies')}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Dependencies"
                        copy="Read-only resolved runtime dependencies derived from sections, validations, workflows, and UI Contract binding."
                      />
                      {!isEditMode ? (
                        <p className="super-admin-framework-package-editor__helper">Dependencies are available after the package is created.</p>
                      ) : dependencyAppError ? (
                        <p className="super-admin-framework-package-editor__error" role="alert">{dependencyAppError.message}</p>
                      ) : isDependenciesLoading ? (
                        <p className="super-admin-framework-package-editor__helper">Loading dependency summary...</p>
                      ) : (
                        <>
                          <div
                            className="super-admin-framework-packages__token-list super-admin-framework-package-editor__summary-chip-row"
                            aria-label="Dependency summary"
                          >
                            <Badge variant="neutral" size="md" pill outline>
                              Resolved Agents: {Number(dependencyData?.summary?.agents) || 0}
                            </Badge>
                            <Badge variant="neutral" size="md" pill outline>
                              Resolved Skills: {Number(dependencyData?.summary?.skills) || 0}
                            </Badge>
                            <Badge variant="neutral" size="md" pill outline>
                              Runtime Paths: {Number(dependencyData?.summary?.runtimePaths) || 0}
                            </Badge>
                            <Badge variant="neutral" size="md" pill outline>
                              Validations: {Number(dependencyData?.summary?.validations) || 0}
                            </Badge>
                            <Badge variant="neutral" size="md" pill outline>
                              Workflow Policies: {Number(dependencyData?.summary?.workflowPolicies) || 0}
                            </Badge>
                            <Badge variant="neutral" size="md" pill outline>
                              UI Contract: {Number(dependencyData?.summary?.uiContract) || 0}
                            </Badge>
                          </div>
                          <TableSurface
                            ariaLabel="Framework package dependencies"
                            columns={[
                              { key: 'type', label: 'Type', width: '16%' },
                              { key: 'key', label: 'Key', width: '26%', render: (value) => <code className="super-admin-framework-package-editor__code-token">{value}</code> },
                              { key: 'name', label: 'Name', width: '24%' },
                              { key: 'status', label: 'Status', width: '14%', render: (value) => (
                                <Status size="sm" showIcon variant={getCheckStatusVariant(value)}>{value}</Status>
                              ) },
                              { key: 'issues', label: 'Issues', width: '20%', render: formatIssueList },
                            ]}
                            data={paginatedDependencyRows}
                            emptyMessage="No runtime dependencies resolved for this package."
                            paginationLabel="Framework package dependencies pagination"
                            currentPage={dependencyTablePage}
                            totalPages={dependencyTableTotalPages}
                            onPageChange={(nextPage) =>
                              setEditorTablePage('dependencies', nextPage, dependencyTableTotalPages)
                            }
                          />
                        </>
                      )}
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Integrity')}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Integrity"
                        copy="Run the Runtime Architecture Checkpoint before validation or activation."
                      />
                      {!isEditMode ? (
                        <p className="super-admin-framework-package-editor__helper">Integrity checks are available after the package is created.</p>
                      ) : integrityAppError ? (
                        <p className="super-admin-framework-package-editor__error" role="alert">{integrityAppError.message}</p>
                      ) : (
                        <>
                          <div className="super-admin-framework-package-editor__toolbar">
                            <Status size="sm" showIcon variant={getCheckStatusVariant(integrityData?.status)}>
                              {integrityData?.status ?? 'Not run'}
                            </Status>
                            <Button type="button" variant="outline" size="sm" onClick={() => refetchIntegrity()} loading={isIntegrityFetching}>
                              Run Full Check
                            </Button>
                          </div>
                          <div
                            className="super-admin-framework-packages__token-list super-admin-framework-package-editor__summary-chip-row"
                            aria-label="Integrity summary"
                          >
                            <Status size="md" showIcon variant="success">
                              PASS: {Number(integrityData?.summary?.pass) || 0}
                            </Status>
                            <Status size="md" showIcon variant="warning">
                              WARN: {Number(integrityData?.summary?.warn) || 0}
                            </Status>
                            <Status size="md" showIcon variant="error">
                              FAIL: {Number(integrityData?.summary?.fail) || 0}
                            </Status>
                          </div>
                          <TableSurface
                            ariaLabel="Framework package integrity checks"
                            columns={[
                              { key: 'group', label: 'Group', width: '22%' },
                              { key: 'severity', label: 'Result', width: '14%', render: (value) => (
                                <Status size="sm" showIcon variant={getCheckStatusVariant(value)}>{value}</Status>
                              ) },
                              { key: 'field', label: 'Field', width: '18%', render: (value) => value ? <code className="super-admin-framework-package-editor__code-token">{value}</code> : '--' },
                              { key: 'message', label: 'Message', width: '46%' },
                            ]}
                            data={paginatedIntegrityRows}
                            emptyMessage="No integrity checks returned yet."
                            paginationLabel="Framework package integrity checks pagination"
                            currentPage={integrityTablePage}
                            totalPages={integrityTableTotalPages}
                            onPageChange={(nextPage) =>
                              setEditorTablePage('integrity', nextPage, integrityTableTotalPages)
                            }
                          />
                        </>
                      )}
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('Audit')}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="Audit"
                        copy="Review package create, update, validate, and activate events."
                      />
                      {!isEditMode ? (
                        <p className="super-admin-framework-package-editor__helper">Audit events are available after the package is created.</p>
                      ) : auditAppError ? (
                        <p className="super-admin-framework-package-editor__error" role="alert">{auditAppError.message}</p>
                      ) : isAuditLoading ? (
                        <p className="super-admin-framework-package-editor__helper">Loading audit events...</p>
                      ) : (
                        <TableSurface
                          ariaLabel="Framework package audit log"
                          columns={[
                            { key: 'ts', label: 'Timestamp', width: '20%', render: formatDateTime },
                            { key: 'actorUserId', label: 'User', width: '18%', render: getAuditActorLabel },
                            { key: 'action', label: 'Action', width: '22%' },
                            { key: 'summary', label: 'Summary', width: '40%', render: (value, row) => value || JSON.stringify(row.diff ?? {}) },
                          ]}
                          data={paginatedAuditRows}
                          emptyMessage="No audit events found for this package."
                          paginationLabel="Framework package audit pagination"
                          currentPage={auditTablePage}
                          totalPages={auditTableTotalPages}
                          onPageChange={(nextPage) =>
                            setEditorTablePage('audit', nextPage, auditTableTotalPages)
                          }
                        />
                      )}
                    </div>
                  </TabView.Tab>

                  <TabView.Tab label={renderTabLabel('JSON / Diff')}>
                    <div className="super-admin-framework-package-editor__tab-panel">
                      <SectionHeader
                        title="JSON / Diff"
                        copy="Inspect read-only package JSON and the future version-diff scaffold."
                      />
                      <div className="super-admin-framework-package-editor__toolbar">
                        <div className="super-admin-framework-package-editor__table-actions">
                          <Button type="button" variant={showRawJson ? 'outline' : 'primary'} size="sm" onClick={() => setShowRawJson(false)}>
                            Formatted
                          </Button>
                          <Button type="button" variant={showRawJson ? 'primary' : 'outline'} size="sm" onClick={() => setShowRawJson(true)}>
                            Raw
                          </Button>
                        </div>
                        <Badge variant="neutral" size="sm" pill outline>
                          Read-only
                        </Badge>
                      </div>
                      <pre className="super-admin-framework-package-editor__json-preview" aria-label="Framework package JSON preview">
                        {showRawJson
                          ? JSON.stringify(currentPackageJson)
                          : JSON.stringify(currentPackageJson, null, 2)}
                      </pre>
                      <div className="super-admin-framework-package-editor__option-panel">
                        <p className="super-admin-framework-package-editor__helper">
                          Version diff is not available until package snapshot history is implemented.
                        </p>
                      </div>
                    </div>
                  </TabView.Tab>
                </TabView>

                {Object.keys(errors).length > 0 ? (
                  <p className="super-admin-framework-package-editor__error" role="alert">
                    Review the highlighted package fields and try again.
                  </p>
                ) : null}

                <div className="super-admin-framework-package-editor__footer-actions">
                  <Button type="button" variant="outline" size="sm" onClick={handleBack} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" loading={isSaving} disabled={activePackageLocked}>
                    {isEditMode ? 'Save Changes' : 'Create Framework Package'}
                  </Button>
                </div>
              </Card.Body>
            </form>
          </Card>
        ) : null}
      </Fieldset>
      <Dialog
        open={sectionDialog.open}
        onClose={closeSectionDialog}
        size="lg"
        className="super-admin-framework-package-editor__section-dialog"
      >
        <Dialog.Header>
          <h2 className="dialog__title">
            {sectionDialog.index >= 0 ? 'Edit Section' : 'Add Section'}
          </h2>
          <p className="dialog__subtitle">
            Bind a package section to an active framework_state section runtime path. Presentation stays in the UI Contract.
          </p>
        </Dialog.Header>
        <Dialog.Body>
          <div className="super-admin-framework-package-editor__dialog-fields">
            <RuntimePathSearchSelect
              id="framework-package-editor-section-runtime-path"
              label="Runtime Path"
              frameworkKeys={form.frameworkKey ? [form.frameworkKey] : []}
              scope="FRAMEWORK_STATE"
              category="SECTION"
              operation={null}
              allowedOperations={['READ', 'BIND']}
              pathPrefix="framework_state.sections."
              selectionMode="single"
              selectedKeys={sectionDialog.draft.runtimePath ? [sectionDialog.draft.runtimePath] : []}
              onChange={handleSectionRuntimePathChange}
              onSelect={handleSectionRuntimePathSelect}
              placeholder="Search section runtime paths"
              helperText="Only ACTIVE framework_state.sections.* runtime paths in the Runtime Path Registry are selectable."
              disabled={runtimeStructureLocked}
            />
            <Input
              id="framework-package-editor-section-key"
              label="Section Key"
              value={sectionDialog.draft.sectionKey}
              onChange={(event) => updateSectionDraft('sectionKey', event.target.value)}
              helperText="Auto-derived from the selected runtime path. Must match the UI Contract section key."
              disabled={runtimeStructureLocked}
              fullWidth
            />
            <Tickbox
              id="framework-package-editor-section-required"
              label="Required"
              checked={sectionDialog.draft.required !== false}
              onChange={(event) => updateSectionDraft('required', event.target.checked)}
              disabled={runtimeStructureLocked}
            />
            <Textarea
              id="framework-package-editor-section-notes"
              label="Notes"
              value={sectionDialog.draft.notes ?? ''}
              onChange={(event) => updateSectionDraft('notes', event.target.value)}
              helperText="Internal structural notes only. Do not add labels, help text, or placeholder copy here."
              rows={3}
              disabled={activePackageLocked}
              fullWidth
            />
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="outline" size="sm" onClick={closeSectionDialog}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveSection}
            disabled={
              runtimeStructureLocked
              ||
              !normalizeSectionKey(sectionDialog.draft.sectionKey)
              || !normalizeRuntimePath(sectionDialog.draft.runtimePath)
            }
          >
            Save Section
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default SuperAdminFrameworkPackageEditor
