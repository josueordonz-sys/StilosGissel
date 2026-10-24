import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import { useCategories } from '../../hooks/useCategories'
import AdminAuthGate from '../../components/admin/AdminAuthGate'
import ImageUploader from '../../components/ui/ImageUploader'
import {
  generateBarcode,
  generateBarcodeSvg,
  getProductQrUrl,
  getQrImageUrl,
  getQrWithLogoHtml,
  getQrWithLogoImgHtml
} from '../../utils/barcodeGenerator'

const GENEROS = ['mujer', 'hombre', 'unisex']

const EMPTY_FORM = {
  nombre: '',
  marca: '',
  categoria: '',
  genero: 'mujer',
  precio: '',
  descripcion: '',
  imagen_url: '',
  stock: 1,
  destacado: false,
  nuevo: true,
  publico: false, // Siempre desactivada por defecto (solo venta en tienda)
  codigo_barra: '',
  propietario_id: '',
}

const PROPIETARIOS_EXCLUSIVOS = [
  { id: 'tienda-gissel', nombre: 'Tienda Gissel' },
  { id: 'tienda-shein', nombre: 'Tienda Shein' },
]

const isUuid = (val) =>
  typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

export default function AdminInventario() {
  const auth = useAdminAuth()
  const { categories } = useCategories()

  const [productos, setProductos] = useState([])
  const [propietarios, setPropietarios] = useState(PROPIETARIOS_EXCLUSIVOS)
  const [loadingProds, setLoadingProds] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' })
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [qrProduct, setQrProduct] = useState(null) // producto para mostrar QR
  const [editProduct, setEditProduct] = useState(null)
  const qrRef = useRef(null)

  // Cargar productos y asegurar únicamente Tienda Gissel y Tienda Shein
  const loadData = useCallback(async () => {
    setLoadingProds(true)
    try {
      const [{ data: prods }, { data: props }] = await Promise.all([
        supabase
          .from('productos')
          .select('*, propietarios(nombre)')
          .order('created_at', { ascending: false }),
        supabase.from('propietarios').select('*').eq('activo', true).order('nombre'),
      ])
      setProductos(prods || [])

      let finalList = []
      const existing = props || []

      for (const item of PROPIETARIOS_EXCLUSIVOS) {
        const found = existing.find(p => p.nombre.trim().toLowerCase() === item.nombre.toLowerCase())
        if (found) {
          finalList.push(found)
        } else {
          // Intentar insertar si no existe en la base de datos
          try {
            const { data: created } = await supabase
              .from('propietarios')
              .insert([{ nombre: item.nombre, activo: true }])
              .select()
            if (created && created[0]) {
              finalList.push(created[0])
            } else {
              finalList.push(item)
            }
          } catch {
            finalList.push(item)
          }
        }
      }

      setPropietarios(finalList)

      // Seleccionar por defecto Tienda Gissel si no hay uno seleccionado
      setForm(f => {
        if (!f.propietario_id && finalList.length > 0) {
          return { ...f, propietario_id: finalList[0].id }
        }
        return f
      })
    } catch (err) {
      console.error(err)
      setPropietarios(PROPIETARIOS_EXCLUSIVOS)
    } finally {
      setLoadingProds(false)
    }
  }, [])

  useEffect(() => {
    if (auth.isAuthorized) loadData()
  }, [auth.isAuthorized, loadData])

  // Propietario, categoría y código de barra auto-generado por defecto
  useEffect(() => {
    if (categories.length > 0 && !form.categoria) {
      setForm(f => ({ ...f, categoria: categories[0].slug }))
    }
    setForm(f => ({ ...f, codigo_barra: f.codigo_barra || generateBarcode() }))
  }, [categories, form.categoria])

  // Generar URL única para QR de una prenda
  const generateQrUrl = (productId) => {
    const base = window.location.origin
    return `${base}/producto/${productId}`
  }

  // Guardar producto (create o update)
  const handleSave = async (e) => {
    e.preventDefault()
    const { nombre, precio, imagen_url, categoria } = form
    if (!nombre || !precio || !imagen_url || !categoria) {
      setStatusMsg({ text: 'Completa nombre, precio, categoria y foto.', type: 'error' })
      return
    }

    const barcode = form.codigo_barra?.trim() || generateBarcode()

    const payload = {
      nombre: nombre.trim(),
      marca: form.marca?.trim() || null,
      categoria: categoria.toLowerCase(),
      genero: form.genero,
      precio: parseFloat(precio),
      descripcion: form.descripcion.trim(),
      imagen_url,
      stock: parseInt(form.stock, 10) || 1,
      destacado: Boolean(form.destacado),
      nuevo: Boolean(form.nuevo),
      publico: Boolean(form.publico), // Casilla siempre false por defecto: sólo venta en tienda si no se marca
      codigo_barra: barcode,
      propietario_id: isUuid(form.propietario_id) ? form.propietario_id : null,
    }

    try {
      let savedId
      if (editProduct) {
        const { error } = await supabase.from('productos').update(payload).eq('id', editProduct.id)
        if (error) throw error
        savedId = editProduct.id
        setStatusMsg({ text: `Producto "${payload.nombre}" actualizado con éxito.`, type: 'success' })
        setEditProduct(null)
      } else {
        const { data, error } = await supabase.from('productos').insert([payload]).select().single()
        if (error) throw error
        savedId = data.id
        // Guardar QR URL en el registro
        const qrUrl = getProductQrUrl(savedId)
        await supabase.from('productos').update({ qr_code: qrUrl }).eq('id', savedId)
        setStatusMsg({ text: `Prenda "${payload.nombre}" registrada con QR y Código de Barra (${barcode}).`, type: 'success' })
      }
      setForm({ ...EMPTY_FORM, codigo_barra: generateBarcode(), categoria: categories[0]?.slug || '' })
      loadData()
    } catch (err) {
      setStatusMsg({ text: `Error: ${err.message}`, type: 'error' })
    }
  }

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`Eliminar permanentemente "${nombre}"?`)) return
    try {
      const { error } = await supabase.from('productos').delete().eq('id', id)
      if (error) throw error
      setStatusMsg({ text: `Producto "${nombre}" eliminado.`, type: 'success' })
      loadData()
    } catch (err) {
      setStatusMsg({ text: `Error: ${err.message}`, type: 'error' })
    }
  }

  const startEdit = (p) => {
    setEditProduct(p)
    setForm({
      nombre: p.nombre,
      marca: p.marca || '',
      categoria: p.categoria,
      genero: p.genero,
      precio: p.precio,
      descripcion: p.descripcion || '',
      imagen_url: p.imagen_url,
      stock: p.stock || 1,
      destacado: Boolean(p.destacado),
      nuevo: Boolean(p.nuevo),
      publico: Boolean(p.publico),
      codigo_barra: p.codigo_barra || generateBarcode(),
      propietario_id: p.propietario_id || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditProduct(null)
    setForm({ ...EMPTY_FORM, codigo_barra: generateBarcode(), categoria: categories[0]?.slug || '' })
  }

  // Imprimir Etiqueta física para prenda (QR con Logo + Código de Barra EAN-13)
  const handlePrintEtiqueta = () => {
    if (!qrProduct) return
    const qrUrl = qrProduct.qr_code || getProductQrUrl(qrProduct.id)
    const barcodeVal = qrProduct.codigo_barra || generateBarcode()
    const barcodeSvg = generateBarcodeSvg(barcodeVal, { height: 52, barWidth: 1.8, showText: true })
    const propNombre = qrProduct.propietarios?.nombre || (qrProduct.propietario_id === 'tienda-shein' ? 'Tienda Shein' : 'Tienda Gissel')
    const qrWithLogoHtml = getQrWithLogoImgHtml(qrUrl, 130)

    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>Etiqueta — ${qrProduct.nombre}</title>
          <style>
            @page { size: 80mm 120mm; margin: 0; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex; align-items: flex-start; justify-content: center;
              min-height: 100vh; background: #f5f5f5; margin: 0; padding: 12px;
            }
            .tag-card {
              background: #fff;
              border: 1.5px solid #d4c5a4;
              border-radius: 8px;
              padding: 12px 12px 10px;
              width: 260px;
              text-align: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }
            .tag-header {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              border-bottom: 1px solid #ece5d8;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            .tag-logo { width: 28px; height: 28px; object-fit: contain; }
            .tag-brand-title {
              font-size: 12px; letter-spacing: 0.18em; font-weight: 800;
              color: #121212; text-transform: uppercase; margin: 0;
            }
            .tag-subtitle {
              font-size: 8.5px; color: #9c7c44; font-weight: 600;
              margin: 0 0 6px; letter-spacing: 0.1em; text-transform: uppercase;
            }
            .tag-prod-name {
              font-size: 11.5px; font-weight: 700; margin: 2px 0 3px;
              color: #121212; line-height: 1.3;
            }
            .tag-price {
              font-size: 22px; font-weight: 900; color: #121212;
              margin: 2px 0 8px; letter-spacing: -0.02em;
            }
            .tag-divider {
              border: none; border-top: 1px dashed #d4c5a4; margin: 8px 0;
            }
            .tag-qr-wrap { display: flex; justify-content: center; margin-bottom: 6px; }
            .tag-meta-info {
              font-size: 7.5px; color: #999; margin: 2px 0 6px;
              text-transform: uppercase; letter-spacing: 0.06em;
            }
            .tag-barcode-wrap { display: flex; justify-content: center; }
            .tag-barcode-wrap svg { max-width: 100%; height: auto; }
            .tag-badge {
              display: inline-block; font-size: 7.5px; padding: 2px 7px;
              border-radius: 20px; background: #f4efe8; color: #7a6540;
              margin-top: 6px; font-weight: 700; text-transform: uppercase;
              letter-spacing: 0.05em;
            }
          </style>
        </head>
        <body>
          <div class="tag-card">
            <div class="tag-header">
              <img src="/logo_sin_fondo.webp" class="tag-logo" alt="Logo" />
              <h1 class="tag-brand-title">S'TILOS GISSEL</h1>
            </div>
            <p class="tag-subtitle">${propNombre}${qrProduct.marca ? ` • ${qrProduct.marca}` : ''}</p>
            <p class="tag-prod-name">${qrProduct.nombre}</p>
            <div class="tag-price">L. ${Number(qrProduct.precio).toFixed(2)}</div>
            <hr class="tag-divider" />
            <div class="tag-qr-wrap">
              ${qrWithLogoHtml}
            </div>
            <p class="tag-meta-info">Escanea para ver en catálogo web</p>
            <div class="tag-barcode-wrap">
              ${barcodeSvg}
            </div>
            <div class="tag-badge">
              ${qrProduct.categoria} • ${qrProduct.genero}${qrProduct.publico ? ' • Web' : ' • Tienda'}
            </div>
          </div>
          <script>window.onload = () => { setTimeout(() => window.print(), 600); }<\/script>
        </body>
      </html>
    `)
    win.document.close()
  }

  // Filtrar tabla
  const filtered = productos.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      p.nombre?.toLowerCase().includes(q) ||
      p.marca?.toLowerCase().includes(q) ||
      p.codigo_barra?.toLowerCase().includes(q)
    const matchCat = !filterCat || p.categoria === filterCat
    return matchSearch && matchCat
  })

  if (!auth.isAuthorized) return <AdminAuthGate auth={auth} />

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      <div className="apage-header">
        <div>
          <span className="overline">Gestion de Stock</span>
          <h1 className="apage-title">Inventario</h1>
          <p className="apage-subtitle">{productos.length} producto(s) en catalogo</p>
        </div>
      </div>

      {statusMsg.text && (
        <div className={`a-status a-status--${statusMsg.type}`}>
          {statusMsg.text}
        </div>
      )}

      {/* === FORMULARIO === */}
      <div className="a-card">
        <p className="a-card-title">{editProduct ? `Editando: ${editProduct.nombre}` : 'Agregar Nuevo Producto'}</p>
        <p className="a-card-subtitle">
          {editProduct ? 'Modifica los campos y guarda los cambios.' : 'Completa el formulario para agregar una nueva prenda al catalogo.'}
        </p>

        <form onSubmit={handleSave} className="a-form">
          {/* Fila 1 */}
          <div className="a-form-row-3">
            <div className="a-field">
              <label htmlFor="inv-nombre" className="a-label">Nombre de la Prenda *</label>
              <input
                id="inv-nombre"
                className="a-input"
                placeholder="Ej: Cartera Tote Bag"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div className="a-field">
              <label htmlFor="inv-marca" className="a-label">Marca</label>
              <input
                id="inv-marca"
                className="a-input"
                placeholder="Ej: Guess, Zara, Shein, Coach..."
                value={form.marca}
                onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}
              />
            </div>
            <div className="a-field">
              <label htmlFor="inv-precio" className="a-label">Precio (Lempiras) *</label>
              <input
                id="inv-precio"
                className="a-input"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*([.,][0-9]{0,2})?"
                placeholder="0.00"
                value={form.precio}
                onChange={e => {
                  const normalized = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '')
                  const [whole, ...decimals] = normalized.split('.')
                  const precio = decimals.length ? `${whole}.${decimals.join('').slice(0, 2)}` : whole
                  setForm(f => ({ ...f, precio }))
                }}
              />
            </div>
          </div>

          {/* Fila 2 */}
          <div className="a-form-row-3">
            <div className="a-field">
              <label htmlFor="inv-categoria" className="a-label">Categoria *</label>
              <select
                id="inv-categoria"
                className="a-input a-select"
                value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              >
                {categories.map(c => (
                  <option key={c.slug} value={c.slug}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="a-field">
              <label htmlFor="inv-genero" className="a-label">Genero *</label>
              <select
                id="inv-genero"
                className="a-input a-select"
                value={form.genero}
                onChange={e => setForm(f => ({ ...f, genero: e.target.value }))}
              >
                {GENEROS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </select>
            </div>
            <div className="a-field">
              <label htmlFor="inv-stock" className="a-label">Stock (unidades)</label>
              <input
                id="inv-stock"
                className="a-input"
                type="number"
                min="0"
                value={form.stock}
                onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
              />
            </div>
          </div>

          {/* Propietario */}
          <div className="a-field">
            <label htmlFor="inv-propietario" className="a-label">Propietario de la Prenda</label>
            <select
              id="inv-propietario"
              className="a-input a-select"
              value={form.propietario_id}
              onChange={e => setForm(f => ({ ...f, propietario_id: e.target.value }))}
            >
              {propietarios.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
              Selecciona a cuál tienda pertenece la prenda: Tienda Gissel o Tienda Shein.
            </span>
          </div>

          {/* Descripcion */}
          <div className="a-field">
            <label htmlFor="inv-desc" className="a-label">Descripcion</label>
            <textarea
              id="inv-desc"
              className="a-input a-textarea"
              placeholder="Descripcion de la prenda, notas, detalles..."
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            />
          </div>

          {/* Foto */}
          <div className="a-field">
            <span className="a-label">Foto de la Prenda *</span>
            <ImageUploader
              value={form.imagen_url}
              onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
            />
          </div>

          {/* Código de Barra (Barcode) */}
          <div className="a-field">
            <label htmlFor="inv-codigo-barra" className="a-label">Código de Barra (Barcode / SKU)</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                id="inv-codigo-barra"
                className="a-input"
                style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.08em' }}
                placeholder="Ej: SG74920153"
                value={form.codigo_barra}
                onChange={e => setForm(f => ({ ...f, codigo_barra: e.target.value }))}
              />
              <button
                type="button"
                className="a-btn a-btn-outline a-btn-sm"
                onClick={() => setForm(f => ({ ...f, codigo_barra: generateBarcode() }))}
                title="Generar nuevo código de barra único"
              >
                Auto-generar
              </button>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
              Código de barras Code 128 auto-generado para etiquetas físicas y lectura con pistola en tienda.
            </span>
          </div>

          {/* Casilla: Agregar al catálogo público (SIEMPRE DESACTIVADA POR DEFECTO) */}
          <div style={{
            padding: '0.9rem 1.1rem',
            background: form.publico ? 'rgba(74, 154, 98, 0.08)' : 'var(--color-surface-soft)',
            border: `1px solid ${form.publico ? 'rgba(74, 154, 98, 0.4)' : 'var(--color-border)'}`,
            borderRadius: '4px',
            transition: 'var(--transition-fast)'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-main)' }}>
              <input
                id="inv-publico"
                type="checkbox"
                style={{ accentColor: 'var(--color-black)', width: '18px', height: '18px', cursor: 'pointer' }}
                checked={form.publico}
                onChange={e => setForm(f => ({ ...f, publico: e.target.checked }))}
              />
              <span>Agregar al catálogo público</span>
            </label>
            <span style={{ fontSize: '0.7rem', color: form.publico ? '#2e7d32' : 'var(--color-text-muted)', marginLeft: '1.9rem', marginTop: '0.2rem', display: 'block' }}>
              {form.publico
                ? 'Activado: La prenda estará visible en el catálogo de la página web pública.'
                : 'Desactivado (por defecto): La prenda NO se mostrará en la página web pública; solo estará para venta física en tienda.'
              }
            </span>
          </div>

          {/* Checkboxes adicionales */}
          <div style={{ display: 'flex', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', cursor: 'pointer' }}>
              <input
                id="inv-destacado"
                type="checkbox"
                style={{ accentColor: 'var(--color-gold-dark)', width: '16px', height: '16px' }}
                checked={form.destacado}
                onChange={e => setForm(f => ({ ...f, destacado: e.target.checked }))}
              />
              Producto Destacado (aparece en inicio)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', cursor: 'pointer' }}>
              <input
                id="inv-nuevo"
                type="checkbox"
                style={{ accentColor: 'var(--color-gold-dark)', width: '16px', height: '16px' }}
                checked={form.nuevo}
                onChange={e => setForm(f => ({ ...f, nuevo: e.target.checked }))}
              />
              Marcar como Nuevo
            </label>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <button id="inv-submit" type="submit" className="a-btn a-btn-primary">
              {editProduct ? 'Guardar Cambios' : 'Agregar Producto'}
            </button>
            {editProduct && (
              <button type="button" className="a-btn a-btn-outline" onClick={cancelEdit}>
                Cancelar Edicion
              </button>
            )}
          </div>
        </form>
      </div>

      {/* === TABLA DE PRODUCTOS === */}
      <div className="a-card">
        <div className="a-card-header">
          <div>
            <p className="a-card-title">Catalogo de Productos</p>
            <p className="a-card-subtitle">{filtered.length} resultado(s)</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <input
              id="inv-search"
              className="a-input"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '200px' }}
            />
            <select
              id="inv-filter-cat"
              className="a-input a-select"
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              style={{ width: '160px' }}
            >
              <option value="">Todas</option>
              {categories.map(c => <option key={c.slug} value={c.slug}>{c.nombre}</option>)}
            </select>
          </div>
        </div>

        {loadingProds ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', padding: '2rem 0' }}>Cargando inventario...</p>
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Nombre</th>
                  <th>Marca</th>
                  <th>Código de Barra</th>
                  <th>Categoria</th>
                  <th>Genero</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Propietario</th>
                  <th>Catálogo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      Sin productos. Agrega el primero usando el formulario.
                    </td>
                  </tr>
                ) : filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <img src={p.imagen_url} alt={p.nombre} className="a-thumb" />
                    </td>
                    <td><strong>{p.nombre}</strong></td>
                    <td>
                      {p.marca
                        ? <span className="a-badge a-badge--gold">{p.marca}</span>
                        : <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      }
                    </td>
                    <td>
                      <code style={{ fontSize: '0.74rem', letterSpacing: '0.06em', color: 'var(--color-text-main)', background: 'var(--color-surface-soft)', padding: '2px 6px', borderRadius: '3px' }}>
                        {p.codigo_barra || '—'}
                      </code>
                    </td>
                    <td><span className="a-badge a-badge--gray">{p.categoria}</span></td>
                    <td>{p.genero}</td>
                    <td><strong>L {Number(p.precio).toFixed(2)}</strong></td>
                    <td>
                      <span className={`a-badge ${p.stock > 0 ? 'a-badge--green' : 'a-badge--red'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td>{p.propietarios?.nombre || (p.propietario_id === 'tienda-shein' ? 'Tienda Shein' : 'Tienda Gissel')}</td>
                    <td>
                      {p.publico
                        ? <span className="a-badge a-badge--green" title="Visible en catálogo público y disponible en tienda">Web + Tienda</span>
                        : <span className="a-badge a-badge--gray" title="Solo disponible para venta física en tienda">Solo Tienda</span>
                      }
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="a-btn a-btn-outline a-btn-sm"
                          onClick={() => startEdit(p)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="a-btn a-btn-gold a-btn-sm"
                          onClick={() => setQrProduct(p)}
                          title="Ver e imprimir etiqueta con QR y Código de Barra"
                        >
                          Etiqueta
                        </button>
                        <button
                          type="button"
                          className="a-btn a-btn-danger"
                          onClick={() => handleDelete(p.id, p.nombre)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* === MODAL ETIQUETA PRENDA (QR + CÓDIGO DE BARRA) === */}
      {qrProduct && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(18,18,18,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setQrProduct(null)}
        >
          <div
            style={{
              background: '#fff', padding: '2rem', maxWidth: '380px', width: '100%',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-lg)', textAlign: 'center',
              maxHeight: '92vh', overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <span className="overline">Etiqueta de Prenda</span>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, margin: '0.4rem 0 0.6rem' }}>
              {qrProduct.nombre}
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
              <span className="a-badge a-badge--gold">{qrProduct.propietarios?.nombre || (qrProduct.propietario_id === 'tienda-shein' ? 'Tienda Shein' : 'Tienda Gissel')}</span>
              {qrProduct.marca && <span className="a-badge a-badge--gray">{qrProduct.marca}</span>}
              <span className={`a-badge ${qrProduct.publico ? 'a-badge--green' : 'a-badge--gray'}`}>
                {qrProduct.publico ? 'Catálogo Web + Tienda' : 'Solo Venta en Tienda'}
              </span>
            </div>

            <p style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--color-text-main)', marginBottom: '1rem' }}>
              L {Number(qrProduct.precio).toFixed(2)}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', alignItems: 'center', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '6px', background: 'var(--color-surface-soft)' }}>
              {/* Código QR con logo del negocio en el centro */}
              <div style={{ textAlign: 'center' }}>
                <div
                  dangerouslySetInnerHTML={{
                    __html: getQrWithLogoHtml(
                      qrProduct.qr_code || getProductQrUrl(qrProduct.id),
                      160
                    )
                  }}
                />
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Código QR • Logo S'tilos Gissel
                </span>
              </div>

              {/* Código de Barra EAN-13 */}
              <div style={{ width: '100%', background: '#fff', padding: '10px 4px 6px', borderRadius: '4px', border: '1px solid var(--color-border-light)' }}>
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateBarcodeSvg(qrProduct.codigo_barra || generateBarcode(), { height: 48, barWidth: 1.8, showText: true })
                  }}
                  style={{ display: 'flex', justifyContent: 'center' }}
                />
                <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', display: 'block', textAlign: 'center', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Código de Barra EAN-13
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'center' }}>
              <button className="a-btn a-btn-primary" onClick={handlePrintEtiqueta}>
                Imprimir Etiqueta
              </button>
              <button className="a-btn a-btn-outline" onClick={() => setQrProduct(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
