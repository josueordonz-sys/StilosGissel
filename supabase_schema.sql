-- ============================================================
-- ESTILOS GISSEL — Esquema de Base de Datos para Supabase
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/yibbhuauimlfabtnacwb/sql
-- ============================================================

-- 1. Crear tabla de productos
CREATE TABLE IF NOT EXISTS public.productos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('perfumes', 'carteras', 'sandalias', 'zapatos')),
  genero TEXT NOT NULL CHECK (genero IN ('hombre', 'mujer', 'unisex')),
  precio NUMERIC(10, 2) NOT NULL,
  descripcion TEXT,
  imagen_url TEXT NOT NULL,
  destacado BOOLEAN DEFAULT false,
  nuevo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- 3. Crear política de lectura pública (lectura para visitantes anónimos)
DROP POLICY IF EXISTS "Permitir lectura publica de productos" ON public.productos;
CREATE POLICY "Permitir lectura publica de productos"
  ON public.productos
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. Insertar datos semilla (Seed Data)
INSERT INTO public.productos (id, nombre, categoria, genero, precio, descripcion, imagen_url, destacado, nuevo)
VALUES
  -- PERFUMES MUJER
  ('perfume-f-01', 'Ébène & Vanille Absolue', 'perfumes', 'mujer', 2850.00, 'Extracto de perfume oriental especiado con notas profundas de vainilla de Madagascar, ámbar negro e incienso amaderado.', 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80', true, true),
  ('perfume-f-02', 'Santal Impérial', 'perfumes', 'mujer', 3100.00, 'Aroma seductor a sándalo blanco, jazmín nocturno y toques de bergamota italiana con fondo almizclado.', 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80', true, false),
  ('perfume-f-03', 'Rose Noire Privée', 'perfumes', 'mujer', 2950.00, 'Rosa damascena envuelta en cuero suave, azafrán y pachulí oscuro para una estela inconfundible.', 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=800&q=80', false, true),

  -- PERFUMES HOMBRE
  ('perfume-m-01', 'Oud Royale Noir', 'perfumes', 'hombre', 3400.00, 'Composición majestuosa de oud ahumado, cedro del Atlas y pimienta negra con toques de cardamomo.', 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80', true, true),
  ('perfume-m-02', 'Cuir & Vétiver Sauvage', 'perfumes', 'hombre', 2990.00, 'Vétiver de Haití matizado con cuero curtido, nuez moscada y resina de mirra.', 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80', false, false),
  ('perfume-m-03', 'Ambre Nocturne', 'perfumes', 'hombre', 3250.00, 'Fragancia nocturna intensa con resinas cálidas, haba tonka tostada y tabaco rubio.', 'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=800&q=80', true, false),

  -- CARTERAS MUJER
  ('cartera-f-01', 'Tote Minimaliste Cuero Negro', 'carteras', 'mujer', 2450.00, 'Cartera tote estructurada en piel granulada genuina con herrajes en acabado latón dorado pulido.', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80', true, true),
  ('cartera-f-02', 'Crossbody Monogramme Dore', 'carteras', 'mujer', 1980.00, 'Bandolera compacta con cadena trenzada en tono dorado mate y cierre imantado de alta precisión.', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80', false, true),
  ('cartera-f-03', 'Clutch Soirée Noir', 'carteras', 'mujer', 1750.00, 'Bolso de mano rígido para eventos de noche en satén estructurado y ribete metálico dorado.', 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80', true, false),

  -- CARTERAS HOMBRE
  ('cartera-m-01', 'Portadocumentos Milano', 'carteras', 'hombre', 2890.00, 'Maletín ejecutivo ultraplano de cuero negro texturizado con detalles metálicos oscurecidos.', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80', true, true),
  ('cartera-m-02', 'Billetera Bifold Cuero Premium', 'carteras', 'hombre', 890.00, 'Billetera delgada en piel vacuna suave con costuras reforzadas a tono y grabado sutil.', 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80', false, false),
  ('cartera-m-03', 'Mochila Urbana de Piel', 'carteras', 'hombre', 3150.00, 'Mochila estructurada de alta gama con compartimento para portátil y cremalleras doradas sobrias.', 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=800&q=80', false, true),

  -- SANDALIAS MUJER
  ('sandalia-f-01', 'Sandalias T-Strap Doradas', 'sandalias', 'mujer', 1450.00, 'Sandalias planas minimalistas con tiras finas de cuero pulido y aplique central dorado discreto.', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80', true, true),
  ('sandalia-f-02', 'Mule Slide Noir & Gold', 'sandalias', 'mujer', 1690.00, 'Mule de piel negra con tacón geométrico bajo y hebilla cepillada en oro mate.', 'https://images.unsplash.com/photo-1562273138-f46be4ebdf33?auto=format&fit=crop&w=800&q=80', true, false),
  ('sandalia-f-03', 'Sandalia Ankle Wrap Clásica', 'sandalias', 'mujer', 1590.00, 'Silueta atemporal con tiras envolventes en tobillo y plantilla acolchada para máxima comodidad.', 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=800&q=80', false, true),

  -- SANDALIAS HOMBRE
  ('sandalia-m-01', 'Sandalias Doble Correa Cuero', 'sandalias', 'hombre', 1390.00, 'Sandalias casuales en piel engrasada de alta durabilidad con hebillas metálicas acabado bronce dorado.', 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=800&q=80', true, true),
  ('sandalia-m-02', 'Slide de Piel Nubuck', 'sandalias', 'hombre', 1250.00, 'Pala ancha acolchada en piel nubuck sobre base anatómica forrada en piel suave.', 'https://images.unsplash.com/photo-1575537302964-96cd47c06b1b?auto=format&fit=crop&w=800&q=80', false, false),

  -- ZAPATOS MUJER
  ('zapato-f-01', 'Stiletto Escarpin Noir', 'zapatos', 'mujer', 2200.00, 'Zapato de salón en ante negro con puntera afilada y tacón fino balanceado.', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80', true, true),
  ('zapato-f-02', 'Mocasin Penny con Detalle Dorado', 'zapatos', 'mujer', 2100.00, 'Mocasín de silueta clásica en cuero brillante con antifaz adornado con barra dorada.', 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80', true, false),
  ('zapato-f-03', 'Botín Chelsea de Piel', 'zapatos', 'mujer', 2650.00, 'Botín versátil en piel vacuna con elásticos laterales y suela cosida reforzada.', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80', false, true),

  -- ZAPATOS HOMBRE
  ('zapato-m-01', 'Oxford Cap Toe Imperial', 'zapatos', 'hombre', 3100.00, 'Zapato formal de cordones confeccionado artesanalmente en piel de becerro de grano fino.', 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80', true, true),
  ('zapato-m-02', 'Mocasin Horsebit Oro Viejo', 'zapatos', 'hombre', 2850.00, 'Mocasín de vestir con herraje dorado sobrio sobre empeine de piel suave pulida a mano.', 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80', true, false),
  ('zapato-m-03', 'Sneaker Minimalista de Cuero Negro', 'zapatos', 'hombre', 2350.00, 'Calzado urbano elegante con líneas puras, piel lisa prémium y suela de perfil bajo en negro mate.', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80', false, true)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  categoria = EXCLUDED.categoria,
  genero = EXCLUDED.genero,
  precio = EXCLUDED.precio,
  descripcion = EXCLUDED.descripcion,
  imagen_url = EXCLUDED.imagen_url,
  destacado = EXCLUDED.destacado,
  nuevo = EXCLUDED.nuevo;
