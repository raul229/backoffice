import { useQuery } from '@tanstack/react-query'
import { getClientes } from '../service/api.js'
import { documentoCliente, nombreCliente, tipoClienteLabel } from '../lib/venta.js'

export default function ClientesPage({ search }) {
  const { isPending, isError, error, data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: getClientes,
  })

  const filtered = (clientes ?? []).filter((cliente) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return `${nombreCliente(cliente)} ${documentoCliente(cliente)} ${cliente.tipo}`
      .toLowerCase()
      .includes(q)
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-slate-500">Clientes persona natural y jurídica registrados.</p>
      </div>

      {isError ? (
        <div className="alert alert-error">
          <span>{error.message}</span>
        </div>
      ) : (
        <section className="bo-card overflow-x-auto p-5">
          <table className="table">
            <thead>
              <tr className="text-slate-400">
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Documento</th>
                <th>Contacto</th>
              </tr>
            </thead>
            <tbody>
              {isPending ? (
                <tr>
                  <td colSpan={4}>Cargando clientes...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4}>No hay clientes para mostrar.</td>
                </tr>
              ) : (
                filtered.map((cliente) => (
                  <tr key={cliente.id}>
                    <td className="font-medium">{nombreCliente(cliente)}</td>
                    <td>{tipoClienteLabel(cliente.tipo)}</td>
                    <td>{documentoCliente(cliente) || '—'}</td>
                    <td>{cliente.persona?.celular || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
