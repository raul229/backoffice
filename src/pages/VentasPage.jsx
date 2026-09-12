import VentasTable from '../components/VentasTable.jsx'

export default function VentasPage({ ventas, isPending, onOpen, onNavigate }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          <p className="text-sm text-slate-500">Seguimiento de todas las ventas registradas.</p>
        </div>
        <button type="button" className="btn rounded-full border-none bg-blue-600 text-white hover:bg-blue-700" onClick={() => onNavigate({ page: 'venta-nueva' })}>
          Nueva venta
        </button>
      </div>
      <section className="bo-card p-5">
        <VentasTable isPending={isPending} onOpen={onOpen} ventas={ventas} />
      </section>
    </div>
  )
}
