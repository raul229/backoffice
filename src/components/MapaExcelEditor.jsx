import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CAMPOS_CONTRATO_GRUPOS,
  TRANSFORMACIONES,
  campoVacio,
  etiquetaCampo,
  nombreCampoUnico,
} from '../lib/documento.js'
import { getVistaExcel } from '../service/api.js'

function celdaValida(valor) {
  return /^[A-Z]{1,3}[1-9]\d{0,6}$/.test(String(valor || '').trim().toUpperCase().replaceAll('$', ''))
}

function normalizarCelda(valor) {
  return String(valor || '').trim().toUpperCase().replaceAll('$', '')
}

function cubiertasDeCombinadas(combinadas = [], columnas = []) {
  const cubiertas = new Set()
  const porOrigen = {}
  combinadas.forEach((item) => {
    porOrigen[item.celda] = item
    const col = item.celda.replace(/\d+$/, '')
    const fila = Number(item.celda.replace(/^[A-Z]+/i, ''))
    const origen = columnas.indexOf(col)
    if (origen < 0) return
    for (let r = 0; r < item.filas; r += 1) {
      for (let c = 0; c < item.cols; c += 1) {
        if (r === 0 && c === 0) continue
        const letra = columnas[origen + c]
        if (letra) cubiertas.add(`${letra}${fila + r}`)
      }
    }
  })
  return { cubiertas, porOrigen }
}

function estiloVista(estilo = {}, col, fila, hoja, puesto, elegido, activo) {
  const css = {
    minWidth: hoja.anchos?.[col] ? `${hoja.anchos[col]}px` : '4.5rem',
    height: hoja.altos?.[String(fila)] ? `${hoja.altos[String(fila)]}px` : undefined,
    backgroundColor: estilo.fondo,
    color: estilo.color,
    fontWeight: estilo.negrita ? 700 : undefined,
    fontStyle: estilo.italic ? 'italic' : undefined,
    textAlign: estilo.alinear || 'left',
    whiteSpace: estilo.wrap ? 'normal' : 'nowrap',
    borderColor: estilo.borde ? '#94a3b8' : undefined,
  }
  if (elegido) {
    css.backgroundColor = '#2563eb'
    css.color = '#fff'
  } else if (activo) {
    css.backgroundColor = '#fde68a'
  } else if (puesto) {
    css.boxShadow = 'inset 0 0 0 2px #3b82f6'
  }
  return css
}

export default function MapaExcelEditor({
  campos = [],
  onChange,
  documento,
  onUpload,
  uploading = false,
  onError,
}) {
  const fileRef = useRef(null)
  const [vista, setVista] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [hoja, setHoja] = useState('')
  const [pending, setPending] = useState(null)
  const [selected, setSelected] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [fijo, setFijo] = useState('')
  const [celdaManual, setCeldaManual] = useState('')
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    if (!documento?.cargada) {
      setVista(null)
      return undefined
    }
    let vivo = true
    setCargando(true)
    getVistaExcel(documento.clave)
      .then((data) => {
        if (!vivo) return
        setVista(data)
        const primera = data?.hojas?.[0]?.nombre || ''
        setHoja((actual) =>
          data?.hojas?.some((item) => item.nombre === actual) ? actual : primera,
        )
      })
      .catch((err) => onErrorRef.current?.(err.message))
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
    }
  }, [documento?.clave, documento?.cargada, documento?.actualizado, documento?.archivo])

  const hojasDoc = vista?.hojas?.map((item) => item.nombre) || documento?.hojas || []
  const hojaActual = vista?.hojas?.find((item) => item.nombre === hoja) || vista?.hojas?.[0]
  const nombreHoja = hojaActual?.nombre || hoja || hojasDoc[0] || ''

  const deEstaHoja = useMemo(
    () =>
      campos
        .map((campo, index) => ({ campo, index }))
        .filter(({ campo }) => (campo.hoja || nombreHoja) === nombreHoja),
    [campos, nombreHoja],
  )

  const porCelda = useMemo(() => {
    const mapa = {}
    deEstaHoja.forEach(({ campo, index }) => {
      const celda = normalizarCelda(campo.celda)
      if (celda) mapa[celda] = { campo, index }
    })
    return mapa
  }, [deEstaHoja])
  const { cubiertas, porOrigen } = useMemo(
    () => cubiertasDeCombinadas(hojaActual?.combinadas, hojaActual?.columnas),
    [hojaActual],
  )

  const gruposFiltrados = CAMPOS_CONTRATO_GRUPOS.map((grupo) => ({
    ...grupo,
    campos: grupo.campos.filter((campo) => {
      const q = busqueda.trim().toLowerCase()
      if (!q) return true
      return `${campo.label} ${campo.value}`.toLowerCase().includes(q)
    }),
  })).filter((grupo) => grupo.campos.length)

  const colocar = (extra) => {
    if (!pending) return
    const base = extra.nombre || extra.field || extra.transform || 'TEXTO'
    const siguiente = {
      ...campoVacio(),
      pagina: 0,
      hoja: pending.hoja,
      celda: pending.celda,
      nombre: extra.nombre || nombreCampoUnico(campos, base, 0),
      field: extra.field || extra.nombre || '',
      value: extra.value || '',
      transform: extra.transform || '',
    }
    onChange([...campos, siguiente])
    setPending(null)
    setSelected(campos.length)
    setBusqueda('')
    setFijo('')
  }

  const parche = (index, cambios) => {
    onChange(campos.map((campo, current) => (current === index ? { ...campo, ...cambios } : campo)))
  }

  const aceptarCeldaManual = () => {
    const celda = normalizarCelda(celdaManual)
    if (!celdaValida(celda) || !nombreHoja) return
    setCeldaManual('')
    setSelected(null)
    setPending({ hoja: nombreHoja, celda })
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-500">
            Clic en una celda y elige el dato, o escribe el id (por ejemplo F7) y pulsa Usar. Al
            generar se conserva el formato de Office; aquí se ven colores, combinadas y negritas.
          </p>
          <div className="flex items-center gap-1">
            {hojasDoc.length > 1
              ? hojasDoc.map((nombre) => (
                  <button
                    key={nombre}
                    type="button"
                    className={`btn btn-xs ${nombre === nombreHoja ? 'btn-neutral' : 'btn-ghost'}`}
                    onClick={() => {
                      setHoja(nombre)
                      setPending(null)
                    }}
                  >
                    {nombre}
                  </button>
                ))
              : null}
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? 'Subiendo…' : documento?.cargada ? 'Cambiar Excel' : 'Cargar Excel'}
            </button>
            <input
              ref={fileRef}
              accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
              className="hidden"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) onUpload?.(file)
              }}
            />
          </div>
        </div>
        <div className="mb-2 flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-500">
            Id de celda
            <input
              className="input input-bordered input-xs mt-0.5 w-24 uppercase"
              placeholder="F7"
              value={celdaManual}
              onChange={(event) => setCeldaManual(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  aceptarCeldaManual()
                }
              }}
            />
          </label>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            disabled={!celdaValida(celdaManual) || !nombreHoja}
            onClick={aceptarCeldaManual}
          >
            Usar
          </button>
        </div>
        <div className="max-h-[min(70dvh,42rem)] overflow-auto rounded-lg border border-slate-200 bg-white">
          {!documento?.cargada ? (
            <p className="p-6 text-sm text-slate-500">Carga el Excel para ver las celdas.</p>
          ) : cargando || !hojaActual ? (
            <p className="p-6 text-sm text-slate-500">Cargando hoja…</p>
          ) : (
            <table className="min-w-full border-collapse text-[11px] leading-tight">
              <thead>
                <tr>
                    <th className="sticky top-0 left-0 z-20 bg-slate-100 px-1 py-1 text-left font-normal text-slate-400">
                    {nombreHoja}
                  </th>
                  {hojaActual.columnas.map((col) => (
                    <th
                      key={col}
                      className="sticky top-0 z-10 bg-slate-100 px-1 py-1 text-center font-normal text-slate-500"
                      style={{ minWidth: hojaActual.anchos?.[col] ? `${hojaActual.anchos[col]}px` : undefined }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hojaActual.filas.map((fila) => (
                  <tr key={fila}>
                    <th className="sticky left-0 z-10 bg-slate-50 px-1 py-0.5 text-right font-normal text-slate-400">
                      {fila}
                    </th>
                    {hojaActual.columnas.map((col) => {
                      const celda = `${col}${fila}`
                      if (cubiertas.has(celda)) return null
                      const merge = porOrigen[celda]
                      const puesto = porCelda[celda]
                      const activo = pending?.celda === celda && pending?.hoja === nombreHoja
                      const elegido = puesto && selected === puesto.index
                      const estilo = hojaActual.estilos?.[celda] || {}
                      return (
                        <td
                          key={celda}
                          className="p-0"
                          colSpan={merge?.cols}
                          rowSpan={merge?.filas}
                        >
                          <button
                            type="button"
                            title={celda}
                            className="block h-full min-h-7 w-full overflow-hidden border border-slate-200 px-1 py-0.5"
                            style={estiloVista(estilo, col, fila, hojaActual, puesto, elegido, activo)}
                            onClick={() => {
                              if (puesto) {
                                setSelected(puesto.index)
                                setPending(null)
                                return
                              }
                              if (selected != null) {
                                parche(selected, { hoja: nombreHoja, celda })
                                return
                              }
                              setPending({ hoja: nombreHoja, celda })
                            }}
                          >
                            {puesto
                              ? etiquetaCampo(puesto.campo, campos)
                              : hojaActual.valores?.[celda] || '\u00a0'}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <aside className="space-y-3">
        {pending ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="mb-2 text-sm font-medium">
              ¿Qué dato va en {pending.hoja}!{pending.celda}?
            </p>
            <input
              className="input input-bordered input-sm mb-2 w-full"
              placeholder="Buscar…"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
            />
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {gruposFiltrados.map((grupo) => (
                <div key={grupo.grupo}>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {grupo.grupo}
                  </p>
                  <div className="flex flex-col gap-1">
                    {grupo.campos.map((campo) => (
                      <button
                        key={campo.value}
                        type="button"
                        className="btn btn-ghost btn-xs justify-start font-normal"
                        onClick={() => colocar({ nombre: campo.value, field: campo.value })}
                      >
                        {campo.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <label className="mt-2 block text-xs text-slate-500">
              Texto fijo
              <span className="mt-1 flex gap-1">
                <input
                  className="input input-bordered input-xs flex-1"
                  value={fijo}
                  onChange={(event) => setFijo(event.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  disabled={!fijo.trim()}
                  onClick={() =>
                    colocar({
                      nombre: nombreCampoUnico(campos, 'TEXTO', 0),
                      value: fijo.trim(),
                    })
                  }
                >
                  Poner
                </button>
              </span>
            </label>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-slate-500">Fórmulas</summary>
              <div className="mt-1 flex flex-col gap-1">
                {TRANSFORMACIONES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className="btn btn-ghost btn-xs justify-start font-normal"
                    onClick={() => colocar({ nombre: item.value, transform: item.value })}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </details>
            <button type="button" className="btn btn-ghost btn-xs mt-2" onClick={() => setPending(null)}>
              Cancelar
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Clic en una celda para colocar un dato. Si ya hay uno seleccionado, el siguiente clic lo mueve.
          </p>
        )}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">En esta hoja</p>
          {deEstaHoja.length ? (
            <ul className="space-y-1">
              {deEstaHoja.map(({ campo, index }) => (
                <li key={`${campo.nombre}-${index}`}>
                  <div
                    className={`rounded-lg px-2 py-1 text-xs ${
                      selected === index ? 'bg-blue-50' : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left"
                        onClick={() => {
                          setSelected(index)
                          setPending(null)
                        }}
                      >
                        {etiquetaCampo(campo, campos)}
                        <span className="ml-1 text-slate-400">{campo.celda || '—'}</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs text-rose-600"
                        onClick={() => {
                          onChange(campos.filter((_, current) => current !== index))
                          setSelected(null)
                        }}
                      >
                        Quitar
                      </button>
                    </div>
                    {selected === index ? (
                      <div className="mt-1 grid grid-cols-2 gap-1">
                        <label className="text-[10px] text-slate-500">
                          Hoja
                          <input
                            className="input input-bordered input-xs mt-0.5 w-full"
                            list="hojas-excel-mapa"
                            value={campo.hoja}
                            onChange={(event) => parche(index, { hoja: event.target.value })}
                          />
                        </label>
                        <label className="text-[10px] text-slate-500">
                          Celda
                          <input
                            className="input input-bordered input-xs mt-0.5 w-full uppercase"
                            value={campo.celda}
                            onChange={(event) =>
                              parche(index, { celda: normalizarCelda(event.target.value) })
                            }
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">Nada colocado en esta hoja.</p>
          )}
          <datalist id="hojas-excel-mapa">
            {hojasDoc.map((nombre) => (
              <option key={nombre} value={nombre} />
            ))}
          </datalist>
        </div>
      </aside>
    </div>
  )
}
