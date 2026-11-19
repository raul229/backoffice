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
  promociones: z.array(z.string()),
})

export const promocionFormSchema = z
  .object({
    nombre: requiredText(),
    descripcion: z.string(),
    descuento_porcentaje: z.string(),
    bono_velocidad: z.enum(['NINGUNO', 'DUPLICA', 'FIJO']),
    bono_mbps: z.string(),
    plazo_meses: z.string(),
  })
  .superRefine((value, ctx) => {
    const pct = value.descuento_porcentaje.trim()
    if (pct && !/^\d+(?:\.\d{1,2})?$/.test(pct)) {
      ctx.addIssue({
        code: 'custom',
        path: ['descuento_porcentaje'],
        message: 'Usa un porcentaje, por ejemplo 20 o 12.5.',
      })
    } else if (pct && (Number(pct) < 0 || Number(pct) > 100)) {
      ctx.addIssue({
        code: 'custom',
        path: ['descuento_porcentaje'],
        message: 'El descuento debe estar entre 0 y 100.',
      })
    }
    const meses = value.plazo_meses.trim()
    if (meses && (!/^\d+$/.test(meses) || Number(meses) < 1)) {
      ctx.addIssue({
        code: 'custom',
        path: ['plazo_meses'],
        message: 'Usa un número de meses, o déjalo vacío si es indefinido.',
      })
    }
    if (value.bono_velocidad !== 'FIJO') return
    if (!/^\d+$/.test(value.bono_mbps) || Number(value.bono_mbps) <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['bono_mbps'],
        message: 'Indica cuántos Mbps adicionales da el bono.',
      })
    }
  })

export const tipoGaleriaFormSchema = z.object({
  nombre: requiredText(),
})

export const documentoFormSchema = z.object({
  etiqueta: requiredText(),
  descripcion: z.string(),
  grupo: requiredText(),
  acepta: z.enum(['.pdf', '.xlsx', '.xlsm', '.eml']),
})

export function requireGaleriaPair(value, ctx) {
  const tipo = String(value.tipo_galeria ?? '').trim()
  const nombre = String(value.galeria ?? '').trim()
  if (nombre && !tipo) {
    ctx.addIssue({ code: 'custom', path: ['tipo_galeria'], message: 'Selecciona el tipo' })
  }
  if (tipo && !nombre) {
    ctx.addIssue({ code: 'custom', path: ['galeria'], message: 'Indica el nombre' })
  }
}

export const direccionFormSchema = z
  .object({
    cliente: requiredText('Selecciona un cliente'),
    tipo: requiredText(),
    direccion: requiredText().max(200, 'La dirección admite hasta 200 caracteres'),
    numero: requiredText().max(30, 'El número admite hasta 30 caracteres'),
    distrito: requiredText().max(100, 'El distrito admite hasta 100 caracteres'),
    urbanizacion: z.string().max(100, 'La urbanización admite hasta 100 caracteres'),
    interior: z.string().max(20, 'El interior admite hasta 20 caracteres'),
    tienda: z.string().max(30, 'La tienda admite hasta 30 caracteres'),
    piso: z.string().max(20, 'El piso admite hasta 20 caracteres'),
    tipo_galeria: z.string(),
    galeria: z.string().max(100, 'El nombre admite hasta 100 caracteres'),
    referencia: z.string().max(200, 'La referencia admite hasta 200 caracteres'),
  })
  .superRefine(requireGaleriaPair)

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

const nuevaVentaClienteBase = {
  tipo_cliente: z.enum(['PERSONA', 'EMPRESA']),
  tipo_documento: requiredText(),
  numero_documento: z.string(),
  nombres: requiredText().max(100, 'Los nombres admiten hasta 100 caracteres'),
  apellidos: requiredText().max(100, 'Los apellidos admiten hasta 100 caracteres'),
  celular: digitCode(9, 'El celular debe tener 9 dígitos'),
  correo: requiredText('El correo de facturación es obligatorio').email('Usa un correo válido'),
  distrito_nacimiento: z.string(),
  padre: z.string(),
  madre: z.string(),
  ruc: z.string(),
  razon_social: z.string().max(100, 'La razón social admite hasta 100 caracteres'),
  domicilio_fiscal: z.string().max(400, 'El domicilio fiscal admite hasta 400 caracteres'),
  empresa_id: z.string(),
}

const nuevaVentaDireccionBase = {
  tipo_direccion: requiredText(),
  direccion: requiredText().max(200, 'La dirección admite hasta 200 caracteres'),
  numero: requiredText().max(30, 'El número admite hasta 30 caracteres'),
  distrito: requiredText().max(100, 'El distrito admite hasta 100 caracteres'),
  urbanizacion: z.string().max(100, 'La urbanización admite hasta 100 caracteres'),
  interior: z.string().max(20, 'El interior admite hasta 20 caracteres'),
  tienda: z.string().max(30, 'La tienda admite hasta 30 caracteres'),
  piso: z.string().max(20, 'El piso admite hasta 20 caracteres'),
  tipo_galeria: z.string(),
  galeria: z.string().max(100, 'El nombre admite hasta 100 caracteres'),
  referencia: z.string().max(200, 'La referencia admite hasta 200 caracteres'),
}

const nuevaVentaBase = {
  ...nuevaVentaClienteBase,
  ...nuevaVentaDireccionBase,
}

export const nuevaVentaSchema = z
  .object({
    ...nuevaVentaBase,
    producto: requiredText('Selecciona un producto'),
    flujo: requiredText('Selecciona un flujo'),
    promociones: z.array(z.string()),
  })
  .superRefine(requireNuevaVentaCliente)
  .superRefine(requireGaleriaPair)

export const nuevaVentaClienteSchema = z
  .object(nuevaVentaClienteBase)
  .superRefine(requireNuevaVentaCliente)

export const nuevaVentaDireccionSchema = z.object(nuevaVentaDireccionBase).superRefine(requireGaleriaPair)

export const personaEditSchema = z
  .object({
    tipo_documento: requiredText(),
    numero_documento: z.string(),
    nombres: requiredText(),
    apellidos: requiredText(),
    celular: digitCode(9, 'El celular debe tener 9 dígitos'),
    correo: requiredText('El correo de facturación es obligatorio').email('Usa un correo válido'),
    distrito_nacimiento: requiredText(),
    padre: requiredText(),
    madre: requiredText(),
  })
  .superRefine((value, ctx) => {
    const documento = documentNumberSchema(value.tipo_documento).safeParse(value.numero_documento)
    if (!documento.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['numero_documento'],
        message: documento.error.issues[0]?.message,
      })
    }
  })

export const empresaEditSchema = z.object({
  ruc: digitCode(11, 'El RUC debe tener 11 dígitos'),
  razon_social: requiredText(),
  correo: requiredText('El correo de facturación es obligatorio').email('Usa un correo válido'),
  domicilio_fiscal: z.string(),
})
