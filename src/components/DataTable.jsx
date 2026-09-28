import { useMemo } from 'react'
import {
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})

const PAGE_SIZES = [10, 20, 50]

export function ActionsCell({ children }) {
  return <div className="whitespace-nowrap text-right">{children}</div>
}

function TablePagination({ table }) {
  const pagination = table.state.pagination
  const pageIndex = pagination?.pageIndex ?? 0
  const pageSize = pagination?.pageSize ?? 10
  const rowCount = table.getRowCount()
  if (!rowCount) return null
  const from = pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, rowCount)
  const sizes = PAGE_SIZES.includes(pageSize)
    ? PAGE_SIZES
    : [...PAGE_SIZES, pageSize].sort((a, b) => a - b)

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-slate-500">
        {from}–{to} de {rowCount}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="select select-bordered select-xs"
          onChange={(event) => table.setPageSize(Number(event.target.value))}
          value={pageSize}
        >
          {sizes.map((size) => (
            <option key={size} value={size}>
              {size} / pág.
            </option>
          ))}
        </select>
        <div className="join">
          <button
            type="button"
            className="btn btn-ghost btn-xs join-item"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.firstPage()}
          >
            «
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs join-item"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            ‹
          </button>
          <span className="join-item px-2 text-xs leading-7 text-slate-500">
            {pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-xs join-item"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            ›
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs join-item"
            disabled={!table.getCanLastPage()}
            onClick={() => table.lastPage()}
          >
            »
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DataTable({
  tableKey,
  columns,
  data,
  isPending = false,
  emptyLabel = 'No hay registros para mostrar.',
  pageSize = 10,
  initialSorting = [],
  getRowId,
}) {
  const rows = data ?? []
  const table = useTable({
    key: tableKey,
    features,
    columns,
    data: rows,
    enableSortingRemoval: false,
    getRowId,
    initialState: {
      sorting: initialSorting,
      pagination: { pageIndex: 0, pageSize },
    },
  })
  const visibleRows = table.getRowModel().rows
  const colSpan = useMemo(
    () => columns.length || 1,
    [columns],
  )

  return (
    <div className="bo-table-wrap">
      <table className="table table-sm sm:table-md">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="text-slate-400">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="whitespace-nowrap">
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button
                      type="button"
                      className="font-medium"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <table.FlexRender header={header} />
                      {{
                        asc: ' ▲',
                        desc: ' ▼',
                      }[header.column.getIsSorted()] ?? null}
                    </button>
                  ) : (
                    <table.FlexRender header={header} />
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {isPending ? (
            <tr>
              <td colSpan={colSpan}>Cargando...</td>
            </tr>
          ) : visibleRows.length === 0 ? (
            <tr>
              <td colSpan={colSpan}>{emptyLabel}</td>
            </tr>
          ) : (
            visibleRows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {row.getAllCells().map((cell) => (
                  <td key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {isPending ? null : <TablePagination table={table} />}
    </div>
  )
}
