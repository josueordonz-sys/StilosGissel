/**
 * intelligentSearch.js
 * Motor de búsqueda inteligente para S'TILOS GISSEL.
 * Soporta:
 * - Coincidencia multi-término (ej: "Carteras guess", "Camisa Tommy", "Perfume Mujer")
 * - Singularización y pluralización automática en español ("carteras" <-> "cartera", "relojes" <-> "reloj")
 * - Búsqueda cruzada por campos (nombre, marca, categoría, género, talla, descripción, código)
 * - Tolerancia a tildes y mayúsculas
 * - Puntuación de relevancia para ordenar los resultados más precisos primero
 * - Fallback inteligente si no hay coincidencia exacta de todos los términos
 */

export function normalizeSearchText(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function getWordVariants(word) {
  const norm = normalizeSearchText(word)
  if (!norm || norm.length < 2) return norm ? [norm] : []
  const variants = new Set([norm])

  // Desinencias plurales en español
  if (norm.endsWith('es') && norm.length > 3) {
    variants.add(norm.slice(0, -2)) // pantalones -> pantalon, relojes -> reloj
  }
  if (norm.endsWith('s') && norm.length > 2) {
    variants.add(norm.slice(0, -1)) // carteras -> cartera, camisas -> camisa
  }
  if (!norm.endsWith('s')) {
    variants.add(norm + 's')
    variants.add(norm + 'es')
  }

  // Sinónimos o equivalencias comunes en tienda
  if (norm === 'cartera' || norm === 'carteras') {
    variants.add('bolso')
    variants.add('bolsos')
    variants.add('monedero')
    variants.add('tote')
  } else if (norm === 'bolso' || norm === 'bolsos') {
    variants.add('cartera')
    variants.add('carteras')
  } else if (norm === 'pantalon' || norm === 'pantalones') {
    variants.add('jean')
    variants.add('jeans')
  } else if (norm === 'camisa' || norm === 'camisas') {
    variants.add('camiseta')
    variants.add('camisetas')
  } else if (norm === 'reloj' || norm === 'relojes') {
    variants.add('relojeria')
  }

  return [...variants]
}

export function filterProductsBySearchQuery(products, query) {
  if (!query || !query.trim() || !products || products.length === 0) {
    return products || []
  }

  const terms = query
    .trim()
    .split(/\s+/)
    .map(t => normalizeSearchText(t))
    .filter(t => t.length > 0)

  if (terms.length === 0) return products

  const scored = []

  for (const p of products) {
    const nameNorm = normalizeSearchText(p.nombre)
    const brandNorm = normalizeSearchText(p.marca)
    const catNorm = normalizeSearchText(p.categoria)
    const descNorm = normalizeSearchText(p.descripcion)
    const genderNorm = normalizeSearchText(p.genero)
    const tallaNorm = normalizeSearchText(p.talla)
    const codeNorm = normalizeSearchText(p.codigo_barra)

    let matchedTermsCount = 0
    let score = 0

    for (const term of terms) {
      const variants = getWordVariants(term)
      let termMatched = false

      for (const v of variants) {
        if (nameNorm.includes(v)) {
          score += 15
          termMatched = true
        }
        if (brandNorm.includes(v)) {
          score += 20 // Marca es altamente distintiva
          termMatched = true
        }
        if (catNorm.includes(v)) {
          score += 18 // Categoría es altamente distintiva
          termMatched = true
        }
        if (descNorm.includes(v)) {
          score += 5
          termMatched = true
        }
        if (genderNorm === v) {
          score += 10
          termMatched = true
        }
        if (tallaNorm === v) {
          score += 8
          termMatched = true
        }
        if (codeNorm.includes(v)) {
          score += 25
          termMatched = true
        }
      }

      if (termMatched) {
        matchedTermsCount++
      }
    }

    // Nivel 1: Todos los términos buscados coinciden en algún campo del producto
    if (matchedTermsCount === terms.length) {
      scored.push({ product: p, score: score + 100, matchedCount: matchedTermsCount })
    }
  }

  // Nivel 2: Si no hubo coincidencias con TODOS los términos y se ingresaron múltiples palabras,
  // mostrar como fallback los que coincidan con al menos un término para no dejar la pantalla en 0
  if (scored.length === 0 && terms.length > 1) {
    for (const p of products) {
      const combined = normalizeSearchText([
        p.nombre, p.marca, p.categoria, p.descripcion, p.genero, p.talla
      ].join(' '))

      let matches = 0
      for (const term of terms) {
        const variants = getWordVariants(term)
        if (variants.some(v => combined.includes(v))) {
          matches++
        }
      }
      if (matches > 0) {
        scored.push({ product: p, score: matches * 15, matchedCount: matches })
      }
    }
  }

  // Ordenar de mayor a menor relevancia
  scored.sort((a, b) => b.score - a.score)
  return scored.map(s => s.product)
}

