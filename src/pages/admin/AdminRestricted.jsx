import { Link } from 'react-router-dom'
import './AdminRestricted.css'

export default function AdminRestricted() {
  return (
    <div className="admin-restricted container section">
      <div className="admin-restricted__card">
        <div className="admin-restricted__icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <span className="overline">Seguridad Corporativa</span>
        <h1 className="display-md admin-restricted__title">Acceso Restringido</h1>
        <p className="body-sm admin-restricted__desc">
          El módulo de administración de <strong>Estilos Gissel</strong> se encuentra protegido y no está disponible a través del dominio principal público.
        </p>
        <p className="body-sm admin-restricted__note">
          Para realizar operaciones de catálogo y configuración, utilice el subdominio privado asignado (ej. <code>admin.estilosgissel.com</code>).
        </p>
        <div className="admin-restricted__actions">
          <Link to="/" className="btn btn-primary">
            Regresar a la Tienda
          </Link>
        </div>
      </div>
    </div>
  )
}
