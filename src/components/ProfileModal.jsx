import { useState } from 'react'
import Modal from './Modal.jsx'
import { changePassword } from '../service/api.js'
import { displayName, roleLabel } from '../lib/auth.js'

const emptyForm = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

export default function ProfileModal({ user, onClose }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [pending, setPending] = useState(false)

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
    setOk('')
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setOk('')
    if (form.new_password !== form.confirm_password) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    setPending(true)
    try {
      await changePassword(form)
      setForm(emptyForm)
      setOk('Contraseña actualizada.')
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal open title="Perfil" onClose={onClose}>
      <dl className="mb-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-slate-400">Usuario</dt>
          <dd className="font-medium">{user.username}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Rol</dt>
          <dd>{roleLabel(user)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-slate-400">Nombre</dt>
          <dd>{displayName(user)}</dd>
        </div>
      </dl>

      <form className="border-t border-slate-100 pt-4" onSubmit={submit}>
        <h4 className="mb-3 font-semibold">Cambiar contraseña</h4>
        {error ? (
          <div className="alert alert-error mb-3">
            <span>{error}</span>
          </div>
        ) : null}
        {ok ? (
          <div className="alert alert-success mb-3">
            <span>{ok}</span>
          </div>
        ) : null}
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-slate-500">Contraseña actual</span>
          <input
            autoComplete="current-password"
            className="input input-bordered w-full"
            onChange={(event) => setField('current_password', event.target.value)}
            type="password"
            value={form.current_password}
          />
        </label>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-slate-500">Nueva contraseña</span>
          <input
            autoComplete="new-password"
            className="input input-bordered w-full"
            onChange={(event) => setField('new_password', event.target.value)}
            type="password"
            value={form.new_password}
          />
        </label>
        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-slate-500">Confirmar nueva contraseña</span>
          <input
            autoComplete="new-password"
            className="input input-bordered w-full"
            onChange={(event) => setField('confirm_password', event.target.value)}
            type="password"
            value={form.confirm_password}
          />
        </label>
        <p className="mb-4 text-xs text-slate-400">Mínimo 8 caracteres. La sesión se mantiene al guardar.</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="submit"
            className="btn border-none bg-blue-600 text-white"
            disabled={
              pending ||
              !form.current_password ||
              !form.new_password ||
              !form.confirm_password
            }
          >
            {pending ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
