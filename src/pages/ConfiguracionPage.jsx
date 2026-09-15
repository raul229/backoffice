import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Field from '../components/Field.jsx'
import { SelectField, TextAreaField, TextField } from '../components/FormFields.jsx'
import { createFlujoSchema, flujoNombreSchema, pasoFormSchema, productoFormSchema, promocionFormSchema, withSchema } from '../lib/schemas.js'
import {
  createFlujo,
  createFlujoPaso,
  createPaso,
  createProducto,
  createPromocion,
  deleteFlujo,
  deleteFlujoPaso,
  deletePaso,
  deleteProducto,
  deletePromocion,
  getFlujos,
  getPasos,
  getProductos,
  getPromociones,
  updateFlujo,
  updatePaso,
  updateProducto,
  updatePromocion,
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
  const [tab, setTab] = useState('productos')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const flujosQuery = useQuery({ queryKey: ['flujos'], queryFn: getFlujos })
  const pasosQuery = useQuery({ queryKey: ['pasos'], queryFn: getPasos })
  const productosQuery = useQuery({ queryKey: ['productos'], queryFn: getProductos })
  const promocionesQuery = useQuery({ queryKey: ['promociones'], queryFn: getPromociones })
  const flujos = flujosQuery.data ?? []
  const pasos = pasosQuery.data ?? []
  const productos = productosQuery.data ?? []
  const promociones = promocionesQuery.data ?? []
  const canChange = can('api.change_flujo') || can('api.change_paso')
  const canChangeProducto = can('api.change_producto')
  const canChangePromocion = can('api.change_promocion')
  const canDeleteFlujo = can('api.delete_flujo')
  const canDeletePaso = can('api.delete_paso')
  const canDeleteProducto = can('api.delete_producto')
  const canDeletePromocion = can('api.delete_promocion')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['flujos'] })
    queryClient.invalidateQueries({ queryKey: ['pasos'] })
    queryClient.invalidateQueries({ queryKey: ['productos'] })
    queryClient.invalidateQueries({ queryKey: ['promociones'] })
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

  const createProductoMutation = useMutation({
    mutationFn: createProducto,
    onSuccess: () => {
      notify('Producto creado.')
      close()
    },
    onError: (err) => setError(err.message),
  })

  const updateProductoMutation = useMutation({
    mutationFn: ({ id, payload }) => updateProducto(id, payload),
    onSuccess: () => {
      notify('Producto actualizado.')
      close()
    },
    onError: (err) => setError(err.message),
  })

  const deleteProductoMutation = useMutation({
    mutationFn: deleteProducto,
    onSuccess: () => {
      notify('Producto eliminado.')
      close()
      setConfirm(null)
    },
    onError: (err) => setError(err.message),
  })

  const createPromocionMutation = useMutation({
    mutationFn: createPromocion,
    onSuccess: () => {
      notify('Promoción creada.')
      close()
    },
    onError: (err) => setError(err.message),
  })

  const updatePromocionMutation = useMutation({
    mutationFn: ({ id, payload }) => updatePromocion(id, payload),
    onSuccess: () => {
      notify('Promoción actualizada.')
      close()
    },
    onError: (err) => setError(err.message),
  })

  const deletePromocionMutation = useMutation({
    mutationFn: deletePromocion,
    onSuccess: () => {
      notify('Promoción eliminada.')
      close()
      setConfirm(null)
    },
    onError: (err) => setError(err.message),
  })

  const selectedPaso = pasos.find((paso) => paso.id === modal?.id)
  const selectedFlujo = flujos.find((flujo) => flujo.id === modal?.id)
  const selectedProducto = productos.find((producto) => producto.id === modal?.id)
  const selectedPromocion = promociones.find((promo) => promo.id === modal?.id)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Configuración</h1>
          <p className="text-sm text-slate-500">
            Productos, promociones, flujos y pasos se editan en un modal para evitar cambios accidentales.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === 'productos' && can('api.add_producto') ? (
            <button
              type="button"
              className="btn btn-sm rounded-full border-none bg-blue-600 text-white"
              onClick={() => setModal({ type: 'create-producto' })}
            >
              Nuevo producto
            </button>
          ) : null}
          {tab === 'promociones' && can('api.add_promocion') ? (
            <button
              type="button"
              className="btn btn-sm rounded-full border-none bg-blue-600 text-white"
              onClick={() => setModal({ type: 'create-promocion' })}
            >
              Nueva promoción
            </button>
          ) : null}
          {tab === 'pasos' ? (
            <button
              type="button"
              className="btn btn-sm rounded-full border-none bg-blue-600 text-white"
              onClick={() => setModal({ type: 'create-paso' })}
            >
              Nuevo paso
            </button>
          ) : null}
          {tab === 'flujos' ? (
            <button
              type="button"
              className="btn btn-sm rounded-full border-none bg-blue-600 text-white"
              onClick={() => setModal({ type: 'create-flujo' })}
            >
              Nuevo flujo
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['productos', 'Productos'],
          ['promociones', 'Promociones'],
          ['pasos', 'Pasos'],
          ['flujos', 'Flujos'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`btn btn-sm rounded-full ${tab === id ? 'border-none bg-blue-600 text-white' : 'btn-ghost bg-white'}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
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

      {tab === 'productos' ? (
      <section className="bo-card bo-table-wrap p-4 sm:p-5">
        {productosQuery.isPending ? (
          <p className="text-sm text-slate-500">Cargando productos...</p>
        ) : productos.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay productos en el catálogo.</p>
        ) : (
          <table className="table table-sm sm:table-md">
            <thead>
              <tr className="text-slate-400">
                <th>Producto</th>
                <th>Velocidad</th>
                <th>Precio</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr key={producto.id}>
                  <td className="font-medium">{producto.nombre}</td>
                  <td>{producto.velocidad} Mbps</td>
                  <td>S/ {producto.precio}</td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setModal({ type: 'producto', id: producto.id, editing: false })}
                    >
                      Ver
                    </button>
                    {canChangeProducto ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => setModal({ type: 'producto', id: producto.id, editing: true })}
                      >
                        Editar
                      </button>
                    ) : null}
                    {canDeleteProducto ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs text-rose-600"
                        onClick={() =>
                          setConfirm({
                            title: 'Eliminar producto',
                            message: `¿Eliminar el producto “${producto.nombre}”? Si una venta lo usa, no se podrá borrar.`,
                            run: () => deleteProductoMutation.mutate(producto.id),
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
      ) : null}

      {tab === 'promociones' ? (
      <section className="bo-card bo-table-wrap p-4 sm:p-5">
        {promocionesQuery.isPending ? (
          <p className="text-sm text-slate-500">Cargando promociones...</p>
        ) : promociones.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay promociones en el catálogo.</p>
        ) : (
          <table className="table table-sm sm:table-md">
            <thead>
              <tr className="text-slate-400">
                <th>Promoción</th>
                <th>Descripción</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {promociones.map((promo) => (
                <tr key={promo.id}>
                  <td className="font-medium">{promo.nombre}</td>
                  <td className="max-w-md truncate text-sm text-slate-500">{promo.descripcion}</td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setModal({ type: 'promocion', id: promo.id, editing: false })}
                    >
                      Ver
                    </button>
                    {canChangePromocion ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => setModal({ type: 'promocion', id: promo.id, editing: true })}
                      >
                        Editar
                      </button>
                    ) : null}
                    {canDeletePromocion ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs text-rose-600"
                        onClick={() =>
                          setConfirm({
                            title: 'Eliminar promoción',
                            message: `¿Eliminar la promoción “${promo.nombre}”? Esta acción no se puede deshacer.`,
                            run: () => deletePromocionMutation.mutate(promo.id),
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
      ) : null}

      {tab === 'pasos' ? (
      <section className="bo-card bo-table-wrap p-4 sm:p-5">
        {pasosQuery.isPending ? (
          <p className="text-sm text-slate-500">Cargando pasos...</p>
        ) : pasos.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay pasos en el catálogo.</p>
        ) : (
          <table className="table table-sm sm:table-md">
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
      ) : null}

      {tab === 'flujos' ? (
      <section className="bo-card bo-table-wrap p-4 sm:p-5">
        {flujosQuery.isPending ? (
          <p className="text-sm text-slate-500">Cargando flujos...</p>
        ) : flujos.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay flujos.</p>
        ) : (
          <table className="table table-sm sm:table-md">
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
      ) : null}

      {confirm ? (
        <ConfirmModal
          open
          title={confirm.title}
          message={confirm.message}
          pending={
            deletePasoMutation.isPending ||
            deleteFlujoMutation.isPending ||
            deleteProductoMutation.isPending ||
            deletePromocionMutation.isPending
          }
          onCancel={() => setConfirm(null)}
          onConfirm={() => confirm.run()}
        />
      ) : null}

      {modal?.type === 'create-producto' ? (
        <ProductoFormModal
          onClose={close}
          onSave={(form) => createProductoMutation.mutate(form)}
          pending={createProductoMutation.isPending}
        />
      ) : null}

      {modal?.type === 'producto' && selectedProducto ? (
        <ProductoFormModal
          editing={modal.editing}
          onClose={close}
          onDelete={() =>
            setConfirm({
              title: 'Eliminar producto',
              message: `¿Eliminar el producto “${selectedProducto.nombre}”? Si una venta lo usa, no se podrá borrar.`,
              run: () => deleteProductoMutation.mutate(selectedProducto.id),
            })
          }
          onSave={(form) => updateProductoMutation.mutate({ id: selectedProducto.id, payload: form })}
          pending={updateProductoMutation.isPending}
          producto={selectedProducto}
        />
      ) : null}

      {modal?.type === 'create-promocion' ? (
        <PromocionFormModal
          onClose={close}
          onSave={(form) => createPromocionMutation.mutate(form)}
          pending={createPromocionMutation.isPending}
        />
      ) : null}

      {modal?.type === 'promocion' && selectedPromocion ? (
        <PromocionFormModal
          editing={modal.editing}
          onClose={close}
          onDelete={() =>
            setConfirm({
              title: 'Eliminar promoción',
              message: `¿Eliminar la promoción “${selectedPromocion.nombre}”? Esta acción no se puede deshacer.`,
              run: () => deletePromocionMutation.mutate(selectedPromocion.id),
            })
          }
          onSave={(form) => updatePromocionMutation.mutate({ id: selectedPromocion.id, payload: form })}
          pending={updatePromocionMutation.isPending}
          promocion={selectedPromocion}
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

function ProductoFormModal({ producto, editing = true, onClose, onSave, onDelete, pending }) {
  const isCreate = !producto
  const form = useForm({
    defaultValues: {
      nombre: producto?.nombre ?? '',
      velocidad: producto ? String(producto.velocidad) : '',
      precio: producto ? String(producto.precio) : '',
    },
    validators: withSchema(productoFormSchema),
    onSubmit: ({ value }) =>
      onSave({
        nombre: value.nombre.trim(),
        velocidad: Number(value.velocidad),
        precio: value.precio.trim(),
      }),
  })

  useEffect(() => {
    form.reset({
      nombre: producto?.nombre ?? '',
      velocidad: producto ? String(producto.velocidad) : '',
      precio: producto ? String(producto.precio) : '',
    })
  }, [form, producto])

  return (
    <Modal
      open
      title={isCreate ? 'Nuevo producto' : editing ? 'Editar producto' : `Producto: ${producto.nombre}`}
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
      <div className="grid gap-3">
        {editing ? (
          <Field form={form} name="nombre">
            {(field) => <TextField field={field} label="Nombre" normalize="upper" />}
          </Field>
        ) : (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Nombre</span>
            <p className="font-medium">{producto.nombre}</p>
          </label>
        )}
        {editing ? (
          <Field form={form} name="velocidad">
            {(field) => <TextField field={field} inputMode="numeric" label="Velocidad (Mbps)" />}
          </Field>
        ) : (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Velocidad</span>
            <p>{producto.velocidad} Mbps</p>
          </label>
        )}
        {editing ? (
          <Field form={form} name="precio">
            {(field) => <TextField field={field} inputMode="decimal" label="Precio (S/)" />}
          </Field>
        ) : (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Precio</span>
            <p>S/ {producto.precio}</p>
          </label>
        )}
      </div>
    </Modal>
  )
}

function PromocionFormModal({ promocion, editing = true, onClose, onSave, onDelete, pending }) {
  const isCreate = !promocion
  const form = useForm({
    defaultValues: {
      nombre: promocion?.nombre ?? '',
      descripcion: promocion?.descripcion ?? '',
    },
    validators: withSchema(promocionFormSchema),
    onSubmit: ({ value }) => onSave({ nombre: value.nombre.trim(), descripcion: value.descripcion.trim() }),
  })

  useEffect(() => {
    form.reset({
      nombre: promocion?.nombre ?? '',
      descripcion: promocion?.descripcion ?? '',
    })
  }, [form, promocion])

  return (
    <Modal
      open
      title={isCreate ? 'Nueva promoción' : editing ? 'Editar promoción' : `Promoción: ${promocion.nombre}`}
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
            {(field) => <TextField field={field} label="Nombre" normalize="upper" />}
          </Field>
        ) : (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Nombre</span>
            <p className="font-medium">{promocion.nombre}</p>
          </label>
        )}
        {editing ? (
          <Field form={form} name="descripcion">
            {(field) => <TextAreaField field={field} label="Descripción" normalize="upper" />}
          </Field>
        ) : (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Descripción</span>
            <p>{promocion.descripcion || '—'}</p>
          </label>
        )}
      </div>
    </Modal>
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
