# PRD: Super Admin Flow Alignment

## Status / PRD Ownership
- This PRD remains the source of truth for **global super-admin navigation and dashboard-home behavior**.
- The **Customer Admin workflow** (Customers + Invitations unified workspace) is now owned by:
  - `tasks/prd-customer-admin-unified-workspace.md`
- If requirements conflict, `prd-customer-admin-unified-workspace.md` takes precedence for `/super-admin/customers` and invitation-process behavior.

## 0. Codebase Scan Summary

Note: This scan reflects initial discovery context. Active customer/invitation requirement decisions now live in `tasks/prd-customer-admin-unified-workspace.md`.

### Existing patterns to reuse
- `src/components/Navigation/Navigation.jsx` already supports grouped submenus and role-aware links.
- `src/components/Header/Header.jsx` already supports logo routing and auth-aware navigation visibility.
- `src/router/index.jsx` already has protected super-admin routes for:
  - `/super-admin/dashboard`
  - `/super-admin/customers`
  - `/super-admin/system-versioning`
  - `/super-admin/license-levels`
  - `/super-admin/system-monitoring`
  - `/super-admin/audit-logs`
  - `/super-admin/denied-access-logs`
- `src/pages/SuperAdminCustomers/SuperAdminCustomers.jsx` already has customer listing, create/update flows, and admin assignment dialogs.
- `src/store/api/customerApi.js` and `src/store/api/invitationApi.js` already provide API patterns for customer management and invitations.

### Potential conflicts/regressions
- Customer create currently uses a persistent left-side form; requirement asks for table-first layout with create popup.
- Assign Admin currently accepts `userId`; requirement asks for simple popup with user name and email and invitation send.
- Existing replace-admin step-up flow may conflict with simplification if both must coexist.
- Customer field semantics currently use `vmfPolicy` + `maxVmfsPerTenant`; requirement mentions changing `VMF Policy` to `VMF Count`.
- Invitations currently have their own page (`/super-admin/invitations`), while requirement references invitations under monitoring/system health context.

### Unknowns that require clarification
- Whether `VMF Count` is only a label change or a model/API contract change to numeric limits.
- Whether invitation management must move into `System Health` submenu as a new item, or stay as a separate route but context-linked.
- Whether `Replace Admin` remains supported or is removed from first release.
- Whether row actions must become icon-only now or can remain text actions in MVP.

## 1. Clarifying Questions

- All active Customer Admin and invitation clarifications are tracked in `tasks/prd-customer-admin-unified-workspace.md`.
- This PRD has no outstanding clarifications beyond navigation/home behavior.

## 2. Introduction/Overview
This PRD aligns the Super Admin experience with the "Super Admin Flow" document. The scope covers:
- Navigation and homepage behavior
- Super Admin menu structure
- Handoff boundary to the dedicated Customer Admin workflow PRD

The core problem is a mismatch between the current implementation and the required operational flow for Super Admin users.

## 3. Goals
- Make Dashboard the effective home after login for authenticated users.
- Enforce the required top-level menu structure and submenu hierarchy for Super Admin.
- Define clear ownership boundaries so Customer Admin behavior is maintained in its dedicated PRD.
- Keep role-based access control, test coverage, and existing architecture consistency.

## 4. User Stories

### US-001: Dashboard Is Home
**Description:** As a Super Admin, I want login and logo navigation to route to Dashboard so that I always return to the operational home page.

**Acceptance Criteria:**
- [ ] Successful super-admin login routes to `/super-admin/dashboard`.
- [ ] Successful customer-admin login routes to `/app/dashboard`.
- [ ] Header logo routes authenticated users to their role-appropriate dashboard.
- [ ] Dashboard is removed as a separate navigation menu item.
- [ ] Typecheck/lint passes.
- [ ] **[UI stories only]** Verify in browser using dev-browser skill.

### US-002: Super Admin Menu Structure
**Description:** As a Super Admin, I want navigation grouped by System Admin and System Health so that operational tasks are logically organized.

**Acceptance Criteria:**
- [ ] Top-level items are, in order: `System Admin`, `Customer Admin`, `System Health`, `Help`.
- [ ] `System Admin` submenu contains `Versioning` and `Licence Maintenance`.
- [ ] `Customer Admin` is a direct link to `/super-admin/customers`.
- [ ] `System Health` submenu contains `Monitoring`, `Audit Logs`, and `Denied Access`.
- [ ] Typecheck/lint passes.
- [ ] **[UI stories only]** Verify in browser using dev-browser skill.

### US-003: Customer Admin Requirements Delegation
**Description:** As a product owner, I want detailed Customer Admin (Customers + Invitations) requirements maintained in one dedicated PRD so implementation guidance is unambiguous.

**Acceptance Criteria:**
- [ ] `tasks/prd-customer-admin-unified-workspace.md` is listed as the source of truth for `/super-admin/customers` behavior.
- [ ] No detailed customer/invitation interaction requirements are duplicated here.
- [ ] Typecheck/lint passes.
- [ ] **[UI stories only]** Verify in browser using dev-browser skill.

## 5. Functional Requirements
- FR-1: The system must route authenticated users to dashboard after login (`/super-admin/dashboard` for super admins, `/app/dashboard` for customer admins).
- FR-2: The system must not expose a `Dashboard` navigation menu item.
- FR-3: The header logo click must route authenticated users to their dashboard home.
- FR-4: The super-admin navigation must include top-level `System Admin`, `Customer Admin`, `System Health`, and `Help`.
- FR-5: `System Admin` must include submenu links to `Versioning` and `Licence Maintenance`.
- FR-6: `Customer Admin` must route to `/super-admin/customers`.
- FR-7: `System Health` must include submenu links to `Monitoring`, `Audit Logs`, and `Denied Access`.
- FR-8: Detailed Customer Admin and invitation workflow requirements must be implemented according to `tasks/prd-customer-admin-unified-workspace.md`.
- FR-9: Access to all super-admin menu items must remain restricted to `SUPER_ADMIN`.
- FR-10: Automated tests must cover navigation structure and routing behavior, and must include regression checks that Navigation remains unchanged.

## 6. Non-Goals (Out of Scope)
- Redesigning all dashboard tiles or unrelated admin pages.
- Replacing RTK Query architecture or global state management patterns.
- Detailed Customer Admin interaction design and invitation flow behavior (owned by `tasks/prd-customer-admin-unified-workspace.md`).
- Changing the current `src/components/Navigation/Navigation.jsx` structure and behavior baseline that has already been approved.

## 6.1 Locked Baseline: Navigation (Must Not Regress)
- File baseline: `src/components/Navigation/Navigation.jsx` is currently correct and must be preserved.
- Top-level order must remain: `System Admin`, `Customer Admin`, `System Health`, `Help` (Help last).
- `System Admin` must remain a submenu with `Versioning` and `Licence Maintenance`.
- `Customer Admin` must remain a direct link to `/super-admin/customers` (no submenu).
- `System Health` must remain a submenu with `Monitoring`, `Audit Logs`, and `Denied Access`.
- `Dashboard` must not be present as a navigation menu item.
- Existing role-aware link behavior and submenu interaction patterns (open/close/active/mobile close on link click) must not regress.

## 7. Design Considerations
- Keep top-level navigation structure and labeling stable for operator familiarity.
- Keep language consistent with document spelling (`Licence`) in user-facing labels.

## 8. Technical Considerations
- Integration and implementation details for `/super-admin/customers` and invitation handling are delegated to `tasks/prd-customer-admin-unified-workspace.md`.
- Regression risk areas:
  - `Navigation` + `Header` role-based behavior
  - Router path/link consistency for dashboard-home behavior

## 9. Success Metrics
- 100% of required menu items/submenus match the document in UAT.
- 0 regressions in approved Navigation ordering, submenu grouping, and route targets.
- No high-severity regressions in super-admin routes and role-based navigation.
- CI passes for impacted unit/integration tests.

## 10. Open Questions
- OQ-1: None in this document; all Customer Admin workflow open questions are tracked in `tasks/prd-customer-admin-unified-workspace.md`.
