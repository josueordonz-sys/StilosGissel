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
  const [selectedBrand, setSelectedBrand] = useState('')
  const [priceFilter, setPriceFilter] = useState('all')

  const isClothing = activeSlug === 'camisas' || activeSlug === 'ropa' || activeSlug === 'hoodies'
  const [columns, setColumns] = useState(isClothing ? 2 : 2)

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

  // Marcas únicas disponibles dentro de esta categoría
  const availableBrands = useMemo(() => {
    return [...new Set(products.map(p => p.marca?.trim()).filter(Boolean))].sort()
  }, [products])

  // Filtrado por marca, margen de precio y ordenamiento
  const sortedProducts = useMemo(() => {
    let list = [...products]

    if (selectedBrand) {
      list = list.filter(p => p.marca?.toLowerCase() === selectedBrand.toLowerCase())
    }

    if (priceFilter === 'under500') {
      list = list.filter(p => (p.precio || 0) <= 500)
    } else if (priceFilter === '500-1000') {
      list = list.filter(p => (p.precio || 0) >= 500 && (p.precio || 0) <= 1000)
    } else if (priceFilter === '1000-2500') {
      list = list.filter(p => (p.precio || 0) >= 1000 && (p.precio || 0) <= 2500)
    } else if (priceFilter === 'over2500') {
      list = list.filter(p => (p.precio || 0) >= 2500)
    }

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
  }, [products, sortBy, selectedBrand, priceFilter])

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

          {/* Contador, Filtros de Marca/Precio y Orden */}
          <div className="category-bar__controls">
            <span className="body-sm category-bar__count">
              {loading ? 'Cargando...' : `${sortedProducts.length} productos`}
            </span>

            {/* Filtro por Marca */}
            {availableBrands.length > 0 && (
              <div className="sort-select-wrap">
                <label htmlFor="brand-select" className="overline visually-hidden">Marca</label>
                <select
                  id="brand-select"
                  value={selectedBrand}
                  onChange={e => setSelectedBrand(e.target.value)}
                  className="sort-select"
                  aria-label="Filtrar por marca"
                >
                  <option value="">Todas las Marcas</option>
                  {availableBrands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro por Margen de Precio */}
            <div className="sort-select-wrap">
              <label htmlFor="price-select" className="overline visually-hidden">Precio</label>
              <select
                id="price-select"
                value={priceFilter}
                onChange={e => setPriceFilter(e.target.value)}
                className="sort-select"
                aria-label="Filtrar por margen de precio"
              >
                <option value="all">Cualquier Precio</option>
                <option value="under500">Hasta L 500</option>
                <option value="500-1000">L 500 – L 1,000</option>
                <option value="1000-2500">L 1,000 – L 2,500</option>
                <option value="over2500">L 2,500+</option>
              </select>
            </div>

            {/* Ordenamiento */}
            <div className="sort-select-wrap">
              <label htmlFor="sort-select" className="overline visually-hidden">
                Ordenar por
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="sort-select"
                aria-label="Ordenar productos"
              >
                <option value="featured">Destacados</option>
                <option value="price-asc">Precio: Menor a Mayor</option>
                <option value="price-desc">Precio: Mayor a Menor</option>
                <option value="name-asc">Nombre: A - Z</option>
              </select>
            </div>

            {/* Selector de Columnas: 2 cols (editorial ropa) | 4 cols */}
            <div className="grid-toggle-wrap" role="group" aria-label="Distribución de la grilla">
              <button
                type="button"
                className={`grid-toggle-btn ${columns === 2 ? 'is-active' : ''}`}
                onClick={() => setColumns(2)}
                title="Ver 2 por columna (estilo ropa)"
                aria-label="2 columnas"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1.5" y="1.5" width="5.5" height="13" rx="0.5" />
                  <rect x="9" y="1.5" width="5.5" height="13" rx="0.5" />
                </svg>
              </button>
              <button
                type="button"
                className={`grid-toggle-btn ${columns === 4 ? 'is-active' : ''}`}
                onClick={() => setColumns(4)}
                title="Ver 4 columnas"
                aria-label="4 columnas"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="1.5" width="2.5" height="13" rx="0.5" />
                  <rect x="5" y="1.5" width="2.5" height="13" rx="0.5" />
                  <rect x="9" y="1.5" width="2.5" height="13" rx="0.5" />
                  <rect x="13" y="1.5" width="2.5" height="13" rx="0.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grilla de Productos Reales */}
      <div className="category-content container section">
        <ProductGrid products={sortedProducts} loading={loading} columns={columns} />
      </div>
    </div>
  )
}
