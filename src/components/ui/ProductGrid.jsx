import './ProductGrid.css'
import ProductCard from './ProductCard'
import ProductCardSkeleton from './ProductCardSkeleton'

/**
 * ProductGrid — Grilla responsiva de productos
 * Props:
 *  - products: array
 *  - loading: bool
 *  - columns: 2|3|4 (default 4)
 */
export default function ProductGrid({ products = [], loading = false, columns = 4 }) {
  if (loading) {
    return (
      <div className={`product-grid product-grid--cols-${columns}`}>
        {Array.from({ length: columns * 2 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
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
    <div className={`product-grid product-grid--cols-${columns}`}>
      {products.map((product, i) => (
        <div
          key={product.id}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  )
}
