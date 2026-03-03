# Implementation Plan: Super Admin Flow Alignment

## 1. Document Control
- Feature: Super Admin Flow Alignment (Navigation + Dashboard Home Behavior)
- Source Technical Spec: `docs/technical-spec-super-admin-flow.md`
- Source PRD (Optional): `tasks/prd-super-admin-flow.md`
- Related PRD (Out of Scope): `tasks/prd-customer-admin-unified-workspace.md`
- Author: Codex (`implementation-plan` skill)
- Status: Draft
- Last Updated: 2026-03-03

## 2. Inputs and Precedence
- Technical spec path:
  - `docs/technical-spec-super-admin-flow.md`
- PRD path (optional):
  - `tasks/prd-super-admin-flow.md`
- Precedence rule applied:
  - Technical spec is authoritative for implementation constraints and shell invariants.
  - PRD is authoritative for product intent and acceptance criteria.
  - Customer/invitation workspace behavior is delegated to `tasks/prd-customer-admin-unified-workspace.md` and treated as out of scope for this plan.

## 3. Codebase and Stack Findings
- Existing patterns to reuse:
  - React 18 + Vite SPA with React Router (`createBrowserRouter`), Redux Toolkit, and RTK Query (`baseApi.injectEndpoints`).
  - Role-aware shell behavior already centralized in:
    - `src/components/Header/Header.jsx`
    - `src/components/Navigation/Navigation.jsx`
    - `src/router/index.jsx`
    - `src/components/ProtectedRoute/ProtectedRoute.jsx`
  - Existing regression suites already cover shell behavior:
    - `src/components/Header/Header.test.jsx`
    - `src/components/Navigation/Navigation.test.jsx`
    - `src/router/__tests__/router.test.jsx`
- Probable code touch points:
  - Shell + routing:
    - `src/components/Header/Header.jsx`
    - `src/components/Navigation/Navigation.jsx`
    - `src/router/index.jsx`
  - Auth/role sources:
    - `src/store/slices/authSlice.js`
    - `src/utils/authorization.js`
  - Login/dashboard entry flow:
    - `src/pages/Login/Login.jsx`
    - `src/pages/SuperAdminLogin/SuperAdminLogin.jsx`
    - `src/pages/Dashboard/Dashboard.jsx` (quick-link consistency checks)
  - Test coverage:
    - `src/components/Header/Header.test.jsx`
    - `src/components/Navigation/Navigation.test.jsx`
    - `src/router/__tests__/router.test.jsx`
    - optional: `src/pages/Login/Login.test.jsx`, `src/pages/SuperAdminLogin/SuperAdminLogin.test.jsx`
- Risks or unknowns:
  - Future customer/invitation work can accidentally drift the locked shell contract.
  - Route behavior around `/super-admin/invitations` may evolve under the dependent PRD and can collide with shell-only expectations if not explicitly bounded.
  - Auth payload shape changes (memberships/roles) can silently break role-home routing.

## 4. Scope Summary
- In scope:
  - Lock and preserve super-admin shell contract:
    - dashboard-as-home behavior by role/auth context
    - top-level nav order and submenu structure
    - help-last ordering
  - Preserve route guards and role-based access for `/super-admin/*` and `/app/*`.
  - Strengthen/maintain automated regression coverage for shell behavior.
  - Add release checks and rollback guidance for shell regressions.
- Out of scope:
  - Customer/invitation internal workflow redesign or feature expansion.
  - Backend API contract changes for customer/invitation operations.
  - Unrelated UI redesign in non-shell pages.
- Assumptions:
  - Existing navigation structure in `Navigation.jsx` is correct baseline and should remain immutable.
  - Existing auth selector and authorization helper approach remains the canonical source for role checks.
  - Customer Admin unified workspace behavior is governed by `tasks/prd-customer-admin-unified-workspace.md`.

## 5. Delivery Strategy
- Phases:
  - Phase 1: Baseline lock and gap audit
  - Phase 2: Shell parity implementation and test hardening
  - Phase 3: Release readiness and regression gates
- Critical path:
  - FE-01 -> FE-02 -> FE-03 -> FE-05 -> FE-06 -> CC-02
- Parallelizable tracks:
  - FE-04 (login/dashboard consistency checks) can run in parallel with FE-05 once FE-02/FE-03 are stable.
  - BE confirmation tasks can run in parallel with frontend test hardening.
  - Documentation and release checklist tasks can run in parallel with final regression runs.

## 6. Frontend Workstream

| Task ID | Objective | Files/Modules | Dependencies | Verification | Parallelizable |
|---|---|---|---|---|---|
| FE-01 | Establish immutable shell contract baseline (menu hierarchy, logo/home routing, role guard expectations). | `src/components/Header/Header.jsx`, `src/components/Navigation/Navigation.jsx`, `src/router/index.jsx`, spec/PRD docs | None | Baseline checklist approved by FE lead + QA. | No |
| FE-02 | Enforce role-aware logo/home behavior (unauthenticated -> `/app/login`, super-admin -> `/super-admin/dashboard`, non-super-admin authenticated -> `/app/dashboard`). | `src/components/Header/Header.jsx`, `src/components/Header/Header.test.jsx` | FE-01 | Header tests validate logo target by auth/role state. | No |
| FE-03 | Preserve and lock navigation IA: top-level order (`System Admin`, `Customer Admin`, `System Health`, `Help`) and submenu links. | `src/components/Navigation/Navigation.jsx`, `src/components/Navigation/Navigation.test.jsx` | FE-01 | Navigation tests assert order, links, and help-last requirement. | No |
| FE-04 | Validate login and dashboard entry behavior remain aligned with shell home contract. | `src/pages/Login/Login.jsx`, `src/pages/SuperAdminLogin/SuperAdminLogin.jsx`, `src/pages/Dashboard/Dashboard.jsx` (+ related tests as needed) | FE-02 | Login/super-admin-login tests and route smoke checks pass. | Yes |
| FE-05 | Confirm route-guard behavior for `/super-admin/*` and `/app/*`, including root and help aliases. | `src/router/index.jsx`, `src/router/__tests__/router.test.jsx`, `src/components/ProtectedRoute/ProtectedRoute.jsx` (if needed) | FE-02, FE-03 | Router tests pass for auth/role scenarios and `/help` + `/about`. | No |
| FE-06 | Add regression assertions to prevent shell drift from future customer-admin changes. | `src/components/Header/Header.test.jsx`, `src/components/Navigation/Navigation.test.jsx`, `src/router/__tests__/router.test.jsx` | FE-03, FE-05 | Required suites pass and fail when nav/home contract is intentionally broken. | No |
| FE-07 | Execute manual shell smoke checks across desktop/mobile menu interactions. | Runbook/checklist artifact under `tasks/` or release notes | FE-02, FE-03, FE-05 | Manual checklist completed in staging. | Yes |

## 7. Backend Workstream

| Task ID | Objective | Files/Modules | Dependencies | Verification | Parallelizable |
|---|---|---|---|---|---|
| BE-01 | Confirm no API/schema migration is required for this shell-only scope. | Backend planning notes / API contracts (external repo) | None | Backend owner sign-off recorded. | Yes |
| BE-02 | Validate auth responses continue to provide role/membership fields required by frontend routing logic. | Auth/login endpoints (external repo) | BE-01 | Auth contract check for `/auth/login` and `/auth/super-admin/login` payload shape. | Yes |
| BE-03 | Prepare rollback note confirming frontend-only rollback can be executed without backend rollback dependency. | Deployment/runbook docs | BE-01 | Release checklist includes backend dependency = none. | Yes |

## 8. Cross-Cutting Workstream

Security, observability, migration, documentation, and release engineering.

| Task ID | Objective | Files/Modules | Dependencies | Verification | Parallelizable |
|---|---|---|---|---|---|
| CC-01 | Publish requirement boundaries between this shell plan and delegated customer-admin workspace PRD. | `tasks/implementation-plan-super-admin-flow.md`, related docs | None | Product + engineering sign-off on scope boundaries. | Yes |
| CC-02 | Enforce CI gate for shell baseline suites prior to merge. | CI config / pipeline definition | FE-06 | CI blocks merge on header/navigation/router regression failures. | No |
| CC-03 | Add release checklist for shell behavior (login-home, logo-home, nav order, submenu links). | Release runbook notes | FE-07 | Staging sign-off checklist completed. | Yes |
| CC-04 | Document rollback playbook for shell regressions. | Deployment docs/changelog | FE-06 | Rollback dry run or documented command path reviewed. | Yes |

## 9. Testing and Verification Plan
- Unit tests:
  - `src/components/Header/Header.test.jsx`:
    - logo destination by auth and role
    - mobile menu close behavior on logo/link interactions
  - `src/components/Navigation/Navigation.test.jsx`:
    - top-level order and grouped submenu structure
    - help as last top-level item
- Integration tests:
  - `src/router/__tests__/router.test.jsx`:
    - root/login behavior for unauthenticated users
    - `/app/dashboard` for customer roles
    - `/super-admin/dashboard` for super admins
    - protected-route gating behavior
    - `/help` and `/about` route behavior
- End-to-end or manual checks:
  - Role-based login routing for super admin and customer admin.
  - Logo navigation from multiple authenticated routes.
  - Mobile hamburger + submenu interaction parity.
- Regression coverage:
  - Shell baseline suites (`Header`, `Navigation`, `Router`) are mandatory for any PR touching shell-related files.
  - Any changes tied to delegated customer-admin PRD must still pass this shell gate.

## 10. Rollout and Rollback
- Deployment sequence:
  1. Complete shell baseline audit and lock tests.
  2. Ship frontend shell adjustments (if any) with required test suites green.
  3. Validate staging manual checklist.
  4. Promote to production during normal release window.
- Rollback strategy:
  - Revert frontend commits touching `Header`, `Navigation`, or router contract logic.
  - Re-run required shell tests before redeploy.
  - No backend rollback expected for this scope.
- Post-deploy checks:
  - Super-admin login lands on `/super-admin/dashboard`.
  - Customer-admin login lands on `/app/dashboard`.
  - Logo returns users to role-appropriate dashboard.
  - Nav order/labels/submenus remain exactly as approved.
  - Help remains last top-level navigation item.

## 11. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Shell nav structure drifts during future customer-admin work | High | Medium | Lock with explicit regression assertions in `Navigation.test.jsx` and required CI gate. |
| Role-home routing breaks due auth payload changes | High | Medium | Add/maintain tests covering super-admin vs non-super-admin memberships and login flows. |
| Scope bleed from customer-admin PRD changes into shell plan | Medium | High | Maintain explicit boundary docs and traceability to delegated PRD. |
| Route alias regressions (`/about`, legacy links) | Medium | Medium | Keep router integration tests for public aliases and protected routes. |
| Incomplete release validation across mobile navigation states | Medium | Medium | Include mobile menu/submenu checklist in staging sign-off. |

## 12. Open Questions
- OQ-1: Should `/super-admin/invitations` behavior remain explicitly excluded from this shell plan even when route wiring changes under delegated PRD work?
- OQ-2: Should shell baseline suites be elevated to a dedicated required CI job label (for example `shell-regression`)?
- OQ-3: Is optional telemetry for logo-home and nav usage desired in this release, or explicitly deferred?

## 13. Traceability Matrix

| Requirement Source | Requirement ID/Section | Planned Task IDs | Verification |
|---|---|---|---|
| `tasks/prd-super-admin-flow.md` | US-001 Dashboard Is Home | FE-02, FE-04, FE-05 | Header tests + login/router integration checks |
| `tasks/prd-super-admin-flow.md` | US-002 Super Admin Menu Structure | FE-03, FE-06 | Navigation tests for order/submenu links/help-last |
| `tasks/prd-super-admin-flow.md` | US-003 Delegation Boundary | CC-01 | Documentation review and scope sign-off |
| `tasks/prd-super-admin-flow.md` | FR-1, FR-3 | FE-02, FE-05 | Header + router assertions for role-aware home routing |
| `tasks/prd-super-admin-flow.md` | FR-2 | FE-03, FE-06 | Navigation tests confirm no dashboard menu item |
| `tasks/prd-super-admin-flow.md` | FR-4, FR-5, FR-6, FR-7 | FE-03, FE-06 | Navigation link/label/order assertions |
| `tasks/prd-super-admin-flow.md` | FR-8 (delegated customer-admin scope) | CC-01 | Plan boundary verification against delegated PRD |
| `tasks/prd-super-admin-flow.md` | FR-9 | FE-05, BE-02 | ProtectedRoute/router checks + auth contract confirmation |
| `tasks/prd-super-admin-flow.md` | FR-10 | FE-06, CC-02 | CI-enforced shell regression suite |
| `docs/technical-spec-super-admin-flow.md` | Section 4 (Header/Navigation/Router contract) | FE-02, FE-03, FE-05 | Unit + integration suites |
| `docs/technical-spec-super-admin-flow.md` | Section 10 (Testing and Verification) | FE-06, FE-07, CC-03 | Automated test pass + staging checklist completion |

