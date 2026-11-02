import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop
 * Asegura que al navegar a cualquier página o categoría (por ejemplo desde el menú,
 * tarjetas de la home o filtros de género), la vista siempre inicie desde la parte superior
 * de la página, evitando que el scroll se quede a mitad de la lista de productos.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    // Desactivar restauración automática de scroll del navegador para control total
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    // Restablecer el scroll al inicio en window, documentElement y body para máxima compatibilidad
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    })
    if (document.documentElement) {
      document.documentElement.scrollTop = 0
    }
    if (document.body) {
      document.body.scrollTop = 0
    }
  }, [pathname, search])

  return null
}

