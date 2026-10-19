import './ProductGrid.css'
import ProductCard from './ProductCard'
import ProductCardSkeleton from './ProductCardSkeleton'

/**
 * ProductGrid — Grilla responsiva de productos estilo editorial / streetwear
 * Props:
 *  - products: array
 *  - loading: bool
 *  - columns: 2|3|4 (default 2 para ropa/editorial o 4)
 *  - className: string adicional
 */
export default function ProductGrid({
  products = [],
  loading = false,
  columns = 2,
  className = ''
}) {
  const colClass = `product-grid--cols-${columns}`

  if (loading) {
    return (
      <div className={`product-grid ${colClass} ${className}`}>
        {Array.from({ length: columns === 2 ? 4 : columns * 2 }).map((_, i) => (
          <div key={i} className="product-grid__item">
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    )
  }

  if (!loading && products.length === 0) {
    return (
      <div className="product-grid__empty">
        <p className="display-md" style={{ color: 'var(--color-black-light)' }}>Sin resultados</p>
        <p className="body-sm">No encontramos productos con esos filtros.</p>
      </div>
    )
  }

  return (
    <div className={`product-grid ${colClass} ${className}`}>
      {products.map((product, i) => (
        <div
          key={product.id || i}
          className="product-grid__item"
          style={{ animationDelay: `${i * 35}ms` }}
        >
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  )
}
