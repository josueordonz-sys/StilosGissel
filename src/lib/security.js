/**
 * Módulo de Seguridad y Detección Forense - S'TILOS GISSEL
 * Protege contra inyecciones SQL / PostgREST, escaneo de bots automatizados y auditoría de accesos.
 */

/**
 * Sanitiza términos de búsqueda para prevenir manipulación de filtros en PostgREST / Supabase
 * Remueve caracteres especiales de sintaxis SQL y operadores de PostgREST (, ( ) % ; ' " -- / * )
 */
export function sanitizeSearchQuery(input, maxLength = 80) {
  if (typeof input !== 'string') return ''
  return input
    .slice(0, maxLength)
    // Eliminar caracteres de inyección SQL y PostgREST
    .replace(/[;'"\\%()]/g, '')
    // Eliminar comas que romperían los filtros .or() de PostgREST
    .replace(/,/g, ' ')
    // Eliminar comentarios SQL
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    // Eliminar operadores de PostgREST
    .replace(/\.(eq|neq|gt|gte|lt|lte|like|ilike|is|in|cs|cd|ov|sl|sr|nxr|nxl|adj|ov|fts|plfts|phfts|wfts)\./gi, '')
    .trim()
}

/**
 * Sanitiza texto general contra inyecciones XSS y caracteres de control
 */
export function sanitizeGeneralText(input, maxLength = 500) {
  if (typeof input !== 'string') return ''
  return input
    .slice(0, maxLength)
    .replace(/\0/g, '') // Null byte
    .replace(/<[^>]*>?/gm, '') // Strips HTML tags
    .trim()
}

/**
 * Detecta huella forense del cliente:
 * - Sistema Operativo (Windows, macOS, iOS, Android, Linux / Linux VM)
 * - Indicadores de automatización / bots / scripts (Selenium, Puppeteer, HeadlessChrome, webdriver)
 * - Zona horaria y resolución de pantalla
 */
export function getClientFingerprint() {
  if (typeof window === 'undefined') {
    return { os: 'unknown', isLinux: false, isAutomated: false }
  }

  const ua = navigator.userAgent || ''
  const platform = navigator.platform || ''
  const isWebdriver = Boolean(navigator.webdriver)

  // Detección de Sistema Operativo
  let os = 'Desconocido'
  let isLinux = false

  if (/iPhone|iPad|iPod/i.test(ua)) {
    os = 'iOS'
  } else if (/Android/i.test(ua)) {
    os = 'Android'
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS'
  } else if (/Windows/i.test(ua)) {
    os = 'Windows'
  } else if (/Linux/i.test(ua) || /Linux/i.test(platform)) {
    os = 'Linux'
    isLinux = true
  }

  // Detección de navegadores headless / entornos automatizados
  const isHeadless =
    /HeadlessChrome|PhantomJS|Selenium|Puppeteer/i.test(ua) ||
    isWebdriver ||
    (!navigator.languages || navigator.languages.length === 0)

  // Obtener zona horaria
  let timezone = 'Desconocida'
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Desconocida'
  } catch (_) {}

  return {
    os,
    isLinux,
    isAutomated: isHeadless,
    userAgent: ua.slice(0, 300),
    screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    language: navigator.language || 'es',
    timezone
  }
}

/**
 * Obtiene la dirección IP pública del cliente de manera segura y silenciosa
 */
export async function fetchClientPublicIp() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2500)
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) return 'IP_NO_DISPONIBLE'
    const data = await res.json()
    return data.ip || 'IP_NO_DISPONIBLE'
  } catch (_) {
    return 'IP_NO_DISPONIBLE'
  }
}
