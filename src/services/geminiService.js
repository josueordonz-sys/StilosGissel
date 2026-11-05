/**
 * geminiService.js
 * Servicio cliente para autocompletar prendas con Google Gemini Vision.
 * Seguridad:
 * - NO almacena claves en el frontend ni en localStorage ni en el bundle del cliente.
 * - Toda la comunicación se realiza a través del endpoint seguro del servidor (/api/gemini-analyze),
 *   el cual lee GEMINI_API_KEY o VITE_GEMINI_API_KEY exclusivamente desde el archivo .env o variables de Vercel.
 */

export const DAILY_AI_PHOTO_LIMIT = 1500

/**
 * Consulta cuántas fotos se han analizado hoy y cuántas quedan disponibles
 */
export function getGeminiDailyUsage(keysCount) {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const raw = localStorage.getItem('gemini_daily_usage')
    const savedTotalKeys = Number(localStorage.getItem('gemini_total_keys')) || 1
    const totalKeys = keysCount || savedTotalKeys
    const limit = totalKeys * DAILY_AI_PHOTO_LIMIT

    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.date === today) {
        const used = Number(parsed.count) || 0
        return {
          date: today,
          used,
          remaining: Math.max(0, limit - used),
          limit,
          totalKeys
        }
      }
    }
    return {
      date: today,
      used: 0,
      remaining: limit,
      limit,
      totalKeys
    }
  } catch {
    return {
      date: new Date().toISOString().slice(0, 10),
      used: 0,
      remaining: DAILY_AI_PHOTO_LIMIT,
      limit: DAILY_AI_PHOTO_LIMIT,
      totalKeys: 1
    }
  }
}

/**
 * Incrementa el contador de fotos analizadas hoy
 */
export function incrementGeminiDailyUsage(totalKeys = 1) {
  try {
    const today = new Date().toISOString().slice(0, 10)
    if (totalKeys) {
      localStorage.setItem('gemini_total_keys', String(totalKeys))
    }
    const current = getGeminiDailyUsage(totalKeys)
    const newUsed = current.used + 1
    localStorage.setItem('gemini_daily_usage', JSON.stringify({
      date: today,
      count: newUsed
    }))
    const limit = (totalKeys || current.totalKeys || 1) * DAILY_AI_PHOTO_LIMIT
    return {
      date: today,
      used: newUsed,
      remaining: Math.max(0, limit - newUsed),
      limit,
      totalKeys: totalKeys || current.totalKeys || 1
    }
  } catch {
    return getGeminiDailyUsage(totalKeys)
  }
}

/**
 * Redimensiona y comprime una imagen a un tamaño óptimo para Gemini (máx 1200px)
 * Devuelve { mimeType, data } con el Base64 puro.
 */
export async function prepareImageForAi(fileOrUrl) {
  return new Promise(async (resolve, reject) => {
    try {
      let dataUrl = ''

      if (typeof fileOrUrl === 'string') {
        if (fileOrUrl.startsWith('data:')) {
          dataUrl = fileOrUrl
        } else {
          // Descargar imagen remota (p.ej. de Supabase Storage)
          const resp = await fetch(fileOrUrl)
          const blob = await resp.blob()
          dataUrl = await new Promise((res, rej) => {
            const reader = new FileReader()
            reader.onload = () => res(reader.result)
            reader.onerror = rej
            reader.readAsDataURL(blob)
          })
        }
      } else if (fileOrUrl instanceof Blob || fileOrUrl instanceof File) {
        dataUrl = await new Promise((res, rej) => {
          const reader = new FileReader()
          reader.onload = () => res(reader.result)
          reader.onerror = rej
          reader.readAsDataURL(fileOrUrl)
        })
      } else {
        return reject(new Error('Formato de imagen no soportado'))
      }

      // Optimizar en canvas a máx 1200px para que la subida sea instantánea y no sature payload
      const img = new Image()
      img.onload = () => {
        const MAX_SIZE = 1200
        let { width, height } = img

        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width)
            width = MAX_SIZE
          } else {
            width = Math.round((width * MAX_SIZE) / height)
            height = MAX_SIZE
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88)
        const base64Data = optimizedDataUrl.split(',')[1]

        resolve({
          mimeType: 'image/jpeg',
          data: base64Data
        })
      }
      img.onerror = () => {
        // Si no se pudo dibujar en canvas, usar el base64 original
        const [header, base64Data] = dataUrl.split(',')
        const mimeMatch = header.match(/:(.*?);/)
        resolve({
          mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg',
          data: base64Data
        })
      }
      img.src = dataUrl
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Analiza la prenda llamando al endpoint seguro del servidor (/api/gemini-analyze)
 * que lee la API key directamente de las variables de entorno del servidor (.env o Vercel).
 */
export async function analyzeGarmentWithGemini({ file, imageUrl, categories = [] }) {
  const target = file || imageUrl
  if (!target) {
    throw new Error('Se requiere una imagen para analizar.')
  }

  // 1. Preparar imagen en base64 optimizada
  const imagePart = await prepareImageForAi(target)

  // 2. Llamar al endpoint seguro del servidor (/api/gemini-analyze)
  const response = await fetch('/api/gemini-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: imagePart.data,
      mimeType: imagePart.mimeType,
      categories: categories.map(c => ({ slug: c.slug, nombre: c.nombre }))
    })
  })

  let data = {}
  try {
    data = await response.json()
  } catch {
    throw new Error(`Error de comunicación con el servidor (${response.status})`)
  }

  if (!response.ok) {
    const error = new Error(data.error || `Error del servidor (${response.status})`)
    error.status = response.status
    error.isRateLimit = response.status === 429 || Boolean(data.isRateLimit) || data.error?.toLowerCase().includes('límite') || data.error?.toLowerCase().includes('cuota')
    error.retryAfter = data.retryAfter || 60
    throw error
  }

  // Incrementar conteo diario exitoso (adaptado al número de claves activas)
  const totalKeys = data.totalKeys || 1
  const usage = incrementGeminiDailyUsage(totalKeys)

  return {
    nombre: (data.nombre || '').trim(),
    categoria: (data.categoria || '').trim(),
    genero: (data.genero || 'mujer').trim(),
    marca: (data.marca || '').trim(),
    descripcion: (data.descripcion || '').trim(),
    dailyUsage: usage,
    activeKeyIndex: data.activeKeyIndex || 1,
    totalKeys
  }
}
