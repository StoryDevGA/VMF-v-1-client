import { useMemo } from 'react'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Table } from '../../components/Table'
import { TableDateTime } from '../../components/TableDateTime'
import { Status } from '../../components/Status'
import { Fieldset } from '../../components/Fieldset'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { getActorDisplay } from './superAdminDeniedAccessLogs.constants.js'
import './DeniedAccessResultsView.css'

export function DeniedAccessResultsView({
  rows,
  total,
  currentPage,
  totalPages,
  isLoading,
  isFetching,
  appError,
  setPage,
}) {
  const columns = useMemo(
    () => [
      {
        key: 'createdAt',
        label: 'Timestamp',
        width: '156px',
        render: (value) => <TableDateTime value={value} />,
      },
      {
        key: 'actor',
        label: 'Actor',
        render: (_value, row) => getActorDisplay(row),
      },
      {
        key: 'action',
        label: 'Action',
        render: (value) => (
          <Status size="sm" variant="warning" showIcon>
            {value ?? 'ACCESS_DENIED'}
          </Status>
        ),
      },
      {
        key: 'resourceType',
        label: 'Resource',
        render: (value, row) =>
          value ? `${value}${row?.resourceId ? `:${row.resourceId}` : ''}` : '--',
      },
      {
        key: 'requestId',
        label: 'Request ID',
        render: (value) => value ?? '--',
      },
    ],
    [],
  )

  return (
    <Fieldset className="super-admin-denied-logs__fieldset">
      <Fieldset.Legend className="super-admin-denied-logs__legend">
        <h2 className="super-admin-denied-logs__section-title">
          Results ({total})
        </h2>
      </Fieldset.Legend>
      <Card variant="elevated" className="super-admin-denied-logs__card">
        <Card.Body>
          {appError ? (
            <p className="super-admin-denied-logs__error" role="alert">
              {appError.message}
            </p>
          ) : null}

          <HorizontalScroll
            className="super-admin-denied-logs__table-wrap"
            ariaLabel="Denied access logs table"
            gap="sm"
          >
            <Table
              className="super-admin-denied-logs__results-table"
              columns={columns}
              data={rows}
              loading={isLoading}
              hoverable
              variant="striped"
              emptyMessage="No denied-access logs found."
              ariaLabel="Denied access logs table"
            />
          </HorizontalScroll>

          <div className="super-admin-denied-logs__pagination" role="navigation" aria-label="Denied access logs pagination">
            <div className="super-admin-denied-logs__pagination-controls">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || isFetching}
                onClick={() => setPage(1)}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
            </div>
            <p className="super-admin-denied-logs__pagination-info">
              Page {currentPage} of {totalPages}
            </p>
            <div className="super-admin-denied-logs__pagination-controls">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || isFetching}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || isFetching}
                onClick={() => setPage(totalPages)}
              >
                Last
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>
    </Fieldset>
  )
}
