import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteCliente, getClientes } from '../service/api.js'
import { celularCliente, documentoCliente, nombreCliente, tipoClienteLabel } from '../lib/venta.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function ClientesPage({ search }) {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const { isPending, isError, error, data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: getClientes,
  })
  const canDelete = can('api.delete_cliente')
  const deleteMutation = useMutation({
    mutationFn: deleteCliente,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clientes'] }),
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

      {deleteMutation.isError ? (
        <div className="alert alert-error">
          <span>{deleteMutation.error.message}</span>
        </div>
      ) : null}

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
                {canDelete ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {isPending ? (
                <tr>
                  <td colSpan={canDelete ? 5 : 4}>Cargando clientes...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 5 : 4}>No hay clientes para mostrar.</td>
                </tr>
              ) : (
                filtered.map((cliente) => (
                  <tr key={cliente.id}>
                    <td className="font-medium">{nombreCliente(cliente)}</td>
                    <td>{tipoClienteLabel(cliente.tipo)}</td>
                    <td>{documentoCliente(cliente) || '—'}</td>
                    <td>{celularCliente(cliente) || '—'}</td>
                    {canDelete ? (
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-rose-600"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `¿Eliminar a ${nombreCliente(cliente)}? No se puede si tiene ventas.`,
                              )
                            ) {
                              deleteMutation.mutate(cliente.id)
                            }
                          }}
                        >
                          Eliminar
                        </button>
                      </td>
                    ) : null}
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
