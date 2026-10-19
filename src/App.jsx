import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useSearchParams, useNavigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Category from './pages/Category'
import ProductDetail from './pages/ProductDetail'
import SearchResults from './pages/SearchResults'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminRestricted from './pages/admin/AdminRestricted'
import NotFound from './pages/NotFound'

// Protector para bloquear intentos de acceso con query ?admin en el dominio publico
function QueryAdminGuard({ children }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    // Si intentan entrar por /?admin o ?admin=... en el dominio principal
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
  return (
    <BrowserRouter>
      <QueryAdminGuard>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            
            {/* Busqueda */}
            <Route path="buscar" element={<SearchResults />} />

            {/* Detalle de Producto */}
            <Route path="producto/:id" element={<ProductDetail />} />

            {/* Rutas con prefijo /categoria/... */}
            <Route path="categoria/:category" element={<Category />} />
            <Route path="categoria/:category/:gender" element={<Category />} />

            {/* Panel Administrativo (subdominio o protegido) */}
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin-restringido" element={<AdminRestricted />} />

            {/* Rutas directas para compartir catalogos (ej: /perfumes, /carteras/mujer, etc.) */}
            <Route path=":categorySlug" element={<Category />} />
            <Route path=":categorySlug/:gender" element={<Category />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </QueryAdminGuard>
    </BrowserRouter>
  )
}
