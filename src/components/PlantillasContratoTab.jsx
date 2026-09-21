import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { downloadPlantillaContrato, getPlantillasContrato, uploadPlantillaContrato } from '../service/api.js'
import { displayName } from '../lib/auth.js'
import { formatFecha } from '../lib/venta.js'
import { useAuth } from '../context/AuthContext.jsx'

function formatBytes(n) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function PlantillasContratoTab({ onError, onOk }) {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const inputsRef = useRef({})
  const [uploading, setUploading] = useState('')
  const canChange = can('api.change_plantillacontrato') || can('api.add_plantillacontrato')

  const query = useQuery({
    queryKey: ['plantillas-contrato'],
    queryFn: getPlantillasContrato,
  })
  const plantillas = query.data ?? []

  const uploadMutation = useMutation({
    mutationFn: ({ clave, file }) => uploadPlantillaContrato(clave, file),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['plantillas-contrato'] })
      onOk(`Se actualizó “${item.etiqueta}”.`)
    },
    onError: (err) => onError(err.message),
    onSettled: () => setUploading(''),
  })

  const downloadMutation = useMutation({
    mutationFn: (item) => downloadPlantillaContrato(item.clave, item.nombre_archivo || item.archivo),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    },
    onError: (err) => onError(err.message),
  })

  const grupos = [...new Set(plantillas.map((item) => item.grupo))]

  return (
    <section className="space-y-4">
      <div className="bo-card p-4 sm:p-5">
        <h2 className="mb-1 font-semibold">Plantillas Entel</h2>
        <p className="text-sm text-slate-500">
          Se guardan en la base de datos, así que el despliegue no depende de una carpeta local. Si
          Entel cambia el formato, reemplaza el archivo de esa plantilla. No hace falta que el
          nombre coincida: el sistema lo asocia al tipo correcto.
        </p>
      </div>
      {query.isPending ? (
        <p className="text-sm text-slate-500">Cargando plantillas...</p>
      ) : query.isError ? (
        <div className="alert alert-error">
          <span>{query.error.message}</span>
        </div>
      ) : (
        grupos.map((grupo) => (
          <section key={grupo} className="bo-card bo-table-wrap p-4 sm:p-5">
            <h3 className="mb-3 font-semibold">{grupo}</h3>
            <table className="table table-sm sm:table-md">
              <thead>
                <tr className="text-slate-400">
                  <th>Plantilla</th>
                  <th>Estado</th>
                  <th>Actualizada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {plantillas
                  .filter((item) => item.grupo === grupo)
                  .map((item) => (
                    <tr key={item.clave}>
                      <td>
                        <p className="font-medium">{item.etiqueta}</p>
                        <p className="text-xs text-slate-500">{item.descripcion}</p>
                      </td>
                      <td>
                        {item.cargada ? (
                          <span className="badge badge-ghost whitespace-nowrap border-emerald-200 bg-emerald-50 text-emerald-700">
                            Cargada{item.tamano ? ` · ${formatBytes(item.tamano)}` : ''}
                          </span>
                        ) : (
                          <span
                            className={`badge badge-ghost ${
                              item.requerida
                                ? 'border-amber-200 bg-amber-50 text-amber-800'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.requerida ? 'Falta' : 'Opcional'}
                          </span>
                        )}
                      </td>
                      <td className="text-sm text-slate-500">
                        {item.cargada ? (
                          <>
                            {formatFecha(item.actualizado)}
                            {item.actualizado_por
                              ? ` · ${displayName(item.actualizado_por)}`
                              : ''}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="text-right">
                        {item.cargada ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            disabled={downloadMutation.isPending}
                            onClick={() => downloadMutation.mutate(item)}
                          >
                            Descargar
                          </button>
                        ) : null}
                        {canChange ? (
                          <>
                            <input
                              ref={(node) => {
                                inputsRef.current[item.clave] = node
                              }}
                              accept={item.acepta.join(',')}
                              className="hidden"
                              type="file"
                              onChange={(event) => {
                                const file = event.target.files?.[0]
                                event.target.value = ''
                                if (!file) return
                                setUploading(item.clave)
                                uploadMutation.mutate({ clave: item.clave, file })
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              disabled={Boolean(uploading)}
                              onClick={() => inputsRef.current[item.clave]?.click()}
                            >
                              {uploading === item.clave
                                ? 'Subiendo…'
                                : item.cargada
                                  ? 'Reemplazar'
                                  : 'Cargar'}
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        ))
      )}
    </section>
  )
}
