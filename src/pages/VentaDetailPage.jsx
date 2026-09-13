import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext.jsx'
import Modal from '../components/Modal.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { getVenta, getFlujos, updateVenta, updateVentaPaso, deleteVenta } from '../service/api.js'
import {
  celularCliente,
  documentoCliente,
  flujosPorTipo,
  formatFecha,
  nombreCliente,
  numeroVenta,
  tipoClienteLabel,
} from '../lib/venta.js'

const PASO_ESTADOS = ['PENDIENTE', 'EN_PROCESO', 'OBSERVADO', 'SUBSANANDO', 'APROBADO', 'RECHAZADO']
const VENTA_ESTADOS = ['EN_PROCESO', 'INSTALADO', 'ANULADO']

function pasoColor(estado) {
  if (estado === 'APROBADO') return 'bg-emerald-500'
  if (estado === 'OBSERVADO' || estado === 'SUBSANANDO') return 'bg-orange-500'
  if (estado === 'EN_PROCESO') return 'bg-blue-500'
  if (estado === 'RECHAZADO') return 'bg-rose-500'
  return 'bg-slate-300'
}

export default function VentaDetailPage({ ventaId, onBack, onDeleted }) {
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  const queryClient = useQueryClient()
  const { isPending, isError, error, data: venta } = useQuery({
    queryKey: ['venta', ventaId],
    queryFn: () => getVenta(ventaId),
  })
  const flujosQuery = useQuery({ queryKey: ['flujos'], queryFn: getFlujos })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['venta', ventaId] })
    queryClient.invalidateQueries({ queryKey: ['tabla-ventas'] })
  }

  const pasoMutation = useMutation({
    mutationFn: ({ id, estado }) => updateVentaPaso(id, { estado }),
    onSuccess: invalidate,
  })

  const ventaMutation = useMutation({
    mutationFn: (payload) => updateVenta(ventaId, payload),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteVenta(ventaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabla-ventas'] })
      onDeleted?.()
    },
  })

  if (isPending) {
    return (
      <Modal open title="Venta" onClose={onBack}>
        <p>Cargando venta...</p>
      </Modal>
    )
  }

  if (isError) {
    return (
      <Modal open title="Venta" onClose={onBack}>
        <div className="alert alert-error">
          <span>{error.message}</span>
        </div>
      </Modal>
    )
  }

  const cliente = venta.cliente_detalle
  const direccion = cliente?.direcciones?.[0]
  const representante = cliente?.empresa?.representante_legal_detalle
  const pasos = [...(venta.pasos ?? [])].sort(
    (a, b) => (a.flujo_paso_detalle?.orden ?? 0) - (b.flujo_paso_detalle?.orden ?? 0),
  )
  const flujos = flujosPorTipo(flujosQuery.data, cliente?.tipo)
  const canChangeVenta = can('api.change_venta')
  const canChangePaso = can('api.change_ventapaso')
  const canDeleteVenta = can('api.delete_venta')
  const saving = pasoMutation.isPending || ventaMutation.isPending || deleteMutation.isPending
  const showVentaSelects = editing && canChangeVenta
  const showPasoSelects = editing && canChangePaso

  return (
    <Modal
      open
      wide
      title={numeroVenta(venta)}
      onClose={onBack}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            Cerrar
          </button>
          {canDeleteVenta ? (
            <button
              type="button"
              className="btn btn-ghost text-rose-600"
              disabled={saving}
              onClick={() => {
                if (window.confirm(`¿Eliminar ${numeroVenta(venta)}?`)) {
                  deleteMutation.mutate()
                }
              }}
            >
              Eliminar
            </button>
          ) : null}
          {canChangeVenta || canChangePaso ? (
            editing ? (
              <button type="button" className="btn border-none bg-blue-600 text-white" onClick={() => setEditing(false)}>
                Listo
              </button>
            ) : (
              <button type="button" className="btn border-none bg-blue-600 text-white" onClick={() => setEditing(true)}>
                Editar
              </button>
            )
          ) : null}
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge venta={venta} />
        <p className="text-sm text-slate-500">Registrada {formatFecha(venta.fecha)}</p>
      </div>

      {ventaMutation.isError ? (
        <div className="alert alert-error">
          <span>{ventaMutation.error.message}</span>
        </div>
      ) : null}
      {deleteMutation.isError ? (
        <div className="alert alert-error">
          <span>{deleteMutation.error.message}</span>
        </div>
      ) : null}

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
              <dd>{celularCliente(cliente) || '—'}</dd>
            </div>
            {representante ? (
              <div className="col-span-2">
                <dt className="text-slate-400">Representante legal</dt>
                <dd>
                  {representante.nombres} {representante.apellidos} · {representante.tipo_documento}{' '}
                  {representante.numero_documento}
                </dd>
              </div>
            ) : null}
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
              <dt className="mb-1 text-slate-400">Estado</dt>
              <dd>
                {showVentaSelects ? (
                  <select
                    className="select select-bordered w-full"
                    disabled={saving}
                    onChange={(event) => ventaMutation.mutate({ estado: event.target.value })}
                    value={venta.estado}
                  >
                    {VENTA_ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                ) : (
                  venta.estado
                )}
              </dd>
            </div>
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
            <div className="col-span-2">
              <dt className="mb-1 text-slate-400">Flujo</dt>
              <dd>
                {showVentaSelects ? (
                <select
                  className="select select-bordered w-full"
                  disabled={saving}
                  onChange={(event) => {
                    const next = Number(event.target.value)
                    if (next === venta.flujo) return
                    if (
                      window.confirm(
                        'Cambiar el flujo recrea los pasos de esta venta. ¿Continuar?',
                      )
                    ) {
                      ventaMutation.mutate({ flujo: next })
                    }
                  }}
                  value={venta.flujo}
                >
                  {flujos.map((flujo) => (
                    <option key={flujo.id} value={flujo.id}>
                      {flujo.nombre}
                    </option>
                  ))}
                </select>
                ) : (
                  venta.flujo_detalle?.nombre ?? '—'
                )}
              </dd>
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
                  {showPasoSelects ? (
                  <select
                    className="select select-bordered select-sm w-44"
                    disabled={saving}
                    onChange={(event) => pasoMutation.mutate({ id: paso.id, estado: event.target.value })}
                    value={paso.estado}
                  >
                    {PASO_ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                  ) : (
                    <span className="text-xs text-slate-500">{paso.estado}</span>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </section>
    </Modal>
  )
}
