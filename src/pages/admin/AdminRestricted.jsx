import { Link } from 'react-router-dom'

export default function AdminRestricted() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--color-bg)', textAlign: 'center',
      padding: 'var(--space-xl)',
    }}>
      <div style={{ maxWidth: '480px' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.2" style={{ marginBottom: '1.5rem' }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span className="overline">Acceso Denegado</span>
        <h1 className="display-md" style={{ margin: '0.5rem 0 1rem' }}>Panel Restringido</h1>
        <p className="body-sm" style={{ marginBottom: '2rem', lineHeight: 1.8 }}>
          El panel de administracion no es accesible desde el dominio publico de la tienda. Contacte al administrador del sistema para obtener acceso autorizado.
        </p>
        <Link to="/" className="btn btn-primary">
          Volver a la Tienda
        </Link>
      </div>
    </div>
  )
}
