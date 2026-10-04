import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { prepareFirmaImage } from '../lib/prepareFirmaImage.js'

/**
 * Captura de firmas manuscritas (una foto por hoja 3 y 5).
 * Sin pad ni escáner de página completa: solo la zona de firma.
 */
export default function FirmasContratoScan({
  firmaPagina3,
  firmaPagina5,
  preview3,
  preview5,
  onChange,
  disabled = false,
}) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const fileP3Ref = useRef(null)
  const fileP5Ref = useRef(null)
  const pendingTarget = useRef(null)

  useEffect(() => {
    return () => {
      if (preview3) URL.revokeObjectURL(preview3)
      if (preview5) URL.revokeObjectURL(preview5)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyPrepared = async (target, file) => {
    if (!file) return
    setBusy(true)
    setError('')
    setStatus('Preparando firma…')
    try {
      await new Promise((r) => setTimeout(r, 20))
      const prepared = await prepareFirmaImage(file, {
        maxEdge: 900,
        quality: 0.9,
        scan: false,
        onStatus: setStatus,
      })
      if (target === 'p3') {
        if (preview3) URL.revokeObjectURL(preview3)
        onChange({ firmaPagina3: prepared.blob, preview3: prepared.previewUrl })
      } else {
        if (preview5) URL.revokeObjectURL(preview5)
        onChange({ firmaPagina5: prepared.blob, preview5: prepared.previewUrl })
      }
      setError('')
    } catch (err) {
      setError(err?.message || 'No se pudo procesar la firma.')
    } finally {
      setBusy(false)
      setStatus('')
      pendingTarget.current = null
    }
  }

  const onFileChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    const target = pendingTarget.current
    if (!file || !target) return
    await applyPrepared(target, file)
  }

  const openCamera = (target) => {
    pendingTarget.current = target
    if (target === 'p3') fileP3Ref.current?.click()
    else fileP5Ref.current?.click()
  }

  const fileInputs =
    typeof document !== 'undefined'
      ? createPortal(
          <>
            <input
              ref={fileP3Ref}
              accept="image/*"
              capture="environment"
              className="hidden"
              type="file"
              onChange={onFileChange}
            />
            <input
              ref={fileP5Ref}
              accept="image/*"
              capture="environment"
              className="hidden"
              type="file"
              onChange={onFileChange}
            />
          </>,
          document.body,
        )
      : null

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      {fileInputs}
      <div>
        <p className="text-sm font-medium text-slate-800">Firmas manuscritas (opcional)</p>
        <p className="text-xs text-slate-500">
          Si querés, sacá o subí una foto de la firma de cada hoja (solo la firma). Se quita el
          fondo del papel, se pegan en el PDF y también van como PNG en el ZIP.
        </p>
      </div>
      {busy ? (
        <div className="alert alert-info text-sm">
          <span>{status || 'Procesando…'}</span>
        </div>
      ) : null}
      {error ? (
        <div className="alert alert-warning text-sm">
          <span>{error}</span>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FirmaSlot
          titulo="Firma página 3"
          preview={preview3}
          disabled={disabled || busy}
          onCapture={() => openCamera('p3')}
          onClear={() => {
            if (preview3) URL.revokeObjectURL(preview3)
            onChange({ firmaPagina3: null, preview3: null })
          }}
        />
        <FirmaSlot
          titulo="Firma página 5"
          preview={preview5}
          disabled={disabled || busy}
          onCapture={() => openCamera('p5')}
          onClear={() => {
            if (preview5) URL.revokeObjectURL(preview5)
            onChange({ firmaPagina5: null, preview5: null })
          }}
        />
      </div>
    </div>
  )
}

function FirmaSlot({ titulo, preview, disabled, onCapture, onClear }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</span>
        {preview ? (
          <span className="badge badge-success badge-sm">Lista</span>
        ) : (
          <span className="badge badge-ghost badge-sm">Pendiente</span>
        )}
      </div>
      {preview ? (
        <img
          src={preview}
          alt={titulo}
          decoding="async"
          className="mb-2 h-28 w-full rounded object-contain bg-slate-100"
        />
      ) : (
        <div className="mb-2 flex h-28 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
          Sin firma
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm border-none bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={disabled}
          onClick={onCapture}
        >
          {preview ? 'Otra foto' : 'Tomar / subir firma'}
        </button>
        {preview ? (
          <button type="button" className="btn btn-sm btn-ghost" disabled={disabled} onClick={onClear}>
            Quitar
          </button>
        ) : null}
      </div>
    </div>
  )
}
