import { IconAlert, IconCalendar, IconCheck, IconClock } from '../lib/icons.jsx'
import { computeKpis } from '../lib/venta.js'
import VentasTable from '../components/VentasTable.jsx'
import MultiCheck from '../components/MultiCheck.jsx'

const ESTADOS_VENTA_FILTRO = [
  { value: 'EN_PROCESO', label: 'En proceso' },
  { value: 'INSTALADO', label: 'Instalado' },
  { value: 'ANULADO', label: 'Anulado' },
  { value: 'OBSERVACION', label: 'En observación' },
]
import { useAuth } from '../context/AuthContext.jsx'
import { displayName } from '../lib/auth.js'

function KpiCard({ icon: Icon, color, value, label, hint }) {
  return (
    <article className="bo-card flex items-center gap-4 p-4">
      <span className="bo-kpi-icon" style={{ background: color }}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-sm text-slate-500">{label}</p>
        {hint ? <p className="mt-1 text-xs text-emerald-600">{hint}</p> : null}
      </div>
    </article>
  )
}

function deltaLabel(value, suffix) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}% ${suffix}`
}

export default function DashboardPage({
  ventas,
  filtered,
  isPending,
  isError,
  error,
  filters,
  onFilters,
  onOpen,
  onNavigate,
  onDelete,
}) {
  const { user, can } = useAuth()
  const kpis = computeKpis(ventas)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-blue-600 sm:text-2xl">¡Hola, {user?.first_name || displayName(user)}!</h1>
          <p className="text-sm text-slate-500">
            Aquí tienes el resumen de tus ventas y el estado actual del proceso.
          </p>
        </div>
        {can('api.add_venta') ? (
          <button type="button" className="btn w-full rounded-full border-none bg-blue-600 text-white hover:bg-blue-700 sm:w-auto" onClick={() => onNavigate({ page: 'venta-nueva' })}>
            Nueva venta
          </button>
        ) : null}
      </div>

      {isError ? (
        <div className="alert alert-error">
          <span>{error.message}</span>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={IconCalendar}
          color="#3b82f6"
          value={isPending ? '—' : kpis.delMes}
          label="Ventas del mes"
          hint={deltaLabel(kpis.deltaMes, 'vs. mes anterior')}
        />
        <KpiCard
          icon={IconCheck}
          color="#22c55e"
          value={isPending ? '—' : kpis.hoy}
          label="Ventas hoy"
          hint={deltaLabel(kpis.deltaHoy, 'vs. ayer')}
        />
        <KpiCard
          icon={IconClock}
          color="#8b5cf6"
          value={isPending ? '—' : kpis.tiempoPromedio}
          label="Tiempo promedio por venta"
          hint="Desde el registro hasta hoy"
        />
        <KpiCard
          icon={IconAlert}
          color="#f59e0b"
          value={isPending ? '—' : kpis.observacion}
          label="Ventas en observación"
          hint={`${kpis.deltaObservacion >= 0 ? '+' : ''}${kpis.deltaObservacion} vs. ayer`}
        />
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[1fr_280px]">
        <section className="bo-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Ventas recientes</h2>
            <button
              type="button"
              className="text-sm text-blue-600"
              onClick={() => onNavigate({ page: 'ventas' })}
            >
              Ver todas
            </button>
          </div>
          <VentasTable
            emptyLabel="No hay ventas con esos filtros."
            isPending={isPending}
            limit={6}
            onDelete={onDelete}
            onOpen={onOpen}
            showAsesor={can('api.view_all_ventas')}
            ventas={filtered}
          />
        </section>

        <aside
          className="bo-card p-4 sm:p-5"
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.preventDefault()
            onFilters({ search: '', estado: [], desde: '', hasta: '' })
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Filtros</h2>
            <button
              type="button"
              className="text-xs text-blue-600"
              onClick={() =>
                onFilters({ search: '', estado: [], desde: '', hasta: '' })
              }
            >
              Limpiar filtros
            </button>
          </div>

          <label className="mb-3 block text-sm">
            <span className="mb-1 block text-slate-500">Buscar</span>
            <input
              className="input input-bordered w-full"
              onChange={(event) => onFilters({ ...filters, search: event.target.value })}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return
                event.preventDefault()
                onFilters({ ...filters, search: '' })
              }}
              placeholder="Venta, cliente, asesor, PSI, SIRO, orden..."
              value={filters.search}
            />
          </label>

          <MultiCheck
            label="Estado (vacío = todos)"
            options={ESTADOS_VENTA_FILTRO}
            selected={Array.isArray(filters.estado) ? filters.estado : []}
            onChange={(estado) => onFilters({ ...filters, estado })}
          />

          <div className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-slate-500">Desde</span>
              <input
                className="input input-bordered w-full"
                onChange={(event) => onFilters({ ...filters, desde: event.target.value })}
                type="date"
                value={filters.desde}
              />
            </label>
            <label>
              <span className="mb-1 block text-slate-500">Hasta</span>
              <input
                className="input input-bordered w-full"
                onChange={(event) => onFilters({ ...filters, hasta: event.target.value })}
                type="date"
                value={filters.hasta}
              />
            </label>
          </div>

          <button type="button" className="btn w-full rounded-full border-none bg-blue-600 text-white hover:bg-blue-700">
            Aplicar filtros
          </button>
        </aside>
      </div>
    </div>
  )
}
