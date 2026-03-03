# PRD: Unified Customer Admin Workspace (Customers + Invitations)

## 0. Codebase Scan Summary

### Existing patterns to reuse
- `src/pages/SuperAdminCustomers/SuperAdminCustomers.jsx` already provides:
  - customer list with search/filter/pagination
  - create/update customer flows
  - assign/replace admin actions
- `src/pages/SuperAdminInvitations/SuperAdminInvitations.jsx` already provides:
  - invitation create form
  - invitation table (search/filter/pagination)
  - resend/revoke actions with dialogs
- `src/store/api/customerApi.js` and `src/store/api/invitationApi.js` already provide RTK Query integration and tag invalidation patterns.
- `src/router/index.jsx` already has both routes:
  - `/super-admin/customers`
  - `/super-admin/invitations`

### Potential conflicts/regressions
- Invitation creation currently lives on a separate page; combining flows may duplicate forms/actions unless ownership is clear.
- `assignAdmin` currently expects `{ customerId, userId }`, while requested workflow expects name/email-based invitation behavior.
- Existing `/super-admin/invitations` deep links and tests may break if route is removed without redirect.
- Layout complexity risk: merging two operational pages can reduce readability on smaller screens if not segmented.

### Unknowns that require clarification
- Preferred unified layout pattern (tabs vs stacked sections vs split layout).
- Whether `/super-admin/invitations` should remain as a standalone page, redirect, or alias.
- Whether invitation creation should always come from customer context, or also support generic invite creation.
- Whether `Replace Admin` remains visible in unified MVP.

## 1. Clarifying Questions (Draft Assumptions Applied)

1. What should the combined page layout be?
A. Tabs: `Customers` and `Invitations` inside `/super-admin/customers`
B. Single long page with stacked sections
C. Two-column split view
D. Other

Draft assumption: **A**

2. What should happen to `/super-admin/invitations`?
A. Redirect to `/super-admin/customers?view=invitations`
B. Keep standalone page and also add combined page
C. Remove route entirely
D. Other

Draft assumption: **A**

3. How should invitation creation behave in unified flow?
A. From customer actions only
B. From both customer actions and generic invitation form
C. Generic form only
D. Other

Draft assumption: **B**

4. Should `Replace Admin` remain in MVP?
A. Keep as advanced action
B. Remove from UI
C. Keep backend only
D. Other

Draft assumption: **A**

## 2. Introduction/Overview
This PRD defines a new unified Super Admin workflow where **Customer Admin** becomes a combined workspace for both customer lifecycle management and invitation management. The unified experience lives at `/super-admin/customers` and consolidates operational actions that are currently split across Customers and Invitations pages.

The objective is to reduce context switching and make all customer-admin onboarding operations available in one place.

## 3. Goals
- Provide one operational workspace for customer and invitation management.
- Keep current approved Navigation behavior unchanged.
- Preserve existing customer and invitation capabilities while reducing page switching.
- Keep role/security controls and step-up patterns intact where required.
- Maintain or improve test coverage for merged workflow behavior.

## 4. User Stories

### US-001: Unified Customer Admin Entry
**Description:** As a Super Admin, I want Customer Admin to open one workspace containing customers and invitations so that I can complete onboarding tasks without changing pages.

**Acceptance Criteria:**
- [ ] `/super-admin/customers` renders a unified workspace with two views: `Customers` and `Invitations`.
- [ ] Default view is `Customers`.
- [ ] View state is URL-addressable (`?view=customers` or `?view=invitations`).
- [ ] Typecheck/lint passes.
- [ ] **[UI stories only]** Verify in browser using dev-browser skill.

### US-002: Customer Operations Remain Available
**Description:** As a Super Admin, I want all existing customer operations preserved in the unified page so that no critical function is lost.

**Acceptance Criteria:**
- [ ] Customer list/search/filter/pagination remain available.
- [ ] Create/Edit/Status update actions remain available.
- [ ] Assign Admin and Replace Admin remain available.
- [ ] Typecheck/lint passes.
- [ ] **[UI stories only]** Verify in browser using dev-browser skill.

### US-003: Invitation Operations Embedded
**Description:** As a Super Admin, I want invitation management embedded in the same workspace so that invite creation and monitoring are immediate.

**Acceptance Criteria:**
- [ ] Invitations view includes list/search/filter/pagination.
- [ ] Invitations view supports create, resend, and revoke actions.
- [ ] Invitation status rendering remains consistent with current behavior.
- [ ] Typecheck/lint passes.
- [ ] **[UI stories only]** Verify in browser using dev-browser skill.

### US-004: Assign Admin Connects to Invitations
**Description:** As a Super Admin, I want assign-admin actions to generate invitations visible in the same workspace so that onboarding progress is traceable.

**Acceptance Criteria:**
- [ ] Assign Admin flow captures required identity details and triggers invitation creation.
- [ ] Success state provides clear confirmation and quick access to Invitations view.
- [ ] Newly created invitation is visible in the Invitations list after completion.
- [ ] Typecheck/lint passes.
- [ ] **[UI stories only]** Verify in browser using dev-browser skill.

### US-005: Legacy Invitations Route Stays Compatible
**Description:** As an operator using existing links, I want old invitation URLs to remain functional so that bookmarks and documentation do not break.

**Acceptance Criteria:**
- [ ] Visiting `/super-admin/invitations` redirects to `/super-admin/customers?view=invitations`.
- [ ] Redirect preserves browser navigation behavior.
- [ ] Typecheck/lint passes.
- [ ] **[UI stories only]** Verify in browser using dev-browser skill.

### US-006: Navigation Baseline Does Not Change
**Description:** As a product owner, I want the approved navigation to stay unchanged while internal page workflows evolve.

**Acceptance Criteria:**
- [ ] `src/components/Navigation/Navigation.jsx` top-level and submenu structure remains unchanged.
- [ ] `Customer Admin` remains the top-level link to `/super-admin/customers`.
- [ ] No additional navigation items are introduced for invitations.
- [ ] Typecheck/lint passes.
- [ ] **[UI stories only]** Verify in browser using dev-browser skill.

## 5. Functional Requirements
- FR-1: The system must present a unified Customer Admin workspace at `/super-admin/customers`.
- FR-2: The unified workspace must provide two distinct views: `Customers` and `Invitations`.
- FR-3: The default unified workspace view must be `Customers`.
- FR-4: The selected unified view must be reflected in URL query params for deep-linking.
- FR-5: Customer list/search/status/topology filtering and pagination must remain functionally equivalent to current behavior.
- FR-6: Customer create, edit, and lifecycle status actions must remain functionally equivalent to current behavior.
- FR-7: Assign Admin and Replace Admin actions must remain available in Customers view.
- FR-8: Invitations view must include invitation list/search/status filtering and pagination.
- FR-9: Invitations view must support create invitation action with current validation behavior.
- FR-10: Invitations view must support resend and revoke with existing status constraints.
- FR-11: Invitation status display variants must remain consistent with current mapping.
- FR-12: Assign-admin success path must create an invitation record that appears in Invitations view.
- FR-13: Unified workflow must support refresh/requery of invitations after invite-affecting actions.
- FR-14: `/super-admin/invitations` must redirect to `/super-admin/customers?view=invitations`.
- FR-15: Route guards and authorization must remain restricted to `SUPER_ADMIN` for this workspace.
- FR-16: Existing navigation structure in `src/components/Navigation/Navigation.jsx` must not change.
- FR-17: `Customer Admin` must remain direct navigation to `/super-admin/customers`.
- FR-18: No new top-level navigation items may be introduced for invitations.
- FR-19: Mobile and desktop layouts must keep both views usable without horizontal overflow regressions beyond existing table-scroll behavior.
- FR-20: Existing toaster/feedback behavior must be preserved for success and error outcomes.
- FR-21: Existing step-up requirements for revoke/replace flows must remain enforced.
- FR-22: Unit/integration tests must be updated or added for unified view routing, invitation actions, and redirect compatibility.

## 6. Non-Goals (Out of Scope)
- Changing approved Navigation structure or item order.
- Rebuilding invitation backend lifecycle semantics.
- Replacing RTK Query with a different data layer.
- Full redesign of unrelated super-admin pages (System Versioning, Audit Logs, Denied Access, Monitoring).

## 7. Design Considerations
- Use existing VMF components (`Fieldset`, `Card`, `Table`, `Dialog`, `Input`, `Select`, `Button`) to maintain consistency.
- Use a clear view switch pattern (tabs or segmented control) with visible active state and keyboard accessibility.
- Keep customer and invitation tables independently filterable/searchable.
- Preserve responsive behavior with existing horizontal-scroll wrapper for dense tables.

## 8. Technical Considerations
- `customerApi.assignAdmin` currently expects `userId`; unified invitation-first onboarding may require:
  - API extension, or
  - frontend mapping from email to user before assign.
- Invitations are currently isolated in `invitationApi`; shared unified screen should avoid duplicate fetch storms by scoping queries to active view.
- Redirect from `/super-admin/invitations` should be implemented at router layer to preserve backward compatibility and test stability.
- Existing tests in `SuperAdminCustomers.test.jsx`, `SuperAdminInvitations.test.jsx`, and router/nav tests will need refactor coverage for merged behavior.

## 9. Success Metrics
- 100% parity of critical customer and invitation actions after merge.
- Reduced navigation hops for onboarding flow (target: customer + invite workflow completed without page change).
- No high-severity regressions in super-admin navigation, auth guards, or route access.
- CI test suite passes for all touched customer/invitation/router/navigation tests.

## 10. Open Questions
- OQ-1: Confirm final unified layout pattern (`Tabs` assumed).
- OQ-2: Confirm whether invitation create form should prefill customer/company details when launched from customer row actions.
- OQ-3: Confirm whether generic (non-customer-selected) invitation creation remains supported in MVP.
- OQ-4: Confirm whether a dedicated "Invitations" heading is required within unified page for audit/reporting screenshots.

