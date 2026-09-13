import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createFlujo,
  createFlujoPaso,
  createPaso,
  deleteFlujoPaso,
  getFlujos,
  getPasos,
} from '../service/api.js'
import { tipoClienteLabel } from '../lib/venta.js'

const emptyPaso = { nombre: '', descripcion: '', flujoId: '' }

export default function ConfiguracionPage() {
  const queryClient = useQueryClient()
  const [nombreFlujo, setNombreFlujo] = useState('')
  const [tipoCliente, setTipoCliente] = useState('PERSONA')
  const [pasoForm, setPasoForm] = useState(emptyPaso)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const flujosQuery = useQuery({ queryKey: ['flujos'], queryFn: getFlujos })
  const pasosQuery = useQuery({ queryKey: ['pasos'], queryFn: getPasos })
  const flujos = flujosQuery.data ?? []
  const pasos = pasosQuery.data ?? []

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['flujos'] })
    queryClient.invalidateQueries({ queryKey: ['pasos'] })
    queryClient.invalidateQueries({ queryKey: ['tabla-ventas'] })
  }

  const createFlujoMutation = useMutation({
    mutationFn: () => createFlujo({ nombre: nombreFlujo, tipo_cliente: tipoCliente }),
    onSuccess: () => {
      setNombreFlujo('')
      setError('')
      setOk('Flujo creado.')
      invalidate()
    },
    onError: (err) => setError(err.message),
  })

  const createPasoMutation = useMutation({
    mutationFn: async () => {
      const paso = await createPaso({
        nombre: pasoForm.nombre.trim(),
        descripcion: pasoForm.descripcion.trim() || pasoForm.nombre.trim(),
      })
      if (pasoForm.flujoId) {
        const flujo = flujos.find((item) => String(item.id) === String(pasoForm.flujoId))
        const orden = (flujo?.pasos_detalle?.length ?? 0) + 1
        await createFlujoPaso({ flujo: Number(pasoForm.flujoId), paso: paso.id, orden })
      }
      return paso
    },
    onSuccess: () => {
      setPasoForm(emptyPaso)
      setError('')
      setOk('Paso creado.')
      invalidate()
    },
    onError: (err) => setError(err.message),
  })

  const addPasoMutation = useMutation({
    mutationFn: ({ flujo, paso, orden }) => createFlujoPaso({ flujo, paso, orden }),
    onSuccess: () => {
      setError('')
      setOk('Paso agregado al flujo.')
      invalidate()
    },
    onError: (err) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFlujoPaso,
    onSuccess: () => {
      setError('')
      setOk('Paso quitado del flujo.')
      invalidate()
    },
    onError: (err) => setError(err.message),
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-slate-500">
          Crea pasos y asígnalos a cada flujo. Quitar un paso lo saca del flujo y de las ventas que lo usaban.
        </p>
      </div>

      {error ? (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      ) : null}
      {ok ? (
        <div className="alert alert-success">
          <span>{ok}</span>
        </div>
      ) : null}

      <section className="bo-card p-5">
        <h2 className="mb-3 font-semibold">Crear paso</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_220px_auto]">
          <input
            className="input input-bordered"
            onChange={(event) => setPasoForm((current) => ({ ...current, nombre: event.target.value }))}
            placeholder="Nombre del paso"
            value={pasoForm.nombre}
          />
          <input
            className="input input-bordered"
            onChange={(event) => setPasoForm((current) => ({ ...current, descripcion: event.target.value }))}
            placeholder="Descripción"
            value={pasoForm.descripcion}
          />
          <select
            className="select select-bordered"
            onChange={(event) => setPasoForm((current) => ({ ...current, flujoId: event.target.value }))}
            value={pasoForm.flujoId}
          >
            <option value="">Solo catálogo</option>
            {flujos.map((flujo) => (
              <option key={flujo.id} value={flujo.id}>
                Agregar a {flujo.nombre}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn rounded-full border-none bg-blue-600 text-white hover:bg-blue-700"
            disabled={!pasoForm.nombre.trim() || createPasoMutation.isPending}
            onClick={() => createPasoMutation.mutate()}
          >
            {createPasoMutation.isPending ? 'Creando...' : 'Crear paso'}
          </button>
        </div>
        {pasos.length ? (
          <p className="mt-3 text-xs text-slate-500">
            Catálogo: {pasos.map((paso) => paso.nombre).join(' · ')}
          </p>
        ) : null}
      </section>

      <section className="bo-card p-5">
        <h2 className="mb-3 font-semibold">Nuevo flujo</h2>
        <div className="flex flex-wrap gap-3">
          <input
            className="input input-bordered min-w-56 flex-1"
            onChange={(event) => setNombreFlujo(event.target.value)}
            placeholder="Nombre del flujo"
            value={nombreFlujo}
          />
          <select
            className="select select-bordered"
            onChange={(event) => setTipoCliente(event.target.value)}
            value={tipoCliente}
          >
            <option value="PERSONA">Persona Natural</option>
            <option value="EMPRESA">Persona Jurídica</option>
          </select>
          <button
            type="button"
            className="btn rounded-full border-none bg-blue-600 text-white hover:bg-blue-700"
            disabled={!nombreFlujo || createFlujoMutation.isPending}
            onClick={() => createFlujoMutation.mutate()}
          >
            Crear flujo
          </button>
        </div>
      </section>

      {flujosQuery.isPending ? <p>Cargando flujos...</p> : null}

      {flujos.map((flujo) => {
        const ordered = [...(flujo.pasos_detalle ?? [])].sort((a, b) => a.orden - b.orden)
        const usados = new Set(ordered.map((item) => item.paso))
        const disponibles = pasos.filter((paso) => !usados.has(paso.id))
        return (
          <section key={flujo.id} className="bo-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">{flujo.nombre}</h2>
                <p className="text-sm text-slate-500">{tipoClienteLabel(flujo.tipo_cliente)}</p>
              </div>
              <select
                className="select select-bordered select-sm max-w-xs"
                disabled={!disponibles.length || addPasoMutation.isPending}
                onChange={(event) => {
                  const pasoId = Number(event.target.value)
                  if (!pasoId) return
                  addPasoMutation.mutate({
                    flujo: flujo.id,
                    paso: pasoId,
                    orden: ordered.length + 1,
                  })
                  event.target.value = ''
                }}
                value=""
              >
                <option value="">Agregar paso del catálogo</option>
                {disponibles.map((paso) => (
                  <option key={paso.id} value={paso.id}>
                    {paso.nombre}
                  </option>
                ))}
              </select>
            </div>
            {ordered.length === 0 ? (
              <p className="text-sm text-slate-500">Este flujo aún no tiene pasos.</p>
            ) : (
              <ol className="space-y-2">
                {ordered.map((item) => (
                  <li key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span>
                      {item.orden}. {item.paso_detalle?.nombre}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs text-rose-600"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(item.id)}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )
      })}
    </div>
  )
}
