import { ESTADO_UI, estadoUi } from '../lib/venta.js'

export default function StatusBadge({ venta, estado }) {
  const key = estado ?? estadoUi(venta)
  const ui = ESTADO_UI[key] ?? ESTADO_UI.seguimiento
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${ui.className}`}>
      {ui.label}
    </span>
  )
}
