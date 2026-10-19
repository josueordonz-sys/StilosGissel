import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCategories } from '../../hooks/useCategories'
import './Navbar.css'

export default function Navbar() {
  const { categories } = useCategories()
  const [scrolled, setScrolled]       = useState(false)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [searchOpen, setSearchOpen]   = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <>
      {/* Barra superior */}
      <div className="navbar__announcement">
        <span className="overline">Envios a todo el pais — Consultanos</span>
      </div>

      <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
        <div className="navbar__inner container">

          {/* Logo */}
          <Link to="/" className="navbar__logo" aria-label="Inicio — Estilos Gissel">
            <img src="/logo_sin_fondo.webp" alt="Estilos Gissel" />
          </Link>

          {/* Navegacion central dinamica */}
          <nav className="navbar__nav" aria-label="Categorias principales">
            {categories.map(cat => (
              <div key={cat.slug} className="navbar__nav-item">
                <NavLink
                  to={`/${cat.slug}`}
                  className={({ isActive }) =>
                    `navbar__link ${isActive ? 'navbar__link--active' : ''}`
                  }
                >
                  {cat.nombre}
                </NavLink>
                {/* Mega menu genero */}
                <div className="navbar__dropdown">
                  <NavLink
                    to={`/${cat.slug}/mujer`}
                    className="navbar__dropdown-link"
                  >
                    Mujer
                  </NavLink>
                  <NavLink
                    to={`/${cat.slug}/hombre`}
                    className="navbar__dropdown-link"
                  >
                    Hombre
                  </NavLink>
                </div>
              </div>
            ))}
          </nav>

          {/* Acciones */}
          <div className="navbar__actions">
            <button
              id="navbar-search-btn"
              className="navbar__action-btn"
              aria-label="Buscar"
              onClick={() => setSearchOpen(v => !v)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>

            {/* Burger mobile */}
            <button
              id="navbar-menu-btn"
              className={`navbar__burger ${menuOpen ? 'navbar__burger--open' : ''}`}
              aria-label="Menu"
              onClick={() => setMenuOpen(v => !v)}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>

        {/* Search panel */}
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
              <button type="submit" className="btn btn-primary" id="navbar-search-submit">
                Buscar
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile menu dinamico */}
      <div className={`navbar__mobile-menu ${menuOpen ? 'navbar__mobile-menu--open' : ''}`}>
        <nav aria-label="Menu movil">
          {categories.map(cat => (
            <div key={cat.slug} className="navbar__mobile-category">
              <Link
                to={`/${cat.slug}`}
                className="navbar__mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                {cat.nombre}
              </Link>
              <div className="navbar__mobile-sub">
                <Link
                  to={`/${cat.slug}/mujer`}
                  className="navbar__mobile-sublink"
                  onClick={() => setMenuOpen(false)}
                >
                  Mujer
                </Link>
                <Link
                  to={`/${cat.slug}/hombre`}
                  className="navbar__mobile-sublink"
                  onClick={() => setMenuOpen(false)}
                >
                  Hombre
                </Link>
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Overlay mobile */}
      {menuOpen && (
        <div
          className="navbar__overlay"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}
