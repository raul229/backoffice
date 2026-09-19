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
  updateEmpresa,
  updatePersona,
} from '../service/api.js'
import { direccionFormSchema, empresaEditSchema, personaEditSchema, validateDocumentNumber, withSchema } from '../lib/schemas.js'
import {
  celularCliente,
  correoCliente,
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
  const canChangePersona = can('api.change_persona')
  const canChangeEmpresa = can('api.change_empresa')
  const tiposDireccion = choicesQuery.data?.tipos_direccion ?? [{ value: 'CALLE', label: 'Calle' }]
  const tiposDocumento = choicesQuery.data?.tipos_documento ?? [{ value: 'DNI', label: 'DNI' }]

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['clientes'] })
    queryClient.invalidateQueries({ queryKey: ['tabla-ventas'] })
    queryClient.invalidateQueries({ queryKey: ['venta'] })
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

  const updateClienteDatosMutation = useMutation({
    mutationFn: ({ cliente, payload }) => {
      if (cliente.tipo === 'EMPRESA') {
        return updateEmpresa(cliente.empresa.id, payload)
      }
      return updatePersona(cliente.persona.id, payload)
    },
    onSuccess: () => {
      invalidate()
      setSelected((current) => (current ? { ...current, editing: false } : current))
      setError('')
    },
    onError: (err) => setError(err.message),
  })

  const query = search.trim().toLowerCase()
  const filtered = (clientes ?? []).filter((cliente) => {
    if (!query) return true
    return `${nombreCliente(cliente)} ${documentoCliente(cliente)} ${correoCliente(cliente)} ${cliente.tipo}`
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

  const selectedCliente = (clientes ?? []).find((cliente) => cliente.id === selected?.id)
  const editingDireccion = allDirecciones.find((item) => item.id === direccionModal?.id)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Clientes</h1>
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
          <section className="bo-card bo-table-wrap p-4 sm:p-5">
            <table className="table table-sm sm:table-md">
              <thead>
                <tr className="text-slate-400">
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Documento</th>
                  <th>Correo</th>
                  <th>Contacto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isPending ? (
                  <tr>
                    <td colSpan={6}>Cargando clientes...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No hay clientes para mostrar.</td>
                  </tr>
                ) : (
                  filtered.map((cliente) => (
                    <tr key={cliente.id}>
                      <td className="font-medium">{nombreCliente(cliente)}</td>
                      <td>{tipoClienteLabel(cliente.tipo)}</td>
                      <td>{documentoCliente(cliente) || '—'}</td>
                      <td className="max-w-[14rem] break-all">{correoCliente(cliente) || '—'}</td>
                      <td>{celularCliente(cliente) || '—'}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => setSelected({ id: cliente.id })}
                        >
                          Ver
                        </button>
                        {canEditCliente(cliente, canChangePersona, canChangeEmpresa) ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => setSelected({ id: cliente.id, editing: true })}
                          >
                            Editar
                          </button>
                        ) : null}
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
          <section className="bo-card bo-table-wrap p-4 sm:p-5">
            {isPending ? (
              <p className="text-sm text-slate-500">Cargando direcciones...</p>
            ) : direcciones.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no hay direcciones registradas.</p>
            ) : (
              <table className="table table-sm sm:table-md">
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
          canEdit={canEditCliente(selectedCliente, canChangePersona, canChangeEmpresa)}
          cliente={selectedCliente}
          deleting={deleteClienteMutation.isPending}
          editing={Boolean(selected?.editing)}
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
          onEdit={() => setSelected({ id: selectedCliente.id, editing: true })}
          onEditDireccion={(direccion, editing) =>
            setDireccionModal({ type: 'direccion', id: direccion.id, editing })
          }
          onSave={(payload) => updateClienteDatosMutation.mutate({ cliente: selectedCliente, payload })}
          saving={updateClienteDatosMutation.isPending}
          tiposDocumento={tiposDocumento}
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

function canEditCliente(cliente, canChangePersona, canChangeEmpresa) {
  if (cliente?.tipo === 'PERSONA') return Boolean(canChangePersona && cliente.persona?.id)
  if (cliente?.tipo === 'EMPRESA') return Boolean(canChangeEmpresa && cliente.empresa?.id)
  return false
}

function personaFormValues(cliente) {
  const persona = cliente.persona ?? {}
  return {
    tipo_documento: persona.tipo_documento ?? 'DNI',
    numero_documento: persona.numero_documento ?? '',
    nombres: persona.nombres ?? '',
    apellidos: persona.apellidos ?? '',
    celular: persona.celular ?? '',
    correo: cliente.correo ?? '',
    distrito_nacimiento: persona.distrito_nacimiento ?? '',
    padre: persona.padre ?? '',
    madre: persona.madre ?? '',
  }
}

function empresaFormValues(cliente) {
  const empresa = cliente.empresa ?? {}
  return {
    ruc: empresa.ruc ?? '',
    razon_social: empresa.razon_social ?? '',
    correo: cliente.correo ?? '',
  }
}

function ClienteModal({
  cliente,
  canAddDireccion,
  canChangeDireccion,
  canDeleteCliente,
  canDeleteDireccion,
  canEdit,
  deleting,
  editing,
  onClose,
  onDelete,
  onEdit,
  onSave,
  saving,
  tiposDocumento,
  onAddDireccion,
  onEditDireccion,
  onDeleteDireccion,
}) {
  const persona = cliente.persona
  const empresa = cliente.empresa
  const representante = empresa?.representante_legal_detalle
  const direcciones = cliente.direcciones ?? []
  const isPersona = cliente.tipo === 'PERSONA'
  const form = useForm({
    defaultValues: isPersona ? personaFormValues(cliente) : empresaFormValues(cliente),
    validators: withSchema(isPersona ? personaEditSchema : empresaEditSchema),
    onSubmit: ({ value }) => {
      if (isPersona) {
        onSave({
          tipo_documento: value.tipo_documento,
          numero_documento: value.numero_documento.trim(),
          nombres: value.nombres.trim(),
          apellidos: value.apellidos.trim(),
          celular: value.celular.trim(),
          correo: value.correo.trim().toLowerCase(),
          distrito_nacimiento: value.distrito_nacimiento.trim(),
          padre: value.padre.trim(),
          madre: value.madre.trim(),
        })
        return
      }
      onSave({
        ruc: value.ruc.trim(),
        razon_social: value.razon_social.trim(),
        correo: value.correo.trim().toLowerCase(),
      })
    },
  })

  useEffect(() => {
    form.reset(isPersona ? personaFormValues(cliente) : empresaFormValues(cliente))
  }, [form, cliente, isPersona])

  return (
    <Modal
      open
      title={editing ? 'Editar cliente' : nombreCliente(cliente)}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          {canDeleteCliente && !editing ? (
            <button
              type="button"
              className="btn btn-ghost text-rose-600"
              disabled={deleting}
              onClick={onDelete}
            >
              Eliminar
            </button>
          ) : null}
          {canEdit && !editing ? (
            <button type="button" className="btn border-none bg-blue-600 text-white" onClick={onEdit}>
              Editar
            </button>
          ) : null}
          {editing ? (
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <button
                  type="button"
                  className="btn border-none bg-blue-600 text-white"
                  disabled={saving || isSubmitting}
                  onClick={() => form.handleSubmit()}
                >
                  Guardar
                </button>
              )}
            </form.Subscribe>
          ) : null}
        </>
      }
    >
      {editing ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&_label]:min-w-0">
          {isPersona ? (
            <>
              <Field form={form} name="tipo_documento">
                {(field) => (
                  <SelectField
                    field={field}
                    includeEmpty={false}
                    label="Tipo de documento"
                    options={tiposDocumento}
                  />
                )}
              </Field>
              <Field form={form} name="numero_documento" validators={validateDocumentNumber}>
                {(field) => (
                  <TextField field={field} inputMode="numeric" label="Número de documento" maxLength={9} />
                )}
              </Field>
              <Field form={form} name="nombres">
                {(field) => <TextField field={field} label="Nombres" normalize="upper" />}
              </Field>
              <Field form={form} name="apellidos">
                {(field) => <TextField field={field} label="Apellidos" normalize="upper" />}
              </Field>
              <Field form={form} name="celular">
                {(field) => (
                  <TextField field={field} inputMode="numeric" label="Celular" maxLength={9} />
                )}
              </Field>
              <Field form={form} name="correo">
                {(field) => (
                  <TextField className="sm:col-span-2" field={field} label="Correo de facturación" type="email" />
                )}
              </Field>
              <Field form={form} name="distrito_nacimiento">
                {(field) => <TextField field={field} label="Distrito de nacimiento" normalize="upper" />}
              </Field>
              <Field form={form} name="padre">
                {(field) => <TextField field={field} label="Nombre del padre" normalize="upper" />}
              </Field>
              <Field form={form} name="madre">
                {(field) => <TextField className="sm:col-span-2" field={field} label="Nombre de la madre" normalize="upper" />}
              </Field>
            </>
          ) : (
            <>
              <Field form={form} name="ruc">
                {(field) => <TextField field={field} inputMode="numeric" label="RUC" maxLength={11} />}
              </Field>
              <Field form={form} name="razon_social">
                {(field) => <TextField field={field} label="Razón social" normalize="upper" />}
              </Field>
              <Field form={form} name="correo">
                {(field) => <TextField className="sm:col-span-2" field={field} label="Correo de facturación" type="email" />}
              </Field>
            </>
          )}
        </div>
      ) : (
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2 [&>div]:min-w-0 [&>div]:overflow-hidden [&_dd]:[overflow-wrap:anywhere]">
        <div>
          <dt className="text-slate-400">Tipo</dt>
          <dd>{tipoClienteLabel(cliente.tipo)}</dd>
        </div>
        {documentoCliente(cliente) ? (
          <div>
            <dt className="text-slate-400">Documento</dt>
            <dd>
              {persona?.tipo_documento ? `${persona.tipo_documento} ` : ''}
              {documentoCliente(cliente)}
            </dd>
          </div>
        ) : null}
        {correoCliente(cliente) ? (
          <div className="sm:col-span-2">
            <dt className="text-slate-400">Correo de facturación</dt>
            <dd className="break-all">{correoCliente(cliente)}</dd>
          </div>
        ) : null}
        {persona ? (
          <>
            {persona.nombres ? (
              <div>
                <dt className="text-slate-400">Nombres</dt>
                <dd>{persona.nombres}</dd>
              </div>
            ) : null}
            {persona.apellidos ? (
              <div>
                <dt className="text-slate-400">Apellidos</dt>
                <dd>{persona.apellidos}</dd>
              </div>
            ) : null}
            {persona.celular ? (
              <div>
                <dt className="text-slate-400">Celular</dt>
                <dd>{persona.celular}</dd>
              </div>
            ) : null}
            {cliente.tipo === 'PERSONA' && persona.distrito_nacimiento ? (
              <div>
                <dt className="text-slate-400">Distrito de nacimiento</dt>
                <dd>{persona.distrito_nacimiento}</dd>
              </div>
            ) : null}
            {cliente.tipo === 'PERSONA' && persona.padre ? (
              <div>
                <dt className="text-slate-400">Padre</dt>
                <dd>{persona.padre}</dd>
              </div>
            ) : null}
            {cliente.tipo === 'PERSONA' && persona.madre ? (
              <div>
                <dt className="text-slate-400">Madre</dt>
                <dd>{persona.madre}</dd>
              </div>
            ) : null}
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
      )}

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
              <span className="min-w-0 break-words">{formatDireccion(direccion)}</span>
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
    interior: '',
    tienda: '',
    piso: '',
    galeria: '',
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
    interior: direccion.interior ?? '',
    tienda: direccion.tienda ?? '',
    piso: direccion.piso ?? '',
    galeria: direccion.galeria ?? '',
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
        interior: value.interior.trim(),
        tienda: value.tienda.trim(),
        piso: value.piso.trim(),
        galeria: value.galeria.trim(),
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
          <Field form={form} name="piso">
            {(field) => <TextField field={field} label="Piso" normalize="upper" />}
          </Field>
        ) : direccion.piso ? (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Piso</span>
            <p>{direccion.piso}</p>
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
          <Field form={form} name="tienda">
            {(field) => <TextField field={field} label="Tienda" normalize="upper" />}
          </Field>
        ) : direccion.tienda ? (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Tienda</span>
            <p>{direccion.tienda}</p>
          </label>
        ) : null}
        {editing ? (
          <Field form={form} name="galeria">
            {(field) => <TextField field={field} label="Galería o centro comercial" normalize="upper" />}
          </Field>
        ) : direccion.galeria ? (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Galería o centro comercial</span>
            <p>{direccion.galeria}</p>
          </label>
        ) : null}
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
