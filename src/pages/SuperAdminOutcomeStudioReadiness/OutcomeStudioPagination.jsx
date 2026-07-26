import { Button } from '../../components/Button'

export function OutcomeStudioPagination({ page, totalPages, isFetching = false, onPageChange, ariaLabel }) {
  const currentPage = Math.max(1, Number(page) || 1)
  const lastPage = Math.max(1, Number(totalPages) || 1)
  if (lastPage <= 1) return null

  return (
    <nav className="oes-readiness__pagination" aria-label={ariaLabel}>
      <div className="oes-readiness__pagination-controls">
        <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1 || isFetching} onClick={() => onPageChange(1)}>First</Button>
        <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1 || isFetching} onClick={() => onPageChange(Math.max(1, currentPage - 1))}>Previous</Button>
      </div>
      <p className="oes-readiness__pagination-info">Page {currentPage} of {lastPage}</p>
      <div className="oes-readiness__pagination-controls">
        <Button type="button" variant="outline" size="sm" disabled={currentPage >= lastPage || isFetching} onClick={() => onPageChange(Math.min(lastPage, currentPage + 1))}>Next</Button>
        <Button type="button" variant="outline" size="sm" disabled={currentPage >= lastPage || isFetching} onClick={() => onPageChange(lastPage)}>Last</Button>
      </div>
    </nav>
  )
}
