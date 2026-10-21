import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './AdminLayout.css'

const NAV_ITEMS = [
  { to: '/admin',             label: 'Dashboard',       icon: ChartIcon,    end: true },
  { to: '/admin/inventario',  label: 'Inventario',      icon: BoxIcon },
  { to: '/admin/categorias',  label: 'Categorias',      icon: TagIcon },
  { to: '/admin/ventas',      label: 'Zona de Cobro',   icon: CashIcon },
  { to: '/admin/historial',   label: 'Historial Días',  icon: CalendarIcon },
  { to: '/admin/pedidos',     label: 'Pedidos Online',  icon: BagIcon },
  { to: '/admin/roles',       label: 'Roles y Accesos', icon: ShieldIcon },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!mobileMenuOpen) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileMenuOpen])

  const handleLogout = () => {
    sessionStorage.removeItem('eg_admin_session')
    sessionStorage.removeItem('eg_admin_role')
    navigate('/admin', { replace: true })
    window.location.reload()
  }

  return (
    <div className="admin-app">
      <header className="admin-mobilebar">
        <img src="/logo_sin_fondo.webp" alt="Stilos Gissel" className="admin-mobilebar__logo" />
        <span className="admin-mobilebar__title">ADMINISTRACIÓN</span>
        <button
          type="button"
          className="admin-mobilebar__toggle"
          onClick={() => setMobileMenuOpen(open => !open)}
          aria-expanded={mobileMenuOpen}
          aria-controls="admin-navigation"
          aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </header>

      {/* Sidebar */}
      <aside id="admin-navigation" className={`admin-sidebar ${mobileMenuOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__brand">
          <img src="/logo_sin_fondo.webp" alt="Stilos Gissel" className="admin-sidebar__logo" />
          <div>
            <p className="admin-sidebar__brand-name">STILOS GISSEL</p>
            <p className="admin-sidebar__tag">PORTAL PRIVADO</p>
          </div>
          <button type="button" className="admin-sidebar__mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="Cerrar menú">
            <CloseIcon />
          </button>
        </div>

        <nav className="admin-sidebar__nav" aria-label="Menu de administración">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `admin-nav-item ${isActive ? 'admin-nav-item--active' : ''}`
              }
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-status-dot">
            <span className="status-dot" />
            <span className="status-text">Supabase Conectado</span>
          </div>
          <a href="/" target="_blank" rel="noreferrer" className="admin-sidebar__store-link">
            Ver Tienda Publica
          </a>
          <button type="button" onClick={handleLogout} className="admin-sidebar__logout">
            Cerrar Sesion
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="admin-body">
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/* ── Inline SVG Icons ── */
function MenuIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
}
function CloseIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
}
function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )
}
function BoxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
}
function TagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  )
}
function CashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  )
}
function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}
function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  )
}
