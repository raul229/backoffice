export function nombreCliente(cliente) {
  if (!cliente) return 'Sin cliente'
  if (cliente.tipo === 'PERSONA' && cliente.persona) {
    return `${cliente.persona.nombres} ${cliente.persona.apellidos}`
  }
  return cliente.empresa?.razon_social ?? 'Sin cliente'
}

export function tipoClienteLabel(tipo) {
  return tipo === 'EMPRESA' ? 'Persona Jurídica' : 'Persona Natural'
}

export function flujosPorTipo(flujos, tipo) {
  return (flujos ?? []).filter((flujo) => flujo.tipo_cliente === tipo)
}

export function productosPorTipo(productos, tipo) {
  return (productos ?? []).filter((producto) => producto.tipo_cliente === tipo)
}

export const VENTA_CODIGOS = [
  { key: 'psi', label: 'PSI', primary: true },
  { key: 'siro', label: 'SIRO', primary: true },
  { key: 'numero_oportunidad', label: 'N° oportunidad', primary: true },
  { key: 'numero_orden', label: 'N° orden', primary: true },
  { key: 'oit', label: 'OIT' },
  { key: 'cotizacion', label: 'Cotización' },
  { key: 'contrato', label: 'Contrato' },
  { key: 'numero_fijo', label: 'N° fijo', hint: 'Teléfono fijo reservado, si el producto lo requiere' },
]

export function codigosResumen(venta) {
  return VENTA_CODIGOS.filter((item) => venta?.[item.key])
    .map((item) => `${item.label} ${venta[item.key]}`)
    .join(' · ')
}

export function celularCliente(cliente) {
  if (!cliente) return ''
  if (cliente.tipo === 'EMPRESA') {
    return cliente.empresa?.representante_legal_detalle?.celular ?? ''
  }
  return cliente.persona?.celular ?? ''
}

export function correoCliente(cliente) {
  return cliente?.correo ?? ''
}

export function documentoCliente(cliente) {
  if (!cliente) return ''
  if (cliente.tipo === 'EMPRESA') return cliente.empresa?.ruc ?? ''
  return cliente.persona?.numero_documento ?? ''
}

export function formatDireccion(direccion) {
  if (!direccion) return 'Sin dirección'
  const extras = [
    direccion.piso && `PISO ${direccion.piso}`,
    direccion.interior && `INT. ${direccion.interior}`,
    direccion.tienda && `TIENDA ${direccion.tienda}`,
    direccion.galeria && `GAL. ${direccion.galeria}`,
    direccion.urbanizacion && `URB. ${direccion.urbanizacion}`,
    direccion.referencia,
  ].filter(Boolean)
  const base = `${direccion.tipo} ${direccion.direccion} ${direccion.numero}, ${direccion.distrito}`
  return extras.length ? `${base} · ${extras.join(' · ')}` : base
}

export function numeroVenta(venta) {
  const year = venta.fecha ? new Date(venta.fecha).getFullYear() : new Date().getFullYear()
  return `V-${year}-${String(venta.id).padStart(4, '0')}`
}

export function formatFecha(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function estadoUi(venta) {
  const pasos = venta.pasos ?? []
  if (pasos.some((paso) => paso.estado === 'OBSERVADO' || paso.estado === 'SUBSANANDO')) {
    return 'observacion'
  }
  if (venta.estado === 'ANULADO') return 'anulada'
  if (venta.estado === 'INSTALADO') return 'aprobada'
  if (pasos.length > 0 && pasos.every((paso) => paso.estado === 'APROBADO')) {
    return 'aprobada'
  }
  const enProceso = pasos.find((paso) => paso.estado === 'EN_PROCESO')
  const nombrePaso = enProceso?.flujo_paso_detalle?.paso_detalle?.nombre?.toLowerCase() ?? ''
  if (nombrePaso.includes('evaluacion') || nombrePaso.includes('valid')) return 'validacion'
  return 'seguimiento'
}

export const ESTADO_UI = {
  validacion: { label: 'En validación', className: 'bg-amber-100 text-amber-700' },
  aprobada: { label: 'Instalado', className: 'bg-emerald-100 text-emerald-700' },
  observacion: { label: 'Observación', className: 'bg-orange-100 text-orange-700' },
  seguimiento: { label: 'En seguimiento', className: 'bg-violet-100 text-violet-700' },
  anulada: { label: 'Anulada', className: 'bg-rose-100 text-rose-700' },
}

export function formatDuracion(ms) {
  if (!ms || ms < 0) return '—'
  const minutes = Math.round(ms / 60000)
  if (minutes < 60) return `${Math.max(minutes, 1)} min`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h`
  return `${Math.round(hours / 24)} d`
}

function inSameDay(date, ref) {
  return (
    date.getFullYear() === ref.getFullYear() &&
    date.getMonth() === ref.getMonth() &&
    date.getDate() === ref.getDate()
  )
}

export function computeKpis(ventas) {
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startYesterday = new Date(startToday)
  startYesterday.setDate(startYesterday.getDate() - 1)
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const delMes = ventas.filter((venta) => new Date(venta.fecha) >= startMonth)
  const mesAnterior = ventas.filter((venta) => {
    const fecha = new Date(venta.fecha)
    return fecha >= startPrevMonth && fecha < startMonth
  })
  const hoy = ventas.filter((venta) => new Date(venta.fecha) >= startToday)
  const ayer = ventas.filter((venta) => {
    const fecha = new Date(venta.fecha)
    return fecha >= startYesterday && fecha < startToday
  })
  const observacion = ventas.filter((venta) => estadoUi(venta) === 'observacion')
  const observacionAyer = ventas.filter(
    (venta) => estadoUi(venta) === 'observacion' && inSameDay(new Date(venta.fecha), startYesterday),
  )

  const muestra = ventas.filter((venta) => venta.estado === 'INSTALADO')
  const base = muestra.length ? muestra : ventas
  const promedio =
    base.length === 0
      ? 0
      : base.reduce((acc, venta) => acc + (now.getTime() - new Date(venta.fecha).getTime()), 0) /
        base.length

  const deltaPct = (current, previous) => {
    if (!previous) return current ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  return {
    delMes: delMes.length,
    deltaMes: deltaPct(delMes.length, mesAnterior.length),
    hoy: hoy.length,
    deltaHoy: deltaPct(hoy.length, ayer.length),
    tiempoPromedio: formatDuracion(promedio),
    observacion: observacion.length,
    deltaObservacion: observacion.length - observacionAyer.length,
  }
}

export function matchesSearch(venta, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const cliente = venta.cliente_detalle
  const haystack = [
    numeroVenta(venta),
    String(venta.id),
    nombreCliente(cliente),
    documentoCliente(cliente),
    correoCliente(cliente),
    venta.producto_detalle?.nombre,
    venta.estado,
    venta.creado_por_detalle?.username,
    `${venta.creado_por_detalle?.first_name ?? ''} ${venta.creado_por_detalle?.last_name ?? ''}`.trim(),
    ...VENTA_CODIGOS.map((item) => venta[item.key]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export function filterVentas(ventas, filters) {
  return ventas.filter((venta) => {
    if (!matchesSearch(venta, filters.search ?? '')) return false
    if (filters.estado && filters.estado !== 'TODOS') {
      if (filters.estado === 'OBSERVACION') {
        if (estadoUi(venta) !== 'observacion') return false
      } else if (filters.estado === 'INSTALADO') {
        if (estadoUi(venta) !== 'aprobada') return false
      } else if (venta.estado !== filters.estado) {
        return false
      }
    }
    if (filters.tipo && filters.tipo !== 'TODOS' && venta.cliente_detalle?.tipo !== filters.tipo) {
      return false
    }
    if (filters.desde) {
      if (new Date(venta.fecha) < new Date(`${filters.desde}T00:00:00`)) return false
    }
    if (filters.hasta) {
      if (new Date(venta.fecha) > new Date(`${filters.hasta}T23:59:59`)) return false
    }
    return true
  })
}
