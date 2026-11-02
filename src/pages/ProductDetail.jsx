import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useProduct, useProducts } from '../hooks/useProducts'
import { useCart } from '../context/CartContext'
import ProductGrid from '../components/ui/ProductGrid'
import './ProductDetail.css'

export default function ProductDetail() {
  const { id } = useParams()
  const { product, loading } = useProduct(id)
  const { addToCart } = useCart()

  // Modo de ajuste de imagen: 'cover' (editorial) o 'contain' (sin recorte / completa)
  const [fitMode, setFitMode] = useState('cover')
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  // Cerrar lightbox con tecla Escape y bloquear scroll de fondo
  useEffect(() => {
    if (!isLightboxOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsLightboxOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isLightboxOpen])

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

  const storeBase =
    typeof window !== 'undefined' &&
    window.location.hostname &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')
      ? window.location.origin
      : 'https://estilosgissel.com'

  const productUrl = `${storeBase}/producto/${product.id}`
  const tallaInfo = product.talla ? ` (Talla: ${product.talla})` : ''
  const whatsappMessage = encodeURIComponent(
    `Hola S'TILOS GISSEL, deseo consultar disponibilidad de la prenda:\n• *${product.nombre}*${tallaInfo}\n• Ver prenda: ${productUrl}`
  )
  const whatsappUrl = `https://api.whatsapp.com/send?phone=50497941476&text=${whatsappMessage}`
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')

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
          {/* Galería / Imagen con controles para ver completa sin recorte */}
          <div className="product-detail__gallery">
            <div
              className={`product-detail__main-image-wrap ${fitMode === 'contain' ? 'product-detail__main-image-wrap--contain' : ''}`}
              onClick={() => setIsLightboxOpen(true)}
              title="Haz clic para ver la prenda en pantalla completa"
            >
              {/* Botones flotantes sobre la foto */}
              <div className="product-detail__image-badges" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className={`product-detail__image-btn ${fitMode === 'contain' ? 'active' : ''}`}
                  onClick={() => setFitMode(f => f === 'cover' ? 'contain' : 'cover')}
                  title={fitMode === 'cover' ? 'Ver foto completa sin recortes' : 'Volver a vista ajustada'}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {fitMode === 'cover' ? (
                      <>
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </>
                    ) : (
                      <>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18" />
                        <path d="M9 21V9" />
                      </>
                    )}
                  </svg>
                  <span>{fitMode === 'cover' ? 'Ver completa' : 'Llenar'}</span>
                </button>

                <button
                  type="button"
                  className="product-detail__image-btn"
                  onClick={() => setIsLightboxOpen(true)}
                  title="Abrir a pantalla completa"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                  <span>Zoom</span>
                </button>
              </div>

              <img
                src={product.imagen_url}
                alt={product.nombre}
                className={`product-detail__main-image product-detail__main-image--${fitMode}`}
              />
            </div>

            {/* Barra de herramientas accesible debajo de la foto */}
            <div className="product-detail__image-toolbar">
              <button
                type="button"
                className={`product-detail__tool-btn ${fitMode === 'contain' ? 'active' : ''}`}
                onClick={() => setFitMode(f => f === 'cover' ? 'contain' : 'cover')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                {fitMode === 'cover' ? 'Ver foto sin recorte' : 'Vista editorial'}
              </button>

              <button
                type="button"
                className="product-detail__tool-btn"
                onClick={() => setIsLightboxOpen(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
                Pantalla completa
              </button>
            </div>
          </div>

          {/* Información */}
          <div className="product-detail__info">
            <div className="product-detail__meta">
              {product.marca && <span className="tag tag--brand">{product.marca}</span>}
              {product.talla && <span className="tag tag--size">Talla: {product.talla}</span>}
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
              <p>{product.descripcion || 'Pieza seleccionada con los más altos estándares de calidad y sofisticación de S’TILOS GISSEL.'}</p>
            </div>

            {/* Acciones */}
            <div className="product-detail__actions">
              <button
                type="button"
                className="btn btn-primary product-detail__btn-order"
                onClick={() => addToCart(product, null, 1, true)}
                id="btn-add-to-cart-detail"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: '6px' }}>
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                Agregar a la Bolsa
              </button>
              <a
                href={whatsappUrl}
                target={isMobile ? '_self' : '_blank'}
                rel="noopener noreferrer"
                className="btn btn-outline product-detail__btn-order"
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

      {/* Modal Lightbox para ver la imagen 100% completa sin recortes */}
      {isLightboxOpen && (
        <div
          className="product-lightbox"
          onClick={() => setIsLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada de la prenda"
        >
          <button
            type="button"
            className="product-lightbox__close"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Cerrar vista completa"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className="product-lightbox__content" onClick={e => e.stopPropagation()}>
            <img
              src={product.imagen_url}
              alt={product.nombre}
              className="product-lightbox__img"
            />
            <div className="product-lightbox__caption">
              <strong>{product.nombre}</strong>
              {product.marca && ` • ${product.marca}`}
              {product.talla && ` • Talla: ${product.talla}`}
              {formattedPrice && ` • ${formattedPrice}`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
