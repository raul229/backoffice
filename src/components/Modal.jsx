import { useEffect } from 'react'

export default function Modal({ open, title, onClose, children, footer, wide = false, stacked = false }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      if (stacked) event.stopImmediatePropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, stacked)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey, stacked)
      document.body.style.overflow = previous
    }
  }, [open, onClose, stacked])

  if (!open) return null

  return (
    <dialog className={`modal modal-open ${stacked ? 'z-[1100]' : ''}`} aria-label={title}>
      <div className={`modal-box max-h-[85vh] overflow-y-auto ${wide ? 'max-w-4xl' : 'max-w-xl'}`}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" className="btn btn-circle btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <div>{children}</div>
        {footer ? <div className="modal-action flex-wrap">{footer}</div> : null}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>
          Cerrar
        </button>
      </form>
    </dialog>
  )
}
