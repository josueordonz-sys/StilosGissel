export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' })
  }

  // Clave de API leída de forma 100% segura en el servidor desde .env o Vercel
  let rawKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim()
  if (!rawKey) {
    return res.status(500).json({
      error: 'Falta configurar GEMINI_API_KEY en las variables de entorno de Vercel o en el archivo .env.'
    })
  }

  // Sanitización: remover si por error se pegó "GEMINI_API_KEY=" o comillas
  rawKey = rawKey.replace(/^(GEMINI_API_KEY|VITE_GEMINI_API_KEY)\s*=\s*/i, '')
  const apiKey = rawKey.replace(/^["'`\s]+|["'`\s]+$/g, '').trim()

  if (!apiKey) {
    return res.status(500).json({
      error: 'La variable GEMINI_API_KEY está vacía o mal formateada en las variables de entorno.'
    })
  }

  try {
    const { imageBase64, mimeType = 'image/jpeg', categories = [] } = req.body || {}
    if (!imageBase64) {
      return res.status(400).json({ error: 'Falta la imagen para analizar.' })
    }

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
                mime_type: mimeType,
                data: imageBase64
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

    const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest']
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

          if (errMsg?.includes('API key not valid') || errMsg?.includes('API_KEY_INVALID') || response.status === 401) {
            return res.status(401).json({
              error: 'La clave GEMINI_API_KEY no es válida. Revisa en Vercel (Project Settings > Environment Variables) que esté pegada exactamente igual a Google AI Studio y haz un Redeploy.'
            })
          }
          if (response.status === 429 || errMsg?.toLowerCase().includes('quota') || errMsg?.toLowerCase().includes('resource_exhausted')) {
            return res.status(429).json({
              error: 'Límite de cuota alcanzado temporalmente en Gemini. Espera 60 segundos.',
              isRateLimit: true,
              retryAfter: 60
            })
          }

          lastError = new Error(`Gemini (${model}): ${errMsg}`)
          continue
        }

        const data = await response.json()
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!rawText) throw new Error('No se recibió texto de respuesta de Gemini.')

        const cleanedJson = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim()

        const parsed = JSON.parse(cleanedJson)

        let finalCategoria = (parsed.categoria || '').trim().toLowerCase()
        if (categories.length > 0) {
          const match = categories.find(c => c.slug.toLowerCase() === finalCategoria)
          if (!match) {
            const partial = categories.find(c =>
              c.slug.toLowerCase().includes(finalCategoria) ||
              c.nombre.toLowerCase().includes(finalCategoria)
            )
            finalCategoria = partial ? partial.slug : categories[0].slug
          }
        }

        let finalGenero = (parsed.genero || 'mujer').trim().toLowerCase()
        if (!['mujer', 'hombre', 'unisex'].includes(finalGenero)) {
          finalGenero = 'mujer'
        }

        return res.status(200).json({
          nombre: (parsed.nombre || '').trim(),
          categoria: finalCategoria,
          genero: finalGenero,
          marca: (parsed.marca || '').trim(),
          descripcion: (parsed.descripcion || '').trim()
        })
      } catch (err) {
        lastError = err
      }
    }

    return res.status(500).json({ error: lastError?.message || 'Error al comunicarse con Gemini AI.' })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor.' })
  }
}
