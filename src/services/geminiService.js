/**
 * geminiService.js
 * Servicio para análisis visual inteligente de prendas usando la API gratuita de Google Gemini.
 * Identifica automáticamente:
 * - Nombre comercial atractivo y conciso de la prenda
 * - Categoría exacta mapeada al catálogo de la tienda
 * - Género ('mujer', 'hombre', 'unisex')
 * - Marca sugerida (si es visible en etiqueta o logo)
 * - Descripción profesional para catálogo
 */

const STORAGE_KEY = 'estilos_gemini_api_key'

export function getGeminiApiKey() {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY
  if (envKey && envKey.trim()) return envKey.trim()

  try {
    const localKey = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('gemini_api_key')
    return (localKey || '').trim()
  } catch {
    return ''
  }
}

export function saveGeminiApiKey(key) {
  try {
    if (key && key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim())
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch (err) {
    console.error('Error al guardar Gemini API Key:', err)
  }
}

export function hasGeminiApiKey() {
  return Boolean(getGeminiApiKey())
}

/**
 * Convierte un File o Blob a Base64 puro (sin prefijo data:...)
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      const base64Data = result.split(',')[1]
      resolve({
        mimeType: file.type || 'image/jpeg',
        data: base64Data
      })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Convierte una URL (de Supabase Storage o remota) a Base64 puro
 */
export async function urlToBase64(url) {
  if (url.startsWith('data:')) {
    const [header, base64Data] = url.split(',')
    const mimeMatch = header.match(/:(.*?);/)
    return {
      mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg',
      data: base64Data
    }
  }

  const response = await fetch(url)
  const blob = await response.blob()
  return fileToBase64(blob)
}

/**
 * Analiza la imagen de una prenda con Google Gemini Vision
 * @param {Object} params
 * @param {File} [params.file] - Archivo de imagen seleccionado
 * @param {string} [params.imageUrl] - URL o base64 de la imagen
 * @param {Array} [params.categories] - Lista de categorías de la tienda [{ slug, nombre }]
 * @returns {Promise<{ nombre: string, categoria: string, genero: string, marca: string, descripcion: string }>}
 */
export async function analyzeGarmentWithGemini({ file, imageUrl, categories = [] }) {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error('MISSING_API_KEY')
  }

  // 1. Obtener datos Base64
  let imagePart
  if (file) {
    imagePart = await fileToBase64(file)
  } else if (imageUrl) {
    imagePart = await urlToBase64(imageUrl)
  } else {
    throw new Error('Se requiere un archivo o URL de imagen para analizar.')
  }

  // 2. Preparar categorías válidas
  const categoryListStr = categories.length > 0
    ? categories.map(c => `"${c.slug}" (${c.nombre})`).join(', ')
    : '"camisas", "pantalones", "sudaderas", "carteras", "perfumes", "ropainterior", "sandalias", "tenis", "relojeria", "gorras", "accesorios", "maquillaje", "telefonos"'

  const systemPrompt = `Eres un experto catalogador de moda para la boutique "S'TILOS GISSEL" en Honduras.
Tu tarea es analizar la fotografía de la prenda o artículo de la tienda y generar datos estructurados precisos.

REGLAS ESTRICTAS DE RESPUESTA:
1. "nombre": Nombre comercial en español, elegante, conciso y atractivo (máximo 6 a 8 palabras). Debe describir la prenda con precisión (ej: "Blusa Casual Estampada de Cuello V", "Cartera Tote Bag de Hombro", "Pantalón Jean Skinny Tiro Alto", "Vestido Corto Manga Larga", "Perfume Floral Eau de Parfum").
2. "categoria": Debes elegir ESTRICTAMENTE uno de estos slugs disponibles: [${categoryListStr}]. Si es una blusa o camisa elige "camisas"; si es un bolso/tote/mochila elige "carteras"; si es un jean o pantalón elige "pantalones"; si es abrigo o suéter elige "sudaderas"; si es calzado deportivo elige "tenis" o "sandalias" según aplique.
3. "genero": Debe ser exactamente uno de estos tres valores: "mujer", "hombre" o "unisex".
4. "marca": Si en la prenda, estampado, botón o etiqueta se aprecia claramente una marca conocida (como Guess, Tommy Hilfiger, Calvin Klein, Zara, Shein, Coach, Nike, Afnan, etc.), indícala. Si no se puede distinguir con total seguridad, devuelve cadena vacía "".
5. "descripcion": Redacta 1 o 2 oraciones profesionales resaltando la textura, corte, estilo y ocasión de uso ideal.

Responde ÚNICAMENTE un objeto JSON válido con este formato:
{
  "nombre": "...",
  "categoria": "...",
  "genero": "mujer" | "hombre" | "unisex",
  "marca": "...",
  "descripcion": "..."
}`

  const requestBody = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          {
            inline_data: {
              mime_type: imagePart.mimeType,
              data: imagePart.data
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.15,
      responseMimeType: 'application/json'
    }
  }

  // Modelos compatibles en orden de preferencia (gratuitos en Google AI Studio)
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro']
  let lastError = null

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        const errMsg = errJson?.error?.message || response.statusText

        // Si es error de cuota o clave inválida, no seguir probando otros modelos
        if (response.status === 400 && errMsg?.includes('API_KEY_INVALID')) {
          throw new Error('La clave API de Gemini no es válida. Revisa que esté copiada correctamente.')
        }
        if (response.status === 429) {
          throw new Error('Límite de cuota de Gemini alcanzado. Espera un minuto e inténtalo de nuevo.')
        }

        lastError = new Error(`Gemini (${model}): ${errMsg}`)
        continue // probar siguiente modelo si este falló
      }

      const data = await response.json()
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!rawText) throw new Error('No se recibió texto de respuesta de Gemini.')

      // Limpiar posibles bloques ```json ... ```
      const cleanedJson = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim()

      const parsed = JSON.parse(cleanedJson)

      // Validar y normalizar categoría contra slugs reales
      let finalCategoria = (parsed.categoria || '').trim().toLowerCase()
      if (categories.length > 0) {
        const match = categories.find(c => c.slug.toLowerCase() === finalCategoria)
        if (!match) {
          // Fallback a coincidencia parcial
          const partial = categories.find(c =>
            c.slug.toLowerCase().includes(finalCategoria) ||
            c.nombre.toLowerCase().includes(finalCategoria)
          )
          finalCategoria = partial ? partial.slug : categories[0].slug
        }
      }

      // Validar género
      let finalGenero = (parsed.genero || 'mujer').trim().toLowerCase()
      if (!['mujer', 'hombre', 'unisex'].includes(finalGenero)) {
        finalGenero = 'mujer'
      }

      return {
        nombre: (parsed.nombre || '').trim(),
        categoria: finalCategoria,
        genero: finalGenero,
        marca: (parsed.marca || '').trim(),
        descripcion: (parsed.descripcion || '').trim()
      }
    } catch (err) {
      if (err.message.includes('API de Gemini no es válida') || err.message.includes('Límite de cuota')) {
        throw err
      }
      lastError = err
    }
  }

  throw lastError || new Error('No se pudo analizar la imagen con Gemini.')
}
