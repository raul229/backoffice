import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import Field from './Field.jsx'
import { TextField } from './FormFields.jsx'
import Modal from './Modal.jsx'
import { displayName, roleLabel } from '../lib/auth.js'
import { changePasswordSchema, withSchema } from '../lib/schemas.js'
import { changePassword } from '../service/api.js'

const emptyForm = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

export default function ProfileModal({ user, onClose }) {
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const form = useForm({
    defaultValues: emptyForm,
    validators: withSchema(changePasswordSchema),
    onSubmit: async ({ value }) => {
      setError('')
      setOk('')
      try {
        await changePassword(value)
        form.reset()
        setOk('Contraseña actualizada.')
      } catch (err) {
        setError(err.message)
      }
    },
  })

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

      <form
        className="border-t border-slate-100 pt-4"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          form.handleSubmit()
        }}
      >
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
        <Field form={form} name="current_password">
          {(field) => (
            <TextField
              autoComplete="current-password"
              className="mb-3 block"
              field={field}
              label="Contraseña actual"
              type="password"
            />
          )}
        </Field>
        <Field form={form} name="new_password">
          {(field) => (
            <TextField
              autoComplete="new-password"
              className="mb-3 block"
              field={field}
              label="Nueva contraseña"
              type="password"
            />
          )}
        </Field>
        <Field form={form} name="confirm_password">
          {(field) => (
            <TextField
              autoComplete="new-password"
              className="mb-4 block"
              field={field}
              label="Confirmar nueva contraseña"
              type="password"
            />
          )}
        </Field>
        <p className="mb-4 text-xs text-slate-400">Mínimo 8 caracteres. La sesión se mantiene al guardar.</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <button
                type="submit"
                className="btn border-none bg-blue-600 text-white"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Actualizar contraseña'}
              </button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </Modal>
  )
}
