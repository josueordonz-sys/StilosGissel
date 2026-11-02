import { Link } from 'react-router-dom'

export default function AdminNotFound() {
  const isSubdomain = typeof window !== 'undefined' && window.location.hostname.startsWith('admin.')
  const homeLink = isSubdomain ? '/' : '/'
  const inventoryLink = isSubdomain ? '/inventario' : '/admin/inventario'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '2rem 1.5rem',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          maxWidth: '460px',
          width: '100%',
          background: 'var(--color-surface, #ffffff)',
          border: '1px solid var(--color-border, #e5e5e5)',
          borderRadius: '12px',
          padding: '2.5rem 2rem',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)'
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(156, 124, 68, 0.1)',
            color: 'var(--color-gold-dark, #9c7c44)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem'
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <span
          className="overline"
          style={{
            color: 'var(--color-gold-dark, #9c7c44)',
            display: 'block',
            marginBottom: '0.4rem',
            letterSpacing: '0.12em',
            fontSize: '0.7rem',
            fontWeight: 700
          }}
        >
          Error 404 • Portal Administrativo
        </span>

        <h1
          style={{
            fontSize: '1.4rem',
            fontWeight: 700,
            color: 'var(--color-text-main, #121212)',
            margin: '0 0 0.6rem'
          }}
        >
          Sección No Encontrada
        </h1>

        <p
          style={{
            fontSize: '0.82rem',
            lineHeight: 1.6,
            color: 'var(--color-text-muted, #666666)',
            margin: '0 0 1.75rem'
          }}
        >
          La ruta que intentas consultar en el sistema administrativo no existe, fue reubicada o no está disponible en este entorno.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {isSubdomain ? (
            <>
              <Link
                to={homeLink}
                className="a-btn a-btn-primary"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.78rem' }}
              >
                Ir al Dashboard
              </Link>
              <Link
                to={inventoryLink}
                className="a-btn a-btn-outline"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.78rem' }}
              >
                Ver Inventario
              </Link>
            </>
          ) : (
            <a
              href="https://www.estilosgissel.com"
              className="a-btn a-btn-primary"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.78rem' }}
            >
              Volver a la Tienda
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

