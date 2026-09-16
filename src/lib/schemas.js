import { z } from 'zod'

export const requiredText = (message = 'Este campo es obligatorio') =>
  z.string().trim().min(1, message)

export const digitCode = (length, message) =>
  requiredText()
    .regex(/^\d+$/, 'Solo se permiten números')
    .length(length, message || `Debe tener ${length} caracteres`)

export function withSchema(schema) {
  return { onChange: schema, onSubmit: schema }
}

export const loginSchema = z.object({
  username: requiredText(),
  password: requiredText(),
})

export const changePasswordSchema = z
  .object({
    current_password: requiredText(),
    new_password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm_password: requiredText(),
  })
  .refine((value) => value.new_password === value.confirm_password, {
    message: 'Las contraseñas nuevas no coinciden.',
    path: ['confirm_password'],
  })

export const roleNameSchema = z.object({
  name: requiredText(),
})

export const roleSchema = z.object({
  name: requiredText(),
  permissions: z.array(z.string()),
})

export function userFormSchema(isCreate) {
  return z.object({
    username: requiredText(),
    password: isCreate ? z.string().min(8, 'Mínimo 8 caracteres') : z.string(),
    first_name: z.string(),
    last_name: z.string(),
    groups: z.string(),
    is_active: z.boolean(),
  })
}

export const pasoFormSchema = z.object({
  nombre: requiredText(),
  descripcion: z.string(),
  flujoId: z.string(),
})

export const createFlujoSchema = z.object({
  nombre: requiredText(),
  tipo_cliente: z.enum(['PERSONA', 'EMPRESA']),
})

export const flujoNombreSchema = z.object({
  nombre: requiredText(),
})

export const productoFormSchema = z.object({
  nombre: requiredText(),
  velocidad: requiredText()
    .regex(/^\d+$/, 'Solo se permiten números')
    .refine((value) => Number(value) > 0, 'La velocidad debe ser mayor a 0'),
  precio: requiredText().regex(/^\d+(?:\.\d{1,2})?$/, 'Usa un precio válido, por ejemplo 99.90'),
  tipo_cliente: z.enum(['PERSONA', 'EMPRESA']),
})

export const promocionFormSchema = z.object({
  nombre: requiredText(),
  descripcion: z.string(),
})

export const direccionFormSchema = z.object({
  cliente: requiredText('Selecciona un cliente'),
  tipo: requiredText(),
  direccion: requiredText(),
  numero: requiredText(),
  distrito: requiredText(),
  urbanizacion: z.string(),
  manzana: z.string(),
  lote: z.string(),
  interior: z.string(),
  referencia: z.string(),
})

export const DOCUMENT_LENGTH = { DNI: 8, CE: 9 }

export function documentNumberMessage(tipo) {
  return tipo === 'CE'
    ? 'El carné de extranjería debe tener 9 dígitos'
    : 'El DNI debe tener 8 dígitos'
}

export function documentNumberSchema(tipo) {
  const length = DOCUMENT_LENGTH[tipo] ?? DOCUMENT_LENGTH.DNI
  return digitCode(length, documentNumberMessage(tipo))
}

export function validateDocumentNumber({ value, fieldApi }) {
  const result = documentNumberSchema(fieldApi.form.getFieldValue('tipo_documento')).safeParse(value)
  return result.success ? undefined : result.error.issues[0]?.message
}

function requireNuevaVentaCliente(value, ctx) {
  const documento = documentNumberSchema(value.tipo_documento).safeParse(value.numero_documento)
  if (!documento.success) {
    ctx.addIssue({
      code: 'custom',
      path: ['numero_documento'],
      message: documento.error.issues[0]?.message,
    })
  }

  if (value.ruc) {
    const ruc = digitCode(11, 'El RUC debe tener 11 dígitos').safeParse(value.ruc)
    if (!ruc.success) {
      ctx.addIssue({ code: 'custom', path: ['ruc'], message: ruc.error.issues[0]?.message })
    }
  }

  if (value.tipo_cliente === 'EMPRESA') {
    const ruc = digitCode(11, 'El RUC debe tener 11 dígitos').safeParse(value.ruc)
    if (!ruc.success) {
      ctx.addIssue({ code: 'custom', path: ['ruc'], message: ruc.error.issues[0]?.message })
    }
    const razon = requiredText().safeParse(value.razon_social)
    if (!razon.success) {
      ctx.addIssue({ code: 'custom', path: ['razon_social'], message: razon.error.issues[0]?.message })
    }
    return
  }

  for (const name of ['distrito_nacimiento', 'padre', 'madre']) {
    const parsed = requiredText().safeParse(value[name])
    if (!parsed.success) {
      ctx.addIssue({ code: 'custom', path: [name], message: parsed.error.issues[0]?.message })
    }
  }
}

const nuevaVentaBase = {
  tipo_cliente: z.enum(['PERSONA', 'EMPRESA']),
  tipo_documento: requiredText(),
  numero_documento: z.string(),
  nombres: requiredText(),
  apellidos: requiredText(),
  celular: digitCode(9, 'El celular debe tener 9 dígitos'),
  distrito_nacimiento: z.string(),
  padre: z.string(),
  madre: z.string(),
  ruc: z.string(),
  razon_social: z.string(),
  tipo_direccion: requiredText(),
  direccion: requiredText(),
  numero: requiredText(),
  distrito: requiredText(),
  urbanizacion: z.string(),
  manzana: z.string(),
  lote: z.string(),
  interior: z.string(),
  referencia: z.string(),
}

export const nuevaVentaSchema = z
  .object({
    ...nuevaVentaBase,
    producto: requiredText('Selecciona un producto'),
    flujo: requiredText('Selecciona un flujo'),
    promociones: z.array(z.string()),
  })
  .superRefine(requireNuevaVentaCliente)

export const nuevaVentaClienteSchema = z.object(nuevaVentaBase).superRefine(requireNuevaVentaCliente)
