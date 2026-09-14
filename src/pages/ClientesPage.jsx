import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Field from '../components/Field.jsx'
import { SelectField, TextAreaField, TextField } from '../components/FormFields.jsx'
import {
  createDireccion,
  deleteCliente,
  deleteDireccion,
  getChoices,
  getClientes,
  updateDireccion,
} from '../service/api.js'
import { direccionFormSchema, withSchema } from '../lib/schemas.js'
import {
  celularCliente,
  documentoCliente,
  formatDireccion,
  nombreCliente,
  tipoClienteLabel,
} from '../lib/venta.js'
import { useAuth } from '../context/AuthContext.jsx'
import Modal from '../components/Modal.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'

export default function ClientesPage({ search }) {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [direccionModal, setDireccionModal] = useState(null)
  const [tab, setTab] = useState('clientes')
  const [error, setError] = useState('')
  const { isPending, isError, error: loadError, data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: getClientes,
  })
  const choicesQuery = useQuery({ queryKey: ['choices'], queryFn: getChoices })
  const canDeleteCliente = can('api.delete_cliente')
  const canAddDireccion = can('api.add_direccion')
  const canChangeDireccion = can('api.change_direccion')
  const canDeleteDireccion = can('api.delete_direccion')
  const tiposDireccion = choicesQuery.data?.tipos_direccion ?? [{ value: 'CALLE', label: 'Calle' }]

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['clientes'] })
    queryClient.invalidateQueries({ queryKey: ['tabla-ventas'] })
  }

  const deleteClienteMutation = useMutation({
    mutationFn: deleteCliente,
    onSuccess: () => {
      invalidate()
      setSelected(null)
      setToDelete(null)
    },
    onError: (err) => setError(err.message),
  })

  const createDireccionMutation = useMutation({
    mutationFn: createDireccion,
    onSuccess: () => {
      invalidate()
      setDireccionModal(null)
      setError('')
    },
    onError: (err) => setError(err.message),
  })

  const updateDireccionMutation = useMutation({
    mutationFn: ({ id, payload }) => updateDireccion(id, payload),
    onSuccess: () => {
      invalidate()
      setDireccionModal(null)
      setError('')
    },
    onError: (err) => setError(err.message),
  })

  const deleteDireccionMutation = useMutation({
    mutationFn: deleteDireccion,
    onSuccess: () => {
      invalidate()
      setDireccionModal(null)
      setToDelete(null)
      setError('')
    },
    onError: (err) => setError(err.message),
  })

  const query = search.trim().toLowerCase()
  const filtered = (clientes ?? []).filter((cliente) => {
    if (!query) return true
    return `${nombreCliente(cliente)} ${documentoCliente(cliente)} ${cliente.tipo}`
      .toLowerCase()
      .includes(query)
  })

  const allDirecciones = (clientes ?? []).flatMap((cliente) =>
    (cliente.direcciones ?? []).map((direccion) => ({
      ...direccion,
      clienteNombre: nombreCliente(cliente),
    })),
  )
  const direcciones = allDirecciones.filter((direccion) => {
    if (!query) return true
    return `${direccion.clienteNombre} ${direccion.tipo} ${direccion.direccion} ${direccion.numero} ${direccion.distrito}`
      .toLowerCase()
      .includes(query)
  })

  const selectedCliente = (clientes ?? []).find((cliente) => cliente.id === selected?.id) ?? selected
  const editingDireccion = allDirecciones.find((item) => item.id === direccionModal?.id)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-slate-500">Clientes persona natural y jurídica, y sus direcciones.</p>
        </div>
        {tab === 'direcciones' && canAddDireccion ? (
          <button
            type="button"
            className="btn btn-sm rounded-full border-none bg-blue-600 text-white"
            onClick={() => setDireccionModal({ type: 'create' })}
          >
            Nueva dirección
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn btn-sm rounded-full ${tab === 'clientes' ? 'border-none bg-blue-600 text-white' : 'btn-ghost bg-white'}`}
          onClick={() => setTab('clientes')}
        >
          Clientes
        </button>
        <button
          type="button"
          className={`btn btn-sm rounded-full ${tab === 'direcciones' ? 'border-none bg-blue-600 text-white' : 'btn-ghost bg-white'}`}
          onClick={() => setTab('direcciones')}
        >
          Direcciones
        </button>
      </div>

      {error || deleteClienteMutation.isError ? (
        <div className="alert alert-error">
          <span>{error || deleteClienteMutation.error.message}</span>
        </div>
      ) : null}

      {isError ? (
        <div className="alert alert-error">
          <span>{loadError.message}</span>
        </div>
      ) : tab === 'clientes' ? (
          <section className="bo-card overflow-x-auto p-5">
            <table className="table">
              <thead>
                <tr className="text-slate-400">
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Documento</th>
                  <th>Contacto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isPending ? (
                  <tr>
                    <td colSpan={5}>Cargando clientes...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No hay clientes para mostrar.</td>
                  </tr>
                ) : (
                  filtered.map((cliente) => (
                    <tr key={cliente.id}>
                      <td className="font-medium">{nombreCliente(cliente)}</td>
                      <td>{tipoClienteLabel(cliente.tipo)}</td>
                      <td>{documentoCliente(cliente) || '—'}</td>
                      <td>{celularCliente(cliente) || '—'}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => setSelected(cliente)}
                        >
                          Ver
                        </button>
                        {canDeleteCliente ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs text-rose-600"
                            disabled={deleteClienteMutation.isPending}
                            onClick={() => setToDelete({ type: 'cliente', cliente })}
                          >
                            Eliminar
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
          ) : (
          <section className="bo-card overflow-x-auto p-5">
            {isPending ? (
              <p className="text-sm text-slate-500">Cargando direcciones...</p>
            ) : direcciones.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no hay direcciones registradas.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr className="text-slate-400">
                    <th>Cliente</th>
                    <th>Dirección</th>
                    <th>Distrito</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {direcciones.map((direccion) => (
                    <tr key={direccion.id}>
                      <td className="font-medium">{direccion.clienteNombre}</td>
                      <td>
                        {direccion.tipo} {direccion.direccion} {direccion.numero}
                      </td>
                      <td>{direccion.distrito}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => setDireccionModal({ type: 'direccion', id: direccion.id, editing: false })}
                        >
                          Ver
                        </button>
                        {canChangeDireccion ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => setDireccionModal({ type: 'direccion', id: direccion.id, editing: true })}
                          >
                            Editar
                          </button>
                        ) : null}
                        {canDeleteDireccion ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs text-rose-600"
                            onClick={() =>
                              setToDelete({
                                type: 'direccion',
                                direccion,
                                message: `¿Eliminar ${formatDireccion(direccion)}? Esta acción no se puede deshacer.`,
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
      )}

      {selectedCliente ? (
        <ClienteModal
          canAddDireccion={canAddDireccion}
          canChangeDireccion={canChangeDireccion}
          canDeleteCliente={canDeleteCliente}
          canDeleteDireccion={canDeleteDireccion}
          cliente={selectedCliente}
          deleting={deleteClienteMutation.isPending}
          onAddDireccion={() => setDireccionModal({ type: 'create', clienteId: selectedCliente.id })}
          onClose={() => setSelected(null)}
          onDelete={() => setToDelete({ type: 'cliente', cliente: selectedCliente })}
          onDeleteDireccion={(direccion) =>
            setToDelete({
              type: 'direccion',
              direccion,
              message: `¿Eliminar ${formatDireccion(direccion)}? Esta acción no se puede deshacer.`,
            })
          }
          onEditDireccion={(direccion, editing) =>
            setDireccionModal({ type: 'direccion', id: direccion.id, editing })
          }
        />
      ) : null}

      {direccionModal?.type === 'create' ? (
        <DireccionFormModal
          clientes={clientes ?? []}
          lockedClienteId={direccionModal.clienteId}
          onClose={() => setDireccionModal(null)}
          onSave={(payload) => createDireccionMutation.mutate(payload)}
          pending={createDireccionMutation.isPending}
          stacked={Boolean(selectedCliente)}
          tiposDireccion={tiposDireccion}
        />
      ) : null}

      {direccionModal?.type === 'direccion' && editingDireccion ? (
        <DireccionFormModal
          direccion={editingDireccion}
          editing={direccionModal.editing}
          onClose={() => setDireccionModal(null)}
          onDelete={() =>
            setToDelete({
              type: 'direccion',
              direccion: editingDireccion,
              message: `¿Eliminar ${formatDireccion(editingDireccion)}? Esta acción no se puede deshacer.`,
            })
          }
          onSave={(payload) =>
            updateDireccionMutation.mutate({ id: editingDireccion.id, payload })
          }
          pending={updateDireccionMutation.isPending}
          stacked={Boolean(selectedCliente)}
          tiposDireccion={tiposDireccion}
        />
      ) : null}

      {toDelete?.type === 'cliente' ? (
        <ConfirmModal
          open
          title="Eliminar cliente"
          message={`¿Eliminar a ${nombreCliente(toDelete.cliente)}? No se puede si tiene ventas. Esta acción no se puede deshacer.`}
          onCancel={() => setToDelete(null)}
          onConfirm={() => deleteClienteMutation.mutate(toDelete.cliente.id)}
          pending={deleteClienteMutation.isPending}
        />
      ) : null}
      {toDelete?.type === 'direccion' ? (
        <ConfirmModal
          open
          title="Eliminar dirección"
          message={toDelete.message}
          onCancel={() => setToDelete(null)}
          onConfirm={() => deleteDireccionMutation.mutate(toDelete.direccion.id)}
          pending={deleteDireccionMutation.isPending}
        />
      ) : null}
    </div>
  )
}

function ClienteModal({
  cliente,
  canAddDireccion,
  canChangeDireccion,
  canDeleteCliente,
  canDeleteDireccion,
  deleting,
  onClose,
  onDelete,
  onAddDireccion,
  onEditDireccion,
  onDeleteDireccion,
}) {
  const persona = cliente.persona
  const empresa = cliente.empresa
  const representante = empresa?.representante_legal_detalle
  const direcciones = cliente.direcciones ?? []
  return (
    <Modal
      open
      title={nombreCliente(cliente)}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          {canDeleteCliente ? (
            <button
              type="button"
              className="btn btn-ghost text-rose-600"
              disabled={deleting}
              onClick={onDelete}
            >
              Eliminar
            </button>
          ) : null}
        </>
      }
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-slate-400">Tipo</dt>
          <dd>{tipoClienteLabel(cliente.tipo)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Documento</dt>
          <dd>{documentoCliente(cliente) || '—'}</dd>
        </div>
        {persona ? (
          <>
            <div>
              <dt className="text-slate-400">Nombres</dt>
              <dd>{persona.nombres}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Apellidos</dt>
              <dd>{persona.apellidos}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Celular</dt>
              <dd>{persona.celular || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Distrito de nacimiento</dt>
              <dd>{persona.distrito_nacimiento || '—'}</dd>
            </div>
          </>
        ) : null}
        {empresa ? (
          <>
            <div>
              <dt className="text-slate-400">RUC</dt>
              <dd>{empresa.ruc}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Razón social</dt>
              <dd>{empresa.razon_social}</dd>
            </div>
          </>
        ) : null}
        {representante ? (
          <div className="col-span-2">
            <dt className="text-slate-400">Representante legal</dt>
            <dd>
              {representante.nombres} {representante.apellidos} · {representante.tipo_documento}{' '}
              {representante.numero_documento}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-5 flex items-center justify-between">
        <h3 className="font-semibold">Direcciones</h3>
        {canAddDireccion ? (
          <button type="button" className="btn btn-ghost btn-xs" onClick={onAddDireccion}>
            Agregar
          </button>
        ) : null}
      </div>
      {direcciones.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Sin dirección</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {direcciones.map((direccion) => (
            <li key={direccion.id} className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span>{formatDireccion(direccion)}</span>
              <span className="shrink-0">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => onEditDireccion(direccion, false)}
                >
                  Ver
                </button>
                {canChangeDireccion ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => onEditDireccion(direccion, true)}
                  >
                    Editar
                  </button>
                ) : null}
                {canDeleteDireccion ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-rose-600"
                    onClick={() => onDeleteDireccion(direccion)}
                  >
                    Eliminar
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

function emptyDireccion(clienteId = '') {
  return {
    cliente: clienteId ? String(clienteId) : '',
    tipo: 'CALLE',
    direccion: '',
    numero: '',
    distrito: '',
    urbanizacion: '',
    manzana: '',
    lote: '',
    interior: '',
    referencia: '',
  }
}

function direccionValues(direccion) {
  return {
    cliente: String(direccion.cliente ?? ''),
    tipo: direccion.tipo ?? 'CALLE',
    direccion: direccion.direccion ?? '',
    numero: direccion.numero ?? '',
    distrito: direccion.distrito ?? '',
    urbanizacion: direccion.urbanizacion ?? '',
    manzana: direccion.manzana ?? '',
    lote: direccion.lote ?? '',
    interior: direccion.interior ?? '',
    referencia: direccion.referencia ?? '',
  }
}

function DireccionFormModal({
  direccion,
  clientes = [],
  lockedClienteId,
  tiposDireccion,
  editing = true,
  stacked = false,
  onClose,
  onSave,
  onDelete,
  pending,
}) {
  const isCreate = !direccion
  const form = useForm({
    defaultValues: direccion ? direccionValues(direccion) : emptyDireccion(lockedClienteId),
    validators: withSchema(direccionFormSchema),
    onSubmit: ({ value }) =>
      onSave({
        cliente: Number(value.cliente),
        tipo: value.tipo,
        direccion: value.direccion.trim(),
        numero: value.numero.trim(),
        distrito: value.distrito.trim(),
        urbanizacion: value.urbanizacion.trim(),
        manzana: value.manzana.trim(),
        lote: value.lote.trim(),
        interior: value.interior.trim(),
        referencia: value.referencia.trim(),
      }),
  })

  useEffect(() => {
    form.reset(direccion ? direccionValues(direccion) : emptyDireccion(lockedClienteId))
  }, [form, direccion, lockedClienteId])

  return (
    <Modal
      open
      stacked={stacked}
      title={isCreate ? 'Nueva dirección' : editing ? 'Editar dirección' : 'Dirección'}
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
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <button
                  type="button"
                  className="btn border-none bg-blue-600 text-white"
                  disabled={!canSubmit || pending || isSubmitting}
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
      <div className="grid gap-3 sm:grid-cols-2">
        {isCreate && !lockedClienteId ? (
          <Field form={form} name="cliente">
            {(field) => (
              <SelectField
                className="sm:col-span-2"
                field={field}
                label="Cliente"
                options={clientes.map((cliente) => ({
                  value: String(cliente.id),
                  label: `${nombreCliente(cliente)} · ${documentoCliente(cliente) || 'sin documento'}`,
                }))}
              />
            )}
          </Field>
        ) : null}
        {editing ? (
          <Field form={form} name="tipo">
            {(field) => (
              <SelectField field={field} includeEmpty={false} label="Tipo de vía" options={tiposDireccion} />
            )}
          </Field>
        ) : (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Tipo de vía</span>
            <p className="font-medium">{direccion.tipo}</p>
          </label>
        )}
        {editing ? (
          <Field form={form} name="numero">
            {(field) => <TextField field={field} label="Número" normalize="upper" />}
          </Field>
        ) : (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Número</span>
            <p>{direccion.numero}</p>
          </label>
        )}
        {editing ? (
          <Field form={form} name="direccion">
            {(field) => <TextField className="sm:col-span-2" field={field} label="Dirección" normalize="upper" />}
          </Field>
        ) : (
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-slate-500">Dirección</span>
            <p className="font-medium">{direccion.direccion}</p>
          </label>
        )}
        {editing ? (
          <Field form={form} name="distrito">
            {(field) => <TextField field={field} label="Distrito" normalize="upper" />}
          </Field>
        ) : (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Distrito</span>
            <p>{direccion.distrito}</p>
          </label>
        )}
        {editing ? (
          <Field form={form} name="urbanizacion">
            {(field) => <TextField field={field} label="Urbanización" normalize="upper" />}
          </Field>
        ) : direccion.urbanizacion ? (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Urbanización</span>
            <p>{direccion.urbanizacion}</p>
          </label>
        ) : null}
        {editing ? (
          <Field form={form} name="manzana">
            {(field) => <TextField field={field} label="Manzana" normalize="upper" />}
          </Field>
        ) : direccion.manzana ? (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Manzana</span>
            <p>{direccion.manzana}</p>
          </label>
        ) : null}
        {editing ? (
          <Field form={form} name="lote">
            {(field) => <TextField field={field} label="Lote" normalize="upper" />}
          </Field>
        ) : direccion.lote ? (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Lote</span>
            <p>{direccion.lote}</p>
          </label>
        ) : null}
        {editing ? (
          <Field form={form} name="interior">
            {(field) => <TextField field={field} label="Interior" normalize="upper" />}
          </Field>
        ) : direccion.interior ? (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Interior</span>
            <p>{direccion.interior}</p>
          </label>
        ) : null}
        {editing ? (
          <Field form={form} name="referencia">
            {(field) => (
              <TextAreaField className="sm:col-span-2" field={field} label="Referencia" normalize="upper" rows={2} />
            )}
          </Field>
        ) : direccion.referencia ? (
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-slate-500">Referencia</span>
            <p>{direccion.referencia}</p>
          </label>
        ) : null}
      </div>
    </Modal>
  )
}
