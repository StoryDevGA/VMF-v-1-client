import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { TabView } from '../../components/TabView'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import { useToaster } from '../../components/Toaster'
import {
  useCreateUiContractMutation,
  useGetUiContractQuery,
  useUpdateUiContractMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import { getRuntimeControlFieldErrorMap } from '../../utils/runtimeControlFormErrors.js'
import {
  INITIAL_UI_CONTRACT_FORM,
  UI_CONTRACT_COMPATIBILITY_MODE_OPTIONS,
  UI_CONTRACT_FORM_ERROR_FIELDS,
  UI_CONTRACT_FORM_STATUS_OPTIONS,
  mapUIContractToForm,
  validateUIContractForm,
} from './superAdminUiContracts.constants.js'
import './SuperAdminUiContracts.css'

const countErrorsForFields = (errors, fields) => fields.filter((field) => errors[field]).length

const renderTabLabel = (label, count = 0) => (
  <span className="super-admin-ui-contracts__tab-label">
    <span>{label}</span>
    {count > 0 ? <span className="super-admin-ui-contracts__tab-error">({count})</span> : null}
  </span>
)

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

function SuperAdminUiContractEditor() {
  const navigate = useNavigate()
  const { uiContractId = '' } = useParams()
  const { addToast } = useToaster()
  const isEditMode = Boolean(uiContractId)
  const [form, setForm] = useState({ ...INITIAL_UI_CONTRACT_FORM })
  const [errors, setErrors] = useState({})
  const [activeTab, setActiveTab] = useState(0)

  const { data, isLoading, error } = useGetUiContractQuery(uiContractId, { skip: !isEditMode })
  const [createUiContract, { isLoading: isCreating }] = useCreateUiContractMutation()
  const [updateUiContract, { isLoading: isUpdating }] = useUpdateUiContractMutation()
  const isSaving = isCreating || isUpdating
  const loaded = data?.data ?? null

  useEffect(() => {
    if (!isEditMode || !loaded) return
    const timeoutId = window.setTimeout(() => setForm(mapUIContractToForm(loaded)), 0)
    return () => window.clearTimeout(timeoutId)
  }, [isEditMode, loaded])

  const handleBack = () => navigate('/super-admin/runtime-control/ui-contracts')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrors({})
    const { errors: nextErrors, payload } = validateUIContractForm(form, { isEditMode })
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    try {
      if (isEditMode) {
        await updateUiContract({ uiContractId, ...payload }).unwrap()
      } else {
        await createUiContract(payload).unwrap()
      }
      addToast({
        variant: 'success',
        title: isEditMode ? 'UI Contract updated' : 'UI Contract created',
        description: `${payload.uiContractKey} saved.`,
      })
      handleBack()
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
    compatibility: countErrorsForFields(errors, ['frameworkKeys', 'introducedInVersion', 'deprecatedInVersion', 'compatibilityTags', 'compatibilityMode']),
    sections: countErrorsForFields(errors, ['sections']),
    lifecycle: countErrorsForFields(errors, ['lifecycleStages']),
    actions: countErrorsForFields(errors, ['actions']),
  }

  if (isEditMode && isLoading) {
    return (
      <section className="super-admin-ui-contracts container">
        <Card variant="elevated" className="super-admin-ui-contracts__card">
          <Card.Body className="super-admin-ui-contracts__state"><Spinner size="lg" /></Card.Body>
        </Card>
      </section>
    )
  }

  if (isEditMode && error) {
    return (
      <section className="super-admin-ui-contracts container">
        <Card variant="elevated" className="super-admin-ui-contracts__card">
          <Card.Body className="super-admin-ui-contracts__body">
            <p className="super-admin-ui-contracts__error" role="alert">{normalizeError(error).message}</p>
            <Button type="button" variant="outline" size="sm" onClick={handleBack}>Back</Button>
          </Card.Body>
        </Card>
      </section>
    )
  }

  return (
    <section className="super-admin-ui-contracts container" aria-label="UI Contract editor">
      <header className="super-admin-ui-contracts__header">
        <h1 className="super-admin-ui-contracts__title">{isEditMode ? 'UI Contract Editor' : 'Create UI Contract'}</h1>
        <p className="super-admin-ui-contracts__subtitle">
          Define presentation copy for runtime sections, lifecycle stages, and governed actions.
        </p>
      </header>

      <Fieldset>
        <Fieldset.Legend className="sr-only">UI Contract editor</Fieldset.Legend>
        <Card variant="elevated" className="super-admin-ui-contracts__card">
          <form onSubmit={handleSubmit} noValidate>
            <Card.Body className="super-admin-ui-contracts__body">
              <div className="super-admin-ui-contracts__actions">
                <Button type="button" variant="outline" size="sm" onClick={handleBack}>Back</Button>
              </div>

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
                  </div>
                </TabView.Tab>

                <TabView.Tab label={renderTabLabel('Sections', tabCounts.sections)}>
                  <div className="super-admin-ui-contracts__tab-panel">
                    <UiContractEditorField id="ui-contract-sections" label="Sections JSON" fullWidth>
                      <Textarea
                        id="ui-contract-sections"
                        helperText="JSON array of section presentation rows."
                        value={form.sectionsJson}
                        onChange={(event) => setForm((current) => ({ ...current, sectionsJson: event.target.value }))}
                        error={errors.sections}
                        rows={14}
                        fullWidth
                      />
                    </UiContractEditorField>
                  </div>
                </TabView.Tab>

                <TabView.Tab label={renderTabLabel('Lifecycle', tabCounts.lifecycle)}>
                  <div className="super-admin-ui-contracts__tab-panel">
                    <UiContractEditorField id="ui-contract-lifecycle" label="Lifecycle Stages JSON" fullWidth>
                      <Textarea
                        id="ui-contract-lifecycle"
                        helperText="JSON array of lifecycle presentation rows."
                        value={form.lifecycleStagesJson}
                        onChange={(event) => setForm((current) => ({ ...current, lifecycleStagesJson: event.target.value }))}
                        error={errors.lifecycleStages}
                        rows={12}
                        fullWidth
                      />
                    </UiContractEditorField>
                  </div>
                </TabView.Tab>

                <TabView.Tab label={renderTabLabel('Actions', tabCounts.actions)}>
                  <div className="super-admin-ui-contracts__tab-panel">
                    <UiContractEditorField id="ui-contract-actions" label="Actions JSON" fullWidth>
                      <Textarea
                        id="ui-contract-actions"
                        helperText="JSON array of action presentation rows."
                        value={form.actionsJson}
                        onChange={(event) => setForm((current) => ({ ...current, actionsJson: event.target.value }))}
                        error={errors.actions}
                        rows={12}
                        fullWidth
                      />
                    </UiContractEditorField>
                  </div>
                </TabView.Tab>
              </TabView>

              <div className="super-admin-ui-contracts__toggles">
                <Tickbox id="ui-contract-system" label="System Contract" checked={Boolean(form.isSystem)} onChange={(event) => setForm((current) => ({ ...current, isSystem: event.target.checked }))} />
                <Tickbox id="ui-contract-protected" label="Protected" checked={Boolean(form.isProtected)} onChange={(event) => setForm((current) => ({ ...current, isProtected: event.target.checked }))} />
                <Tickbox id="ui-contract-locked" label="Locked" checked={Boolean(form.isLocked)} onChange={(event) => setForm((current) => ({ ...current, isLocked: event.target.checked }))} />
              </div>

              {Object.keys(errors).length > 0 ? (
                <p className="super-admin-ui-contracts__error" role="alert">Review the highlighted fields and try again.</p>
              ) : null}

              <div className="super-admin-ui-contracts__actions">
                <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={handleBack}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm" loading={isSaving}>{isEditMode ? 'Save Changes' : 'Create UI Contract'}</Button>
              </div>
            </Card.Body>
          </form>
        </Card>
      </Fieldset>
    </section>
  )
}

export default SuperAdminUiContractEditor
