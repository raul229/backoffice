import { useMemo } from 'react'
import {
  createSortedRowModel,
  rowSortingFeature,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import StatusBadge from './StatusBadge.jsx'
import { displayName } from '../lib/auth.js'
import {
  ESTADO_UI,
  estadoUi,
  formatFecha,
  tipoClienteLabel,
  nombreCliente,
  numeroVenta,
} from '../lib/venta.js'

function etiquetaEstado(venta) {
  return ESTADO_UI[estadoUi(venta)]?.label ?? ''
}

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})

const baseColumns = [
  {
    id: 'numero',
    accessorFn: numeroVenta,
    header: 'N° Venta',
    sortFn: sortFn_text,
    cell: (info) => <span className="font-medium text-slate-700">{info.getValue()}</span>,
  },
  {
    id: 'cliente',
    accessorFn: (row) => nombreCliente(row.cliente_detalle),
    header: 'Cliente',
    sortFn: sortFn_text,
  },
]

const asesorColumn = {
  id: 'asesor',
  accessorFn: (row) => displayName(row.creado_por_detalle),
  header: 'Asesor',
  sortFn: sortFn_text,
  cell: (info) => info.getValue() || '—',
}

const restColumns = [
  {
    id: 'tipo',
    accessorFn: (row) => tipoClienteLabel(row.cliente_detalle?.tipo),
    header: 'Tipo',
    sortFn: sortFn_text,
  },
  {
    id: 'actualizado',
    accessorFn: (row) => row.actualizado || row.fecha,
    header: 'Modificado',
    sortFn: sortFn_datetime,
    sortDescFirst: true,
    cell: (info) => formatFecha(info.getValue()),
  },
  {
    id: 'estado',
    accessorFn: etiquetaEstado,
    header: 'Estado',
    sortFn: sortFn_text,
    cell: (info) => <StatusBadge venta={info.row.original} />,
  },
]

export default function VentasTable({
  ventas,
  isPending,
  onOpen,
  onDelete,
  showAsesor = false,
  limit,
  emptyLabel = 'Aún no hay ventas registradas.',
}) {
  const columns = useMemo(
    () => [...baseColumns, ...(showAsesor ? [asesorColumn] : []), ...restColumns],
    [showAsesor],
  )
  const table = useTable({
    key: showAsesor ? 'ventas-table-asesor' : 'ventas-table',
    features,
    columns,
    data: ventas,
    enableSortingRemoval: false,
    initialState: {
      sorting: [{ id: 'actualizado', desc: true }],
    },
  })
  const rows = table.getRowModel().rows
  const visibleRows = limit ? rows.slice(0, limit) : rows

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
              <th className="text-right">Acciones</th>
            </tr>
          ))}
        </thead>
        <tbody>
          {isPending ? (
            <tr>
              <td colSpan={columns.length + 1}>Cargando ventas...</td>
            </tr>
          ) : visibleRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1}>{emptyLabel}</td>
            </tr>
          ) : (
            visibleRows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {row.getAllCells().map((cell) => (
                  <td key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
                <td className="text-right">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => onOpen(row.original)}
                  >
                    Ver
                  </button>
                  {onDelete ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs text-rose-600"
                      onClick={() => onDelete(row.original)}
                    >
                      Eliminar
                    </button>
                  ) : null}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
