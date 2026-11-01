# PROYECTO.md — Memoria Viva del Proyecto: S'TILOS GISSEL

> 🚨 **DIRECTIVA OBLIGATORIA DE MEMORIA CONTINUA:**  
> **CADA CAMBIO, ACTUALIZACIÓN, CORRECCIÓN O NUEVA CARACTERÍSTICA QUE SE REALI VERIFIQUE O MODIFIQUE EN EL PROYECTO DEBE REGISTRARSE Y NOTIFICARSE INMEDIATAMENTE EN ESTE ARCHIVO (`PROYECTO.md`).**  
> Este documento es la **memoria viva y permanente de todo lo que pasa en el proyecto**. El objetivo es que en las próximas actualizaciones cualquier IDE, asistente de IA o desarrollador consulte primero este `.md` para comprender todo el estado actual sin tener que reescanear todos los archivos del proyecto. Todo cambio debe quedar reflejado aquí.

---

## 1. Resumen General

| Campo | Valor |
|---|---|
| **Nombre del proyecto** | S'TILOS GISSEL |
| **Tipo** | Tienda de moda (ropa, carteras, perfumes, calzado) — Honduras |
| **Stack** | React 18 + Vite 5 + Supabase (PostgreSQL + Storage) |
| **Hosting** | Vercel (auto-deploy desde GitHub `main`) |
| **Dominio público** | `https://estilosgissel.com` |
| **Repo GitHub** | `josueordonz-sys/StilosGissel` (rama `main`) |
| **WhatsApp oficial** | `+504 9794-1476` → número E.164: `50497941476` |
| **Directorio local** | `/Users/erlinordonez/Downloads/estilogissel` |

---

## 2. Variables de Entorno

> ⚠️ **REGLA DE SEGURIDAD:** NUNCA escribir valores reales de claves o tokens en este archivo ni en ningún archivo rastreado por Git.

Estructura requerida en archivo local `.env`:

```env
VITE_SUPABASE_URL=https://<id-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-supabase-anon-key>
```

> **IMPORTANTE:** `VITE_PUBLIC_SITE_URL` **NO existe** en `.env` ni en Vercel. No usarla jamás.
> Siempre obtener el dominio con `window.location.origin` con fallback `'https://estilosgissel.com'`.

---

## 3. Estructura de Archivos

```
estilogissel/
├── index.html                        ← Open Graph meta tags para WhatsApp preview
├── vite.config.js                    ← Alias @, proxy /storage-img → Supabase (dev)
├── vercel.json                       ← Rewrites: /storage-img y SPA catch-all
├── PROYECTO.md                       ← ESTE ARCHIVO (memoria del proyecto)
├── package.json                      ← React 18, react-router-dom v6, @supabase/supabase-js
├── .env                              ← VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
│
└── src/
    ├── main.jsx                      ← Punto de entrada React
    ├── App.jsx                       ← Router principal (tienda + admin)
    ├── index.css                     ← Variables CSS globales, tokens de diseño
    │
    ├── lib/
    │   └── supabaseClient.js         ← Singleton Supabase
    │
    ├── context/
    │   └── CartContext.jsx           ← Carrito global (localStorage)
    │
    ├── hooks/
    │   ├── useProducts.js            ← Consulta productos con filtros dinámicos
    │   ├── useCategories.js          ← Categorías con fallback hardcoded
    │   └── useAdminAuth.js           ← Auth simple con clave + sessionStorage
    │
    ├── utils/
    │   └── barcodeGenerator.js       ← EAN-13 SVG + QR con logo (sin dependencias)
    │
    ├── assets/img/
    │   ├── logo.webp
    │   └── logo_sin_fondo.webp       ← Usado en etiquetas de prenda
    │
    ├── components/
    │   ├── admin/
    │   │   ├── AdminAuthGate.jsx     ← Pantalla de login admin
    │   │   ├── AdminLayout.jsx       ← Layout del panel admin (sidebar + outlet)
    │   │   └── AdminLayout.css       ← Estilos admin, incluye .a-form-row-4
    │   │
    │   └── ui/
    │       ├── CartDrawer.jsx        ← ⭐ Carrito lateral + mensaje WhatsApp
    │       ├── CartDrawer.css
    │       ├── ProductCard.jsx       ← Tarjeta de producto con badge de talla
    │       ├── ProductCard.css
    │       ├── ProductGrid.jsx       ← Grid responsive de tarjetas
    │       ├── ProductGrid.css
    │       ├── ProductCardSkeleton.jsx
    │       ├── ProductCardSkeleton.css
    │       ├── ImageUploader.jsx     ← Upload a Supabase Storage
    │       └── ImageUploader.css
    │
    ├── pages/
    │   ├── Home.jsx                  ← Index público con filtros (precio, marca, talla, género)
    │   ├── ProductDetail.jsx         ← Detalle de producto + "Consultar Disponibilidad" WhatsApp
    │   ├── Category.jsx              ← Listado por categoría/género
    │   ├── SearchResults.jsx         ← Resultados de búsqueda por texto
    │   ├── NotFound.jsx
    │   │
    │   └── admin/
    │       ├── AdminDashboard.jsx    ← Resumen estadístico del negocio
    │       ├── AdminInventario.jsx   ← ⭐ CRUD de productos con talla, QR, barcode
    │       ├── AdminCategorias.jsx   ← CRUD de categorías
    │       ├── AdminVentas.jsx       ← Registro de ventas
    │       ├── AdminPedidos.jsx      ← Pedidos pendientes
    │       ├── AdminHistorial.jsx    ← Historial completo
    │       ├── AdminRoles.jsx        ← Gestión de roles/usuarios
    │       └── AdminRestricted.jsx   ← Página de acceso denegado
    │
    └── data/
        └── mockProducts.js           ← Datos de prueba (no usados en producción)
```

---

## 4. Base de Datos Supabase

### Tabla `productos`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, auto |
| `nombre` | `text` | Requerido |
| `marca` | `text` | Opcional |
| `talla` | `text` | ⚠️ Columna nueva. Si no existe: `ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS talla TEXT;` |
| `categoria` | `text` | Slug (ej: `carteras`, `perfumes`) |
| `genero` | `text` | `mujer` / `hombre` / `unisex` |
| `precio` | `numeric` | En Lempiras (HNL) |
| `descripcion` | `text` | Opcional |
| `imagen_url` | `text` | URL pública de Supabase Storage |
| `stock` | `integer` | Unidades |
| `destacado` | `boolean` | Aparece en sección hero/inicio |
| `nuevo` | `boolean` | Badge "Nuevo" en tarjeta |
| `publico` | `boolean` | `false` por defecto → solo tienda física; `true` → visible en web |
| `codigo_barra` | `text` | EAN-13 auto-generado |
| `qr_code` | `text` | URL del producto para QR |
| `propietario_id` | `uuid / text` | FK a tabla `propietarios` |
| `created_at` | `timestamptz` | Auto |

### Tabla `categorias`

| Columna | Tipo |
|---|---|
| `slug` | `text` |
| `nombre` | `text` |
| `descripcion` | `text` |
| `imagen_url` | `text` |
| `imagen_sin_fondo` | `text` |
| `orden` | `integer` |

### Tabla `propietarios`

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `nombre` | `text` |
| `activo` | `boolean` |

**Propietarios exclusivos (hardcoded):** `Tienda Gissel`, `Tienda Shein`

### Supabase Storage

- **Bucket:** `productos`
- **URL base pública:** `https://yibbhuauimlfabtnacwb.supabase.co/storage/v1/object/public/productos/uploads/<filename>`
- **URL limpia (proxy):** `https://estilosgissel.com/storage-img/uploads/<filename>`

---

## 5. Routing (App.jsx)

```
/                       → Home.jsx
/buscar                 → SearchResults.jsx
/producto/:id           → ProductDetail.jsx
/categoria/:category    → Category.jsx
/categoria/:cat/:gender → Category.jsx
/:categorySlug          → Category.jsx (ruta corta)
/:categorySlug/:gender  → Category.jsx
/admin                  → AdminDashboard (requiere auth)
/admin/inventario       → AdminInventario
/admin/categorias       → AdminCategorias
/admin/ventas           → AdminVentas
/admin/pedidos          → AdminPedidos
/admin/roles            → AdminRoles
/admin/historial        → AdminHistorial
/admin-restringido      → AdminRestricted
```

**Subdomain Admin:** Si hostname = `admin.estilosgissel.com` → solo panel admin sin Navbar/Footer público.

**QueryAdminGuard:** Si alguien intenta `?admin` en el dominio público → redirige a `/admin-restringido`.

---

## 6. Autenticación Admin

Archivo: `src/hooks/useAdminAuth.js`

- **Clave de acceso:** `Gissel2026`
- **Persistencia:** `sessionStorage('eg_admin_session', 'true')`
- **Auto-autorizado en:** `localhost`, `127.0.0.1`, subdominio `admin.*`

---

## 7. Proxy de Imágenes `/storage-img`

### Por qué existe
Para que las URLs de imágenes muestren `estilosgissel.com` en vez de `supabase.co` (mensajes WhatsApp, vista pública).

### vercel.json (producción)
```json
{
  "rewrites": [
    {
      "source": "/storage-img/:path*",
      "destination": "https://yibbhuauimlfabtnacwb.supabase.co/storage/v1/object/public/productos/:path*"
    },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### vite.config.js (desarrollo local)
```js
proxy: {
  '/storage-img': {
    target: 'https://yibbhuauimlfabtnacwb.supabase.co/storage/v1/object/public/productos',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/storage-img/, '')
  }
}
```

### Patrón de conversión en código
```js
const origin = (typeof window !== 'undefined' && window.location.origin)
  ? window.location.origin
  : 'https://estilosgissel.com'

const cleanImgUrl = rawImg.replace(
  /^https?:\/\/[^/]+\/storage\/v1\/object\/public\/productos/,
  `${origin}/storage-img`
)
// https://yibbhuauimlfabtnacwb.supabase.co/storage/v1/object/public/productos/uploads/foto.jpg
// → https://estilosgissel.com/storage-img/uploads/foto.jpg
```

---

## 8. Carrito y Mensaje WhatsApp

### Constantes en CartDrawer.jsx
```js
const WHATSAPP_NUMBER = '50497941476'    // E.164 sin +
const WHATSAPP_DISPLAY = '+504 9794-1476'
```

### Cuentas bancarias (BANK_ACCOUNTS)

| Banco | Número | Titular |
|---|---|---|
| Banco Atlántida | `2020022320` | Marco Tulio Membreño Espinoza |
| BAC Credomatic | `744722671` | Elsi Siomara Gomez Chinchilla |
| BANPAIS | `216350229804` | Quengdy Yadira Hernandez |
| Ficohsa | `200018397896` | Francisca Enma Chinchilla Villeda |
| DAVIVIENDA | `3091324014` | Elsi Siomara Gomez Chinchilla |
| Banco de Occidente | `219040148584` | Elsi Siomara Gomez Chinchilla |

### Formato del mensaje WhatsApp (generateWhatsAppUrl)

```
*NUEVO PEDIDO — S'TILOS GISSEL*
━━━━━━━━━━━━━━━━━━━━━
*Cliente:* +504 89556950
━━━━━━━━━━━━━━━━━━━━━

*DETALLE DEL PEDIDO:*

1. *Nombre del producto*
   • Marca: (si aplica y no está en el nombre)
   • Talla: X (si aplica)
   • Color: (si aplica)
   • Cantidad: 1
   • Subtotal: L. 3,000.00
https://estilosgissel.com/storage-img/uploads/foto.jpg   ← URL sola (WhatsApp auto-preview)

━━━━━━━━━━━━━━━━━━━━━
*TOTAL A PAGAR: L. 3,000.00*
━━━━━━━━━━━━━━━━━━━━━

Hola S'TILOS GISSEL, deseo consultar disponibilidad y coordinar el envío de mi pedido.
```

### Reglas del mensaje WhatsApp (NUNCA romper)

- ❌ **SIN emojis** (ni 📱 ni 💳 ni 🛍️)
- ❌ **SIN "Método de pago"**
- ❌ **SIN "Ver prenda:" / "Ver en tienda:"** — link del producto eliminado
- ✅ La imagen va **sola en su propia línea** (sin etiqueta) → WhatsApp genera preview automático
- ✅ Endpoint: `https://api.whatsapp.com/send?phone=50497941476&text=...` (NO `wa.me`)
- ✅ En **móvil** → `window.location.href`; en **desktop** → `window.open(..., '_blank')` pre-abierto sincrónicamente

### Modos de pago del CartDrawer

| Modo | Comportamiento |
|---|---|
| `'whatsapp'` | Pedido directo → genera mensaje de NUEVO PEDIDO |
| `'transfer'` | Muestra cuentas bancarias → genera mensaje de CONFIRMACIÓN DE TRANSFERENCIA |

---

## 9. Campo `talla` — Dónde Aparece

| Archivo | Implementación |
|---|---|
| `AdminInventario.jsx` | Input en formulario; columna en tabla; badge en modal etiqueta; incluido en payload insert/update |
| `useProducts.js` | `.ilike('talla', talla)` en query Supabase |
| `Home.jsx` | Carga tallas únicas de DB; selector dinámico (solo si hay tallas registradas) |
| `ProductDetail.jsx` | Badge `tag--size` "Talla: X" en meta del producto |
| `ProductCard.jsx` | Badge de talla sobre imagen y debajo del precio |
| `CartDrawer.jsx` | Línea `• Talla: X` en mensaje WhatsApp |
| `barcodeGenerator.js` (handlePrintEtiqueta) | Talla en etiqueta física impresa |

> **ADVERTENCIA:** Si `talla` no existe en Supabase producción, ejecutar:
> ```sql
> ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS talla TEXT;
> ```

---

## 10. Etiquetas Físicas (QR + Código de Barra)

Archivo: `src/utils/barcodeGenerator.js`

| Función | Descripción |
|---|---|
| `generateBarcode()` | EAN-13: prefijo `978` + 9 dígitos random + checksum |
| `generateBarcodeSvg(text, opts)` | SVG EAN-13. Opts: `{ height, barWidth, showText }` |
| `getProductQrUrl(productId)` | `${origin}/producto/${id}` |
| `getQrImageUrl(data, size)` | QR vía `api.qrserver.com` |
| `getQrWithLogoHtml(data, size)` | QR + logo `/logo_sin_fondo.webp` superpuesto |
| `getQrWithLogoImgHtml(data, size)` | Igual, versión para impresión |

**Flujo de impresión:**
1. Botón "Etiqueta" en tabla → modal con preview
2. Botón "Imprimir Etiqueta" → `handlePrintEtiqueta()` → nueva ventana con HTML inline
3. `window.print()` automático a los 600ms
4. Tamaño: `80mm × 120mm`
5. Incluye: Logo + marca + nombre + precio + talla + QR con logo + EAN-13

---

## 11. Hooks — Referencia Rápida

### `useProducts(filters)`

```js
{
  category, gender, search, featured, limit,
  minPrice, maxPrice, marca, talla,
  includePrivate   // si true → incluye productos privados (publico=false)
}
```

Por defecto: `.or('publico.eq.true,publico.is.null')` — solo productos públicos o legados.

### `useProduct(id)` — único producto por UUID

### `useCategories()` — fallback hardcoded
Categorías por defecto: `perfumes`, `camisas`, `carteras`, `sandalias`, `zapatos`

### `useAdminAuth()` — clave: `Gissel2026`

### `useCart()` — `CartContext`

```js
{
  items, totalCount, subtotal, formattedSubtotal,
  isOpen, openCart, closeCart, toggleCart,
  addToCart(product, selectedColor, quantity, shouldOpenDrawer),
  updateQuantity(cartItemId, newQty),
  removeFromCart(cartItemId),
  clearCart(),
  lastAddedItem
}
```

`cartItemId = productId + '-' + colorKey` (evita duplicados por color)

---

## 12. Reglas de Diseño y Convenciones

> 📝 **NOTIFICACIÓN Y REGISTRO EN MEMORIA:** Antes de cerrar cualquier tarea, confirmar que todos los cambios aplicados quedaron anotados y explicados en este archivo (`PROYECTO.md`).

1. **`window.location.origin`** para URLs internas — nunca hardcodear dominio salvo fallback
2. **`VITE_PUBLIC_SITE_URL` NO EXISTE** — no agregar ni usar
3. **Comentarios en español** en todos los archivos
4. **Preservar comentarios existentes** al editar
5. **Build antes de push:** `npm run build` debe pasar sin errores
6. **Productos nuevos son privados** por defecto (`publico: false`)
7. **Moneda:** Lempiras (L.) formato `es-HN`, 2 decimales mínimo
8. **Géneros válidos:** `mujer`, `hombre`, `unisex`
9. **Actualizar la memoria (`PROYECTO.md`):** Todo ajuste en la lógica, base de datos, endpoints o UI debe reflejarse en las secciones correspondientes y en el Historial de Cambios.

### Clases CSS Admin importantes

| Clase | Uso |
|---|---|
| `.a-form-row-3` | Grid de 3 columnas en formularios admin |
| `.a-form-row-4` | Grid de 4 columnas en formularios admin |
| `.a-badge` | Badge genérico |
| `.a-badge--gold` | Badge dorado (marca, talla) |
| `.a-badge--green` | Badge verde (stock > 0, catálogo web) |
| `.a-badge--gray` | Badge gris (categoría, solo tienda) |
| `.a-badge--red` | Badge rojo (stock 0) |
| `.a-btn` | Botón base |
| `.a-btn-primary` | Botón negro principal |
| `.a-btn-outline` | Botón contorno |
| `.a-btn-gold` | Botón dorado |
| `.a-btn-danger` | Botón rojo (eliminar) |
| `.a-btn-sm` | Tamaño pequeño |

---

## 13. Deploy y Git

```bash
# Desarrollo local
cd /Users/erlinordonez/Downloads/estilogissel
npm run dev

# Build
npm run build

# Deploy (auto al hacer push)
git add -A
git commit -m "descripción"
git push origin main
# Vercel despliega automáticamente en ~2 minutos
```

---

## 14. Seguridad en Git y Buenas Prácticas de Deploy

> **REGLA DE ORO: Antes de cada `git push`, revisar que ningún archivo sensible esté incluido.**

### ❌ NUNCA subir al repositorio

| Archivo / Tipo | Ejemplo | Por qué es peligroso |
|---|---|---|
| Variables de entorno | `.env`, `.env.local`, `.env.production` | Expone claves de Supabase, tokens API y URLs privadas |
| Claves privadas SSH | `id_rsa`, `id_ed25519`, `*.pem`, `*.key` | Acceso completo a servidores |
| Contraseñas en texto plano | Cualquier archivo con passwords | Credenciales del negocio expuestas |
| Tokens de API | Supabase anon key, tokens de Vercel, etc. | Acceso no autorizado a servicios de pago |
| Bases de datos con datos reales | `*.sql`, `*.db`, `dump.sql` | Exposición de datos de clientes |
| Archivos de configuración con secretos | `config.json` con credenciales | Compromete toda la infraestructura |

> **IMPORTANTE:** El archivo `.env` de este proyecto **YA ESTÁ en `.gitignore`** — verificar que siga así antes de cada push. Las claves de Supabase solo deben existir en `.env` (local) y en el panel de Vercel (producción).

### ✅ Verificación antes de publicar

```bash
# 1. Revisar qué archivos serán incluidos en el commit
git status

# 2. Ver el contenido exacto del diff antes de hacer commit
git diff --staged

# 3. Verificar que .env no está en el staging area
git ls-files --cached | grep -i env

# Si .env aparece en el resultado anterior, quitarlo inmediatamente:
git rm --cached .env
```

### ✅ Commits pequeños y descriptivos

Cada commit debe hacer una sola cosa y tener un mensaje claro. Facilita auditoría, revisión y reversión de cambios.

```bash
# ✅ Bueno — específico y trazable
git commit -m "feat: agregar campo talla en formulario de inventario"
git commit -m "fix: corregir URL de WhatsApp en móvil"
git commit -m "docs: actualizar PROYECTO.md con historial de cambios"

# ❌ Malo — vago e inutilizable para auditoría
git commit -m "cambios"
git commit -m "fix"
git commit -m "arreglé cosas"
```

**Prefijos de convención recomendados:**

| Prefijo | Cuándo usarlo |
|---|---|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de error |
| `docs:` | Solo documentación |
| `style:` | Cambios de CSS/UI sin lógica |
| `refactor:` | Reorganización de código sin cambiar comportamiento |
| `chore:` | Tareas de mantenimiento (dependencias, configs) |

### ✅ Usar repositorio privado

Este proyecto (`josueordonz-sys/StilosGissel`) **debe mantenerse en privado** en GitHub ya que contiene:
- Lógica de negocio de S'TILOS GISSEL
- Números de cuentas bancarias de los titulares
- Estructura de base de datos con datos reales del negocio

Para verificar/cambiar la visibilidad: GitHub → Repo → Settings → Danger Zone → Change repository visibility.

### ✅ Autenticación segura en GitHub

- **Activar 2FA (verificación en dos pasos):** GitHub → Settings → Password and authentication → Enable two-factor authentication
- **Usar SSH o Personal Access Token (PAT)** — nunca contraseña directa
- **Configurar SSH:**
  ```bash
  # Generar clave SSH (si no existe)
  ssh-keygen -t ed25519 -C "tu@email.com"

  # Agregar al agente
  ssh-add ~/.ssh/id_ed25519

  # Copiar clave pública y agregarla en GitHub Settings → SSH Keys
  cat ~/.ssh/id_ed25519.pub
  ```
- **Clonar con SSH** (no HTTPS con contraseña):
  ```bash
  git remote set-url origin git@github.com:josueordonz-sys/StilosGissel.git
  ```

### ✅ Proteger la rama principal (`main`)

En proyectos compartidos o cuando hay múltiples colaboradores, activar la protección de rama:

**GitHub → Repo → Settings → Branches → Add rule → `main`:**
- ☑ Require pull request reviews before merging
- ☑ Require status checks to pass (build de Vercel)
- ☑ Do not allow bypassing the above settings

Esto evita que alguien haga `git push --force` accidentalmente y borre el historial de producción.

### ✅ .gitignore — Lo que debe estar siempre ignorado

Verificar que el archivo `.gitignore` del proyecto contenga al menos:
```
# Variables de entorno — NUNCA subir
.env
.env.local
.env.production
.env.*.local

# Dependencias
node_modules/

# Build
dist/
build/

# Sistema
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
```

---

## 15. Historial de Cambios

### 2026-11-01

| # | Cambio | Archivos afectados |
|---|---|---|
| 1 | Campo `talla` en formulario y tabla del inventario admin | `AdminInventario.jsx` |
| 2 | Badge de talla en `ProductCard` (sobre imagen + debajo precio) | `ProductCard.jsx`, `ProductCard.css` |
| 3 | Filtro de talla en `useProducts` (`.ilike`) | `useProducts.js` |
| 4 | Selector dinámico de talla en Home | `Home.jsx` |
| 5 | Tag de talla en `ProductDetail` | `ProductDetail.jsx` |
| 6 | CSS `.a-form-row-4` | `AdminLayout.css` |
| 7 | Proxy `/storage-img` para ocultar URLs Supabase | `vercel.json`, `vite.config.js` |
| 8 | Open Graph meta tags | `index.html` |
| 9 | Mensaje WhatsApp: rediseño completo (sin emojis, sin método de pago, imagen como preview) | `CartDrawer.jsx` |
| 10 | Eliminado "Ver prenda" / "Ver en tienda" del mensaje | `CartDrawer.jsx` |
| 11 | Fix `origin`: eliminado `VITE_PUBLIC_SITE_URL` → usa `window.location.origin` | `CartDrawer.jsx` |
| 12 | WhatsApp endpoint: `api.whatsapp.com/send?phone=...` | `ProductDetail.jsx`, `CartDrawer.jsx` |
| 13 | Detección móvil para `window.location.href` vs `window.open` | `CartDrawer.jsx` |
| 14 | Creación de `PROYECTO.md` como memoria viva y actualización de seguridad en `.gitignore` | `PROYECTO.md`, `.gitignore` |
| 15 | Directiva obligatoria de actualización de memoria continua en `PROYECTO.md` | `PROYECTO.md` |

---

## 16. Problemas Conocidos

| Estado | Problema | Solución |
|---|---|---|
| ⚠️ Acción de usuario | Columna `talla` puede no existir en Supabase producción | `ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS talla TEXT;` |
| ✅ Resuelto | `VITE_PUBLIC_SITE_URL` no definido → `undefined` en producción | Reemplazado por `window.location.origin` |
| ✅ Resuelto | WhatsApp `wa.me` no abría la app en móviles | `api.whatsapp.com/send?phone=...` |
| ✅ Resuelto | `window.open` bloqueado en Safari móvil tras `await` | `window.location.href` en móvil |
| ✅ Resuelto | URLs Supabase visibles en mensajes WhatsApp | Proxy `/storage-img` en `vercel.json` |
