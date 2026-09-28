import { useMemo } from 'react'
import { sortFn_datetime, sortFn_text } from '@tanstack/react-table'
import DataTable, { ActionsCell } from './DataTable.jsx'
import { PasoEstadoBadge } from './StatusBadge.jsx'
import { displayName } from '../lib/auth.js'
import {
  formatFecha,
  nombrePaso,
  pasoActual,
  tipoClienteLabel,
  nombreCliente,
  numeroVenta,
} from '../lib/venta.js'

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
    id: 'paso',
    accessorFn: (row) => nombrePaso(pasoActual(row)) || '—',
    header: 'Paso actual',
    sortFn: sortFn_text,
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  },
  {
    id: 'estadoPaso',
    accessorFn: (row) =>
      row.estado === 'ANULADO'
        ? 'Anulada'
        : row.estado === 'INSTALADO'
          ? 'Instalado'
          : pasoActual(row)?.estado ?? '',
    header: 'Estado',
    sortFn: sortFn_text,
    cell: (info) => <PasoEstadoBadge estado={pasoActual(info.row.original)?.estado} venta={info.row.original} />,
  },
  {
    id: 'actualizado',
    accessorFn: (row) => row.actualizado || row.fecha,
    header: 'Modificado',
    sortFn: sortFn_datetime,
    sortDescFirst: true,
    cell: (info) => formatFecha(info.getValue()),
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
    () => [
      ...baseColumns,
      ...(showAsesor ? [asesorColumn] : []),
      ...restColumns,
      {
        id: 'acciones',
        header: '',
        cell: (info) => (
          <ActionsCell>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => onOpen(info.row.original)}
            >
              Ver
            </button>
            {onDelete ? (
              <button
                type="button"
                className="btn btn-ghost btn-xs text-rose-600"
                onClick={() => onDelete(info.row.original)}
              >
                Eliminar
              </button>
            ) : null}
          </ActionsCell>
        ),
      },
    ],
    [onDelete, onOpen, showAsesor],
  )

  return (
    <DataTable
      tableKey={showAsesor ? 'ventas-table-asesor' : 'ventas-table'}
      columns={columns}
      data={ventas}
      emptyLabel={emptyLabel}
      getRowId={(row) => String(row.id)}
      initialSorting={[{ id: 'actualizado', desc: true }]}
      isPending={isPending}
      pageSize={limit || 10}
    />
  )
}
