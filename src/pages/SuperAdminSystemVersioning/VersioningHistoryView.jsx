import { useMemo } from 'react'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { TableDateTime } from '../../components/TableDateTime'
import { Fieldset } from '../../components/Fieldset'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import './VersioningHistoryView.css'

export function VersioningHistoryView({
  policyHistory,
  historyCurrentPage,
  historyTotalPages,
  isHistoryLoading,
  isHistoryFetching,
  historyAppError,
  setHistoryPage,
  openEditDialog,
}) {
  const historyColumns = useMemo(
    () => [
      {
        key: 'version',
        label: 'Version',
      },
      {
        key: 'name',
        label: 'Name',
      },
      {
        key: 'isActive',
        label: 'State',
        render: (value) => (
          <Status size="sm" showIcon variant={value ? 'success' : 'neutral'}>
            {value ? 'active' : 'inactive'}
          </Status>
        ),
      },
      {
        key: 'activatedAt',
        label: 'Activated',
        width: '156px',
        render: (value) => <TableDateTime value={value} />,
      },
      {
        key: 'createdAt',
        label: 'Created',
        width: '156px',
        render: (value) => <TableDateTime value={value} />,
      },
    ],
    [],
  )

  const historyActions = useMemo(
    () => [
      {
        label: 'Edit Metadata',
        variant: 'ghost',
      },
    ],
    [],
  )

  return (
    <Fieldset className="super-admin-system-versioning__fieldset super-admin-system-versioning__fieldset--history">
      <Fieldset.Legend className="super-admin-system-versioning__legend">
        <h2 className="super-admin-system-versioning__section-title">
          Policy History
        </h2>
      </Fieldset.Legend>
      <Card variant="elevated" className="super-admin-system-versioning__card">
        <Card.Body>
          {historyAppError ? (
            <p className="super-admin-system-versioning__error" role="alert">
              {historyAppError.message}
            </p>
          ) : null}

          <HorizontalScroll
            className="super-admin-system-versioning__table-wrap"
            ariaLabel="Policy history table"
            gap="sm"
          >
            <Table
              className="super-admin-system-versioning__history-table"
              columns={historyColumns}
              data={policyHistory}
              actions={historyActions}
              onRowAction={(label, policy) => {
                if (label === 'Edit Metadata') {
                  openEditDialog(policy)
                }
              }}
              loading={isHistoryLoading}
              emptyMessage="No policy history available."
              variant="striped"
              hoverable
              ariaLabel="System versioning policy history"
            />
          </HorizontalScroll>

          {isHistoryFetching && !isHistoryLoading ? (
            <p className="super-admin-system-versioning__muted">Refreshing history...</p>
          ) : null}

          {historyTotalPages > 1 ? (
            <div className="super-admin-system-versioning__pagination" role="navigation" aria-label="Policy history pagination">
              <div className="super-admin-system-versioning__pagination-controls">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage(1)}
                  disabled={historyCurrentPage <= 1 || isHistoryFetching}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage((current) => Math.max(1, current - 1))}
                  disabled={historyCurrentPage <= 1 || isHistoryFetching}
                >
                  Previous
                </Button>
              </div>
              <p className="super-admin-system-versioning__pagination-info">
                Page {historyCurrentPage} of {historyTotalPages}
              </p>
              <div className="super-admin-system-versioning__pagination-controls">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setHistoryPage((current) => Math.min(historyTotalPages, current + 1))
                  }
                  disabled={historyCurrentPage >= historyTotalPages || isHistoryFetching}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage(historyTotalPages)}
                  disabled={historyCurrentPage >= historyTotalPages || isHistoryFetching}
                >
                  Last
                </Button>
              </div>
            </div>
          ) : null}
        </Card.Body>
      </Card>
    </Fieldset>
  )
}
