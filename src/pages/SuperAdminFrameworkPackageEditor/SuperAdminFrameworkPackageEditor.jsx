import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { TabView } from '../../components/TabView'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import { useToaster } from '../../components/Toaster'
import {
  useCreateFrameworkPackageMutation,
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
  FRAMEWORK_PACKAGE_FORM_STATUS_OPTIONS,
  FRAMEWORK_PACKAGE_RETRY_POLICY_OPTIONS,
  FRAMEWORK_PACKAGE_SCOPE_OPTIONS,
  FRAMEWORK_PACKAGE_SECTION_DATA_TYPE_OPTIONS,
  FRAMEWORK_PACKAGE_STATUSES,
  FRAMEWORK_PACKAGE_STATE_MODEL_OPTIONS,
  FRAMEWORK_PACKAGE_TYPE_OPTIONS,
  FRAMEWORK_PACKAGE_VALIDATION_TRIGGER_OPTIONS,
  FRAMEWORK_PACKAGE_VISIBILITY_OPTIONS,
  FRAMEWORK_PACKAGE_WORKFLOW_EXECUTION_CONTEXT_OPTIONS,
  INITIAL_FRAMEWORK_PACKAGE_FORM,
  formatFrameworkPackageStatus,
  getFrameworkPackageStatusVariant,
  mapFrameworkPackageToForm,
  validateFrameworkPackageForm,
} from '../SuperAdminFrameworkPackages/superAdminFrameworkPackages.constants.js'
import '../SuperAdminFrameworkPackages/SuperAdminFrameworkPackages.css'
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
  'validationConfig',
  'workflowPolicyConfig',
  'validationBindings',
  'workflowBindings',
  'uiContractKey',
  'availableOutputKeys',
  'defaultOutputStyles',
  'artifactRetentionDays',
])

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
      validationConfig: [],
      workflowPolicyConfig: [],
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
    validationConfig: [],
    workflowPolicyConfig: [],
    validationBindings: [],
    workflowBindings: [],
    uiContractKey: '',
  }
}

const listToText = (items) => Array.isArray(items) ? items.join('\n') : ''

const textToList = (value) => [
  ...new Set(
    String(value ?? '')
      .split(/[\n,]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  ),
]

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

const addSection = (setForm) => {
  setForm((current) => {
    const nextIndex = (current.sections ?? []).length + 1
    const section = {
      sectionKey: `section-${nextIndex}`,
      label: `Section ${nextIndex}`,
      description: '',
      required: true,
      displayOrder: nextIndex * 10,
      visible: true,
      runtimeEditable: true,
      includeInSummary: false,
      helpText: '',
      placeholder: '',
      dataType: 'STRING',
      maxLength: '',
      validationKeys: [],
    }

    return {
      ...current,
      sections: [...(current.sections ?? []), section],
    }
  })
}

const updateSection = (setForm, index, key, value) => {
  setForm((current) => ({
    ...current,
    sections: (current.sections ?? []).map((section, sectionIndex) =>
      sectionIndex === index ? { ...section, [key]: value } : section,
    ),
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
    validationConfig: [],
    workflowPolicyConfig: [],
    validationBindings: [],
    workflowBindings: [],
    uiContractKey: '',
  })
  const [errors, setErrors] = useState({})
  const [activeTab, setActiveTab] = useState(0)

  const {
    data: packageResponse,
    isLoading: isPackageLoading,
    error: packageError,
  } = useGetFrameworkPackageQuery(packageId, {
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

  useEffect(() => {
    if (isEditMode && loadedPackage) {
      const timeoutId = window.setTimeout(() => {
        setForm(mapFrameworkPackageToForm(loadedPackage))
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }

    if (!isEditMode && Array.isArray(registryRows) && registryRows.length > 0) {
      const timeoutId = window.setTimeout(() => {
        setForm((current) =>
          current.frameworkKey ? current : buildDefaultFrameworkPackageForm(registryRows),
        )
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }

    return undefined
  }, [isEditMode, loadedPackage, registryRows])

  const navigateToFrameworkPackages = (options) => {
    navigate('/super-admin/runtime-control/framework-packages', options)
  }

  const handleBack = () => {
    navigateToFrameworkPackages()
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
  const tabErrorCounts = {
    access: countErrorsForFields(errors, ['visibility', 'customerAccessMode', 'assignedCustomerIds']),
    sections: countErrorsForFields(errors, ['sections', 'sectionsText']),
    runtime: countErrorsForFields(errors, ['runtimeSettings', 'executionModel', 'uiContractKey']),
    validation: countErrorsForFields(errors, ['validationConfig', 'validationBindings']),
    workflows: countErrorsForFields(errors, ['workflowPolicyConfig', 'workflowBindings', 'compatibleWorkflowKeys']),
    outputs: countErrorsForFields(errors, ['availableOutputKeys', 'defaultOutputStyles', 'artifactRetentionDays']),
  }

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
                  <div className="super-admin-framework-package-editor__summary">
                    <div className="super-admin-framework-package-editor__summary-item">
                      <span className="super-admin-framework-package-editor__summary-label">Status</span>
                      <Status size="sm" showIcon variant={getFrameworkPackageStatusVariant(form.status)}>
                        {formatFrameworkPackageStatus(form.status)}
                      </Status>
                    </div>
                    {loadedPackage?.isDefault ? (
                      <div className="super-admin-framework-package-editor__summary-item">
                        <Badge variant="success" size="sm" pill outline>
                          Default Package
                        </Badge>
                      </div>
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
                        />
                        <Input
                          id="framework-package-editor-framework-name"
                          label="Framework Name"
                          value={form.frameworkName}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, frameworkName: event.target.value }))
                          }
                          error={errors.frameworkName}
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
                          disabled={isEditMode && form.status === FRAMEWORK_PACKAGE_STATUSES.ACTIVE}
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
                        />
                        <Select
                          id="framework-package-editor-package-type"
                          label="Package Type"
                          value={form.packageType}
                          options={FRAMEWORK_PACKAGE_TYPE_OPTIONS}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, packageType: event.target.value }))
                          }
                        />
                        <Input
                          id="framework-package-editor-package-key"
                          label="Package Key"
                          value={form.packageKey}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, packageKey: event.target.value }))
                          }
                          error={errors.packageKey}
                          helperText="Optional. Defaults from framework and version."
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
                          disabled={form.visibility === 'INTERNAL_ONLY'}
                          error={errors.customerAccessMode}
                        />
                      </div>
                      <Textarea
                        id="framework-package-editor-assigned-customers"
                        label="Assigned Customer IDs"
                        helperText={canAssignCustomers
                          ? 'Required for selected-customer package access.'
                          : 'Available only when visibility is customer visible and access is selected customers.'}
                        value={form.assignedCustomerIds}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, assignedCustomerIds: event.target.value }))
                        }
                        error={errors.assignedCustomerIds}
                        disabled={!canAssignCustomers}
                        rows={4}
                        fullWidth
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
                      <div className="super-admin-framework-package-editor__section-toolbar">
                        <Button type="button" variant="outline" size="sm" onClick={() => addSection(setForm)}>
                          Add Section
                        </Button>
                      </div>
                      <div className="super-admin-framework-package-editor__row-list">
                        {(form.sections ?? []).length === 0 ? (
                          <p className="super-admin-framework-package-editor__helper">
                            No sections configured yet. Add at least the runtime sections this package should expose.
                          </p>
                        ) : null}
                        {(form.sections ?? []).map((section, index) => (
                          <div className="super-admin-framework-package-editor__config-row" key={`${section.sectionKey}-${index}`}>
                            <div className="super-admin-framework-package-editor__row-header">
                              <h3 className="super-admin-framework-package-editor__row-title">
                                {section.label || section.sectionKey || `Section ${index + 1}`}
                              </h3>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeSection(setForm, index)}>
                                Remove
                              </Button>
                            </div>
                            <div className="super-admin-framework-package-editor__field-grid">
                              <Input
                                id={`framework-package-editor-section-key-${index}`}
                                label="Section Key"
                                value={section.sectionKey}
                                onChange={(event) => updateSection(setForm, index, 'sectionKey', event.target.value)}
                                fullWidth
                              />
                              <Input
                                id={`framework-package-editor-section-label-${index}`}
                                label="Label"
                                value={section.label}
                                onChange={(event) => updateSection(setForm, index, 'label', event.target.value)}
                                fullWidth
                              />
                              <Select
                                id={`framework-package-editor-section-type-${index}`}
                                label="Data Type"
                                value={section.dataType ?? 'STRING'}
                                options={FRAMEWORK_PACKAGE_SECTION_DATA_TYPE_OPTIONS}
                                onChange={(event) => updateSection(setForm, index, 'dataType', event.target.value)}
                              />
                              <Input
                                id={`framework-package-editor-section-max-length-${index}`}
                                label="Max Length"
                                type="number"
                                value={section.maxLength ?? ''}
                                onChange={(event) => updateSection(setForm, index, 'maxLength', event.target.value)}
                                fullWidth
                              />
                            </div>
                            <div className="super-admin-framework-package-editor__option-panel super-admin-framework-package-editor__option-panel--inline">
                              <Tickbox
                                id={`framework-package-editor-section-required-${index}`}
                                label="Required"
                                checked={section.required !== false}
                                onChange={(event) => updateSection(setForm, index, 'required', event.target.checked)}
                              />
                              <Tickbox
                                id={`framework-package-editor-section-visible-${index}`}
                                label="Visible"
                                checked={section.visible !== false}
                                onChange={(event) => updateSection(setForm, index, 'visible', event.target.checked)}
                              />
                              <Tickbox
                                id={`framework-package-editor-section-editable-${index}`}
                                label="Runtime editable"
                                checked={section.runtimeEditable !== false}
                                onChange={(event) => updateSection(setForm, index, 'runtimeEditable', event.target.checked)}
                              />
                              <Tickbox
                                id={`framework-package-editor-section-summary-${index}`}
                                label="Include in summary"
                                checked={Boolean(section.includeInSummary)}
                                onChange={(event) => updateSection(setForm, index, 'includeInSummary', event.target.checked)}
                              />
                            </div>
                            <div className="super-admin-framework-package-editor__grid super-admin-framework-package-editor__grid--wide">
                              <Textarea
                                id={`framework-package-editor-section-help-${index}`}
                                label="Help Text"
                                value={section.helpText ?? ''}
                                onChange={(event) => updateSection(setForm, index, 'helpText', event.target.value)}
                                rows={3}
                                fullWidth
                              />
                              <Textarea
                                id={`framework-package-editor-section-validations-${index}`}
                                label="Validation Keys"
                                helperText="Comma or newline separated validation registry keys."
                                value={listToText(section.validationKeys)}
                                onChange={(event) => updateSection(setForm, index, 'validationKeys', textToList(event.target.value))}
                                rows={3}
                                fullWidth
                              />
                            </div>
                          </div>
                        ))}
                      </div>
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
                          />
                          <Select
                            id="framework-package-editor-state-model"
                            label="State Model"
                            value={form.executionModel?.stateModel ?? 'LIFECYCLE_BASED'}
                            options={FRAMEWORK_PACKAGE_STATE_MODEL_OPTIONS}
                            onChange={(event) => updateExecutionModel(setForm, 'stateModel', event.target.value)}
                          />
                          <Select
                            id="framework-package-editor-evaluation-mode"
                            label="Evaluation Mode"
                            value={form.executionModel?.evaluationMode ?? 'POLICY_DRIVEN'}
                            options={FRAMEWORK_PACKAGE_EVALUATION_MODE_OPTIONS}
                            onChange={(event) => updateExecutionModel(setForm, 'evaluationMode', event.target.value)}
                          />
                          <Select
                            id="framework-package-editor-ui-contract"
                            label="UI Contract"
                            value={form.uiContractKey ?? ''}
                            options={uiContractOptions}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, uiContractKey: event.target.value }))
                            }
                            helperText="Presentation is configured in the UI Contract Registry; packages only reference it."
                            error={errors.uiContractKey}
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
                        />
                        <Tickbox
                          id="framework-package-editor-runtime-validation"
                          label="Enable runtime validation"
                          checked={Boolean(form.runtimeSettings?.enableRuntimeValidation)}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'enableRuntimeValidation', event.target.checked)
                          }
                        />
                        <Tickbox
                          id="framework-package-editor-runtime-publish-validation"
                          label="Require validation before publish"
                          checked={Boolean(form.runtimeSettings?.requireValidationBeforePublish)}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'requireValidationBeforePublish', event.target.checked)
                          }
                        />
                        <Tickbox
                          id="framework-package-editor-runtime-manual-validation"
                          label="Allow manual validation run"
                          checked={Boolean(form.runtimeSettings?.allowManualValidationRun)}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'allowManualValidationRun', event.target.checked)
                          }
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
                        />
                        <Input
                          id="framework-package-editor-timeout-ms"
                          label="Default Timeout (ms)"
                          type="number"
                          value={form.runtimeSettings?.defaultTimeoutMs ?? 30000}
                          onChange={(event) =>
                            updateRuntimeSetting(setForm, 'defaultTimeoutMs', event.target.value)
                          }
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
                        error={errors.validationBindings || errors.validationConfig}
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
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeValidationBinding(setForm, index)}>
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
                              />
                              <Input
                                id={`framework-package-editor-validation-priority-${index}`}
                                label="Priority"
                                type="number"
                                value={item.priority ?? 100}
                                onChange={(event) => updateValidationBinding(setForm, index, 'priority', event.target.value)}
                                fullWidth
                              />
                              <Input
                                id={`framework-package-editor-validation-freshness-${index}`}
                                label="Freshness Minutes"
                                type="number"
                                value={item.freshnessMinutes ?? ''}
                                onChange={(event) => updateValidationBinding(setForm, index, 'freshnessMinutes', event.target.value)}
                                fullWidth
                              />
                            </div>
                            <div className="super-admin-framework-package-editor__option-panel super-admin-framework-package-editor__option-panel--inline">
                              <Tickbox
                                id={`framework-package-editor-validation-blocking-${index}`}
                                label="Blocking"
                                checked={item.blocking !== false}
                                onChange={(event) => updateValidationBinding(setForm, index, 'blocking', event.target.checked)}
                              />
                              <Tickbox
                                id={`framework-package-editor-validation-enabled-${index}`}
                                label="Enabled"
                                checked={item.enabled !== false}
                                onChange={(event) => updateValidationBinding(setForm, index, 'enabled', event.target.checked)}
                              />
                            </div>
                            <Textarea
                              id={`framework-package-editor-validation-notes-${index}`}
                              label="Notes"
                              value={item.notes ?? ''}
                              onChange={(event) => updateValidationBinding(setForm, index, 'notes', event.target.value)}
                              rows={2}
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
                        error={errors.workflowBindings || errors.workflowPolicyConfig}
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
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeWorkflowBinding(setForm, index)}>
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
                              />
                              <Input
                                id={`framework-package-editor-workflow-priority-${index}`}
                                label="Priority"
                                type="number"
                                value={item.priority ?? 100}
                                onChange={(event) => updateWorkflowBinding(setForm, index, 'priority', event.target.value)}
                                fullWidth
                              />
                              <Tickbox
                                id={`framework-package-editor-workflow-enabled-${index}`}
                                label="Enabled"
                                checked={item.enabled !== false}
                                onChange={(event) => updateWorkflowBinding(setForm, index, 'enabled', event.target.checked)}
                              />
                            </div>
                            <Textarea
                              id={`framework-package-editor-workflow-notes-${index}`}
                              label="Notes"
                              value={item.notes ?? ''}
                              onChange={(event) => updateWorkflowBinding(setForm, index, 'notes', event.target.value)}
                              rows={2}
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
                        copy="Reserve package output hooks for the future Output Library without invoking generation behavior."
                      />
                      <div className="super-admin-framework-package-editor__grid super-admin-framework-package-editor__grid--wide">
                        <Textarea
                          id="framework-package-editor-available-output-keys"
                          label="Available Output Keys"
                          helperText="Placeholder only. No output engine behavior is invoked."
                          value={form.availableOutputKeys}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, availableOutputKeys: event.target.value }))
                          }
                          rows={4}
                          fullWidth
                        />
                        <Textarea
                          id="framework-package-editor-default-output-styles"
                          label="Default Output Styles"
                          value={form.defaultOutputStyles}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, defaultOutputStyles: event.target.value }))
                          }
                          rows={4}
                          fullWidth
                        />
                      </div>
                      <Input
                        id="framework-package-editor-artifact-retention-days"
                        label="Artifact Retention Days"
                        type="number"
                        value={form.artifactRetentionDays}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, artifactRetentionDays: event.target.value }))
                        }
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
                        />
                        <Tickbox
                          id="framework-package-editor-allow-output-revision-history"
                          label="Allow output revision history"
                          checked={Boolean(form.allowOutputRevisionHistory)}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, allowOutputRevisionHistory: event.target.checked }))
                          }
                        />
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
                  <Button type="submit" variant="primary" size="sm" loading={isSaving}>
                    {isEditMode ? 'Save Changes' : 'Create Framework Package'}
                  </Button>
                </div>
              </Card.Body>
            </form>
          </Card>
        ) : null}
      </Fieldset>
    </section>
  )
}

export default SuperAdminFrameworkPackageEditor
