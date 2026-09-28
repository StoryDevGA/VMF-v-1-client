# Execution Workspace

Status: Draft local Help content for SS-036. Publication remains blocked until the StoryDevGA/VMF-v-1-client repository binding is connected and the published content is read back.

The Execution Workspace gives you an overview of one selected Core workspace revision. Use **Home** in the global header to return to Customer Home. The workspace-area links keep the selected workspace and revision context when they open Intelligence Hub, Intelligence Quality, Workspace Structure or Outcome Studio.

Use **Workbench** in the selected-workspace bar to open the existing governed editor for this revision. **Back to Execution Workspace** returns to the overview.

## Workspace and revision context

The page shows the workspace name, workspace type, package version and selected revision. Choose a revision in the strip or use **Previous revision** and **Next revision** to open that revision's own Execution Workspace. Previous is disabled on the first revision; Next is disabled on the latest revision. Moving between revisions does not change workspace data. The page only offers revisions in the verified history for the selected workspace; if that history cannot be verified, workspace summaries are not shown.

## Workspace status and understanding

**Workspace Status** is a read-only summary of the selected revision's recorded workspace state, validation status, accepted evidence and accepted section count when available. The status rows are informational; they do not open separate explanations. A missing value is shown as unavailable or not yet recorded, and an unavailable source is never treated as a successful zero.

**Understanding Ready** shows accepted required sections and generated sections when available. Its percentage is based on accepted required sections, not evidence coverage. Review items show as unavailable when this page has no bounded review count.

The **Intelligence Assurance** information button opens a dialog. This workspace summary currently does not provide an assurance level or supporting measures. Accepted truth progress describes workspace sections; it does not establish an assurance level.

## Advisor

Advisor maps the selected revision's stored Discovery Readiness reason to a recommended next action. **Why this recommendation** explains the recorded reason and affected domains. A recommendation is guidance only: it does not accept evidence, resolve findings, approve understanding or publish outcomes. If Discovery Readiness is missing or unavailable, the page does not carry a recommendation from another workspace or revision.

## Workspace Journey

The journey shows **Acquire**, **Review**, **Understand**, **Create** and **Publish**. It is a guide to current progress, not a required sequence or a completion score. Acquire reflects the recorded evidence readiness state; Review reflects pending review or unresolved contradiction summaries; Understand reflects accepted required sections; Create and Publish remain unavailable when their progress is not provided by this page's bounded summaries.

Choose **How progress works** for the detail behind these stages and their links. An unavailable value means its bounded summary could not be used; it does not mean zero work exists.

## Capability cards

- **Intelligence Hub** shows source count, evidence count and coverage when those summaries are available.
- **Intelligence Quality** shows contradiction, missing-area and weak-signal counts when those summaries are available.
- **Workspace Structure** shows the bounded section count, accepted count and count not yet accepted.
- **Outcome Studio** provides its destination link. Draft, approval and publication totals are not available in this page summary.

These cards link to destination contracts that carry the selected workspace and revision. The Intelligence Hub, Intelligence Quality, Workspace Structure and Outcome Studio destination screens are separate follow-on work; this page does not claim those screens are delivered by SS-036.

## Help and information popups

The global **Help** menu opens the Help Centre. **Why this recommendation**, **Intelligence Assurance** and **How progress works** open information dialogs for the selected workspace revision. Close a dialog with its Close button or the Escape key. Changing customer, tenant, workspace or revision context clears an open dialog.
