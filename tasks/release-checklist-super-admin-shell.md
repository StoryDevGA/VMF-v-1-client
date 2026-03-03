# Release Checklist: Super Admin Shell Baseline

## Scope
- Feature: Super Admin Flow Alignment (Navigation + Dashboard Home Behavior)
- Source Plan: `tasks/implementation-plan-super-admin-flow.md`

## Pre-Merge Quality Gate
- [ ] Run `npm run test:shell`
- [ ] Verify no unintended edits in shell files:
  - `src/components/Header/Header.jsx`
  - `src/components/Navigation/Navigation.jsx`
  - `src/router/index.jsx`
- [ ] Confirm top-level navigation order remains:
  - `System Admin`
  - `Customer Admin`
  - `System Health`
  - `Help`
- [ ] Confirm no top-level `Dashboard` menu item exists.

## Staging Smoke Validation
- [ ] Unauthenticated header logo routes to `/app/login`.
- [ ] Customer admin authenticated logo routes to `/app/dashboard`.
- [ ] Super admin authenticated logo routes to `/super-admin/dashboard`.
- [ ] Super admin login lands on `/super-admin/dashboard`.
- [ ] Customer admin login lands on `/app/dashboard`.
- [ ] Super admin can open `System Admin` submenu and navigate to:
  - `/super-admin/system-versioning`
  - `/super-admin/license-levels`
- [ ] Super admin can open `System Health` submenu and navigate to:
  - `/super-admin/system-monitoring`
  - `/super-admin/audit-logs`
  - `/super-admin/denied-access-logs`
- [ ] `Help` remains the last top-level navigation item.

## Rollback Playbook
1. Revert the shell-related commit(s) touching:
   - `src/components/Header/*`
   - `src/components/Navigation/*`
   - `src/router/index.jsx`
2. Re-run `npm run test:shell` on the rollback candidate.
3. Redeploy frontend bundle only (no backend rollback required for this scope).
4. Re-run staging smoke validation for:
   - role-based login destinations
   - logo destination behavior
   - locked navigation ordering
