import { useEffect, useMemo, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Field from '../components/Field.jsx'
import { CheckboxField, SelectField, TextField } from '../components/FormFields.jsx'
import { roleNameSchema, roleSchema, userFormSchema, withSchema } from '../lib/schemas.js'
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
import ConfirmModal from '../components/ConfirmModal.jsx'

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
  const [confirm, setConfirm] = useState(null)
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
      setConfirm(null)
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
      setConfirm(null)
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
                    onClick={() =>
                      setConfirm({
                        title: 'Eliminar rol',
                        message: `¿Eliminar el rol “${role.name}”? Esta acción no se puede deshacer.`,
                        run: () => removeRole.mutate(role.id),
                      })
                    }
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
                      onClick={() =>
                        setConfirm({
                          title: 'Eliminar usuario',
                          message: `¿Eliminar al usuario “${user.username}”? Esta acción no se puede deshacer.`,
                          run: () => removeUser.mutate(user.id),
                        })
                      }
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

      {confirm ? (
        <ConfirmModal
          open
          title={confirm.title}
          message={confirm.message}
          pending={removeRole.isPending || removeUser.isPending}
          onCancel={() => setConfirm(null)}
          onConfirm={() => confirm.run()}
        />
      ) : null}

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
          onDelete={() =>
            setConfirm({
              title: 'Eliminar rol',
              message: `¿Eliminar el rol “${selectedRole.name}”? Esta acción no se puede deshacer.`,
              run: () => removeRole.mutate(selectedRole.id),
            })
          }
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
          onDelete={() =>
            setConfirm({
              title: 'Eliminar usuario',
              message: `¿Eliminar al usuario “${selectedUser.username}”? Esta acción no se puede deshacer.`,
              run: () => removeUser.mutate(selectedUser.id),
            })
          }
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
  const form = useForm({
    defaultValues: { name: '' },
    validators: withSchema(roleNameSchema),
    onSubmit: ({ value }) => onCreate(value.name.trim()),
  })
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
          <form.Subscribe selector={(state) => [state.values.name, state.isSubmitting]}>
            {([name, isSubmitting]) => (
              <button
                type="button"
                className="btn border-none bg-blue-600 text-white"
                disabled={!name.trim() || pending || isSubmitting}
                onClick={() => form.handleSubmit()}
              >
                Crear
              </button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <Field form={form} name="name">
        {(field) => <TextField field={field} label="Nombre" />}
      </Field>
    </Modal>
  )
}

function RoleModal({ role, catalog, editing, onClose, onSave, onDelete, pending }) {
  const canEdit = editing
  const form = useForm({
    defaultValues: { name: role.name, permissions: role.permissions },
    validators: withSchema(roleSchema),
    onSubmit: ({ value }) => onSave({ name: value.name.trim(), permissions: value.permissions }),
  })

  useEffect(() => {
    form.reset({ name: role.name, permissions: role.permissions })
  }, [form, role])

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
              <form.Subscribe selector={(state) => [state.values.name, state.isSubmitting]}>
                {([name, isSubmitting]) => (
                  <button
                    type="button"
                    className="btn border-none bg-blue-600 text-white"
                    disabled={!name.trim() || pending || isSubmitting}
                    onClick={() => form.handleSubmit()}
                  >
                    Guardar
                  </button>
                )}
              </form.Subscribe>
            </>
          ) : null}
        </>
      }
    >
        {canEdit ? (
          <Field form={form} name="name">
            {(field) => <TextField className="mb-4 block" field={field} label="Nombre" />}
          </Field>
        ) : (
          <label className="mb-4 block text-sm">
            <span className="mb-1 block text-slate-500">Nombre</span>
            <p className="font-medium">{role.name}</p>
          </label>
        )}
        <form.Subscribe selector={(state) => state.values.permissions}>
          {(perms) => (
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
                          onChange={() => {
                            if (!canEdit) return
                            form.setFieldValue(
                              'permissions',
                              perms.includes(code)
                                ? perms.filter((item) => item !== code)
                                : [...perms, code],
                            )
                          }}
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
          )}
        </form.Subscribe>
    </Modal>
  )
}

function UserModal({ user, roles, editing, isCreate, currentUserId, onClose, onSave, onDelete, pending }) {
  const canEdit = editing || isCreate
  const isSelf = user.id === currentUserId
  const initialGroup =
    roles.find((role) => user.groups?.includes(role.name))?.id != null
      ? String(roles.find((role) => user.groups.includes(role.name)).id)
      : ''

  const form = useForm({
    defaultValues: {
      username: user.username ?? '',
      password: '',
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      groups: initialGroup,
      is_active: user.is_active !== false,
    },
    validators: withSchema(userFormSchema(isCreate)),
    onSubmit: ({ value }) => {
      const payload = {
        username: value.username.trim(),
        first_name: value.first_name.trim(),
        last_name: value.last_name.trim(),
        groups: value.groups ? [Number(value.groups)] : [],
        is_active: value.is_active,
      }
      if (value.password) payload.password = value.password
      onSave(payload)
    },
  })

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
            <form.Subscribe selector={(state) => [state.values, state.isSubmitting]}>
              {([values, isSubmitting]) => (
                <button
                  type="button"
                  className="btn border-none bg-blue-600 text-white"
                  disabled={
                    !values.username.trim() || (isCreate && !values.password) || pending || isSubmitting
                  }
                  onClick={() => form.handleSubmit()}
                >
                  {isCreate ? 'Crear' : 'Guardar'}
                </button>
              )}
            </form.Subscribe>
          ) : null}
        </>
      }
    >
        <div className="grid gap-3">
          {canEdit ? (
            <Field form={form} name="username">
              {(field) => <TextField field={field} label="Usuario" />}
            </Field>
          ) : (
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Usuario</span>
              <p className="font-medium">{user.username}</p>
            </label>
          )}
          {canEdit ? (
            <Field form={form} name="password">
              {(field) => (
                <TextField
                  field={field}
                  label={isCreate ? 'Contraseña' : 'Nueva contraseña (opcional)'}
                  type="password"
                />
              )}
            </Field>
          ) : null}
          {canEdit ? (
            <Field form={form} name="first_name">
              {(field) => <TextField field={field} label="Nombre" />}
            </Field>
          ) : (
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Nombre</span>
              <p>{user.first_name || '—'}</p>
            </label>
          )}
          {canEdit ? (
            <Field form={form} name="last_name">
              {(field) => <TextField field={field} label="Apellido" />}
            </Field>
          ) : (
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Apellido</span>
              <p>{user.last_name || '—'}</p>
            </label>
          )}
          {canEdit ? (
            <Field form={form} name="groups">
              {(field) => (
                <SelectField
                  field={field}
                  label="Rol"
                  options={roles.map((role) => ({ value: String(role.id), label: role.name }))}
                  placeholder="Sin rol"
                />
              )}
            </Field>
          ) : (
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Rol</span>
              <p>{user.groups?.[0] || 'Sin rol'}</p>
            </label>
          )}
          {!isCreate ? (
            canEdit ? (
              <Field form={form} name="is_active">
                {(field) => (
                  <CheckboxField disabled={isSelf} field={field} label="Cuenta activa" />
                )}
              </Field>
            ) : (
              <p className="text-sm">{user.is_active !== false ? 'Cuenta activa' : 'Cuenta inactiva'}</p>
            )
          ) : null}
        </div>
    </Modal>
  )
}
