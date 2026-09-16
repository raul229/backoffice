import { useState } from 'react'
import {
  IconBell,
  IconBolt,
  IconCart,
  IconChart,
  IconClose,
  IconCog,
  IconHome,
  IconLock,
  IconMenu,
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
  const [menuOpen, setMenuOpen] = useState(false)
  const nav = NAV.filter((item) => can(item.permission))

  const go = (route) => {
    onNavigate(route)
    setMenuOpen(false)
  }

  return (
    <div className="flex min-h-dvh">
      {menuOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        className={`bo-sidebar fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] shrink-0 flex-col px-4 py-5 text-white transition-transform duration-200 lg:static lg:w-60 lg:max-w-none lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500">
              <IconBolt className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-semibold">Back Office</span>
          </div>
          <button
            type="button"
            aria-label="Cerrar menú"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10 lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <IconClose className="h-5 w-5" />
          </button>
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
                onClick={() => go({ page: item.id })}
              >
                <Icon className="h-5 w-5 shrink-0" />
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
        <header className="flex flex-wrap items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label="Abrir menú"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-slate-600 shadow-sm lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <label className="order-last flex min-w-0 w-full items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-sm sm:order-none sm:flex-1">
            <IconSearch className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              className="w-full min-w-0 bg-transparent text-sm outline-none"
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Cliente, venta, PSI, SIRO, orden..."
              value={search}
            />
          </label>
          <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-slate-500 shadow-sm">
            <IconBell className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="flex min-w-0 items-center gap-3 rounded-full bg-white py-1.5 pl-1.5 pr-2 shadow-sm sm:pr-3"
            onClick={() => setProfileOpen(true)}
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
              {initials(user)}
            </div>
            <div className="hidden text-left leading-tight sm:block">
              <p className="max-w-[10rem] truncate text-sm font-semibold">{displayName(user)}</p>
              <p className="text-xs text-slate-500">{roleLabel(user)}</p>
            </div>
          </button>
          <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => logout()}>
            Salir
          </button>
        </header>
        <main className="flex-1 px-3 pb-8 sm:px-6">{children}</main>
      </div>
      {profileOpen ? <ProfileModal onClose={() => setProfileOpen(false)} user={user} /> : null}
    </div>
  )
}
