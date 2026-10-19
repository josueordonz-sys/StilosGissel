import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import ProductGrid from '../components/ui/ProductGrid'
import './Category.css'

const CATEGORY_META = {
  perfumes: {
    title: 'Perfumes',
    subtitle: 'Extractos & Fragancias de Alta Gama',
    description: 'Notas olfativas intensas, maderas preciosas y flores raras curadas para dejar una estela imborrable.',
    bannerImg: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1600&q=80'
  },
  carteras: {
    title: 'Carteras',
    subtitle: 'Marroquinería & Bolsos Exclusivos',
    description: 'Pieles de origen noble y manufactura artesanal con herrajes duraderos en acabados sobrios.',
    bannerImg: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1600&q=80'
  },
  sandalias: {
    title: 'Sandalias',
    subtitle: 'Calzado Ligero de Verano & Resort',
    description: 'Diseños contemporáneos de tiras precisas, plantillas acolchadas y detalles metálicos discretos.',
    bannerImg: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1600&q=80'
  },
  zapatos: {
    title: 'Zapatos',
    subtitle: 'Calzado de Vestir & Línea Urbana',
    description: 'Zapatos de salón, mocasines y calzado formal confeccionados con altos estándares de confort y estética.',
    bannerImg: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=1600&q=80'
  }
}

export default function Category() {
  const { category = 'perfumes', gender } = useParams()
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState('featured')

  const meta = CATEGORY_META[category.toLowerCase()] || {
    title: category.charAt(0).toUpperCase() + category.slice(1),
    subtitle: 'Colección de Temporada',
    description: 'Descubre nuestra selección exclusiva.',
    bannerImg: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80'
  }

  const { products, loading } = useProducts({
    category,
    gender: gender || null
  })

  // Ordenamiento en cliente
  const sortedProducts = useMemo(() => {
    const list = [...products]
    if (sortBy === 'price-asc') {
      return list.sort((a, b) => (a.precio || 0) - (b.precio || 0))
    }
    if (sortBy === 'price-desc') {
      return list.sort((a, b) => (b.precio || 0) - (a.precio || 0))
    }
    if (sortBy === 'name-asc') {
      return list.sort((a, b) => a.nombre.localeCompare(b.nombre))
    }
    return list
  }, [products, sortBy])

  const handleGenderChange = (newGender) => {
    if (!newGender) {
      navigate(`/categoria/${category}`)
    } else {
      navigate(`/categoria/${category}/${newGender}`)
    }
  }

  return (
    <div className="category-page">
      {/* Banner de categoría */}
      <div className="category-banner">
        <div
          className="category-banner__bg"
          style={{ backgroundImage: `url(${meta.bannerImg})` }}
        />
        <div className="category-banner__overlay" />
        <div className="category-banner__content container">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link to="/" className="breadcrumbs__link">Inicio</Link>
            <span className="breadcrumbs__sep">/</span>
            <Link to={`/categoria/${category}`} className="breadcrumbs__link">
              {meta.title}
            </Link>
            {gender && (
              <>
                <span className="breadcrumbs__sep">/</span>
                <span className="breadcrumbs__current">
                  {gender.charAt(0).toUpperCase() + gender.slice(1)}
                </span>
              </>
            )}
          </nav>

          <span className="overline">{meta.subtitle}</span>
          <h1 className="display-lg category-banner__title">
            {meta.title} {gender ? `— ${gender.charAt(0).toUpperCase() + gender.slice(1)}` : ''}
          </h1>
          <p className="category-banner__desc body-sm">
            {meta.description}
          </p>
        </div>
      </div>

      {/* Barra de Filtros y Ordenamiento */}
      <div className="category-bar">
        <div className="category-bar__inner container">
          {/* Selector de Género */}
          <div className="gender-filters" role="group" aria-label="Filtrar por género">
            <button
              type="button"
              className={`btn btn-ghost ${!gender ? 'active' : ''}`}
              onClick={() => handleGenderChange(null)}
            >
              Todos ({meta.title})
            </button>
            <button
              type="button"
              className={`btn btn-ghost ${gender === 'mujer' ? 'active' : ''}`}
              onClick={() => handleGenderChange('mujer')}
            >
              Mujer
            </button>
            <button
              type="button"
              className={`btn btn-ghost ${gender === 'hombre' ? 'active' : ''}`}
              onClick={() => handleGenderChange('hombre')}
            >
              Hombre
            </button>
          </div>

          {/* Contador y Orden */}
          <div className="category-bar__controls">
            <span className="body-sm category-bar__count">
              {loading ? 'Cargando...' : `${sortedProducts.length} productos`}
            </span>

            <div className="sort-select-wrap">
              <label htmlFor="sort-select" className="overline visually-hidden">
                Ordenar por
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="featured">Destacados</option>
                <option value="price-asc">Precio: Menor a Mayor</option>
                <option value="price-desc">Precio: Mayor a Menor</option>
                <option value="name-asc">Nombre: A - Z</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Grilla de Productos */}
      <div className="category-content container section">
        <ProductGrid products={sortedProducts} loading={loading} columns={4} />
      </div>
    </div>
  )
}
