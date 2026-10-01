import { useEffect, useRef, useState } from 'react'
import DocumentScanner from './DocumentScanner.jsx'

function isMobileDevice() {
  if (typeof window === 'undefined') return false
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches
  const narrow = window.matchMedia?.('(max-width: 900px)')?.matches
  const ua = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
  return Boolean(ua || (coarse && narrow))
}

/**
 * Flujo de captura de hojas de firma (páginas 3 y 5) para Internet Empresas.
 */
export default function FirmasContratoScan({
  firmaPagina3,
  firmaPagina5,
  preview3,
  preview5,
  onChange,
  disabled = false,
}) {
  const [paso, setPaso] = useState(null) // 'p3' | 'p5' | null
  const [mobile] = useState(() => isMobileDevice())
  const fileP3Ref = useRef(null)
  const fileP5Ref = useRef(null)

  useEffect(() => {
    return () => {
      if (preview3) URL.revokeObjectURL(preview3)
      if (preview5) URL.revokeObjectURL(preview5)
    }
    // Solo al desmontar el bloque completo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyFile = (target, file) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    if (target === 'p3') {
      if (preview3) URL.revokeObjectURL(preview3)
      onChange({ firmaPagina3: file, preview3: url })
    } else {
      if (preview5) URL.revokeObjectURL(preview5)
      onChange({ firmaPagina5: file, preview5: url })
    }
  }

  if (paso === 'p3') {
    return (
      <DocumentScanner
        label="Escanear hoja de firma — página 3"
        onCancel={() => setPaso(null)}
        onCapture={(blob, url) => {
          if (preview3) URL.revokeObjectURL(preview3)
          onChange({ firmaPagina3: blob, preview3: url })
          setPaso(null)
        }}
      />
    )
  }

  if (paso === 'p5') {
    return (
      <DocumentScanner
        label="Escanear hoja de firma — página 5"
        onCancel={() => setPaso(null)}
        onCapture={(blob, url) => {
          if (preview5) URL.revokeObjectURL(preview5)
          onChange({ firmaPagina5: blob, preview5: url })
          setPaso(null)
        }}
      />
    )
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div>
        <p className="text-sm font-medium text-slate-800">Hojas de firma (requerido)</p>
        <p className="text-xs text-slate-500">
          {mobile
            ? 'En el celular usá “Tomar foto” (abre la cámara del sistema). RRLL y datos se completan después en el PDF.'
            : 'Escanea las páginas 3 y 5 ya firmadas (solo la firma manuscrita). RRLL, contacto y fecha se completan después en el PDF.'}
        </p>
      </div>
      <input
        ref={fileP3Ref}
        accept="image/*"
        capture="environment"
        className="hidden"
        type="file"
        onChange={(event) => {
          applyFile('p3', event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <input
        ref={fileP5Ref}
        accept="image/*"
        capture="environment"
        className="hidden"
        type="file"
        onChange={(event) => {
          applyFile('p5', event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FirmaSlot
          titulo="Página 3"
          preview={preview3}
          disabled={disabled}
          mobile={mobile}
          onScan={() => setPaso('p3')}
          onTakePhoto={() => fileP3Ref.current?.click()}
          onClear={() => {
            if (preview3) URL.revokeObjectURL(preview3)
            onChange({ firmaPagina3: null, preview3: null })
          }}
        />
        <FirmaSlot
          titulo="Página 5"
          preview={preview5}
          disabled={disabled}
          mobile={mobile}
          onScan={() => setPaso('p5')}
          onTakePhoto={() => fileP5Ref.current?.click()}
          onClear={() => {
            if (preview5) URL.revokeObjectURL(preview5)
            onChange({ firmaPagina5: null, preview5: null })
          }}
        />
      </div>
    </div>
  )
}

function FirmaSlot({ titulo, preview, disabled, mobile, onScan, onTakePhoto, onClear }) {
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
        <img src={preview} alt={titulo} className="mb-2 max-h-40 w-full rounded object-contain bg-slate-100" />
      ) : (
        <div className="mb-2 flex h-28 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
          Sin captura
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {mobile ? (
          <button
            type="button"
            className="btn btn-sm border-none bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={disabled}
            onClick={onTakePhoto}
          >
            {preview ? 'Otra foto' : 'Tomar foto'}
          </button>
        ) : (
          <button type="button" className="btn btn-sm btn-outline" disabled={disabled} onClick={onScan}>
            {preview ? 'Rehacer' : 'Escanear'}
          </button>
        )}
        {preview ? (
          <button type="button" className="btn btn-sm btn-ghost" disabled={disabled} onClick={onClear}>
            Quitar
          </button>
        ) : null}
      </div>
    </div>
  )
}
