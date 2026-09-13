import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteCliente, getClientes } from '../service/api.js'
import { celularCliente, documentoCliente, nombreCliente, tipoClienteLabel } from '../lib/venta.js'
import { useAuth } from '../context/AuthContext.jsx'
import Modal from '../components/Modal.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'

export default function ClientesPage({ search }) {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const { isPending, isError, error, data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: getClientes,
  })
  const canDelete = can('api.delete_cliente')
  const deleteMutation = useMutation({
    mutationFn: deleteCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      setSelected(null)
      setToDelete(null)
    },
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isPending ? (
                <tr>
                  <td colSpan={5}>Cargando clientes...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>No hay clientes para mostrar.</td>
                </tr>
              ) : (
                filtered.map((cliente) => (
                  <tr key={cliente.id}>
                    <td className="font-medium">{nombreCliente(cliente)}</td>
                    <td>{tipoClienteLabel(cliente.tipo)}</td>
                    <td>{documentoCliente(cliente) || '—'}</td>
                    <td>{celularCliente(cliente) || '—'}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => setSelected(cliente)}
                      >
                        Ver
                      </button>
                      {canDelete ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-rose-600"
                          disabled={deleteMutation.isPending}
                          onClick={() => setToDelete(cliente)}
                        >
                          Eliminar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}

      {selected ? (
        <ClienteModal
          canDelete={canDelete}
          cliente={selected}
          deleting={deleteMutation.isPending}
          onClose={() => setSelected(null)}
          onDelete={() => setToDelete(selected)}
        />
      ) : null}
      {toDelete ? (
        <ConfirmModal
          open
          title="Eliminar cliente"
          message={`¿Eliminar a ${nombreCliente(toDelete)}? No se puede si tiene ventas. Esta acción no se puede deshacer.`}
          onCancel={() => setToDelete(null)}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          pending={deleteMutation.isPending}
        />
      ) : null}
    </div>
  )
}

function ClienteModal({ cliente, canDelete, deleting, onClose, onDelete }) {
  const persona = cliente.persona
  const empresa = cliente.empresa
  const representante = empresa?.representante_legal_detalle
  const direccion = cliente.direcciones?.[0]
  return (
    <Modal
      open
      title={nombreCliente(cliente)}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          {canDelete ? (
            <button
              type="button"
              className="btn btn-ghost text-rose-600"
              disabled={deleting}
              onClick={onDelete}
            >
              Eliminar
            </button>
          ) : null}
        </>
      }
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-slate-400">Tipo</dt>
          <dd>{tipoClienteLabel(cliente.tipo)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Documento</dt>
          <dd>{documentoCliente(cliente) || '—'}</dd>
        </div>
        {persona ? (
          <>
            <div>
              <dt className="text-slate-400">Nombres</dt>
              <dd>{persona.nombres}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Apellidos</dt>
              <dd>{persona.apellidos}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Celular</dt>
              <dd>{persona.celular || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Distrito de nacimiento</dt>
              <dd>{persona.distrito_nacimiento || '—'}</dd>
            </div>
          </>
        ) : null}
        {empresa ? (
          <>
            <div>
              <dt className="text-slate-400">RUC</dt>
              <dd>{empresa.ruc}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Razón social</dt>
              <dd>{empresa.razon_social}</dd>
            </div>
          </>
        ) : null}
        {representante ? (
          <div className="col-span-2">
            <dt className="text-slate-400">Representante legal</dt>
            <dd>
              {representante.nombres} {representante.apellidos} · {representante.tipo_documento}{' '}
              {representante.numero_documento}
            </dd>
          </div>
        ) : null}
        <div className="col-span-2">
          <dt className="text-slate-400">Dirección</dt>
          <dd>
            {direccion
              ? `${direccion.tipo} ${direccion.direccion} ${direccion.numero}, ${direccion.distrito}`
              : 'Sin dirección'}
          </dd>
        </div>
      </dl>
    </Modal>
  )
}
