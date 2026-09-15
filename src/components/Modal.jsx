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
      <div
        className={`modal-box w-[calc(100%-1.5rem)] max-h-[min(90dvh,40rem)] overflow-y-auto p-4 sm:p-6 ${
          wide ? 'sm:max-w-4xl' : 'sm:max-w-xl'
        }`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-base font-bold sm:text-lg">{title}</h3>
          <button type="button" className="btn btn-circle btn-ghost btn-sm shrink-0" onClick={onClose}>
            ✕
          </button>
        </div>
        <div>{children}</div>
        {footer ? (
          <div className="modal-action mt-4 flex-col-reverse gap-2 sm:flex-row sm:flex-wrap">{footer}</div>
        ) : null}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>
          Cerrar
        </button>
      </form>
    </dialog>
  )
}
