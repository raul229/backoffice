import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconAlert, IconCheck, IconClock } from '../lib/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { displayName } from '../lib/auth.js'
import {
  getAsesores,
  getChoices,
  getFlujoPasos,
  getReporteVentas,
} from '../service/api.js'

const ESTADOS_VENTA = [
  { value: 'EN_PROCESO', label: 'En proceso' },
  { value: 'INSTALADO', label: 'Instalado' },
  { value: 'ANULADO', label: 'Anulado' },
]

function mesActualInput() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${m}`
}

function deltaLabel(deltaPct) {
  if (deltaPct === 0) return 'Igual al mes anterior'
  const sign = deltaPct > 0 ? '+' : ''
  return `${sign}${deltaPct}% vs mes anterior`
}

function KpiCard({ icon: Icon, color, kpi, label }) {
  return (
    <article className="bo-card flex items-center gap-4 p-4">
      <span className="bo-kpi-icon" style={{ background: color }}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-bold leading-none">{kpi?.valor ?? '—'}</p>
        <p className="mt-1 text-sm text-slate-500">{label}</p>
        {kpi ? (
          <p className={`mt-1 text-xs ${kpi.delta_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {deltaLabel(kpi.delta_pct)} ({kpi.mes_anterior} mes ant.)
          </p>
        ) : null}
      </div>
    </article>
  )
}

function SerieInstalaciones({ serie }) {
  if (!serie?.length) return null
  const max = Math.max(
    1,
    ...serie.flatMap((row) => [row.instalaciones, row.instalaciones_mes_anterior]),
  )
  return (
    <div className="bo-card p-4 sm:p-5">
      <h2 className="mb-1 font-semibold">Instalaciones por día</h2>
      <p className="mb-4 text-xs text-slate-500">
        Barras: mes seleccionado. Línea tenue: mismo día del mes anterior.
      </p>
      <div className="flex items-end gap-0.5 overflow-x-auto pb-2" style={{ minHeight: 160 }}>
        {serie.map((row) => (
          <div key={row.dia} className="flex min-w-[14px] flex-1 flex-col items-center gap-1">
            <div className="relative flex h-28 w-full items-end justify-center gap-px">
              <div
                className="w-[45%] rounded-t bg-blue-500"
                style={{ height: `${(row.instalaciones / max) * 100}%`, minHeight: row.instalaciones ? 4 : 0 }}
                title={`Día ${row.dia}: ${row.instalaciones}`}
              />
              <div
                className="w-[45%] rounded-t bg-slate-300"
                style={{
                  height: `${(row.instalaciones_mes_anterior / max) * 100}%`,
                  minHeight: row.instalaciones_mes_anterior ? 4 : 0,
                }}
                title={`Mes ant. día ${row.dia}: ${row.instalaciones_mes_anterior}`}
              />
            </div>
            <span className="text-[10px] text-slate-400">{row.dia}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded bg-blue-500" /> Mes actual
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded bg-slate-300" /> Mes anterior
        </span>
      </div>
    </div>
  )
}

function MultiCheck({ label, options, selected, onChange }) {
  return (
    <fieldset className="mb-3 text-sm">
      <legend className="mb-1 text-slate-500">{label}</legend>
      <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
        {options.map((opt) => {
          const checked = selected.includes(opt.value)
          return (
            <label
              key={opt.value}
              className={`cursor-pointer rounded-full px-2 py-1 text-xs ${
                checked ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <input
                className="sr-only"
                type="checkbox"
                checked={checked}
                onChange={() => {
                  if (checked) onChange(selected.filter((v) => v !== opt.value))
                  else onChange([...selected, opt.value])
                }}
              />
              {opt.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function ReportesPage() {
  const { can } = useAuth()
  const [mes, setMes] = useState(mesActualInput)
  const [estados, setEstados] = useState([])
  const [pasoEstados, setPasoEstados] = useState([])
  const [flujoPasos, setFlujoPasos] = useState([])
  const [creadoPor, setCreadoPor] = useState('')

  const params = useMemo(
    () => ({
      mes,
      estado: estados,
      paso_estado: pasoEstados,
      flujo_paso: flujoPasos,
      creado_por: creadoPor || undefined,
    }),
    [mes, estados, pasoEstados, flujoPasos, creadoPor],
  )

  const reporteQuery = useQuery({
    queryKey: ['reporte-ventas', params],
    queryFn: () => getReporteVentas(params),
  })

  const choicesQuery = useQuery({ queryKey: ['choices'], queryFn: getChoices })
  const flujoPasosQuery = useQuery({ queryKey: ['flujo-pasos'], queryFn: getFlujoPasos })
  const asesoresQuery = useQuery({
    queryKey: ['asesores'],
    queryFn: getAsesores,
    enabled: can('api.reasignar_venta') || can('api.view_all_ventas'),
  })

  const pasoOptions = (choicesQuery.data?.estados_paso ?? []).map((item) => ({
    value: item.value,
    label: item.label,
  }))

  const flujoPasosLista = Array.isArray(flujoPasosQuery.data)
    ? flujoPasosQuery.data
    : (flujoPasosQuery.data?.results ?? [])
  const flujoPasoOptions = flujoPasosLista.map((fp) => ({
    value: String(fp.id),
    label: `${fp.paso_detalle?.nombre ?? 'Paso'} (orden ${fp.orden})`,
  }))

  const data = reporteQuery.data
  const kpis = data?.kpis

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-blue-600 sm:text-2xl">Reportes</h1>
        <p className="text-sm text-slate-500">
          Avance de ventas e instalaciones. Las instaladas se cuentan por{' '}
          <span className="font-medium">fecha de instalación</span>, no por alta en sistema.
        </p>
      </div>

      {reporteQuery.isError ? (
        <div className="alert alert-error">
          <span>{reporteQuery.error?.message || 'No se pudo cargar el reporte.'}</span>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="grid gap-4 md:grid-cols-3">
            <KpiCard
              icon={IconCheck}
              color="#22c55e"
              kpi={reporteQuery.isPending ? null : kpis?.instaladas}
              label="Instaladas (mes)"
            />
            <KpiCard
              icon={IconClock}
              color="#3b82f6"
              kpi={reporteQuery.isPending ? null : kpis?.en_proceso}
              label="En proceso (registradas en el mes)"
            />
            <KpiCard
              icon={IconAlert}
              color="#ef4444"
              kpi={reporteQuery.isPending ? null : kpis?.anuladas}
              label="Anuladas (mes)"
            />
          </section>

          <SerieInstalaciones serie={data?.serie_instalaciones} />
        </div>

        <aside className="bo-card p-4 sm:p-5">
          <h2 className="mb-4 font-semibold">Filtros</h2>

          <label className="mb-3 block text-sm">
            <span className="mb-1 block text-slate-500">Mes</span>
            <input
              className="input input-bordered w-full"
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
            />
          </label>

          {data?.puede_filtrar_asesor && asesoresQuery.data?.length ? (
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-slate-500">Asesor / vendedor</span>
              <select
                className="select select-bordered w-full"
                value={creadoPor}
                onChange={(e) => setCreadoPor(e.target.value)}
              >
                <option value="">Todos (según permiso)</option>
                {asesoresQuery.data.map((asesor) => (
                  <option key={asesor.id} value={asesor.id}>
                    {displayName(asesor)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <MultiCheck label="Estado de venta" options={ESTADOS_VENTA} selected={estados} onChange={setEstados} />

          {flujoPasoOptions.length ? (
            <MultiCheck
              label="Pasos del flujo (ventas que pasan por…)"
              options={flujoPasoOptions}
              selected={flujoPasos}
              onChange={setFlujoPasos}
            />
          ) : null}

          {pasoOptions.length ? (
            <MultiCheck
              label="Estado del paso (en algún paso de la venta)"
              options={pasoOptions}
              selected={pasoEstados}
              onChange={setPasoEstados}
            />
          ) : null}

          <button
            type="button"
            className="btn btn-ghost btn-sm mt-2"
            onClick={() => {
              setEstados([])
              setPasoEstados([])
              setFlujoPasos([])
              setCreadoPor('')
              setMes(mesActualInput())
            }}
          >
            Limpiar filtros
          </button>

          {data?.periodo ? (
            <p className="mt-4 text-xs text-slate-400">
              Periodo: {data.periodo.desde} — {data.periodo.hasta}
              <br />
              Comparado con: {data.periodo.mes_anterior_desde} — {data.periodo.mes_anterior_hasta}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
