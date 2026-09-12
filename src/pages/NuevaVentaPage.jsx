import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CatalogEmpty from '../components/CatalogEmpty.jsx'
import {
  createDireccion,
  createPersona,
  createVenta,
  getChoices,
  getFlujos,
  getProductos,
  getPromociones,
} from '../service/api.js'

const emptyForm = {
  tipo_documento: 'DNI',
  numero_documento: '',
  nombres: '',
  apellidos: '',
  celular: '',
  distrito_nacimiento: '',
  padre: '',
  madre: '',
  tipo_direccion: 'CALLE',
  direccion: '',
  numero: '',
  distrito: '',
  producto: '',
  flujo: '',
  promociones: [],
}

export default function NuevaVentaPage({ onCancel, onCreated }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  const choicesQuery = useQuery({ queryKey: ['choices'], queryFn: getChoices })
  const productosQuery = useQuery({ queryKey: ['productos'], queryFn: getProductos })
  const flujosQuery = useQuery({ queryKey: ['flujos'], queryFn: getFlujos })
  const promocionesQuery = useQuery({ queryKey: ['promociones'], queryFn: getPromociones })

  const mutation = useMutation({
    mutationFn: async () => {
      const persona = await createPersona({
        tipo_documento: form.tipo_documento,
        numero_documento: form.numero_documento,
        nombres: form.nombres,
        apellidos: form.apellidos,
        distrito_nacimiento: form.distrito_nacimiento,
        padre: form.padre,
        madre: form.madre,
        celular: form.celular,
      })
      await createDireccion({
        cliente: persona.cliente,
        tipo: form.tipo_direccion,
        direccion: form.direccion,
        numero: form.numero,
        distrito: form.distrito,
      })
      return createVenta({
        cliente: persona.cliente,
        producto: Number(form.producto),
        flujo: Number(form.flujo),
        promociones: form.promociones.map(Number),
      })
    },
    onSuccess: (venta) => {
      queryClient.invalidateQueries({ queryKey: ['tabla-ventas'] })
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      onCreated(venta)
    },
    onError: (error) => setFormError(error.message),
  })

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }))
  const productos = productosQuery.data ?? []
  const flujos = flujosQuery.data ?? []
  const promociones = promocionesQuery.data ?? []
  const tiposDocumento = choicesQuery.data?.tipos_documento ?? []
  const tiposDireccion = choicesQuery.data?.tipos_direccion ?? []

  const canNext =
    form.numero_documento &&
    form.nombres &&
    form.apellidos &&
    form.celular &&
    form.distrito_nacimiento &&
    form.padre &&
    form.madre &&
    form.direccion &&
    form.numero &&
    form.distrito

  const canSubmit = form.producto && form.flujo

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nueva venta</h1>
          <p className="text-sm text-slate-500">Completa los datos del cliente y el plan para registrarla.</p>
        </div>
        <button type="button" className="btn btn-ghost rounded-full" onClick={onCancel}>
          Cancelar
        </button>
      </div>

      <CatalogEmpty flujos={flujos} productos={productos} />

      <section className="bo-card p-6">
        <ul className="steps mb-6 w-full">
          <li className={`step ${step >= 0 ? 'step-primary' : ''}`}>Cliente</li>
          <li className={`step ${step >= 1 ? 'step-primary' : ''}`}>Producto</li>
        </ul>

        {formError ? (
          <div className="alert alert-error mb-4">
            <span>{formError}</span>
          </div>
        ) : null}

        {step === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Tipo de documento</span>
              <select
                className="select select-bordered w-full"
                onChange={(event) => setField('tipo_documento', event.target.value)}
                value={form.tipo_documento}
              >
                {(tiposDocumento.length ? tiposDocumento : [{ value: 'DNI', label: 'DNI' }]).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">N° de documento</span>
              <input
                className="input input-bordered w-full"
                maxLength={9}
                onChange={(event) => setField('numero_documento', event.target.value)}
                value={form.numero_documento}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Nombres</span>
              <input
                className="input input-bordered w-full"
                onChange={(event) => setField('nombres', event.target.value)}
                value={form.nombres}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Apellidos</span>
              <input
                className="input input-bordered w-full"
                onChange={(event) => setField('apellidos', event.target.value)}
                value={form.apellidos}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Celular</span>
              <input
                className="input input-bordered w-full"
                maxLength={9}
                onChange={(event) => setField('celular', event.target.value)}
                value={form.celular}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Distrito de nacimiento</span>
              <input
                className="input input-bordered w-full"
                onChange={(event) => setField('distrito_nacimiento', event.target.value)}
                value={form.distrito_nacimiento}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Padre</span>
              <input
                className="input input-bordered w-full"
                onChange={(event) => setField('padre', event.target.value)}
                value={form.padre}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Madre</span>
              <input
                className="input input-bordered w-full"
                onChange={(event) => setField('madre', event.target.value)}
                value={form.madre}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Tipo de vía</span>
              <select
                className="select select-bordered w-full"
                onChange={(event) => setField('tipo_direccion', event.target.value)}
                value={form.tipo_direccion}
              >
                {(tiposDireccion.length ? tiposDireccion : [{ value: 'CALLE', label: 'Calle' }]).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Dirección</span>
              <input
                className="input input-bordered w-full"
                onChange={(event) => setField('direccion', event.target.value)}
                value={form.direccion}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Número</span>
              <input
                className="input input-bordered w-full"
                onChange={(event) => setField('numero', event.target.value)}
                value={form.numero}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Distrito</span>
              <input
                className="input input-bordered w-full"
                onChange={(event) => setField('distrito', event.target.value)}
                value={form.distrito}
              />
            </label>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-slate-500">Producto</span>
              <select
                className="select select-bordered w-full"
                onChange={(event) => setField('producto', event.target.value)}
                value={form.producto}
              >
                <option value="">Selecciona un producto</option>
                {productos.map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre} · {producto.velocidad} Mbps · S/ {producto.precio}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-slate-500">Flujo</span>
              <select
                className="select select-bordered w-full"
                onChange={(event) => setField('flujo', event.target.value)}
                value={form.flujo}
              >
                <option value="">Selecciona un flujo</option>
                {flujos.map((flujo) => (
                  <option key={flujo.id} value={flujo.id}>
                    {flujo.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-slate-500">Promociones</span>
              <select
                className="select select-bordered w-full"
                multiple
                onChange={(event) =>
                  setField(
                    'promociones',
                    Array.from(event.target.selectedOptions, (option) => option.value),
                  )
                }
                value={form.promociones}
              >
                {promociones.map((promo) => (
                  <option key={promo.id} value={promo.id}>
                    {promo.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          {step === 1 ? (
            <button type="button" className="btn btn-ghost rounded-full" onClick={() => setStep(0)}>
              Atrás
            </button>
          ) : null}
          {step === 0 ? (
            <button
              type="button"
              className="btn rounded-full border-none bg-blue-600 text-white hover:bg-blue-700"
              disabled={!canNext}
              onClick={() => setStep(1)}
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              className="btn rounded-full border-none bg-blue-600 text-white hover:bg-blue-700"
              disabled={!canSubmit || mutation.isPending}
              onClick={() => {
                setFormError('')
                mutation.mutate()
              }}
            >
              {mutation.isPending ? 'Guardando...' : 'Crear venta'}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
