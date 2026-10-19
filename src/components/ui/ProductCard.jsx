import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import './ProductCard.css'

/**
 * ProductCard — Tarjeta de producto estilo editorial / streetwear
 * Diseñado según referencia:
 *  - Badge pill superior ('Most Wanted', 'New In', etc.)
 *  - Imagen limpia con fondo neutro de estudio
 *  - Fila de Título con botón '+'
 *  - Precio en Lempiras: 'L 8,452'
 *  - Swatches de colores cuadrados con indicador de subrayado activo
 */
export default function ProductCard({ product }) {
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const [justAdded, setJustAdded] = useState(false)
  const {
    id,
    nombre,
    precio,
    imagen_url,
    categoria,
    genero,
    marca,
    destacado,
    nuevo,
    badge,
    colores
  } = product

  // 1. Badge superior ('Most Wanted' / 'New In' / personalizado)
  const badgeText = useMemo(() => {
    if (badge) return badge
    if (destacado) return 'Most Wanted'
    if (nuevo) return 'New In'
    return null
  }, [badge, destacado, nuevo])

  // 2. Colores disponibles — ÚNICAMENTE si existen en la base de datos real
  const swatches = useMemo(() => {
    if (Array.isArray(colores) && colores.length > 0) {
      return colores.map(c => typeof c === 'string' ? { hex: c, name: c } : c)
    }
    if (typeof colores === 'string' && colores.trim()) {
      try {
        const parsed = JSON.parse(colores)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch {
        const list = colores.split(',').map(c => c.trim()).filter(Boolean)
        if (list.length > 0) {
          return list.map(c => ({ hex: c, name: c }))
        }
      }
    }
    return []
  }, [colores])

  const [activeSwatchIndex, setActiveSwatchIndex] = useState(0)

  // Imagen activa según la variante seleccionada si la tiene
  const currentImage = swatches[activeSwatchIndex]?.imagen_url || imagen_url


  // 3. Formateo de precio exacto estilo referencia: 'L 8,452'
  const formattedPrice = useMemo(() => {
    if (!precio && precio !== 0) return null
    const num = Number(precio)
    const formattedNum = num.toLocaleString('en-US', {
      maximumFractionDigits: 0
    })
    return `L ${formattedNum}`
  }, [precio])

  const handlePlusClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const selectedSwatch = swatches[activeSwatchIndex] || null
    addToCart(product, selectedSwatch, 1, true)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1400)
  }

  return (
    <article className="product-card">
      {/* Contenedor de Imagen */}
      <Link
        to={`/producto/${id}`}
        className="product-card__image-wrap"
        aria-label={`Ver ${nombre}`}
        id={`product-card-${id}`}
      >
        {/* Badge superior (e.g. 'Most Wanted', 'New In') */}
        {badgeText && (
          <span className="product-card__badge">
            {badgeText}
          </span>
        )}

        {currentImage ? (
          <img
            src={currentImage}
            alt={nombre}
            className="product-card__image"
            loading="lazy"
          />
        ) : (
          <div className="product-card__placeholder">
            <span className="body-sm">Sin imagen</span>
          </div>
        )}
      </Link>

      {/* Información inferior */}
      <div className="product-card__info">
        {/* Fila del Nombre + Botón '+' */}
        <div className="product-card__header">
          <h3 className="product-card__name">
            <Link to={`/producto/${id}`} className="product-card__name-link">
              {nombre}
            </Link>
          </h3>
          <button
            type="button"
            className={`product-card__plus-btn ${justAdded ? 'is-added' : ''}`}
            onClick={handlePlusClick}
            aria-label={`Agregar ${nombre} al carrito`}
            title={justAdded ? '¡Agregado al carrito!' : 'Agregar al carrito'}
          >
            {justAdded ? '✓' : '+'}
          </button>
        </div>

        {/* Precio */}
        {formattedPrice && (
          <p className="product-card__price">{formattedPrice}</p>
        )}

        {/* Swatches de Color con barra indicadora activa inferior */}
        {swatches && swatches.length > 0 && (
          <div className="product-card__swatches" role="group" aria-label="Variantes de color">
            {swatches.map((swatch, idx) => {
              const isActive = idx === activeSwatchIndex
              return (
                <button
                  key={idx}
                  type="button"
                  className={`product-card__swatch-btn ${isActive ? 'is-active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setActiveSwatchIndex(idx)
                  }}
                  title={swatch.name || `Color ${idx + 1}`}
                  aria-label={swatch.name || `Color ${idx + 1}`}
                  aria-pressed={isActive}
                >
                  <span
                    className="product-card__swatch-box"
                    style={{ backgroundColor: swatch.hex }}
                  />
                  <span className="product-card__swatch-line" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </article>
  )
}

