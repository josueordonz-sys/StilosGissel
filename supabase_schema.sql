-- ============================================================
-- ESTILOS GISSEL — Esquema de Base de Datos para Supabase
-- Base limpia para datos reales (sin productos falsos)
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/yibbhuauimlfabtnacwb/sql
-- ============================================================

-- 1. Tabla dinámica de Categorías
CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  orden INT DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Productos (sin restricciones fijas de categoría para permitir creación dinámica)
CREATE TABLE IF NOT EXISTS public.productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  genero TEXT NOT NULL CHECK (genero IN ('hombre', 'mujer', 'unisex')),
  precio NUMERIC(10, 2) NOT NULL,
  descripcion TEXT,
  imagen_url TEXT NOT NULL,
  destacado BOOLEAN DEFAULT false,
  nuevo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de lectura pública para visitantes
DROP POLICY IF EXISTS "Lectura publica categorias" ON public.categorias;
CREATE POLICY "Lectura publica categorias"
  ON public.categorias FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Lectura publica productos" ON public.productos;
CREATE POLICY "Lectura publica productos"
  ON public.productos FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Políticas de gestión (creación, edición y borrado para admin/usuarios autenticados o anon con clave)
DROP POLICY IF EXISTS "Gestion total categorias" ON public.categorias;
CREATE POLICY "Gestion total categorias"
  ON public.categorias FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Gestion total productos" ON public.productos;
CREATE POLICY "Gestion total productos"
  ON public.productos FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Insertar las 4 Categorías iniciales dinámicas
INSERT INTO public.categorias (slug, nombre, descripcion, imagen_url, orden)
VALUES
  ('perfumes', 'Perfumes', 'Extractos y fragancias exclusivas para dama y caballero.', 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1600&q=80', 1),
  ('carteras', 'Carteras', 'Marroquinería de alta distinción, totes, clutches y portadocumentos.', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1600&q=80', 2),
  ('sandalias', 'Sandalias', 'Calzado ligero y sofisticado con herrajes sobrios.', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1600&q=80', 3),
  ('zapatos', 'Zapatos', 'Calzado formal, stilettos, mocasines y zapatos de vestir.', 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=1600&q=80', 4)
ON CONFLICT (slug) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  imagen_url = EXCLUDED.imagen_url,
  orden = EXCLUDED.orden;

-- NOTA: La tabla productos queda 100% vacía y limpia para que ingreses tus productos reales desde el panel administrativo.
