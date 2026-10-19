import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export const DEFAULT_CATEGORIES = [
  {
    slug: 'perfumes',
    nombre: 'Perfumes',
    descripcion: 'Extractos & Fragancias Exclusivas',
    imagen_url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1000&q=80',
    orden: 1
  },
  {
    slug: 'carteras',
    nombre: 'Carteras',
    descripcion: 'Pieles Italianas & Herrajes Nobles',
    imagen_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=80',
    orden: 2
  },
  {
    slug: 'sandalias',
    nombre: 'Sandalias',
    descripcion: 'Siluetas Ligeras & Sofisticadas',
    imagen_url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1000&q=80',
    orden: 3
  },
  {
    slug: 'zapatos',
    nombre: 'Zapatos',
    descripcion: 'Calzado Formal & Contemporáneo',
    imagen_url: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=1000&q=80',
    orden: 4
  }
]

export function useCategories() {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: sbError } = await supabase
        .from('categorias')
        .select('*')
        .order('orden', { ascending: true })

      if (sbError || !data || data.length === 0) {
        setCategories(DEFAULT_CATEGORIES)
      } else {
        setCategories(data)
      }
    } catch (err) {
      setCategories(DEFAULT_CATEGORIES)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return { categories, loading, error, refetch: fetchCategories }
}
