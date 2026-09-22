import { useRef, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CatalogEmpty from '../components/CatalogEmpty.jsx'
import Field from '../components/Field.jsx'
import { SelectField, TextAreaField, TextField } from '../components/FormFields.jsx'
import Modal from '../components/Modal.jsx'
import {
  createDireccion,
  createEmpresa,
  createPersona,
  createVenta,
  getChoices,
  getFlujos,
  getProductos,
  getPromociones,
  lookupDireccion,
  lookupRuc,
  updateCliente,
} from '../service/api.js'
import { parseDireccion } from '../lib/address.js'
import { DOCUMENT_LENGTH, digitCode, nuevaVentaClienteSchema, nuevaVentaSchema, requiredText, validateDocumentNumber } from '../lib/schemas.js'
import { flujosPorTipo, formatDireccion, productosPorTipo } from '../lib/venta.js'

const defaultValues = {
  tipo_cliente: 'PERSONA',
  tipo_documento: 'DNI',
  numero_documento: '',
  nombres: '',
  apellidos: '',
  celular: '',
  correo: '',
  distrito_nacimiento: '',
  padre: '',
  madre: '',
  ruc: '',
  razon_social: '',
  tipo_direccion: 'CALLE',
  direccion: '',
  numero: '',
  distrito: '',
  urbanizacion: '',
  interior: '',
  tienda: '',
  piso: '',
  galeria: '',
  referencia: '',
  producto: '',
  flujo: '',
  promociones: [],
  cliente_id: '',
}

function personaPayload(value) {
  return {
    tipo_documento: value.tipo_documento,
    numero_documento: value.numero_documento,
    nombres: value.nombres,
    apellidos: value.apellidos,
    distrito_nacimiento: value.distrito_nacimiento,
    padre: value.padre,
    madre: value.madre,
    celular: value.celular,
    correo: value.correo.trim().toLowerCase(),
  }
}

function direccionPayload(value, clienteId) {
  return {
    cliente: clienteId,
    tipo: value.tipo_direccion,
    direccion: value.direccion,
    numero: value.numero,
    distrito: value.distrito,
    urbanizacion: value.urbanizacion,
    interior: value.interior,
    tienda: value.tienda,
    piso: value.piso,
    galeria: value.galeria,
    referencia: value.referencia,
  }
}

function step0Fields(tipoCliente) {
  const fields = ['ruc', 'numero_documento', 'nombres', 'apellidos', 'celular', 'correo', 'direccion', 'numero', 'distrito']
  if (tipoCliente === 'EMPRESA') {
    fields.splice(1, 0, 'razon_social')
  } else {
    fields.splice(5, 0, 'distrito_nacimiento', 'padre', 'madre')
  }
  return fields
}

const LOOKUP_FIELDS = [
  'tipo_cliente',
  'razon_social',
  'tipo_documento',
  'numero_documento',
  'nombres',
  'apellidos',
  'celular',
  'correo',
  'distrito_nacimiento',
  'padre',
  'madre',
  'tipo_direccion',
  'direccion',
  'numero',
  'distrito',
  'urbanizacion',
  'interior',
  'tienda',
  'piso',
  'galeria',
  'referencia',
  'producto',
  'flujo',
  'promociones',
]

function cambiarTipoCliente(form, tipo, { lastRucLookup, lookupRequestId, setLookupStatus, setRepresentantes, setStep }) {
  if (form.getFieldValue('tipo_cliente') === tipo) return
  const ruc = form.getFieldValue('ruc')
  form.setFieldValue('tipo_cliente', tipo)
  form.setFieldValue('ruc', ruc)
  form.setFieldValue('cliente_id', '')
  form.setFieldValue('flujo', '')
  form.setFieldValue('producto', '')
  form.setFieldValue('promociones', [])
  lastRucLookup.current = ''
  lookupRequestId.current += 1
  setLookupStatus('')
  setRepresentantes([])
  setStep(0)
}

function applyDireccion(form, data) {
  for (const name of ['tipo_direccion', 'direccion', 'numero', 'distrito', 'urbanizacion', 'interior', 'tienda', 'piso', 'galeria', 'referencia']) {
    if (data[name] !== undefined) form.setFieldValue(name, data[name] ?? '')
  }
}

function applyLookup(form, data) {
  if (data.tipo_cliente && data.tipo_cliente !== form.getFieldValue('tipo_cliente')) {
    form.setFieldValue('flujo', '')
  }
  for (const name of LOOKUP_FIELDS) {
    const value = data[name]
    if (value == null || value === '') continue
    form.setFieldValue(name, value)
  }
  form.setFieldValue('cliente_id', data.cliente_id ? String(data.cliente_id) : '')
}

export default function NuevaVentaPage({ onCancel, onCreated }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [formError, setFormError] = useState('')
  const [lookupStatus, setLookupStatus] = useState('')
  const [representantes, setRepresentantes] = useState([])
  const [direccionSugerencias, setDireccionSugerencias] = useState([])
  const lastRucLookup = useRef('')
  const lookupRequestId = useRef(0)
  const direccionTimer = useRef(0)

  const choicesQuery = useQuery({ queryKey: ['choices'], queryFn: getChoices })
  const productosQuery = useQuery({ queryKey: ['productos'], queryFn: getProductos })
  const flujosQuery = useQuery({ queryKey: ['flujos'], queryFn: getFlujos })
  const promocionesQuery = useQuery({ queryKey: ['promociones'], queryFn: getPromociones })

  const mutation = useMutation({
    mutationFn: async (value) => {
      let clienteId = value.cliente_id ? Number(value.cliente_id) : null
      if (!clienteId) {
        if (value.tipo_cliente === 'EMPRESA') {
          const representante = await createPersona(personaPayload(value))
          const empresa = await createEmpresa({
            ruc: value.ruc,
            razon_social: value.razon_social,
            representante_legal: representante.id,
            correo: value.correo.trim().toLowerCase(),
          })
          clienteId = empresa.cliente
        } else {
          const persona = await createPersona(personaPayload(value))
          clienteId = persona.cliente
        }
      } else {
        await updateCliente(clienteId, { correo: value.correo.trim().toLowerCase() })
      }
      const direccion = await createDireccion(direccionPayload(value, clienteId))
      return createVenta({
        cliente: clienteId,
        direccion: direccion.id,
        producto: Number(value.producto),
        flujo: Number(value.flujo),
        promociones: value.promociones.map(Number),
      })
    },
    onSuccess: (venta) => {
      queryClient.invalidateQueries({ queryKey: ['tabla-ventas'] })
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      onCreated(venta)
    },
    onError: (error) => setFormError(error.message),
  })

  const form = useForm({
    defaultValues,
    validators: { onSubmit: nuevaVentaSchema },
    onSubmit: async ({ value }) => {
      setFormError('')
      await mutation.mutateAsync(value)
    },
  })

  const productos = productosQuery.data ?? []
  const promociones = promocionesQuery.data ?? []
  const tiposDocumento = choicesQuery.data?.tipos_documento ?? [{ value: 'DNI', label: 'DNI' }]
  const tiposDireccion = choicesQuery.data?.tipos_direccion ?? [{ value: 'CALLE', label: 'Calle' }]

  const buscarDireccion = (query) => {
    window.clearTimeout(direccionTimer.current)
    direccionTimer.current = window.setTimeout(async () => {
      const parsed = parseDireccion(query)
      if (parsed.numero || parsed.distrito) {
        applyDireccion(form, parsed)
        setDireccionSugerencias([])
        return
      }
      if (!query || query.length < 2) {
        setDireccionSugerencias([])
        return
      }
      try {
        const data = await lookupDireccion(query)
        if (data.parsed?.direccion) {
          applyDireccion(form, data.parsed)
          setDireccionSugerencias([])
          return
        }
        const items = data.items ?? []
        if (items.length === 1 && items[0].direccion.startsWith(query)) {
          applyDireccion(form, items[0])
          setDireccionSugerencias([])
        } else {
          setDireccionSugerencias(items)
        }
      } catch {
        setDireccionSugerencias([])
      }
    }, 280)
  }

  const buscarPorRuc = async (ruc) => {
    if (!/^\d{11}$/.test(ruc) || lastRucLookup.current === ruc) return
    lastRucLookup.current = ruc
    const requestId = ++lookupRequestId.current
    setLookupStatus('Buscando RUC...')
    try {
      const data = await lookupRuc(ruc)
      if (requestId !== lookupRequestId.current) return
      applyLookup(form, data)
      const reps = data.representantes ?? []
      setRepresentantes(reps)
      if (reps.length > 1) {
        setLookupStatus('Se encontraron varios representantes. Elige con cuál completar el formulario.')
      } else {
        setLookupStatus(
          data.source === 'cliente'
            ? 'Se completó con datos de un cliente ya registrado.'
            : 'Se completó con datos de SUNAT.',
        )
      }
    } catch (error) {
      if (requestId !== lookupRequestId.current) return
      lastRucLookup.current = ''
      form.setFieldValue('cliente_id', '')
      setRepresentantes([])
      setLookupStatus(error.message || 'No se encontraron datos para este RUC.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Nueva venta</h1>
          <p className="text-sm text-slate-500">
            El flujo de pasos cambia según si el cliente es persona natural (RUC 10) o empresa (RUC 20).
          </p>
        </div>
        <button type="button" className="btn btn-ghost rounded-full" onClick={onCancel}>
          Cancelar
        </button>
      </div>

      <form.Subscribe selector={(state) => state.values.tipo_cliente}>
        {(tipo) => (
          <CatalogEmpty
            flujos={flujosPorTipo(flujosQuery.data, tipo)}
            productos={productosPorTipo(productos, tipo)}
          />
        )}
      </form.Subscribe>

      <section className="bo-card p-4 sm:p-6">
        <ul className="steps steps-vertical mb-6 w-full sm:steps-horizontal">
          <li className={`step ${step >= 0 ? 'step-primary' : ''}`}>Cliente</li>
          <li className={`step ${step >= 1 ? 'step-primary' : ''}`}>Producto y flujo</li>
        </ul>

        {lookupStatus ? (
          <div className="alert mb-4 bg-slate-100 text-slate-700">
            <span>{lookupStatus}</span>
          </div>
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            form.handleSubmit()
          }}
        >
          <form.Subscribe selector={(state) => state.values}>
            {(values) => {
              const flujos = flujosPorTipo(flujosQuery.data, values.tipo_cliente)
              const productosTipo = productosPorTipo(productos, values.tipo_cliente)
              const flujoSeleccionado = flujos.find((flujo) => String(flujo.id) === String(values.flujo))
              const pasosFlujo = [...(flujoSeleccionado?.pasos_detalle ?? [])].sort(
                (a, b) => a.orden - b.orden,
              )
              return (
                <>
                  <div className={`grid gap-4 md:grid-cols-2 ${step !== 0 ? 'hidden' : ''}`}>
                      <div className="flex rounded-full bg-slate-100 p-1 md:col-span-2">
                        <button
                          type="button"
                          className={`flex-1 rounded-full py-2 text-sm ${
                            values.tipo_cliente === 'PERSONA' ? 'bg-white font-medium shadow' : 'text-slate-500'
                          }`}
                          onClick={() =>
                            cambiarTipoCliente(form, 'PERSONA', {
                              lastRucLookup,
                              lookupRequestId,
                              setLookupStatus,
                              setRepresentantes,
                              setStep,
                            })
                          }
                        >
                          Persona Natural
                        </button>
                        <button
                          type="button"
                          className={`flex-1 rounded-full py-2 text-sm ${
                            values.tipo_cliente === 'EMPRESA' ? 'bg-white font-medium shadow' : 'text-slate-500'
                          }`}
                          onClick={() =>
                            cambiarTipoCliente(form, 'EMPRESA', {
                              lastRucLookup,
                              lookupRequestId,
                              setLookupStatus,
                              setRepresentantes,
                              setStep,
                            })
                          }
                        >
                          Persona Jurídica
                        </button>
                      </div>

                      <Field
                        form={form}
                        name="ruc"
                        listeners={{
                          onChange: ({ value }) => {
                            const ruc = String(value || '')
                            if (ruc.length !== 11) {
                              lastRucLookup.current = ''
                              lookupRequestId.current += 1
                              form.setFieldValue('cliente_id', '')
                              setLookupStatus('')
                              setRepresentantes([])
                            }
                            buscarPorRuc(ruc)
                          },
                        }}
                        validators={
                          values.tipo_cliente === 'EMPRESA'
                            ? digitCode(11, 'El RUC debe tener 11 dígitos')
                            : undefined
                        }
                      >
                        {(field) => (
                          <TextField
                            className={values.tipo_cliente === 'PERSONA' ? 'md:col-span-2' : ''}
                            field={field}
                            inputMode="numeric"
                            label={
                              values.tipo_cliente === 'EMPRESA'
                                ? 'RUC'
                                : 'RUC (opcional, autocompleta si ya existe o en SUNAT)'
                            }
                            maxLength={11}
                            onBlur={() => buscarPorRuc(field.state.value)}
                          />
                        )}
                      </Field>
                      {values.tipo_cliente === 'EMPRESA' ? (
                        <>
                          <Field form={form} name="razon_social" validators={requiredText()}>
                            {(field) => <TextField field={field} label="Razón social" normalize="upper" />}
                          </Field>
                          <p className="text-sm font-medium text-slate-600 md:col-span-2">Representante legal</p>
                        </>
                      ) : null}

                      <Field
                        form={form}
                        name="tipo_documento"
                        listeners={{
                          onChange: ({ fieldApi }) => {
                            fieldApi.form.validateField('numero_documento', 'change')
                          },
                        }}
                      >
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
                          <TextField
                            field={field}
                            inputMode="numeric"
                            label="N° de documento"
                            maxLength={DOCUMENT_LENGTH[values.tipo_documento] ?? DOCUMENT_LENGTH.DNI}
                          />
                        )}
                      </Field>
                    </div>
                  <div className={`grid gap-4 md:grid-cols-2 ${step !== 1 ? 'hidden' : ''}`}>
                      <Field form={form} name="producto" validators={requiredText('Selecciona un producto')}>
                        {(field) => (
                          <SelectField
                            className="md:col-span-2"
                            field={field}
                            label={`Producto ${values.tipo_cliente === 'EMPRESA' ? '(empresa)' : '(persona natural)'}`}
                            options={productosTipo.map((producto) => ({
                              value: String(producto.id),
                              label: `${producto.nombre} · ${producto.velocidad} Mbps · S/ ${producto.precio}`,
                            }))}
                            placeholder="Selecciona un producto"
                          />
                        )}
                      </Field>
                      {productosTipo.length === 0 ? (
                        <p className="text-xs text-orange-600 md:col-span-2">
                          No hay un producto configurado para este tipo de cliente.
                        </p>
                      ) : null}
                      <Field form={form} name="flujo" validators={requiredText('Selecciona un flujo')}>
                        {(field) => (
                          <SelectField
                            className="md:col-span-2"
                            field={field}
                            label={`Flujo ${values.tipo_cliente === 'EMPRESA' ? '(RUC 20 / empresa)' : '(RUC 10 / persona natural)'}`}
                            options={flujos.map((flujo) => ({
                              value: String(flujo.id),
                              label: flujo.nombre,
                            }))}
                            placeholder="Selecciona un flujo"
                          />
                        )}
                      </Field>
                      {flujos.length === 0 ? (
                        <p className="text-xs text-orange-600 md:col-span-2">
                          No hay un flujo configurado para este tipo de cliente.
                        </p>
                      ) : null}
                      {pasosFlujo.length ? (
                        <ol className="rounded-xl bg-slate-50 p-4 text-sm md:col-span-2">
                          {pasosFlujo.map((paso) => (
                            <li key={paso.id} className="mb-1">
                              {paso.orden}. {paso.paso_detalle?.nombre}
                            </li>
                          ))}
                        </ol>
                      ) : null}
                      <Field form={form} name="promociones">
                        {(field) => (
                          <SelectField
                            className="md:col-span-2"
                            field={field}
                            label="Promociones"
                            multiple
                            options={promociones.map((promo) => ({
                              value: String(promo.id),
                              label: promo.nombre,
                            }))}
                          />
                        )}
                      </Field>
                    </div>
                </>
              )
            }}
          </form.Subscribe>

          <form.Subscribe selector={(state) => state.values.tipo_cliente}>
            {(tipoCliente) => (
          <div className={`mt-4 grid gap-4 md:grid-cols-2 ${step !== 0 ? 'hidden' : ''}`}>
              <Field form={form} name="nombres" validators={requiredText()}>
                {(field) => <TextField field={field} label="Nombres" normalize="upper" />}
              </Field>
              <Field form={form} name="apellidos" validators={requiredText()}>
                {(field) => <TextField field={field} label="Apellidos" normalize="upper" />}
              </Field>
              <Field
                form={form}
                name="celular"
                validators={digitCode(9, 'El celular debe tener 9 dígitos')}
              >
                {(field) => (
                  <TextField field={field} inputMode="numeric" label="Celular" maxLength={9} />
                )}
              </Field>
              <Field
                form={form}
                name="correo"
                validators={requiredText('El correo de facturación es obligatorio').email('Usa un correo válido')}
              >
                {(field) => (
                  <TextField
                    autoComplete="email"
                    field={field}
                    label="Correo de facturación"
                    type="email"
                  />
                )}
              </Field>
              {tipoCliente === 'PERSONA' ? (
                <>
                  <Field form={form} name="distrito_nacimiento" validators={requiredText()}>
                    {(field) => <TextField field={field} label="Distrito de nacimiento" normalize="upper" />}
                  </Field>
                  <Field form={form} name="padre" validators={requiredText()}>
                    {(field) => <TextField field={field} label="Padre" normalize="upper" />}
                  </Field>
                  <Field form={form} name="madre" validators={requiredText()}>
                    {(field) => <TextField field={field} label="Madre" normalize="upper" />}
                  </Field>
                </>
              ) : null}
              <Field form={form} name="tipo_direccion">
                {(field) => (
                  <SelectField
                    field={field}
                    includeEmpty={false}
                    label="Tipo de vía"
                    options={tiposDireccion}
                  />
                )}
              </Field>
              <Field form={form} name="direccion" validators={requiredText()}>
                {(field) => (
                  <div className="relative">
                    <TextField
                      autoComplete="off"
                      field={field}
                      label="Dirección"
                      normalize="upper"
                      onBlur={() => {
                        const parsed = parseDireccion(field.state.value)
                        if (parsed.numero || parsed.distrito) applyDireccion(form, parsed)
                      }}
                      onValueChange={buscarDireccion}
                    />
                    {direccionSugerencias.length > 0 ? (
                      <ul className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                        {direccionSugerencias.map((item) => (
                          <li key={`${item.tipo_direccion}-${item.direccion}-${item.numero}-${item.distrito}-${item.tienda}-${item.piso}-${item.galeria}-${item.interior}`}>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                applyDireccion(form, item)
                                setDireccionSugerencias([])
                              }}
                            >
                              {formatDireccion({ ...item, tipo: item.tipo_direccion })}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )}
              </Field>
              <Field form={form} name="numero" validators={requiredText()}>
                {(field) => <TextField field={field} label="Número" normalize="upper" />}
              </Field>
              <Field form={form} name="distrito" validators={requiredText()}>
                {(field) => <TextField field={field} label="Distrito" normalize="upper" />}
              </Field>
              <Field form={form} name="piso">
                {(field) => <TextField field={field} label="Piso" normalize="upper" />}
              </Field>
              <Field form={form} name="interior">
                {(field) => <TextField field={field} label="Interior" normalize="upper" />}
              </Field>
              <Field form={form} name="tienda">
                {(field) => <TextField field={field} label="Tienda" normalize="upper" />}
              </Field>
              <Field form={form} name="galeria">
                {(field) => (
                  <TextField field={field} label="Galería o centro comercial" normalize="upper" />
                )}
              </Field>
              <Field form={form} name="urbanizacion">
                {(field) => <TextField field={field} label="Urbanización" normalize="upper" />}
              </Field>
              <Field form={form} name="referencia">
                {(field) => <TextAreaField className="sm:col-span-2" field={field} label="Referencia" normalize="upper" rows={2} />}
              </Field>
            </div>
            )}
          </form.Subscribe>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {step === 1 ? (
              <button type="button" className="btn btn-ghost rounded-full" onClick={() => setStep(0)}>
                Atrás
              </button>
            ) : null}
            {step === 0 ? (
              <button
                type="button"
                className="btn rounded-full border-none bg-blue-600 text-white hover:bg-blue-700"
                onClick={async () => {
                  const values = form.state.values
                  const parsed = nuevaVentaClienteSchema.safeParse(values)
                  const tipo = values.tipo_cliente
                  const results = await Promise.all(
                    step0Fields(tipo).map((name) => form.validateField(name, 'submit')),
                  )
                  if (!parsed.success || results.some((errors) => errors?.length)) return
                  const flujos = flujosPorTipo(flujosQuery.data, tipo)
                  const productosTipo = productosPorTipo(productos, tipo)
                  if (!form.getFieldValue('flujo') && flujos.length === 1) {
                    form.setFieldValue('flujo', String(flujos[0].id))
                  }
                  const productoActual = form.getFieldValue('producto')
                  if (
                    productoActual &&
                    !productosTipo.some((producto) => String(producto.id) === String(productoActual))
                  ) {
                    form.setFieldValue('producto', '')
                  }
                  if (!form.getFieldValue('producto') && productosTipo.length === 1) {
                    form.setFieldValue('producto', String(productosTipo[0].id))
                  }
                  setStep(1)
                }}
              >
                Siguiente
              </button>
            ) : (
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <button
                    type="submit"
                    className="btn rounded-full border-none bg-blue-600 text-white hover:bg-blue-700"
                    disabled={isSubmitting || mutation.isPending}
                  >
                    {mutation.isPending ? 'Guardando...' : 'Crear venta'}
                  </button>
                )}
              </form.Subscribe>
            )}
          </div>
        </form>
      </section>

      <Modal
        open={representantes.length > 1}
        title="Selecciona el representante legal"
        onClose={() => setRepresentantes([])}
      >
        <p className="mb-3 text-sm text-slate-500">
          SUNAT reportó más de un representante. Elige con qué datos completar el formulario.
        </p>
        <div className="space-y-2">
          {representantes.map((rep) => (
            <button
              key={`${rep.tipo_documento}-${rep.numero_documento}`}
              type="button"
              className="btn h-auto w-full justify-start whitespace-normal rounded-xl border border-slate-200 bg-white py-3 text-left font-normal hover:bg-slate-50"
              onClick={() => {
                applyLookup(form, rep)
                setRepresentantes([])
                setLookupStatus(
                  `Representante seleccionado: ${rep.nombre_completo}${rep.cargo ? ` (${rep.cargo})` : ''}.`,
                )
              }}
            >
              <span>
                <span className="block font-medium">{rep.nombre_completo}</span>
                <span className="block text-xs text-slate-500">
                  {rep.cargo ? `${rep.cargo} · ` : ''}
                  {rep.tipo_documento} {rep.numero_documento}
                </span>
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
