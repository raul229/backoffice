import { useEffect, useRef, useState } from 'react'
import {
  CAMPOS_CONTRATO_GRUPOS,
  HELVETICA_INTERLINEADO,
  TAMANO_LETRA_PDF,
  TRANSFORMACIONES,
  anchoPorDefecto,
  cajaCampoPdf,
  caracteresDesdeAncho,
  campoVacio,
  etiquetaCampo,
  nombreCampoUnico,
  textoVistaMultilinea,
} from '../lib/documento.js'
import { downloadPlantillaContrato } from '../service/api.js'

let pdfjsListo

function cargarPdfjs() {
  if (!pdfjsListo) {
    pdfjsListo = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjs
    })
  }
  return pdfjsListo
}

function cerrarPdfjs(recurso) {
  try {
    recurso?.cancel?.()
  } catch {
    /* ya cancelado */
  }
  try {
    const cierre = recurso?.destroy?.()
    cierre?.catch?.(() => {})
  } catch {
    /* pdf.js ya lo había cerrado */
  }
}

function coordsDesdeEvento(event, el, pageSize) {
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return { x: 0, y: 0 }
  return {
    x: Math.round(((event.clientX - rect.left) / rect.width) * pageSize.width),
    y: Math.round(((event.clientY - rect.top) / rect.height) * pageSize.height),
  }
}

export default function MapaDocumentoEditor({
  campos = [],
  onChange,
  documento,
  onUpload,
  uploading = false,
  onError,
}) {
  const canvasRef = useRef(null)
  const pageRef = useRef(null)
  const pdfRef = useRef(null)
  const renderRef = useRef(null)
  const dragRef = useRef(null)
  const fileRef = useRef(null)
  const [pdfBlob, setPdfBlob] = useState(null)
  const [numPages, setNumPages] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState({ width: 595, height: 842 })
  const [vistaScale, setVistaScale] = useState(1)
  const [pending, setPending] = useState(null)
  const [selected, setSelected] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [fijo, setFijo] = useState('')
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    if (!documento?.cargada) return undefined
    let vivo = true
    downloadPlantillaContrato(documento.clave, documento.nombre_archivo || documento.archivo)
      .then(({ blob }) => {
        if (vivo) setPdfBlob(blob)
      })
      .catch((err) => onErrorRef.current?.(err.message))
    return () => {
      vivo = false
    }
  }, [documento?.clave, documento?.cargada, documento?.actualizado, documento?.archivo, documento?.nombre_archivo])

  useEffect(() => {
    if (!pdfBlob) {
      cerrarPdfjs(renderRef.current)
      renderRef.current = null
      cerrarPdfjs(pdfRef.current)
      pdfRef.current = null
      return undefined
    }
    let cancelado = false
    let tarea
    ;(async () => {
      try {
        const data = new Uint8Array((await pdfBlob.arrayBuffer()).slice(0))
        const pdfjs = await cargarPdfjs()
        if (cancelado) return
        tarea = pdfjs.getDocument({ data })
        tarea.promise.catch(() => {})
        const pdf = await tarea.promise
        if (cancelado) {
          cerrarPdfjs(pdf)
          return
        }
        cerrarPdfjs(pdfRef.current)
        pdfRef.current = pdf
        setNumPages(pdf.numPages)
        setPageIndex((actual) => Math.min(actual, Math.max(pdf.numPages - 1, 0)))
      } catch (err) {
        if (!cancelado) onErrorRef.current?.(err.message || 'No se pudo leer el PDF.')
      }
    })()
    return () => {
      cancelado = true
      cerrarPdfjs(renderRef.current)
      renderRef.current = null
      const pdf = pdfRef.current
      pdfRef.current = null
      if (tarea) cerrarPdfjs(tarea)
      else cerrarPdfjs(pdf)
    }
  }, [pdfBlob])

  useEffect(() => {
    const pdf = pdfRef.current
    const canvas = canvasRef.current
    if (!pdf || !canvas || !numPages) return undefined
    let cancelado = false
    ;(async () => {
      try {
        const page = await pdf.getPage(pageIndex + 1)
        if (cancelado) return
        const base = page.getViewport({ scale: 1 })
        const ancho = pageRef.current?.parentElement?.clientWidth || 720
        const scale = Math.min(1.45, Math.max(0.7, (ancho - 8) / base.width))
        const viewport = page.getViewport({ scale })
        const dpr = window.devicePixelRatio || 1
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        canvas.width = Math.round(viewport.width * dpr)
        canvas.height = Math.round(viewport.height * dpr)
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, viewport.width, viewport.height)
        const tarea = page.render({ canvasContext: ctx, canvas, viewport })
        renderRef.current = tarea
        tarea.promise.catch(() => {})
        await tarea.promise
        if (!cancelado) {
          setPageSize({ width: base.width, height: base.height })
          setVistaScale(viewport.width / base.width)
        }
      } catch (err) {
        const nombre = err?.name || ''
        if (cancelado || nombre === 'RenderingCancelledException' || /destroy/i.test(String(err?.message))) {
          return
        }
        onErrorRef.current?.(err.message || 'No se pudo dibujar el PDF.')
      }
    })()
    return () => {
      cancelado = true
      cerrarPdfjs(renderRef.current)
      renderRef.current = null
    }
  }, [pageIndex, numPages, pdfBlob])

  useEffect(() => {
    const el = pageRef.current
    if (!el || !pageSize.width) return undefined
    const sync = () => {
      const ancho = el.getBoundingClientRect().width
      if (ancho) setVistaScale(ancho / pageSize.width)
    }
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => observer.disconnect()
  }, [pageSize.width, pageIndex, numPages, pdfBlob])

  const deEstaPagina = campos
    .map((campo, index) => ({ campo, index }))
    .filter(({ campo }) => Number(campo.pagina) === pageIndex)

  const colocar = (spec) => {
    if (!pending) return
    const base = spec.nombre
    const nombre = nombreCampoUnico(campos, base, pending.pagina)
    onChange([
      ...campos,
      {
        ...campoVacio(),
        pagina: pending.pagina,
        x: pending.x,
        y: pending.y,
        nombre,
        field: spec.field || (nombre === base ? '' : base),
        value: spec.value || '',
        transform: spec.transform || '',
        tamano: spec.tamano || TAMANO_LETRA_PDF,
        max_caracteres: spec.max_caracteres ?? anchoPorDefecto(base),
      },
    ])
    setPending(null)
    setBusqueda('')
    setFijo('')
    setSelected(campos.length)
  }

  const parche = (index, cambios) => {
    onChange(campos.map((campo, current) => (current === index ? { ...campo, ...cambios } : campo)))
  }

  const mover = (index, x, y) => {
    parche(index, { x: Math.max(0, x), y: Math.max(0, y) })
  }

  const filtro = busqueda.trim().toLowerCase()
  const gruposFiltrados = CAMPOS_CONTRATO_GRUPOS.map((grupo) => ({
    ...grupo,
    campos: grupo.campos.filter(
      (campo) =>
        !filtro ||
        campo.label.toLowerCase().includes(filtro) ||
        campo.value.toLowerCase().includes(filtro),
    ),
  })).filter((grupo) => grupo.campos.length)

  if (!documento?.cargada && !pdfBlob) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
        <p className="mb-3 text-sm text-slate-600">Carga el PDF para colocarlo sobre la hoja con un clic.</p>
        <input
          ref={fileRef}
          accept=".pdf,application/pdf"
          className="hidden"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) {
              setPdfBlob(file)
              onUpload?.(file)
            }
          }}
        />
        <button
          type="button"
          className="btn btn-sm border-none bg-blue-600 text-white"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? 'Subiendo…' : 'Cargar PDF'}
        </button>
      </div>
    )
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-500">
            Clic en el recuadro y elige el dato. El nombre (solicitante y representante) se copia
            entero en cada etiqueta. Solo el domicilio continúa en el siguiente recuadro si no
            cabe. El tirador derecho define el ancho.
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              disabled={pageIndex <= 0}
              onClick={() => {
                setPending(null)
                setPageIndex((n) => n - 1)
              }}
            >
              ‹
            </button>
            <span className="px-1 text-xs text-slate-500">
              Hoja {pageIndex + 1} / {Math.max(numPages, 1)}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              disabled={pageIndex >= numPages - 1}
              onClick={() => {
                setPending(null)
                setPageIndex((n) => n + 1)
              }}
            >
              ›
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? 'Subiendo…' : 'Cambiar PDF'}
            </button>
            <input
              ref={fileRef}
              accept=".pdf,application/pdf"
              className="hidden"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) {
                  setPdfBlob(file)
                  onUpload?.(file)
                }
              }}
            />
          </div>
        </div>
        <div className="overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-2">
          {(documento?.cargada && !pdfBlob) || (pdfBlob && !numPages) ? (
            <p className="p-6 text-sm text-slate-500">Cargando PDF…</p>
          ) : null}
          <div
            ref={pageRef}
            className="relative mx-auto inline-block cursor-crosshair bg-white shadow-sm"
            onPointerDown={(event) => {
              if (event.target !== canvasRef.current && event.target !== event.currentTarget) return
              if (!pageRef.current) return
              const punto = coordsDesdeEvento(event, pageRef.current, pageSize)
              setSelected(null)
              setPending({ ...punto, pagina: pageIndex })
            }}
          >
            <canvas ref={canvasRef} className="block" />
            {deEstaPagina.map(({ campo, index }) => {
              const texto = textoVistaMultilinea(campo, campos, index)
              const seleccionado = selected === index
              const caja = cajaCampoPdf(campo, texto, { incluirTope: seleccionado })
              return (
                <div
                  key={`${campo.nombre}-${index}`}
                  className={`absolute overflow-visible text-left shadow-sm ${
                    seleccionado
                      ? 'bg-blue-600/80 text-white'
                      : 'bg-blue-100/70 text-blue-950 ring-1 ring-blue-300'
                  }`}
                  style={{
                    left: `${caja.left * vistaScale}px`,
                    top: `${caja.top * vistaScale}px`,
                    width: `${caja.width * vistaScale}px`,
                    height: `${caja.height * vistaScale}px`,
                    fontSize: `${caja.tamano * vistaScale}px`,
                    fontFamily: 'Helvetica, Arial, sans-serif',
                    lineHeight: HELVETICA_INTERLINEADO,
                    whiteSpace: 'pre',
                    overflowWrap: 'normal',
                    wordBreak: 'keep-all',
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    event.currentTarget.setPointerCapture(event.pointerId)
                    const punto = coordsDesdeEvento(event, pageRef.current, pageSize)
                    dragRef.current = {
                      index,
                      modo: 'mover',
                      dx: punto.x - Number(campo.x),
                      dy: punto.y - Number(campo.y),
                    }
                    setSelected(index)
                    setPending(null)
                  }}
                  onPointerMove={(event) => {
                    if (!dragRef.current || dragRef.current.index !== index || !pageRef.current) return
                    if (dragRef.current.modo !== 'mover') return
                    const punto = coordsDesdeEvento(event, pageRef.current, pageSize)
                    mover(index, punto.x - dragRef.current.dx, punto.y - dragRef.current.dy)
                  }}
                  onPointerUp={() => {
                    dragRef.current = null
                  }}
                >
                  {texto}
                  {seleccionado ? (
                    <span
                      className="absolute top-0 right-0 h-full w-2 cursor-ew-resize bg-white/50"
                      onPointerDown={(event) => {
                        event.stopPropagation()
                        event.currentTarget.setPointerCapture(event.pointerId)
                        dragRef.current = { index, modo: 'ancho' }
                      }}
                      onPointerMove={(event) => {
                        if (!dragRef.current || dragRef.current.modo !== 'ancho' || !pageRef.current) return
                        const punto = coordsDesdeEvento(event, pageRef.current, pageSize)
                        const anchoNuevo = Math.max(20, punto.x - Number(campo.x))
                        parche(index, {
                          max_caracteres: caracteresDesdeAncho(anchoNuevo, campo.tamano),
                        })
                      }}
                      onPointerUp={(event) => {
                        event.stopPropagation()
                        dragRef.current = null
                      }}
                    />
                  ) : null}
                </div>
              )
            })}
            {pending && pending.pagina === pageIndex ? (
              <span
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500 ring-2 ring-white"
                style={{
                  left: `${pending.x * vistaScale}px`,
                  top: `${pending.y * vistaScale}px`,
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
      <aside className="space-y-3">
        {pending ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="mb-2 text-sm font-medium">¿Qué dato va aquí?</p>
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
                        onClick={() => colocar({ nombre: campo.value })}
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
                      nombre: nombreCampoUnico(campos, 'TEXTO', pending.pagina),
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
              Cancelar clic
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Clic en la hoja para agregar un dato.</p>
        )}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">En esta hoja</p>
          {deEstaPagina.length ? (
            <ul className="space-y-1">
              {deEstaPagina.map(({ campo, index }) => (
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
                          Tamaño
                          <input
                            className="input input-bordered input-xs mt-0.5 w-full"
                            inputMode="numeric"
                            value={campo.tamano}
                            onChange={(event) => parche(index, { tamano: event.target.value })}
                          />
                        </label>
                        <label className="text-[10px] text-slate-500">
                          Letras / línea
                          <input
                            className="input input-bordered input-xs mt-0.5 w-full"
                            inputMode="numeric"
                            placeholder="sin corte"
                            value={campo.max_caracteres}
                            onChange={(event) => parche(index, { max_caracteres: event.target.value })}
                          />
                        </label>
                        <p className="col-span-2 text-[10px] text-slate-400">
                          Vacío = una línea. 40 va bien para razón social, 60 para domicilio.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">Nada colocado en esta hoja.</p>
          )}
        </div>
      </aside>
    </div>
  )
}
