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

export function parseDireccion(raw) {
  const text = normalizeUpper(raw)
  if (!text) return {}
  const looksComplete = /\bNRO\.?\b/.test(text) || /\s-\s/.test(text) || /^(CAL|AV|JR|PJE|CALLE|AVENIDA|JIRON|PASAJE)[.\s]/.test(text)
  if (!looksComplete) return { direccion: text }

  const parts = text.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean)
  const distrito = parts.length > 1 ? parts.at(-1) : ''
  let resto = parts[0] ?? text
  let tipo = 'CALLE'
  for (const [prefix, mapped] of VIA_TIPOS) {
    if (resto.startsWith(prefix)) {
      tipo = mapped
      resto = resto.slice(prefix.length).replace(/^[.\s]+/, '')
      break
    }
  }
  const match = resto.match(/\bNRO\.?\s+([A-Z0-9]+)/)
  let numero = ''
  let direccion = resto
  if (match) {
    numero = match[1]
    direccion = resto.slice(0, match.index).replace(/[ ,./]+$/, '')
  }
  return {
    tipo_direccion: tipo,
    direccion: direccion || text,
    numero,
    distrito,
  }
}
