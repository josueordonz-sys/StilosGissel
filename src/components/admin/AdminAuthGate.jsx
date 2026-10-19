/* Pantalla de autenticación compartida para todas las páginas admin */
export default function AdminAuthGate({ auth }) {
  const { accessKeyInput, setAccessKeyInput, handleUnlock, statusMsg } = auth

  return (
    <div className="admin-auth-wrapper">
      <div className="admin-auth-card">
        <div className="admin-auth-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <span className="overline">Acceso Restringido</span>
        <h1 className="display-md" style={{ marginBottom: '0.5rem' }}>Panel de Administracion</h1>
        <p className="admin-auth-desc">
          Ingrese la clave de acceso del administrador para continuar.
        </p>

        {statusMsg?.text && (
          <div className={`a-status a-status--${statusMsg.type}`} style={{ marginBottom: '1rem' }}>
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleUnlock} className="admin-auth-form">
          <input
            id="admin-key-input"
            name="adminKey"
            aria-label="Clave de acceso"
            type="password"
            className="a-input"
            placeholder="Clave de acceso..."
            value={accessKeyInput}
            onChange={e => setAccessKeyInput(e.target.value)}
            autoFocus
          />
          <button type="submit" className="a-btn a-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Ingresar al Panel
          </button>
        </form>
      </div>
    </div>
  )
}
