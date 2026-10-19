import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Hook modular para obtener productos reales exclusivamente desde Supabase.
 * Soporta filtros dinámicos por categoría, género, destacados y búsqueda por texto.
 */
export function useProducts(filters = {}) {
  const { category, gender, search, featured, limit, minPrice, maxPrice, marca } = filters
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase.from('productos').select('*').order('created_at', { ascending: false })

      if (category && category !== 'todos') {
        query = query.ilike('categoria', category)
      }
      if (gender && gender !== 'todos') {
        query = query.ilike('genero', gender)
      }
      if (marca && marca !== 'todas') {
        query = query.ilike('marca', marca)
      }
      if (featured) {
        query = query.eq('destacado', true)
      }
      if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
        const minVal = parseFloat(minPrice)
        if (!isNaN(minVal)) query = query.gte('precio', minVal)
      }
      if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
        const maxVal = parseFloat(maxPrice)
        if (!isNaN(maxVal)) query = query.lte('precio', maxVal)
      }
      if (search && search.trim()) {
        const s = search.trim()
        query = query.or(`nombre.ilike.%${s}%,descripcion.ilike.%${s}%,marca.ilike.%${s}%`)
      }
      if (limit) {
        query = query.limit(limit)
      }
      if (!filters.includePrivate) {
        // En catálogo público solo mostrar los marcados como públicos (o legados sin definir)
        query = query.or('publico.eq.true,publico.is.null')
      }

      const { data, error: supabaseError } = await query

      if (supabaseError) {
        console.warn('Error al consultar Supabase:', supabaseError.message)
        setError(supabaseError.message)
        setProducts([])
      } else {
        setProducts(data || [])
      }
    } catch (err) {
      console.warn('Error de conexion Supabase:', err)
      setError(err.message)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [category, gender, search, featured, limit, minPrice, maxPrice, marca])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return { products, loading, error, refetch: fetchProducts }
}

/**
 * Hook para obtener un único producto por ID desde Supabase
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
          setError(supabaseError?.message || 'Producto no encontrado')
          setProduct(null)
        } else {
          setProduct(data)
        }
      } catch (err) {
        setError(err.message)
        setProduct(null)
      } finally {
        setLoading(false)
      }
    }

    getProduct()
  }, [id])

  return { product, loading, error }
}
