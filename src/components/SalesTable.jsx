import { sortFn_text } from '@tanstack/react-table'
import DataTable from './DataTable.jsx'

const columns = [
  {
    accessorKey: 'id',
    header: 'Venta',
    sortFn: sortFn_text,
    cell: (info) => `#${info.getValue()}`,
  },
  {
    accessorFn: (row) =>
      row.cliente_detalle?.persona
        ? `${row.cliente_detalle.persona.nombres} ${row.cliente_detalle.persona.apellidos}`
        : row.cliente_detalle?.empresa?.razon_social ?? 'Sin cliente',
    id: 'cliente',
    header: 'Cliente',
    sortFn: sortFn_text,
  },
  {
    accessorFn: (row) => row.producto_detalle?.nombre ?? 'Sin producto',
    id: 'producto',
    header: 'Producto',
    sortFn: sortFn_text,
  },
  {
    accessorFn: (row) => row.promociones_detalle?.map((promo) => promo.nombre).join(', ') || 'Sin promocion',
    id: 'promociones',
    header: 'Promociones',
    sortFn: sortFn_text,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    sortFn: sortFn_text,
  },
]

export function SalesTable({ ventas }) {
  return (
    <DataTable
      tableKey="sales-table"
      columns={columns}
      data={ventas}
      emptyLabel="Aún no hay ventas registradas. La siguiente venta aparecerá aquí."
      getRowId={(row) => String(row.id)}
    />
  )
}
