import { Link } from 'react-router-dom'
import './ProductCard.css'

/**
 * ProductCard — Tarjeta de producto reutilizable
 * Props:
 *  - product: { id, nombre, precio, imagen_url, categoria, genero }
 */
export default function ProductCard({ product }) {
  const {
    id,
    nombre,
    precio,
    imagen_url,
    categoria,
    genero,
  } = product

  const formattedPrice = precio
    ? `L. ${Number(precio).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`
    : null

  return (
    <article className="product-card">
      <Link
        to={`/producto/${id}`}
        className="product-card__image-wrap"
        aria-label={`Ver ${nombre}`}
        id={`product-card-${id}`}
      >
        {imagen_url ? (
          <img
            src={imagen_url}
            alt={nombre}
            className="product-card__image"
            loading="lazy"
          />
        ) : (
          <div className="product-card__placeholder">
            <span className="body-sm">Sin imagen</span>
          </div>
        )}
        <div className="product-card__overlay">
          <span className="product-card__cta overline">Ver detalle</span>
        </div>
      </Link>

      <div className="product-card__info">
        <div className="product-card__meta">
          {genero && (
            <span className="tag">{genero}</span>
          )}
        </div>
        <h3 className="product-card__name">{nombre}</h3>
        {formattedPrice && (
          <p className="product-card__price">{formattedPrice}</p>
        )}
      </div>
    </article>
  )
}
