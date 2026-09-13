import Modal from './Modal.jsx'

export default function ConfirmModal({
  open,
  title = 'Confirmar',
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  danger = true,
  pending = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      stacked
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn-ghost" disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn border-none text-white ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? 'Procesando...' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  )
}
