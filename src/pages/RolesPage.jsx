import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createRole,
  createUser,
  deleteRole,
  deleteUser,
  getPermissionCatalog,
  getRoles,
  getUsers,
  updateRole,
  updateUser,
} from '../service/api.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function RolesPage() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [roleName, setRoleName] = useState('')
  const [rolePerms, setRolePerms] = useState([])
  const [newRoleName, setNewRoleName] = useState('')
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    groups: [],
  })
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const catalogQuery = useQuery({ queryKey: ['permission-catalog'], queryFn: getPermissionCatalog })
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: getRoles })
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers })

  const roles = rolesQuery.data ?? []
  const users = usersQuery.data ?? []
  const catalog = catalogQuery.data ?? []
  const selected = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  )

  useEffect(() => {
    if (!selectedRoleId && roles[0]) {
      setSelectedRoleId(roles[0].id)
    }
  }, [roles, selectedRoleId])

  useEffect(() => {
    if (!selected) return
    setRoleName(selected.name)
    setRolePerms(selected.permissions)
  }, [selected])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['roles'] })
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }

  const saveRole = useMutation({
    mutationFn: () => updateRole(selected.id, { name: roleName, permissions: rolePerms }),
    onSuccess: () => {
      setOk('Rol actualizado.')
      setError('')
      invalidate()
    },
    onError: (err) => setError(err.message),
  })

  const addRole = useMutation({
    mutationFn: () => createRole({ name: newRoleName, permissions: [] }),
    onSuccess: (role) => {
      setNewRoleName('')
      setSelectedRoleId(role.id)
      setOk('Rol creado.')
      setError('')
      invalidate()
    },
    onError: (err) => setError(err.message),
  })

  const removeRole = useMutation({
    mutationFn: (id) => deleteRole(id),
    onSuccess: () => {
      setSelectedRoleId(null)
      setOk('Rol eliminado.')
      setError('')
      invalidate()
    },
    onError: (err) => setError(err.message),
  })

  const addUser = useMutation({
    mutationFn: () => createUser(userForm),
    onSuccess: () => {
      setUserForm({ username: '', password: '', first_name: '', last_name: '', groups: [] })
      setOk('Usuario creado.')
      setError('')
      invalidate()
    },
    onError: (err) => setError(err.message),
  })

  const patchUser = useMutation({
    mutationFn: ({ id, payload }) => updateUser(id, payload),
    onSuccess: () => {
      setOk('Usuario actualizado.')
      setError('')
      invalidate()
    },
    onError: (err) => setError(err.message),
  })

  const removeUser = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      setOk('Usuario eliminado.')
      setError('')
      invalidate()
    },
    onError: (err) => setError(err.message),
  })

  const togglePerm = (code) => {
    setRolePerms((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Roles y usuarios</h1>
        <p className="text-sm text-slate-500">
          Los roles usan los grupos y permisos de Django. Sin “ver todas las ventas”, cada usuario solo ve las que registró.
        </p>
      </div>

      {error ? (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      ) : null}
      {ok ? (
        <div className="alert alert-success">
          <span>{ok}</span>
        </div>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[260px_1fr]">
        <section className="bo-card p-4">
          <h2 className="mb-3 font-semibold">Roles</h2>
          <div className="mb-3 flex gap-2">
            <input
              className="input input-bordered input-sm flex-1"
              onChange={(event) => setNewRoleName(event.target.value)}
              placeholder="Nuevo rol"
              value={newRoleName}
            />
            <button
              type="button"
              className="btn btn-sm rounded-full border-none bg-blue-600 text-white"
              disabled={!newRoleName.trim() || addRole.isPending}
              onClick={() => addRole.mutate()}
            >
              Crear
            </button>
          </div>
          <ul className="space-y-1">
            {roles.map((role) => (
              <li key={role.id}>
                <button
                  type="button"
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                    selectedRoleId === role.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'
                  }`}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  {role.name}
                  <span className="block text-xs opacity-70">{role.users_count} usuarios</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="bo-card p-5">
          {selected ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <input
                  className="input input-bordered max-w-sm"
                  onChange={(event) => setRoleName(event.target.value)}
                  value={roleName}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm rounded-full border-none bg-blue-600 text-white"
                    disabled={saveRole.isPending}
                    onClick={() => saveRole.mutate()}
                  >
                    Guardar nombre y permisos
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-rose-600"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar el rol “${selected.name}”?`)) {
                        removeRole.mutate(selected.id)
                      }
                    }}
                  >
                    Eliminar rol
                  </button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {catalog.map((section) => (
                  <fieldset key={section.group} className="rounded-xl bg-slate-50 p-3">
                    <legend className="px-1 text-sm font-semibold">{section.group}</legend>
                    <div className="space-y-2">
                      {section.items.map(([code, label]) => (
                        <label key={code} className="flex items-start gap-2 text-sm">
                          <input
                            checked={rolePerms.includes(code)}
                            className="checkbox checkbox-sm mt-0.5"
                            onChange={() => togglePerm(code)}
                            type="checkbox"
                          />
                          <span>
                            {label}
                            <span className="block text-xs text-slate-400">{code}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Selecciona un rol.</p>
          )}
        </section>
      </div>

      <section className="bo-card p-5">
        <h2 className="mb-4 font-semibold">Usuarios</h2>
        <div className="mb-4 grid gap-2 md:grid-cols-6">
          <input
            className="input input-bordered"
            onChange={(event) => setUserForm((current) => ({ ...current, username: event.target.value }))}
            placeholder="Usuario"
            value={userForm.username}
          />
          <input
            className="input input-bordered"
            onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Contraseña"
            type="password"
            value={userForm.password}
          />
          <input
            className="input input-bordered"
            onChange={(event) => setUserForm((current) => ({ ...current, first_name: event.target.value }))}
            placeholder="Nombre"
            value={userForm.first_name}
          />
          <input
            className="input input-bordered"
            onChange={(event) => setUserForm((current) => ({ ...current, last_name: event.target.value }))}
            placeholder="Apellido"
            value={userForm.last_name}
          />
          <select
            className="select select-bordered"
            onChange={(event) =>
              setUserForm((current) => ({
                ...current,
                groups: event.target.value ? [Number(event.target.value)] : [],
              }))
            }
            value={userForm.groups[0] ?? ''}
          >
            <option value="">Sin rol</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn rounded-full border-none bg-blue-600 text-white"
            disabled={!userForm.username || !userForm.password || addUser.isPending}
            onClick={() => addUser.mutate()}
          >
            Crear usuario
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="text-slate-400">
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  currentUserId={currentUser?.id}
                  onDelete={() => {
                    if (window.confirm(`¿Eliminar al usuario “${user.username}”?`)) {
                      removeUser.mutate(user.id)
                    }
                  }}
                  onSave={(payload) => patchUser.mutate({ id: user.id, payload })}
                  roles={roles}
                  user={user}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function UserRow({ user, roles, currentUserId, onSave, onDelete }) {
  const [username, setUsername] = useState(user.username)
  const [firstName, setFirstName] = useState(user.first_name ?? '')
  const [lastName, setLastName] = useState(user.last_name ?? '')
  const isSelf = user.id === currentUserId

  useEffect(() => {
    setUsername(user.username)
    setFirstName(user.first_name ?? '')
    setLastName(user.last_name ?? '')
  }, [user.first_name, user.last_name, user.username])

  return (
    <tr>
      <td>
        <input
          className="input input-bordered input-sm w-32"
          onChange={(event) => setUsername(event.target.value)}
          value={username}
        />
      </td>
      <td>
        <input
          className="input input-bordered input-sm w-32"
          onChange={(event) => setFirstName(event.target.value)}
          value={firstName}
        />
      </td>
      <td>
        <input
          className="input input-bordered input-sm w-32"
          onChange={(event) => setLastName(event.target.value)}
          value={lastName}
        />
      </td>
      <td>
        <select
          className="select select-bordered select-sm"
          onChange={(event) =>
            onSave({ groups: event.target.value ? [Number(event.target.value)] : [] })
          }
          value={roles.find((role) => user.groups.includes(role.name))?.id ?? ''}
        >
          <option value="">Sin rol</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={user.is_active}
            className="checkbox checkbox-sm"
            disabled={isSelf}
            onChange={(event) => onSave({ is_active: event.target.checked })}
            type="checkbox"
          />
          {user.is_active ? 'Activo' : 'Inactivo'}
        </label>
      </td>
      <td className="whitespace-nowrap text-right">
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() =>
            onSave({
              username: username.trim(),
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            })
          }
        >
          Guardar
        </button>
        {isSelf ? null : (
          <button type="button" className="btn btn-ghost btn-xs text-rose-600" onClick={onDelete}>
            Eliminar
          </button>
        )}
      </td>
    </tr>
  )
}
