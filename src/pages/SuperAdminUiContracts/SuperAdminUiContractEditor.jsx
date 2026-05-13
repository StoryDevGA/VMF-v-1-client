import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { Fieldset } from '../../components/Fieldset'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { TabView } from '../../components/TabView'
import { Table } from '../../components/Table'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import { useToaster } from '../../components/Toaster'
import {
  useCreateUiContractMutation,
  useCloneUiContractMutation,
  useGetUiContractQuery,
  useListFrameworkPackagesQuery,
  useListWorkflowPoliciesQuery,
  useUpdateUiContractMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import { getRuntimeControlFieldErrorMap } from '../../utils/runtimeControlFormErrors.js'
import {
  FRAMEWORK_PACKAGE_LIFECYCLE_STAGE_OPTIONS,
  FRAMEWORK_PACKAGE_STATUSES,
} from '../SuperAdminFrameworkPackages/superAdminFrameworkPackages.constants.js'
import {
  WORKFLOW_POLICY_GOVERNED_ACTION_OPTIONS,
} from '../SuperAdminWorkflowPolicies/superAdminWorkflowPolicies.constants.js'
import {
  INITIAL_UI_CONTRACT_FORM,
  UI_CONTRACT_COMPATIBILITY_MODE_OPTIONS,
  UI_CONTRACT_FORM_ERROR_FIELDS,
  UI_CONTRACT_SECTION_MAPPING_STATUSES,
  UI_CONTRACT_SECTION_SOURCES,
  UI_CONTRACT_FORM_STATUS_OPTIONS,
  UI_CONTRACT_STATUSES,
  buildDefaultSectionPresentation,
  buildSectionLabelFromKey,
  isCustomSectionPresentation,
  mapUIContractToForm,
  normalizeActionRows,
  normalizeLifecycleStageRows,
  normalizeSectionPresentationRows,
  parseUIContractList,
  validateUIContractForm,
} from './superAdminUiContracts.constants.js'
import {
  LOCKED_RUNTIME_CONTROL_EDIT_MESSAGE,
  formatRuntimeControlVersionStatus,
} from '../SuperAdminRuntimePathRegistry/superAdminRuntimePathRegistry.constants.js'
import './SuperAdminUiContracts.css'

const EMPTY_SECTION_DRAFT = Object.freeze({
  sectionKey: '',
  runtimePath: '',
  sourcePackageKey: '',
  source: UI_CONTRACT_SECTION_SOURCES.CUSTOM,
  isCustom: true,
  label: '',
  shortLabel: '',
  helpText: '',
  placeholder: '',
  displayOrder: 10,
  isVisible: true,
  isEditable: true,
  isRequiredDisplay: false,
  isReadOnlyDisplay: false,
  isCollapsedByDefault: false,
  sectionGroup: '',
  iconKey: '',
  presentationKey: 'standard-section',
})

const EMPTY_LIFECYCLE_DRAFT = Object.freeze({
  stageKey: 'DRAFT',
  label: 'Draft',
  description: '',
  badgeLabel: 'Draft',
  displayOrder: 10,
  isVisible: true,
  badgePresentationKey: 'neutral',
})

const EMPTY_ACTION_DRAFT = Object.freeze({
  actionKey: '',
  governedAction: '',
  buttonLabel: '',
  confirmationTitle: '',
  confirmationMessage: '',
  successMessage: '',
  failureMessage: '',
  loadingMessage: '',
  displayOrder: 10,
  isVisible: true,
  requiresConfirmation: false,
  presentationKey: 'primary-action',
})

const countErrorsForFields = (errors, fields) => fields.filter((field) => errors[field]).length

const renderTabLabel = (label, count = 0) => (
  <span className="super-admin-ui-contracts__tab-label">
    <span>{label}</span>
    {count > 0 ? <span className="super-admin-ui-contracts__tab-error">({count})</span> : null}
  </span>
)

const normalizePackageKey = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const getPackageKey = (pkg = {}) => {
  const explicitPackageKey = normalizePackageKey(pkg.packageKey)
  if (explicitPackageKey) return explicitPackageKey

  const frameworkKey = String(pkg.frameworkKey || '').trim()
  const version = String(pkg.version || '').trim()
  return frameworkKey && version ? normalizePackageKey(`${frameworkKey}-${version}`) : ''
}
const getPackageLabel = (pkg = {}) => {
  const name = String(pkg.packageName || pkg.frameworkName || getPackageKey(pkg)).trim()
  const version = String(pkg.version || '').trim()
  const frameworkKey = String(pkg.frameworkKey || '').trim()
  return [name, frameworkKey || null, version ? `v${version}` : null].filter(Boolean).join(' - ')
}

const getNextDisplayOrder = (rows = []) => {
  const maxOrder = rows.reduce((max, row) => Math.max(max, Number(row?.displayOrder) || 0), 0)
  return maxOrder + 10
}

const toBooleanLabel = (value) => value ? 'Yes' : 'No'

const makeSectionStatus = (section, packageSection) => {
  if (isCustomSectionPresentation(section)) return UI_CONTRACT_SECTION_MAPPING_STATUSES.CUSTOM
  if (!packageSection) return UI_CONTRACT_SECTION_MAPPING_STATUSES.ORPHANED
  if (String(section?.runtimePath || '').trim() !== String(packageSection?.runtimePath || '').trim()) {
    return UI_CONTRACT_SECTION_MAPPING_STATUSES.ORPHANED
  }
  return UI_CONTRACT_SECTION_MAPPING_STATUSES.MAPPED
}

const getMappingStatusVariant = (status) => {
  if (status === UI_CONTRACT_SECTION_MAPPING_STATUSES.MAPPED) return 'success'
  if (status === UI_CONTRACT_SECTION_MAPPING_STATUSES.MISSING) return 'warning'
  if (status === UI_CONTRACT_SECTION_MAPPING_STATUSES.ORPHANED) return 'danger'
  if (status === UI_CONTRACT_SECTION_MAPPING_STATUSES.CUSTOM) return 'info'
  return 'neutral'
}

function UiContractEditorField({ id, label, required = false, fullWidth = false, children }) {
  const classes = [
    'super-admin-ui-contracts__field',
    fullWidth && 'super-admin-ui-contracts__field--full',
  ].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      <label className="super-admin-ui-contracts__field-label" htmlFor={id}>
        {label}
        {required ? <span className="input-label__required"> *</span> : null}
      </label>
      {children}
    </div>
  )
}

function ReadOnlyValue({ label, value }) {
  return (
    <div className="super-admin-ui-contracts__readonly">
      <span className="super-admin-ui-contracts__readonly-label">{label}</span>
      <code className="super-admin-ui-contracts__key">{value || '--'}</code>
    </div>
  )
}

const mapUIContractToCloneForm = (contract = {}) => ({
  ...mapUIContractToForm(contract),
  uiContractKey: '',
  name: contract.name ? `${contract.name} Clone` : '',
  status: UI_CONTRACT_STATUSES.DRAFT,
  isSystem: false,
  isProtected: false,
  isLocked: false,
  componentVersion: (Number(contract.componentVersion) || 1) + 1,
  versionStatus: 'DRAFT',
  lockedAt: null,
  lockedBy: null,
  lockedReason: '',
  lockedByPackageKeys: [],
  clonedFromStableId: contract.id ?? null,
  supersedesStableId: contract.id ?? null,
  supersededByStableId: null,
})

function SuperAdminUiContractEditor() {
  const navigate = useNavigate()
  const { uiContractId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const cloneFromId = String(searchParams.get('cloneFrom') || '').trim()
  const { addToast } = useToaster()
  const isEditMode = Boolean(uiContractId)
  const isCloneMode = !isEditMode && Boolean(cloneFromId)
  const [form, setForm] = useState({ ...INITIAL_UI_CONTRACT_FORM })
  const [errors, setErrors] = useState({})
  const [activeTab, setActiveTab] = useState(0)
  const [sectionDialog, setSectionDialog] = useState({ open: false, index: -1, draft: { ...EMPTY_SECTION_DRAFT } })
  const [lifecycleDialog, setLifecycleDialog] = useState({ open: false, index: -1, draft: { ...EMPTY_LIFECYCLE_DRAFT } })
  const [actionDialog, setActionDialog] = useState({ open: false, index: -1, draft: { ...EMPTY_ACTION_DRAFT } })

  const sourceContractId = isEditMode ? uiContractId : cloneFromId
  const { data, isLoading, error } = useGetUiContractQuery(sourceContractId, { skip: !sourceContractId })
  const { data: packagesData, isLoading: isLoadingPackages } = useListFrameworkPackagesQuery({
    page: 1,
    pageSize: 100,
  })
  const { data: policiesData } = useListWorkflowPoliciesQuery({
    page: 1,
    pageSize: 100,
  })
  const [createUiContract, { isLoading: isCreating }] = useCreateUiContractMutation()
  const [cloneUiContract, { isLoading: isCloning }] = useCloneUiContractMutation()
  const [updateUiContract, { isLoading: isUpdating }] = useUpdateUiContractMutation()
  const isSaving = isCreating || isUpdating || isCloning
  const loaded = data?.data ?? null
  const isReadOnly = isEditMode && Boolean(loaded?.isLocked || loaded?.isProtected)
  const isFormDisabled = isSaving || isReadOnly
  const packageRows = useMemo(() => packagesData?.data ?? [], [packagesData?.data])

  useEffect(() => {
    if (!loaded) return
    if (!isEditMode && !isCloneMode) return
    const nextForm = isCloneMode
      ? mapUIContractToCloneForm(loaded)
      : mapUIContractToForm(loaded)
    const timeoutId = window.setTimeout(() => setForm(nextForm), 0)
    return () => window.clearTimeout(timeoutId)
  }, [isCloneMode, isEditMode, loaded])

  const selectedFrameworkKeys = useMemo(
    () => parseUIContractList(form.frameworkKeys, { upper: true }),
    [form.frameworkKeys],
  )

  const sourcePackageSelectValue = useMemo(() => {
    const explicitPackageKey = String(form.sourcePackageKey || '').trim().toLowerCase()
    if (explicitPackageKey) return explicitPackageKey

    const sourcePackageVersion = String(form.sourcePackageVersion || '').trim()
    const sourceFrameworkKey = String(form.sourceFrameworkKey || '').trim().toUpperCase()
    if (!sourcePackageVersion && !sourceFrameworkKey) return ''

    const sectionPackageKeys = [
      ...new Set(
        normalizeSectionPresentationRows(form.sections)
          .map((section) => section.sourcePackageKey)
          .filter(Boolean),
      ),
    ]
    if (sectionPackageKeys.length === 1) return sectionPackageKeys[0]

    const packageMatches = packageRows.filter((pkg) => {
      const packageVersion = String(pkg.version || '').trim()
      const packageFrameworkKey = String(pkg.frameworkKey || '').trim().toUpperCase()
      const versionMatches = !sourcePackageVersion || packageVersion === sourcePackageVersion
      const frameworkMatches = !sourceFrameworkKey || packageFrameworkKey === sourceFrameworkKey
      return getPackageKey(pkg) && versionMatches && frameworkMatches
    })

    if (packageMatches.length > 0) return getPackageKey(packageMatches[0])
    if (sourceFrameworkKey && sourcePackageVersion) return normalizePackageKey(`${sourceFrameworkKey}-${sourcePackageVersion}`)
    return ''
  }, [form.sections, form.sourceFrameworkKey, form.sourcePackageKey, form.sourcePackageVersion, packageRows])

  useEffect(() => {
    if (!sourcePackageSelectValue || form.sourcePackageKey) return
    const sourcePackage = packageRows.find((pkg) => getPackageKey(pkg) === sourcePackageSelectValue)
    const timeoutId = window.setTimeout(() => setForm((current) => {
      if (current.sourcePackageKey) return current
      return {
        ...current,
        sourcePackageKey: sourcePackageSelectValue,
        sourcePackageVersion: current.sourcePackageVersion || sourcePackage?.version || '',
        sourceFrameworkKey: current.sourceFrameworkKey || sourcePackage?.frameworkKey || '',
        introducedInVersion: current.introducedInVersion || sourcePackage?.version || '',
      }
    }), 0)
    return () => window.clearTimeout(timeoutId)
  }, [form.sourcePackageKey, packageRows, sourcePackageSelectValue])

  const packageOptions = useMemo(() => {
    const selectedPackageKey = sourcePackageSelectValue
    const selectedSourcePackage = packageRows.find((pkg) => getPackageKey(pkg) === selectedPackageKey)
    const currentSourcePackage = selectedPackageKey && !selectedSourcePackage
      ? {
        packageKey: selectedPackageKey,
        packageName: selectedPackageKey,
        frameworkKey: form.sourceFrameworkKey,
        version: form.sourcePackageVersion,
      }
      : null
    const rows = packageRows.filter((pkg) => {
      const packageKey = getPackageKey(pkg)
      if (!packageKey) return false
      const packageStatus = String(pkg.status || '').trim().toUpperCase()
      const frameworkKey = String(pkg.frameworkKey || '').trim().toUpperCase()
      const allowedStatus =
        packageStatus === FRAMEWORK_PACKAGE_STATUSES.ACTIVE
        || packageStatus === FRAMEWORK_PACKAGE_STATUSES.VALIDATED
        || packageStatus === FRAMEWORK_PACKAGE_STATUSES.DRAFT
      const frameworkCompatible = selectedFrameworkKeys.length === 0 || selectedFrameworkKeys.includes(frameworkKey)
      return packageKey === selectedPackageKey || (allowedStatus && frameworkCompatible)
    })

    const optionRows = currentSourcePackage
      ? [currentSourcePackage, ...rows]
      : rows
    const optionByKey = new Map()
    optionRows.forEach((pkg) => {
      const packageKey = getPackageKey(pkg)
      if (packageKey && !optionByKey.has(packageKey)) optionByKey.set(packageKey, pkg)
    })

    return [
      { value: '', label: isLoadingPackages ? 'Loading packages...' : 'Select package source' },
      ...[...optionByKey.values()].map((pkg) => ({ value: getPackageKey(pkg), label: getPackageLabel(pkg) })),
    ]
  }, [form.sourceFrameworkKey, form.sourcePackageVersion, isLoadingPackages, packageRows, selectedFrameworkKeys, sourcePackageSelectValue])

  const selectedPackage = useMemo(
    () => packageRows.find((pkg) => getPackageKey(pkg) === sourcePackageSelectValue) ?? null,
    [packageRows, sourcePackageSelectValue],
  )

  const packageSectionByKey = useMemo(() => {
    const map = new Map()
    ;(selectedPackage?.sections ?? []).forEach((section) => {
      const sectionKey = String(section?.sectionKey || '').trim()
      if (sectionKey) map.set(sectionKey, section)
    })
    return map
  }, [selectedPackage])

  const sectionRows = useMemo(() => {
    const formSections = normalizeSectionPresentationRows(form.sections)
    const rows = formSections.map((section, index) => {
      const packageSection = packageSectionByKey.get(section.sectionKey)
      return {
        ...section,
        id: `section-${section.sectionKey || index}`,
        rowIndex: index,
        mappingStatus: makeSectionStatus(section, packageSection),
        required: packageSection?.required ?? section.isRequiredDisplay,
        packageRuntimePath: packageSection?.runtimePath ?? section.runtimePath,
      }
    })

    ;(selectedPackage?.sections ?? []).forEach((packageSection) => {
      const sectionKey = String(packageSection?.sectionKey || '').trim()
      if (!sectionKey || formSections.some((section) => !isCustomSectionPresentation(section) && section.sectionKey === sectionKey)) return
      rows.push({
        ...buildDefaultSectionPresentation({
          sectionKey,
          runtimePath: packageSection.runtimePath,
          sourcePackageKey: getPackageKey(selectedPackage),
          required: packageSection.required,
          displayOrder: getNextDisplayOrder(rows),
        }),
        id: `missing-section-${sectionKey}`,
        rowIndex: -1,
        mappingStatus: UI_CONTRACT_SECTION_MAPPING_STATUSES.MISSING,
        required: Boolean(packageSection.required),
        packageRuntimePath: packageSection.runtimePath,
      })
    })

    return rows
  }, [form.sections, packageSectionByKey, selectedPackage])

  const lifecycleRows = useMemo(() => normalizeLifecycleStageRows(form.lifecycleStages), [form.lifecycleStages])
  const actionRows = useMemo(() => normalizeActionRows(form.actions), [form.actions])

  const governedActionOptions = useMemo(() => {
    const actions = new Set()
    const policyRows = policiesData?.data ?? []
    const activePolicies = policyRows.filter((policy) => policy?.status === 'ACTIVE')

    WORKFLOW_POLICY_GOVERNED_ACTION_OPTIONS.forEach((option) => {
      const governedAction = String(option?.value || '').trim()
      if (governedAction) actions.add(governedAction)
    })

    // Add governedAction from active policies (not policy keys!)
    activePolicies.forEach((policy) => {
      const governedAction = String(policy?.governedAction || '').trim()
      if (governedAction) actions.add(governedAction)
    })

    // Add actions from existing action rows
    actionRows.forEach((action) => {
      if (action.governedAction) actions.add(action.governedAction)
      if (action.actionKey) actions.add(action.actionKey)
    })
    return [
      { value: '', label: 'Select governed action' },
      ...[...actions].sort().map((value) => ({ value, label: value })),
    ]
  }, [actionRows, policiesData?.data])

  const jsonPreview = useMemo(() => {
    const formForValidation = sourcePackageSelectValue && !form.sourcePackageKey
      ? { ...form, sourcePackageKey: sourcePackageSelectValue }
      : form
    const { payload } = validateUIContractForm(formForValidation, {
      isEditMode: isEditMode && !isCloneMode,
      sourcePackage: selectedPackage,
    })
    return JSON.stringify(payload, null, 2)
  }, [form, isCloneMode, isEditMode, selectedPackage, sourcePackageSelectValue])

  const navigateToUiContracts = (options) => navigate('/super-admin/runtime-control/ui-contracts', options)
  const handleBack = () => navigateToUiContracts()
  const handleCloneCurrent = () => {
    if (!loaded?.id) return
    navigate(`/super-admin/runtime-control/ui-contracts/new?cloneFrom=${encodeURIComponent(loaded.id)}`)
  }

  const handleSourcePackageChange = (packageKey) => {
    const pkg = packageRows.find((row) => getPackageKey(row) === packageKey)
    setForm((current) => ({
      ...current,
      sourcePackageKey: packageKey,
      sourcePackageVersion: pkg?.version ?? '',
      sourceFrameworkKey: pkg?.frameworkKey ?? '',
      introducedInVersion: current.introducedInVersion || pkg?.version || '',
    }))
  }

  const syncSectionsFromPackage = () => {
    if (!selectedPackage) {
      setErrors((current) => ({
        ...current,
        sourcePackageKey: 'Select a source package before syncing sections.',
      }))
      return
    }

    const packageSectionByCurrentKey = new Map(
      (selectedPackage.sections ?? [])
        .map((packageSection) => [String(packageSection?.sectionKey || '').trim(), packageSection])
        .filter(([sectionKey]) => Boolean(sectionKey)),
    )
    const runtimePathConflicts = normalizeSectionPresentationRows(form.sections)
      .filter((section) => !isCustomSectionPresentation(section))
      .filter((section) => {
        const packageSection = packageSectionByCurrentKey.get(section.sectionKey)
        if (!packageSection) return false
        const existingRuntimePath = String(section.runtimePath || '').trim()
        const packageRuntimePath = String(packageSection.runtimePath || '').trim()
        return existingRuntimePath && packageRuntimePath && existingRuntimePath !== packageRuntimePath
      })
      .map((section) => section.sectionKey)

    setForm((current) => {
      const sourcePackageKey = getPackageKey(selectedPackage)
      const existingSections = normalizeSectionPresentationRows(current.sections)
      const existingByKey = new Map(
        existingSections
          .filter((section) => !isCustomSectionPresentation(section))
          .map((section) => [section.sectionKey, section]),
      )
      let nextDisplayOrder = getNextDisplayOrder(existingSections) - 10
      const syncedSections = (selectedPackage.sections ?? []).map((packageSection) => {
        const sectionKey = String(packageSection?.sectionKey || '').trim()
        const existing = existingByKey.get(sectionKey)
        if (existing) {
          const packageRuntimePath = String(packageSection.runtimePath || '').trim()
          const existingRuntimePath = String(existing.runtimePath || '').trim()
          return {
            ...existing,
            runtimePath: existingRuntimePath || packageRuntimePath,
            sourcePackageKey,
            source: UI_CONTRACT_SECTION_SOURCES.PACKAGE,
            isCustom: false,
            isRequiredDisplay: existing.isRequiredDisplay || Boolean(packageSection.required),
          }
        }
        nextDisplayOrder += 10
        return buildDefaultSectionPresentation({
          sectionKey,
          runtimePath: packageSection.runtimePath,
          sourcePackageKey,
          required: packageSection.required,
          displayOrder: nextDisplayOrder,
        })
      })

      const syncedKeys = new Set(syncedSections.map((section) => section.sectionKey))
      const orphanedSections = existingSections.filter((section) =>
        isCustomSectionPresentation(section) || !syncedKeys.has(section.sectionKey))

      return {
        ...current,
        sourcePackageKey,
        sourcePackageVersion: selectedPackage.version ?? '',
        sourceFrameworkKey: selectedPackage.frameworkKey ?? '',
        introducedInVersion: current.introducedInVersion || selectedPackage.version || '',
        sections: [...syncedSections, ...orphanedSections],
      }
    })
    setErrors((current) => ({
      ...current,
      sourcePackageKey: undefined,
      sections: runtimePathConflicts.length > 0
        ? `Runtime path conflicts detected for package sections: ${runtimePathConflicts.join(', ')}.`
        : undefined,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isReadOnly) {
      addToast({
        variant: 'warning',
        title: 'Clone required',
        description: LOCKED_RUNTIME_CONTROL_EDIT_MESSAGE,
      })
      return
    }

    setErrors({})
    const formForValidation = sourcePackageSelectValue && !form.sourcePackageKey
      ? { ...form, sourcePackageKey: sourcePackageSelectValue }
      : form
    const { errors: nextErrors, payload } = validateUIContractForm(formForValidation, {
      isEditMode: isEditMode && !isCloneMode,
      sourcePackage: selectedPackage,
    })
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    try {
      if (isCloneMode) {
        await cloneUiContract({ uiContractId: cloneFromId, ...payload }).unwrap()
      } else if (isEditMode) {
        await updateUiContract({ uiContractId, ...payload }).unwrap()
      } else {
        await createUiContract(payload).unwrap()
      }
      addToast({
        variant: 'success',
        title: isCloneMode ? 'UI Contract cloned' : isEditMode ? 'UI Contract updated' : 'UI Contract created',
        description: `${payload.uiContractKey || form.uiContractKey} saved.`,
      })
      navigateToUiContracts({ state: { runtimeControlSaved: true } })
    } catch (err) {
      const appError = normalizeError(err)
      const fieldErrors = getRuntimeControlFieldErrorMap(appError, UI_CONTRACT_FORM_ERROR_FIELDS)
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
        return
      }
      addToast({ variant: 'error', title: 'Save failed', description: appError.message })
    }
  }

  const tabCounts = {
    compatibility: countErrorsForFields(errors, [
      'frameworkKeys',
      'introducedInVersion',
      'deprecatedInVersion',
      'compatibilityTags',
      'compatibilityMode',
      'sourcePackageKey',
      'sourcePackageVersion',
      'sourceFrameworkKey',
    ]),
    sections: countErrorsForFields(errors, ['sections']),
    lifecycle: countErrorsForFields(errors, ['lifecycleStages']),
    actions: countErrorsForFields(errors, ['actions']),
  }

  const openSectionDialog = (row = null) => {
    const draft = row
      ? { ...EMPTY_SECTION_DRAFT, ...row }
      : { ...EMPTY_SECTION_DRAFT, displayOrder: getNextDisplayOrder(form.sections) }
    setSectionDialog({ open: true, index: row?.rowIndex ?? -1, draft })
  }

  const saveSectionDraft = () => {
    const draft = normalizeSectionPresentationRows([sectionDialog.draft])[0]
    setForm((current) => {
      const sections = normalizeSectionPresentationRows(current.sections)
      const nextSections = sectionDialog.index >= 0
        ? sections.map((section, index) => index === sectionDialog.index ? draft : section)
        : [...sections, draft]
      return { ...current, sections: nextSections }
    })
    setSectionDialog({ open: false, index: -1, draft: { ...EMPTY_SECTION_DRAFT } })
  }

  const removeSection = (rowIndex) => {
    if (rowIndex < 0) return
    setForm((current) => ({
      ...current,
      sections: normalizeSectionPresentationRows(current.sections).filter((_, index) => index !== rowIndex),
    }))
  }

  const openLifecycleDialog = (row = null, index = -1) => {
    setLifecycleDialog({
      open: true,
      index,
      draft: row ? { ...EMPTY_LIFECYCLE_DRAFT, ...row } : { ...EMPTY_LIFECYCLE_DRAFT, displayOrder: getNextDisplayOrder(form.lifecycleStages) },
    })
  }

  const saveLifecycleDraft = () => {
    const draft = normalizeLifecycleStageRows([lifecycleDialog.draft])[0]
    setForm((current) => {
      const rows = normalizeLifecycleStageRows(current.lifecycleStages)
      const nextRows = lifecycleDialog.index >= 0
        ? rows.map((row, index) => index === lifecycleDialog.index ? draft : row)
        : [...rows, draft]
      return { ...current, lifecycleStages: nextRows }
    })
    setLifecycleDialog({ open: false, index: -1, draft: { ...EMPTY_LIFECYCLE_DRAFT } })
  }

  const removeLifecycleStage = (index) => {
    setForm((current) => ({
      ...current,
      lifecycleStages: normalizeLifecycleStageRows(current.lifecycleStages).filter((_, rowIndex) => rowIndex !== index),
    }))
  }

  const openActionDialog = (row = null, index = -1) => {
    setActionDialog({
      open: true,
      index,
      draft: row ? { ...EMPTY_ACTION_DRAFT, ...row } : { ...EMPTY_ACTION_DRAFT, displayOrder: getNextDisplayOrder(form.actions) },
    })
  }

  const saveActionDraft = () => {
    const draft = normalizeActionRows([actionDialog.draft])[0]
    setForm((current) => {
      const rows = normalizeActionRows(current.actions)
      const nextRows = actionDialog.index >= 0
        ? rows.map((row, index) => index === actionDialog.index ? draft : row)
        : [...rows, draft]
      return { ...current, actions: nextRows }
    })
    setActionDialog({ open: false, index: -1, draft: { ...EMPTY_ACTION_DRAFT } })
  }

  const removeAction = (index) => {
    setForm((current) => ({
      ...current,
      actions: normalizeActionRows(current.actions).filter((_, rowIndex) => rowIndex !== index),
    }))
  }

  const sectionColumns = [
    { key: 'sectionKey', label: 'Section Key', render: (value) => <code className="super-admin-ui-contracts__key">{value}</code> },
    { key: 'packageRuntimePath', label: 'Runtime Path', render: (value) => <code className="super-admin-ui-contracts__key">{value || '--'}</code> },
    { key: 'label', label: 'Label', render: (value) => value || '--' },
    { key: 'isVisible', label: 'Visible', render: (value) => toBooleanLabel(value) },
    { key: 'displayOrder', label: 'Order' },
    {
      key: 'mappingStatus',
      label: 'Status',
      render: (value) => <Badge size="sm" variant={getMappingStatusVariant(value)} pill outline>{value}</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, row) => (
        <div className="super-admin-ui-contracts__row-buttons">
          <Button type="button" size="sm" variant="outline" onClick={() => openSectionDialog(row)}>Edit</Button>
          {row.rowIndex >= 0 ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => removeSection(row.rowIndex)}>Remove</Button>
          ) : null}
        </div>
      ),
    },
  ]

  const lifecycleColumns = [
    { key: 'stageKey', label: 'Stage', render: (value) => <code className="super-admin-ui-contracts__key">{value}</code> },
    { key: 'label', label: 'Label' },
    { key: 'badgeLabel', label: 'Badge' },
    { key: 'displayOrder', label: 'Order' },
    { key: 'isVisible', label: 'Visible', render: (value) => toBooleanLabel(value) },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, row) => {
        const index = lifecycleRows.findIndex((stage) => stage.stageKey === row.stageKey)
        return (
          <div className="super-admin-ui-contracts__row-buttons">
            <Button type="button" size="sm" variant="outline" onClick={() => openLifecycleDialog(row, index)}>Edit</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => removeLifecycleStage(index)}>Remove</Button>
          </div>
        )
      },
    },
  ]

  const actionColumns = [
    { key: 'actionKey', label: 'Action Key', render: (value) => <code className="super-admin-ui-contracts__key">{value}</code> },
    { key: 'governedAction', label: 'Governed Action', render: (value) => <code className="super-admin-ui-contracts__key">{value}</code> },
    { key: 'buttonLabel', label: 'Button Label' },
    { key: 'displayOrder', label: 'Order' },
    { key: 'isVisible', label: 'Visible', render: (value) => toBooleanLabel(value) },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, row) => {
        const index = actionRows.findIndex((action) => action.actionKey === row.actionKey)
        return (
          <div className="super-admin-ui-contracts__row-buttons">
            <Button type="button" size="sm" variant="outline" onClick={() => openActionDialog(row, index)}>Edit</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => removeAction(index)}>Remove</Button>
          </div>
        )
      },
    },
  ]

  if ((isEditMode || isCloneMode) && isLoading) {
    return (
      <section className="super-admin-ui-contracts container">
        <Card variant="elevated" className="super-admin-ui-contracts__card">
          <Card.Body className="super-admin-ui-contracts__state"><Spinner size="lg" /></Card.Body>
        </Card>
      </section>
    )
  }

  if ((isEditMode || isCloneMode) && error) {
    return (
      <section className="super-admin-ui-contracts container">
        <Card variant="elevated" className="super-admin-ui-contracts__card">
          <Card.Body className="super-admin-ui-contracts__body">
            <p className="super-admin-ui-contracts__error" role="alert">{normalizeError(error).message}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => handleBack()}>Back</Button>
          </Card.Body>
        </Card>
      </section>
    )
  }

  return (
    <section className="super-admin-ui-contracts container" aria-label="UI Contract editor">
      <header className="super-admin-ui-contracts__header">
        <h1 className="super-admin-ui-contracts__title">
          {isCloneMode ? 'Clone UI Contract' : isEditMode ? 'UI Contract Editor' : 'Create UI Contract'}
        </h1>
        <p className="super-admin-ui-contracts__subtitle">
          Configure package-synced presentation controls for runtime sections, lifecycle stages, and governed actions.
        </p>
      </header>

      <Fieldset>
        <Fieldset.Legend className="sr-only">UI Contract editor</Fieldset.Legend>
        <Card variant="elevated" className="super-admin-ui-contracts__card">
          <form onSubmit={handleSubmit} noValidate>
            <Card.Body className="super-admin-ui-contracts__body">
              <div className="super-admin-ui-contracts__actions">
                <Button type="button" variant="outline" size="sm" onClick={() => handleBack()}>Back</Button>
                {isEditMode && loaded ? (
                  <Button type="button" variant="primary" size="sm" onClick={handleCloneCurrent}>Clone</Button>
                ) : null}
              </div>

              {isReadOnly ? (
                <Card variant="outlined" className="super-admin-ui-contracts__locked-banner" role="status">
                  <Card.Body className="super-admin-ui-contracts__locked-banner-body">
                    <Badge size="sm" variant="warning" pill outline>
                      Locked
                    </Badge>
                    <p className="super-admin-ui-contracts__locked-copy">
                      {LOCKED_RUNTIME_CONTROL_EDIT_MESSAGE}
                    </p>
                  </Card.Body>
                </Card>
              ) : null}

              {(isEditMode || isCloneMode) && loaded ? (
                <div className="super-admin-ui-contracts__dependency-grid">
                  <ReadOnlyValue label="Version" value={`v${form.componentVersion || 1}`} />
                  <ReadOnlyValue label="Version Status" value={formatRuntimeControlVersionStatus(form.versionStatus)} />
                  <ReadOnlyValue label="Lineage" value={form.lineageId} />
                  <ReadOnlyValue label="Locked By Packages" value={(form.lockedByPackageKeys || []).join(', ')} />
                </div>
              ) : null}

              <fieldset className="super-admin-ui-contracts__edit-fieldset" disabled={isFormDisabled}>
              <section className="super-admin-ui-contracts__basic">
                <h2>Basic Information</h2>
                <div className="super-admin-ui-contracts__filters">
                  <UiContractEditorField id="ui-contract-key" label="UI Contract Key" required={!isEditMode}>
                    <Input
                      id="ui-contract-key"
                      value={form.uiContractKey}
                      onChange={(event) => setForm((current) => ({ ...current, uiContractKey: event.target.value }))}
                      error={errors.uiContractKey}
                      disabled={isEditMode}
                      fullWidth
                    />
                  </UiContractEditorField>
                  <UiContractEditorField id="ui-contract-name" label="Name" required>
                    <Input
                      id="ui-contract-name"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      error={errors.name}
                      fullWidth
                    />
                  </UiContractEditorField>
                  <UiContractEditorField id="ui-contract-status" label="Status" required>
                    <Select
                      id="ui-contract-status"
                      value={form.status}
                      options={UI_CONTRACT_FORM_STATUS_OPTIONS}
                      onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                      error={errors.status}
                    />
                  </UiContractEditorField>
                </div>
                <UiContractEditorField id="ui-contract-description" label="Description" fullWidth>
                  <Textarea
                    id="ui-contract-description"
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    error={errors.description}
                    rows={3}
                    fullWidth
                  />
                </UiContractEditorField>
              </section>

              <div className="super-admin-ui-contracts__toggles">
                <Tickbox id="ui-contract-system" label="System Contract" checked={Boolean(form.isSystem)} onChange={(event) => setForm((current) => ({ ...current, isSystem: event.target.checked }))} />
                <Tickbox id="ui-contract-protected" label="Protected" checked={Boolean(form.isProtected)} onChange={(event) => setForm((current) => ({ ...current, isProtected: event.target.checked }))} />
              </div>

              <TabView activeTab={activeTab} onTabChange={setActiveTab} variant="pills" size="sm" evenTabs>
                <TabView.Tab label={renderTabLabel('Compatibility', tabCounts.compatibility)}>
                  <div className="super-admin-ui-contracts__tab-panel">
                    <UiContractEditorField id="ui-contract-frameworks" label="Framework Keys" required fullWidth>
                      <Textarea
                        id="ui-contract-frameworks"
                        value={form.frameworkKeys}
                        onChange={(event) => setForm((current) => ({ ...current, frameworkKeys: event.target.value }))}
                        error={errors.frameworkKeys}
                        rows={3}
                        fullWidth
                      />
                    </UiContractEditorField>
                    <div className="super-admin-ui-contracts__filters">
                      <UiContractEditorField id="ui-contract-introduced" label="Introduced In Version">
                        <Input
                          id="ui-contract-introduced"
                          value={form.introducedInVersion}
                          onChange={(event) => setForm((current) => ({ ...current, introducedInVersion: event.target.value }))}
                          error={errors.introducedInVersion}
                          fullWidth
                        />
                      </UiContractEditorField>
                      <UiContractEditorField id="ui-contract-deprecated" label="Deprecated In Version">
                        <Input
                          id="ui-contract-deprecated"
                          value={form.deprecatedInVersion}
                          onChange={(event) => setForm((current) => ({ ...current, deprecatedInVersion: event.target.value }))}
                          error={errors.deprecatedInVersion}
                          fullWidth
                        />
                      </UiContractEditorField>
                      <UiContractEditorField id="ui-contract-mode" label="Compatibility Mode">
                        <Select
                          id="ui-contract-mode"
                          value={form.compatibilityMode}
                          options={UI_CONTRACT_COMPATIBILITY_MODE_OPTIONS}
                          onChange={(event) => setForm((current) => ({ ...current, compatibilityMode: event.target.value }))}
                        />
                      </UiContractEditorField>
                    </div>
                    <UiContractEditorField id="ui-contract-tags" label="Compatibility Tags" fullWidth>
                      <Textarea
                        id="ui-contract-tags"
                        value={form.compatibilityTags}
                        onChange={(event) => setForm((current) => ({ ...current, compatibilityTags: event.target.value }))}
                        rows={3}
                        fullWidth
                      />
                    </UiContractEditorField>

                    <section className="super-admin-ui-contracts__subsection">
                      <div>
                        <h3>Package Source</h3>
                        <p className="super-admin-ui-contracts__helper">
                          Select the Framework Package that supplies structural sections for this UI Contract.
                        </p>
                      </div>
                      <div className="super-admin-ui-contracts__filters">
                        <UiContractEditorField id="ui-contract-source-package" label="Source Package">
                          <Select
                            id="ui-contract-source-package"
                            value={sourcePackageSelectValue}
                            options={packageOptions}
                            onChange={(event) => handleSourcePackageChange(event.target.value)}
                            error={errors.sourcePackageKey}
                          />
                        </UiContractEditorField>
                        <UiContractEditorField id="ui-contract-source-version" label="Source Package Version">
                          <Input id="ui-contract-source-version" value={form.sourcePackageVersion} error={errors.sourcePackageVersion} disabled fullWidth />
                        </UiContractEditorField>
                        <UiContractEditorField id="ui-contract-source-framework" label="Source Framework">
                          <Input id="ui-contract-source-framework" value={form.sourceFrameworkKey} error={errors.sourceFrameworkKey} disabled fullWidth />
                        </UiContractEditorField>
                      </div>
                    </section>
                  </div>
                </TabView.Tab>

                <TabView.Tab label={renderTabLabel('Sections', tabCounts.sections)}>
                  <div className="super-admin-ui-contracts__tab-panel">
                    <div className="super-admin-ui-contracts__section-header">
                      <div>
                        <h3>Sections</h3>
                        <p className="super-admin-ui-contracts__helper">
                          Configure how package sections appear to users at runtime. Runtime paths are inherited from the selected package.
                        </p>
                      </div>
                      <div className="super-admin-ui-contracts__row-buttons">
                        <Button type="button" variant="outline" size="sm" onClick={syncSectionsFromPackage}>
                          Sync Sections From Package
                        </Button>
                        <Button type="button" variant="primary" size="sm" onClick={() => openSectionDialog()}>
                          Add Custom Presentation Row
                        </Button>
                      </div>
                    </div>
                    {selectedPackage ? (
                      <p className="super-admin-ui-contracts__table-note">
                        Source Package: {getPackageLabel(selectedPackage)}
                      </p>
                    ) : null}
                    {errors.sections ? <p className="super-admin-ui-contracts__error" role="alert">{errors.sections}</p> : null}
                    <HorizontalScroll className="super-admin-ui-contracts__table-wrap" ariaLabel="UI Contract sections table" gap="sm">
                      <Table
                        className="super-admin-ui-contracts__table super-admin-ui-contracts__table--structured"
                        columns={sectionColumns}
                        data={sectionRows}
                        variant="striped"
                        hoverable
                        emptyMessage="No sections configured."
                        ariaLabel="UI Contract sections"
                      />
                    </HorizontalScroll>
                  </div>
                </TabView.Tab>

                <TabView.Tab label={renderTabLabel('Lifecycle', tabCounts.lifecycle)}>
                  <div className="super-admin-ui-contracts__tab-panel">
                    <div className="super-admin-ui-contracts__section-header">
                      <div>
                        <h3>Lifecycle</h3>
                        <p className="super-admin-ui-contracts__helper">
                          Define user-facing labels, descriptions, and badge presentation for governed lifecycle stages.
                        </p>
                      </div>
                      <Button type="button" variant="primary" size="sm" onClick={() => openLifecycleDialog()}>
                        Add Lifecycle Stage
                      </Button>
                    </div>
                    {errors.lifecycleStages ? <p className="super-admin-ui-contracts__error" role="alert">{errors.lifecycleStages}</p> : null}
                    <HorizontalScroll className="super-admin-ui-contracts__table-wrap" ariaLabel="UI Contract lifecycle table" gap="sm">
                      <Table
                        className="super-admin-ui-contracts__table super-admin-ui-contracts__table--structured"
                        columns={lifecycleColumns}
                        data={lifecycleRows}
                        variant="striped"
                        hoverable
                        emptyMessage="No lifecycle stages configured."
                        ariaLabel="UI Contract lifecycle stages"
                      />
                    </HorizontalScroll>
                  </div>
                </TabView.Tab>

                <TabView.Tab label={renderTabLabel('Actions', tabCounts.actions)}>
                  <div className="super-admin-ui-contracts__tab-panel">
                    <div className="super-admin-ui-contracts__section-header">
                      <div>
                        <h3>Actions</h3>
                        <p className="super-admin-ui-contracts__helper">
                          Define button labels, confirmation copy, success/failure messages, and governed action mappings.
                        </p>
                      </div>
                      <Button type="button" variant="primary" size="sm" onClick={() => openActionDialog()}>
                        Add Action
                      </Button>
                    </div>
                    {errors.actions ? <p className="super-admin-ui-contracts__error" role="alert">{errors.actions}</p> : null}
                    <HorizontalScroll className="super-admin-ui-contracts__table-wrap" ariaLabel="UI Contract actions table" gap="sm">
                      <Table
                        className="super-admin-ui-contracts__table super-admin-ui-contracts__table--structured"
                        columns={actionColumns}
                        data={actionRows}
                        variant="striped"
                        hoverable
                        emptyMessage="No action copy configured."
                        ariaLabel="UI Contract actions"
                      />
                    </HorizontalScroll>
                  </div>
                </TabView.Tab>

                <TabView.Tab label="Dependencies">
                  <div className="super-admin-ui-contracts__tab-panel">
                    <h3>Dependencies</h3>
                    <p className="super-admin-ui-contracts__helper">
                      Read-only coverage summary for the selected source package and current presentation mappings.
                    </p>
                    <div className="super-admin-ui-contracts__dependency-grid">
                      <ReadOnlyValue label="Source Package" value={selectedPackage ? getPackageLabel(selectedPackage) : ''} />
                      <ReadOnlyValue label="Package Sections" value={String(selectedPackage?.sections?.length ?? 0)} />
                      <ReadOnlyValue label="UI Section Rows" value={String(form.sections?.length ?? 0)} />
                      <ReadOnlyValue label="Workflow Bindings" value={String(selectedPackage?.workflowBindings?.length ?? 0)} />
                    </div>
                    {sectionRows.some((row) => row.mappingStatus !== 'Mapped') ? (
                      <p className="super-admin-ui-contracts__table-note">
                        Review section mapping statuses before activation. Orphaned rows are preserved for safe migration.
                      </p>
                    ) : null}
                  </div>
                </TabView.Tab>

                <TabView.Tab label="JSON / Diff">
                  <div className="super-admin-ui-contracts__tab-panel">
                    <h3>JSON / Diff</h3>
                    <p className="super-admin-ui-contracts__helper">
                      Read-only contract preview for debugging and handoff. Use the structured tabs to edit.
                    </p>
                    <pre className="super-admin-ui-contracts__json-preview" aria-label="UI Contract JSON preview">
                      {jsonPreview}
                    </pre>
                  </div>
                </TabView.Tab>
              </TabView>
              </fieldset>

              {Object.keys(errors).filter((key) => errors[key]).length > 0 ? (
                <p className="super-admin-ui-contracts__error" role="alert">Review the highlighted fields and try again.</p>
              ) : null}

              <div className="super-admin-ui-contracts__actions">
                <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => handleBack()}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm" loading={isSaving} disabled={isReadOnly}>
                  {isCloneMode ? 'Save Clone' : isEditMode ? 'Save Changes' : 'Create UI Contract'}
                </Button>
              </div>
            </Card.Body>
          </form>
        </Card>
      </Fieldset>

      <Dialog open={sectionDialog.open} onClose={() => setSectionDialog({ open: false, index: -1, draft: { ...EMPTY_SECTION_DRAFT } })} size="lg">
        <Dialog.Header>
          <h2>{sectionDialog.index >= 0 ? 'Edit Section Presentation' : 'Add Section Presentation'}</h2>
        </Dialog.Header>
        <Dialog.Body className="super-admin-ui-contracts__dialog-body">
          <div className="super-admin-ui-contracts__readonly-grid">
            {sectionDialog.draft.runtimePath ? (
              <ReadOnlyValue label="Section Key" value={sectionDialog.draft.sectionKey} />
            ) : (
              <UiContractEditorField id="section-key" label="Section Key" required>
                <Input
                  id="section-key"
                  value={sectionDialog.draft.sectionKey}
                  onChange={(event) => {
                    const sectionKey = event.target.value
                    setSectionDialog((current) => ({
                      ...current,
                      draft: {
                        ...current.draft,
                        sectionKey,
                        label: current.draft.label || buildSectionLabelFromKey(sectionKey),
                      },
                    }))
                  }}
                  fullWidth
                />
              </UiContractEditorField>
            )}
            <ReadOnlyValue label="Runtime Path" value={sectionDialog.draft.runtimePath} />
            <ReadOnlyValue label="Required" value={toBooleanLabel(sectionDialog.draft.isRequiredDisplay)} />
          </div>
          <div className="super-admin-ui-contracts__filters">
            <UiContractEditorField id="section-label" label="Label" required>
              <Input id="section-label" value={sectionDialog.draft.label} onChange={(event) => setSectionDialog((current) => ({ ...current, draft: { ...current.draft, label: event.target.value } }))} fullWidth />
            </UiContractEditorField>
            <UiContractEditorField id="section-short-label" label="Short Label">
              <Input id="section-short-label" value={sectionDialog.draft.shortLabel} onChange={(event) => setSectionDialog((current) => ({ ...current, draft: { ...current.draft, shortLabel: event.target.value } }))} fullWidth />
            </UiContractEditorField>
            <UiContractEditorField id="section-order" label="Display Order">
              <Input id="section-order" type="number" value={sectionDialog.draft.displayOrder} onChange={(event) => setSectionDialog((current) => ({ ...current, draft: { ...current.draft, displayOrder: event.target.value } }))} fullWidth />
            </UiContractEditorField>
          </div>
          <UiContractEditorField id="section-help" label="Help Text" fullWidth>
            <Textarea id="section-help" value={sectionDialog.draft.helpText} onChange={(event) => setSectionDialog((current) => ({ ...current, draft: { ...current.draft, helpText: event.target.value } }))} rows={3} fullWidth />
          </UiContractEditorField>
          <UiContractEditorField id="section-placeholder" label="Placeholder" fullWidth>
            <Input id="section-placeholder" value={sectionDialog.draft.placeholder} onChange={(event) => setSectionDialog((current) => ({ ...current, draft: { ...current.draft, placeholder: event.target.value } }))} fullWidth />
          </UiContractEditorField>
          <div className="super-admin-ui-contracts__filters">
            <UiContractEditorField id="section-group" label="Section Group">
              <Input id="section-group" value={sectionDialog.draft.sectionGroup} onChange={(event) => setSectionDialog((current) => ({ ...current, draft: { ...current.draft, sectionGroup: event.target.value } }))} fullWidth />
            </UiContractEditorField>
            <UiContractEditorField id="section-icon" label="Icon Key">
              <Input id="section-icon" value={sectionDialog.draft.iconKey} onChange={(event) => setSectionDialog((current) => ({ ...current, draft: { ...current.draft, iconKey: event.target.value } }))} fullWidth />
            </UiContractEditorField>
            <UiContractEditorField id="section-presentation" label="Presentation Key">
              <Input id="section-presentation" value={sectionDialog.draft.presentationKey} onChange={(event) => setSectionDialog((current) => ({ ...current, draft: { ...current.draft, presentationKey: event.target.value } }))} fullWidth />
            </UiContractEditorField>
          </div>
          <div className="super-admin-ui-contracts__toggles">
            <Tickbox id="section-visible" label="Visible" checked={sectionDialog.draft.isVisible} onChange={(event) => setSectionDialog((current) => ({ ...current, draft: { ...current.draft, isVisible: event.target.checked } }))} />
            <Tickbox id="section-readonly" label="Read-only Display" checked={sectionDialog.draft.isReadOnlyDisplay} onChange={(event) => setSectionDialog((current) => ({ ...current, draft: { ...current.draft, isReadOnlyDisplay: event.target.checked } }))} />
            <Tickbox id="section-collapsed" label="Collapsed by Default" checked={sectionDialog.draft.isCollapsedByDefault} onChange={(event) => setSectionDialog((current) => ({ ...current, draft: { ...current.draft, isCollapsedByDefault: event.target.checked } }))} />
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="outline" size="sm" onClick={() => setSectionDialog({ open: false, index: -1, draft: { ...EMPTY_SECTION_DRAFT } })}>Cancel</Button>
          <Button type="button" variant="primary" size="sm" onClick={saveSectionDraft}>Save Section</Button>
        </Dialog.Footer>
      </Dialog>

      <Dialog open={lifecycleDialog.open} onClose={() => setLifecycleDialog({ open: false, index: -1, draft: { ...EMPTY_LIFECYCLE_DRAFT } })} size="md">
        <Dialog.Header><h2>{lifecycleDialog.index >= 0 ? 'Edit Lifecycle Stage' : 'Add Lifecycle Stage'}</h2></Dialog.Header>
        <Dialog.Body className="super-admin-ui-contracts__dialog-body">
          <div className="super-admin-ui-contracts__filters">
            <UiContractEditorField id="stage-key" label="Stage Key" required>
              <Select id="stage-key" value={lifecycleDialog.draft.stageKey} options={FRAMEWORK_PACKAGE_LIFECYCLE_STAGE_OPTIONS} onChange={(event) => setLifecycleDialog((current) => ({ ...current, draft: { ...current.draft, stageKey: event.target.value } }))} />
            </UiContractEditorField>
            <UiContractEditorField id="stage-label" label="Label" required>
              <Input id="stage-label" value={lifecycleDialog.draft.label} onChange={(event) => setLifecycleDialog((current) => ({ ...current, draft: { ...current.draft, label: event.target.value } }))} fullWidth />
            </UiContractEditorField>
            <UiContractEditorField id="stage-order" label="Display Order">
              <Input id="stage-order" type="number" value={lifecycleDialog.draft.displayOrder} onChange={(event) => setLifecycleDialog((current) => ({ ...current, draft: { ...current.draft, displayOrder: event.target.value } }))} fullWidth />
            </UiContractEditorField>
          </div>
          <UiContractEditorField id="stage-description" label="Description" fullWidth>
            <Textarea id="stage-description" value={lifecycleDialog.draft.description} onChange={(event) => setLifecycleDialog((current) => ({ ...current, draft: { ...current.draft, description: event.target.value } }))} rows={3} fullWidth />
          </UiContractEditorField>
          <div className="super-admin-ui-contracts__filters">
            <UiContractEditorField id="stage-badge" label="Badge Label">
              <Input id="stage-badge" value={lifecycleDialog.draft.badgeLabel} onChange={(event) => setLifecycleDialog((current) => ({ ...current, draft: { ...current.draft, badgeLabel: event.target.value } }))} fullWidth />
            </UiContractEditorField>
            <UiContractEditorField id="stage-badge-presentation" label="Badge Presentation Key">
              <Input id="stage-badge-presentation" value={lifecycleDialog.draft.badgePresentationKey} onChange={(event) => setLifecycleDialog((current) => ({ ...current, draft: { ...current.draft, badgePresentationKey: event.target.value } }))} fullWidth />
            </UiContractEditorField>
          </div>
          <Tickbox id="stage-visible" label="Visible" checked={lifecycleDialog.draft.isVisible} onChange={(event) => setLifecycleDialog((current) => ({ ...current, draft: { ...current.draft, isVisible: event.target.checked } }))} />
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="outline" size="sm" onClick={() => setLifecycleDialog({ open: false, index: -1, draft: { ...EMPTY_LIFECYCLE_DRAFT } })}>Cancel</Button>
          <Button type="button" variant="primary" size="sm" onClick={saveLifecycleDraft}>Save Stage</Button>
        </Dialog.Footer>
      </Dialog>

      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, index: -1, draft: { ...EMPTY_ACTION_DRAFT } })} size="lg">
        <Dialog.Header><h2>{actionDialog.index >= 0 ? 'Edit Action' : 'Add Action'}</h2></Dialog.Header>
        <Dialog.Body className="super-admin-ui-contracts__dialog-body">
          <div className="super-admin-ui-contracts__filters">
            <UiContractEditorField id="action-key" label="Action Key" required>
              <Input id="action-key" value={actionDialog.draft.actionKey} onChange={(event) => setActionDialog((current) => ({ ...current, draft: { ...current.draft, actionKey: event.target.value, governedAction: current.draft.governedAction || event.target.value } }))} fullWidth />
            </UiContractEditorField>
            <UiContractEditorField id="governed-action" label="Governed Action" required>
              <Select id="governed-action" value={actionDialog.draft.governedAction} options={governedActionOptions} onChange={(event) => setActionDialog((current) => ({ ...current, draft: { ...current.draft, governedAction: event.target.value } }))} />
            </UiContractEditorField>
            <UiContractEditorField id="action-order" label="Display Order">
              <Input id="action-order" type="number" value={actionDialog.draft.displayOrder} onChange={(event) => setActionDialog((current) => ({ ...current, draft: { ...current.draft, displayOrder: event.target.value } }))} fullWidth />
            </UiContractEditorField>
          </div>
          <UiContractEditorField id="button-label" label="Button Label" required fullWidth>
            <Input id="button-label" value={actionDialog.draft.buttonLabel} onChange={(event) => setActionDialog((current) => ({ ...current, draft: { ...current.draft, buttonLabel: event.target.value } }))} fullWidth />
          </UiContractEditorField>
          <div className="super-admin-ui-contracts__filters">
            <UiContractEditorField id="confirmation-title" label="Confirmation Title">
              <Input id="confirmation-title" value={actionDialog.draft.confirmationTitle} onChange={(event) => setActionDialog((current) => ({ ...current, draft: { ...current.draft, confirmationTitle: event.target.value } }))} fullWidth />
            </UiContractEditorField>
            <UiContractEditorField id="presentation-key" label="Presentation Key">
              <Input id="presentation-key" value={actionDialog.draft.presentationKey} onChange={(event) => setActionDialog((current) => ({ ...current, draft: { ...current.draft, presentationKey: event.target.value } }))} fullWidth />
            </UiContractEditorField>
          </div>
          <UiContractEditorField id="confirmation-message" label="Confirmation Message" fullWidth>
            <Textarea id="confirmation-message" value={actionDialog.draft.confirmationMessage} onChange={(event) => setActionDialog((current) => ({ ...current, draft: { ...current.draft, confirmationMessage: event.target.value } }))} rows={3} fullWidth />
          </UiContractEditorField>
          <div className="super-admin-ui-contracts__filters">
            <UiContractEditorField id="success-message" label="Success Message">
              <Input id="success-message" value={actionDialog.draft.successMessage} onChange={(event) => setActionDialog((current) => ({ ...current, draft: { ...current.draft, successMessage: event.target.value } }))} fullWidth />
            </UiContractEditorField>
            <UiContractEditorField id="failure-message" label="Failure Message">
              <Input id="failure-message" value={actionDialog.draft.failureMessage} onChange={(event) => setActionDialog((current) => ({ ...current, draft: { ...current.draft, failureMessage: event.target.value } }))} fullWidth />
            </UiContractEditorField>
            <UiContractEditorField id="loading-message" label="Loading Message">
              <Input id="loading-message" value={actionDialog.draft.loadingMessage} onChange={(event) => setActionDialog((current) => ({ ...current, draft: { ...current.draft, loadingMessage: event.target.value } }))} fullWidth />
            </UiContractEditorField>
          </div>
          <div className="super-admin-ui-contracts__toggles">
            <Tickbox id="action-visible" label="Visible" checked={actionDialog.draft.isVisible} onChange={(event) => setActionDialog((current) => ({ ...current, draft: { ...current.draft, isVisible: event.target.checked } }))} />
            <Tickbox id="action-confirm" label="Requires Confirmation" checked={actionDialog.draft.requiresConfirmation} onChange={(event) => setActionDialog((current) => ({ ...current, draft: { ...current.draft, requiresConfirmation: event.target.checked } }))} />
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="outline" size="sm" onClick={() => setActionDialog({ open: false, index: -1, draft: { ...EMPTY_ACTION_DRAFT } })}>Cancel</Button>
          <Button type="button" variant="primary" size="sm" onClick={saveActionDraft}>Save Action</Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default SuperAdminUiContractEditor
