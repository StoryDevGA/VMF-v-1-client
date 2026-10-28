# Outcome Studio

Outcome Studio prepares governed business deliverables from the current locked runtime and its accepted evidence. A request plan records the requested output, audience, decision purpose, selected schema, and the governed evidence boundary before generation can begin.

## Audience and optional composition requests

Include the intended audience in your request. “Executive Team” and “Executive Leadership Team” request the canonical Executive Leadership Team Audience pack. It must be active, compatible and uniquely resolved.

You can explicitly request optional composition guidance, for example `Channel: LinkedIn post`, `Style: strategic advisory style`, or `Language: english`. Use `Visual system: <capability key>` and `Industry: <capability key>` for registered visual and industry guidance. Named clauses accept exact capability keys; controlled phrases also include “LinkedIn post”, “strategic advisory style” and “visual truth preservation rules”. Separate clauses with semicolons.

An explicit request blocks if its pack is missing, inactive, incompatible or ambiguous. Multiple different channel, style, language or visual-system requests also block; equivalent keys and aliases count as one request. Optional packs are not added merely because they are available. Required output dependencies and safeguards still apply. The plan and resolution receipt record selected pack identity, version, activation scope and content hash while preserving your wording.

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

## Final approval and saved versions

Passing the stages creates a governed Working Draft for review. Approval is a separate, explicit action. The server verifies the current plan, source revision, exact stage lineage and supported rendered output before saving the final asset and its version together with their receipts. A renderer or persistence failure does not establish approval. Retrieve the saved request and review its first blocker before taking the offered recovery action.

An eligible repeat of approval returns the same committed version. It must not create another final asset or version. Business qualifications, source attribution and certainty limits remain in the content; technical validation and lineage receipts are shown separately from the clean output.

## Duplicate as Working Draft — Preserve this version

Select the source asset version you want to preserve, including an available historical or published version. The confirmation shows that exact source version and its Runtime revision alongside the target Runtime revision. The default target is the source version's revision. A newer revision is used only when you explicitly select it under the same Framework and package lineage; the action never silently switches to the latest revision. A material Framework or package-lineage change requires a new asset.

Duplication preserves the original request intent, output contract, structure and style. Changes to those instructions use the governed request amendment workflow. The selected source version remains unchanged and viewable. The successor recomposes from the target revision's accepted truth and evidence and records fresh provider, validation and lineage receipts. It does not inherit the source version's ARL or RL approval, copy approved prose as new evidence, or strengthen qualified claims.

Preparation or generation in progress is not a saved Working Draft. The successor becomes a governed Working Draft only after its required stages pass and its saved result can be retrieved. Review both content and source-to-target lineage changes before a separate approval. If the target evidence is not ready or a required stage fails, the preserved version remains available and no completed successor is claimed.

Keep the same action identity when retrieving or repeating an eligible duplicate action. It returns the existing successor rather than creating another one. If the outcome of a provider call or save is unknown, retrieve the operation first; do not start another duplicate merely because the response was lost. Follow the recovery action the server offers. Changed source, target, evidence or contract bindings require a fresh explicit confirmation.

## When a request is blocked

The workspace shows the first blocking stage and its next action. A failed or incomplete stage prevents downstream stages from being fabricated and prevents customer-ready approval. If ARL Meaning Review ran and rejected the draft, its findings identify the meaning corrections needed. If ARL did not run, failed to execute, or has a missing or stale receipt, that is an execution or lineage problem; it does not establish that the draft was rejected on meaning. Narrative, shaping and rendered-expression stages remain blocked until a valid ARL pass is recorded.

After a failure, earlier steps may already have been saved. Retrieve the saved request and review its stage status before taking further action. An eligible retry uses the existing request lineage and verifies the current source and predecessor receipts before reusing a successful stage. Do not start a new request merely to repeat a failed generation. Historical plans, drafts, assets and stage receipts are preserved. Accepted evidence is reused, but acceptance alone does not establish that it supports every section of the selected output.

## Evidence clarification before generation

Each required section needs admissible, current evidence with its original source, validation status, attribution and qualifications. Framework guidance explains how to prepare the output; it cannot establish customer facts. If a required section has unresolved, unsupported or Framework-only material, Outcome Studio shows a clarification request and stops before generation or meaning review.

An unresolved optional section may be omitted only when the selected schema permits omission. The evidence readiness panel distinguishes required sections needing clarification from permitted optional omissions. Confirming your request records what you want; it does not validate evidence or grant ARL approval. Workspace readiness and request readiness answer different questions: an available locked workspace may still contain a request blocked by its selected output requirements. Follow the request-specific readiness reason and next action.

Read the exact clarification question and the named section, reference or missing input before taking its next action. Partial support and metadata-only sections still need admissible claims for their required content. Ready to Draft permits the Working Draft call against the saved handoff; it does not mean ARL has run or approved the result. Changing source evidence invalidates the saved readiness and requires a new request resolution.

If the governed evidence snapshot or output binding cannot be verified, section sufficiency has not yet been assessed. Ask a workspace administrator to review that readiness boundary before resolving the request again; this does not establish that customer evidence is missing.

A complete snapshot means the full in-scope evidence set was read and its source references and section coverage were checked. It does not mean the evidence supports every required section. Outcome Studio may show a complete snapshot while contradictions, missing Constraints, unresolved references or required decision inputs still prevent drafting. An incomplete snapshot keeps Generate Draft disabled before a drafting or ARL provider call.

To recover, review the named section and correct the relevant evidence through the governed runtime workflow, or select an output schema compatible with the available evidence. Resolve the request again against the current records. Answering a clarification does not automatically change evidence, remove qualifications or approve stronger claims.

For a locked revision, use the authorized governed revision workflow to supply or correct evidence; do not change the locked source to bypass clarification. A provider failure and an ARL review finding are separate from evidence readiness. An ARL finding can require a meaning correction even when the snapshot and required sections are ready; it is not automatically a system defect.

See [Outcome Studio readiness](outcome-studio-readiness.md) for the snapshot states and a development example.
