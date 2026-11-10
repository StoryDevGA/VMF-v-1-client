# Intelligence Quality

If a contradiction decision response cannot be confirmed, Refresh and inspect the recorded decision before retrying. An explicit repeat of the same finding, evidence basis, decision and rationale in the same login session retains its original request identity, so a saved receipt can be recovered without another decision. The client never retries automatically or substitutes a new timestamp. A recovered historical receipt does not establish a current disposition; current reads determine that state. Changing the command or login session starts a separate request. Reloading discards the in-memory attempt, so inspect recorded history after reload.

Discovery readiness uses the same scoped recorded Discovery Health assessment as Coverage and Readiness & publish. Its state, blockers, qualifications and times describe that diagnostic. A required refresh marks it stale; missing refresh information stays unknown. No refresh marker does not prove current inputs. The assessment input basis is unavailable from this read, and recorded Ready does not establish certification, Review Completion, human approval or all-output sufficiency. Refresh hides previous values while the read is loading or unavailable.

Intelligence Quality is the shared finding-resolution surface. Review owns outstanding-decision entry and completion; evidence acceptance remains a separate decision.

## Detection and human disposition

Detected contradiction candidates need human examination. Their detector basis, evidence pair and current review basis matter. A candidate count is not a count of confirmed contradictions, and a partial read containing zero candidates does not prove whole-revision absence.

For a supported current contradiction, inspect the two evidence statements and their provenance. Choose Not Contradictory, Confirmed or Reopen where your authority permits it, enter a rationale of 10–2000 characters and confirm the decision. The server checks revision currency and the evidence-pair basis.

Not Contradictory is a recorded current disposition, not an open blocker. Confirmed remains a readiness concern. Reopen requires another decision. A changed evidence or detector basis can make an earlier disposition stale; do not mistake stale history for a current resolution.

## Keep decisions independent

Quality does not accept or reject the evidence pair. Advisor suggestions are guidance; they do not decide. Unknown affected claims or outcomes means impact is unavailable, not that no impact exists.

Missing coverage, weak confidence and duplicate-source action semantics are not connected as governed decisions here. Do not interpret disabled actions as reviewed findings or invent a dismissal to make readiness green.

## Recovery and inspection

Denied or stale writes fail without changing the displayed truth optimistically. An explicit refresh must establish current reads after a failure. Recalculation failures remain visible. The latest recorded rationale and time are not a complete paginated audit history.

Follow exact source/evidence identities into [Sources](intelligence-hub-sources.md), or inspect relationships in [Intelligence Graph](intelligence-hub-graph.md). Locked inspection remains available; acquisition belongs to [Context](intelligence-hub-context.md).

## Inspect stored detections

Quality defaults to Open decisions: unreviewed, reopened and stale decisions requiring review or reassessment. Current Not Contradictory and Confirmed dispositions complete their human decisions and appear under Recorded dispositions; a confirmed contradiction can still affect readiness. Stale latest reviews remain labelled stale and are also available for reassessment.

Use Detected candidates to inspect persisted contradiction detections. Enter a search and choose Search findings: the search includes exact finding, domain, detection basis and supporting evidence identity, source identity and statement across all stored detections before pagination. Previous findings and Next findings page this population independently of recorded-decision history. Finding order sorts stable IDs; it does not assign a priority. Changing the search, type, population or order resets the page.

The existing detector stores at most eight candidates. Complete stored-detection search does not establish complete revision coverage or a complete four-type findings register. Missing coverage, Weak confidence and Duplicate source reads remain unavailable. An empty open list does not prove Review completion. Detected, open and recorded populations overlap: Recorded dispositions includes reopened and stale latest reviews as well as current decisions. The latest review is separate from complete audit history.

An exact linked current disposition opens in Recorded dispositions when the current decision read verifies it; otherwise linked inspection starts in Detected candidates. If filters or pagination hide a linked finding, change them to inspect it; Quality does not substitute another finding. Population, type, search, order and page are preserved in the scoped link across Back, reload and Help return. Filters from another workspace, revision, customer or tenant are ignored; invalid linked filters show default inspection with a recovery notice. Opening a different exact finding from Review starts an inspection appropriate to that finding.

A pending, failed or mismatched read hides prior findings and their details. Refresh explicitly verifies the current read. Read-only finding and source inspection is separate from permission to record a human disposition; locked revisions remain inspectable.

## Inspect exact provenance from Quality

Each supplied evidence item has an Open evidence A/B in Sources control. It opens the recorded source and exact evidence identity in the selected workspace and revision; conflicting source search/type/page filters are cleared. The control is unavailable when the read supplies no exact source/evidence identity. Quality does not infer a source from a lineage label.

Locked revisions permit this inspection. Use browser Back to return to the exact finding and its Quality population, type and search. Navigation records no decision and makes no acquisition or publication change.

Use **Inspect evidence A/B in Graph** to inspect an individual supplied evidence identity from a current scoped finding read. Graph resolves its exact recorded global evidence object and one-hop relationships, including objects outside the initial projection. The selected finding and Quality filters remain return context; Graph does not resolve the finding. Use **Return to selected Quality finding** or browser Back to restore that inspection. Locked read-only inspection is permitted separately from decision authority.

Missing, private, ambiguous or unavailable graph evidence stays unavailable; another displayed object is not substituted. Pending or rejected evidence may have no recorded graph object. Changing Graph mode, search or object explicitly changes inspection. Navigation does not record a disposition, acquire evidence, recompute or publish.

### Recorded contradiction decisions

Open View recorded decisions for the selected contradiction to inspect earlier retained decisions in reverse recorded order. Each page is scoped to the exact selected revision and finding. The reviewer, server time, rationale and original decision basis are recorded facts; they do not establish the present disposition. Expand Inspect recorded decision basis for its version, evidence-pair hash, epoch and any recorded retry identity. Audit references and recalculation history remain unavailable in this inspection, so it is not a complete finding audit.

Locked inspection is permitted. Refresh hides old records while verifying the read; a failed or mismatched read stays unavailable. Previous decisions and Next decisions page only this history. Closing, changing the finding or leaving its scope ends the inspection. No decision, recomputation or publication executes from the history dialog.

