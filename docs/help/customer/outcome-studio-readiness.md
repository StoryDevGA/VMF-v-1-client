# Outcome Studio readiness

Outcome Studio has two different readiness questions:

- **Foundation/preflight readiness**: the locked runtime, handoff, evidence sufficient for required sections, output contract, and request plan are eligible for governed execution. This can allow Framework Guidance and Working Draft to run.
- **Full governed readiness**: every stage in the persisted quality chain has passed and its receipt is linked to the same runtime instance, plan, draft, and draft iteration. Only this state can proceed to customer-ready approval.

## Stage-specific blockers

The stage path is fail-closed:

- **Framework Guidance** — the governed handoff or guidance execution is missing, stale, or failed.
- **Working Draft** — the draft provider did not produce a valid evidence-bound draft, or its predecessor lineage is invalid.
- **ARL Meaning Review** — the draft requires bounded changes to meaning, reality-layer classification, evidence use, or decision usefulness.
- **Outcome Narrative Plan** — blocked until ARL Meaning Review has passed and its actual stage receipt is available.
- **Output Shaping** — blocked until the narrative plan is persisted and predecessor fingerprints match.
- **Rendered-Expression RL** — blocked until the shaped candidate is persisted and the rendered-expression review passes.

The workspace identifies the specific blocker. A green foundation stage, resolved pack, or recorded binding does not prove that the corresponding quality stage executed.

## Snapshot completeness and section support

The evidence readiness panel distinguishes reading the evidence set from establishing that it supports the requested output:

- **Incomplete snapshot:** Outcome Studio could not verify the full in-scope set. Generate Draft stays disabled before drafting or ARL calls. Ask a workspace administrator to review the reported read boundary, then resolve the request again after that boundary is corrected. A partial read must not be treated as complete.
- **Complete snapshot with clarification required:** all in-scope records were inventoried, but required support remains unresolved. Review the named source reference, contradiction, constraint, decision, authority or economic input. More records or a complete count alone do not satisfy these requirements.
- **Ready to draft:** the snapshot, selected output contract and all other required readiness checks are satisfied. This permits drafting; it does not grant ARL approval or customer-ready status.

The current snapshot read is a diagnostic. It does not replace the evidence receipt saved with a request plan or clear existing blockers. Resolve the request again to bind the plan to current governed evidence after an authorized correction. An unresolved optional section may be omitted only under the selected schema's explicit omission rule; unresolved required sections still need clarification.

### Development example

This recorded example from 30 September 2026 shows a complete inventory of 853 records with 62 records in the governed section projection. Six contradictions, missing Constraints and unresolved section references still block Generate Draft. It illustrates the distinction; the counts and readiness are historical, not a current status for your workspace.

<img src="assets/ss-040-readiness.png" alt="Recorded Outcome Studio example showing a complete evidence snapshot, unresolved contradictions and Constraints, and disabled Generate Draft" width="440" />

## Evidence and retry rules

Outcome Studio uses the accepted evidence already bound to the locked runtime. It does not ask the customer to upload another copy to bypass a governed gate. Provider receipts, stage execution IDs, predecessor fingerprints, and audit records must remain consistent. Retries are idempotent; historical records remain unchanged.

Evidence readiness is checked against the selected output schema. Required sections need admissible current evidence with exact source references, validation status, attribution and qualifications. Accepted status alone is insufficient. Framework guidance remains separate from customer evidence and cannot support a customer claim.

If a required section is unresolved or unsupported, generation and meaning review stop before a provider call. The clarification identifies the affected sections and what must be resolved. An optional unresolved section may be omitted only if the selected schema explicitly permits it; it cannot be silently treated as complete.

If the governed evidence snapshot or output binding cannot be verified, section sufficiency has not yet been assessed. Ask a workspace administrator to review that readiness boundary before resolving the request again; this does not establish that customer evidence is missing.

Review the identified evidence through the governed runtime workflow, then resolve the request again, or select a compatible output schema. Request confirmation and evidence availability do not establish independent validation, decision authority or ARL approval. Recovery preserves source attribution and qualifications; it does not automatically collect or change evidence.

If the source revision is locked, use the authorized governed revision workflow rather than editing its saved evidence. A provider failure needs its own diagnosis; an ARL finding needs the identified meaning correction. Neither can be cleared by treating an incomplete snapshot as complete or weakening a required-section rule. See [Outcome Studio](outcome-studio.md) for the clarification workflow.

If any mandatory stage is missing, failed, incomplete, or not linked to the current lineage, the result remains foundation-only or blocked and cannot be presented as a fully governed outcome. Help publication remains pending repository binding and read-back. Other release or acceptance checks remain separate from this runtime status.
