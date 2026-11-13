# Intelligence Hub Sources

Sources is the canonical unique-source registry for the selected revision. A source can contribute many evidence objects; source totals and evidence totals are different counts.

## Search the complete revision

Search looks across source records and evidence, including records beyond the first page. Source matches and evidence matches are separate result streams. An evidence match opens its exact source and focuses that exact evidence object.

Source pagination is independent of the selected source's evidence pagination. Evidence contribution counts describe that source's actual evidence population, rather than the number of visible rows. Source processing state, domain and classification appear only when the governed read supplies them.

Matching sources describes the current search population. Whole-revision sources is the canonical unique-source count shared with Overview and Context, independent of search and pagination. Documents processed counts distinct current uploaded-document sources with verified successful acquisition receipts matching their current content. It does not count evidence objects, visible rows or Runs. A successful extraction with zero eligible evidence objects counts once. Legacy sources without verified receipt linkage are unknown; a receipt for changed content is stale. Neither is silently counted as processed.

## Inspect and review

Select a source, inspect its evidence statement and provenance, then follow the exact evidence handoff to Review. Accepted, Rejected and Needs Review describe evidence decisions. Acceptance does not establish independent verification, confidence, quality resolution or snapshot sufficiency.

An evidence title is a display label. When no title is recorded, the heading says Evidence object. The current read does not supply governed evidence classifications or domain assignments, so these remain explicitly unavailable even when a title exists. Titles, acceptance and validation states do not substitute for those contracts.

The selected-source heading reports that source's complete recorded contribution count, separately from any exact focused evidence match. Use Browse all evidence from this source to inspect its independently paginated evidence while preserving the source, revision and search context. Back restores the exact focus. If the source and evidence read bases disagree, the contribution count and this handoff remain unavailable until refreshed.

Exact source and evidence identities are kept in the link so Back and reload can restore focus. If that pair is unavailable or wrong for the selected revision, the view explains the failure instead of selecting a different record.

Source and evidence reads must match the current selected revision version and session before record inspection or Review handoff. During a failed or refreshing read, previous records are withheld. Invalid or repeated query fields offer Reset Sources query; an old selection cannot navigate after the revision, session or read basis changes. Search and Retry source reads remain available for recovery within the current verified scope.

## Recorded capture and exact support

Source details shows a recorded capture receipt when it is supplied and consistent with the current read. Recorded text and Review opens the selected evidence object's supporting excerpt and provenance. Inspect the source identity, capture time, extraction method and any recorded Capture Run and Capture Attempt. A non-run capture can have no Run or Attempt recorded; do not infer another execution identity from that absence. Capture receipts and document-processing receipts describe different operations.

Original content hash identifies the recorded input version. For website captures, it is calculated from the complete decoded response text; it does not identify the original transferred bytes. Extracted-text hash identifies the normalized text used for the supporting excerpt. Its span uses UTF-16 code units with an exclusive end: [start, end) includes the start and stops before the end. These coordinates are not original HTML positions, PDF pages or original-file locations. The exact recorded excerpt, excerpt hash and source binding keep support attached to its own source, even when another source contains the same words.

Recorded capture and support do not establish source authenticity, independent verification, evidence acceptance or frozen membership. Source assertions remain qualified statements awaiting their separate review decisions. If a receipt or supporting span is missing, stale or inconsistent with the selected source and revision, inspection explains that it is unavailable; it does not invent a location or substitute another source. A changed or unavailable read closes the previous inspection rather than keeping old details current.

## Partial, stale and unavailable reads

A bounded read can be partial or capped. An unknown total is unavailable, not zero. Refresh the selected scope when currency is uncertain. Do not treat an empty visible page as proof that the whole revision has no evidence.

Source population and processing proof can have different completeness. A complete source count can remain available while Documents processed is unavailable, qualified by verified, unknown and stale document counts. During loading, after a failed refresh or when the revision basis changes, the summary hides its previous values. Use Retry source reads to reread the exact selected scope. A processing-proof limit is explained separately from a source-population limit; neither establishes acceptance, quality resolution or readiness.

Acquisition belongs to [Context](intelligence-hub-context.md). Findings are resolved in [Intelligence Quality](intelligence-quality.md); outstanding evidence decisions belong in [Review](intelligence-hub-review.md).
