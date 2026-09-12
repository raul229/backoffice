import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppShell from './components/AppShell.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import VentasPage from './pages/VentasPage.jsx'
import ClientesPage from './pages/ClientesPage.jsx'
import VentaDetailPage from './pages/VentaDetailPage.jsx'
import NuevaVentaPage from './pages/NuevaVentaPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import { getVentas } from './service/api.js'
import { filterVentas } from './lib/venta.js'

const emptyFilters = {
  search: '',
  estado: 'TODOS',
  tipo: 'TODOS',
  desde: '',
  hasta: '',
}

function App() {
  const [route, setRoute] = useState({ page: 'inicio' })
  const [filters, setFilters] = useState(emptyFilters)

  const ventasQuery = useQuery({
    queryKey: ['tabla-ventas'],
    queryFn: getVentas,
  })

  const ventas = ventasQuery.data ?? []
  const filtered = useMemo(() => filterVentas(ventas, filters), [ventas, filters])

  const openVenta = (venta) => setRoute({ page: 'venta-detalle', ventaId: venta.id })

  const content = (() => {
    if (route.page === 'venta-detalle') {
      return (
        <VentaDetailPage
          onBack={() => setRoute({ page: 'inicio' })}
          ventaId={route.ventaId}
        />
      )
    }
    if (route.page === 'venta-nueva') {
      return (
        <NuevaVentaPage
          onCancel={() => setRoute({ page: 'inicio' })}
          onCreated={(venta) => setRoute({ page: 'venta-detalle', ventaId: venta.id })}
        />
      )
    }
    if (route.page === 'ventas') {
      return (
        <VentasPage
          isPending={ventasQuery.isPending}
          onNavigate={setRoute}
          onOpen={openVenta}
          ventas={filtered}
        />
      )
    }
    if (route.page === 'clientes') {
      return <ClientesPage search={filters.search} />
    }
    if (route.page === 'reportes') {
      return (
        <PlaceholderPage
          detail="Esta vista se conectará a reportes agregados cuando existan en el backend."
          title="Reportes"
        />
      )
    }
    if (route.page === 'configuracion') {
      return (
        <PlaceholderPage
          detail="Aquí irá la configuración de productos, flujos y catálogos."
          title="Configuración"
        />
      )
    }
    return (
      <DashboardPage
        error={ventasQuery.error}
        filtered={filtered}
        filters={filters}
        isError={ventasQuery.isError}
        isPending={ventasQuery.isPending}
        onFilters={setFilters}
        onNavigate={setRoute}
        onOpen={openVenta}
        ventas={ventas}
      />
    )
  })()

  return (
    <AppShell
      onNavigate={setRoute}
      onSearch={(search) => setFilters((current) => ({ ...current, search }))}
      page={route.page === 'venta-detalle' || route.page === 'venta-nueva' ? 'ventas' : route.page}
      search={filters.search}
    >
      {content}
    </AppShell>
  )
}

export default App
