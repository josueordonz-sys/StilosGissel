import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import { useCategories } from '../hooks/useCategories'
import ProductGrid from '../components/ui/ProductGrid'
import './Category.css'

export default function Category() {
  const { category, categorySlug, gender } = useParams()
  const activeSlug = (categorySlug || category || 'perfumes').toLowerCase()
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState('featured')

  const { categories } = useCategories()
  const currentCategory = categories.find(c => c.slug.toLowerCase() === activeSlug)

  const meta = {
    title: currentCategory?.nombre || activeSlug.charAt(0).toUpperCase() + activeSlug.slice(1),
    subtitle: currentCategory?.descripcion || 'Coleccion de Temporada',
    description: currentCategory?.descripcion || 'Explora nuestra linea exclusiva de piezas seleccionadas.',
    bannerImg: currentCategory?.imagen_url || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80'
  }

  const { products, loading } = useProducts({
    category: activeSlug,
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
      navigate(`/${activeSlug}`)
    } else {
      navigate(`/${activeSlug}/${newGender}`)
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
            <Link to={`/${activeSlug}`} className="breadcrumbs__link">
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

          <span className="overline">Linea Exclusiva</span>
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

      {/* Grilla de Productos Reales */}
      <div className="category-content container section">
        <ProductGrid products={sortedProducts} loading={loading} columns={4} />
      </div>
    </div>
  )
}
