export default function CatalogEmpty({ productos, flujos }) {
  if (productos.length && flujos.length) {
    return null
  }

  return (
    <div className="alert alert-warning mb-4">
      <span>
        Falta configurar {productos.length ? '' : 'productos'} {!productos.length && !flujos.length ? 'y' : ''}{' '}
        {flujos.length ? '' : 'flujos'} en el backend antes de registrar una venta completa.
      </span>
    </div>
  )
}
