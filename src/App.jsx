import { useMemo, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDireccion,
  createEmpresa,
  createPersona,
  createVenta,
  getChoices,
  getFlujos,
  getProductos,
  getPromociones,
  getVentas,
} from './lib/api'
import { SelectField, TextField } from './components/FormFields'
import { SalesTable } from './components/SalesTable'

const steps = ['Cliente', 'Direccion', 'Plan', 'Resumen']

const defaultValues = {
  tipoCliente: 'PERSONA',
  personaTipoDocumento: 'DNI',
  personaNumeroDocumento: '',
  personaNombres: '',
  personaApellidos: '',
  personaDistritoNacimiento: '',
  personaPadre: '',
  personaMadre: '',
  personaCelular: '',
  empresaRuc: '',
  empresaRazonSocial: '',
  representanteTipoDocumento: 'DNI',
  representanteNumeroDocumento: '',
  representanteNombres: '',
  representanteApellidos: '',
  representanteDistritoNacimiento: '',
  representantePadre: '',
  representanteMadre: '',
  representanteCelular: '',
  direccionTipo: 'AVENIDA',
  direccion: '',
  numero: '',
  distrito: '',
  urbanizacion: '',
  manzana: '',
  lote: '',
  referencia: '',
  producto: '',
  flujo: '',
  promociones: [],
}

const required = (label) => ({ value }) => {
  if (String(value ?? '').trim()) {
    return undefined
  }
  return `${label} es obligatorio`
}

const exactDigits = (label, length) => ({ value }) => {
  if (new RegExp(`^\\d{${length}}$`).test(String(value ?? ''))) {
    return undefined
  }
  return `${label} debe tener ${length} digitos`
}

const maxDigits = (label, length) => ({ value }) => {
  if (new RegExp(`^\\d{1,${length}}$`).test(String(value ?? ''))) {
    return undefined
  }
  return `${label} debe tener hasta ${length} digitos`
}

function asOptions(items, getLabel = (item) => item.nombre) {
  return items.map((item) => ({ value: String(item.id), label: getLabel(item) }))
}

function Field({ form, name, children, validators }) {
  return (
    <form.Field name={name} validators={validators ? { onChange: validators, onBlur: validators } : undefined}>
      {children}
    </form.Field>
  )
}

function Stepper({ currentStep }) {
  return (
    <ul className="steps steps-vertical lg:steps-horizontal w-full">
      {steps.map((step, index) => (
        <li key={step} className={`step ${index <= currentStep ? 'step-primary' : ''}`}>
          {step}
        </li>
      ))}
    </ul>
  )
}

function SectionTitle({ title, detail }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-semibold text-base-content">{title}</h2>
      <p className="text-sm text-base-content/65">{detail}</p>
    </div>
  )
}

function CatalogEmpty({ productos, flujos }) {
  if (productos.length && flujos.length) {
    return null
  }

  return (
    <div className="alert alert-warning mb-4">
      <span>
        Falta configurar {productos.length ? '' : 'productos'} {!productos.length && !flujos.length ? 'y' : ''}{' '}
        {flujos.length ? '' : 'flujos'} en el backend antes de registrar una venta completa.
      </span>
    </div>
  )
}

function App() {
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [createdSale, setCreatedSale] = useState(null)

  const choicesQuery = useQuery({ queryKey: ['choices'], queryFn: getChoices })
  const productosQuery = useQuery({ queryKey: ['productos'], queryFn: getProductos })
  const promocionesQuery = useQuery({ queryKey: ['promociones'], queryFn: getPromociones })
  const flujosQuery = useQuery({ queryKey: ['flujos'], queryFn: getFlujos })
  const ventasQuery = useQuery({ queryKey: ['ventas'], queryFn: getVentas })

  const catalogosCargando =
    choicesQuery.isLoading || productosQuery.isLoading || promocionesQuery.isLoading || flujosQuery.isLoading

  const choices = useMemo(() => choicesQuery.data ?? {}, [choicesQuery.data])
  const productos = useMemo(() => productosQuery.data ?? [], [productosQuery.data])
  const promociones = useMemo(() => promocionesQuery.data ?? [], [promocionesQuery.data])
  const flujos = useMemo(() => flujosQuery.data ?? [], [flujosQuery.data])

  const productoOptions = useMemo(
    () => asOptions(productos, (producto) => `${producto.nombre} - ${producto.velocidad} Mbps - S/ ${producto.precio}`),
    [productos],
  )
  const promocionOptions = useMemo(() => asOptions(promociones), [promociones])
  const flujoOptions = useMemo(() => asOptions(flujos), [flujos])

  const createSaleMutation = useMutation({
    mutationFn: async (value) => {
      const isPersona = value.tipoCliente === 'PERSONA'
      let clienteId

      if (isPersona) {
        const persona = await createPersona({
          tipo_documento: value.personaTipoDocumento,
          numero_documento: value.personaNumeroDocumento,
          nombres: value.personaNombres,
          apellidos: value.personaApellidos,
          distrito_nacimiento: value.personaDistritoNacimiento,
          padre: value.personaPadre,
          madre: value.personaMadre,
          celular: value.personaCelular,
        })
        clienteId = persona.cliente
      } else {
        const representante = await createPersona({
          tipo_documento: value.representanteTipoDocumento,
          numero_documento: value.representanteNumeroDocumento,
          nombres: value.representanteNombres,
          apellidos: value.representanteApellidos,
          distrito_nacimiento: value.representanteDistritoNacimiento,
          padre: value.representantePadre,
          madre: value.representanteMadre,
          celular: value.representanteCelular,
        })
        const empresa = await createEmpresa({
          ruc: value.empresaRuc,
          razon_social: value.empresaRazonSocial,
          representante_legal: representante.id,
        })
        clienteId = empresa.cliente
      }

      await createDireccion({
        cliente: clienteId,
        tipo: value.direccionTipo,
        direccion: value.direccion,
        numero: value.numero,
        distrito: value.distrito,
        urbanizacion: value.urbanizacion,
        manzana: value.manzana,
        lote: value.lote,
        referencia: value.referencia,
      })

      return createVenta({
        cliente: clienteId,
        producto: Number(value.producto),
        flujo: Number(value.flujo),
        promociones: value.promociones.map(Number),
      })
    },
    onSuccess: (venta) => {
      setCreatedSale(venta)
      queryClient.invalidateQueries({ queryKey: ['ventas'] })
    },
  })

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await createSaleMutation.mutateAsync(value)
    },
  })

  const values = form.store.state.values
  const isPersona = values.tipoCliente === 'PERSONA'

  const canGoNext = () => {
    if (currentStep === 0 && isPersona) {
      return (
        values.personaNumeroDocumento &&
        values.personaNombres &&
        values.personaApellidos &&
        values.personaDistritoNacimiento &&
        values.personaPadre &&
        values.personaMadre &&
        values.personaCelular
      )
    }

    if (currentStep === 0) {
      return (
        values.empresaRuc &&
        values.empresaRazonSocial &&
        values.representanteNumeroDocumento &&
        values.representanteNombres &&
        values.representanteApellidos &&
        values.representanteDistritoNacimiento &&
        values.representantePadre &&
        values.representanteMadre &&
        values.representanteCelular
      )
    }

    if (currentStep === 1) {
      return values.direccion && values.numero && values.distrito
    }

    if (currentStep === 2) {
      return values.producto && values.flujo
    }

    return true
  }

  const nextStep = () => {
    if (canGoNext()) {
      setCurrentStep((step) => Math.min(step + 1, steps.length - 1))
    }
  }

  return (
    <main className="min-h-screen bg-base-200">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 lg:px-8">
        <header className="navbar rounded-box bg-base-100 px-4 shadow-sm">
          <div className="flex-1">
            <div>
              <h1 className="text-2xl font-bold text-base-content">Backoffice ventas</h1>
              <p className="text-sm text-base-content/65">Alta de cliente, direccion, plan y seguimiento comercial.</p>
            </div>
          </div>
          <div className="badge badge-primary badge-outline">API conectada</div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm md:p-6">
            <Stepper currentStep={currentStep} />

            {catalogosCargando ? (
              <div className="flex min-h-96 items-center justify-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : (
              <form
                className="mt-6"
                onSubmit={(event) => {
                  event.preventDefault()
                  void form.handleSubmit()
                }}
              >
                {currentStep === 0 && (
                  <div>
                    <SectionTitle
                      title={isPersona ? 'Datos de persona' : 'Datos de empresa'}
                      detail="Identifica al titular del servicio y evita documentos incompletos."
                    />

                    <div className="mb-5 grid gap-3 sm:grid-cols-2">
                      <button
                        className={`btn ${isPersona ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => form.setFieldValue('tipoCliente', 'PERSONA')}
                        type="button"
                      >
                        Persona natural
                      </button>
                      <button
                        className={`btn ${!isPersona ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => form.setFieldValue('tipoCliente', 'EMPRESA')}
                        type="button"
                      >
                        Empresa
                      </button>
                    </div>

                    {isPersona ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field form={form} name="personaTipoDocumento">
                          {(field) => <SelectField field={field} label="Tipo de documento" options={choices.tipos_documento ?? []} />}
                        </Field>
                        <Field form={form} name="personaNumeroDocumento" validators={exactDigits('Documento', 8)}>
                          {(field) => <TextField field={field} inputMode="numeric" label="Numero de documento" maxLength={9} />}
                        </Field>
                        <Field form={form} name="personaNombres" validators={required('Nombres')}>
                          {(field) => <TextField field={field} label="Nombres" />}
                        </Field>
                        <Field form={form} name="personaApellidos" validators={required('Apellidos')}>
                          {(field) => <TextField field={field} label="Apellidos" />}
                        </Field>
                        <Field form={form} name="personaDistritoNacimiento" validators={required('Distrito de nacimiento')}>
                          {(field) => <TextField field={field} label="Distrito de nacimiento" />}
                        </Field>
                        <Field form={form} name="personaCelular" validators={exactDigits('Celular', 9)}>
                          {(field) => <TextField field={field} inputMode="numeric" label="Celular" maxLength={9} />}
                        </Field>
                        <Field form={form} name="personaPadre" validators={required('Nombre del padre')}>
                          {(field) => <TextField field={field} label="Padre" />}
                        </Field>
                        <Field form={form} name="personaMadre" validators={required('Nombre de la madre')}>
                          {(field) => <TextField field={field} label="Madre" />}
                        </Field>
                      </div>
                    ) : (
                      <div className="grid gap-5">
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field form={form} name="empresaRuc" validators={exactDigits('RUC', 11)}>
                            {(field) => <TextField field={field} inputMode="numeric" label="RUC" maxLength={11} />}
                          </Field>
                          <Field form={form} name="empresaRazonSocial" validators={required('Razon social')}>
                            {(field) => <TextField field={field} label="Razon social" />}
                          </Field>
                        </div>
                        <div className="divider my-1">Representante legal</div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field form={form} name="representanteTipoDocumento">
                            {(field) => <SelectField field={field} label="Tipo de documento" options={choices.tipos_documento ?? []} />}
                          </Field>
                          <Field form={form} name="representanteNumeroDocumento" validators={exactDigits('Documento', 8)}>
                            {(field) => <TextField field={field} inputMode="numeric" label="Numero de documento" maxLength={9} />}
                          </Field>
                          <Field form={form} name="representanteNombres" validators={required('Nombres')}>
                            {(field) => <TextField field={field} label="Nombres" />}
                          </Field>
                          <Field form={form} name="representanteApellidos" validators={required('Apellidos')}>
                            {(field) => <TextField field={field} label="Apellidos" />}
                          </Field>
                          <Field form={form} name="representanteDistritoNacimiento" validators={required('Distrito de nacimiento')}>
                            {(field) => <TextField field={field} label="Distrito de nacimiento" />}
                          </Field>
                          <Field form={form} name="representanteCelular" validators={exactDigits('Celular', 9)}>
                            {(field) => <TextField field={field} inputMode="numeric" label="Celular" maxLength={9} />}
                          </Field>
                          <Field form={form} name="representantePadre" validators={required('Nombre del padre')}>
                            {(field) => <TextField field={field} label="Padre" />}
                          </Field>
                          <Field form={form} name="representanteMadre" validators={required('Nombre de la madre')}>
                            {(field) => <TextField field={field} label="Madre" />}
                          </Field>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 1 && (
                  <div>
                    <SectionTitle title="Direccion de instalacion" detail="Guarda una referencia clara para que operaciones no tenga que perseguir datos despues." />
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field form={form} name="direccionTipo">
                        {(field) => <SelectField field={field} label="Tipo de via" options={choices.tipos_direccion ?? []} />}
                      </Field>
                      <Field form={form} name="direccion" validators={required('Direccion')}>
                        {(field) => <TextField field={field} label="Direccion" />}
                      </Field>
                      <Field form={form} name="numero" validators={maxDigits('Numero', 10)}>
                        {(field) => <TextField field={field} inputMode="numeric" label="Numero" maxLength={10} />}
                      </Field>
                      <Field form={form} name="distrito" validators={required('Distrito')}>
                        {(field) => <TextField field={field} label="Distrito" />}
                      </Field>
                      <Field form={form} name="urbanizacion">
                        {(field) => <TextField field={field} label="Urbanizacion" />}
                      </Field>
                      <Field form={form} name="manzana">
                        {(field) => <TextField field={field} label="Manzana" maxLength={10} />}
                      </Field>
                      <Field form={form} name="lote">
                        {(field) => <TextField field={field} label="Lote" maxLength={10} />}
                      </Field>
                      <div className="md:col-span-2">
                        <Field form={form} name="referencia">
                          {(field) => <TextField field={field} label="Referencia" />}
                        </Field>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div>
                    <SectionTitle title="Producto y promocion" detail="Selecciona el plan, promociones aplicables y el flujo operativo que se generara." />
                    <CatalogEmpty productos={productos} flujos={flujos} />
                    <div className="grid gap-4">
                      <Field form={form} name="producto" validators={required('Producto')}>
                        {(field) => <SelectField field={field} label="Producto" options={productoOptions} placeholder="Selecciona un producto" />}
                      </Field>
                      <Field form={form} name="flujo" validators={required('Flujo')}>
                        {(field) => <SelectField field={field} label="Flujo de venta" options={flujoOptions} placeholder="Selecciona un flujo" />}
                      </Field>
                      <div>
                        <span className="label-text font-medium">Promociones</span>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {promocionOptions.length ? (
                            promocionOptions.map((promo) => (
                              <label key={promo.value} className="flex cursor-pointer items-center gap-3 rounded-box border border-base-300 p-3">
                                <input
                                  checked={values.promociones.includes(promo.value)}
                                  className="checkbox checkbox-primary"
                                  onChange={(event) => {
                                    const selected = new Set(values.promociones)
                                    if (event.target.checked) {
                                      selected.add(promo.value)
                                    } else {
                                      selected.delete(promo.value)
                                    }
                                    form.setFieldValue('promociones', Array.from(selected))
                                  }}
                                  type="checkbox"
                                />
                                <span>{promo.label}</span>
                              </label>
                            ))
                          ) : (
                            <div className="alert bg-base-200">
                              <span>No hay promociones registradas. Puedes continuar sin promocion.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div>
                    <SectionTitle title="Revision final" detail="Confirma los datos antes de crear cliente, direccion y venta." />
                    <div className="grid gap-4 md:grid-cols-2">
                      <SummaryCard title="Cliente">
                        {isPersona ? (
                          <>
                            <p>{values.personaNombres} {values.personaApellidos}</p>
                            <p>DNI/CE: {values.personaNumeroDocumento}</p>
                            <p>Celular: {values.personaCelular}</p>
                          </>
                        ) : (
                          <>
                            <p>{values.empresaRazonSocial}</p>
                            <p>RUC: {values.empresaRuc}</p>
                            <p>Rep.: {values.representanteNombres} {values.representanteApellidos}</p>
                          </>
                        )}
                      </SummaryCard>
                      <SummaryCard title="Direccion">
                        <p>{values.direccionTipo} {values.direccion} {values.numero}</p>
                        <p>{values.distrito}</p>
                        <p>{values.referencia || 'Sin referencia'}</p>
                      </SummaryCard>
                      <SummaryCard title="Plan">
                        <p>{productoOptions.find((item) => item.value === values.producto)?.label ?? 'Sin producto'}</p>
                        <p>{flujoOptions.find((item) => item.value === values.flujo)?.label ?? 'Sin flujo'}</p>
                      </SummaryCard>
                      <SummaryCard title="Promociones">
                        <p>
                          {values.promociones
                            .map((promoId) => promocionOptions.find((item) => item.value === promoId)?.label)
                            .filter(Boolean)
                            .join(', ') || 'Sin promociones'}
                        </p>
                      </SummaryCard>
                    </div>
                  </div>
                )}

                {createSaleMutation.isError && (
                  <div className="alert alert-error mt-6">
                    <span>{createSaleMutation.error.message}</span>
                  </div>
                )}

                {createdSale && (
                  <div className="alert alert-success mt-6">
                    <span>Venta #{createdSale.id} creada correctamente con {createdSale.pasos.length} pasos operativos.</span>
                  </div>
                )}

                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button
                    className="btn btn-ghost"
                    disabled={currentStep === 0 || createSaleMutation.isPending}
                    onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
                    type="button"
                  >
                    Volver
                  </button>
                  {currentStep < steps.length - 1 ? (
                    <button className="btn btn-primary" disabled={!canGoNext()} onClick={nextStep} type="button">
                      Continuar
                    </button>
                  ) : (
                    <button className="btn btn-primary" disabled={createSaleMutation.isPending || !canGoNext()} type="submit">
                      {createSaleMutation.isPending ? <span className="loading loading-spinner"></span> : null}
                      Crear venta
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
              <h2 className="text-lg font-semibold">Cosas que conviene no olvidar</h2>
              <ul className="mt-3 space-y-2 text-sm text-base-content/70">
                <li>Validar cobertura antes de instalar.</li>
                <li>Guardar evidencia del documento y autorizacion.</li>
                <li>Registrar coordenadas si el distrito tiene direcciones repetidas.</li>
                <li>Confirmar fecha tentativa y tecnico asignado en una siguiente version.</li>
              </ul>
            </div>
            <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold">Ventas recientes</h2>
              {ventasQuery.isLoading ? (
                <span className="loading loading-spinner text-primary"></span>
              ) : (
                <SalesTable ventas={ventasQuery.data ?? []} />
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

function SummaryCard({ title, children }) {
  return (
    <div className="rounded-box border border-base-300 bg-base-200 p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <div className="space-y-1 text-sm text-base-content/75">{children}</div>
    </div>
  )
}

export default App
