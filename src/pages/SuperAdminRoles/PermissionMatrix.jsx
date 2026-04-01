import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../../components/Badge'
import { CustomSelect } from '../../components/CustomSelect'
import { Spinner } from '../../components/Spinner'
import { Toggle } from '../../components/Toggle'
import { Tooltip } from '../../components/Tooltip'
import { MdLock } from 'react-icons/md'
import './PermissionMatrix.css'

const getRoleId = (role, index) => String(role?.id ?? role?._id ?? `role-${index}`)

const EMPTY_PENDING_SET = new Set()

const getRoleDisplayName = (role) =>
  String(role?.name ?? role?.key ?? `Role`).trim() || 'Role'

const getRoleKey = (role) => String(role?.key ?? '').trim()
const normalizeRoleKey = (roleKey) => String(roleKey ?? '').trim().toUpperCase()
const normalizePermissionKey = (permissionKey) => String(permissionKey ?? '').trim().toUpperCase()

const getPermissionCellKey = (roleId, permissionKey) => `${roleId}-${permissionKey}`

const matchesPermissionSearch = (permission, search) => {
  if (!search) return true

  const searchableValue = [
    permission?.key,
    permission?.label,
    permission?.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return searchableValue.includes(search)
}

const getFilteredPermissionGroups = (permissionGroups, search) =>
  permissionGroups
    .map((group) => ({
      ...group,
      permissions: (group?.permissions ?? []).filter((permission) =>
        matchesPermissionSearch(permission, search),
      ),
    }))
    .filter((group) => group.permissions.length > 0)

const getRoleHeaderActions = ({ onEditRole, onDeleteRole }) => {
  const actions = []

  if (typeof onEditRole === 'function') {
    actions.push({ value: 'edit', label: 'Edit' })
  }

  if (typeof onDeleteRole === 'function') {
    actions.push({ value: 'delete', label: 'Delete' })
  }

  return actions
}

const getStickyTopOffset = () => {
  const appHeader = document.querySelector('.header')
  if (!appHeader) return 0
  return Math.max(0, Math.round(appHeader.getBoundingClientRect().bottom))
}

const getFixedHeaderState = (matrixElement, headerElement) => {
  const matrixRect = matrixElement.getBoundingClientRect()
  const headerHeight = Math.round(headerElement.getBoundingClientRect().height)
  const topOffset = getStickyTopOffset()
  const shouldFix =
    matrixRect.top <= topOffset && matrixRect.bottom > headerHeight + topOffset

  if (!shouldFix) {
    return {
      isFixed: false,
      left: 0,
      width: 0,
      height: headerHeight,
      top: topOffset,
    }
  }

  return {
    isFixed: true,
    left: Math.round(matrixRect.left),
    width: Math.round(matrixElement.getBoundingClientRect().width),
    height: headerHeight,
    top: topOffset,
  }
}

export const PermissionMatrix = memo(function PermissionMatrix({
  roles = [],
  permissionGroups = [],
  onToggle,
  onEditRole,
  onDeleteRole,
  disabledRoleKeys = [],
  lockedPermissionKeysByRoleKey = {},
  search = '',
  pendingToggles = EMPTY_PENDING_SET,
}) {
  const matrixRef = useRef(null)
  const headerRowRef = useRef(null)
  const [fixedHeader, setFixedHeader] = useState(() => ({
    isFixed: false,
    left: 0,
    width: 0,
    height: 0,
    top: 0,
  }))

  const normalizedSearch = String(search ?? '').trim().toLowerCase()
  const normalizedRoles = roles.map((role, index) => ({
    ...role,
    matrixRoleId: getRoleId(role, index),
  }))
  const filteredPermissionGroups = getFilteredPermissionGroups(permissionGroups, normalizedSearch)
  const disabledRoleKeySet = new Set(disabledRoleKeys.map(normalizeRoleKey))
  const lockedPermissionMap = useMemo(
    () =>
      Object.entries(lockedPermissionKeysByRoleKey).reduce((map, [roleKey, permissionKeys]) => {
        const normalizedRoleKey = normalizeRoleKey(roleKey)
        const normalizedPermissionKeys = Array.isArray(permissionKeys)
          ? permissionKeys.map(normalizePermissionKey)
          : []

        map.set(normalizedRoleKey, new Set(normalizedPermissionKeys))
        return map
      }, new Map()),
    [lockedPermissionKeysByRoleKey],
  )

  useEffect(() => {
    const matrixElement = matrixRef.current
    const headerElement = headerRowRef.current
    if (!matrixElement || !headerElement) return undefined

    const scrollContainer = matrixElement.closest('.h-scroll__track')
    let animationFrameId = 0

    const syncHeader = () => {
      const nextState = getFixedHeaderState(matrixElement, headerElement)

      setFixedHeader((previousState) => {
        if (
          previousState.isFixed === nextState.isFixed &&
          previousState.left === nextState.left &&
          previousState.width === nextState.width &&
          previousState.height === nextState.height &&
          previousState.top === nextState.top
        ) {
          return previousState
        }

        return nextState
      })
    }

    const scheduleSync = () => {
      window.cancelAnimationFrame(animationFrameId)
      animationFrameId = window.requestAnimationFrame(syncHeader)
    }

    scheduleSync()

    window.addEventListener('scroll', scheduleSync, { passive: true })
    window.addEventListener('resize', scheduleSync)
    scrollContainer?.addEventListener('scroll', scheduleSync, { passive: true })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('scroll', scheduleSync)
      window.removeEventListener('resize', scheduleSync)
      scrollContainer?.removeEventListener('scroll', scheduleSync)
    }
  }, [normalizedRoles.length, filteredPermissionGroups.length])

  if (normalizedRoles.length === 0) {
    return (
      <div className="permission-matrix permission-matrix--empty" role="region" aria-label="No roles available">
        <p className="permission-matrix__empty-title">No roles available.</p>
        <p className="permission-matrix__empty-copy">
          Roles will appear here once they are available for permission management.
        </p>
      </div>
    )
  }

  if (filteredPermissionGroups.length === 0) {
    return (
      <div className="permission-matrix permission-matrix--empty" role="region" aria-label="No permissions match search">
        <p className="permission-matrix__empty-title">No permissions match this search.</p>
        <p className="permission-matrix__empty-copy">
          Try a different permission label, key, or description.
        </p>
      </div>
    )
  }

  return (
    <section
      ref={matrixRef}
      className="permission-matrix"
      style={{ '--permission-matrix-role-count': normalizedRoles.length }}
      aria-label="Role permission matrix"
    >
      {fixedHeader.isFixed ? (
        <div
          aria-hidden="true"
          className="permission-matrix__header-spacer"
          style={{ height: `${fixedHeader.height}px` }}
        />
      ) : null}

      <div
        ref={headerRowRef}
        className={[
          'permission-matrix__header-row',
          fixedHeader.isFixed && 'permission-matrix__header-row--fixed',
        ]
          .filter(Boolean)
          .join(' ')}
        style={
          fixedHeader.isFixed
            ? {
                left: `${fixedHeader.left}px`,
                width: `${fixedHeader.width}px`,
                top: `${fixedHeader.top}px`,
              }
            : undefined
        }
      >
        <div className="permission-matrix__header-cell permission-matrix__header-cell--corner">
          <p className="permission-matrix__header-title">Permissions</p>
          <p className="permission-matrix__header-copy">
            Compare each permission row across roles and toggle access by column.
          </p>
        </div>

        {normalizedRoles.map((role) => {
          const roleKey = getRoleKey(role)
          const normalizedRoleKey = normalizeRoleKey(roleKey)
          const isDisabledRole = disabledRoleKeySet.has(normalizedRoleKey)
          const lockedPermissionSet = lockedPermissionMap.get(normalizedRoleKey)
          const hasLockedPermissions = Boolean(lockedPermissionSet?.size)
          const roleActions = !role?.isSystem
            ? getRoleHeaderActions({ onEditRole, onDeleteRole })
            : []

          return (
            <div
              key={role.matrixRoleId}
              className={[
                'permission-matrix__header-cell',
                'permission-matrix__header-cell--role',
                isDisabledRole && 'permission-matrix__header-cell--disabled',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="permission-matrix__role-topbar">
                <div className="permission-matrix__role-heading">
                  <p className="permission-matrix__role-title">{getRoleDisplayName(role)}</p>
                  {roleKey && roleKey !== getRoleDisplayName(role) ? (
                    <code className="permission-matrix__role-key">{roleKey}</code>
                  ) : null}
                </div>

                {roleActions.length > 0 ? (
                  <CustomSelect
                    value=""
                    onChange={(actionValue) => {
                      if (actionValue === 'edit') onEditRole?.(role)
                      if (actionValue === 'delete') onDeleteRole?.(role)
                    }}
                    actions={roleActions}
                    placeholder="Actions"
                    ariaLabel={`Actions for ${getRoleDisplayName(role)}`}
                    className="permission-matrix__role-actions"
                  />
                ) : null}
              </div>

              <div className="permission-matrix__role-badges">
                <Badge size="sm" variant={role?.isSystem ? 'info' : 'neutral'} pill>
                  {role?.isSystem ? 'System' : 'Custom'}
                </Badge>
                {role?.scope ? (
                  <Badge size="sm" variant="neutral" outline pill>
                    {role.scope}
                  </Badge>
                ) : null}
              </div>

              {isDisabledRole ? (
                <p className="permission-matrix__role-note">Locked</p>
              ) : hasLockedPermissions ? (
                <p className="permission-matrix__role-note">Default permissions locked</p>
              ) : null}
            </div>
          )
        })}
      </div>

      {filteredPermissionGroups.map((group) => (
        <div key={group.groupKey} className="permission-matrix__group-block">
          <div className="permission-matrix__group-row">
            <p className="permission-matrix__group-title">{group.groupLabel}</p>
          </div>

          {group.permissions.map((permission) => (
            <div
              key={`${group.groupKey}-${permission.key}`}
              className="permission-matrix__permission-row"
            >
              <div className="permission-matrix__permission-cell">
                <p className="permission-matrix__permission-label">{permission.label}</p>
                <p className="permission-matrix__permission-description">
                  {permission.description}
                </p>
                <code className="permission-matrix__permission-key">{permission.key}</code>
              </div>

              {normalizedRoles.map((role) => {
                const roleKey = getRoleKey(role)
                const normalizedRoleKey = normalizeRoleKey(roleKey)
                const roleId = role.matrixRoleId
                const isDisabledRole = disabledRoleKeySet.has(normalizedRoleKey)
                const isLockedPermission = Boolean(
                  lockedPermissionMap
                    .get(normalizedRoleKey)
                    ?.has(normalizePermissionKey(permission.key)),
                )
                const isPending = Boolean(
                  pendingToggles?.has?.(getPermissionCellKey(roleId, permission.key)),
                )
                const isChecked = Array.isArray(role?.permissions)
                  ? role.permissions.includes(permission.key)
                  : false

                return (
                  <div
                    key={`${permission.key}-${roleId}`}
                    className={[
                      'permission-matrix__toggle-cell',
                      isLockedPermission && 'permission-matrix__toggle-cell--locked',
                      isDisabledRole && 'permission-matrix__toggle-cell--disabled',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <Toggle
                      id={`permission-toggle-${roleId}-${permission.key}`}
                      checked={isChecked}
                      onChange={(event) =>
                        onToggle?.(roleId, permission.key, event.target.checked)
                      }
                      disabled={isDisabledRole || isLockedPermission || isPending}
                      size="sm"
                      aria-label={`${permission.label} for ${getRoleDisplayName(role)}`}
                    />
                    {isLockedPermission ? (
                      <Tooltip
                        content="This permission is part of the seeded SUPER_ADMIN baseline and cannot be changed."
                        position="top"
                        align="center"
                      >
                        <span
                          className="permission-matrix__lock-indicator"
                          role="img"
                          aria-label="Locked permission"
                          tabIndex={0}
                        >
                          <MdLock aria-hidden="true" />
                        </span>
                      </Tooltip>
                    ) : null}
                    {isPending ? (
                      <Spinner
                        size="sm"
                        type="circle"
                        color="inherit"
                        className="permission-matrix__spinner"
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      ))}
    </section>
  )
})

export default PermissionMatrix
