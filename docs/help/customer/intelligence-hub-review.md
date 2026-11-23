# Intelligence Hub Review

Review is the entry point for outstanding evidence and Quality decisions in the selected revision. It uses the same finding identities and governed actions as Intelligence Quality.

## Decide on evidence

Inspect the exact evidence statement and source before choosing Accept or Reject. Both are review decisions. Needs Review describes evidence awaiting a decision; completion does not require every item to be Accepted.

Supporting evidence and Detailed inspection show any current recorded capture receipt and exact extracted-text support for the selected evidence. Check its source, Capture Run and Capture Attempt where recorded, original-content and extracted-text hashes, excerpt hash and end-exclusive UTF-16 span. The coordinates refer to normalized extracted text, not original HTML or PDF locations. Missing or inconsistent support remains unavailable. [Sources](intelligence-hub-sources.md) explains these provenance fields and their limits.

Successful capture and exact support preserve what the source asserts; they do not independently verify it or accept the evidence. A pending source assertion stays pending until a separate authorised evidence decision. An inspection does not establish frozen snapshot membership, complete review, resolve a finding or authorise downstream publication. If the selected revision, session or read basis changes, reopen a current inspection before acting.

The action requires current authority and an editable revision. A denied or stale write is rejected by the server. After a successful decision, the current scoped reads are refreshed. If recalculation or refresh fails, the failure remains visible and readiness is not assumed.

Acceptance notes are optional. A supplied note must contain 10–2000 characters. Rejection requires a written rationale in that range. You can explicitly change an individual decision through the same governed Accept or Reject action; earlier records remain history.

## Accept all eligible

In **Qualified evidence package**, choose **Accept all eligible** and inspect the confirmation before recording it. The server identifies eligible pending evidence across the complete selected revision, independently of the current search, filters or loaded page. Existing accepted items and rejected items are excluded; contradictions keep their separate decisions. The confirmation shows the exact eligible identities, exclusions and population hash. An optional shared note is applied to the batch's acceptance decisions.

Cancel does not change evidence. Confirm records the batch atomically with per-item audit history. A changed population or stale basis is refused. Batch acceptance does not complete Review, verify sources or lock the workspace.

If a response is uncertain, further commands remain blocked. Choose **Refresh package reads**, inspect the recorded state and, when offered, explicitly **Recover original command**. Recovery uses the original request identity; it does not create a new batch. Do not repeat the operation with another identity to manufacture success.

## Resolve a finding

Open the exact finding in [Intelligence Quality](intelligence-quality.md). A detected candidate is not a confirmed contradiction. A current Not Contradictory disposition removes that finding from outstanding decisions; the evidence pair keeps its own acceptance status.

A current Confirmed disposition completes the human finding decision but can still block readiness. Reopened, unreviewed or stale findings need a current decision. Review and Quality do not create separate queues or independent decision stores.

## Accept the reviewed evidence pack

Evidence-pack acceptance is a separate choice in Review. It makes the reviewed pack available to section generation; it does not accept generated Understanding, record Review Completion, certify readiness or approve publication. The control requires a ready pack, current authority, an editable revision and verified complete evidence counts with no pending decisions. Accepted and Rejected evidence decisions are retained.

Inspect the current basis, select the confirmation and choose **Accept reviewed evidence pack**. When the control warns that acceptance starts a new Quality review basis, previous contradiction decisions remain historical and require reassessment. A renderer-declared acceptance command follows its own server-owned basis rules. Inspect the current findings after acceptance.

If the request or its refreshed state cannot be verified, use **Refresh evidence-pack basis** and inspect the recorded state before choosing an explicit retry. The control does not retry automatically. A successful acceptance is shown only after current scoped reads verify the accepted pack and unchanged evidence decisions.

## Completion and currency

Record Review Completion explicitly after inspecting every mandatory evidence and contradiction decision in this revision. Enter a rationale and confirm that you reviewed the complete population. Search, filters and pagination do not reduce that population. Accepted and Rejected evidence both count as decided; a current Confirmed contradiction completes its decision but can still block readiness.

The server checks the current evidence and finding basis, your authority and the revision lifecycle before saving a signed audit and completion receipt. The receipt appears in Review and Readiness & publish and survives reload. Inspect recorded completion to see its rationale, reviewer, receipt and audit references. Completion remains disabled when decisions are outstanding or the complete population cannot be verified. No optional session counter substitutes for this receipt.

If recording or refreshing fails, refresh Review Completion and inspect the recorded receipt before retrying. A successful retry of the same request does not create a duplicate decision. Recording completion does not accept evidence, certify readiness, publish or lock.

Changed evidence or detector basis can require reassessment. Check the current reason after return or reload. Locked revisions remain inspectable without permitting decisions against frozen truth.

Use [Sources](intelligence-hub-sources.md) for exact provenance and [Evidence readiness](intelligence-hub-evidence-readiness.md) for the next handoff.

## Evidence qualifications

For an evidence object, open **Detailed inspection** to inspect or edit the same neutral qualification available in [Sources](intelligence-hub-sources.md). Leave unknown fields blank for **Not recorded**; an optional note can explain the change. Saving and reopening retain the exact item, source, author and time. Reopen earlier entries through **Recorded qualification history**. The material-binding status is separate from the currentness statement you authored.

Qualification recording requires update permission and an editable revision; view-only and locked revisions remain inspectable. It does not change an Accept or Reject decision, source authenticity, confidence, section mapping, package admission or generation permission. Cancel discards a pre-save draft only. If the response or exact reread cannot be verified, further saves stay blocked and recovery reads the original request; no automatic second save is sent.

## Qualified evidence package

After Review Completion is current and all required decisions are recorded, inspect the package preview. Choose **Freeze package membership** and confirm the exact accepted evidence, source hashes, state version and section mappings. This creates package membership; it does not lock or publish the workspace or modify a locked predecessor. Unassigned evidence and qualification gaps stay visible.

Choose **Save evidence package** only against the verified current freeze. The saved package contains the qualification ledger, Evidence Register, Validated Customer Baseline and linked observations, patterns, hypotheses, contradictions and unknowns. These views organise supported source assertions and recorded material. Empty analytical categories do not imply that a model has assessed them. The baseline is not independently verified customer truth.

Use **Reopen saved package** to inspect the stored result and its receipt, membership, ledger and output hashes. A later evidence decision or basis change can make an earlier package historical; that record is preserved rather than silently rebuilt from newer evidence. Locked or read-only revisions permit inspection, while fresh decisions and saves remain unavailable. Missing provenance, failed read-back and stale membership are blockers, not successful empty results.


## Mapping and the published handoff

Unassigned evidence remains **Unassigned / mapping not established**. Empty mappings do not provide section support. A package retains neutral qualification and its receipt separately from specialised draft-placement records; neither fills missing certainty or turns source assertions into verified customer facts.

Sources and Review provide inspection, preview, save and reopen. They do not publish the workspace or initiate an Outcome handoff. A saved package can accompany published truth only after the existing lock, publication, signed-snapshot and replay gates succeed. The handoff must retain that exact package receipt, frozen membership, qualification and source links. It does not grant acceptance, section support or output admission.
