import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export const DEFAULT_CATEGORIES = [
  {
    slug: 'perfumes',
    nombre: 'Perfumes',
    descripcion: 'Extractos & Fragancias Exclusivas',
    imagen_url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1000&q=80',
    imagen_sin_fondo: '/icons/perfume.svg',
    orden: 1
  },
  {
    slug: 'camisas',
    nombre: 'Camisas',
    descripcion: 'Prendas & Streetwear Contemporáneo',
    imagen_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80',
    imagen_sin_fondo: '/icons/hoodie.svg',
    orden: 2
  },
  {
    slug: 'carteras',
    nombre: 'Carteras',
    descripcion: 'Pieles Italianas & Herrajes Nobles',
    imagen_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=80',
    imagen_sin_fondo: '/icons/cartera.svg',
    orden: 3
  },
  {
    slug: 'sandalias',
    nombre: 'Sandalias',
    descripcion: 'Siluetas Ligeras & Sofisticadas',
    imagen_url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1000&q=80',
    imagen_sin_fondo: '/icons/sandalia.svg',
    orden: 4
  },
  {
    slug: 'zapatos',
    nombre: 'Zapatos',
    descripcion: 'Calzado Formal & Contemporáneo',
    imagen_url: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=1000&q=80',
    imagen_sin_fondo: '/icons/zapato.svg',
    orden: 5
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
        const mapped = data.map(dbCat => {
          const fallback = DEFAULT_CATEGORIES.find(d => d.slug?.toLowerCase() === dbCat.slug?.toLowerCase())
          return {
            ...dbCat,
            imagen_sin_fondo: dbCat.imagen_sin_fondo || fallback?.imagen_sin_fondo || null
          }
        })
        setCategories(mapped)
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
