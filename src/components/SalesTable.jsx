import { FlexRender, tableFeatures, useTable } from '@tanstack/react-table'

const features = tableFeatures({})

const columns = [
  {
    accessorKey: 'id',
    header: 'Venta',
    cell: (info) => `#${info.getValue()}`,
  },
  {
    accessorFn: (row) =>
      row.cliente_detalle?.persona
        ? `${row.cliente_detalle.persona.nombres} ${row.cliente_detalle.persona.apellidos}`
        : row.cliente_detalle?.empresa?.razon_social ?? 'Sin cliente',
    id: 'cliente',
    header: 'Cliente',
  },
  {
    accessorFn: (row) => row.producto_detalle?.nombre ?? 'Sin producto',
    id: 'producto',
    header: 'Producto',
  },
  {
    accessorFn: (row) => row.promociones_detalle?.map((promo) => promo.nombre).join(', ') || 'Sin promocion',
    id: 'promociones',
    header: 'Promociones',
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
  },
]

export function SalesTable({ ventas }) {
  const table = useTable({
    key: 'ventas-table',
    features,
    columns,
    data: ventas,
  })

  if (!ventas.length) {
    return (
      <div className="alert bg-base-100 border border-base-300">
        <span>Aun no hay ventas registradas. La siguiente venta aparecera aqui.</span>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
      <table className="table table-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder ? null : <FlexRender render={header.column.columnDef.header} props={header.getContext()} />}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getAllCells().map((cell) => (
                <td key={cell.id}>
                  <FlexRender render={cell.column.columnDef.cell} props={cell.getContext()} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
