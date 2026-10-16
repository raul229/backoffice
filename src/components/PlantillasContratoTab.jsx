import { useMemo, useRef, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDocumento,
  deleteDocumento,
  downloadPlantillaContrato,
  getPlantillasContrato,
  getProductos,
  getPromociones,
  updateDocumento,
  uploadPlantillaContrato,
} from '../service/api.js'
import { displayName } from '../lib/auth.js'
import { camposDesdeDocumento, FORMATOS_DOCUMENTO, GRUPOS_DOCUMENTO } from '../lib/documento.js'
import { documentoFormSchema, withSchema } from '../lib/schemas.js'
import { formatFecha } from '../lib/venta.js'
import { useAuth } from '../context/AuthContext.jsx'
import DataTable, { ActionsCell } from './DataTable.jsx'
import Field from './Field.jsx'
import { SelectField, TextAreaField, TextField } from './FormFields.jsx'
import Modal from './Modal.jsx'
import MultiCheck from './MultiCheck.jsx'
import ConfirmModal from './ConfirmModal.jsx'
import MapaDocumentoEditor from './MapaDocumentoEditor.jsx'

function formatBytes(n) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function etiquetaProducto(producto) {
  return `${producto.nombre} · ${producto.velocidad} Mbps`
}

function etiquetaUso(item) {
  const productos = item.productos_detalle ?? []
  const promociones = item.promociones_detalle ?? []
  if (!productos.length && !promociones.length) return 'Sin asignar'
  const prods = productos.map(etiquetaProducto).join(', ')
  const promos = promociones.map((promo) => promo.nombre).join(', ')
  if (productos.length && promociones.length) return `${prods} · solo con ${promos}`
  if (productos.length) return `Siempre en ${prods}`
  return `Si la venta tiene ${promos}`
}

function esPdf(item) {
  return (item?.acepta ?? []).includes('.pdf')
}

export default function PlantillasContratoTab({ onError, onOk, abrirNuevo = false, onCerrarNuevo }) {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const inputsRef = useRef({})
  const [uploading, setUploading] = useState('')
  const [creatingLocal, setCreatingLocal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [draft, setDraft] = useState(null)
  const canChange = can('api.change_plantillacontrato') || can('api.add_plantillacontrato')
  const canDelete = can('api.delete_plantillacontrato')
  const creating = creatingLocal || abrirNuevo

  const query = useQuery({
    queryKey: ['plantillas-contrato'],
    queryFn: getPlantillasContrato,
  })
  const productosQuery = useQuery({ queryKey: ['productos'], queryFn: getProductos })
  const promocionesQuery = useQuery({ queryKey: ['promociones'], queryFn: getPromociones })
  const plantillas = query.data ?? []
  const productos = productosQuery.data ?? []
  const promociones = promocionesQuery.data ?? []
  const grupos = [...new Set([...GRUPOS_DOCUMENTO, ...plantillas.map((item) => item.grupo).filter(Boolean)])]

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['plantillas-contrato'] })

  const uploadMutation = useMutation({
    mutationFn: ({ clave, file }) => uploadPlantillaContrato(clave, file),
    onSuccess: (item) => {
      invalidate()
      setEditing((actual) => (actual?.clave === item.clave ? { ...actual, ...item } : actual))
      onOk(`Se actualizó “${item.etiqueta}”.`)
    },
    onError: (err) => onError(err.message),
    onSettled: () => setUploading(''),
  })

  const downloadMutation = useMutation({
    mutationFn: (item) => downloadPlantillaContrato(item.clave, item.nombre_archivo || item.archivo),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    },
    onError: (err) => onError(err.message),
  })

  const createMutation = useMutation({
    mutationFn: async ({ file, ...payload }) => {
      const item = await createDocumento(payload)
      if (file) return uploadPlantillaContrato(item.clave, file)
      return item
    },
    onSuccess: (item) => {
      invalidate()
      closeCreate()
      abrirEdicion(item)
      onOk(
        item.cargada
          ? `Se creó “${item.etiqueta}”. Haz clic en el PDF para colocar los datos.`
          : `Se creó “${item.etiqueta}”. Carga el archivo y coloca los datos sobre la hoja.`,
      )
    },
    onError: (err) => onError(err.message),
  })

  const duplicateMutation = useMutation({
    mutationFn: (item) =>
      createDocumento({
        etiqueta: `${item.etiqueta} (copia)`,
        descripcion: item.descripcion || '',
        grupo: item.grupo,
        acepta: item.acepta,
        campos: item.campos || [],
        productos: item.productos || [],
        promociones: item.promociones || [],
      }),
    onSuccess: (item) => {
      invalidate()
      abrirEdicion(item)
      onOk(`Copia de “${item.etiqueta}”. Carga el PDF si cambió y mueve las etiquetas.`)
    },
    onError: (err) => onError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ clave, payload }) => updateDocumento(clave, payload),
    onSuccess: (item) => {
      invalidate()
      setEditing(null)
      setDraft(null)
      onOk(`Se guardó “${item.etiqueta}”.`)
    },
    onError: (err) => onError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (clave) => deleteDocumento(clave),
    onSuccess: () => {
      invalidate()
      setConfirm(null)
      setEditing(null)
      setDraft(null)
      onOk('Se eliminó el documento.')
    },
    onError: (err) => onError(err.message),
  })

  const closeCreate = () => {
    setCreatingLocal(false)
    onCerrarNuevo?.()
  }

  const abrirEdicion = (item) => {
    setEditing(item)
    setDraft({
      etiqueta: item.etiqueta ?? '',
      descripcion: item.descripcion ?? '',
      grupo: item.grupo || 'Contratos',
      productos: (item.productos ?? []).map(String),
      promociones: (item.promociones ?? []).map(String),
      campos: camposDesdeDocumento(item),
    })
  }

  const guardarEdicion = () => {
    if (!editing || !draft) return
    updateMutation.mutate({
      clave: editing.clave,
      payload: {
        etiqueta: draft.etiqueta.trim(),
        descripcion: draft.descripcion.trim(),
        grupo: draft.grupo.trim(),
        productos: draft.productos.map(Number),
        promociones: draft.promociones.map(Number),
        campos: esPdf(editing) ? draft.campos : undefined,
      },
    })
  }

  const plantillaColumns = useMemo(
    () => [
      {
        id: 'plantilla',
        accessorKey: 'etiqueta',
        header: 'Documento',
        cell: (info) => {
          const item = info.row.original
          return (
            <>
              <p className="font-medium">{item.etiqueta}</p>
              <p className="text-xs text-slate-500">{item.descripcion}</p>
            </>
          )
        },
      },
      {
        id: 'tipo',
        accessorKey: 'grupo',
        header: 'Tipo',
        cell: (info) => <span className="text-sm text-slate-600">{info.getValue()}</span>,
      },
      {
        id: 'uso',
        accessorFn: etiquetaUso,
        header: 'Uso',
        cell: (info) => <span className="text-sm text-slate-600">{etiquetaUso(info.row.original)}</span>,
      },
      {
        id: 'estado',
        accessorFn: (row) => (row.cargada ? 'Cargada' : row.requerida ? 'Falta' : 'Opcional'),
        header: 'Estado',
        cell: (info) => {
          const item = info.row.original
          return item.cargada ? (
            <span className="badge badge-ghost whitespace-nowrap border-emerald-200 bg-emerald-50 text-emerald-700">
              Cargada{item.tamano ? ` · ${formatBytes(item.tamano)}` : ''}
            </span>
          ) : (
            <span
              className={`badge badge-ghost ${
                item.requerida ? 'border-amber-200 bg-amber-50 text-amber-800' : 'text-slate-500'
              }`}
            >
              {item.requerida ? 'Falta' : 'Sin archivo'}
            </span>
          )
        },
      },
      {
        id: 'actualizada',
        accessorFn: (row) => row.actualizado || '',
        header: 'Actualizada',
        cell: (info) => {
          const item = info.row.original
          return (
            <span className="text-sm text-slate-500">
              {item.cargada ? (
                <>
                  {formatFecha(item.actualizado)}
                  {item.actualizado_por ? ` · ${displayName(item.actualizado_por)}` : ''}
                </>
              ) : (
                '—'
              )}
            </span>
          )
        },
      },
      {
        id: 'acciones',
        header: '',
        cell: (info) => {
          const item = info.row.original
          return (
            <ActionsCell>
              {canChange ? (
                <>
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => abrirEdicion(item)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    disabled={duplicateMutation.isPending}
                    onClick={() => duplicateMutation.mutate(item)}
                  >
                    Duplicar
                  </button>
                </>
              ) : null}
              {item.cargada ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  disabled={downloadMutation.isPending}
                  onClick={() => downloadMutation.mutate(item)}
                >
                  Descargar
                </button>
              ) : null}
              {canChange ? (
                <>
                  <input
                    ref={(node) => {
                      inputsRef.current[item.clave] = node
                    }}
                    accept={(item.acepta ?? []).join(',')}
                    className="hidden"
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ''
                      if (!file) return
                      setUploading(item.clave)
                      uploadMutation.mutate({ clave: item.clave, file })
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    disabled={Boolean(uploading)}
                    onClick={() => inputsRef.current[item.clave]?.click()}
                  >
                    {uploading === item.clave ? 'Subiendo…' : item.cargada ? 'Reemplazar' : 'Cargar'}
                  </button>
                </>
              ) : null}
            </ActionsCell>
          )
        },
      },
    ],
    [canChange, downloadMutation, duplicateMutation, uploadMutation, uploading],
  )

  if (query.isError) {
    return (
      <div className="alert alert-error">
        <span>{query.error.message}</span>
      </div>
    )
  }

  return (
    <section className="bo-card p-4 sm:p-5">
      <p className="mb-4 text-sm text-slate-500">
        Sube el PDF, haz clic donde va cada dato y asígnalo a un producto o promoción. Si Entel cambia
        la hoja, reemplaza el archivo y arrastra las etiquetas.
      </p>
      <DataTable
        tableKey="documentos-table"
        columns={plantillaColumns}
        data={plantillas}
        emptyLabel="Aún no hay documentos."
        getRowId={(row) => row.clave}
        isPending={query.isPending}
        pageSize={20}
      />
      {creating ? (
        <DocumentoCreateModal
          grupos={grupos}
          pending={createMutation.isPending}
          onClose={closeCreate}
          onSave={(payload) => createMutation.mutate(payload)}
        />
      ) : null}
      {editing && draft ? (
        <Modal
          open
          full
          title={`Editar ${editing.etiqueta}`}
          onClose={() => {
            setEditing(null)
            setDraft(null)
          }}
          footer={
            <>
              {canDelete ? (
                <button
                  type="button"
                  className="btn btn-ghost mr-auto text-rose-600"
                  onClick={() =>
                    setConfirm({
                      title: 'Eliminar documento',
                      message: `¿Eliminar “${editing.etiqueta}”? Las ventas volverán al mapa Entel si no queda otro documento asignado.`,
                    })
                  }
                >
                  Eliminar
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEditing(null)
                  setDraft(null)
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn border-none bg-blue-600 text-white"
                disabled={updateMutation.isPending || !draft.etiqueta.trim()}
                onClick={guardarEdicion}
              >
                {updateMutation.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </>
          }
        >
          <div className="grid gap-3">
            <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-medium">Nombre y en qué ventas se usa</summary>
              <div className="mt-3 grid gap-3">
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Nombre</span>
                  <input
                    className="input input-bordered w-full"
                    value={draft.etiqueta}
                    onChange={(event) => setDraft({ ...draft, etiqueta: event.target.value })}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Descripción</span>
                  <textarea
                    className="textarea textarea-bordered w-full"
                    rows={2}
                    value={draft.descripcion}
                    onChange={(event) => setDraft({ ...draft, descripcion: event.target.value })}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Tipo</span>
                  <input
                    className="input input-bordered w-full"
                    list="grupos-documento"
                    value={draft.grupo}
                    onChange={(event) => setDraft({ ...draft, grupo: event.target.value })}
                  />
                  <datalist id="grupos-documento">
                    {grupos.map((grupo) => (
                      <option key={grupo} value={grupo} />
                    ))}
                  </datalist>
                </label>
                <MultiCheck
                  label="Productos"
                  options={productos.map((producto) => ({
                    value: String(producto.id),
                    label: etiquetaProducto(producto),
                  }))}
                  selected={draft.productos}
                  onChange={(productosSel) => setDraft({ ...draft, productos: productosSel })}
                />
                <MultiCheck
                  label="Promociones"
                  options={promociones.map((promo) => ({
                    value: String(promo.id),
                    label: promo.nombre,
                  }))}
                  selected={draft.promociones}
                  onChange={(promocionesSel) => setDraft({ ...draft, promociones: promocionesSel })}
                />
              </div>
            </details>
            {esPdf(editing) ? (
              <MapaDocumentoEditor
                key={editing.clave}
                campos={draft.campos}
                documento={editing}
                uploading={uploading === editing.clave}
                onChange={(campos) => setDraft({ ...draft, campos })}
                onError={onError}
                onUpload={(file) => uploadMutation.mutate({ clave: editing.clave, file })}
              />
            ) : (
              <p className="text-sm text-slate-500">
                Este formato no se llena sobre un PDF. Reemplaza el archivo si la plantilla cambia.
              </p>
            )}
          </div>
        </Modal>
      ) : null}
      {confirm ? (
        <ConfirmModal
          open
          title={confirm.title}
          message={confirm.message}
          pending={deleteMutation.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() => deleteMutation.mutate(editing.clave)}
        />
      ) : null}
    </section>
  )
}

function DocumentoCreateModal({ grupos, pending, onClose, onSave }) {
  const [file, setFile] = useState(null)
  const form = useForm({
    defaultValues: {
      etiqueta: '',
      descripcion: '',
      grupo: 'Contratos',
      acepta: '.pdf',
    },
    validators: withSchema(documentoFormSchema),
    onSubmit: ({ value }) =>
      onSave({
        etiqueta: value.etiqueta.trim(),
        descripcion: value.descripcion.trim(),
        grupo: value.grupo.trim(),
        acepta: [value.acepta],
        file,
      }),
  })

  return (
    <Modal
      open
      title="Nuevo documento"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <button
                type="button"
                className="btn border-none bg-blue-600 text-white"
                disabled={!canSubmit || pending || isSubmitting}
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
        <Field form={form} name="etiqueta">
          {(field) => <TextField field={field} label="Nombre" />}
        </Field>
        <Field form={form} name="descripcion">
          {(field) => <TextAreaField field={field} label="Descripción" />}
        </Field>
        <Field form={form} name="grupo">
          {(field) => (
            <SelectField
              field={field}
              includeEmpty={false}
              label="Tipo"
              options={grupos.map((grupo) => ({ value: grupo, label: grupo }))}
            />
          )}
        </Field>
        <Field form={form} name="acepta">
          {(field) => (
            <SelectField
              field={field}
              includeEmpty={false}
              label="Formato"
              options={FORMATOS_DOCUMENTO}
            />
          )}
        </Field>
        <form.Subscribe selector={(state) => state.values.acepta}>
          {(acepta) =>
            acepta === '.pdf' ? (
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">PDF (opcional, también se puede cargar después)</span>
                <input
                  accept=".pdf,application/pdf"
                  className="file-input file-input-bordered w-full"
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
              </label>
            ) : (
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Archivo (opcional)</span>
                <input
                  accept={acepta}
                  className="file-input file-input-bordered w-full"
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
              </label>
            )
          }
        </form.Subscribe>
        <p className="text-xs text-slate-500">
          En el siguiente paso haces clic sobre la hoja para decir qué dato va en cada recuadro.
        </p>
      </div>
    </Modal>
  )
}
