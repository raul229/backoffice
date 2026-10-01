/**
 * Escáner de documentos para firmas.
 * En móvil: solo cámara + recorte del marco (sin OpenCV; evita cuelgues por WASM).
 * En escritorio: OpenCV/jscanify opcional para detectar esquinas.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

let opencvReady = null

function isMobileDevice() {
  if (typeof window === 'undefined') return false
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches
  const narrow = window.matchMedia?.('(max-width: 900px)')?.matches
  const ua = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
  return Boolean(ua || (coarse && narrow))
}

function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

function loadOpenCv() {
  if (typeof window !== 'undefined' && window.cv?.Mat) {
    return Promise.resolve(window.cv)
  }
  if (opencvReady) return opencvReady
  opencvReady = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-jscanify-opencv]')
    if (existing) {
      const wait = () => {
        if (window.cv?.Mat) resolve(window.cv)
        else setTimeout(wait, 50)
      }
      wait()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://docs.opencv.org/4.7.0/opencv.js'
    script.async = true
    script.dataset.jscanifyOpencv = '1'
    script.onload = () => {
      const poll = () => {
        if (window.cv?.Mat) resolve(window.cv)
        else setTimeout(poll, 40)
      }
      if (window.cv?.onRuntimeInitialized) {
        window.cv.onRuntimeInitialized = () => resolve(window.cv)
      }
      poll()
    }
    script.onerror = () => reject(new Error('No se pudo cargar OpenCV para el escáner.'))
    document.head.appendChild(script)
  })
  return opencvReady
}

async function loadScanner() {
  await loadOpenCv()
  const mod = await import('jscanify/client')
  const JScanify = mod.default || mod
  return new JScanify()
}

function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen.'))),
      type,
      quality,
    )
  })
}

function enhanceContrast(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const { width, height } = canvas
  const image = ctx.getImageData(0, 0, width, height)
  const data = image.data
  let min = 255
  let max = 0
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    if (gray < min) min = gray
    if (gray > max) max = gray
  }
  const range = Math.max(max - min, 1)
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      const v = ((data[i + c] - min) / range) * 255
      data[i + c] = Math.max(0, Math.min(255, v))
    }
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

function cameraBlockedReason() {
  if (typeof window === 'undefined') return ''
  if (!window.isSecureContext) {
    return (
      'El navegador solo permite la cámara en HTTPS o localhost. ' +
      'Abre la app con https:// o usa “Tomar foto”.'
    )
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'Este navegador no permite la cámara en vivo. Usa “Tomar foto”.'
  }
  return ''
}

/**
 * @param {{
 *   label: string,
 *   onCapture: (blob: Blob, previewUrl: string) => void,
 *   onCancel?: () => void,
 * }} props
 */
export default function DocumentScanner({ label, onCapture, onCancel }) {
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const fileRef = useRef(null)
  const streamRef = useRef(null)
  const scannerRef = useRef(null)
  const rafRef = useRef(0)
  const mobile = isMobileDevice()
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(mobile ? 'Preparando…' : 'Abriendo cámara…')

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const finishWithBlob = useCallback(
    (blob) => {
      const previewUrl = URL.createObjectURL(blob)
      stopCamera()
      onCapture(blob, previewUrl)
    },
    [onCapture, stopCamera],
  )

  useEffect(() => {
    let cancelled = false

    async function openCamera() {
      const blocked = cameraBlockedReason()
      if (blocked) {
        setError(blocked)
        setStatus('')
        return
      }

      setError('')
      setStatus('Pidiendo permiso de cámara…')
      const stream = await withTimeout(
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: mobile
            ? { facingMode: { ideal: 'environment' } }
            : {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
        }),
        10000,
        'La cámara no respondió. Usa “Tomar foto” o revisa los permisos.',
      )
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = stream
      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      video.muted = true
      await video.play()
      if (cancelled) return
      setReady(true)
      setStatus('')
    }

    async function loadOptionalScanner() {
      if (mobile) return
      try {
        scannerRef.current = await withTimeout(
          loadScanner(),
          8000,
          'OpenCV tardó demasiado; se usará el recorte del marco.',
        )
        if (cancelled || !scannerRef.current || !videoRef.current || !overlayRef.current) return
        const draw = () => {
          if (!videoRef.current || !overlayRef.current || !scannerRef.current) return
          const v = videoRef.current
          const c = overlayRef.current
          if (v.videoWidth && v.videoHeight) {
            c.width = v.videoWidth
            c.height = v.videoHeight
            try {
              const result = scannerRef.current.highlightPaper(v)
              if (result) {
                const ctx = c.getContext('2d')
                ctx.clearRect(0, 0, c.width, c.height)
                ctx.drawImage(result, 0, 0, c.width, c.height)
              }
            } catch {
              /* highlight opcional */
            }
          }
          rafRef.current = requestAnimationFrame(draw)
        }
        rafRef.current = requestAnimationFrame(draw)
      } catch {
        scannerRef.current = null
      }
    }

    async function start() {
      try {
        await openCamera()
        if (!cancelled && streamRef.current) loadOptionalScanner()
      } catch (err) {
        if (cancelled) return
        setStatus('')
        setError(
          err?.name === 'NotAllowedError'
            ? 'Permite el acceso a la cámara, o usa “Tomar foto”.'
            : err?.name === 'NotFoundError'
              ? 'No se encontró cámara. Usa “Tomar foto”.'
              : err?.message || 'No se pudo abrir la cámara. Usa “Tomar foto”.',
        )
      }
    }

    start()
    return () => {
      cancelled = true
      stopCamera()
    }
  }, [mobile, stopCamera])

  const captureGuideCrop = useCallback(() => {
    const video = videoRef.current
    if (!video?.videoWidth) throw new Error('Cámara no lista.')
    const w = video.videoWidth
    const h = video.videoHeight
    const boxH = h * 0.78
    const boxW = Math.min(w * 0.86, boxH * (210 / 297))
    const x = (w - boxW) / 2
    const y = (h - boxH) / 2
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(boxW)
    canvas.height = Math.round(boxH)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, x, y, boxW, boxH, 0, 0, canvas.width, canvas.height)
    return enhanceContrast(canvas)
  }, [])

  const handleCapture = async () => {
    setBusy(true)
    setError('')
    try {
      const video = videoRef.current
      let canvas
      if (!mobile) {
        try {
          const scanner = scannerRef.current
          if (scanner && video && window.cv?.Mat) {
            canvas = scanner.extractPaper(video, 1240, 1754)
          }
        } catch {
          canvas = null
        }
      }
      if (!canvas) canvas = captureGuideCrop()
      else enhanceContrast(canvas)
      const blob = await canvasToBlob(canvas)
      finishWithBlob(blob)
    } catch (err) {
      setError(err?.message || 'No se pudo capturar el documento.')
    } finally {
      setBusy(false)
    }
  }

  const handleNativePhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      finishWithBlob(file)
    } catch (err) {
      setError(err?.message || 'No se pudo usar la foto.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="text-xs text-slate-500">
        {mobile
          ? 'Encuadrá la hoja firmada en el marco y capturá, o usá “Tomar foto” (abre la cámara del teléfono).'
          : 'Coloca la hoja firmada dentro del marco. OpenCV es opcional para detectar esquinas.'}
      </p>
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[78%] w-[72%] rounded-lg border-2 border-dashed border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        {!ready && !error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 px-4 text-center text-sm text-white">
            {status || 'Abriendo cámara…'}
          </div>
        ) : null}
      </div>
      {error ? (
        <div className="alert alert-warning text-sm">
          <span>{error}</span>
        </div>
      ) : null}
      <input
        ref={fileRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        type="file"
        onChange={handleNativePhoto}
      />
      <div className="flex flex-wrap gap-2">
        {onCancel ? (
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-outline"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          Tomar foto
        </button>
        <button
          type="button"
          className="btn border-none bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={!ready || busy}
          onClick={handleCapture}
        >
          {busy ? 'Procesando…' : 'Capturar hoja'}
        </button>
      </div>
    </div>
  )
}
