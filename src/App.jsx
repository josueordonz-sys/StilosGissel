import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useSearchParams, useNavigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import AdminLayout from './components/admin/AdminLayout'
import { CartProvider } from './context/CartContext'
import Home from './pages/Home'
import Category from './pages/Category'
import ProductDetail from './pages/ProductDetail'
import SearchResults from './pages/SearchResults'
import NotFound from './pages/NotFound'

// Admin pages
import AdminDashboard   from './pages/admin/AdminDashboard'
import AdminInventario  from './pages/admin/AdminInventario'
import AdminCategorias  from './pages/admin/AdminCategorias'
import AdminVentas      from './pages/admin/AdminVentas'
import AdminPedidos     from './pages/admin/AdminPedidos'
import AdminRoles       from './pages/admin/AdminRoles'
import AdminRestricted  from './pages/admin/AdminRestricted'
import AdminHistorial   from './pages/admin/AdminHistorial'

// Guard: en el dominio público de producción, bloquea cualquier acceso a /admin
function ProductionAdminGuard({ children }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const host = window.location.hostname
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1')
    const isSubdomainAdmin = host.startsWith('admin.')

    // Si está en producción y NO es el subdominio admin, bloquear acceso a /admin
    if (!isSubdomainAdmin && !isLocalhost) {
      navigate('/admin-restringido', { replace: true })
    }
  }, [navigate, searchParams])

  return children
}

export default function App() {
  const host = typeof window !== 'undefined' ? window.location.hostname : ''
  const isSubdomainAdmin = host.startsWith('admin.')

  // Subdominio admin.estilosgissel.com — exclusivo para el panel de administración
  if (isSubdomainAdmin) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route index             element={<AdminDashboard />} />
            <Route path="inventario" element={<AdminInventario />} />
            <Route path="categorias" element={<AdminCategorias />} />
            <Route path="ventas"     element={<AdminVentas />} />
            <Route path="pedidos"    element={<AdminPedidos />} />
            <Route path="roles"      element={<AdminRoles />} />
            <Route path="historial"  element={<AdminHistorial />} />
            <Route path="*"          element={<AdminDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>

          {/* ── ADMIN en dominio público: protegido con guard ── */}
          <Route
            path="/admin"
            element={
              <ProductionAdminGuard>
                <AdminLayout />
              </ProductionAdminGuard>
            }
          >
            <Route index              element={<AdminDashboard />} />
            <Route path="inventario"  element={<AdminInventario />} />
            <Route path="categorias"  element={<AdminCategorias />} />
            <Route path="ventas"      element={<AdminVentas />} />
            <Route path="pedidos"     element={<AdminPedidos />} />
            <Route path="roles"       element={<AdminRoles />} />
            <Route path="historial"   element={<AdminHistorial />} />
          </Route>
          <Route path="/admin-restringido" element={<AdminRestricted />} />

          {/* ── TIENDA PÚBLICA (estilosgissel.com / www.estilosgissel.com) ── */}
          <Route path="/" element={<Layout />}>
            <Route index                                 element={<Home />} />
            <Route path="buscar"                         element={<SearchResults />} />
            <Route path="producto/:id"                   element={<ProductDetail />} />
            <Route path="categoria/:category"            element={<Category />} />
            <Route path="categoria/:category/:gender"    element={<Category />} />
            <Route path=":categorySlug"                  element={<Category />} />
            <Route path=":categorySlug/:gender"          element={<Category />} />
            <Route path="*"                              element={<NotFound />} />
          </Route>

        </Routes>
      </BrowserRouter>
    </CartProvider>
  )
}
