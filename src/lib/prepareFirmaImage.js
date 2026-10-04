/**
 * Prepara fotos de firma sin congelar la UI.
 * Solo redimensiona/comprime en el hilo principal (rápido).
 * OpenCV/WASM se evita aquí a propósito: congela móviles al inicializar.
 */

const MAX_EDGE = 1280
const JPEG_QUALITY = 0.82
const MAX_SOURCE_BYTES = 12 * 1024 * 1024

function canvasToJpegBlob(canvas, quality = JPEG_QUALITY) {
  return new Promise((resolve, reject) => {
    // toBlob es async nativo y no bloquea tanto como loops de píxeles.
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen.'))),
      'image/jpeg',
      quality,
    )
  })
}

function yieldToUi(ms = 16) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, ms))
  })
}

async function decodeResized(file, maxEdge) {
  // Preferir resize en decode (mucho más liviano que canvas full-res).
  // Solo un lado: si se pasan ambos, el navegador estira y deforma la foto.
  try {
    return await createImageBitmap(file, {
      resizeHeight: maxEdge,
      resizeQuality: 'medium',
    })
  } catch {
    // Algunos navegadores no aceptan resize* o fallan con HEIC.
  }
  return createImageBitmap(file)
}

/**
 * @param {Blob|File} file
 * @param {{
 *   maxEdge?: number,
 *   quality?: number,
 *   scan?: boolean,
 *   onStatus?: (msg: string) => void,
 * }} [opts]
 * @returns {Promise<{ blob: Blob, width: number, height: number, previewUrl: string, scanned: boolean }>}
 */
export async function prepareFirmaImage(file, opts = {}) {
  if (!file) throw new Error('No hay imagen.')
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('La foto supera 12 MB. Sacá una de menor resolución.')
  }

  const maxEdge = opts.maxEdge ?? MAX_EDGE
  const quality = opts.quality ?? JPEG_QUALITY
  const onStatus = opts.onStatus || (() => {})

  // `scan` queda ignorado a propósito: OpenCV en el hilo principal congela la página.
  onStatus('Preparando foto…')
  await yieldToUi(20)

  let bitmap
  try {
    bitmap = await decodeResized(file, maxEdge)
  } catch {
    if (file.size <= 1.5 * 1024 * 1024) {
      const previewUrl = URL.createObjectURL(file)
      return { blob: file, width: 0, height: 0, previewUrl, scanned: false }
    }
    throw new Error('No se pudo leer la foto. Probá JPG/PNG o bajar la resolución de la cámara.')
  }

  try {
    await yieldToUi(10)
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height, 1))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { alpha: false })
    // Canvas opaco (JPEG); el backend quita el papel con Pillow.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)

    await yieldToUi(10)
    onStatus('Comprimiendo…')
    const blob = await canvasToJpegBlob(canvas, quality)
    const previewUrl = URL.createObjectURL(blob)
    return {
      blob,
      width,
      height,
      previewUrl,
      scanned: false,
    }
  } finally {
    bitmap.close()
  }
}

/** Solo para tests unitarios del cálculo de escala. */
export function scaleToMaxEdge(width, height, maxEdge = MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  }
}
