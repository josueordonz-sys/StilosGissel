import { useState, useEffect } from 'react'
import './CookieBanner.css'

const STORAGE_KEY = 'eg_cookies_ok'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Pequeño delay para que no bloquee el primer render
        const t = setTimeout(() => setVisible(true), 800)
        return () => clearTimeout(t)
      }
    } catch {
      // Si localStorage está bloqueado no mostramos el banner
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="cookie-banner" role="status" aria-live="polite">
      <div className="cookie-banner__inner">
        <div className="cookie-banner__icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="cookie-banner__text">
          Esta tienda utiliza almacenamiento local para recordar tu carrito y preferencias de navegación.
          Puedes continuar navegando con total normalidad.
        </p>
        <button
          type="button"
          className="cookie-banner__btn"
          onClick={dismiss}
          aria-label="Entendido, cerrar aviso de cookies"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}

