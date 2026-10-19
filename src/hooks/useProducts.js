import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Hook modular para obtener productos reales desde Supabase.
 * Soporta filtros dinámicos por categoría, género, destacados y búsqueda por texto.
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
      let query = supabase.from('productos').select('*').order('created_at', { ascending: false })

      if (category && category !== 'todos') {
        query = query.ilike('categoria', category)
      }
      if (gender && gender !== 'todos') {
        query = query.ilike('genero', gender)
      }
      if (featured) {
        query = query.eq('destacado', true)
      }
      if (search && search.trim()) {
        const s = search.trim()
        query = query.or(`nombre.ilike.%${s}%,descripcion.ilike.%${s}%`)
      }
      if (limit) {
        query = query.limit(limit)
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
  }, [category, gender, search, featured, limit])

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

        if (supabaseError) {
          setError(supabaseError.message)
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
