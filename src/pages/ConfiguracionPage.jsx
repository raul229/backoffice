import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Field from '../components/Field.jsx'
import { SelectField, TextAreaField, TextField } from '../components/FormFields.jsx'
import { createFlujoSchema, flujoNombreSchema, pasoFormSchema, withSchema } from '../lib/schemas.js'
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
import Modal from '../components/Modal.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'

export default function ConfiguracionPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)
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

  const close = () => setModal(null)

  const createPasoMutation = useMutation({
    mutationFn: async (form) => {
      const paso = await createPaso({
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || form.nombre.trim(),
      })
      if (form.flujoId) {
        const flujo = flujos.find((item) => String(item.id) === String(form.flujoId))
        const orden = (flujo?.pasos_detalle?.length ?? 0) + 1
        await createFlujoPaso({ flujo: Number(form.flujoId), paso: paso.id, orden })
      }
      return paso
    },
    onSuccess: () => {
      notify('Paso creado.')
      close()
    },
    onError: (err) => setError(err.message),
  })

  const createFlujoMutation = useMutation({
    mutationFn: (form) => createFlujo(form),
    onSuccess: () => {
      notify('Flujo creado.')
      close()
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
    onSuccess: () => {
      notify('Paso actualizado.')
      close()
    },
    onError: (err) => setError(err.message),
  })

  const deletePasoMutation = useMutation({
    mutationFn: deletePaso,
    onSuccess: () => {
      notify('Paso eliminado.')
      close()
      setConfirm(null)
    },
    onError: (err) => setError(err.message),
  })

  const updateFlujoMutation = useMutation({
    mutationFn: ({ id, payload }) => updateFlujo(id, payload),
    onSuccess: () => {
      notify('Flujo actualizado.')
      close()
    },
    onError: (err) => setError(err.message),
  })

  const deleteFlujoMutation = useMutation({
    mutationFn: deleteFlujo,
    onSuccess: () => {
      notify('Flujo eliminado.')
      close()
      setConfirm(null)
    },
    onError: (err) => setError(err.message),
  })

  const selectedPaso = pasos.find((paso) => paso.id === modal?.id)
  const selectedFlujo = flujos.find((flujo) => flujo.id === modal?.id)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-sm text-slate-500">
            Los flujos y pasos se consultan y editan en un modal para evitar cambios accidentales.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-sm rounded-full border-none bg-blue-600 text-white"
            onClick={() => setModal({ type: 'create-paso' })}
          >
            Nuevo paso
          </button>
          <button
            type="button"
            className="btn btn-sm rounded-full border-none bg-blue-600 text-white"
            onClick={() => setModal({ type: 'create-flujo' })}
          >
            Nuevo flujo
          </button>
        </div>
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

      <section className="bo-card overflow-x-auto p-5">
        <h2 className="mb-3 font-semibold">Catálogo de pasos</h2>
        {pasos.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay pasos en el catálogo.</p>
        ) : (
          <table className="table">
            <thead>
              <tr className="text-slate-400">
                <th>Paso</th>
                <th>Descripción</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pasos.map((paso) => (
                <tr key={paso.id}>
                  <td className="font-medium">{paso.nombre}</td>
                  <td className="max-w-md truncate text-sm text-slate-500">{paso.descripcion}</td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setModal({ type: 'paso', id: paso.id, editing: false })}
                    >
                      Ver
                    </button>
                    {canChange ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => setModal({ type: 'paso', id: paso.id, editing: true })}
                      >
                        Editar
                      </button>
                    ) : null}
                    {canDeletePaso ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs text-rose-600"
                        onClick={() =>
                          setConfirm({
                            title: 'Eliminar paso',
                            message: `¿Eliminar el paso “${paso.nombre}”? Esta acción no se puede deshacer.`,
                            run: () => deletePasoMutation.mutate(paso.id),
                          })
                        }
                      >
                        Eliminar
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {flujosQuery.isPending ? <p>Cargando flujos...</p> : null}

      <section className="bo-card overflow-x-auto p-5">
        <h2 className="mb-3 font-semibold">Flujos</h2>
        {flujos.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay flujos.</p>
        ) : (
          <table className="table">
            <thead>
              <tr className="text-slate-400">
                <th>Flujo</th>
                <th>Tipo</th>
                <th>Pasos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {flujos.map((flujo) => {
                const ordered = [...(flujo.pasos_detalle ?? [])].sort((a, b) => a.orden - b.orden)
                return (
                  <tr key={flujo.id}>
                    <td className="font-medium">{flujo.nombre}</td>
                    <td>{tipoClienteLabel(flujo.tipo_cliente)}</td>
                    <td className="text-sm text-slate-500">
                      {ordered.length
                        ? ordered.map((item) => item.paso_detalle?.nombre).join(' → ')
                        : 'Sin pasos'}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => setModal({ type: 'flujo', id: flujo.id, editing: false })}
                      >
                        Ver
                      </button>
                      {canChange ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => setModal({ type: 'flujo', id: flujo.id, editing: true })}
                        >
                          Editar
                        </button>
                      ) : null}
                      {canDeleteFlujo ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-rose-600"
                          onClick={() =>
                            setConfirm({
                              title: 'Eliminar flujo',
                              message: `¿Eliminar el flujo “${flujo.nombre}”? Esta acción no se puede deshacer.`,
                              run: () => deleteFlujoMutation.mutate(flujo.id),
                            })
                          }
                        >
                          Eliminar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {confirm ? (
        <ConfirmModal
          open
          title={confirm.title}
          message={confirm.message}
          pending={deletePasoMutation.isPending || deleteFlujoMutation.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() => confirm.run()}
        />
      ) : null}

      {modal?.type === 'create-paso' ? (
        <PasoFormModal
          flujos={flujos}
          onClose={close}
          onSave={(form) => createPasoMutation.mutate(form)}
          pending={createPasoMutation.isPending}
        />
      ) : null}

      {modal?.type === 'paso' && selectedPaso ? (
        <PasoFormModal
          editing={modal.editing}
          onClose={close}
          onDelete={() =>
            setConfirm({
              title: 'Eliminar paso',
              message: `¿Eliminar el paso “${selectedPaso.nombre}”? Esta acción no se puede deshacer.`,
              run: () => deletePasoMutation.mutate(selectedPaso.id),
            })
          }
          onSave={(form) =>
            updatePasoMutation.mutate({
              id: selectedPaso.id,
              payload: { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() },
            })
          }
          paso={selectedPaso}
          pending={updatePasoMutation.isPending}
        />
      ) : null}

      {modal?.type === 'create-flujo' ? (
        <CreateFlujoModal
          onClose={close}
          onSave={(form) => createFlujoMutation.mutate(form)}
          pending={createFlujoMutation.isPending}
        />
      ) : null}

      {modal?.type === 'flujo' && selectedFlujo ? (
        <FlujoModal
          addPending={addPasoMutation.isPending}
          editing={modal.editing}
          flujo={selectedFlujo}
          onAddPaso={(pasoId) => {
            const ordered = [...(selectedFlujo.pasos_detalle ?? [])]
            addPasoMutation.mutate({
              flujo: selectedFlujo.id,
              paso: pasoId,
              orden: ordered.length + 1,
            })
          }}
          onClose={close}
          onDelete={() =>
            setConfirm({
              title: 'Eliminar flujo',
              message: `¿Eliminar el flujo “${selectedFlujo.nombre}”? Esta acción no se puede deshacer.`,
              run: () => deleteFlujoMutation.mutate(selectedFlujo.id),
            })
          }
          onRemovePaso={(id) => deleteLinkMutation.mutate(id)}
          onSave={(nombre) =>
            updateFlujoMutation.mutate({ id: selectedFlujo.id, payload: { nombre } })
          }
          pasos={pasos}
          pending={updateFlujoMutation.isPending}
          removePending={deleteLinkMutation.isPending}
        />
      ) : null}
    </div>
  )
}

function PasoFormModal({ paso, flujos, editing = true, onClose, onSave, onDelete, pending }) {
  const isCreate = !paso
  const form = useForm({
    defaultValues: {
      nombre: paso?.nombre ?? '',
      descripcion: paso?.descripcion ?? '',
      flujoId: '',
    },
    validators: withSchema(pasoFormSchema),
    onSubmit: ({ value }) => onSave({ nombre: value.nombre, descripcion: value.descripcion, flujoId: value.flujoId }),
  })

  useEffect(() => {
    form.reset({
      nombre: paso?.nombre ?? '',
      descripcion: paso?.descripcion ?? '',
      flujoId: '',
    })
  }, [form, paso])

  return (
    <Modal
      open
      title={isCreate ? 'Nuevo paso' : editing ? `Editar paso` : `Paso: ${paso.nombre}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          {editing && onDelete ? (
            <button type="button" className="btn btn-ghost text-rose-600" onClick={onDelete}>
              Eliminar
            </button>
          ) : null}
          {editing ? (
            <form.Subscribe selector={(state) => [state.values.nombre, state.isSubmitting]}>
              {([nombre, isSubmitting]) => (
                <button
                  type="button"
                  className="btn border-none bg-blue-600 text-white"
                  disabled={!nombre.trim() || pending || isSubmitting}
                  onClick={() => form.handleSubmit()}
                >
                  {isCreate ? 'Crear' : 'Guardar'}
                </button>
              )}
            </form.Subscribe>
          ) : null}
        </>
      }
    >
      <div className="grid gap-3">
        {editing ? (
          <Field form={form} name="nombre">
            {(field) => <TextField field={field} label="Nombre" />}
          </Field>
        ) : (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Nombre</span>
            <p className="font-medium">{paso.nombre}</p>
          </label>
        )}
        {editing ? (
          <Field form={form} name="descripcion">
            {(field) => <TextAreaField field={field} label="Descripción" />}
          </Field>
        ) : (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Descripción</span>
            <p>{paso.descripcion || '—'}</p>
          </label>
        )}
        {isCreate ? (
          <Field form={form} name="flujoId">
            {(field) => (
              <SelectField
                field={field}
                label="Agregar a un flujo (opcional)"
                options={(flujos ?? []).map((flujo) => ({
                  value: String(flujo.id),
                  label: flujo.nombre,
                }))}
                placeholder="Solo catálogo"
              />
            )}
          </Field>
        ) : null}
      </div>
    </Modal>
  )
}

function CreateFlujoModal({ onClose, onSave, pending }) {
  const form = useForm({
    defaultValues: { nombre: '', tipo_cliente: 'PERSONA' },
    validators: withSchema(createFlujoSchema),
    onSubmit: ({ value }) => onSave({ nombre: value.nombre.trim(), tipo_cliente: value.tipo_cliente }),
  })
  return (
    <Modal
      open
      title="Nuevo flujo"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <form.Subscribe selector={(state) => [state.values.nombre, state.isSubmitting]}>
            {([nombre, isSubmitting]) => (
              <button
                type="button"
                className="btn border-none bg-blue-600 text-white"
                disabled={!nombre.trim() || pending || isSubmitting}
                onClick={() => form.handleSubmit()}
              >
                Crear
              </button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <div className="grid gap-3">
        <Field form={form} name="nombre">
          {(field) => <TextField field={field} label="Nombre" />}
        </Field>
        <Field form={form} name="tipo_cliente">
          {(field) => (
            <SelectField
              field={field}
              includeEmpty={false}
              label="Tipo de cliente"
              options={[
                { value: 'PERSONA', label: 'Persona Natural' },
                { value: 'EMPRESA', label: 'Persona Jurídica' },
              ]}
            />
          )}
        </Field>
      </div>
    </Modal>
  )
}

function FlujoModal({
  flujo,
  pasos,
  editing,
  onClose,
  onSave,
  onDelete,
  onAddPaso,
  onRemovePaso,
  pending,
  addPending,
  removePending,
}) {
  const form = useForm({
    defaultValues: { nombre: flujo.nombre },
    validators: withSchema(flujoNombreSchema),
    onSubmit: ({ value }) => onSave(value.nombre.trim()),
  })
  const ordered = [...(flujo.pasos_detalle ?? [])].sort((a, b) => a.orden - b.orden)
  const usados = new Set(ordered.map((item) => item.paso))
  const disponibles = pasos.filter((paso) => !usados.has(paso.id))

  useEffect(() => {
    form.reset({ nombre: flujo.nombre })
  }, [form, flujo.nombre])

  return (
    <Modal
      open
      wide
      title={editing ? `Editar flujo` : `Flujo: ${flujo.nombre}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          {editing ? (
            <>
              <button type="button" className="btn btn-ghost text-rose-600" onClick={onDelete}>
                Eliminar
              </button>
              <form.Subscribe selector={(state) => [state.values.nombre, state.isSubmitting]}>
                {([nombre, isSubmitting]) => (
                  <button
                    type="button"
                    className="btn border-none bg-blue-600 text-white"
                    disabled={!nombre.trim() || pending || isSubmitting}
                    onClick={() => form.handleSubmit()}
                  >
                    Guardar nombre
                  </button>
                )}
              </form.Subscribe>
            </>
          ) : null}
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-500">{tipoClienteLabel(flujo.tipo_cliente)}</p>
      {editing ? (
          <Field form={form} name="nombre">
            {(field) => <TextField className="mb-4 block" field={field} label="Nombre" />}
          </Field>
        ) : (
          <label className="mb-4 block text-sm">
            <span className="mb-1 block text-slate-500">Nombre</span>
            <p className="font-medium">{flujo.nombre}</p>
          </label>
        )}
      {editing ? (
        <select
          className="select select-bordered mb-4 w-full"
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
      ) : null}
      {ordered.length === 0 ? (
        <p className="text-sm text-slate-500">Este flujo aún no tiene pasos.</p>
      ) : (
        <ol className="space-y-2">
          {ordered.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span>
                {item.orden}. {item.paso_detalle?.nombre}
              </span>
              {editing ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-rose-600"
                  disabled={removePending}
                  onClick={() => onRemovePaso(item.id)}
                >
                  Quitar
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}
