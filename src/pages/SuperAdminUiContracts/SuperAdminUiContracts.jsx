import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { TableDateTime } from '../../components/TableDateTime'
import { usePostSaveListRefreshState } from '../../hooks/usePostSaveListRefreshState.js'
import { useListUiContractsQuery } from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  UI_CONTRACT_PAGE_SIZE,
  UI_CONTRACT_STATUS_OPTIONS,
  UI_CONTRACT_STATUSES,
} from './superAdminUiContracts.constants.js'
import {
  formatRuntimeControlVersionStatus,
  getRuntimeControlVersionStatusVariant,
} from '../SuperAdminRuntimePathRegistry/superAdminRuntimePathRegistry.constants.js'
import './SuperAdminUiContracts.css'

const UI_CONTRACTS_HELP_TEXT =
  'UI Contracts define framework-facing labels, help text, lifecycle copy, and action messages for runtime experiences.'

function getStatusVariant(status) {
  if (status === UI_CONTRACT_STATUSES.ACTIVE) return 'success'
  if (status === UI_CONTRACT_STATUSES.DRAFT) return 'warning'
  if (status === UI_CONTRACT_STATUSES.DEPRECATED) return 'warning'
  return 'neutral'
}

function UiContractRowActionsMenu({ row, onEdit, onClone }) {
  const options = row.isLocked
    ? [{ value: 'Clone', label: 'Clone' }]
    : [
      { value: 'Edit', label: 'Edit' },
      { value: 'Clone', label: 'Clone' },
    ]

  return (
    <div className="super-admin-ui-contracts__row-actions">
      <Select
        size="sm"
        value=""
        placeholder="Actions"
        options={options}
        onChange={(event) => {
          if (event.target.value === 'Edit') {
            onEdit(row)
          }
          if (event.target.value === 'Clone') {
            onClone(row)
          }
        }}
        aria-label={`Actions for ${row.uiContractKey}`}
      />
    </div>
  )
}

function renderNameSummary(_value, row) {
  return (
    <div className="super-admin-ui-contracts__summary">
      <span className="super-admin-ui-contracts__summary-name">{row.name}</span>
      {row.description ? (
        <span className="super-admin-ui-contracts__summary-description">{row.description}</span>
      ) : null}
    </div>
  )
}

function renderContractKey(value) {
  return <code className="super-admin-ui-contracts__key">{value}</code>
}

function renderFrameworks(value) {
  const items = Array.isArray(value) ? value : []

  if (items.length === 0) return '--'

  return (
    <div className="super-admin-ui-contracts__token-list">
      {items.slice(0, 3).map((key) => (
        <Badge key={key} size="sm" variant="info" pill outline>
          {key}
        </Badge>
      ))}
      {items.length > 3 ? (
        <Badge size="sm" variant="neutral" pill outline>
          +{items.length - 3}
        </Badge>
      ) : null}
    </div>
  )
}

function renderVersionSummary(_value, row) {
  const componentVersion = Number(row?.componentVersion) || 1
  const versionStatus = row?.versionStatus || ''
  const formattedVersionStatus = formatRuntimeControlVersionStatus(versionStatus)

  return (
    <div className="super-admin-ui-contracts__version-summary">
      <span className="super-admin-ui-contracts__version-text">v{componentVersion}</span>
      {formattedVersionStatus ? (
        <Status size="sm" showIcon variant={getRuntimeControlVersionStatusVariant(versionStatus)}>
          {formattedVersionStatus}
        </Status>
      ) : null}
      {row.isLocked ? (
        <Badge size="sm" variant="warning" pill outline>
          Locked
        </Badge>
      ) : null}
    </div>
  )
}

function renderItemCount(value, noun) {
  const count = Array.isArray(value) ? value.length : 0
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function SuperAdminUiContracts() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [frameworkKey, setFrameworkKey] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching, error } = useListUiContractsQuery({
    page,
    pageSize: UI_CONTRACT_PAGE_SIZE,
    q: search,
    status: status || undefined,
    frameworkKey: frameworkKey || undefined,
  })

  const rows = useMemo(() => data?.data ?? [], [data?.data])
  const meta = data?.meta ?? {}
  const appError = error ? normalizeError(error) : null
  const totalPages = Number(meta.totalPages ?? 1)
  const currentPage = Number(meta.page ?? page)
  const showPostSaveRefresh = usePostSaveListRefreshState(isLoading, [
    'runtimeControlSaved',
    'uiContractSaved',
  ])
  const showInitialSkeleton = isLoading && !showPostSaveRefresh

  const frameworkOptions = useMemo(() => {
    const frameworkKeys = [...new Set(rows.flatMap((row) => row.frameworkKeys ?? []))]
    return [
      { value: '', label: 'All frameworks' },
      ...frameworkKeys.map((key) => ({ value: key, label: key })),
    ]
  }, [rows])

  const handleEditContract = useCallback(
    (row) => {
      navigate(`/super-admin/runtime-control/ui-contracts/${row.id}`)
    },
    [navigate],
  )

  const handleCloneContract = useCallback(
    (row) => {
      if (!row?.id) return
      navigate(`/super-admin/runtime-control/ui-contracts/new?cloneFrom=${encodeURIComponent(row.id)}`)
    },
    [navigate],
  )

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        mobileLabel: 'Name',
        width: '260px',
        render: renderNameSummary,
      },
      {
        key: 'uiContractKey',
        label: 'Key',
        mobileLabel: 'Key',
        width: '240px',
        render: renderContractKey,
      },
      {
        key: 'frameworkKeys',
        label: 'Frameworks',
        mobileLabel: 'Frameworks',
        width: '160px',
        render: renderFrameworks,
      },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
        width: '128px',
        render: (value) => (
          <Status size="sm" showIcon variant={getStatusVariant(value)}>
            {value}
          </Status>
        ),
      },
      {
        key: 'versionStatus',
        label: 'Version',
        mobileLabel: 'Version',
        width: '136px',
        render: renderVersionSummary,
      },
      {
        key: 'sections',
        label: 'Sections',
        mobileLabel: 'Sections',
        width: '112px',
        render: (value) => renderItemCount(value, 'section'),
      },
      {
        key: 'actions',
        label: 'Action Copy',
        mobileLabel: 'Action Copy',
        width: '128px',
        render: (value) => renderItemCount(value, 'action'),
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        mobileLabel: 'Updated',
        width: '132px',
        render: (value) => <TableDateTime value={value} />,
      },
      {
        key: 'rowActions',
        label: 'Actions',
        mobileLabel: 'Actions',
        align: 'center',
        width: '164px',
        render: (_value, row) => (
          <UiContractRowActionsMenu row={row} onEdit={handleEditContract} onClone={handleCloneContract} />
        ),
      },
    ],
    [handleCloneContract, handleEditContract],
  )

  return (
    <section className="super-admin-ui-contracts container" aria-label="UI Contracts">
      <header className="super-admin-ui-contracts__header">
        <h1 className="super-admin-ui-contracts__title">UI Contracts</h1>
        <p className="super-admin-ui-contracts__subtitle">
          Manage presentation contracts for runtime sections, lifecycle labels, and governed action copy.
        </p>
      </header>

      <Fieldset className="super-admin-ui-contracts__fieldset">
        <Fieldset.Legend className="sr-only">UI Contract catalogue</Fieldset.Legend>
        <Card variant="elevated" className="super-admin-ui-contracts__card">
          <Card.Body className="super-admin-ui-contracts__card-body super-admin-ui-contracts__card-body--compact">
            <div className="super-admin-ui-contracts__catalogue-actions">
              <Button type="button" variant="outline" size="sm" onClick={() => navigate('/super-admin/runtime-control')}>
                Back
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={() => navigate('/super-admin/runtime-control/ui-contracts/new')}>
                Create
              </Button>
            </div>

            <div className="super-admin-ui-contracts__toolbar">
              <Input
                id="ui-contracts-search"
                label="Search"
                size="sm"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                fullWidth
              />
              <Select
                id="ui-contracts-status"
                label="Status"
                size="sm"
                value={status}
                options={UI_CONTRACT_STATUS_OPTIONS}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(1)
                }}
              />
              <Select
                id="ui-contracts-framework"
                label="Framework"
                size="sm"
                value={frameworkKey}
                options={frameworkOptions}
                onChange={(event) => {
                  setFrameworkKey(event.target.value)
                  setPage(1)
                }}
              />
            </div>

            {appError ? (
              <p className="super-admin-ui-contracts__error" role="alert">{appError.message}</p>
            ) : null}

            <p className="super-admin-ui-contracts__table-note">
              {UI_CONTRACTS_HELP_TEXT}
            </p>

            <HorizontalScroll
              className="super-admin-ui-contracts__table-wrap"
              ariaLabel="UI Contracts table"
              gap="sm"
            >
              <Table
                className="super-admin-ui-contracts__table"
                columns={columns}
                data={appError ? [] : rows}
                loading={showInitialSkeleton}
                variant="striped"
                hoverable
                emptyMessage="No UI Contracts found."
                emptyComponent={
                  showPostSaveRefresh ? (
                    <p className="super-admin-ui-contracts__muted" role="status">
                      Refreshing UI Contracts...
                    </p>
                  ) : undefined
                }
                ariaLabel="UI Contracts"
              />
            </HorizontalScroll>

            {isFetching && !isLoading ? (
              <p className="super-admin-ui-contracts__muted">Refreshing list...</p>
            ) : null}

            {totalPages > 1 ? (
              <div
                className="super-admin-ui-contracts__pagination"
                role="navigation"
                aria-label="UI Contracts pagination"
              >
                <div className="super-admin-ui-contracts__pagination-controls">
                  <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1 || isFetching} onClick={() => setPage(1)}>
                    First
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1 || isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                    Previous
                  </Button>
                </div>

                <p className="super-admin-ui-contracts__pagination-info">
                  Page {currentPage} of {totalPages}
                </p>

                <div className="super-admin-ui-contracts__pagination-controls">
                  <Button type="button" variant="outline" size="sm" disabled={currentPage >= totalPages || isFetching} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                    Next
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={currentPage >= totalPages || isFetching} onClick={() => setPage(totalPages)}>
                    Last
                  </Button>
                </div>
              </div>
            ) : null}
          </Card.Body>
        </Card>
      </Fieldset>
    </section>
  )
}

export default SuperAdminUiContracts
