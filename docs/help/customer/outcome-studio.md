# Outcome Studio

Outcome Studio prepares governed business deliverables from the current locked runtime and its accepted evidence. A request plan records the requested output, audience, decision purpose, selected schema, and the governed evidence boundary before generation can begin.

## Foundation versus fully governed

Foundation or preflight status means that the request is eligible for preparation, or that Framework Guidance and Working Draft have completed. It does not mean that the meaning has been reviewed, the expression shaped, or the result approved. Foundation-only work remains explicitly labelled and cannot be treated as a customer-ready outcome.

A request is fully governed only when all six persisted quality stages have completed in order:

1. Framework Guidance
2. Working Draft
3. ARL Meaning Review
4. Outcome Narrative Plan
5. Output Shaping
6. Rendered-Expression RL

The final approval gate requires the actual persisted stage receipts for the same runtime, plan, draft, and draft iteration. Pack resolution or a readiness badge alone is not a stage receipt.

## When a request is blocked

The workspace shows the first blocking stage and its next action. A failed or incomplete stage prevents downstream stages from being fabricated and prevents customer-ready approval. For example, an ARL Meaning Review blocker means the Working Draft needs a bounded meaning change; the narrative, shaping, and rendered-expression stages remain blocked until that review passes.

Retries use the existing request lineage and are idempotent. Historical plans, drafts, assets, and stage receipts are not replaced. Accepted evidence is reused, but acceptance alone does not establish that it supports every section of the selected output.

## Evidence clarification before generation

Each required section needs admissible, current evidence with its original source, validation status, attribution and qualifications. Framework guidance explains how to prepare the output; it cannot establish customer facts. If a required section has unresolved, unsupported or Framework-only material, Outcome Studio shows a clarification request and stops before generation or meaning review.

An unresolved optional section may be omitted only when the selected schema permits omission. The evidence readiness panel distinguishes required sections needing clarification from permitted optional omissions. Confirming your request records what you want; it does not validate evidence or grant ARL approval.

Read the exact clarification question and the named section, reference or missing input before taking its next action. Partial support and metadata-only sections still need admissible claims for their required content. Ready to Draft permits the Working Draft call against the saved handoff; it does not mean ARL has run or approved the result. Changing source evidence invalidates the saved readiness and requires a new request resolution.

If the governed evidence snapshot or output binding cannot be verified, section sufficiency has not yet been assessed. Ask a workspace administrator to review that readiness boundary before resolving the request again; this does not establish that customer evidence is missing.

A complete snapshot means the full in-scope evidence set was read and its source references and section coverage were checked. It does not mean the evidence supports every required section. Outcome Studio may show a complete snapshot while contradictions, missing Constraints, unresolved references or required decision inputs still prevent drafting. An incomplete snapshot keeps Generate Draft disabled before a drafting or ARL provider call.

To recover, review the named section and correct the relevant evidence through the governed runtime workflow, or select an output schema compatible with the available evidence. Resolve the request again against the current records. Answering a clarification does not automatically change evidence, remove qualifications or approve stronger claims.

For a locked revision, use the authorized governed revision workflow to supply or correct evidence; do not change the locked source to bypass clarification. A provider failure and an ARL review finding are separate from evidence readiness. An ARL finding can require a meaning correction even when the snapshot and required sections are ready; it is not automatically a system defect.

See [Outcome Studio readiness](outcome-studio-readiness.md) for the snapshot states and a development example.

Help publication remains pending repository binding and read-back. Deployment, production readiness, and Product/QA acceptance are separate gates from Outcome Studio execution.
