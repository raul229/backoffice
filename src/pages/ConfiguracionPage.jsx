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

export default function ConfiguracionPage() {
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [tipoCliente, setTipoCliente] = useState('PERSONA')
  const [error, setError] = useState('')
  const [nuevoPaso, setNuevoPaso] = useState({ flujoId: '', nombre: '', descripcion: '' })

  const flujosQuery = useQuery({ queryKey: ['flujos'], queryFn: getFlujos })
  const pasosQuery = useQuery({ queryKey: ['pasos'], queryFn: getPasos })
  const flujos = flujosQuery.data ?? []
  const pasos = pasosQuery.data ?? []

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['flujos'] })
    queryClient.invalidateQueries({ queryKey: ['pasos'] })
  }

  const createMutation = useMutation({
    mutationFn: () => createFlujo({ nombre, tipo_cliente: tipoCliente }),
    onSuccess: () => {
      setNombre('')
      setError('')
      invalidate()
    },
    onError: (err) => setError(err.message),
  })

  const addPasoMutation = useMutation({
    mutationFn: ({ flujo, paso, orden }) => createFlujoPaso({ flujo, paso, orden }),
    onSuccess: invalidate,
    onError: (err) => setError(err.message),
  })

  const createPasoMutation = useMutation({
    mutationFn: async () => {
      const paso = await createPaso({
        nombre: nuevoPaso.nombre,
        descripcion: nuevoPaso.descripcion,
      })
      const flujo = flujos.find((item) => String(item.id) === String(nuevoPaso.flujoId))
      const orden = (flujo?.pasos_detalle?.length ?? 0) + 1
      await createFlujoPaso({ flujo: Number(nuevoPaso.flujoId), paso: paso.id, orden })
    },
    onSuccess: () => {
      setNuevoPaso({ flujoId: '', nombre: '', descripcion: '' })
      setError('')
      invalidate()
    },
    onError: (err) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFlujoPaso,
    onSuccess: invalidate,
    onError: (err) => setError(err.message),
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-slate-500">
          Cada tipo de cliente tiene su flujo. Persona natural usa RUC 10; empresa usa RUC 20.
        </p>
      </div>

      {error ? (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      ) : null}

      <section className="bo-card p-5">
        <h2 className="mb-3 font-semibold">Nuevo flujo</h2>
        <div className="flex flex-wrap gap-3">
          <input
            className="input input-bordered min-w-56 flex-1"
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Nombre del flujo"
            value={nombre}
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
            disabled={!nombre || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Crear flujo
          </button>
        </div>
      </section>

      {flujos.map((flujo) => {
        const ordered = [...(flujo.pasos_detalle ?? [])].sort((a, b) => a.orden - b.orden)
        const usados = new Set(ordered.map((item) => item.paso))
        return (
          <section key={flujo.id} className="bo-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">{flujo.nombre}</h2>
                <p className="text-sm text-slate-500">{tipoClienteLabel(flujo.tipo_cliente)}</p>
              </div>
              <select
                className="select select-bordered select-sm max-w-xs"
                defaultValue=""
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
              >
                <option value="">Agregar paso existente</option>
                {pasos
                  .filter((paso) => !usados.has(paso.id))
                  .map((paso) => (
                    <option key={paso.id} value={paso.id}>
                      {paso.nombre}
                    </option>
                  ))}
              </select>
            </div>
            <ol className="space-y-2">
              {ordered.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span>
                    {item.orden}. {item.paso_detalle?.nombre}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-rose-600"
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ol>
            <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input
                className="input input-bordered input-sm"
                onChange={(event) =>
                  setNuevoPaso((current) => ({
                    ...current,
                    flujoId: flujo.id,
                    nombre: event.target.value,
                  }))
                }
                placeholder="Nuevo paso"
                value={String(nuevoPaso.flujoId) === String(flujo.id) ? nuevoPaso.nombre : ''}
              />
              <input
                className="input input-bordered input-sm"
                onChange={(event) =>
                  setNuevoPaso((current) => ({
                    ...current,
                    flujoId: flujo.id,
                    descripcion: event.target.value,
                  }))
                }
                placeholder="Descripción"
                value={String(nuevoPaso.flujoId) === String(flujo.id) ? nuevoPaso.descripcion : ''}
              />
              <button
                type="button"
                className="btn btn-sm rounded-full"
                disabled={!nuevoPaso.nombre || String(nuevoPaso.flujoId) !== String(flujo.id)}
                onClick={() => createPasoMutation.mutate()}
              >
                Añadir
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
