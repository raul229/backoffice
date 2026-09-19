import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext.jsx'
import Modal from '../components/Modal.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { getVenta, getFlujos, getAsesores, updateVenta, updateVentaPaso, deleteVenta, createVentaComentario } from '../service/api.js'
import { displayName } from '../lib/auth.js'
import {
  celularCliente,
  correoCliente,
  documentoCliente,
  flujosPorTipo,
  formatDireccion,
  formatFecha,
  nombreCliente,
  numeroVenta,
  tipoClienteLabel,
  VENTA_CODIGOS,
} from '../lib/venta.js'

const PASO_ESTADOS = ['PENDIENTE', 'EN_PROCESO', 'OBSERVADO', 'SUBSANANDO', 'APROBADO', 'RECHAZADO']
const VENTA_ESTADOS = ['EN_PROCESO', 'INSTALADO', 'ANULADO']

function hasValue(value) {
  return value != null && String(value).trim() !== ''
}

function InfoItem({ label, value, className = '' }) {
  if (!hasValue(value)) return null
  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <dt className="text-slate-400">{label}</dt>
      <dd className="[overflow-wrap:anywhere] font-medium">{value}</dd>
    </div>
  )
}

function CodigoField({ label, hint, value, disabled, onSave }) {
  const [draft, setDraft] = useState(value ?? '')
  useEffect(() => {
    setDraft(value ?? '')
  }, [value])

  return (
    <label className="text-sm">
      <span className="mb-1 block text-slate-400">{label}</span>
      <input
        className="input input-bordered input-sm w-full uppercase"
        disabled={disabled}
        onBlur={(event) => {
          const next = event.target.value.trim()
          if (next !== (value ?? '')) onSave(next)
        }}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        spellCheck={false}
        value={draft}
      />
      {hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  )
}

function pasoColor(estado) {
  if (estado === 'APROBADO') return 'bg-emerald-500'
  if (estado === 'OBSERVADO' || estado === 'SUBSANANDO') return 'bg-orange-500'
  if (estado === 'EN_PROCESO') return 'bg-blue-500'
  if (estado === 'RECHAZADO') return 'bg-rose-500'
  return 'bg-slate-300'
}

export default function VentaDetailPage({ ventaId, onBack, onDeleted }) {
  const { user, can } = useAuth()
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [comentario, setComentario] = useState('')
  const queryClient = useQueryClient()
  const { isPending, isError, error, data: venta } = useQuery({
    queryKey: ['venta', ventaId],
    queryFn: () => getVenta(ventaId),
  })
  const flujosQuery = useQuery({ queryKey: ['flujos'], queryFn: getFlujos })
  const canReasignar = can('api.reasignar_venta')
  const asesoresQuery = useQuery({
    queryKey: ['asesores'],
    queryFn: getAsesores,
    enabled: canReasignar,
  })

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

  const comentarioMutation = useMutation({
    mutationFn: (texto) => createVentaComentario({ venta: ventaId, texto }),
    onSuccess: () => {
      setComentario('')
      invalidate()
    },
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
  const persona = cliente?.persona
  const empresa = cliente?.empresa
  const direccion = venta.direccion_detalle
  const representante = empresa?.representante_legal_detalle
  const pasos = [...(venta.pasos ?? [])].sort(
    (a, b) => (a.flujo_paso_detalle?.orden ?? 0) - (b.flujo_paso_detalle?.orden ?? 0),
  )
  const flujos = flujosPorTipo(flujosQuery.data, cliente?.tipo)
  const canChangeVenta = can('api.change_venta')
  const canChangePaso = can('api.change_ventapaso')
  const canDeleteVenta = can('api.delete_venta')
  const canEditCodigos = can('api.change_venta_codigos')
  const canAddComentario = can('api.add_ventacomentario')
  const comentarios = venta.comentarios ?? []
  const saving =
    pasoMutation.isPending ||
    ventaMutation.isPending ||
    deleteMutation.isPending ||
    comentarioMutation.isPending
  const showVentaSelects = editing && canChangeVenta
  const showPasoSelects = editing && canChangePaso

  return (
    <>
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
              onClick={() => setConfirm({ type: 'delete' })}
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
        {VENTA_CODIGOS.filter((item) => item.primary && venta[item.key]).map((item) => (
          <span key={item.key} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {item.label} {venta[item.key]}
          </span>
        ))}
      </div>

      {ventaMutation.isError ? (
        <div className="alert alert-error">
          <span>{ventaMutation.error.message}</span>
        </div>
      ) : null}
      {comentarioMutation.isError ? (
        <div className="alert alert-error">
          <span>{comentarioMutation.error.message}</span>
        </div>
      ) : null}
      {deleteMutation.isError ? (
        <div className="alert alert-error">
          <span>{deleteMutation.error.message}</span>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="bo-card p-4 sm:p-5">
          <h2 className="mb-4 font-semibold">Información general</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2 [&>div]:min-w-0">
            <InfoItem label="Cliente" value={nombreCliente(cliente)} />
            <div>
              <dt className="mb-1 text-slate-400">Asesor</dt>
              <dd>
                {canReasignar ? (
                  <select
                    className="select select-bordered w-full"
                    disabled={saving || asesoresQuery.isPending}
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      if (!next || next === venta.creado_por) return
                      ventaMutation.mutate({ creado_por: next })
                    }}
                    value={venta.creado_por ?? ''}
                  >
                    {(asesoresQuery.data ?? [])
                      .concat(
                        venta.creado_por_detalle &&
                          !(asesoresQuery.data ?? []).some((item) => item.id === venta.creado_por)
                          ? [venta.creado_por_detalle]
                          : [],
                      )
                      .map((asesor) => (
                        <option key={asesor.id} value={asesor.id}>
                          {displayName(asesor)}
                        </option>
                      ))}
                  </select>
                ) : (
                  displayName(venta.creado_por_detalle)
                )}
              </dd>
            </div>
            {/*<InfoItem label="Tipo" value={tipoClienteLabel(cliente?.tipo)} />*/}
            <InfoItem
              label="Documento"
              value={
                cliente?.tipo === 'PERSONA' && persona?.tipo_documento
                  ? `${persona.tipo_documento} ${documentoCliente(cliente)}`
                  : documentoCliente(cliente)
              }
            />
            <InfoItem label="Celular" value={celularCliente(cliente)} />
            <InfoItem className="sm:col-span-2" label="Correo de facturación" value={correoCliente(cliente)} />
            {cliente?.tipo === 'PERSONA' ? (
              <>
                <InfoItem label="Distrito de nacimiento" value={persona?.distrito_nacimiento} />
                <InfoItem label="Padre" value={persona?.padre} />
                <InfoItem label="Madre" value={persona?.madre} />
              </>
            ) : null}
            {representante ? (
              <InfoItem
                className="col-span-2"
                label="Representante legal"
                value={`${representante.nombres} ${representante.apellidos} · ${representante.tipo_documento} ${representante.numero_documento}`}
              />
            ) : null}
            <InfoItem className="col-span-2" label="Dirección" value={direccion ? formatDireccion(direccion) : ''} />
          </dl>
        </section>

        <section className="bo-card p-4 sm:p-5">
          <h2 className="mb-4 font-semibold">Producto</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
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
                    setConfirm({ type: 'flujo', flujoId: next })
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

      {canEditCodigos ? (
      <section className="bo-card p-4 sm:p-5">
        <h2 className="mb-1 font-semibold">Códigos de seguimiento</h2>
        <p className="mb-4 text-sm text-slate-500">
          Se cargan según avanza la venta. No todas aplican: PSI, SIRO y n° de oportunidad son los más usados; el n° de
          orden sirve para seguir la instalación.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {VENTA_CODIGOS.map((item) => (
            <CodigoField
              key={item.key}
              disabled={saving}
              hint={item.hint}
              label={item.label}
              onSave={(value) => ventaMutation.mutate({ [item.key]: value })}
              value={venta[item.key]}
            />
          ))}
        </div>
      </section>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-2">
      <section className="bo-card p-4 sm:p-5">
        <h2 className="mb-4 font-semibold">Historial de la venta</h2>
        <ol className="relative ml-3 border-l border-slate-200">
          {pasos.map((paso) => {
            const nombre = paso.flujo_paso_detalle?.paso_detalle?.nombre ?? `Paso ${paso.id}`
            const descripcion = paso.flujo_paso_detalle?.paso_detalle?.descripcion
            return (
              <li key={paso.id} className="mb-6 ml-6 last:mb-0">
                <span className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full ${pasoColor(paso.estado)}`} />
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{nombre}</p>
                    {descripcion ? <p className="text-sm text-slate-500">{descripcion}</p> : null}
                  </div>
                  {showPasoSelects ? (
                  <select
                    className="select select-bordered select-sm w-36 shrink-0 sm:w-40"
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
                    <span className="shrink-0 pt-0.5 text-xs text-slate-500">{paso.estado}</span>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="bo-card flex min-h-0 flex-col p-4 sm:p-5">
        <h2 className="mb-1 font-semibold">Comentarios</h2>
        <p className="mb-4 text-sm text-slate-500">Notas para el ejecutivo y el equipo, fuera del flujo.</p>
        <div className="mb-4 max-h-72 space-y-3 overflow-y-auto">
          {comentarios.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no hay comentarios.</p>
          ) : (
            comentarios.map((item) => (
              <article key={item.id} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">
                  {displayName(item.creado_por_detalle) || 'Usuario'}
                  {item.creado_por === user?.id ? ' (tú)' : ''}
                  {' · '}
                  {formatFecha(item.fecha)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{item.texto}</p>
              </article>
            ))
          )}
        </div>
        {canAddComentario ? (
          <form
            className="mt-auto space-y-2"
            onSubmit={(event) => {
              event.preventDefault()
              const texto = comentario.trim()
              if (!texto || saving) return
              comentarioMutation.mutate(texto)
            }}
          >
            <label className="block text-sm">
              <span className="mb-1 block text-slate-400">Comentario</span>
              <textarea
                className="textarea textarea-bordered w-full text-sm"
                disabled={saving}
                maxLength={2000}
                onChange={(event) => setComentario(event.target.value)}
                placeholder="Ej. Observado por las firmas. El cliente no contesta al agendamiento."
                rows={3}
                value={comentario}
              />
            </label>
            <button
              type="submit"
              className="btn border-none bg-blue-600 text-white"
              disabled={saving || !comentario.trim()}
            >
              Agregar comentario
            </button>
          </form>
        ) : null}
      </section>
      </div>
    </Modal>
    {confirm?.type === 'delete' ? (
      <ConfirmModal
        open
        title="Eliminar venta"
        message={`¿Eliminar ${numeroVenta(venta)}? Esta acción no se puede deshacer.`}
        pending={deleteMutation.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    ) : null}
    {confirm?.type === 'flujo' ? (
      <ConfirmModal
        open
        danger={false}
        confirmLabel="Cambiar"
        title="Cambiar flujo"
        message="Cambiar el flujo recrea los pasos de esta venta. ¿Continuar?"
        pending={ventaMutation.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          ventaMutation.mutate({ flujo: confirm.flujoId })
          setConfirm(null)
        }}
      />
    ) : null}
    </>
  )
}
