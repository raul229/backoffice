import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createFlujo,
  createFlujoPaso,
  createPaso,
  deleteFlujo,
  deleteFlujoPaso,
  deletePaso,
  getFlujos,
  getPasos,
  updateFlujo,
  updatePaso,
} from '../service/api.js'
import { tipoClienteLabel } from '../lib/venta.js'
import { useAuth } from '../context/AuthContext.jsx'

const emptyPaso = { nombre: '', descripcion: '', flujoId: '' }

function confirmDelete(label) {
  return window.confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)
}

export default function ConfiguracionPage() {
  const { can } = useAuth()
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
  const canChange = can('api.change_flujo') || can('api.change_paso')
  const canDeleteFlujo = can('api.delete_flujo')
  const canDeletePaso = can('api.delete_paso')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['flujos'] })
    queryClient.invalidateQueries({ queryKey: ['pasos'] })
    queryClient.invalidateQueries({ queryKey: ['tabla-ventas'] })
  }

  const notify = (message) => {
    setOk(message)
    setError('')
    invalidate()
  }

  const createFlujoMutation = useMutation({
    mutationFn: () => createFlujo({ nombre: nombreFlujo, tipo_cliente: tipoCliente }),
    onSuccess: () => {
      setNombreFlujo('')
      notify('Flujo creado.')
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
      notify('Paso creado.')
    },
    onError: (err) => setError(err.message),
  })

  const addPasoMutation = useMutation({
    mutationFn: ({ flujo, paso, orden }) => createFlujoPaso({ flujo, paso, orden }),
    onSuccess: () => notify('Paso agregado al flujo.'),
    onError: (err) => setError(err.message),
  })

  const deleteLinkMutation = useMutation({
    mutationFn: deleteFlujoPaso,
    onSuccess: () => notify('Paso quitado del flujo.'),
    onError: (err) => setError(err.message),
  })

  const updatePasoMutation = useMutation({
    mutationFn: ({ id, payload }) => updatePaso(id, payload),
    onSuccess: () => notify('Paso actualizado.'),
    onError: (err) => setError(err.message),
  })

  const deletePasoMutation = useMutation({
    mutationFn: deletePaso,
    onSuccess: () => notify('Paso eliminado.'),
    onError: (err) => setError(err.message),
  })

  const updateFlujoMutation = useMutation({
    mutationFn: ({ id, payload }) => updateFlujo(id, payload),
    onSuccess: () => notify('Flujo actualizado.'),
    onError: (err) => setError(err.message),
  })

  const deleteFlujoMutation = useMutation({
    mutationFn: deleteFlujo,
    onSuccess: () => notify('Flujo eliminado.'),
    onError: (err) => setError(err.message),
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-slate-500">
          Puedes crear, renombrar y eliminar flujos y pasos. Si un flujo ya tiene ventas, primero elimina esas ventas.
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
      </section>

      <section className="bo-card p-5">
        <h2 className="mb-3 font-semibold">Catálogo de pasos</h2>
        {pasos.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay pasos en el catálogo.</p>
        ) : (
          <div className="space-y-2">
            {pasos.map((paso) => (
              <PasoRow
                key={paso.id}
                canChange={canChange}
                canDelete={canDeletePaso}
                deleting={deletePasoMutation.isPending}
                onDelete={() => {
                  if (confirmDelete(`el paso “${paso.nombre}”`)) {
                    deletePasoMutation.mutate(paso.id)
                  }
                }}
                onSave={(payload) => updatePasoMutation.mutate({ id: paso.id, payload })}
                paso={paso}
                saving={updatePasoMutation.isPending}
              />
            ))}
          </div>
        )}
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
          <FlujoCard
            key={flujo.id}
            addPending={addPasoMutation.isPending}
            canChange={canChange}
            canDelete={canDeleteFlujo}
            disponibles={disponibles}
            flujo={flujo}
            onAddPaso={(pasoId) =>
              addPasoMutation.mutate({
                flujo: flujo.id,
                paso: pasoId,
                orden: ordered.length + 1,
              })
            }
            onDelete={() => {
              if (confirmDelete(`el flujo “${flujo.nombre}”`)) {
                deleteFlujoMutation.mutate(flujo.id)
              }
            }}
            onRemovePaso={(id) => deleteLinkMutation.mutate(id)}
            onSave={(payload) => updateFlujoMutation.mutate({ id: flujo.id, payload })}
            ordered={ordered}
            removePending={deleteLinkMutation.isPending}
            saving={updateFlujoMutation.isPending}
          />
        )
      })}
    </div>
  )
}

function PasoRow({ paso, canChange, canDelete, onSave, onDelete, saving, deleting }) {
  const [nombre, setNombre] = useState(paso.nombre)
  const [descripcion, setDescripcion] = useState(paso.descripcion ?? '')

  useEffect(() => {
    setNombre(paso.nombre)
    setDescripcion(paso.descripcion ?? '')
  }, [paso.descripcion, paso.nombre])

  return (
    <div className="grid gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-[1fr_1fr_auto]">
      <input
        className="input input-bordered input-sm"
        disabled={!canChange}
        onChange={(event) => setNombre(event.target.value)}
        value={nombre}
      />
      <input
        className="input input-bordered input-sm"
        disabled={!canChange}
        onChange={(event) => setDescripcion(event.target.value)}
        value={descripcion}
      />
      <div className="flex gap-2">
        {canChange ? (
          <button
            type="button"
            className="btn btn-sm rounded-full border-none bg-blue-600 text-white"
            disabled={!nombre.trim() || saving}
            onClick={() => onSave({ nombre: nombre.trim(), descripcion: descripcion.trim() })}
          >
            Guardar
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm text-rose-600"
            disabled={deleting}
            onClick={onDelete}
          >
            Eliminar
          </button>
        ) : null}
      </div>
    </div>
  )
}

function FlujoCard({
  flujo,
  ordered,
  disponibles,
  canChange,
  canDelete,
  onSave,
  onDelete,
  onAddPaso,
  onRemovePaso,
  saving,
  addPending,
  removePending,
}) {
  const [nombre, setNombre] = useState(flujo.nombre)

  useEffect(() => {
    setNombre(flujo.nombre)
  }, [flujo.nombre])

  return (
    <section className="bo-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-56 flex-1 flex-wrap items-center gap-2">
          <input
            className="input input-bordered max-w-sm"
            disabled={!canChange}
            onChange={(event) => setNombre(event.target.value)}
            value={nombre}
          />
          <p className="text-sm text-slate-500">{tipoClienteLabel(flujo.tipo_cliente)}</p>
          {canChange ? (
            <button
              type="button"
              className="btn btn-sm rounded-full border-none bg-blue-600 text-white"
              disabled={!nombre.trim() || saving}
              onClick={() => onSave({ nombre: nombre.trim() })}
            >
              Guardar nombre
            </button>
          ) : null}
          {canDelete ? (
            <button type="button" className="btn btn-ghost btn-sm text-rose-600" onClick={onDelete}>
              Eliminar flujo
            </button>
          ) : null}
        </div>
        <select
          className="select select-bordered select-sm max-w-xs"
          disabled={!disponibles.length || addPending}
          onChange={(event) => {
            const pasoId = Number(event.target.value)
            if (!pasoId) return
            onAddPaso(pasoId)
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
                disabled={removePending}
                onClick={() => onRemovePaso(item.id)}
              >
                Quitar
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
