import { ESTADO_UI, PASO_ESTADO_UI, estadoUi } from '../lib/venta.js'

export default function StatusBadge({ venta, estado }) {
  const key = estado ?? estadoUi(venta)
  const ui = ESTADO_UI[key] ?? ESTADO_UI.seguimiento
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${ui.className}`}>
      {ui.label}
    </span>
  )
}

export function PasoEstadoBadge({ estado, venta }) {
  if (venta?.estado === 'ANULADO') {
    return (
      <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
        Anulada
      </span>
    )
  }
  if (venta?.estado === 'INSTALADO') {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
        Instalado
      </span>
    )
  }
  const ui = PASO_ESTADO_UI[estado] ?? {
    label: estado || '—',
    className: 'bg-slate-100 text-slate-600',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${ui.className}`}>
      {ui.label}
    </span>
  )
}
