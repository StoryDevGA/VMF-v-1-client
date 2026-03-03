# Implementation Plan: Super Admin Shell Lock + Unified Customer Admin Workspace

## 1. Document Control
- Feature: Super Admin Shell Lock + Unified Customer Admin Workspace (Customers + Invitations)
- Source Technical Spec: `docs/technical-spec-super-admin-flow.md`
- Source PRD (Optional): `tasks/prd-customer-admin-unified-workspace.md`
- Author: Codex (`implementation-plan` skill)
- Status: Draft
- Last Updated: 2026-03-03

## 2. Inputs and Precedence
- Technical spec path:
  - `docs/technical-spec-super-admin-flow.md`
- PRD path (optional):
  - `tasks/prd-customer-admin-unified-workspace.md`
- Precedence rule applied:
  - Technical spec is authoritative for shell-level constraints (navigation/home behavior lock, regression gates).
  - PRD is authoritative for unified `/super-admin/customers` behavior and invitation workflow scope.

## 3. Codebase and Stack Findings
- Existing patterns to reuse:
  - React + React Router (`createBrowserRouter`) + Redux Toolkit + RTK Query.
  - Existing reusable pages already contain most business logic:
    - `src/pages/SuperAdminCustomers/SuperAdminCustomers.jsx`
    - `src/pages/SuperAdminInvitations/SuperAdminInvitations.jsx`
  - Existing accessible tabs component available at `src/components/TabView/TabView.jsx`.
  - Existing route + nav/auth test suites are already in place.
- Probable code touch points:
  - Routing:
    - `src/router/index.jsx`
    - `src/router/__tests__/router.test.jsx`
  - Global shell lock:
    - `src/components/Header/Header.jsx`
    - `src/components/Navigation/Navigation.jsx`
    - `src/components/Header/Header.test.jsx`
    - `src/components/Navigation/Navigation.test.jsx`
  - Unified workspace build:
    - `src/pages/SuperAdminCustomers/SuperAdminCustomers.jsx`
    - `src/pages/SuperAdminInvitations/SuperAdminInvitations.jsx` (extraction/reuse)
    - `src/components/TabView/TabView.jsx`
    - `src/components/TabView/TabView.test.jsx`
    - `src/pages/SuperAdminCustomers/SuperAdminCustomers.test.jsx`
    - `src/pages/SuperAdminInvitations/SuperAdminInvitations.test.jsx`
  - APIs:
    - `src/store/api/customerApi.js`
    - `src/store/api/invitationApi.js`
- Risks or unknowns:
  - API contract mismatch: assign-admin currently requires `userId`, while PRD expects invitation-oriented name/email flow.
  - Regression risk to locked navigation baseline.
  - Redirect behavior (`/super-admin/invitations` -> `/super-admin/customers?view=invitations`) impacts routing tests and bookmarks.
  - `TabView` is currently uncontrolled; URL-synced tab state requires controlled behavior support.

## 4. Scope Summary
- In scope:
  - Preserve and enforce super-admin shell baseline from technical spec:
    - role-aware logo routing
    - immutable top-level navigation structure/order
  - Implement unified Customer Admin workspace at `/super-admin/customers`:
    - view switching between Customers and Invitations
    - URL-addressable view state
    - legacy invitations route redirect
  - Maintain parity of existing customer and invitation actions.
  - Add/adjust tests for routing, navigation lock, and unified workflow.
- Out of scope:
  - Changing top-level navigation IA.
  - Rebuilding invitation lifecycle backend semantics end-to-end.
  - Redesigning unrelated super-admin pages.
- Assumptions:
  - `Tabs` is accepted as the unified UI pattern (per PRD draft assumption).
  - Existing step-up controls remain required for revoke/replace actions.
  - Backend team can support either:
    - Option A: customer-aware invitation contract update, or
    - Option B: frontend email-to-user resolution workflow before `assignAdmin`.

## 5. Delivery Strategy
- Phases:
  - Phase 1: Foundation + routing shell safety
  - Phase 2: Unified workspace implementation
  - Phase 3: Contract alignment, hardening, and release readiness
- Critical path:
  - FE-01 -> FE-02 -> FE-03 -> FE-04 -> FE-05 -> FE-06 -> FE-08 -> FE-09 -> CC-03
- Parallelizable tracks:
  - BE contract clarification and API changes can run in parallel with FE component extraction.
  - Test refactors can begin once route and component boundaries stabilize.

## 6. Frontend Workstream

| Task ID | Objective | Files/Modules | Dependencies | Verification | Parallelizable |
|---|---|---|---|---|---|
| FE-01 | Add controlled tab mode to support URL-synced view state (`activeTab`, `onTabChange`) while preserving existing uncontrolled usage. | `src/components/TabView/TabView.jsx`, `src/components/TabView/TabView.test.jsx` | None | Run tab unit tests; verify keyboard navigation + controlled/uncontrolled behavior. | No |
| FE-02 | Extract customer operations into reusable panel/container boundary without behavior loss. | `src/pages/SuperAdminCustomers/SuperAdminCustomers.jsx`, optional `src/pages/SuperAdminCustomers/components/*` | FE-01 | Existing customer page tests pass; manual check for create/edit/status/assign/replace. | No |
| FE-03 | Extract invitation operations into reusable panel boundary for embedding in customers workspace. | `src/pages/SuperAdminInvitations/SuperAdminInvitations.jsx`, optional shared panel component under customers feature | FE-01 | Existing invitation tests pass for create/resend/revoke/step-up behavior. | Yes |
| FE-04 | Build unified `/super-admin/customers` workspace with `Customers` and `Invitations` views, defaulting to customers. | `src/pages/SuperAdminCustomers/SuperAdminCustomers.jsx`, style files | FE-02, FE-03 | Manual navigation and panel rendering checks; no lost actions. | No |
| FE-05 | Add URL query-param synchronization (`?view=customers|invitations`) with invalid-value normalization. | `src/pages/SuperAdminCustomers/SuperAdminCustomers.jsx` | FE-04 | Browser back/forward, refresh behavior, deep-link behavior verified. | No |
| FE-06 | Add legacy route redirect from `/super-admin/invitations` to `/super-admin/customers?view=invitations`. | `src/router/index.jsx` | FE-04 | Router tests assert redirect + destination content; bookmark compatibility test. | No |
| FE-07 | Preserve locked shell behavior and verify no navigation/header regressions from workspace changes. | `src/components/Navigation/Navigation.jsx`, `src/components/Header/Header.jsx` (expected no structural changes) | FE-04 | Navigation/Header tests pass unchanged expectations. | Yes |
| FE-08 | Align assign-admin UX with invitation visibility flow (post-success path to invitations view with refresh). | `src/pages/SuperAdminCustomers/SuperAdminCustomers.jsx`, optionally shared invitation state bridge | FE-04, BE-01 decision | Verify assign-admin creates visible invitation record path (mock/integration). | No |
| FE-09 | Refactor and expand tests for unified workspace + route redirect + query-state behavior. | `src/pages/SuperAdminCustomers/SuperAdminCustomers.test.jsx`, `src/pages/SuperAdminInvitations/SuperAdminInvitations.test.jsx`, `src/router/__tests__/router.test.jsx`, `src/components/TabView/TabView.test.jsx` | FE-05, FE-06 | Full targeted test suite green; regression assertions intact. | No |

## 7. Backend Workstream

| Task ID | Objective | Files/Modules | Dependencies | Verification | Parallelizable |
|---|---|---|---|---|---|
| BE-01 | Decide and document assign-admin contract strategy (Option A contract extension vs Option B frontend mapping). | Backend API contract docs / endpoint definitions (`/customers/:id/admins`, `/super-admin/invitations`) | None | Approved API decision record with request/response examples. | Yes |
| BE-02 | If Option A: extend invitation creation endpoint to accept customer context and support assign-admin linkage. | API controllers/services/schema validators (backend repo) | BE-01 | Contract tests for create invitation with customer context; backward compatibility tests. | No |
| BE-03 | If Option B: provide lookup endpoint or deterministic query path for email -> userId resolution before assignAdmin. | API query endpoint/service (backend repo) | BE-01 | Lookup endpoint contract tests; error handling tests for missing/duplicate users. | No |
| BE-04 | Ensure invitation list visibility reflects assign-admin outcome promptly (indexing/cache/event consistency). | Backend invitation service/query path | BE-02 or BE-03 | Integration test: assign action followed by invitation list query contains new item. | Yes |
| BE-05 | Preserve/verify step-up enforcement for revoke and replace-admin flows. | Existing revoke/replace endpoints and middleware | None | Security regression tests for missing/invalid step-up token. | Yes |

## 8. Cross-Cutting Workstream

Security, observability, migration, documentation, and release engineering.

| Task ID | Objective | Files/Modules | Dependencies | Verification | Parallelizable |
|---|---|---|---|---|---|
| CC-01 | Confirm and publish implementation order, dependencies, and owners for FE/BE tasks. | `tasks/implementation-plan-super-admin-customer-admin-unified-workspace.md`, team tracker | None | Stakeholder sign-off on plan and sequencing. | Yes |
| CC-02 | Add rollout notes and operational checks for legacy redirect and navigation lock. | Release checklist / deployment notes | FE-06, FE-07 | Runbook includes smoke checks and rollback path. | Yes |
| CC-03 | CI gate updates: required targeted suites for nav/header/router/customers/invitations/tabview before merge. | CI pipeline config (repo CI files) | FE-09 | CI enforces passing status on all required suites. | No |
| CC-04 | Document API contract decision and final workflow assumptions in technical docs. | `docs/technical-spec-customer-admin-unified-workspace.md` (or addendum), changelog artifacts | BE-01 | Documentation review confirms no ambiguity remains. | Yes |

## 9. Testing and Verification Plan
- Unit tests:
  - `src/components/TabView/TabView.test.jsx`: controlled mode + keyboard behavior.
  - `src/pages/SuperAdminCustomers/SuperAdminCustomers.test.jsx`: unified view defaults, retained customer actions.
  - `src/pages/SuperAdminInvitations/SuperAdminInvitations.test.jsx` or extracted panel tests: invitation operations parity.
- Integration tests:
  - `src/router/__tests__/router.test.jsx`:
    - `/super-admin/customers` default view
    - `/super-admin/invitations` redirect behavior
    - locked navigation expectations still valid
  - FE-08 integration test for assign-admin -> invitation visibility path.
- End-to-end or manual checks:
  - Authenticated super-admin flow from logo/home through unified workspace.
  - Query-param tab state with refresh and browser back/forward.
  - Mobile menu + navigation lock validation.
- Regression coverage:
  - Header, Navigation, Router baseline suites must remain green.
  - Existing customer and invitation behaviors must remain available and functional.

## 10. Rollout and Rollback
- Deployment sequence:
  1. Ship FE foundation (`TabView` controlled mode + extraction scaffolding).
  2. Ship unified workspace and redirect.
  3. Ship assign-admin/invitation linkage behavior once API decision is finalized.
  4. Enforce CI gates and complete smoke verification.
- Rollback strategy:
  - Revert unified workspace route wiring and restore direct invitations page route behavior.
  - Revert tab-query synchronization changes if instability appears.
  - Keep navigation/header lock unchanged in rollback unless explicitly impacted.
- Post-deploy checks:
  - Verify `/super-admin/customers` and redirect from `/super-admin/invitations`.
  - Verify no `Navigation` structure drift.
  - Verify assign-admin + invitation list behavior under selected contract path.

## 11. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Assign-admin contract ambiguity delays delivery | High | High | Make BE-01 a phase-1 gate; defer FE-08 completion until decision is approved. |
| Navigation regression from shared shell edits | High | Medium | Keep FE-07 explicit no-structure-change task; require navigation/header/router test gates. |
| Redirect breaks existing expectations/bookmarks | Medium | Medium | Implement FE-06 with router tests and release notes; include rollback switch. |
| Hidden-tab over-fetch causes unnecessary load | Medium | Medium | Gate data fetching by active view; validate network behavior in QA. |
| Test flakiness during route refactor | Medium | Medium | Refactor tests incrementally; stabilize with deterministic mocks and explicit route assertions. |

## 12. Open Questions
- OQ-1: Which assign-admin strategy is approved?
  - A: Backend invitation contract extension with customer context
  - B: Frontend email-to-user resolution then existing `assignAdmin`
- OQ-2: Should invitation create be available both generically and customer-prefilled in unified UI (PRD assumption currently says both)?
- OQ-3: Keep `SuperAdminInvitations` as a standalone wrapper component (rendering unified view state) or convert fully into shared panel-only module?

## 13. Traceability Matrix

| Requirement Source | Requirement ID/Section | Planned Task IDs | Verification |
|---|---|---|---|
| `docs/technical-spec-super-admin-flow.md` | Navigation lock + header/home behavior contract | FE-07, FE-09, CC-03 | `Navigation.test.jsx`, `Header.test.jsx`, router nav assertions |
| `docs/technical-spec-super-admin-flow.md` | Regression gate expectations | FE-09, CC-03 | CI required suite enforcement |
| `tasks/prd-customer-admin-unified-workspace.md` | US-001 / FR-1..FR-4 unified entry + URL state | FE-01, FE-04, FE-05, FE-09 | Tab tests + router tests + manual deep-link checks |
| `tasks/prd-customer-admin-unified-workspace.md` | US-002 / FR-5..FR-7 customer operations parity | FE-02, FE-04, FE-09 | Customers tests + manual action checks |
| `tasks/prd-customer-admin-unified-workspace.md` | US-003 / FR-8..FR-11 invitation operations parity | FE-03, FE-04, FE-09 | Invitations tests + manual action checks |
| `tasks/prd-customer-admin-unified-workspace.md` | US-004 / FR-12..FR-13 assign->invitation visibility | FE-08, BE-01..BE-04 | Integration tests for assign + invitation list visibility |
| `tasks/prd-customer-admin-unified-workspace.md` | US-005 / FR-14 legacy route compatibility | FE-06, FE-09 | Router redirect tests and bookmark smoke test |
| `tasks/prd-customer-admin-unified-workspace.md` | US-006 / FR-16..FR-18 navigation unchanged | FE-07, FE-09, CC-03 | Navigation/router regression suite |
| `tasks/prd-customer-admin-unified-workspace.md` | FR-19 responsive usability | FE-04, FE-05, FE-09 | Manual mobile checks + table scroll behavior |
| `tasks/prd-customer-admin-unified-workspace.md` | FR-20..FR-21 toasts and step-up behavior | FE-03, FE-08, BE-05 | Existing/revised invitation and customer flow tests |
| `tasks/prd-customer-admin-unified-workspace.md` | FR-22 expanded tests | FE-09, CC-03 | Passing targeted suites in CI |
