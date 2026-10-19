import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useSearchParams, useNavigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import AdminLayout from './components/admin/AdminLayout'
import Home from './pages/Home'
import Category from './pages/Category'
import ProductDetail from './pages/ProductDetail'
import SearchResults from './pages/SearchResults'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminRestricted from './pages/admin/AdminRestricted'
import NotFound from './pages/NotFound'

// Bloquea intentos de acceder con query ?admin desde el dominio público del cliente
function QueryAdminGuard({ children }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (searchParams.has('admin')) {
      const host = window.location.hostname
      if (!host.startsWith('admin.')) {
        navigate('/admin-restringido', { replace: true })
      }
    }
  }, [searchParams, navigate])

  return children
}

export default function App() {
  const isSubdomainAdmin = window.location.hostname.startsWith('admin.')

  // Si la petición proviene del subdominio administrativo (admin.estilosgissel.com / admin.localhost)
  if (isSubdomainAdmin) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="*" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    )
  }

  // Dominio Principal de Clientes
  return (
    <BrowserRouter>
      <QueryAdminGuard>
        <Routes>
          {/* ===================================================
              RUTAS DE ADMINISTRACIÓN: 100% AISLADAS DEL CLIENTE
              (No usan Navbar, ni Footer, ni elementos de tienda)
             =================================================== */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
          </Route>
          <Route path="/admin-restringido" element={<AdminRestricted />} />

          {/* ===================================================
              RUTAS DE LA TIENDA PÚBLICA PARA CLIENTES
             =================================================== */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            
            {/* Buscador de catálogo */}
            <Route path="buscar" element={<SearchResults />} />

            {/* Ficha individual de producto */}
            <Route path="producto/:id" element={<ProductDetail />} />

            {/* Rutas con prefijo /categoria/... */}
            <Route path="categoria/:category" element={<Category />} />
            <Route path="categoria/:category/:gender" element={<Category />} />

            {/* Rutas directas para compartir catálogos (ej: /perfumes, /carteras/mujer) */}
            <Route path=":categorySlug" element={<Category />} />
            <Route path=":categorySlug/:gender" element={<Category />} />

            {/* Página 404 */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </QueryAdminGuard>
    </BrowserRouter>
  )
}
