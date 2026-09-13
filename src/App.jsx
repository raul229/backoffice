import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from './components/AppShell.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import VentasPage from './pages/VentasPage.jsx'
import ClientesPage from './pages/ClientesPage.jsx'
import VentaDetailPage from './pages/VentaDetailPage.jsx'
import NuevaVentaPage from './pages/NuevaVentaPage.jsx'
import ConfiguracionPage from './pages/ConfiguracionPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import RolesPage from './pages/RolesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { deleteVenta, getVentas } from './service/api.js'
import { filterVentas, numeroVenta } from './lib/venta.js'

const emptyFilters = {
  search: '',
  estado: 'TODOS',
  tipo: 'TODOS',
  desde: '',
  hasta: '',
}

function App() {
  const { user, ready, can } = useAuth()
  const queryClient = useQueryClient()
  const [route, setRoute] = useState({ page: 'inicio' })
  const [filters, setFilters] = useState(emptyFilters)

  const ventasQuery = useQuery({
    queryKey: ['tabla-ventas'],
    queryFn: getVentas,
    enabled: Boolean(user),
  })

  const deleteVentaMutation = useMutation({
    mutationFn: (venta) => deleteVenta(venta.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tabla-ventas'] }),
  })

  const handleDeleteVenta = (venta) => {
    if (!window.confirm(`¿Eliminar ${numeroVenta(venta)}?`)) return
    deleteVentaMutation.mutate(venta)
  }

  const ventas = ventasQuery.data ?? []
  const filtered = useMemo(() => filterVentas(ventas, filters), [ventas, filters])

  if (!ready) {
    return <p className="p-8 text-center text-slate-500">Cargando sesión...</p>
  }

  if (!user) {
    return <LoginPage />
  }

  const openVenta = (venta) => setRoute({ page: 'venta-detalle', ventaId: venta.id })
  const page = route.page

  const content = (() => {
    if (page === 'venta-detalle') {
      return (
        <VentaDetailPage
          onBack={() => setRoute({ page: 'inicio' })}
          onDeleted={() => setRoute({ page: 'ventas' })}
          ventaId={route.ventaId}
        />
      )
    }
    if (page === 'venta-nueva' && can('api.add_venta')) {
      return (
        <NuevaVentaPage
          onCancel={() => setRoute({ page: 'inicio' })}
          onCreated={(venta) => setRoute({ page: 'venta-detalle', ventaId: venta.id })}
        />
      )
    }
    if (page === 'ventas') {
      return (
        <VentasPage
          isPending={ventasQuery.isPending}
          onDelete={can('api.delete_venta') ? handleDeleteVenta : undefined}
          onNavigate={setRoute}
          onOpen={openVenta}
          ventas={filtered}
        />
      )
    }
    if (page === 'clientes' && can('api.view_cliente')) {
      return <ClientesPage search={filters.search} />
    }
    if (page === 'reportes') {
      return (
        <PlaceholderPage
          detail="Esta vista se conectará a reportes agregados cuando existan en el backend."
          title="Reportes"
        />
      )
    }
    if (page === 'configuracion' && can('api.change_flujo')) {
      return <ConfiguracionPage />
    }
    if (page === 'roles' && can('auth.change_group')) {
      return <RolesPage />
    }
    return (
      <DashboardPage
        error={ventasQuery.error}
        filtered={filtered}
        filters={filters}
        isError={ventasQuery.isError}
        isPending={ventasQuery.isPending}
        onDelete={can('api.delete_venta') ? handleDeleteVenta : undefined}
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
      page={page === 'venta-detalle' || page === 'venta-nueva' ? 'ventas' : page}
      search={filters.search}
    >
      {content}
    </AppShell>
  )
}

export default App
