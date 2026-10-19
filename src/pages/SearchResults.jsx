import { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import ProductGrid from '../components/ui/ProductGrid'
import './SearchResults.css'

const CATEGORIES = [
  { slug: 'todos', label: 'Todas las categorias' },
  { slug: 'perfumes', label: 'Perfumes' },
  { slug: 'carteras', label: 'Carteras' },
  { slug: 'sandalias', label: 'Sandalias' },
  { slug: 'zapatos', label: 'Zapatos' }
]

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [categoryFilter, setCategoryFilter] = useState('todos')
  const [genderFilter, setGenderFilter] = useState('todos')
  const [searchInput, setSearchInput] = useState(query)

  const { products, loading } = useProducts({ search: query })

  // Filtros adicionales en cliente
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = categoryFilter === 'todos' || p.categoria.toLowerCase() === categoryFilter.toLowerCase()
      const matchGen = genderFilter === 'todos' || p.genero?.toLowerCase() === genderFilter.toLowerCase()
      return matchCat && matchGen
    })
  }, [products, categoryFilter, genderFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() })
    }
  }

  return (
    <div className="search-page container section">
      {/* Cabecera de búsqueda */}
      <div className="search-header">
        <span className="overline">Explorador de Catalogo</span>
        <h1 className="display-lg search-title">
          {query ? `Resultados para "${query}"` : 'Busqueda en Catalogo'}
        </h1>

        {/* Formulario de búsqueda directa */}
        <form onSubmit={handleSearchSubmit} className="search-form-page">
          <input
            type="search"
            name="search"
            aria-label="Buscar productos"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre, marca (Guess, Zara...), articulo..."
            className="search-input-page"
            id="page-search-input"
          />
          <button type="submit" className="btn btn-primary" id="page-search-submit">
            Buscar
          </button>
        </form>
      </div>

      {/* Filtros */}
      <div className="search-filters">
        <div className="search-filters__group">
          <span className="overline">Categoria:</span>
          <div className="search-filters__buttons">
            {CATEGORIES.map(cat => (
              <button
                key={cat.slug}
                type="button"
                className={`btn btn-ghost ${categoryFilter === cat.slug ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat.slug)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="search-filters__group">
          <span className="overline">Genero:</span>
          <div className="search-filters__buttons">
            <button
              type="button"
              className={`btn btn-ghost ${genderFilter === 'todos' ? 'active' : ''}`}
              onClick={() => setGenderFilter('todos')}
            >
              Todos
            </button>
            <button
              type="button"
              className={`btn btn-ghost ${genderFilter === 'mujer' ? 'active' : ''}`}
              onClick={() => setGenderFilter('mujer')}
            >
              Mujer
            </button>
            <button
              type="button"
              className={`btn btn-ghost ${genderFilter === 'hombre' ? 'active' : ''}`}
              onClick={() => setGenderFilter('hombre')}
            >
              Hombre
            </button>
          </div>
        </div>
      </div>

      {/* Barra de conteo */}
      <div className="search-bar-count">
        <span className="body-sm">
          {loading ? 'Buscando...' : `${filteredProducts.length} productos encontrados`}
        </span>
      </div>

      {/* Grilla */}
      <ProductGrid products={filteredProducts} loading={loading} columns={4} />
    </div>
  )
}
