import { useState } from 'react'
import { IconBolt } from '../lib/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#e8eef8] p-6">
      <form className="bo-card w-full max-w-md p-8" onSubmit={submit}>
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white">
            <IconBolt className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Back Office</h1>
            <p className="text-sm text-slate-500">Ingresa con tu usuario de Django</p>
          </div>
        </div>

        {error ? (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        ) : null}

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-slate-500">Usuario</span>
          <input
            autoComplete="username"
            className="input input-bordered w-full"
            onChange={(event) => setUsername(event.target.value)}
            value={username}
          />
        </label>
        <label className="mb-5 block text-sm">
          <span className="mb-1 block text-slate-500">Contraseña</span>
          <input
            autoComplete="current-password"
            className="input input-bordered w-full"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        <button
          className="btn w-full rounded-full border-none bg-blue-600 text-white hover:bg-blue-700"
          disabled={pending || !username || !password}
          type="submit"
        >
          {pending ? 'Ingresando...' : 'Ingresar'}
        </button>
        <p className="mt-4 text-xs text-slate-500">
          Roles: admin/admin123 · asesor/asesor123 · supervisor/supervisor123 · operaciones/operaciones123
        </p>
      </form>
    </div>
  )
}
