import { useState, useEffect, useMemo } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCategories } from '../../hooks/useCategories'
import { supabase } from '../../lib/supabaseClient'
import { useCart } from '../../context/CartContext'
import './Navbar.css'

// Sin marcas hardcodeadas — las marcas vienen ÚNICAMENTE de los productos reales en la BD

export default function Navbar() {
  const { categories } = useCategories()
  const { totalCount, openCart } = useCart()
  const [scrolled, setScrolled]                 = useState(false)
  const [menuOpen, setMenuOpen]                 = useState(false)
  const [searchOpen, setSearchOpen]             = useState(false)
  const [searchQuery, setSearchQuery]           = useState('')
  const [activeGender, setActiveGender]         = useState('todas')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [dynamicBrands, setDynamicBrands]       = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Carga de marcas dinámicas desde inventario para asignarlas a cada categoría
  useEffect(() => {
    supabase
      .from('productos')
      .select('categoria, marca')
      .not('marca', 'is', null)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const map = {}
          data.forEach(p => {
            const cat = p.categoria?.toLowerCase()
            const m = p.marca?.trim()
            if (cat && m) {
              if (!map[cat]) map[cat] = new Set()
              map[cat].add(m)
            }
          })
          const finalMap = {}
          Object.keys(map).forEach(k => {
            finalMap[k] = [...map[k]]
          })
          setDynamicBrands(finalMap)
        }
      })
      .catch(console.error)
  }, [])


  const closeMenu = () => {
    setMenuOpen(false)
    setSelectedCategory(null)
    setActiveGender('todas')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  // Categorías base (SIN "Marcas" en el listado)
  const baseCategories = [
    { slug: 'perfumes',  nombre: 'Perfumes',  sinGenero: false, icon: '/icons/perfume.svg' },
    { slug: 'camisas',   nombre: 'Camisas',   sinGenero: false, icon: '/icons/hoodie.svg'  },
    { slug: 'carteras',  nombre: 'Carteras',  sinGenero: false, icon: '/icons/cartera.svg' },
    { slug: 'sandalias', nombre: 'Sandalias', sinGenero: false, icon: '/icons/sandalia.svg'},
    { slug: 'zapatos',   nombre: 'Zapatos',   sinGenero: false, icon: '/icons/zapato.svg'  },
  ]

  // Combina categorías base con datos de la base de datos (priorizando imagen_sin_fondo del panel admin)
  const displayCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories
        .filter(c => c.slug?.toLowerCase() !== 'marcas')
        .map(c => {
          const fallback = baseCategories.find(bc => bc.slug.toLowerCase() === c.slug?.toLowerCase())
          return {
            ...c,
            nombre: c.nombre,
            slug: c.slug,
            sinGenero: false,
            imagen_sin_fondo: c.imagen_sin_fondo || fallback?.icon || null
          }
        })
    }
    return baseCategories.map(bc => ({
      ...bc,
      imagen_sin_fondo: bc.icon
    }))
  }, [categories])

  // Marcas vienen SOLO de los productos reales ingresados en el inventario
  const getBrandsForCategory = (slug) => {
    return dynamicBrands[slug] || []
  }

  // URL destino según género activo
  const catUrl = (slug, sinGenero) => {
    if (sinGenero || activeGender === 'todas') return `/categoria/${slug}`
    return `/categoria/${slug}/${activeGender}`
  }

  const genderTabs = [
    { id: 'todas',  label: 'Todas'  },
    { id: 'mujer',  label: 'Mujer'  },
    { id: 'hombre', label: 'Hombre' },
  ]

  return (
    <div className={`site-header ${scrolled ? 'site-header--scrolled' : ''}`}>

      {/* Barra anuncios */}
      <div className="navbar__announcement">
        <span className="overline">Envíos a todo el país — Consúltanos</span>
      </div>

      <header className="navbar">
        <div className="navbar__inner container">

          <Link to="/" className="navbar__logo" aria-label="Inicio — S'TILOS GISSEL">
            <img src="/logo_sin_fondo.webp" alt="S'TILOS GISSEL" />
            <span className="navbar__brand-name">S'TILOS GISSEL</span>
          </Link>

          {/* Navegación desktop (sin 'Marcas') */}
          <nav className="navbar__nav" aria-label="Categorias principales">
            {displayCategories.map(cat => (
              <div key={cat.slug} className="navbar__nav-item">
                <NavLink
                  to={`/categoria/${cat.slug}`}
                  className={({ isActive }) =>
                    `navbar__link ${isActive ? 'navbar__link--active' : ''}`
                  }
                >
                  {cat.nombre}
                </NavLink>
                {!cat.sinGenero && (
                  <div className="navbar__dropdown">
                    <NavLink to={`/categoria/${cat.slug}/mujer`} className={({ isActive }) => `navbar__dropdown-link ${isActive ? 'active' : ''}`}>Mujer</NavLink>
                    <NavLink to={`/categoria/${cat.slug}/hombre`} className={({ isActive }) => `navbar__dropdown-link ${isActive ? 'active' : ''}`}>Hombre</NavLink>
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="navbar__actions">
            <button id="navbar-search-btn" className="navbar__action-btn" aria-label="Buscar" onClick={() => setSearchOpen(v => !v)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
            <button
              id="navbar-cart-btn"
              className="navbar__action-btn navbar__cart-btn"
              aria-label={`Carrito de compras (${totalCount} artículos)`}
              onClick={openCart}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {totalCount > 0 && (
                <span className="navbar__cart-badge">{totalCount}</span>
              )}
            </button>
            <button
              id="navbar-menu-btn"
              className={`navbar__burger ${menuOpen ? 'navbar__burger--open' : ''}`}
              aria-label="Menu"
              onClick={() => {
                if (menuOpen) {
                  closeMenu()
                } else {
                  setMenuOpen(true)
                }
              }}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="navbar__search-panel">
            <form onSubmit={handleSearch} className="navbar__search-form">
              <input
                id="navbar-search-input"
                type="search"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                className="navbar__search-input"
                aria-label="Campo de busqueda"
              />
              <button type="submit" className="btn btn-primary" id="navbar-search-submit">Buscar</button>
            </form>
          </div>
        )}
      </header>

      {/* ── MOBILE MENU ──────────────────────────── */}
      <div className={`navbar__mobile-menu ${menuOpen ? 'navbar__mobile-menu--open' : ''}`}>

        {/* Topbar: tabs género + X */}
        <div className="navbar__mobile-topbar">
          <div className="navbar__mobile-gender-tabs">
            {genderTabs.map(tab => (
              <button
                key={tab.id}
                className={`navbar__mobile-gender-tab ${activeGender === tab.id ? 'navbar__mobile-gender-tab--active' : ''}`}
                onClick={() => setActiveGender(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button className="navbar__mobile-x" onClick={closeMenu} aria-label="Cerrar menú">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="navbar__mobile-body">
          {!selectedCategory ? (
            /* VISTA 1: Lista de Categorías con {imagen_sin_fondo} {categoria} (Referencia) */
            <nav aria-label="Menú móvil de categorías" className="navbar__mobile-list">
              {displayCategories.map(cat => (
                <button
                  key={cat.slug}
                  type="button"
                  className="navbar__mobile-list-item"
                  onClick={() => setSelectedCategory(cat)}
                >
                  <div className="navbar__mobile-list-item-left">
                    {cat.imagen_sin_fondo && (
                      <img
                        src={cat.imagen_sin_fondo}
                        alt=""
                        className="navbar__mobile-list-icon"
                      />
                    )}
                    <span className="navbar__mobile-list-name">{cat.nombre}</span>
                  </div>
                  <span className="navbar__mobile-list-arrow">›</span>
                </button>
              ))}
            </nav>
          ) : (
            /* VISTA 2: Sub-menú con Imagen sin fondo y Marcas en 2 columnas (Referencia Imagen 2) */
            <div className="navbar__mobile-subnav">
              {/* Botón Volver */}
              <button
                type="button"
                className="navbar__mobile-back-btn"
                onClick={() => setSelectedCategory(null)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Volver a categorías</span>
              </button>

              {/* Encabezado: {imagen_sin_fondo} {categoria} > (Tocar aquí lleva a todas) */}
              <Link
                to={catUrl(selectedCategory.slug, selectedCategory.sinGenero)}
                className="navbar__mobile-cat-header-link"
                onClick={closeMenu}
                title={`Ver todas en ${selectedCategory.nombre}`}
              >
                <div className="navbar__mobile-cat-header-main">
                  {selectedCategory.imagen_sin_fondo && (
                    <img
                      src={selectedCategory.imagen_sin_fondo}
                      alt=""
                      className="navbar__mobile-cat-header-icon"
                    />
                  )}
                  <span className="navbar__mobile-cat-header-title">
                    {selectedCategory.nombre}
                  </span>
                  <span className="navbar__mobile-cat-header-arrow">›</span>
                </div>
                <span className="navbar__mobile-cat-header-tag">Toca para ver todas</span>
              </Link>


              {/* Grilla de Marcas reales desde inventario */}
              <div className="navbar__mobile-brands-grid">
                {getBrandsForCategory(selectedCategory.slug).length > 0 ? (
                  getBrandsForCategory(selectedCategory.slug).map(marca => (
                    <Link
                      key={marca}
                      to={`${catUrl(selectedCategory.slug, selectedCategory.sinGenero)}?marca=${encodeURIComponent(marca)}`}
                      className="navbar__mobile-brand-link"
                      onClick={closeMenu}
                    >
                      {marca}
                    </Link>
                  ))
                ) : (
                  <span className="navbar__mobile-brands-empty">Sin marcas registradas aún</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay */}
      {menuOpen && (
        <div className="navbar__overlay" onClick={closeMenu} aria-hidden="true" />
      )}
    </div>
  )
}
