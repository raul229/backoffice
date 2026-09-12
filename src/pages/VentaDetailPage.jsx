import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import StatusBadge from '../components/StatusBadge.jsx'
import { getVenta, updateVentaPaso } from '../service/api.js'
import {
  documentoCliente,
  formatFecha,
  nombreCliente,
  numeroVenta,
  tipoClienteLabel,
} from '../lib/venta.js'

const PASO_ESTADOS = ['PENDIENTE', 'EN_PROCESO', 'OBSERVADO', 'SUBSANANDO', 'APROBADO', 'RECHAZADO']

function pasoColor(estado) {
  if (estado === 'APROBADO') return 'bg-emerald-500'
  if (estado === 'OBSERVADO' || estado === 'SUBSANANDO') return 'bg-orange-500'
  if (estado === 'EN_PROCESO') return 'bg-blue-500'
  if (estado === 'RECHAZADO') return 'bg-rose-500'
  return 'bg-slate-300'
}

export default function VentaDetailPage({ ventaId, onBack }) {
  const queryClient = useQueryClient()
  const { isPending, isError, error, data: venta } = useQuery({
    queryKey: ['venta', ventaId],
    queryFn: () => getVenta(ventaId),
  })

  const mutation = useMutation({
    mutationFn: ({ id, estado }) => updateVentaPaso(id, { estado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venta', ventaId] })
      queryClient.invalidateQueries({ queryKey: ['tabla-ventas'] })
    },
  })

  if (isPending) {
    return <p className="p-6">Cargando venta...</p>
  }

  if (isError) {
    return (
      <div className="alert alert-error">
        <span>{error.message}</span>
      </div>
    )
  }

  const cliente = venta.cliente_detalle
  const direccion = cliente?.direcciones?.[0]
  const pasos = [...(venta.pasos ?? [])].sort(
    (a, b) => (a.flujo_paso_detalle?.orden ?? 0) - (b.flujo_paso_detalle?.orden ?? 0),
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button type="button" className="text-sm text-blue-600" onClick={onBack}>
            ← Volver
          </button>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold">{numeroVenta(venta)}</h1>
            <StatusBadge venta={venta} />
          </div>
          <p className="text-sm text-slate-500">Registrada {formatFecha(venta.fecha)}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="bo-card p-5">
          <h2 className="mb-4 font-semibold">Información general</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-slate-400">Cliente</dt>
              <dd className="font-medium">{nombreCliente(cliente)}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Tipo</dt>
              <dd>{tipoClienteLabel(cliente?.tipo)}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Documento</dt>
              <dd>{documentoCliente(cliente) || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Celular</dt>
              <dd>{cliente?.persona?.celular || '—'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-400">Dirección</dt>
              <dd>
                {direccion
                  ? `${direccion.tipo} ${direccion.direccion} ${direccion.numero}, ${direccion.distrito}`
                  : 'Sin dirección'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="bo-card p-5">
          <h2 className="mb-4 font-semibold">Producto</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-slate-400">Plan</dt>
              <dd className="font-medium">{venta.producto_detalle?.nombre ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Velocidad</dt>
              <dd>{venta.producto_detalle?.velocidad ? `${venta.producto_detalle.velocidad} Mbps` : '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Precio</dt>
              <dd>{venta.producto_detalle?.precio ? `S/ ${venta.producto_detalle.precio}` : '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Flujo</dt>
              <dd>{venta.flujo_detalle?.nombre ?? '—'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-400">Promociones</dt>
              <dd>
                {venta.promociones_detalle?.length
                  ? venta.promociones_detalle.map((promo) => promo.nombre).join(', ')
                  : 'Sin promoción'}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="bo-card p-5">
        <h2 className="mb-4 font-semibold">Historial de la venta</h2>
        <ol className="relative ml-3 border-l border-slate-200">
          {pasos.map((paso) => {
            const nombre = paso.flujo_paso_detalle?.paso_detalle?.nombre ?? `Paso ${paso.id}`
            const descripcion = paso.flujo_paso_detalle?.paso_detalle?.descripcion
            return (
              <li key={paso.id} className="mb-6 ml-6">
                <span className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full ${pasoColor(paso.estado)}`} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{nombre}</p>
                    {descripcion ? <p className="text-sm text-slate-500">{descripcion}</p> : null}
                  </div>
                  <select
                    className="select select-bordered select-sm w-44"
                    disabled={mutation.isPending}
                    onChange={(event) => mutation.mutate({ id: paso.id, estado: event.target.value })}
                    value={paso.estado}
                  >
                    {PASO_ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
