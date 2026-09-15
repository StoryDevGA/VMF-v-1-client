import { Button } from '../Button'
import { Card } from '../Card'
import { Fieldset } from '../Fieldset'
import { HorizontalScroll } from '../HorizontalScroll'
import { Table } from '../Table'
import './RegistryListView.css'

function blockClass(block, suffix) {
  return `${block}__${suffix}`
}

export function RegistryListView({
  block,
  legend,
  actions,
  filters,
  error,
  tableNote,
  table,
  status = {},
  pagination,
}) {
  const {
    isLoading = false,
    isFetching = false,
    showPostSaveRefresh = false,
    refreshMessage = 'Refreshing list...',
  } = status
  const showPostSaveRefreshState = Boolean(showPostSaveRefresh)
  const showInitialSkeleton = isLoading && !showPostSaveRefreshState
  const {
    columns,
    data,
    emptyMessage,
    emptyRefreshMessage,
    ariaLabel,
    scrollAriaLabel,
    emptyComponent,
    variant = 'striped',
    hoverable = true,
  } = table
  const {
    currentPage,
    totalPages,
    setPage,
    ariaLabel: paginationAriaLabel = 'Catalogue pagination',
  } = pagination

  return (
    <Fieldset className={`${blockClass(block, 'fieldset')} registry-list-view__fieldset`}>
      <Fieldset.Legend className="sr-only">{legend}</Fieldset.Legend>
      <Card variant="elevated" className={`${blockClass(block, 'card')} registry-list-view__card`}>
        <Card.Body className={`${blockClass(block, 'card-body')} ${blockClass(block, 'card-body--compact')} registry-list-view__card-body registry-list-view__card-body--compact`}>
          {actions ? <div className={`${blockClass(block, 'catalogue-actions')} registry-list-view__catalogue-actions`}>{actions}</div> : null}

          {filters ? <div className={`${blockClass(block, 'toolbar')} registry-list-view__toolbar`}>{filters}</div> : null}

          {error ? (
            <p className={`${blockClass(block, 'error')} registry-list-view__error`} role="alert">
              {error.message ?? error}
            </p>
          ) : null}

          {tableNote ? <p className={`${blockClass(block, 'table-note')} registry-list-view__table-note`}>{tableNote}</p> : null}

          <HorizontalScroll
            className={`${blockClass(block, 'table-wrap')} registry-list-view__table-wrap`}
            ariaLabel={scrollAriaLabel ?? `${ariaLabel} table`}
            gap="sm"
          >
            <Table
              className={`${blockClass(block, 'table')} registry-list-view__table`}
              columns={columns}
              data={data}
              loading={showInitialSkeleton}
              variant={variant}
              hoverable={hoverable}
              emptyMessage={emptyMessage}
              emptyComponent={
                emptyComponent
                  ?? (showPostSaveRefreshState ? (
                    <p className={`${blockClass(block, 'muted')} registry-list-view__muted`} role="status">
                      {emptyRefreshMessage ?? `Refreshing ${ariaLabel}...`}
                    </p>
                  ) : undefined)
              }
              ariaLabel={ariaLabel}
            />
          </HorizontalScroll>

          {isFetching && !isLoading ? (
            <p className={`${blockClass(block, 'muted')} registry-list-view__muted`}>{refreshMessage}</p>
          ) : null}

          {totalPages > 1 ? (
            <div className={`${blockClass(block, 'pagination')} registry-list-view__pagination`} role="navigation" aria-label={paginationAriaLabel}>
              <div className={`${blockClass(block, 'pagination-controls')} registry-list-view__pagination-controls`}>
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

              <p className={`${blockClass(block, 'pagination-info')} registry-list-view__pagination-info`}>
                Page {currentPage} of {totalPages}
              </p>

              <div className={`${blockClass(block, 'pagination-controls')} registry-list-view__pagination-controls`}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isFetching}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
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
          ) : null}
        </Card.Body>
      </Card>
    </Fieldset>
  )
}

export default RegistryListView
