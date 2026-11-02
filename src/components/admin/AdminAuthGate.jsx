/* Pantalla de autenticación oficial verificada por Supabase con Rate Limiting */
export default function AdminAuthGate({ auth }) {
  const {
    emailInput,
    setEmailInput,
    passwordInput,
    setPasswordInput,
    handleLogin,
    submitting,
    statusMsg,
    lockoutRemaining
  } = auth

  const isLocked = lockoutRemaining > 0

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
            Inicia sesión con tu cuenta autorizada para acceder al inventario y ventas.
          </p>
        </div>

        {/* Banner de Rate Limit activo */}
        {isLocked && (
          <div
            style={{
              background: '#fef2f2',
              border: '1.5px solid #f87171',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              textAlign: 'center',
              animation: 'pulse 2s infinite'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#b91c1c', fontWeight: 700, fontSize: '0.8rem', marginBottom: '4px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Rate Limit Activado
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#991b1b', lineHeight: 1.4 }}>
              Demasiados intentos fallidos. Bloqueado por seguridad:
              <strong style={{ display: 'block', fontSize: '1.1rem', marginTop: '4px', color: '#b91c1c' }}>
                {lockoutRemaining}s
              </strong>
            </p>
          </div>
        )}

        {statusMsg?.text && !isLocked && (
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
              disabled={submitting || isLocked}
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
              disabled={submitting || isLocked}
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.85rem' }}
            />
          </div>

          <button
            type="submit"
            className="a-btn a-btn-primary"
            disabled={submitting || isLocked}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.75rem',
              marginTop: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: isLocked ? '#9ca3af' : undefined,
              borderColor: isLocked ? '#9ca3af' : undefined,
              cursor: isLocked ? 'not-allowed' : 'pointer'
            }}
          >
            {isLocked
              ? `Bloqueado temporalmente (${lockoutRemaining}s)`
              : submitting
              ? 'Verificando credenciales...'
              : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Protección de acceso seguro • Sistema Cifrado
          </span>
        </div>
      </div>
    </div>
  )
}
