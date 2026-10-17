export const GRUPOS_DOCUMENTO = [
  'Contratos',
  'Anexos',
  'Hojas de calificación',
  'Pack con fijo',
  'Correo',
  'Otros',
]

export const FORMATOS_DOCUMENTO = [
  { value: '.pdf', label: 'PDF (contrato o anexo)' },
  { value: '.xlsx', label: 'Excel .xlsx' },
  { value: '.xlsm', label: 'Excel macro .xlsm' },
  { value: '.eml', label: 'Correo .eml' },
]

export const CAMPOS_CONTRATO_GRUPOS = [
  {
    grupo: 'Empresa',
    campos: [
      { value: 'RAZON_SOCIAL', label: 'Razón social', ejemplo: 'EMPRESA DEMO S.A.C.' },
      { value: 'RUC', label: 'RUC', ejemplo: '20123456789' },
      { value: 'NOMBRE_PLAN', label: 'Nombre Producto', ejemplo: 'INTERNET EMPRESAS 1000M' },
      { value: 'VELOCIDAD', label: 'Velocidad', ejemplo: '200' },
      { value: 'VELOCIDAD_CON_BONO', label: 'Velocidad con bono', ejemplo: '400' },
      { value: 'BONO_MBPS', label: 'Bono (Mbps)', ejemplo: '200' },
      { value: 'TIPO_BONO', label: 'Tipo de bono', ejemplo: 'Duplica la velocidad' },
      { value: 'PROMOCION', label: 'Promoción', ejemplo: 'DESCUENTO 30% EN EL CARGO FIJO INDEFINIDO' },
      { value: 'RENTA_FIJA', label: 'Renta fija (con IGV)', ejemplo: '125.00' },
      { value: 'RENTA_SIN_IGV', label: 'Renta fija (sin IGV)', ejemplo: '105.93' },
      { value: 'DESCUENTO_PORCENTAJE', label: 'Descuento %', ejemplo: '30' },
      { value: 'DESCUENTO_CON_IGV', label: 'Descuento con IGV', ejemplo: '37.50' },
      { value: 'DESCUENTO', label: 'Descuento sin IGV', ejemplo: '31.78' },
      { value: 'RENTA_CON_DESCUENTO', label: 'A pagar (con IGV)', ejemplo: '87.50' },
      { value: 'RENTA_CON_DESCUENTO_SIN_IGV', label: 'A pagar (sin IGV)', ejemplo: '74.15' },
      { value: 'PRECIO_PRODUCTO', label: 'Precio del producto', ejemplo: '125.00' },
      { value: 'NUMERO_FIJO', label: 'Teléfono fijo', ejemplo: '014567890' },
    ],
  },
  {
    grupo: 'Representante',
    campos: [
      { value: 'RRLL', label: 'Representante legal', ejemplo: 'JULIO MANUEL PICHIULE CASTAÑEDA' },
      { value: 'TIPO_DOCUMENTO_RRLL', label: 'Tipo de documento', ejemplo: 'DNI' },
      { value: 'DNI', label: 'N° documento', ejemplo: '12345678' },
      { value: 'CORREO_RRLL', label: 'Correo', ejemplo: 'ana@empresa.com' },
      { value: 'CELULAR_RRLL', label: 'Celular', ejemplo: '999888777' },
    ],
  },
  {
    grupo: 'Dirección',
    campos: [
      { value: 'DOMICILIO_INSTALACION', label: 'Domicilio de instalación', ejemplo: 'Jiron LUIS GIRIBALDI NRO. 738 Piso 2 INT 215 Galeria GOLDEN PLAZA GIRIBALDI URB. GAMARRA (La Victoria - Lima - Lima) (REF: -12.067108,-77.016333)' },
      { value: 'DOMICILIO_FISCAL', label: 'Domicilio fiscal', ejemplo: 'CAL. LUIGGI BARSATO NRO. 167 SAN BORJA' },
      { value: 'DISTRITO', label: 'Distrito', ejemplo: 'MIRAFLORES' },
      { value: 'PROVINCIA', label: 'Provincia', ejemplo: 'LIMA' },
      { value: 'DEPARTAMENTO', label: 'Departamento', ejemplo: 'LIMA' },
    ],
  },
  {
    grupo: 'Fecha',
    campos: [
      { value: 'FECHA', label: 'Fecha', ejemplo: '16/10/2026' },
      { value: 'DIA', label: 'Día', ejemplo: '16' },
      { value: 'MES', label: 'Mes (número)', ejemplo: '10' },
      { value: 'NOMBRE_MES', label: 'Mes (nombre)', ejemplo: 'Octubre' },
      { value: 'ANIO', label: 'Año', ejemplo: '2026' },
      { value: 'HORA', label: 'Hora', ejemplo: '10 : 00 : 00' },
    ],
  },
  {
    grupo: 'Códigos de la venta',
    campos: [
      { value: 'SIRO', label: 'SIRO', ejemplo: '12345' },
      { value: 'NO_OPORTUNIDAD', label: 'N° oportunidad', ejemplo: 'OP-100' },
      { value: 'NRO_PSI', label: 'PSI', ejemplo: 'PSI-9' },
      { value: 'OIT', label: 'OIT', ejemplo: 'OIT-88' },
      { value: 'COTIZACION', label: 'Cotización', ejemplo: 'COT-12' },
      { value: 'CONTRATO', label: 'Contrato', ejemplo: 'CT-01' },
      { value: 'SAF', label: 'SAF', ejemplo: 'SAF-3' },
    ],
  },
]

export const CAMPOS_CONTRATO = CAMPOS_CONTRATO_GRUPOS.flatMap((grupo) =>
  grupo.campos.map((campo) => campo.value),
)

export const TRANSFORMACIONES = [
  { value: 'doc_y_dni', label: 'Tipo de documento + DNI', ejemplo: 'DNI 12345678' },
  { value: 'nombre_plan', label: 'Plan + velocidad', ejemplo: 'INT EMPRESA 200' },
  { value: 'velocidades', label: 'Velocidades (bono)', ejemplo: '200                400               200             400' },
  { value: 'dia_mes_anio', label: 'Día / mes / año separados', ejemplo: '16                                    Octubre                            2026' },
  { value: 'descuento', label: 'Descuento S/. sin IGV', ejemplo: 'S/. 31.78' },
  { value: 'descuento_con_igv', label: 'Descuento S/. con IGV', ejemplo: 'S/. 37.50' },
  { value: 'precio_int_solo', label: 'Renta menos fijo', ejemplo: 'S/. 80.10' },
]

const CAMPOS_POR_CLAVE = Object.fromEntries(
  CAMPOS_CONTRATO_GRUPOS.flatMap((grupo) => grupo.campos.map((campo) => [campo.value, campo])),
)

export function esPdf(item) {
  return (item?.acepta ?? []).includes('.pdf')
}

export function esExcel(item) {
  const acepta = item?.acepta ?? []
  return acepta.includes('.xlsx') || acepta.includes('.xlsm')
}

export const TAMANO_LETRA_PDF = 10

export function campoVacio() {
  return {
    pagina: 0,
    nombre: '',
    x: 0,
    y: 0,
    tamano: TAMANO_LETRA_PDF,
    max_caracteres: '',
    field: '',
    value: '',
    transform: '',
    hoja: '',
    celda: '',
  }
}

export function camposDesdeDocumento(item) {
  if (Array.isArray(item?.campos) && item.campos.length) {
    return item.campos.map((campo) => ({ ...campoVacio(), ...campo }))
  }
  return []
}

export function baseCampo(nombre) {
  const text = String(nombre || '')
  return text.replace(/_\d+$/, '') || text
}

export function defCampo(nombre) {
  return CAMPOS_POR_CLAVE[baseCampo(nombre)] || CAMPOS_POR_CLAVE[nombre] || null
}

export function claveFuente(campo) {
  if (campo?.value) return `value:${campo.nombre || campo.value}`
  if (campo?.transform) return `transform:${campo.transform}`
  return campo?.field || baseCampo(campo?.nombre)
}

export function etiquetaCampo(campo, campos) {
  if (campo?.transform) {
    const label = TRANSFORMACIONES.find((item) => item.value === campo.transform)?.label || campo.transform
    return etiquetaContinuacion(label, campo, campos)
  }
  if (campo?.value) return String(campo.value)
  const clave = campo?.field || campo?.nombre || campo
  const label = defCampo(clave)?.label || clave
  return etiquetaContinuacion(label, campo, campos)
}

function etiquetaContinuacion(label, campo, campos) {
  if (!Array.isArray(campos) || campos.length < 2) return label
  const fuente = claveFuente(campo)
  const pagina = Number(campo?.pagina)
  const hermanos = campos.filter(
    (item) => Number(item?.pagina) === pagina && claveFuente(item) === fuente,
  )
  if (hermanos.length < 2) return label
  const n = hermanos.indexOf(campo) + 1
  return n > 0 ? `${label} · ${n}` : label
}

export function textoVistaCampo(campo) {
  if (campo?.value) return String(campo.value)
  if (campo?.transform) {
    return TRANSFORMACIONES.find((item) => item.value === campo.transform)?.ejemplo || campo.transform
  }
  const clave = campo?.field || campo?.nombre
  return defCampo(clave)?.ejemplo || clave || 'texto'
}

/** Igual que `dividir_texto` del generador: parte por palabras al llegar al tope. */
export function dividirTexto(texto, maxCaracteres) {
  const limite = Number(maxCaracteres)
  const palabras = String(texto ?? '').split(/\s+/).filter(Boolean)
  if (!palabras.length) return { texto: '', lineasExtra: 0 }
  if (!limite || limite <= 0) return { texto: palabras.join(' '), lineasExtra: 0 }

  let resultado = palabras[0]
  let longitud = palabras[0].length
  let lineasExtra = 0
  for (const palabra of palabras.slice(1)) {
    if (longitud + 1 + palabra.length <= limite) {
      resultado += ` ${palabra}`
      longitud += 1 + palabra.length
    } else {
      resultado += `\n${palabra}`
      longitud = palabra.length
      lineasExtra += 1
    }
  }
  return { texto: resultado, lineasExtra }
}

/** Igual que `partir_en_lineas` del generador. */
export function repartirORepetir(texto, limites) {
  const lineas = partirEnLineas(texto, limites)
  if (limites.length <= 1) return lineas
  if (lineas.slice(1).some(Boolean)) return lineas
  return limites.map(() => String(texto ?? ''))
}

export function partirEnLineas(texto, limites) {
  const palabras = String(texto ?? '').split(/\s+/).filter(Boolean)
  const lineas = []
  let indice = 0
  limites.forEach((limite, posicion) => {
    if (indice >= palabras.length) {
      lineas.push('')
      return
    }
    const tope = Number(limite) || 0
    if (tope <= 0) {
      lineas.push(palabras.slice(indice).join(' '))
      indice = palabras.length
      return
    }
    let actual = palabras[indice]
    indice += 1
    let longitud = actual.length
    const ultimo = posicion === limites.length - 1
    while (indice < palabras.length) {
      const palabra = palabras[indice]
      if (longitud + 1 + palabra.length <= tope) {
        actual += ` ${palabra}`
        longitud += 1 + palabra.length
        indice += 1
      } else if (ultimo) {
        actual += `\n${palabra}`
        longitud = palabra.length
        indice += 1
      } else {
        break
      }
    }
    lineas.push(actual)
  })
  return lineas
}

/** Solo domicilio se parte entre pines; nombre, RUC, etc. se copian enteros. */
const CAMPOS_REPARTIR = new Set(['DOMICILIO_INSTALACION', 'DOMICILIO_FISCAL'])

export function campoSeReparte(campo) {
  const clave = typeof campo === 'string' ? campo : campo?.field || campo?.nombre
  return CAMPOS_REPARTIR.has(baseCampo(clave))
}

export function textoVistaMultilinea(campo, campos = [], index = 0) {
  const crudo = textoVistaCampo(campo)
  if (!campoSeReparte(campo)) return dividirTexto(crudo, campo?.max_caracteres).texto
  const lista = campos.length ? campos : [campo]
  const indice = campos.length ? index : 0
  const fuente = claveFuente(campo)
  const pagina = Number(campo?.pagina)
  const hermanos = lista
    .map((item, i) => i)
    .filter(
      (i) =>
        Number(lista[i]?.pagina) === pagina &&
        claveFuente(lista[i]) === fuente &&
        Number(lista[i]?.max_caracteres) > 0,
    )
  if (hermanos.length <= 1) return dividirTexto(crudo, campo?.max_caracteres).texto
  const limites = hermanos.map((i) => Number(lista[i].max_caracteres))
  const posicion = Math.max(hermanos.indexOf(indice), 0)
  return repartirORepetir(crudo, limites)[posicion] || ''
}

const ANCHO_POR_DEFECTO = {
  RAZON_SOCIAL: 40,
  RRLL: 40,
  DOMICILIO_INSTALACION: 60,
  DOMICILIO_FISCAL: 60,
  CORREO_RRLL: 27,
  CELULAR_RRLL: 10,
}

export function anchoPorDefecto(nombre) {
  return ANCHO_POR_DEFECTO[baseCampo(nombre)] || ''
}

/** Ancho medio de una letra en Helvetica (mayúsculas de contratos ~ 0.6 × tamaño). */
export const ANCHO_LETRA_HELVETICA = 0.6

/** Métricas de Helvetica WinAnsi, iguales a `page.insert_text(..., fontname="helv")`. */
export const HELVETICA_ASCENDER = 1.075
export const HELVETICA_DESCENDER = 0.299
export const HELVETICA_INTERLINEADO = HELVETICA_ASCENDER + HELVETICA_DESCENDER

const HELVETICA_ASCII = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667,
  611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
  222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
]

const HELVETICA_LATIN = [
  278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333,
  333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667,
  1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778,
  722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556,
  278, 278, 278, 278, 556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556,
  500,
]

function avanceHelvetica(codigo) {
  if (codigo >= 32 && codigo <= 126) return HELVETICA_ASCII[codigo - 32] / 1000
  if (codigo >= 160 && codigo <= 255) return HELVETICA_LATIN[codigo - 160] / 1000
  return ANCHO_LETRA_HELVETICA
}

export function anchoTextoHelvetica(texto, tamano = TAMANO_LETRA_PDF) {
  const size = Math.max(Number(tamano) || TAMANO_LETRA_PDF, 1)
  let ancho = 0
  for (const ch of String(texto ?? '')) {
    if (ch === '\n') continue
    ancho += avanceHelvetica(ch.codePointAt(0)) * size
  }
  return ancho
}

export function anchoLineaHelvetica(texto, tamano = TAMANO_LETRA_PDF) {
  let maximo = 0
  for (const linea of String(texto ?? '').split('\n')) {
    maximo = Math.max(maximo, anchoTextoHelvetica(linea, tamano))
  }
  return maximo
}

function tamanoCampo(campo) {
  return Math.max(Number(campo?.tamano) || TAMANO_LETRA_PDF, 1)
}

export function anchoTopeCampo(campo) {
  const tamano = tamanoCampo(campo)
  const max = Number(campo?.max_caracteres)
  if (!(max > 0)) return 0
  return max * tamano * ANCHO_LETRA_HELVETICA
}

/** Ancho pintado en puntos PDF (Helvetica real). */
export function anchoCampoPdf(campo, texto) {
  const tamano = tamanoCampo(campo)
  const pintado = anchoLineaHelvetica(texto ?? textoVistaCampo(campo), tamano)
  return Math.max(pintado, tamano)
}

/** Recuadro del glifo, mismo origen que `insert_text` (baseline en y, y crece hacia abajo). */
export function cajaCampoPdf(campo, texto, { incluirTope = false } = {}) {
  const tamano = tamanoCampo(campo)
  const contenido = texto ?? textoVistaCampo(campo)
  const lineas = Math.max(String(contenido ?? '').split('\n').length, 1)
  return {
    left: Number(campo?.x) || 0,
    top: (Number(campo?.y) || 0) - HELVETICA_ASCENDER * tamano,
    width: Math.max(anchoCampoPdf(campo, contenido), incluirTope ? anchoTopeCampo(campo) : 0),
    height: lineas * HELVETICA_INTERLINEADO * tamano,
    tamano,
  }
}

export function caracteresDesdeAncho(anchoPdf, tamano) {
  const letra = Math.max(Number(tamano) || TAMANO_LETRA_PDF, 1) * ANCHO_LETRA_HELVETICA
  return Math.max(8, Math.round(Number(anchoPdf) / letra))
}

export function nombreCampoUnico(campos, base, pagina) {
  const usados = new Set(
    campos
      .filter((campo) => Number(campo.pagina) === Number(pagina))
      .map((campo) => campo.nombre),
  )
  if (!usados.has(base)) return base
  let n = 2
  while (usados.has(`${base}_${n}`)) n += 1
  return `${base}_${n}`
}
