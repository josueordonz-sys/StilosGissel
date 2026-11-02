/* Pantalla de autenticación oficial verificada exclusivamente por Supabase */
export default function AdminAuthGate({ auth }) {
  const {
    emailInput,
    setEmailInput,
    passwordInput,
    setPasswordInput,
    handleLogin,
    submitting,
    statusMsg
  } = auth

  return (
    <div className="admin-auth-wrapper">
      <div className="admin-auth-card" style={{ maxWidth: '420px', padding: '2.5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img
            src="/logo_sin_fondo.webp"
            alt="S'TILOS GISSEL"
            style={{ width: '80px', height: 'auto', marginBottom: '1rem', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))' }}
          />
          <span className="overline" style={{ color: 'var(--color-gold-dark)', letterSpacing: '0.12em' }}>
            Portal Privado
          </span>
          <h1 className="display-md" style={{ fontSize: '1.4rem', margin: '0.4rem 0 0.5rem', color: 'var(--color-text-main)' }}>
            Administración
          </h1>
          <p className="body-sm" style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', margin: 0 }}>
            Inicia sesión con tu cuenta verificada de Supabase para acceder al inventario y ventas.
          </p>
        </div>

        {statusMsg?.text && (
          <div
            className={`a-status a-status--${statusMsg.type}`}
            style={{
              marginBottom: '1.25rem',
              padding: '0.65rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              textAlign: 'center',
              lineHeight: 1.4
            }}
          >
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleLogin} className="admin-auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <label
              htmlFor="admin-email"
              style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.35rem' }}
            >
              Correo Electrónico
            </label>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="a-input"
              placeholder="tu-correo@ejemplo.com"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              disabled={submitting}
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.85rem' }}
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.35rem' }}
            >
              Contraseña
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="a-input"
              placeholder="••••••••••••"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              disabled={submitting}
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.85rem' }}
            />
          </div>

          <button
            type="submit"
            className="a-btn a-btn-primary"
            disabled={submitting}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.75rem',
              marginTop: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            {submitting ? 'Verificando en Supabase...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Acceso seguro autenticado por Supabase
          </span>
        </div>
      </div>
    </div>
  )
}
