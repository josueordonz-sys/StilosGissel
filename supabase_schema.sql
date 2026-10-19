-- ============================================================
-- ESTILOS GISSEL — Esquema Completo v2
-- Ejecutar en: https://supabase.com/dashboard/project/yibbhuauimlfabtnacwb/sql
-- ============================================================

-- ============ PROPIETARIOS / CONSIGNATARIOS ============
CREATE TABLE IF NOT EXISTS public.propietarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL,
  telefono TEXT,
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ ROLES ============
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL,
  permisos JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ USUARIOS ADMIN ============
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  clave_hash TEXT NOT NULL,
  rol_id UUID REFERENCES public.roles(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ CATEGORIAS ============
CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  orden INT DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ PRODUCTOS ============
CREATE TABLE IF NOT EXISTS public.productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  marca TEXT,                     -- Marca de la prenda o artículo (Guess, Zara, Shein, etc.)
  genero TEXT NOT NULL CHECK (genero IN ('hombre', 'mujer', 'unisex')),
  precio NUMERIC(10, 2) NOT NULL,
  descripcion TEXT,
  imagen_url TEXT NOT NULL,
  destacado BOOLEAN DEFAULT false,
  nuevo BOOLEAN DEFAULT false,
  publico BOOLEAN DEFAULT false,  -- Casilla: agregar al catálogo público (por defecto false: solo tienda)
  codigo_barra TEXT,              -- Código de barra único por prenda (Code 128 / SKU)
  stock INT DEFAULT 1,
  propietario_id UUID REFERENCES public.propietarios(id) ON DELETE SET NULL,
  qr_code TEXT,                   -- URL o contenido del QR único por prenda
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Migración segura si la tabla ya existía
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS imagen_sin_fondo TEXT;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS marca TEXT;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS codigo_barra TEXT;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS publico BOOLEAN DEFAULT false;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS stock INT DEFAULT 1;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS qr_code TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productos' AND column_name = 'propietario_id'
  ) THEN
    ALTER TABLE public.productos ADD COLUMN propietario_id UUID REFERENCES public.propietarios(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============ ZONAS DE COBRO ============
CREATE TABLE IF NOT EXISTS public.zonas_cobro (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  responsable TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices únicos seguros para evitar errores en tablas existentes
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_nombre ON public.roles (nombre);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_slug ON public.categorias (slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_propietarios_nombre ON public.propietarios (nombre);
CREATE UNIQUE INDEX IF NOT EXISTS idx_zonas_cobro_nombre ON public.zonas_cobro (nombre);

-- ============ VENTAS (cobros) ============
CREATE TABLE IF NOT EXISTS public.ventas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
  nombre_producto TEXT NOT NULL,        -- snapshot del nombre al vender
  precio_venta NUMERIC(10, 2) NOT NULL,
  propietario_id UUID REFERENCES public.propietarios(id) ON DELETE SET NULL,
  nombre_propietario TEXT,              -- snapshot
  zona_cobro_id UUID REFERENCES public.zonas_cobro(id) ON DELETE SET NULL,
  nombre_zona TEXT,                     -- snapshot
  canal TEXT DEFAULT 'tienda' CHECK (canal IN ('tienda', 'online')),
  notas TEXT,
  fecha_venta TIMESTAMPTZ DEFAULT now()
);

-- ============ PEDIDOS ONLINE (dominio público) ============
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
  nombre_producto TEXT NOT NULL,
  precio NUMERIC(10, 2) NOT NULL,
  nombre_cliente TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  notas TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmado','enviado','entregado','cancelado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ RLS ============
ALTER TABLE public.propietarios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zonas_cobro      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos          ENABLE ROW LEVEL SECURITY;

-- Políticas PÚBLICAS (lectura para catálogo)
DROP POLICY IF EXISTS "pub_categorias"  ON public.categorias;
CREATE POLICY "pub_categorias"  ON public.categorias  FOR SELECT TO anon, authenticated USING (activo = true);

DROP POLICY IF EXISTS "pub_productos"   ON public.productos;
CREATE POLICY "pub_productos"   ON public.productos   FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pub_insert_pedidos" ON public.pedidos;
CREATE POLICY "pub_insert_pedidos" ON public.pedidos FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Políticas ADMIN (gestión total — anon para dev, en prod usar service_role o auth)
DROP POLICY IF EXISTS "admin_all_categorias"  ON public.categorias;
CREATE POLICY "admin_all_categorias"  ON public.categorias  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_all_productos"   ON public.productos;
CREATE POLICY "admin_all_productos"   ON public.productos   FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_all_propietarios" ON public.propietarios;
CREATE POLICY "admin_all_propietarios" ON public.propietarios FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_all_zonas"       ON public.zonas_cobro;
CREATE POLICY "admin_all_zonas"       ON public.zonas_cobro  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_all_ventas"      ON public.ventas;
CREATE POLICY "admin_all_ventas"      ON public.ventas       FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_all_pedidos"     ON public.pedidos;
CREATE POLICY "admin_all_pedidos"     ON public.pedidos      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_all_roles"       ON public.roles;
CREATE POLICY "admin_all_roles"       ON public.roles        FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_all_users"       ON public.admin_users;
CREATE POLICY "admin_all_users"       ON public.admin_users  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ STORAGE ============
INSERT INTO storage.buckets (id, name, public)
SELECT 'productos', 'productos', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'productos');

DROP POLICY IF EXISTS "pub_read_imgs"   ON storage.objects;
CREATE POLICY "pub_read_imgs"   ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'productos');
DROP POLICY IF EXISTS "admin_insert_imgs" ON storage.objects;
CREATE POLICY "admin_insert_imgs" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'productos');
DROP POLICY IF EXISTS "admin_delete_imgs" ON storage.objects;
CREATE POLICY "admin_delete_imgs" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'productos');

-- ============ DATOS INICIALES ============
-- Roles base
INSERT INTO public.roles (nombre, permisos)
SELECT 'super_admin', '{"dashboard":true,"inventario":true,"categorias":true,"ventas":true,"pedidos":true,"zonas":true,"roles":true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE nombre = 'super_admin');

INSERT INTO public.roles (nombre, permisos)
SELECT 'vendedor', '{"dashboard":true,"inventario":false,"categorias":false,"ventas":true,"pedidos":true,"zonas":false,"roles":false}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE nombre = 'vendedor');

INSERT INTO public.roles (nombre, permisos)
SELECT 'bodeguero', '{"dashboard":false,"inventario":true,"categorias":false,"ventas":false,"pedidos":false,"zonas":false,"roles":false}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE nombre = 'bodeguero');

-- Categorías iniciales
INSERT INTO public.categorias (slug, nombre, descripcion, imagen_url, orden)
SELECT 'perfumes', 'Perfumes', 'Extractos y fragancias exclusivas.', 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1600&q=80', 1
WHERE NOT EXISTS (SELECT 1 FROM public.categorias WHERE slug = 'perfumes');

INSERT INTO public.categorias (slug, nombre, descripcion, imagen_url, orden)
SELECT 'carteras', 'Carteras', 'Marroquinería de alta distinción.', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1600&q=80', 2
WHERE NOT EXISTS (SELECT 1 FROM public.categorias WHERE slug = 'carteras');

INSERT INTO public.categorias (slug, nombre, descripcion, imagen_url, orden)
SELECT 'sandalias', 'Sandalias', 'Calzado ligero y sofisticado.', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1600&q=80', 3
WHERE NOT EXISTS (SELECT 1 FROM public.categorias WHERE slug = 'sandalias');

INSERT INTO public.categorias (slug, nombre, descripcion, imagen_url, orden)
SELECT 'zapatos', 'Zapatos', 'Calzado formal y de vestir.', 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=1600&q=80', 4
WHERE NOT EXISTS (SELECT 1 FROM public.categorias WHERE slug = 'zapatos');

-- Propietarios iniciales exclusivos
INSERT INTO public.propietarios (nombre, notas)
SELECT 'Tienda Gissel', 'Prendas propias de Tienda Gissel'
WHERE NOT EXISTS (SELECT 1 FROM public.propietarios WHERE nombre = 'Tienda Gissel');

INSERT INTO public.propietarios (nombre, notas)
SELECT 'Tienda Shein', 'Prendas de Tienda Shein'
WHERE NOT EXISTS (SELECT 1 FROM public.propietarios WHERE nombre = 'Tienda Shein');

-- Zona de cobro por defecto
INSERT INTO public.zonas_cobro (nombre, descripcion, responsable)
SELECT 'Caja Principal', 'Punto de venta principal de la tienda', 'Gissel'
WHERE NOT EXISTS (SELECT 1 FROM public.zonas_cobro WHERE nombre = 'Caja Principal');