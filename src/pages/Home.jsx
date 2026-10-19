import { Link } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import ProductGrid from '../components/ui/ProductGrid'
import './Home.css'

const CATEGORY_CARDS = [
  {
    slug: 'perfumes',
    title: 'Perfumes',
    subtitle: 'Extractos & Fragancias Exclusivas',
    image: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1000&q=80'
  },
  {
    slug: 'carteras',
    title: 'Carteras',
    subtitle: 'Pieles Italianas & Herrajes Nobles',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=80'
  },
  {
    slug: 'sandalias',
    title: 'Sandalias',
    subtitle: 'Siluetas Ligeras & Sofisticadas',
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1000&q=80'
  },
  {
    slug: 'zapatos',
    title: 'Zapatos',
    subtitle: 'Calzado Formal & Contemporáneo',
    image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=1000&q=80'
  }
]

export default function Home() {
  const { products: featuredProducts, loading: loadingFeatured } = useProducts({ featured: true, limit: 4 })
  const { products: newArrivals, loading: loadingNew } = useProducts({ limit: 4 })

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero__background">
          <div className="hero__overlay" />
        </div>
        <div className="hero__content container">
          <div className="hero__badge">
            <span className="overline">Nueva Coleccion 2026</span>
          </div>
          <h1 className="display-xl hero__title">
            DRESS YOUR<br />MOMENT.
          </h1>
          <p className="hero__description">
            Piezas atemporales pensadas para perdurar. Perfumería nicho, marroquinería y calzado con acabados de alta distinción.
          </p>
          <div className="hero__actions">
            <Link to="/categoria/perfumes" className="btn btn-primary">
              Explorar Catalogo
            </Link>
            <Link to="/categoria/carteras/mujer" className="btn btn-outline">
              Coleccion Mujer
            </Link>
          </div>

          <div className="hero__features">
            <div className="hero__feature-item">
              <span className="overline">Estilo Curado</span>
              <p className="body-sm">Selección exclusiva y cuidada</p>
            </div>
            <div className="hero__feature-item">
              <span className="overline">Alta Gama</span>
              <p className="body-sm">Materiales y notas auténticas</p>
            </div>
            <div className="hero__feature-item">
              <span className="overline">Atencion Privada</span>
              <p className="body-sm">Asesoramiento personalizado</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías Principales */}
      <section className="section container">
        <div className="section-header">
          <div>
            <span className="overline">Explora por linea</span>
            <h2 className="display-lg">Categorias Esenciales</h2>
          </div>
        </div>

        <div className="categories-grid">
          {CATEGORY_CARDS.map(cat => (
            <div key={cat.slug} className="category-card">
              <div className="category-card__image-wrap">
                <img src={cat.image} alt={cat.title} className="category-card__image" loading="lazy" />
                <div className="category-card__overlay" />
              </div>
              <div className="category-card__content">
                <span className="overline">{cat.subtitle}</span>
                <h3 className="category-card__title display-md">{cat.title}</h3>
                <div className="category-card__links">
                  <Link to={`/categoria/${cat.slug}/mujer`} className="category-card__link">
                    Mujer
                  </Link>
                  <span className="category-card__divider">/</span>
                  <Link to={`/categoria/${cat.slug}/hombre`} className="category-card__link">
                    Hombre
                  </Link>
                  <span className="category-card__divider">/</span>
                  <Link to={`/categoria/${cat.slug}`} className="category-card__link category-card__link--all">
                    Ver Todo
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Curated The Edit */}
      <section className="section section--dark">
        <div className="container">
          <div className="section-header section-header--split">
            <div>
              <span className="overline">The Edit</span>
              <h2 className="display-lg">Curated. Stylish. You.</h2>
            </div>
            <Link to="/categoria/perfumes" className="btn btn-ghost">
              Ver Todo el Catalogo
            </Link>
          </div>

          <ProductGrid products={featuredProducts} loading={loadingFeatured} columns={4} />
        </div>
      </section>

      {/* Banner Editorial Duo: Mujer / Hombre */}
      <section className="section container">
        <div className="duo-banner">
          <div className="duo-banner__item">
            <img
              src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80"
              alt="Colección Mujer"
              className="duo-banner__image"
              loading="lazy"
            />
            <div className="duo-banner__content">
              <span className="overline">Exclusivo</span>
              <h3 className="display-md">Coleccion Mujer</h3>
              <p className="body-sm">Siluetas etéreas, marroquinería y esencias envolventes.</p>
              <Link to="/categoria/carteras/mujer" className="btn btn-outline">
                Ver Coleccion
              </Link>
            </div>
          </div>

          <div className="duo-banner__item">
            <img
              src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=80"
              alt="Colección Hombre"
              className="duo-banner__image"
              loading="lazy"
            />
            <div className="duo-banner__content">
              <span className="overline">Distinción</span>
              <h3 className="display-md">Coleccion Hombre</h3>
              <p className="body-sm">Cortes sobrios, cueros de grano y fragancias amaderadas.</p>
              <Link to="/categoria/zapatos/hombre" className="btn btn-outline">
                Ver Coleccion
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recién Llegados */}
      <section className="section container">
        <div className="section-header section-header--split">
          <div>
            <span className="overline">Recien Llegados</span>
            <h2 className="display-lg">Novedades de la Temporada</h2>
          </div>
          <Link to="/categoria/sandalias" className="btn btn-ghost">
            Explorar Mas
          </Link>
        </div>

        <ProductGrid products={newArrivals} loading={loadingNew} columns={4} />
      </section>
    </div>
  )
}
