import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Tickbox } from '../../components/Tickbox'
import { Fieldset } from '../../components/Fieldset'
import { Accordion } from '../../components/Accordion'
import SectionHeader from './FrameworkPackageSectionHeader.jsx'
import { DISCOVERY_POLICY_CONTRACT_VERSION, DISCOVERY_POLICY_FIELDS, DISCOVERY_REFERENCE_FIELDS, discoveryFieldLabel, newDiscoveryFields } from './discoveryPolicyFields.js'

const referenceFields = Object.fromEntries(DISCOVERY_REFERENCE_FIELDS.map((field) => [field, field === 'restrictions' ? 'list' : 'text']))

function PolicyGroup({ label, fields, value, onChange, disabled, path }) {
  const configured = value !== undefined
  return <Fieldset disabled={disabled}>
    <Fieldset.Legend>{label}</Fieldset.Legend>
    <Fieldset.Content>
      <div className="super-admin-framework-package-editor__table-actions">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onChange(configured ? undefined : newDiscoveryFields(fields))}>
          {configured ? 'Remove' : 'Configure'} {label}
        </Button>
      </div>
      {configured && <PolicyFields fields={fields} value={value} onChange={onChange} disabled={disabled} path={path} />}
    </Fieldset.Content>
  </Fieldset>
}

function PolicyFields({ fields, value, onChange, disabled, path }) {
  return <div className="super-admin-framework-package-editor__field-grid super-admin-framework-package-editor__discovery-fields">{renderPolicyFields({ fields, value, onChange, disabled, path })}</div>
}

function renderPolicyFields({ fields, value, onChange, disabled, path }) {
  return Object.entries(fields).map(([key, type]) => {
    const label = discoveryFieldLabel(key)
    const id = `${path}-${key}`
    const change = (next) => {
      const updated = { ...value, [key]: next }
      if (next === undefined || next === '' && type === 'text') delete updated[key]
      onChange(updated)
    }
    if (typeof type === 'object') return <PolicyGroup key={key} label={label} fields={type} value={value[key]} onChange={change} disabled={disabled} path={id} />
    if (type === 'references') {
      const rows = value[key] || []
      return <Fieldset key={key} disabled={disabled}><Fieldset.Legend>{label}</Fieldset.Legend><Fieldset.Content>
        {rows.length === 0 && <p>No binding supplied. Required mappings remain unresolved.</p>}
        {rows.map((row, index) => <Fieldset key={index} disabled={disabled}><Fieldset.Legend>Reference {index + 1} — authored fields</Fieldset.Legend><Fieldset.Content>
          <PolicyFields fields={referenceFields} value={row} path={`${id}-${index}`} disabled={disabled} onChange={(next) => change(rows.map((item, rowIndex) => rowIndex === index ? next : item))} />
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => change(rows.filter((_, rowIndex) => rowIndex !== index))}>Remove reference {index + 1}</Button>
        </Fieldset.Content></Fieldset>)}
        <Button type="button" variant="outline" size="sm" disabled={disabled || rows.length >= 100} onClick={() => change([...rows, { mappingKey: '' }])}>Add {label.toLowerCase()} reference</Button>
      </Fieldset.Content></Fieldset>
    }
    if (['boolean', 'true', 'false'].includes(type)) return <Tickbox key={key} id={id} label={label} checked={value[key] ?? type === 'true'} disabled={disabled || type !== 'boolean'} onChange={(event) => change(event.target.checked)} />
    const fixed = !['text', 'note', 'list'].includes(type)
    if (type === 'list') return <Textarea key={`${key}-${JSON.stringify(value[key] || [])}`} id={id} label={`${label} (one per line)`} defaultValue={(value[key] || []).join('\n')} disabled={disabled} onBlur={(event) => change(event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))} />
    if (type === 'note') return <Textarea key={key} id={id} label={label} value={value[key] || ''} disabled={disabled} onChange={(event) => change(event.target.value)} />
    return <Input key={key} id={id} label={label} value={fixed ? type : value[key] || ''} maxLength={180} disabled={disabled || fixed} onChange={(event) => change(event.target.value)} />
  })
}

export default function DiscoveryPolicyPanel({ value, onChange, disabled, summary, errors = {} }) {
  const enabled = value !== undefined
  return <div className="super-admin-framework-package-editor__tab-panel super-admin-framework-package-editor__discovery-policy">
    <SectionHeader title="Discovery Policy" copy={enabled ? `Configured policy${disabled ? ' (read-only)' : ''}. Required semantic, machine-contract and implementation bindings must be verified before validation or activation.` : 'Legacy fallback: this package has no Discovery Policy.'} />
    {summary?.policyHash && <p>Saved policy hash: <code>{summary.policyHash}</code></p>}
    {!enabled && <Button type="button" disabled={disabled} onClick={() => onChange({ contractVersion: DISCOVERY_POLICY_CONTRACT_VERSION, policyKey: '', policyVersion: '' })}>Configure Discovery Policy</Button>}
    {enabled && <>
      <PolicyFields fields={{ contractVersion: DISCOVERY_POLICY_CONTRACT_VERSION, policyKey: 'text', policyVersion: 'text', label: 'text' }} value={value} onChange={onChange} disabled={disabled} path="discovery-policy" />
      {Object.entries(DISCOVERY_POLICY_FIELDS).map(([key, fields]) => <PolicyGroup key={key} label={discoveryFieldLabel(key)} fields={fields} value={value[key]} disabled={disabled} path={`discovery-policy-${key}`} onChange={(next) => {
        const updated = { ...value }
        if (next === undefined) delete updated[key]
        else updated[key] = next
        onChange(updated)
      }} />)}
    </>}
    {Object.entries(errors).filter(([path]) => path.startsWith('discoveryPolicy')).map(([path, message]) => <p role="alert" key={path}>{path}: {message}</p>)}
    {(summary?.resolvedReferences?.length > 0 || summary?.unresolvedReferences?.length > 0) && <Accordion allowMultiple>
    {summary?.resolvedReferences?.length > 0 && <Accordion.Item id="discovery-resolved"><Accordion.Header itemId="discovery-resolved">Saved locally verified references ({summary.resolvedReferences.length})</Accordion.Header><Accordion.Content itemId="discovery-resolved"><ul>{summary.resolvedReferences.map((row) => <li key={row.path}>
      <p>{row.path}: provisional StorylineOS binding verified. VMF producer certification remains unverified.</p>
      <p>Capability: {row.semanticTarget?.capability}. Owner: {row.semanticTarget?.owner}.</p>
      <p>Result contract: {row.semanticTarget?.resultContract} / {row.semanticTarget?.schemaVersion}.</p>
      <p>Local assessor: {row.semanticTarget?.localProducerBinding?.implementationRef} / {row.semanticTarget?.localProducerBinding?.implementationVersion}.</p>
      <p>Activation decision: {row.semanticTarget?.localProducerBinding?.decisionRef}.</p>
      <p>Installed version: {row.semanticTarget?.localProducerBinding?.installedVersionId}. Binding hash: {row.semanticTarget?.localProducerBinding?.bindingHash}.</p>
      <p>{row.semanticTarget?.restriction}</p>
    </li>)}</ul></Accordion.Content></Accordion.Item>}
    {summary?.unresolvedReferences?.length > 0 && <Accordion.Item id="discovery-unresolved"><Accordion.Header itemId="discovery-unresolved">Saved unresolved references ({summary.unresolvedReferences.length})</Accordion.Header><Accordion.Content itemId="discovery-unresolved"><ul>{summary.unresolvedReferences.map((row) => <li key={row.path}>
      <p>{row.path}: {row.question}</p>
      {row.semanticTarget && <Fieldset><Fieldset.Legend>Supported semantic target — {row.semanticTarget.capability}</Fieldset.Legend><Fieldset.Content><div className="super-admin-framework-package-editor__field-group">
        <p>Owner: {row.semanticTarget.owner}{row.semanticTarget.ownerVersion ? ` v${row.semanticTarget.ownerVersion}` : ''}. Policy source binding: {row.semanticTarget.policyBindingStatus}.</p>
        <p>Governing source: {row.semanticTarget.sourceVersion}.</p>
        {row.semanticTarget.resultContract && <>
          <p>Owner-announced result contract: {row.semanticTarget.resultContract} / {row.semanticTarget.schemaVersion}.</p>
          <p>Source verification: {row.semanticTarget.sourceVerificationStatus}. Installation: {row.semanticTarget.installationStatus}.</p>
          <p>Expected source SHA-256: {row.semanticTarget.expectedSourceHash}.</p>
        </>}
        <p>Machine result contract: {row.semanticTarget.machineContractStatus}. Implementation: {row.semanticTarget.implementationStatus}.</p>
        {row.semanticTarget.typedConsumer && <p>Verified typed-result consumer: {row.semanticTarget.typedConsumer.implementationRef} / {row.semanticTarget.typedConsumer.implementationVersion}. Assessment producer: {row.semanticTarget.typedConsumer.assessmentProducerStatus}.</p>}
        <p>{row.semanticTarget.restriction}</p>
      </div></Fieldset.Content></Fieldset>}
    </li>)}</ul></Accordion.Content></Accordion.Item>}
    </Accordion>}
  </div>
}
