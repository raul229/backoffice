const VIA_TIPOS = [
  ['AVENIDA', 'AVENIDA'],
  ['JIRON', 'JIRON'],
  ['PASAJE', 'PASAJE'],
  ['CALLE', 'CALLE'],
  ['AV.', 'AVENIDA'],
  ['AV', 'AVENIDA'],
  ['JR.', 'JIRON'],
  ['JR', 'JIRON'],
  ['PJE.', 'PASAJE'],
  ['PJE', 'PASAJE'],
  ['CAL.', 'CALLE'],
  ['CAL', 'CALLE'],
]

export function normalizeUpper(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('es-PE')
}

export function normalizeUpperInput(value) {
  const raw = String(value ?? '')
  const keepTrailingSpace = /\s$/.test(raw)
  const text = normalizeUpper(raw)
  if (!text) return ''
  return keepTrailingSpace ? `${text} ` : text
}

function clip(value, limit) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[ ,./]+|[ ,./]+$/g, '')
    .slice(0, limit)
}

function juntar(izquierda, derecha) {
  return `${izquierda} ${derecha}`.replace(/\s+/g, ' ').trim().replace(/^[ ,./]+|[ ,./]+$/g, '')
}

// Misma lectura que parse_domicilio en backend/api/sunat.py.
export function parseDireccion(raw) {
  const text = normalizeUpper(raw)
  if (!text) return {}
  const looksComplete =
    /\bNRO\.?\b/.test(text) ||
    /\b(?:MZA|MZ|LOTE|LT|KM)\.?\b/.test(text) ||
    /\bS\/N\b/.test(text) ||
    /\s-\s/.test(text) ||
    /^(CAL|AV|JR|PJE|CALLE|AVENIDA|JIRON|PASAJE)[.\s]/.test(text)
  if (!looksComplete) return { direccion: text }

  const parts = text.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean)
  let distrito = parts.length > 1 ? parts.at(-1) : ''
  let head = parts[0] ?? text
  if (parts.length >= 3) {
    const provincia = parts.at(-2).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const recortado = head.replace(new RegExp(`\\s+${provincia}$`), '').trim()
    if (recortado) head = recortado
  }

  let referencia = ''
  const parentesis = head.match(/\(([^)]*)\)/)
  if (parentesis) {
    referencia = parentesis[1].trim().replace(/^[ .]+|[ .]+$/g, '')
    head = juntar(head.slice(0, parentesis.index), head.slice(parentesis.index + parentesis[0].length))
  }

  let tipo = 'CALLE'
  let resto = head
  for (const [prefix, mapped] of VIA_TIPOS) {
    if (resto.startsWith(prefix)) {
      tipo = mapped
      resto = resto.slice(prefix.length).replace(/^[.\s]+/, '')
      break
    }
  }

  let urbanizacion = ''
  const urb = resto.match(/\bURB\.?\s+(.+)$/)
  if (urb) {
    urbanizacion = urb[1].trim().replace(/^[ .]+|[ .]+$/g, '')
    resto = resto.slice(0, urb.index).replace(/[ ,./]+$/g, '')
  }

  let numero = ''
  let direccion = resto
  const nro = resto.match(/\bNRO\.?\s*(S\/N|[A-Z0-9]+(?:-[A-Z0-9]+)?)/)
  if (nro) {
    numero = nro[1]
    direccion = resto.slice(0, nro.index).replace(/[ ,./]+$/g, '')
  } else {
    const lote = resto.match(/\b(?:MZA|MZ)\.?\s*([A-Z0-9]+)\s+(?:LOTE|LT)\.?\s*([A-Z0-9]+)/)
    const soloLote = resto.match(/\b(?:LOTE|LT)\.?\s*([A-Z0-9]+)/)
    const km = resto.match(/\bKM\.?\s*(\d+(?:\.\d+)?)/)
    const sinNumero = resto.match(/\bS\/N\b/)
    if (lote) {
      numero = `MZ ${lote[1]} LT ${lote[2]}`
      direccion = juntar(resto.slice(0, lote.index), resto.slice(lote.index + lote[0].length))
    } else if (soloLote) {
      numero = `LT ${soloLote[1]}`
      direccion = juntar(resto.slice(0, soloLote.index), resto.slice(soloLote.index + soloLote[0].length))
    } else if (km) {
      numero = `KM ${km[1]}`
      direccion = juntar(resto.slice(0, km.index), resto.slice(km.index + km[0].length))
    } else if (sinNumero) {
      numero = 'S/N'
      direccion = juntar(resto.slice(0, sinNumero.index), resto.slice(sinNumero.index + sinNumero[0].length))
    }
  }

  const parsed = {
    tipo_direccion: tipo,
    direccion: clip(direccion || text, 200),
    numero: clip(numero, 30),
    distrito: clip(distrito, 100),
  }
  const urbLimpia = clip(urbanizacion, 100)
  const refLimpia = clip(referencia, 200)
  if (urbLimpia) parsed.urbanizacion = urbLimpia
  if (refLimpia) parsed.referencia = refLimpia
  return parsed
}
