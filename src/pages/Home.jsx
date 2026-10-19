import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useProducts } from '../hooks/useProducts'
import { useCategories } from '../hooks/useCategories'
import ProductGrid from '../components/ui/ProductGrid'
import './Home.css'

export default function Home() {
  const { categories } = useCategories()

  // Filtros interactivos por margen de precio y marca en el index
  const [selectedCat, setSelectedCat] = useState('todas')
  const [selectedMarca, setSelectedMarca] = useState('todas')
  const [selectedGender, setSelectedGender] = useState('todos')
  const [pricePreset, setPricePreset] = useState('all')
  const [customMin, setCustomMin] = useState('')
  const [customMax, setCustomMax] = useState('')
  const [availableMarcas, setAvailableMarcas] = useState([])

  // Cargar marcas únicas registradas en los productos
  useEffect(() => {
    supabase
      .from('productos')
      .select('marca')
      .not('marca', 'is', null)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const unique = [...new Set(data.map(p => p.marca?.trim()).filter(Boolean))].sort()
          setAvailableMarcas(unique)
        }
      })
      .catch(console.error)
  }, [])

  // Calcular rango de precio según preset seleccionado
  const { minPrice, maxPrice } = useMemo(() => {
    if (pricePreset === 'under500')  return { minPrice: 0,    maxPrice: 500 }
    if (pricePreset === '500-1000')  return { minPrice: 500,  maxPrice: 1000 }
    if (pricePreset === '1000-2500') return { minPrice: 1000, maxPrice: 2500 }
    if (pricePreset === 'over2500')  return { minPrice: 2500, maxPrice: '' }
    if (pricePreset === 'custom')    return { minPrice: customMin, maxPrice: customMax }
    return { minPrice: '', maxPrice: '' }
  }, [pricePreset, customMin, customMax])

  // Consulta dinámica de productos según los filtros seleccionados
  const { products: filteredCatalog, loading: loadingCatalog } = useProducts({
    category: selectedCat === 'todas' ? null : selectedCat,
    gender: selectedGender === 'todos' ? null : selectedGender,
    marca: selectedMarca === 'todas' ? null : selectedMarca,
    minPrice,
    maxPrice,
    limit: 12
  })

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
            <Link to="/perfumes" className="btn btn-primary">
              Explorar Catalogo
            </Link>
            <Link to="/carteras/mujer" className="btn btn-outline">
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

      {/* Categorías Dinámicas */}
      <section className="section container">
        <div className="section-header">
          <div>
            <span className="overline">Explora por linea</span>
            <h2 className="display-lg">Categorias Esenciales</h2>
          </div>
        </div>

        <div className="categories-grid">
          {categories.map(cat => (
            <div key={cat.slug} className="category-card">
              <Link
                to={`/categoria/${cat.slug}`}
                className="category-card__image-wrap"
                aria-label={`Ver colección de ${cat.nombre}`}
              >
                <img src={cat.imagen_url} alt={cat.nombre} className="category-card__image" loading="lazy" />
                <div className="category-card__overlay" />
              </Link>
              <div className="category-card__content">
                <span className="overline">{cat.descripcion || 'Coleccion Exclusiva'}</span>
                <Link to={`/categoria/${cat.slug}`} className="category-card__title-link">
                  <h3 className="category-card__title display-md">{cat.nombre}</h3>
                </Link>
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

      {/* Explorador con Margen de Precio, Marca y Categoría */}
      <section className="section container home-explorer">
        <div className="section-header section-header--split">
          <div>
            <span className="overline">Filtro a Medida</span>
            <h2 className="display-lg">Buscar por Margen de Precio</h2>
            <p className="body-sm" style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Filtra por presupuesto, categoría (Carteras, Perfumes...) y marcas exclusivas.
            </p>
          </div>
          <span className="body-sm" style={{ fontWeight: 600, color: 'var(--color-gold-dark)' }}>
            {loadingCatalog ? 'Buscando...' : `${filteredCatalog.length} piezas encontradas`}
          </span>
        </div>

        {/* Controles de Filtro Glassmorphism */}
        <div className="explorer-controls">
          {/* Fila 1: Margen de Precio con Pills */}
          <div className="explorer-price-row">
            <span className="overline" style={{ fontSize: '0.65rem', letterSpacing: '0.15em' }}>
              Margen de Precio:
            </span>
            <div className="explorer-pills">
              <button
                type="button"
                className={`explorer-pill ${pricePreset === 'all' ? 'active' : ''}`}
                onClick={() => setPricePreset('all')}
              >
                Todos los Precios
              </button>
              <button
                type="button"
                className={`explorer-pill ${pricePreset === 'under500' ? 'active' : ''}`}
                onClick={() => setPricePreset('under500')}
              >
                Hasta L 500
              </button>
              <button
                type="button"
                className={`explorer-pill ${pricePreset === '500-1000' ? 'active' : ''}`}
                onClick={() => setPricePreset('500-1000')}
              >
                L 500 – L 1,000
              </button>
              <button
                type="button"
                className={`explorer-pill ${pricePreset === '1000-2500' ? 'active' : ''}`}
                onClick={() => setPricePreset('1000-2500')}
              >
                L 1,000 – L 2,500
              </button>
              <button
                type="button"
                className={`explorer-pill ${pricePreset === 'over2500' ? 'active' : ''}`}
                onClick={() => setPricePreset('over2500')}
              >
                L 2,500+
              </button>
              <button
                type="button"
                className={`explorer-pill ${pricePreset === 'custom' ? 'active' : ''}`}
                onClick={() => setPricePreset('custom')}
              >
                Personalizado
              </button>
            </div>
          </div>

          {/* Rango de precio personalizado */}
          {pricePreset === 'custom' && (
            <div className="explorer-custom-price">
              <div className="explorer-input-wrap">
                <label htmlFor="explorer-min-price" className="overline">Mínimo (L.)</label>
                <input
                  id="explorer-min-price"
                  name="minPrice"
                  type="number"
                  min="0"
                  step="50"
                  placeholder="0"
                  value={customMin}
                  onChange={e => setCustomMin(e.target.value)}
                  className="explorer-input"
                />
              </div>
              <span className="explorer-dash">—</span>
              <div className="explorer-input-wrap">
                <label htmlFor="explorer-max-price" className="overline">Máximo (L.)</label>
                <input
                  id="explorer-max-price"
                  name="maxPrice"
                  type="number"
                  min="0"
                  step="50"
                  placeholder="5000"
                  value={customMax}
                  onChange={e => setCustomMax(e.target.value)}
                  className="explorer-input"
                />
              </div>
            </div>
          )}

          {/* Fila 2: Selectores de Categoría, Marca y Género */}
          <div className="explorer-selects-row">
            {/* Categoría */}
            <div className="explorer-select-group">
              <label htmlFor="explorer-category" className="overline">Categoría</label>
              <select
                id="explorer-category"
                name="category"
                value={selectedCat}
                onChange={e => setSelectedCat(e.target.value)}
                className="sort-select"
              >
                <option value="todas">Todas las Categorías</option>
                {categories.map(c => (
                  <option key={c.slug} value={c.slug}>{c.nombre}</option>
                ))}
              </select>
            </div>

            {/* Marca */}
            <div className="explorer-select-group">
              <label htmlFor="explorer-brand" className="overline">Marca</label>
              <select
                id="explorer-brand"
                name="brand"
                value={selectedMarca}
                onChange={e => setSelectedMarca(e.target.value)}
                className="sort-select"
              >
                <option value="todas">Todas las Marcas</option>
                {availableMarcas.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Género */}
            <div className="explorer-select-group">
              <label htmlFor="explorer-gender" className="overline">Género</label>
              <select
                id="explorer-gender"
                name="gender"
                value={selectedGender}
                onChange={e => setSelectedGender(e.target.value)}
                className="sort-select"
              >
                <option value="todos">Todos los Géneros</option>
                <option value="mujer">Mujer</option>
                <option value="hombre">Hombre</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grilla de Productos Filtrados con {marca}{genero}{descripcion}{precio} */}
        <ProductGrid products={filteredCatalog} loading={loadingCatalog} columns={4} />
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
              <Link to="/carteras/mujer" className="btn btn-outline">
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
              <Link to="/zapatos/hombre" className="btn btn-outline">
                Ver Coleccion
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

