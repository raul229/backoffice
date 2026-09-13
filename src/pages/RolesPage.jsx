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
import { displayName } from '../lib/auth.js'
import { useAuth } from '../context/AuthContext.jsx'
import Modal from '../components/Modal.jsx'

const emptyUser = {
  username: '',
  password: '',
  first_name: '',
  last_name: '',
  groups: [],
  is_active: true,
}

export default function RolesPage() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [modal, setModal] = useState(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const catalogQuery = useQuery({ queryKey: ['permission-catalog'], queryFn: getPermissionCatalog })
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: getRoles })
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers })

  const roles = rolesQuery.data ?? []
  const users = usersQuery.data ?? []
  const catalog = catalogQuery.data ?? []

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['roles'] })
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }

  const close = () => setModal(null)

  const addRole = useMutation({
    mutationFn: (name) => createRole({ name, permissions: [] }),
    onSuccess: (role) => {
      setOk('Rol creado.')
      setError('')
      invalidate()
      setModal({ type: 'role', id: role.id, editing: true })
    },
    onError: (err) => setError(err.message),
  })

  const saveRole = useMutation({
    mutationFn: ({ id, payload }) => updateRole(id, payload),
    onSuccess: () => {
      setOk('Rol actualizado.')
      setError('')
      invalidate()
      close()
    },
    onError: (err) => setError(err.message),
  })

  const removeRole = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      setOk('Rol eliminado.')
      setError('')
      invalidate()
      close()
    },
    onError: (err) => setError(err.message),
  })

  const addUser = useMutation({
    mutationFn: (payload) => createUser(payload),
    onSuccess: () => {
      setOk('Usuario creado.')
      setError('')
      invalidate()
      close()
    },
    onError: (err) => setError(err.message),
  })

  const patchUser = useMutation({
    mutationFn: ({ id, payload }) => updateUser(id, payload),
    onSuccess: () => {
      setOk('Usuario actualizado.')
      setError('')
      invalidate()
      close()
    },
    onError: (err) => setError(err.message),
  })

  const removeUser = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      setOk('Usuario eliminado.')
      setError('')
      invalidate()
      close()
    },
    onError: (err) => setError(err.message),
  })

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === modal?.id) ?? null,
    [modal, roles],
  )
  const selectedUser = useMemo(
    () => users.find((user) => user.id === modal?.id) ?? null,
    [modal, users],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Roles y usuarios</h1>
          <p className="text-sm text-slate-500">
            Abre un registro para verlo o editarlo. Los cambios solo se guardan desde el modal.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-sm rounded-full border-none bg-blue-600 text-white"
            onClick={() => setModal({ type: 'create-role' })}
          >
            Nuevo rol
          </button>
          <button
            type="button"
            className="btn btn-sm rounded-full border-none bg-blue-600 text-white"
            onClick={() => setModal({ type: 'create-user' })}
          >
            Nuevo usuario
          </button>
        </div>
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

      <section className="bo-card overflow-x-auto p-5">
        <h2 className="mb-3 font-semibold">Roles</h2>
        <table className="table">
          <thead>
            <tr className="text-slate-400">
              <th>Rol</th>
              <th>Usuarios</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="font-medium">{role.name}</td>
                <td>{role.users_count}</td>
                <td className="text-right">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setModal({ type: 'role', id: role.id, editing: false })}
                  >
                    Ver
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setModal({ type: 'role', id: role.id, editing: true })}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-rose-600"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar el rol “${role.name}”?`)) {
                        removeRole.mutate(role.id)
                      }
                    }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bo-card overflow-x-auto p-5">
        <h2 className="mb-3 font-semibold">Usuarios</h2>
        <table className="table">
          <thead>
            <tr className="text-slate-400">
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="font-medium">{user.username}</td>
                <td>{displayName(user)}</td>
                <td>{user.groups[0] || 'Sin rol'}</td>
                <td>{user.is_active ? 'Activo' : 'Inactivo'}</td>
                <td className="text-right">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setModal({ type: 'user', id: user.id, editing: false })}
                  >
                    Ver
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setModal({ type: 'user', id: user.id, editing: true })}
                  >
                    Editar
                  </button>
                  {user.id === currentUser?.id ? null : (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs text-rose-600"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar al usuario “${user.username}”?`)) {
                          removeUser.mutate(user.id)
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {modal?.type === 'create-role' ? (
        <CreateRoleModal
          onClose={close}
          onCreate={(name) => addRole.mutate(name)}
          pending={addRole.isPending}
        />
      ) : null}

      {modal?.type === 'role' && selectedRole ? (
        <RoleModal
          catalog={catalog}
          editing={modal.editing}
          onClose={close}
          onDelete={() => {
            if (window.confirm(`¿Eliminar el rol “${selectedRole.name}”?`)) {
              removeRole.mutate(selectedRole.id)
            }
          }}
          onSave={(payload) => saveRole.mutate({ id: selectedRole.id, payload })}
          pending={saveRole.isPending}
          role={selectedRole}
        />
      ) : null}

      {modal?.type === 'create-user' ? (
        <UserModal
          editing
          isCreate
          onClose={close}
          onSave={(payload) => addUser.mutate(payload)}
          pending={addUser.isPending}
          roles={roles}
          user={emptyUser}
        />
      ) : null}

      {modal?.type === 'user' && selectedUser ? (
        <UserModal
          currentUserId={currentUser?.id}
          editing={modal.editing}
          onClose={close}
          onDelete={() => {
            if (window.confirm(`¿Eliminar al usuario “${selectedUser.username}”?`)) {
              removeUser.mutate(selectedUser.id)
            }
          }}
          onSave={(payload) => patchUser.mutate({ id: selectedUser.id, payload })}
          pending={patchUser.isPending}
          roles={roles}
          user={selectedUser}
        />
      ) : null}
    </div>
  )
}

function CreateRoleModal({ onClose, onCreate, pending }) {
  const [name, setName] = useState('')
  return (
    <Modal
      open
      title="Nuevo rol"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn border-none bg-blue-600 text-white"
            disabled={!name.trim() || pending}
            onClick={() => onCreate(name.trim())}
          >
            Crear
          </button>
        </>
      }
    >
      <label className="block text-sm">
        <span className="mb-1 block text-slate-500">Nombre</span>
        <input
          className="input input-bordered w-full"
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
      </label>
    </Modal>
  )
}

function RoleModal({ role, catalog, editing, onClose, onSave, onDelete, pending }) {
  const [name, setName] = useState(role.name)
  const [perms, setPerms] = useState(role.permissions)
  const canEdit = editing

  useEffect(() => {
    setName(role.name)
    setPerms(role.permissions)
  }, [role])

  const toggle = (code) => {
    if (!canEdit) return
    setPerms((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    )
  }

  return (
    <Modal
      open
      wide
      title={canEdit ? `Editar rol: ${role.name}` : `Rol: ${role.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          {canEdit ? (
            <>
              <button type="button" className="btn btn-ghost text-rose-600" onClick={onDelete}>
                Eliminar
              </button>
              <button
                type="button"
                className="btn border-none bg-blue-600 text-white"
                disabled={!name.trim() || pending}
                onClick={() => onSave({ name: name.trim(), permissions: perms })}
              >
                Guardar
              </button>
            </>
          ) : null}
        </>
      }
    >
      <label className="mb-4 block text-sm">
        <span className="mb-1 block text-slate-500">Nombre</span>
        {canEdit ? (
          <input
            className="input input-bordered w-full"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        ) : (
          <p className="font-medium">{role.name}</p>
        )}
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        {catalog.map((section) => (
          <fieldset key={section.group} className="rounded-xl bg-slate-50 p-3">
            <legend className="px-1 text-sm font-semibold">{section.group}</legend>
            <div className="space-y-2">
              {section.items.map(([code, label]) => (
                <label key={code} className="flex items-start gap-2 text-sm">
                  <input
                    checked={perms.includes(code)}
                    className="checkbox checkbox-sm mt-0.5"
                    disabled={!canEdit}
                    onChange={() => toggle(code)}
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
    </Modal>
  )
}

function UserModal({ user, roles, editing, isCreate, currentUserId, onClose, onSave, onDelete, pending }) {
  const [form, setForm] = useState({
    username: user.username ?? '',
    password: '',
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
    groups: roles.find((role) => user.groups?.includes(role.name))?.id
      ? [roles.find((role) => user.groups.includes(role.name)).id]
      : [],
    is_active: user.is_active !== false,
  })
  const canEdit = editing || isCreate
  const isSelf = user.id === currentUserId

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  return (
    <Modal
      open
      title={isCreate ? 'Nuevo usuario' : canEdit ? `Editar ${user.username}` : `Usuario ${user.username}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          {canEdit && !isCreate && !isSelf ? (
            <button type="button" className="btn btn-ghost text-rose-600" onClick={onDelete}>
              Eliminar
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="btn border-none bg-blue-600 text-white"
              disabled={!form.username.trim() || (isCreate && !form.password) || pending}
              onClick={() => {
                const payload = {
                  username: form.username.trim(),
                  first_name: form.first_name.trim(),
                  last_name: form.last_name.trim(),
                  groups: form.groups,
                  is_active: form.is_active,
                }
                if (form.password) payload.password = form.password
                onSave(payload)
              }}
            >
              {isCreate ? 'Crear' : 'Guardar'}
            </button>
          ) : null}
        </>
      }
    >
      <div className="grid gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Usuario</span>
          {canEdit ? (
            <input
              className="input input-bordered w-full"
              onChange={(event) => setField('username', event.target.value)}
              value={form.username}
            />
          ) : (
            <p className="font-medium">{user.username}</p>
          )}
        </label>
        {canEdit ? (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">
              {isCreate ? 'Contraseña' : 'Nueva contraseña (opcional)'}
            </span>
            <input
              className="input input-bordered w-full"
              onChange={(event) => setField('password', event.target.value)}
              type="password"
              value={form.password}
            />
          </label>
        ) : null}
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Nombre</span>
          {canEdit ? (
            <input
              className="input input-bordered w-full"
              onChange={(event) => setField('first_name', event.target.value)}
              value={form.first_name}
            />
          ) : (
            <p>{user.first_name || '—'}</p>
          )}
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Apellido</span>
          {canEdit ? (
            <input
              className="input input-bordered w-full"
              onChange={(event) => setField('last_name', event.target.value)}
              value={form.last_name}
            />
          ) : (
            <p>{user.last_name || '—'}</p>
          )}
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Rol</span>
          {canEdit ? (
            <select
              className="select select-bordered w-full"
              onChange={(event) =>
                setField('groups', event.target.value ? [Number(event.target.value)] : [])
              }
              value={form.groups[0] ?? ''}
            >
              <option value="">Sin rol</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          ) : (
            <p>{user.groups?.[0] || 'Sin rol'}</p>
          )}
        </label>
        {!isCreate ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={form.is_active}
              className="checkbox checkbox-sm"
              disabled={!canEdit || isSelf}
              onChange={(event) => setField('is_active', event.target.checked)}
              type="checkbox"
            />
            Cuenta activa
          </label>
        ) : null}
      </div>
    </Modal>
  )
}
