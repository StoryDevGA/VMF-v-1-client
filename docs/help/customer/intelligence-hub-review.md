# Intelligence Hub Review

Review is the entry point for outstanding evidence and Quality decisions in the selected revision. It uses the same finding identities and governed actions as Intelligence Quality.

## Decide on evidence

Inspect the exact evidence statement and source before choosing Accept or Reject. Both are review decisions. Needs Review describes evidence awaiting a decision; completion does not require every item to be Accepted.

The action requires current authority and an editable revision. A denied or stale write is rejected by the server. After a successful decision, the current scoped reads are refreshed. If recalculation or refresh fails, the failure remains visible and readiness is not assumed.

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
