import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CatalogEmpty from '../components/CatalogEmpty.jsx'
import Field from '../components/Field.jsx'
import { SelectField, TextField } from '../components/FormFields.jsx'
import {
  createDireccion,
  createEmpresa,
  createPersona,
  createVenta,
  getChoices,
  getFlujos,
  getProductos,
  getPromociones,
} from '../service/api.js'
import { DOCUMENT_LENGTH, digitCode, nuevaVentaClienteSchema, nuevaVentaSchema, requiredText, validateDocumentNumber } from '../lib/schemas.js'
import { flujosPorTipo } from '../lib/venta.js'

const defaultValues = {
  tipo_cliente: 'PERSONA',
  tipo_documento: 'DNI',
  numero_documento: '',
  nombres: '',
  apellidos: '',
  celular: '',
  distrito_nacimiento: '',
  padre: '',
  madre: '',
  ruc: '',
  razon_social: '',
  tipo_direccion: 'CALLE',
  direccion: '',
  numero: '',
  distrito: '',
  producto: '',
  flujo: '',
  promociones: [],
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
  }
}

function direccionPayload(value, clienteId) {
  return {
    cliente: clienteId,
    tipo: value.tipo_direccion,
    direccion: value.direccion,
    numero: value.numero,
    distrito: value.distrito,
  }
}

function step0Fields(tipoCliente) {
  const fields = ['numero_documento', 'nombres', 'apellidos', 'celular', 'direccion', 'numero', 'distrito']
  if (tipoCliente === 'EMPRESA') {
    fields.unshift('ruc', 'razon_social')
  } else {
    fields.splice(4, 0, 'distrito_nacimiento', 'padre', 'madre')
  }
  return fields
}

export default function NuevaVentaPage({ onCancel, onCreated }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [formError, setFormError] = useState('')

  const choicesQuery = useQuery({ queryKey: ['choices'], queryFn: getChoices })
  const productosQuery = useQuery({ queryKey: ['productos'], queryFn: getProductos })
  const flujosQuery = useQuery({ queryKey: ['flujos'], queryFn: getFlujos })
  const promocionesQuery = useQuery({ queryKey: ['promociones'], queryFn: getPromociones })

  const mutation = useMutation({
    mutationFn: async (value) => {
      let clienteId
      if (value.tipo_cliente === 'EMPRESA') {
        const representante = await createPersona(personaPayload(value))
        const empresa = await createEmpresa({
          ruc: value.ruc,
          razon_social: value.razon_social,
          representante_legal: representante.id,
        })
        clienteId = empresa.cliente
      } else {
        const persona = await createPersona(personaPayload(value))
        clienteId = persona.cliente
      }
      await createDireccion(direccionPayload(value, clienteId))
      return createVenta({
        cliente: clienteId,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nueva venta</h1>
          <p className="text-sm text-slate-500">
            El flujo de pasos cambia según si el cliente es persona natural (RUC 10) o empresa (RUC 20).
          </p>
        </div>
        <button type="button" className="btn btn-ghost rounded-full" onClick={onCancel}>
          Cancelar
        </button>
      </div>

      <CatalogEmpty flujos={flujosQuery.data ?? []} productos={productos} />

      <section className="bo-card p-6">
        <ul className="steps mb-6 w-full">
          <li className={`step ${step >= 0 ? 'step-primary' : ''}`}>Cliente</li>
          <li className={`step ${step >= 1 ? 'step-primary' : ''}`}>Producto y flujo</li>
        </ul>

        {formError ? (
          <div className="alert alert-error mb-4">
            <span>{formError}</span>
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
                          onClick={() => {
                            form.setFieldValue('tipo_cliente', 'PERSONA')
                            form.setFieldValue('flujo', '')
                          }}
                        >
                          Persona Natural
                        </button>
                        <button
                          type="button"
                          className={`flex-1 rounded-full py-2 text-sm ${
                            values.tipo_cliente === 'EMPRESA' ? 'bg-white font-medium shadow' : 'text-slate-500'
                          }`}
                          onClick={() => {
                            form.setFieldValue('tipo_cliente', 'EMPRESA')
                            form.setFieldValue('flujo', '')
                            form.setFieldValue('distrito_nacimiento', '')
                            form.setFieldValue('padre', '')
                            form.setFieldValue('madre', '')
                          }}
                        >
                          Persona Jurídica
                        </button>
                      </div>

                      {values.tipo_cliente === 'EMPRESA' ? (
                        <>
                          <Field form={form} name="ruc" validators={digitCode(11, 'El RUC debe tener 11 dígitos')}>
                            {(field) => (
                              <TextField field={field} inputMode="numeric" label="RUC" maxLength={11} />
                            )}
                          </Field>
                          <Field form={form} name="razon_social" validators={requiredText()}>
                            {(field) => <TextField field={field} label="Razón social" />}
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
                            label="Producto"
                            options={productos.map((producto) => ({
                              value: String(producto.id),
                              label: `${producto.nombre} · ${producto.velocidad} Mbps · S/ ${producto.precio}`,
                            }))}
                            placeholder="Selecciona un producto"
                          />
                        )}
                      </Field>
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
                {(field) => <TextField field={field} label="Nombres" />}
              </Field>
              <Field form={form} name="apellidos" validators={requiredText()}>
                {(field) => <TextField field={field} label="Apellidos" />}
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
              {tipoCliente === 'PERSONA' ? (
                <>
                  <Field form={form} name="distrito_nacimiento" validators={requiredText()}>
                    {(field) => <TextField field={field} label="Distrito de nacimiento" />}
                  </Field>
                  <Field form={form} name="padre" validators={requiredText()}>
                    {(field) => <TextField field={field} label="Padre" />}
                  </Field>
                  <Field form={form} name="madre" validators={requiredText()}>
                    {(field) => <TextField field={field} label="Madre" />}
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
                {(field) => <TextField field={field} label="Dirección" />}
              </Field>
              <Field form={form} name="numero" validators={requiredText()}>
                {(field) => <TextField field={field} label="Número" />}
              </Field>
              <Field form={form} name="distrito" validators={requiredText()}>
                {(field) => <TextField field={field} label="Distrito" />}
              </Field>
            </div>
            )}
          </form.Subscribe>

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
                onClick={async () => {
                  const values = form.state.values
                  const parsed = nuevaVentaClienteSchema.safeParse(values)
                  const tipo = values.tipo_cliente
                  const results = await Promise.all(
                    step0Fields(tipo).map((name) => form.validateField(name, 'submit')),
                  )
                  if (!parsed.success || results.some((errors) => errors?.length)) return
                  const flujos = flujosPorTipo(flujosQuery.data, tipo)
                  if (!form.getFieldValue('flujo') && flujos.length === 1) {
                    form.setFieldValue('flujo', String(flujos[0].id))
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
    </div>
  )
}
