import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { TabView } from '../../components/TabView'
import { Textarea } from '../../components/Textarea'
import {
  formatKeyList,
  normalizeAgentKey,
  parseFrameworkKeyList,
  parseKeyList,
  RUNTIME_AGENT_FORM_STATUS_OPTIONS,
  RUNTIME_AGENT_TYPE_OPTIONS,
} from './superAdminAgents.constants.js'
import {
  formatRuntimeSkillStatus,
  getRuntimeSkillStatusVariant,
  RUNTIME_SKILL_STATUSES,
} from '../SuperAdminSkills/superAdminSkills.constants.js'
import './RuntimeAgentDialogs.css'

function RuntimeAgentFrameworkField({ prefix, form, setForm, errors, frameworkOptions = [] }) {
  const [pendingFrameworkKey, setPendingFrameworkKey] = useState('')
  const selectedFrameworkKeys = useMemo(
    () => parseFrameworkKeyList(form.supportedFrameworkKeys),
    [form.supportedFrameworkKeys],
  )
  const frameworkLabelLookup = useMemo(
    () => Object.fromEntries(frameworkOptions.map((option) => [option.value, option.label])),
    [frameworkOptions],
  )
  const availableFrameworkOptions = useMemo(() => {
    const selectedFrameworkKeySet = new Set(selectedFrameworkKeys)

    return frameworkOptions.filter(
      (option) => option.value && !selectedFrameworkKeySet.has(option.value),
    )
  }, [frameworkOptions, selectedFrameworkKeys])

  const handleAddFramework = () => {
    if (!pendingFrameworkKey) return

    setForm((current) => ({
      ...current,
      supportedFrameworkKeys: formatKeyList([...selectedFrameworkKeys, pendingFrameworkKey]),
    }))
    setPendingFrameworkKey('')
  }

  const handleRemoveFramework = (frameworkKey) => {
    setForm((current) => ({
      ...current,
      supportedFrameworkKeys: formatKeyList(
        parseFrameworkKeyList(current.supportedFrameworkKeys).filter((value) => value !== frameworkKey),
      ),
    }))
  }

  return (
    <div className="super-admin-agents__framework-picker">
      <div className="super-admin-agents__framework-picker-controls">
        <Select
          id={`${prefix}-framework-select`}
          label="Add Framework"
          className="super-admin-agent-editor__select-field"
          value={pendingFrameworkKey}
          options={availableFrameworkOptions}
          onChange={(event) => setPendingFrameworkKey(event.target.value)}
          placeholder={availableFrameworkOptions.length > 0 ? 'Select a framework' : 'No frameworks available'}
          disabled={availableFrameworkOptions.length === 0}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="super-admin-agents__framework-add-button"
          onClick={handleAddFramework}
          disabled={!pendingFrameworkKey}
        >
          Add Framework
        </Button>
      </div>

      <p className="super-admin-agents__framework-helper">
        Choose frameworks from the active Framework Registry entries only.
      </p>

      {selectedFrameworkKeys.length > 0 ? (
        <div className="super-admin-agents__framework-list">
          {selectedFrameworkKeys.map((frameworkKey) => (
            <div key={frameworkKey} className="super-admin-agents__framework-item">
              <div className="super-admin-agents__framework-copy">
                <p className="super-admin-agents__framework-label">
                  {frameworkLabelLookup[frameworkKey] ?? frameworkKey}
                </p>
                <p className="super-admin-agents__framework-key">{frameworkKey}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFramework(frameworkKey)}
                aria-label={`Remove ${frameworkKey}`}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="super-admin-agents__framework-helper">No frameworks selected yet.</p>
      )}

      {errors.supportedFrameworkKeys ? (
        <p className="super-admin-agents__framework-error" role="alert">
          {errors.supportedFrameworkKeys}
        </p>
      ) : null}
    </div>
  )
}

function compilePromptPreview(form) {
  const blocks = [
    { label: 'Base System Prompt', value: String(form.promptBaseSystem ?? '').trim() },
    { label: 'Role Prompt', value: String(form.promptRole ?? '').trim() },
    { label: 'Developer Instructions', value: String(form.developerInstructions ?? '').trim() },
    { label: 'Output Contract Prompt', value: String(form.outputContractPrompt ?? '').trim() },
    { label: 'Forbidden Actions Prompt', value: String(form.forbiddenActionsPrompt ?? '').trim() },
    { label: 'Handoff Prompt', value: String(form.handoffPrompt ?? '').trim() },
  ].filter((block) => block.value)

  if (blocks.length === 0) return ''

  return blocks
    .map((block) => `## ${block.label}\n\n${block.value}`)
    .join('\n\n')
}

function RuntimeAgentSection({ title, copy, children, className = '' }) {
  const sectionClassName = ['super-admin-agents__section', className].filter(Boolean).join(' ')

  return (
    <section className={sectionClassName}>
      <div className="super-admin-agents__section-header">
        <h3 className="super-admin-agents__section-title">{title}</h3>
        <p className="super-admin-agents__section-copy">{copy}</p>
      </div>
      {children}
    </section>
  )
}

function RuntimeAgentOverviewSection({ prefix, form, setForm, errors }) {
  return (
    <RuntimeAgentSection
      title="Overview"
      copy="Define identity, lifecycle, and the anchor records that other Runtime Control modules will reference."
      className="super-admin-agents__overview"
    >
      <div className="super-admin-agents__row">
        <Input
          id={`${prefix}-key`}
          label="Agent Key"
          value={form.key}
          onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
          error={errors.key}
          helperText="Stable key used by workflow policies and framework packages."
          fullWidth
        />

        <Input
          id={`${prefix}-name`}
          label="Agent Name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          error={errors.name}
          fullWidth
        />

        <Select
          id={`${prefix}-status`}
          label="Status"
          className="super-admin-agent-editor__select-field"
          value={form.status}
          options={RUNTIME_AGENT_FORM_STATUS_OPTIONS}
          onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
        />

        <Select
          id={`${prefix}-type`}
          label="Agent Type"
          className="super-admin-agent-editor__select-field"
          value={form.agentType}
          options={RUNTIME_AGENT_TYPE_OPTIONS}
          onChange={(event) => setForm((current) => ({ ...current, agentType: event.target.value }))}
          error={errors.agentType}
        />
      </div>

      <Textarea
        id={`${prefix}-description`}
        label="Description"
        value={form.description}
        onChange={(event) =>
          setForm((current) => ({ ...current, description: event.target.value }))
        }
        error={errors.description}
        rows={4}
        fullWidth
      />
    </RuntimeAgentSection>
  )
}

function RuntimeAgentFrameworkCompatibilitySection({
  prefix,
  form,
  setForm,
  errors,
  frameworkOptions,
}) {
  return (
    <RuntimeAgentSection
      title="Framework Compatibility"
      copy="Define where this agent can legally operate."
    >
      <RuntimeAgentFrameworkField
        prefix={prefix}
        form={form}
        setForm={setForm}
        errors={errors}
        frameworkOptions={frameworkOptions}
      />
    </RuntimeAgentSection>
  )
}

function RuntimeAgentSkillCompositionSection({
  prefix,
  form,
  setForm,
  errors,
  availableSkills = [],
  isSkillsLoading = false,
  skillsError = '',
}) {
  const [query, setQuery] = useState('')
  const [pendingSkillId, setPendingSkillId] = useState('')
  const supportedFrameworkKeys = useMemo(
    () => parseFrameworkKeyList(form.supportedFrameworkKeys),
    [form.supportedFrameworkKeys],
  )
  const supportedFrameworkKeySet = useMemo(
    () => new Set(supportedFrameworkKeys),
    [supportedFrameworkKeys],
  )
  const assignedSkillIds = useMemo(
    () =>
      [...new Set([
        ...parseKeyList(form.defaultSkillIds),
        ...parseKeyList(form.primarySkillIds),
        ...parseKeyList(form.optionalSkillIds),
      ])],
    [form.defaultSkillIds, form.primarySkillIds, form.optionalSkillIds],
  )
  const assignedSkillIdSet = useMemo(() => new Set(assignedSkillIds), [assignedSkillIds])

  const skillLookup = useMemo(() => {
    const entries = availableSkills
      .map((skill) => [normalizeAgentKey(skill?.id), skill])
      .filter(([id]) => id)
    return Object.fromEntries(entries)
  }, [availableSkills])

  const normalizedQuery = useMemo(() => String(query ?? '').trim().toLowerCase(), [query])

  const filteredSelectableSkills = useMemo(() => {
    if (supportedFrameworkKeySet.size === 0) return []

    return availableSkills
      .filter((skill) => {
        const normalizedId = normalizeAgentKey(skill?.id)
        if (!normalizedId || assignedSkillIdSet.has(normalizedId)) return false

        const skillFrameworkKeys = Array.isArray(skill?.supportedFrameworkKeys) ? skill.supportedFrameworkKeys : []
        const compatible = skillFrameworkKeys.some((frameworkKey) =>
          supportedFrameworkKeySet.has(String(frameworkKey ?? '').trim().toUpperCase()),
        )
        if (!compatible) return false

        if (!normalizedQuery) return true

        const haystack = [
          skill?.name,
          skill?.key,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase())
          .join(' ')

        return haystack.includes(normalizedQuery)
      })
      .sort((a, b) => {
        const statusA = String(a?.status ?? '').trim().toUpperCase()
        const statusB = String(b?.status ?? '').trim().toUpperCase()
        if (statusA === statusB) return String(a?.name ?? '').localeCompare(String(b?.name ?? ''))
        if (statusA === RUNTIME_SKILL_STATUSES.ACTIVE) return -1
        if (statusB === RUNTIME_SKILL_STATUSES.ACTIVE) return 1
        return statusA.localeCompare(statusB)
      })
  }, [availableSkills, assignedSkillIdSet, normalizedQuery, supportedFrameworkKeySet])

  const compatibleActiveSkillOptions = useMemo(() => {
    const rows = filteredSelectableSkills.filter(
      (skill) => String(skill?.status ?? '').trim().toUpperCase() === RUNTIME_SKILL_STATUSES.ACTIVE,
    )

    return rows.map((skill) => {
      const frameworks = Array.isArray(skill?.supportedFrameworkKeys) ? skill.supportedFrameworkKeys : []
      const frameworkLabel = frameworks.length > 0 ? ` [${frameworks.join(', ')}]` : ''
      return {
        value: skill.id,
        label: `${skill.name} (${skill.key})${frameworkLabel}`,
      }
    })
  }, [filteredSelectableSkills])

  const assignedSkillRows = useMemo(
    () =>
      assignedSkillIds.map((skillId) => {
        const skill = skillLookup[skillId]
        if (skill) return skill
        return {
          id: skillId,
          key: '--',
          name: `Unknown skill (${skillId})`,
          status: 'UNKNOWN',
          supportedFrameworkKeys: [],
        }
      }),
    [assignedSkillIds, skillLookup],
  )

  const handleAddSkill = (skillId) => {
    const normalizedSkillId = normalizeAgentKey(skillId)
    if (!normalizedSkillId) return

    setForm((current) => ({
      ...current,
      defaultSkillIds: formatKeyList([...parseKeyList(current.defaultSkillIds), normalizedSkillId]),
    }))
    setPendingSkillId('')
  }

  const handleRemoveSkill = (skillId) => {
    const normalizedSkillId = normalizeAgentKey(skillId)
    if (!normalizedSkillId) return

    setForm((current) => ({
      ...current,
      defaultSkillIds: formatKeyList(parseKeyList(current.defaultSkillIds).filter((value) => value !== normalizedSkillId)),
      primarySkillIds: formatKeyList(parseKeyList(current.primarySkillIds).filter((value) => value !== normalizedSkillId)),
      optionalSkillIds: formatKeyList(parseKeyList(current.optionalSkillIds).filter((value) => value !== normalizedSkillId)),
      executionPlan: Array.isArray(current.executionPlan)
        ? current.executionPlan.filter((step) => normalizeAgentKey(step?.skillId) !== normalizedSkillId)
        : [],
    }))
  }

  const renderFrameworkTokens = (value) => {
    const items = Array.isArray(value) ? value : []
    if (items.length === 0) return '--'

    return (
      <div className="super-admin-agents__token-list">
        {items.map((item) => (
          <Badge key={item} variant="info" size="sm" pill outline>
            {item}
          </Badge>
        ))}
      </div>
    )
  }

  const renderSkillName = (value) => (
    <span className="super-admin-agents__skill-name">{value}</span>
  )

  const renderSkillKey = (value) => (
    <span className="super-admin-agents__skill-key">{value}</span>
  )

  const assignedColumns = useMemo(
    () => [
      { key: 'name', label: 'Skill Name', mobileLabel: 'Skill Name', render: renderSkillName },
      { key: 'key', label: 'Skill Key', mobileLabel: 'Skill Key', render: renderSkillKey, width: '180px' },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
        width: '136px',
        render: (value) => (
          <Status size="sm" showIcon variant={getRuntimeSkillStatusVariant(value)}>
            {formatRuntimeSkillStatus(value)}
          </Status>
        ),
      },
      { key: 'supportedFrameworkKeys', label: 'Frameworks', mobileLabel: 'Frameworks', render: renderFrameworkTokens },
      {
        key: 'rowActions',
        label: 'Remove',
        mobileLabel: 'Remove',
        align: 'center',
        width: '140px',
        render: (_value, row) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleRemoveSkill(row.id)}
            aria-label={`Remove ${row.name}`}
          >
            Remove
          </Button>
        ),
      },
    ],
    [handleRemoveSkill],
  )

  return (
    <RuntimeAgentSection
      title="Skill Composition"
      copy="Define which skills the agent can use. Skills are governed and must match the selected frameworks."
    >
      <div className="super-admin-agents__skill-composition">
        <div className="super-admin-agents__skill-selector" aria-label="Skill selector">
          <Input
            id={`${prefix}-skill-search`}
            label="Search Skills"
            value={query}
            placeholder="Search by skill name or key"
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            fullWidth
          />

          <div className="super-admin-agents__skill-picker-controls">
            <Select
              id={`${prefix}-skill-select`}
              label="Skill Selector"
              className="super-admin-agent-editor__select-field"
              value={pendingSkillId}
              options={compatibleActiveSkillOptions}
              onChange={(event) => setPendingSkillId(event.target.value)}
              placeholder={
                supportedFrameworkKeySet.size === 0
                  ? 'Select a framework first'
                  : isSkillsLoading
                    ? 'Loading skills...'
                    : compatibleActiveSkillOptions.length > 0
                    ? 'Select a skill'
                    : 'No compatible skills available'
              }
              disabled={
                supportedFrameworkKeySet.size === 0
                || isSkillsLoading
                || compatibleActiveSkillOptions.length === 0
              }
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="super-admin-agents__skill-add-button"
              onClick={() => handleAddSkill(pendingSkillId)}
              disabled={!pendingSkillId}
            >
              Add Skill
            </Button>
          </div>

          {skillsError ? (
            <p className="super-admin-agents__framework-error" role="alert">
              {skillsError}
            </p>
          ) : null}

          <p className="super-admin-agents__framework-helper">
            Only ACTIVE skills that match at least one selected framework are selectable.
          </p>
        </div>

        <div className="super-admin-agents__skill-assigned" aria-label="Assigned skills">
          <p className="super-admin-agents__workflow-title">Assigned Skills</p>
          <div className="super-admin-agents__table-wrap" aria-label="Assigned skills table">
            <Table
              className="super-admin-agents__table"
              columns={assignedColumns}
              data={assignedSkillRows}
              variant="striped"
              hoverable
              emptyMessage="No skills assigned yet."
              ariaLabel="Assigned skills"
            />
          </div>
          {errors.defaultSkillIds ? (
            <p className="super-admin-agents__framework-error" role="alert">
              {errors.defaultSkillIds}
            </p>
          ) : null}
        </div>
      </div>
    </RuntimeAgentSection>
  )
}

function RuntimeAgentExecutionPlanSection({ prefix, form, setForm, errors, availableSkills = [] }) {
  const [pendingStepSkillId, setPendingStepSkillId] = useState('')

  const supportedFrameworkKeys = useMemo(
    () => parseFrameworkKeyList(form.supportedFrameworkKeys),
    [form.supportedFrameworkKeys],
  )
  const supportedFrameworkKeySet = useMemo(
    () => new Set(supportedFrameworkKeys),
    [supportedFrameworkKeys],
  )

  const assignedSkillIds = useMemo(
    () =>
      [...new Set([
        ...parseKeyList(form.defaultSkillIds),
        ...parseKeyList(form.primarySkillIds),
        ...parseKeyList(form.optionalSkillIds),
      ])],
    [form.defaultSkillIds, form.primarySkillIds, form.optionalSkillIds],
  )

  const executionPlan = Array.isArray(form.executionPlan) ? form.executionPlan : []
  const normalizedPlanSkillIds = useMemo(
    () => executionPlan.map((step) => normalizeAgentKey(step?.skillId)).filter(Boolean),
    [executionPlan],
  )
  const planSkillIdSet = useMemo(() => new Set(normalizedPlanSkillIds), [normalizedPlanSkillIds])

  const skillLookup = useMemo(() => {
    const entries = availableSkills
      .map((skill) => [normalizeAgentKey(skill?.id), skill])
      .filter(([id]) => id)
    return Object.fromEntries(entries)
  }, [availableSkills])

  const eligibleAssignedSkillIds = useMemo(() => {
    if (supportedFrameworkKeySet.size === 0) return []

    return assignedSkillIds.filter((skillId) => {
      const skill = skillLookup[skillId]
      if (!skill) return false
      const status = String(skill.status ?? '').trim().toUpperCase()
      if (status !== RUNTIME_SKILL_STATUSES.ACTIVE) return false

      const skillFrameworkKeys = Array.isArray(skill?.supportedFrameworkKeys) ? skill.supportedFrameworkKeys : []
      return skillFrameworkKeys.some((frameworkKey) =>
        supportedFrameworkKeySet.has(String(frameworkKey ?? '').trim().toUpperCase()),
      )
    })
  }, [assignedSkillIds, skillLookup, supportedFrameworkKeySet])

  const addStepOptions = useMemo(() => {
    return eligibleAssignedSkillIds
      .filter((skillId) => !planSkillIdSet.has(skillId))
      .map((skillId) => {
        const skill = skillLookup[skillId]
        const frameworks = Array.isArray(skill?.supportedFrameworkKeys) ? skill.supportedFrameworkKeys : []
        const frameworkLabel = frameworks.length > 0 ? ` [${frameworks.join(', ')}]` : ''
        return {
          value: skillId,
          label: `${skill?.name ?? skillId} (${skill?.key ?? skillId})${frameworkLabel}`,
        }
      })
  }, [eligibleAssignedSkillIds, planSkillIdSet, skillLookup])

  const handleAddStep = () => {
    const normalized = normalizeAgentKey(pendingStepSkillId)
    if (!normalized) return

    setForm((current) => ({
      ...current,
      executionPlan: [
        ...(Array.isArray(current.executionPlan) ? current.executionPlan : []),
        { skillId: normalized, description: '' },
      ],
    }))
    setPendingStepSkillId('')
  }

  const handleRemoveStep = (index) => {
    setForm((current) => ({
      ...current,
      executionPlan: (Array.isArray(current.executionPlan) ? current.executionPlan : []).filter((_step, i) => i !== index),
    }))
  }

  const handleMoveStep = (fromIndex, toIndex) => {
    setForm((current) => {
      const currentPlan = Array.isArray(current.executionPlan) ? [...current.executionPlan] : []
      if (fromIndex < 0 || toIndex < 0) return current
      if (fromIndex >= currentPlan.length || toIndex >= currentPlan.length) return current

      const [removed] = currentPlan.splice(fromIndex, 1)
      currentPlan.splice(toIndex, 0, removed)
      return { ...current, executionPlan: currentPlan }
    })
  }

  const handleUpdateStep = (index, nextStep) => {
    setForm((current) => {
      const currentPlan = Array.isArray(current.executionPlan) ? [...current.executionPlan] : []
      if (index < 0 || index >= currentPlan.length) return current

      currentPlan[index] = nextStep
      return { ...current, executionPlan: currentPlan }
    })
  }

  const rows = useMemo(
    () =>
      executionPlan.map((step, index) => ({
        id: `${normalizeAgentKey(step?.skillId) || 'step'}-${index}`,
        stepNumber: index + 1,
        ...step,
      })),
    [executionPlan],
  )

  const columns = useMemo(
    () => [
      {
        key: 'stepNumber',
        label: 'Step #',
        mobileLabel: 'Step #',
        width: '84px',
        render: (value) => <span className="super-admin-agents__skill-key">{value}</span>,
      },
      {
        key: 'skillId',
        label: 'Skill',
        mobileLabel: 'Skill',
        render: (value, row) => {
          const normalized = normalizeAgentKey(value)
          const currentSkill = normalized ? skillLookup[normalized] : null
          const optionPool = new Map(
            eligibleAssignedSkillIds.map((skillId) => {
              const skill = skillLookup[skillId]
              const frameworks = Array.isArray(skill?.supportedFrameworkKeys) ? skill.supportedFrameworkKeys : []
              const frameworkLabel = frameworks.length > 0 ? ` [${frameworks.join(', ')}]` : ''
              return [
                skillId,
                {
                  value: skillId,
                  label: `${skill?.name ?? skillId} (${skill?.key ?? skillId})${frameworkLabel}`,
                },
              ]
            }),
          )

          if (normalized && !optionPool.has(normalized)) {
            optionPool.set(normalized, {
              value: normalized,
              label: currentSkill ? `${currentSkill.name} (${currentSkill.key})` : normalized,
            })
          }

          const options = [...optionPool.values()]

          return (
            <Select
              id={`${prefix}-execution-step-${row.stepNumber}-skill`}
              size="sm"
              value={normalized || ''}
              options={options}
              placeholder={supportedFrameworkKeySet.size === 0 ? 'Select a framework first' : 'Select a skill'}
              disabled={supportedFrameworkKeySet.size === 0 || options.length === 0}
              onChange={(event) =>
                handleUpdateStep(row.stepNumber - 1, {
                  skillId: normalizeAgentKey(event.target.value),
                  description: String(executionPlan[row.stepNumber - 1]?.description ?? ''),
                })
              }
              aria-label={`Execution plan skill for step ${row.stepNumber}`}
            />
          )
        },
      },
      {
        key: 'description',
        label: 'Description',
        mobileLabel: 'Description',
        render: (value, row) => (
          <Input
            id={`${prefix}-execution-step-${row.stepNumber}-description`}
            size="sm"
            value={String(value ?? '')}
            placeholder="Optional"
            onChange={(event) =>
              handleUpdateStep(row.stepNumber - 1, {
                skillId: normalizeAgentKey(executionPlan[row.stepNumber - 1]?.skillId),
                description: event.target.value,
              })
            }
            aria-label={`Execution plan description for step ${row.stepNumber}`}
            fullWidth
          />
        ),
      },
      {
        key: 'rowActions',
        label: 'Actions',
        mobileLabel: 'Actions',
        align: 'center',
        width: '220px',
        render: (_value, row) => {
          const index = row.stepNumber - 1
          return (
            <div className="super-admin-agents__execution-actions">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index <= 0}
                onClick={() => handleMoveStep(index, index - 1)}
              >
                Up
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index >= rows.length - 1}
                onClick={() => handleMoveStep(index, index + 1)}
              >
                Down
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveStep(index)}
              >
                Delete
              </Button>
            </div>
          )
        },
      },
    ],
    [
      eligibleAssignedSkillIds,
      executionPlan,
      handleMoveStep,
      handleRemoveStep,
      handleUpdateStep,
      prefix,
      rows.length,
      skillLookup,
      supportedFrameworkKeySet.size,
    ],
  )

  return (
    <RuntimeAgentSection
      title="Execution Plan"
      copy="Define how the agent orchestrates skills. Steps are sequential and must be unique in V1."
    >
      <div className="super-admin-agents__skill-picker-controls">
        <Select
          id={`${prefix}-execution-add-skill`}
          label="Add Step"
          className="super-admin-agent-editor__select-field"
          value={pendingStepSkillId}
          options={addStepOptions}
          onChange={(event) => setPendingStepSkillId(event.target.value)}
          placeholder={supportedFrameworkKeySet.size === 0 ? 'Select a framework first' : addStepOptions.length > 0 ? 'Select a skill' : 'No eligible skills'}
          disabled={supportedFrameworkKeySet.size === 0 || addStepOptions.length === 0}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="super-admin-agents__skill-add-button"
          onClick={handleAddStep}
          disabled={!pendingStepSkillId}
        >
          Add Step
        </Button>
      </div>

      <p className="super-admin-agents__framework-helper">
        Only assigned, ACTIVE, framework-compatible skills can be used. In V1 each skill can appear once.
      </p>

      <div className="super-admin-agents__table-wrap" aria-label="Execution plan steps table">
        <Table
          className="super-admin-agents__table"
          columns={columns}
          data={rows}
          variant="striped"
          hoverable
          emptyMessage="No execution steps yet."
          ariaLabel="Execution plan"
        />
      </div>

      {errors.executionPlan ? (
        <p className="super-admin-agents__framework-error" role="alert">
          {errors.executionPlan}
        </p>
      ) : null}
    </RuntimeAgentSection>
  )
}

function RuntimeAgentPromptSection({ prefix, form, setForm, compiledPrompt }) {
  return (
    <RuntimeAgentSection
      title="Prompt & Instruction Design"
      copy="Edit agent-level guidance blocks without taking ownership of workflow policy logic."
    >
      <div className="super-admin-agents__prompt-section" aria-label="Prompt configuration">
        <Textarea
          id={`${prefix}-prompt-base-system`}
          label="Base System Prompt"
          value={form.promptBaseSystem}
          onChange={(event) => setForm((current) => ({ ...current, promptBaseSystem: event.target.value }))}
          rows={4}
          fullWidth
        />
        <Textarea
          id={`${prefix}-prompt-role`}
          label="Role Prompt"
          value={form.promptRole}
          onChange={(event) => setForm((current) => ({ ...current, promptRole: event.target.value }))}
          rows={4}
          fullWidth
        />
        <Textarea
          id={`${prefix}-prompt-developer`}
          label="Developer Instructions"
          value={form.developerInstructions}
          onChange={(event) => setForm((current) => ({ ...current, developerInstructions: event.target.value }))}
          rows={4}
          fullWidth
        />
        <Textarea
          id={`${prefix}-prompt-output-contract`}
          label="Output Contract Prompt"
          value={form.outputContractPrompt}
          onChange={(event) => setForm((current) => ({ ...current, outputContractPrompt: event.target.value }))}
          rows={3}
          fullWidth
        />
        <Textarea
          id={`${prefix}-prompt-forbidden-actions`}
          label="Forbidden Actions Prompt"
          value={form.forbiddenActionsPrompt}
          onChange={(event) => setForm((current) => ({ ...current, forbiddenActionsPrompt: event.target.value }))}
          rows={3}
          fullWidth
        />
        <Textarea
          id={`${prefix}-prompt-handoff`}
          label="Handoff Prompt"
          value={form.handoffPrompt}
          onChange={(event) => setForm((current) => ({ ...current, handoffPrompt: event.target.value }))}
          rows={3}
          fullWidth
        />
        <Textarea
          id={`${prefix}-prompt-compiled`}
          label="Compiled Prompt Preview"
          value={compiledPrompt}
          readOnly
          rows={6}
          fullWidth
        />
      </div>
    </RuntimeAgentSection>
  )
}

function RuntimeAgentContractsSection({ prefix, form, setForm, errors }) {
  return (
    <RuntimeAgentSection
      title="Contracts"
      copy="Define the input and output envelopes expected by this agent."
    >
      <div className="super-admin-agents__row">
        <Textarea
          id={`${prefix}-input-contract`}
          label="Input Contract (JSON)"
          value={form.inputContractJson}
          onChange={(event) =>
            setForm((current) => ({ ...current, inputContractJson: event.target.value }))
          }
          error={errors.inputContractJson}
          rows={6}
          fullWidth
        />

        <Textarea
          id={`${prefix}-output-contract`}
          label="Output Contract (JSON)"
          value={form.outputContractJson}
          onChange={(event) =>
            setForm((current) => ({ ...current, outputContractJson: event.target.value }))
          }
          error={errors.outputContractJson}
          rows={6}
          fullWidth
        />
      </div>
    </RuntimeAgentSection>
  )
}

function RuntimeAgentRuntimeSection({ prefix, form, setForm, errors }) {
  return (
    <RuntimeAgentSection
      title="Runtime Configuration"
      copy="Set operational controls that apply at runtime, not execution logic."
    >
      <div className="super-admin-agents__row">
        <Input
          id={`${prefix}-policy-max-token-budget`}
          label="Max Token Budget"
          helperText="Leave empty for default."
          value={form.policyMaxTokenBudget}
          onChange={(event) =>
            setForm((current) => ({ ...current, policyMaxTokenBudget: event.target.value }))
          }
          error={errors.policyMaxTokenBudget}
          fullWidth
        />

        <Input
          id={`${prefix}-policy-timeout-ms`}
          label="Timeout (ms)"
          helperText="Leave empty for default."
          value={form.policyTimeoutMs}
          onChange={(event) =>
            setForm((current) => ({ ...current, policyTimeoutMs: event.target.value }))
          }
          error={errors.policyTimeoutMs}
          fullWidth
        />

        <Input
          id={`${prefix}-policy-retry-policy`}
          label="Retry Policy"
          helperText="Optional policy key (example: None)."
          value={form.policyRetryPolicy}
          onChange={(event) =>
            setForm((current) => ({ ...current, policyRetryPolicy: event.target.value }))
          }
          fullWidth
        />
      </div>
    </RuntimeAgentSection>
  )
}

function RuntimeAgentDependenciesSection({
  agentId,
  dependencies,
  isDependenciesLoading = false,
  dependenciesError = '',
}) {
  const workflowPolicies = Array.isArray(dependencies?.workflowPolicies) ? dependencies.workflowPolicies : []
  const frameworkPackages = Array.isArray(dependencies?.frameworkPackages) ? dependencies.frameworkPackages : []
  const warnings = Array.isArray(dependencies?.warnings) ? dependencies.warnings : []
  const blocks = Array.isArray(dependencies?.blocks) ? dependencies.blocks : []

  const policyColumns = useMemo(
    () => [
      { key: 'name', label: 'Policy Name', mobileLabel: 'Policy Name' },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
        width: '140px',
        render: (value) => (
          <Status size="sm" showIcon variant={String(value || '').trim().toUpperCase() === 'ACTIVE' ? 'success' : 'muted'}>
            {String(value || '--')}
          </Status>
        ),
      },
      {
        key: 'link',
        label: 'Link',
        mobileLabel: 'Link',
        width: '160px',
        align: 'center',
        render: (_value, row) => (
          <Link
            className="super-admin-agents__dependency-link"
            to={`/super-admin/runtime-control/workflow-policies?q=${encodeURIComponent(row?.key ?? row?.id ?? '')}`}
          >
            View
          </Link>
        ),
      },
    ],
    [],
  )

  const packageColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Package',
        mobileLabel: 'Package',
        render: (_value, row) => (
          <span className="super-admin-agents__skill-name">
            {row?.frameworkName ? `${row.frameworkName} ${row.version || ''}`.trim() : row?.version || '--'}
          </span>
        ),
      },
      { key: 'frameworkKey', label: 'Framework', mobileLabel: 'Framework', width: '130px' },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
        width: '140px',
        render: (value) => (
          <Status size="sm" showIcon variant={String(value || '').trim().toUpperCase() === 'ACTIVE' ? 'success' : 'muted'}>
            {String(value || '--')}
          </Status>
        ),
      },
      {
        key: 'link',
        label: 'Link',
        mobileLabel: 'Link',
        width: '160px',
        align: 'center',
        render: (_value, row) => (
          <Link
            className="super-admin-agents__dependency-link"
            to={`/super-admin/runtime-control/framework-packages?q=${encodeURIComponent(row?.version ?? row?.frameworkKey ?? '')}`}
          >
            View
          </Link>
        ),
      },
    ],
    [],
  )

  return (
    <RuntimeAgentSection
      title="Dependencies"
      copy="Read-only view of where this Agent is currently referenced in Runtime Control."
    >
      <div className="super-admin-agents__dependency-grid" aria-label="Agent dependencies">
        <div className="super-admin-agents__dependency-block">
          <p className="super-admin-agents__dependency-label">Agent ID</p>
          <p className="super-admin-agents__framework-helper">
            Agent ID: <span className="super-admin-agents__code">{agentId || '--'}</span>
          </p>
        </div>

        <div className="super-admin-agents__dependency-block">
          <p className="super-admin-agents__dependency-label">Dependency Warnings</p>
          {isDependenciesLoading ? (
            <p className="super-admin-agents__framework-helper">Loading dependencies...</p>
          ) : dependenciesError ? (
            <p className="super-admin-agents__framework-error" role="alert">{dependenciesError}</p>
          ) : warnings.length > 0 ? (
            <ul className="super-admin-agents__dependency-list">
              {warnings.map((warning) => (
                <li key={warning} className="super-admin-agents__dependency-item">{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="super-admin-agents__framework-helper">No dependency warnings for this agent.</p>
          )}

          {blocks.length > 0 ? (
            <p className="super-admin-agents__dependency-blocked" role="alert">{blocks[0]}</p>
          ) : null}
        </div>

        <div className="super-admin-agents__dependency-block">
          <p className="super-admin-agents__dependency-label">Referenced by Workflow Policies</p>
          <div className="super-admin-agents__table-wrap" aria-label="Workflow policy dependencies table">
            <Table
              className="super-admin-agents__table"
              columns={policyColumns}
              data={workflowPolicies}
              variant="striped"
              hoverable
              emptyMessage="No workflow policies reference this agent."
              ariaLabel="Workflow policy dependencies"
            />
          </div>
        </div>

        <div className="super-admin-agents__dependency-block">
          <p className="super-admin-agents__dependency-label">Referenced by Framework Packages</p>
          <div className="super-admin-agents__table-wrap" aria-label="Framework package dependencies table">
            <Table
              className="super-admin-agents__table"
              columns={packageColumns}
              data={frameworkPackages}
              variant="striped"
              hoverable
              emptyMessage="No framework packages reference this agent."
              ariaLabel="Framework package dependencies"
            />
          </div>
        </div>
      </div>
    </RuntimeAgentSection>
  )
}

export function RuntimeAgentFormFields({
  prefix,
  isEditMode = false,
  form,
  setForm,
  errors,
  validationHints = {},
  activeTab = 0,
  onTabChange,
  frameworkOptions,
  availableSkills = [],
  isSkillsLoading = false,
  skillsError = '',
  dependencies = null,
  isDependenciesLoading = false,
  dependenciesError = '',
}) {
  const compiledPrompt = useMemo(() => compilePromptPreview(form), [form])
  const hintErrors = validationHints && typeof validationHints === 'object' ? validationHints : {}

  const tabErrorCounts = useMemo(() => ({
    framework: hintErrors.supportedFrameworkKeys ? 1 : 0,
    skills: hintErrors.defaultSkillIds ? 1 : 0,
    execution: hintErrors.executionPlan ? 1 : 0,
    prompts: 0,
    contracts: (hintErrors.inputContractJson ? 1 : 0) + (hintErrors.outputContractJson ? 1 : 0),
    runtime: (hintErrors.policyMaxTokenBudget ? 1 : 0) + (hintErrors.policyTimeoutMs ? 1 : 0),
    dependencies: 0,
  }), [hintErrors])

  const renderTabLabel = (label, count = 0) => (
    <span className="super-admin-agents__tab-label">
      <span>{label}</span>
      {count > 0 ? (
        <span className="super-admin-agents__tab-error-count" aria-hidden="true">
          ({count})
        </span>
      ) : null}
    </span>
  )

  return (
    <div className="super-admin-agents__dialog-body">
      <RuntimeAgentOverviewSection prefix={prefix} form={form} setForm={setForm} errors={errors} />

      <TabView
        variant="pills"
        size="sm"
        className="super-admin-agents__tabs"
        aria-label="Agent editor configuration sections"
        activeTab={activeTab}
        onTabChange={onTabChange}
      >
        <TabView.Tab label={renderTabLabel('Framework Compatibility', tabErrorCounts.framework)}>
          <RuntimeAgentFrameworkCompatibilitySection
            prefix={prefix}
            form={form}
            setForm={setForm}
            errors={errors}
            frameworkOptions={frameworkOptions}
          />
        </TabView.Tab>

        <TabView.Tab label={renderTabLabel('Skill Composition', tabErrorCounts.skills)}>
          <RuntimeAgentSkillCompositionSection
            prefix={prefix}
            form={form}
            setForm={setForm}
            errors={errors}
            availableSkills={availableSkills}
            isSkillsLoading={isSkillsLoading}
            skillsError={skillsError}
          />
        </TabView.Tab>

        <TabView.Tab label={renderTabLabel('Execution Plan', tabErrorCounts.execution)}>
          <RuntimeAgentExecutionPlanSection
            prefix={prefix}
            form={form}
            setForm={setForm}
            errors={errors}
            availableSkills={availableSkills}
          />
        </TabView.Tab>

        <TabView.Tab label={renderTabLabel('Prompt & Instruction Design', tabErrorCounts.prompts)}>
          <RuntimeAgentPromptSection
            prefix={prefix}
            form={form}
            setForm={setForm}
            compiledPrompt={compiledPrompt}
          />
        </TabView.Tab>

        <TabView.Tab label={renderTabLabel('Contracts', tabErrorCounts.contracts)}>
          <RuntimeAgentContractsSection prefix={prefix} form={form} setForm={setForm} errors={errors} />
        </TabView.Tab>

        <TabView.Tab label={renderTabLabel('Runtime Configuration', tabErrorCounts.runtime)}>
          <RuntimeAgentRuntimeSection prefix={prefix} form={form} setForm={setForm} errors={errors} />
        </TabView.Tab>

        {isEditMode ? (
          <TabView.Tab label={renderTabLabel('Dependencies', tabErrorCounts.dependencies)}>
            <RuntimeAgentDependenciesSection
              agentId={dependencies?.agentId ?? ''}
              dependencies={dependencies}
              isDependenciesLoading={isDependenciesLoading}
              dependenciesError={dependenciesError}
            />
          </TabView.Tab>
        ) : null}
      </TabView>
    </div>
  )
}

function buildSupportedOptionList(values, labelLookup, emptyLabel) {
  const items = Array.isArray(values) ? values.filter(Boolean) : []

  return [
    { value: '', label: emptyLabel },
    ...items.map((value) => ({
      value,
      label: labelLookup?.[value] ?? value,
    })),
  ]
}

export function TestRuntimeAgentDialog({
  open,
  onClose,
  agent,
  testForm,
  setTestForm,
  testErrors,
  testResult,
  frameworkOptions = [],
  onSubmit,
}) {
  const [showPromptPreview, setShowPromptPreview] = useState(false)

  useEffect(() => {
    if (!open) {
      setShowPromptPreview(false)
      return
    }

    // Reset when the dialog is opened or a different agent is selected for testing.
    setShowPromptPreview(false)
  }, [open, agent?.id])
  const frameworkLabelLookup = useMemo(
    () => Object.fromEntries(frameworkOptions.map((option) => [option.value, option.label])),
    [frameworkOptions],
  )

  const frameworkKeyOptions = useMemo(
    () =>
      buildSupportedOptionList(
        agent?.supportedFrameworkKeys,
        frameworkLabelLookup,
        'No framework (optional)',
      ),
    [agent?.supportedFrameworkKeys, frameworkLabelLookup],
  )

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <Dialog.Header>
        <h2 className="super-admin-agents__dialog-title">Test Agent</h2>
      </Dialog.Header>
      <Dialog.Body>
        <form id="runtime-agent-test-form" className="super-admin-agents__form" onSubmit={onSubmit} noValidate>
          <p className="super-admin-agents__framework-helper">
            Run a lightweight compatibility check and compiled prompt hash preview for{' '}
            <strong>{agent?.name ? `${agent.name} (${agent.key})` : 'this agent'}</strong>.
          </p>

          <div className="super-admin-agents__row">
            <Select
              id="runtime-agent-test-framework-key"
              label="Framework Key"
              value={testForm.frameworkKey}
              options={frameworkKeyOptions}
              onChange={(event) => setTestForm((current) => ({ ...current, frameworkKey: event.target.value }))}
              helperText="Optional. Used to confirm framework compatibility."
            />
          </div>

          <div className="super-admin-agents__row">
            <Textarea
              id="runtime-agent-test-input-json"
              label="Input (JSON)"
              value={testForm.inputJson}
              onChange={(event) => setTestForm((current) => ({ ...current, inputJson: event.target.value }))}
              error={testErrors.inputJson}
              rows={7}
              fullWidth
            />

            <Textarea
              id="runtime-agent-test-context-json"
              label="Context (JSON)"
              value={testForm.contextJson}
              onChange={(event) => setTestForm((current) => ({ ...current, contextJson: event.target.value }))}
              error={testErrors.contextJson}
              rows={7}
              fullWidth
            />
          </div>

          {testResult ? (
            <div className="super-admin-agents__test-result" aria-label="Agent test results">
              <p className="super-admin-agents__framework-helper">
                Latest result:{' '}
                {testResult.promptHash ? (
                  <span className="super-admin-agents__test-hash">Prompt hash: {testResult.promptHash}</span>
                ) : (
                  'No prompt hash returned.'
                )}
              </p>

              {Array.isArray(testResult.warnings) && testResult.warnings.length > 0 ? (
                <p className="super-admin-agents__framework-error" role="alert">
                  {testResult.warnings.join(' ')}
                </p>
              ) : null}

              <div className="super-admin-agents__test-details">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="super-admin-agents__test-summary"
                  onClick={() => setShowPromptPreview((current) => !current)}
                  aria-expanded={showPromptPreview ? 'true' : 'false'}
                >
                  {showPromptPreview ? 'Hide compiled prompt preview' : 'Show compiled prompt preview'}
                </Button>

                {showPromptPreview ? (
                  <div className="super-admin-agents__test-preview">
                  <Textarea
                    id="runtime-agent-test-compiled-preview"
                    label="Compiled Prompt (read-only)"
                    value={String(testResult.compiledPromptPreview ?? '')}
                    rows={10}
                    fullWidth
                    readOnly
                  />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </form>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" form="runtime-agent-test-form" variant="primary">
          Run Test
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
