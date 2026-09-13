import { useState } from 'react'
import {
  IconBell,
  IconBolt,
  IconCart,
  IconChart,
  IconCog,
  IconHome,
  IconLock,
  IconSearch,
  IconUsers,
} from '../lib/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { displayName, initials, roleLabel } from '../lib/auth.js'
import ProfileModal from './ProfileModal.jsx'

const NAV = [
  { id: 'inicio', label: 'Inicio', icon: IconHome, permission: 'api.view_venta' },
  { id: 'ventas', label: 'Ventas', icon: IconCart, permission: 'api.view_venta' },
  { id: 'clientes', label: 'Clientes', icon: IconUsers, permission: 'api.view_cliente' },
  { id: 'reportes', label: 'Reportes', icon: IconChart, permission: 'api.view_venta' },
  { id: 'configuracion', label: 'Configuración', icon: IconCog, permission: 'api.change_flujo' },
  { id: 'roles', label: 'Roles y usuarios', icon: IconLock, permission: 'auth.change_group' },
]

export default function AppShell({ page, search, onSearch, onNavigate, children }) {
  const { user, can, logout } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const nav = NAV.filter((item) => can(item.permission))
  return (
    <div className="flex min-h-screen">
      <aside className="bo-sidebar flex w-60 shrink-0 flex-col px-4 py-5 text-white">
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500">
            <IconBolt className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg font-semibold">Back Office</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active = page === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                  active ? 'bg-blue-600 font-medium text-white' : 'text-slate-300 hover:bg-white/10'
                }`}
                onClick={() => onNavigate({ page: item.id })}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="mt-6 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 p-4">
          <p className="text-sm font-semibold">Automatiza tareas y ahorra tiempo</p>
          <p className="mt-1 text-xs text-blue-100">
            Pronto podrás generar contratos y reportes desde la plataforma.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-4 px-6 py-4">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-sm">
            <IconSearch className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Buscar por cliente, N° de venta, DNI, RUC..."
              value={search}
            />
          </label>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-500 shadow-sm">
            <IconBell className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="flex items-center gap-3 rounded-full bg-white py-1.5 pl-1.5 pr-3 shadow-sm"
            onClick={() => setProfileOpen(true)}
          >
            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
              {initials(user)}
            </div>
            <div className="text-left leading-tight">
              <p className="text-sm font-semibold">{displayName(user)}</p>
              <p className="text-xs text-slate-500">{roleLabel(user)}</p>
            </div>
          </button>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => logout()}>
            Salir
          </button>
        </header>
        <main className="flex-1 px-6 pb-8">{children}</main>
      </div>
      {profileOpen ? <ProfileModal onClose={() => setProfileOpen(false)} user={user} /> : null}
    </div>
  )
}
