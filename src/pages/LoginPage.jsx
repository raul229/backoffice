import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import Field from '../components/Field.jsx'
import { TextField } from '../components/FormFields.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { IconBolt } from '../lib/icons.jsx'
import { loginSchema, withSchema } from '../lib/schemas.js'

export default function LoginPage() {
  const { login } = useAuth()
  const [error, setError] = useState('')

  const form = useForm({
    defaultValues: { username: '', password: '' },
    validators: withSchema(loginSchema),
    onSubmit: async ({ value }) => {
      setError('')
      try {
        await login(value.username, value.password)
      } catch (err) {
        setError(err.message)
      }
    },
  })

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#e8eef8] p-4 sm:p-6">
      <form
        className="bo-card w-full max-w-md p-6 sm:p-8"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          form.handleSubmit()
        }}
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white">
            <IconBolt className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Back Office</h1>
            <p className="text-sm text-slate-500">Forma sencilla se seguir tus ventas</p>
          </div>
        </div>

        {error ? (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        ) : null}

        <Field form={form} name="username">
          {(field) => (
            <TextField
              autoComplete="username"
              className="mb-3 block"
              field={field}
              label="Usuario"
            />
          )}
        </Field>
        <Field form={form} name="password">
          {(field) => (
            <TextField
              autoComplete="current-password"
              className="mb-5 block"
              field={field}
              label="Contraseña"
              type="password"
            />
          )}
        </Field>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting, state.values]}>
          {([canSubmit, isSubmitting, values]) => (
            <button
              className="btn w-full rounded-full border-none bg-blue-600 text-white hover:bg-blue-700"
              disabled={!canSubmit || isSubmitting || !values.username || !values.password}
              type="submit"
            >
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </button>
          )}
        </form.Subscribe>
      </form>
    </div>
  )
}
