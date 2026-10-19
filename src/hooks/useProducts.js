import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { MOCK_PRODUCTS } from '../data/mockProducts'

/**
 * Hook modular para obtener productos con filtros de categoría, género, búsqueda y destacados.
 * Consulta primero Supabase; si la tabla no existe o está vacía, usa los datos locales de respaldo.
 */
export function useProducts(filters = {}) {
  const { category, gender, search, featured, limit } = filters
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase.from('productos').select('*')

      if (category) {
        query = query.ilike('categoria', category)
      }
      if (gender) {
        query = query.ilike('genero', gender)
      }
      if (featured) {
        query = query.eq('destacado', true)
      }
      if (search) {
        query = query.or(`nombre.ilike.%${search}%,descripcion.ilike.%${search}%`)
      }
      if (limit) {
        query = query.limit(limit)
      }

      const { data, error: supabaseError } = await query

      if (supabaseError || !data || data.length === 0) {
        // Fallback a MOCK_PRODUCTS con los mismos filtros
        let filtered = [...MOCK_PRODUCTS]

        if (category) {
          const catNorm = category.toLowerCase()
          filtered = filtered.filter(p => p.categoria.toLowerCase() === catNorm)
        }
        if (gender) {
          const genNorm = gender.toLowerCase()
          filtered = filtered.filter(p => p.genero.toLowerCase() === genNorm)
        }
        if (featured) {
          filtered = filtered.filter(p => p.destacado)
        }
        if (search) {
          const s = search.toLowerCase()
          filtered = filtered.filter(
            p => p.nombre.toLowerCase().includes(s) || p.descripcion.toLowerCase().includes(s)
          )
        }
        if (limit) {
          filtered = filtered.slice(0, limit)
        }

        setProducts(filtered)
      } else {
        setProducts(data)
      }
    } catch (err) {
      // En caso de cualquier error de conexión o configuración, aplicar mock
      let filtered = [...MOCK_PRODUCTS]
      if (category) filtered = filtered.filter(p => p.categoria.toLowerCase() === category.toLowerCase())
      if (gender) filtered = filtered.filter(p => p.genero.toLowerCase() === gender.toLowerCase())
      if (featured) filtered = filtered.filter(p => p.destacado)
      if (search) {
        const s = search.toLowerCase()
        filtered = filtered.filter(
          p => p.nombre.toLowerCase().includes(s) || p.descripcion.toLowerCase().includes(s)
        )
      }
      if (limit) filtered = filtered.slice(0, limit)
      setProducts(filtered)
    } finally {
      setLoading(false)
    }
  }, [category, gender, search, featured, limit])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return { products, loading, error, refetch: fetchProducts }
}

/**
 * Hook para obtener un único producto por ID
 */
export function useProduct(id) {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return

    async function getProduct() {
      setLoading(true)
      try {
        const { data, error: supabaseError } = await supabase
          .from('productos')
          .select('*')
          .eq('id', id)
          .single()

        if (supabaseError || !data) {
          const found = MOCK_PRODUCTS.find(p => String(p.id) === String(id))
          setProduct(found || null)
        } else {
          setProduct(data)
        }
      } catch (err) {
        const found = MOCK_PRODUCTS.find(p => String(p.id) === String(id))
        setProduct(found || null)
      } finally {
        setLoading(false)
      }
    }

    getProduct()
  }, [id])

  return { product, loading, error }
}
