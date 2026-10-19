import { Outlet, Link } from 'react-router-dom'
import './AdminLayout.css'

export default function AdminLayout() {
  const handleLogout = () => {
    sessionStorage.removeItem('eg_admin_session')
    window.location.reload()
  }

  return (
    <div className="admin-app">
      {/* Barra Superior Exclusiva de Administración */}
      <header className="admin-topbar">
        <div className="admin-topbar__inner container">
          <div className="admin-topbar__brand">
            <img src="/logo_sin_fondo.webp" alt="Stilos Gissel" className="admin-topbar__logo" />
            <div className="admin-topbar__titles">
              <span className="admin-topbar__brand-name">STILOS GISSEL</span>
              <span className="admin-topbar__tag">PORTAL PRIVADO</span>
            </div>
          </div>

          <div className="admin-topbar__actions">
            <div className="admin-status-indicator">
              <span className="status-dot" />
              <span className="body-sm status-text">Supabase Conectado</span>
            </div>

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost admin-topbar__btn"
              title="Abrir la tienda del cliente en otra pestaña"
            >
              Ver Tienda Pública
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '6px' }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-outline admin-topbar__btn"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal de Administración */}
      <main className="admin-main">
        <Outlet />
      </main>

      {/* Pie de Página Exclusivo de Administración */}
      <footer className="admin-footer">
        <div className="container admin-footer__inner">
          <p className="body-sm">
            &copy; {new Date().getFullYear()} Stilos Gissel — Sistema de Gestión Interna de Inventario
          </p>
          <span className="overline">Panel de Control Seguro</span>
        </div>
      </footer>
    </div>
  )
}
