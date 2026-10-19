import { useParams, Link } from 'react-router-dom'
import { useProduct, useProducts } from '../hooks/useProducts'
import ProductGrid from '../components/ui/ProductGrid'
import './ProductDetail.css'

export default function ProductDetail() {
  const { id } = useParams()
  const { product, loading } = useProduct(id)

  const { products: relatedProducts, loading: loadingRelated } = useProducts({
    category: product?.categoria,
    limit: 4
  })

  // Excluir el producto actual de los relacionados
  const filteredRelated = relatedProducts.filter(p => String(p.id) !== String(id)).slice(0, 4)

  if (loading) {
    return (
      <div className="product-detail-page container section">
        <div className="product-detail__loading">
          <div className="skeleton" style={{ width: '100%', height: '500px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="skeleton" style={{ width: '40%', height: '24px' }} />
            <div className="skeleton" style={{ width: '80%', height: '48px' }} />
            <div className="skeleton" style={{ width: '30%', height: '32px' }} />
            <div className="skeleton" style={{ width: '100%', height: '120px' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="product-detail-page container section product-detail__notfound">
        <h1 className="display-lg">Producto no encontrado</h1>
        <p className="body-sm">El articulo que buscas no existe o fue retirado de catalogo.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
          Volver al Inicio
        </Link>
      </div>
    )
  }

  const formattedPrice = product.precio
    ? `L. ${Number(product.precio).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`
    : null

  // Mensaje de consulta formal sin emojis
  const whatsappMessage = encodeURIComponent(
    `Hola Estilos Gissel. Deseo consultar disponibilidad del producto: ${product.nombre} (Referencia: ${product.id}).`
  )
  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`

  return (
    <div className="product-detail-page">
      <div className="container section">
        {/* Migas de pan */}
        <nav className="breadcrumbs" aria-label="Migas de pan">
          <Link to="/" className="breadcrumbs__link">Inicio</Link>
          <span className="breadcrumbs__sep">/</span>
          <Link to={`/categoria/${product.categoria}`} className="breadcrumbs__link">
            {product.categoria.charAt(0).toUpperCase() + product.categoria.slice(1)}
          </Link>
          {product.genero && (
            <>
              <span className="breadcrumbs__sep">/</span>
              <Link to={`/categoria/${product.categoria}/${product.genero}`} className="breadcrumbs__link">
                {product.genero.charAt(0).toUpperCase() + product.genero.slice(1)}
              </Link>
            </>
          )}
          <span className="breadcrumbs__sep">/</span>
          <span className="breadcrumbs__current">{product.nombre}</span>
        </nav>

        {/* Detalle principal */}
        <div className="product-detail__layout">
          {/* Galería / Imagen */}
          <div className="product-detail__gallery">
            <div className="product-detail__main-image-wrap">
              <img
                src={product.imagen_url}
                alt={product.nombre}
                className="product-detail__main-image"
              />
            </div>
          </div>

          {/* Información */}
          <div className="product-detail__info">
            <div className="product-detail__meta">
              <span className="overline">{product.categoria}</span>
              {product.genero && <span className="tag">{product.genero}</span>}
            </div>

            <h1 className="display-lg product-detail__title">{product.nombre}</h1>

            {formattedPrice && (
              <p className="product-detail__price">{formattedPrice}</p>
            )}

            <div className="gold-line" />

            <div className="product-detail__desc">
              <h2 className="overline">Descripcion</h2>
              <p>{product.descripcion || 'Pieza seleccionada con los mas altos estandares de calidad y sofisticacion de Estilos Gissel.'}</p>
            </div>

            {/* Acciones */}
            <div className="product-detail__actions">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary product-detail__btn-order"
                id="btn-whatsapp-inquire"
              >
                Consultar Disponibilidad
              </a>
              <Link
                to={`/categoria/${product.categoria}`}
                className="btn btn-outline"
              >
                Ver Mas en {product.categoria}
              </Link>
            </div>

            {/* Garantías y Servicios */}
            <div className="product-detail__perks">
              <div className="perk-item">
                <span className="perk-item__title overline">Autenticidad Garantizada</span>
                <p className="body-sm">Piezas 100% genuinas verificadas por nuestro equipo.</p>
              </div>
              <div className="perk-item">
                <span className="perk-item__title overline">Envios Seguros</span>
                <p className="body-sm">Entregas con empaque especial y numero de rastreo.</p>
              </div>
              <div className="perk-item">
                <span className="perk-item__title overline">Atencion Directa</span>
                <p className="body-sm">Asistencia personalizada en tallas y recomendaciones.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Productos Relacionados */}
      {filteredRelated.length > 0 && (
        <section className="section section--dark">
          <div className="container">
            <div className="section-header">
              <span className="overline">Recomendaciones</span>
              <h2 className="display-lg">Piezas Complementarias</h2>
            </div>
            <ProductGrid products={filteredRelated} loading={loadingRelated} columns={4} />
          </div>
        </section>
      )}
    </div>
  )
}
