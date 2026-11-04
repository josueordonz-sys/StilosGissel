import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { sanitizeSearchQuery } from '../lib/security'
import { filterProductsBySearchQuery } from '../lib/intelligentSearch'

/**
 * Hook modular para obtener productos reales exclusivamente desde Supabase.
 * Soporta filtros dinámicos por categoría, género, destacados y búsqueda por texto protegida contra inyección.
 */
export function useProducts(filters = {}) {
  const { category, gender, search, featured, limit, minPrice, maxPrice, marca, talla } = filters
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase.from('productos').select('*').order('created_at', { ascending: false })

      if (category && category !== 'todos') {
        const cleanCat = sanitizeSearchQuery(category, 50)
        if (cleanCat) query = query.ilike('categoria', cleanCat)
      }
      if (gender && gender !== 'todos') {
        const cleanGender = sanitizeSearchQuery(gender, 30)
        if (cleanGender) query = query.ilike('genero', cleanGender)
      }
      if (marca && marca !== 'todas') {
        const cleanMarca = sanitizeSearchQuery(marca, 50)
        if (cleanMarca) query = query.ilike('marca', cleanMarca)
      }
      if (talla && talla !== 'todas') {
        const cleanTalla = sanitizeSearchQuery(talla, 20)
        if (cleanTalla) query = query.ilike('talla', cleanTalla)
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
      if (limit && !search) {
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
        let result = data || []
        // Aplicar motor de búsqueda inteligente multi-término, fonético y morfológico
        if (search && search.trim()) {
          result = filterProductsBySearchQuery(result, search)
        }
        if (limit && limit > 0) {
          result = result.slice(0, limit)
        }
        setProducts(result)
      }
    } catch (err) {
      console.warn('Error de conexion Supabase:', err)
      setError(err.message)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [category, gender, search, featured, limit, minPrice, maxPrice, marca, talla])

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
