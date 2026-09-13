import VentasTable from '../components/VentasTable.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function VentasPage({ ventas, isPending, onOpen, onDelete, onNavigate }) {
  const { can } = useAuth()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          <p className="text-sm text-slate-500">Seguimiento de todas las ventas registradas.</p>
        </div>
        {can('api.add_venta') ? (
          <button type="button" className="btn rounded-full border-none bg-blue-600 text-white hover:bg-blue-700" onClick={() => onNavigate({ page: 'venta-nueva' })}>
            Nueva venta
          </button>
        ) : null}
      </div>
      <section className="bo-card p-5">
        <VentasTable isPending={isPending} onDelete={onDelete} onOpen={onOpen} ventas={ventas} />
      </section>
    </div>
  )
}
