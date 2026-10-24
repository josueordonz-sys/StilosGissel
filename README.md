# Estilos Gissel

Plataforma de moda premium — Perfumes, Carteras, Sandalias y Zapatos para hombre y mujer.

## Stack

- React 18 + Vite
- React Router DOM v6
- Supabase (base de datos y autenticación)
- Vercel (despliegue)

## Configuración local

1. Clona el repositorio
2. Copia `.env.example` a `.env` y rellena las variables
3. Instala dependencias: `npm install`
4. Corre el servidor de desarrollo: `npm run dev`

## Variables de entorno

Crea un archivo `.env` en la raíz con:

```
VITE_SUPABASE_URL=tu_url
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

## Categorías

- Perfumes (Mujer / Hombre)
- Carteras (Mujer / Hombre)
- Sandalias (Mujer / Hombre)
- Zapatos (Mujer / Hombre)

## Despliegue

1. Push a GitHub
2. Conectar repositorio en Vercel
3. Agregar variables de entorno en Vercel Dashboard

Vercel usa `vercel.json` para enviar las rutas de React Router a la aplicación. Así `/admin` y sus subrutas abren directamente y sobreviven una recarga. Después del despliegue, prueba `/admin`, `/admin/inventario` y `/admin/ventas` en la URL de Vercel.
