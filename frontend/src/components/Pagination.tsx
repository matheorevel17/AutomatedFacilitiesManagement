type PaginationProps = {
  currentPage: number
  onPageChange: (page: number) => void
  pageSize: number
  totalItems: number
}

export function Pagination({ currentPage, onPageChange, pageSize, totalItems }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize)

  if (totalPages <= 1) {
    return null
  }

  return (
    <nav className="pagination" aria-label="Pagination">
      {Array.from({ length: totalPages }, (_, index) => {
        const page = index + 1

        return (
          <button
            key={page}
            type="button"
            className={page === currentPage ? 'pagination-button active' : 'pagination-button'}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        )
      })}
    </nav>
  )
}
