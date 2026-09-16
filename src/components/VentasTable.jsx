import {
  createSortedRowModel,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import StatusBadge from './StatusBadge.jsx'
import {
  codigosResumen,
  formatFecha,
  nombreCliente,
  numeroVenta,
  tipoClienteLabel,
} from '../lib/venta.js'

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
})

const columns = [
  {
    id: 'numero',
    accessorFn: numeroVenta,
    header: 'N° Venta',
    cell: (info) => <span className="font-medium text-slate-700">{info.getValue()}</span>,
  },
  {
    id: 'cliente',
    accessorFn: (row) => nombreCliente(row.cliente_detalle),
    header: 'Cliente',
  },
  {
    id: 'tipo',
    accessorFn: (row) => tipoClienteLabel(row.cliente_detalle?.tipo),
    header: 'Tipo',
  },
  {
    accessorKey: 'fecha',
    header: 'Fecha registro',
    cell: (info) => formatFecha(info.getValue()),
  },
  {
    id: 'estado',
    accessorFn: (row) => row.estado,
    header: 'Estado',
    cell: (info) => <StatusBadge venta={info.row.original} />,
  },
]

export default function VentasTable({
  ventas,
  isPending,
  onOpen,
  onDelete,
  emptyLabel = 'Aún no hay ventas registradas.',
}) {
  const table = useTable({
    key: 'ventas-table',
    features,
    columns,
    data: ventas,
  })

  return (
    <div className="bo-table-wrap">
      <table className="table table-sm sm:table-md">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="text-slate-400">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="whitespace-nowrap">
                  {header.isPlaceholder ? null : (
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
          ) : table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1}>{emptyLabel}</td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
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
