import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useCategories } from '../../hooks/useCategories'
import ImageUploader from '../../components/ui/ImageUploader'
import './AdminDashboard.css'

export default function AdminDashboard() {
  const { categories, refetch: refetchCategories } = useCategories()
  const [activeTab, setActiveTab] = useState('productos') // 'productos' | 'categorias'
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [accessKeyInput, setAccessKeyInput] = useState('')
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' })

  // Comprobar si se accede desde subdominio admin.* o si ya está autenticado localmente
  useEffect(() => {
    const host = window.location.hostname
    const hasAdminSubdomain = host.startsWith('admin.')
    const storedAuth = sessionStorage.getItem('eg_admin_session')

    if (hasAdminSubdomain || storedAuth === 'true') {
      setIsAuthorized(true)
    }
  }, [])

  // Productos
  const [productsList, setProductsList] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  // Formulario Producto
  const [productForm, setProductForm] = useState({
    nombre: '',
    categoria: '',
    genero: 'mujer',
    precio: '',
    descripcion: '',
    imagen_url: '',
    destacado: false,
    nuevo: true
  })

  // Formulario Categoría
  const [categoryForm, setCategoryForm] = useState({
    nombre: '',
    slug: '',
    descripcion: '',
    imagen_url: '',
    orden: 1
  })

  // Cargar productos desde Supabase
  const loadProducts = async () => {
    setLoadingProducts(true)
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProductsList(data || [])
    } catch (err) {
      console.error('Error cargando productos:', err)
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => {
    if (isAuthorized) {
      loadProducts()
    }
  }, [isAuthorized])

  // Establecer primera categoría por defecto en el form de productos
  useEffect(() => {
    if (categories.length > 0 && !productForm.categoria) {
      setProductForm(prev => ({ ...prev, categoria: categories[0].slug }))
    }
  }, [categories, productForm.categoria])

  // Desbloqueo manual / clave de acceso para desarrollo o subdominio
  const handleUnlock = (e) => {
    e.preventDefault()
    if (accessKeyInput === 'Gissel2026' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setIsAuthorized(true)
      sessionStorage.setItem('eg_admin_session', 'true')
      setStatusMessage({ text: 'Acceso autorizado exitosamente.', type: 'success' })
    } else {
      setStatusMessage({ text: 'Clave de acceso no valida para este portal.', type: 'error' })
    }
  }

  // --- CREAR PRODUCTO ---
  const handleCreateProduct = async (e) => {
    e.preventDefault()
    if (!productForm.nombre || !productForm.precio || !productForm.imagen_url || !productForm.categoria) {
      setStatusMessage({ text: 'Por favor complete todos los campos obligatorios y seleccione una foto desde el dispositivo.', type: 'error' })
      return
    }

    try {
      const newProduct = {
        nombre: productForm.nombre.trim(),
        categoria: productForm.categoria.toLowerCase(),
        genero: productForm.genero,
        precio: parseFloat(productForm.precio),
        descripcion: productForm.descripcion.trim(),
        imagen_url: productForm.imagen_url,
        destacado: Boolean(productForm.destacado),
        nuevo: Boolean(productForm.nuevo)
      }

      const { error } = await supabase.from('productos').insert([newProduct])

      if (error) throw error

      setStatusMessage({ text: `Producto "${newProduct.nombre}" agregado exitosamente a Supabase con foto real.`, type: 'success' })
      setProductForm({
        nombre: '',
        categoria: categories[0]?.slug || 'perfumes',
        genero: 'mujer',
        precio: '',
        descripcion: '',
        imagen_url: '',
        destacado: false,
        nuevo: true
      })
      loadProducts()
    } catch (err) {
      setStatusMessage({ text: `Error al guardar producto: ${err.message}`, type: 'error' })
    }
  }

  // --- ELIMINAR PRODUCTO ---
  const handleDeleteProduct = async (id, nombre) => {
    if (!window.confirm(`¿Desea eliminar permanentemente el producto "${nombre}"?`)) return

    try {
      const { error } = await supabase.from('productos').delete().eq('id', id)
      if (error) throw error

      setStatusMessage({ text: `Producto "${nombre}" eliminado de la base de datos.`, type: 'success' })
      loadProducts()
    } catch (err) {
      setStatusMessage({ text: `Error al eliminar: ${err.message}`, type: 'error' })
    }
  }

  // --- CREAR CATEGORÍA ---
  const handleCreateCategory = async (e) => {
    e.preventDefault()
    if (!categoryForm.nombre || !categoryForm.slug) {
      setStatusMessage({ text: 'El nombre y slug de la categoría son obligatorios.', type: 'error' })
      return
    }

    try {
      const newCategory = {
        nombre: categoryForm.nombre.trim(),
        slug: categoryForm.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        descripcion: categoryForm.descripcion.trim(),
        imagen_url: categoryForm.imagen_url || 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1000&q=80',
        orden: parseInt(categoryForm.orden, 10) || categories.length + 1
      }

      const { error } = await supabase.from('categorias').insert([newCategory])

      if (error) throw error

      setStatusMessage({ text: `Categoria "${newCategory.nombre}" creada. Ruta directa disponible: /${newCategory.slug}`, type: 'success' })
      setCategoryForm({ nombre: '', slug: '', descripcion: '', imagen_url: '', orden: 1 })
      refetchCategories()
    } catch (err) {
      setStatusMessage({ text: `Error al guardar categoria: ${err.message}`, type: 'error' })
    }
  }

  if (!isAuthorized) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

    return (
      <div className="admin-auth-wrapper container section">
        <div className="admin-auth-card">
          <div className="admin-auth-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="overline">Portal Privado</span>
          <h1 className="display-md">Panel de Administracion</h1>
          <p className="body-sm admin-auth-desc">
            Acceso restringido al subdominio corporativo autorizado. Ingrese su clave de autenticación privada para continuar.
          </p>

          <form onSubmit={handleUnlock} className="admin-auth-form">
            <input
              type="password"
              placeholder="Clave de acceso de administrador..."
              value={accessKeyInput}
              onChange={e => setAccessKeyInput(e.target.value)}
              className="admin-input"
              autoFocus
            />
            <button type="submit" className="btn btn-primary">
              Verificar Acceso
            </button>
          </form>

          {statusMessage.text && (
            <div className={`admin-status admin-status--${statusMessage.type}`}>
              {statusMessage.text}
            </div>
          )}

          {isLocal && (
            <p className="body-sm" style={{ marginTop: '1.5rem', color: 'var(--color-gold)' }}>
              Modo Local Detectado: Presiona "Verificar Acceso" para desbloquear directamente.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard container section">
      {/* Cabecera Admin */}
      <div className="admin-header">
        <div>
          <span className="overline">Panel Administrativo</span>
          <h1 className="display-lg">Control de Catalogo Real</h1>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              sessionStorage.removeItem('eg_admin_session')
              setIsAuthorized(false)
            }}
          >
            Cerrar Sesion
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab ${activeTab === 'productos' ? 'active' : ''}`}
          onClick={() => setActiveTab('productos')}
        >
          Productos Reales ({productsList.length})
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'categorias' ? 'active' : ''}`}
          onClick={() => setActiveTab('categorias')}
        >
          Categorias ({categories.length})
        </button>
      </div>

      {statusMessage.text && (
        <div className={`admin-status admin-status--${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      )}

      {/* ================= PESTAÑA PRODUCTOS ================= */}
      {activeTab === 'productos' && (
        <div className="admin-content-grid">
          {/* Formulario Crear Producto */}
          <div className="admin-card">
            <h2 className="display-md admin-card-title">Agregar Producto</h2>
            <p className="body-sm admin-card-subtitle">
              Sube las imágenes reales directamente desde el carrete de tu teléfono o archivos de tu computadora.
            </p>

            <form onSubmit={handleCreateProduct} className="admin-form">
              <div className="form-group">
                <label className="overline">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Bolso Tote en Cuero Grano"
                  value={productForm.nombre}
                  onChange={e => setProductForm({ ...productForm, nombre: e.target.value })}
                  className="admin-input"
                />
              </div>

              {/* Subida de Imagen desde Dispositivo / Carrete */}
              <div className="form-group">
                <ImageUploader
                  value={productForm.imagen_url}
                  onChange={(url) => setProductForm({ ...productForm, imagen_url: url })}
                  label="Foto del Producto (Desde Dispositivo / Carrete)"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="overline">Categoria *</label>
                  <select
                    value={productForm.categoria}
                    onChange={e => setProductForm({ ...productForm, categoria: e.target.value })}
                    className="admin-input"
                  >
                    {categories.map(c => (
                      <option key={c.slug} value={c.slug}>
                        {c.nombre} (/{c.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="overline">Genero *</label>
                  <select
                    value={productForm.genero}
                    onChange={e => setProductForm({ ...productForm, genero: e.target.value })}
                    className="admin-input"
                  >
                    <option value="mujer">Mujer</option>
                    <option value="hombre">Hombre</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="overline">Precio (Lempiras) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Ej: 2850.00"
                  value={productForm.precio}
                  onChange={e => setProductForm({ ...productForm, precio: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="form-group">
                <label className="overline">Descripcion Detallada</label>
                <textarea
                  rows="3"
                  placeholder="Notas aromaticas, materiales, detalles de confeccion..."
                  value={productForm.descripcion}
                  onChange={e => setProductForm({ ...productForm, descripcion: e.target.value })}
                  className="admin-input admin-textarea"
                />
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={productForm.destacado}
                    onChange={e => setProductForm({ ...productForm, destacado: e.target.checked })}
                  />
                  <span>Marcar como Destacado (The Edit)</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={productForm.nuevo}
                    onChange={e => setProductForm({ ...productForm, nuevo: e.target.checked })}
                  />
                  <span>Marcar como Recien Llegado</span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary">
                Guardar en Catalogo Real
              </button>
            </form>
          </div>

          {/* Tabla de Productos Existentes */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="display-md admin-card-title">Catalogo Actual</h2>
              <button type="button" onClick={loadProducts} className="btn btn-ghost">
                Actualizar
              </button>
            </div>

            {loadingProducts ? (
              <p className="body-sm" style={{ padding: '2rem 0' }}>Cargando catalogo...</p>
            ) : productsList.length === 0 ? (
              <div className="empty-catalog-box">
                <p className="display-sm" style={{ color: 'var(--color-gold)' }}>Base de datos limpia</p>
                <p className="body-sm" style={{ marginTop: '0.5rem' }}>
                  No hay productos registrados en Supabase. Agrega el primer producto utilizando el formulario.
                </p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Foto</th>
                      <th>Nombre</th>
                      <th>Categoria</th>
                      <th>Genero</th>
                      <th>Precio</th>
                      <th>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsList.map(prod => (
                      <tr key={prod.id}>
                        <td>
                          <img src={prod.imagen_url} alt={prod.nombre} className="table-thumb" />
                        </td>
                        <td>
                          <strong>{prod.nombre}</strong>
                        </td>
                        <td>
                          <span className="tag">{prod.categoria}</span>
                        </td>
                        <td>
                          <span className="tag">{prod.genero}</span>
                        </td>
                        <td>L. {Number(prod.precio).toFixed(2)}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod.id, prod.nombre)}
                            className="btn-table-delete"
                            title="Eliminar producto"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= PESTAÑA CATEGORÍAS ================= */}
      {activeTab === 'categorias' && (
        <div className="admin-content-grid">
          {/* Formulario Crear Categoría */}
          <div className="admin-card">
            <h2 className="display-md admin-card-title">Crear Categoria Dinamica</h2>
            <p className="body-sm admin-card-subtitle">
              Puedes crear cualquier categoria (ej: Relojes, Joyeria, Accesorios). La ruta se generará automáticamente como <code>/slug</code>.
            </p>

            <form onSubmit={handleCreateCategory} className="admin-form">
              <div className="form-group">
                <label className="overline">Nombre de la Categoria *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Joyeria"
                  value={categoryForm.nombre}
                  onChange={e => {
                    const val = e.target.value
                    const generatedSlug = val.toLowerCase().trim().replace(/\s+/g, '-')
                    setCategoryForm({
                      ...categoryForm,
                      nombre: val,
                      slug: categoryForm.slug || generatedSlug
                    })
                  }}
                  className="admin-input"
                />
              </div>

              <div className="form-group">
                <label className="overline">Slug URL (Ruta directa) *</label>
                <div className="slug-input-prefix">
                  <span>/</span>
                  <input
                    type="text"
                    required
                    placeholder="joyeria"
                    value={categoryForm.slug}
                    onChange={e => setCategoryForm({ ...categoryForm, slug: e.target.value.toLowerCase().trim() })}
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <ImageUploader
                  value={categoryForm.imagen_url}
                  onChange={(url) => setCategoryForm({ ...categoryForm, imagen_url: url })}
                  label="Foto de Portada de la Categoria"
                />
              </div>

              <div className="form-group">
                <label className="overline">Descripcion de la Linea</label>
                <textarea
                  rows="2"
                  placeholder="Breve detalle de la coleccion..."
                  value={categoryForm.descripcion}
                  onChange={e => setCategoryForm({ ...categoryForm, descripcion: e.target.value })}
                  className="admin-input admin-textarea"
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Crear Categoria
              </button>
            </form>
          </div>

          {/* Lista de Categorías Existentes */}
          <div className="admin-card">
            <h2 className="display-md admin-card-title">Categorias Registradas</h2>
            <div className="category-admin-list">
              {categories.map(cat => (
                <div key={cat.slug} className="category-admin-item">
                  <div className="category-admin-info">
                    <span className="overline">Ruta: /{cat.slug}</span>
                    <h3 className="category-admin-name">{cat.nombre}</h3>
                    <p className="body-sm">{cat.descripcion}</p>
                  </div>
                  <a
                    href={`/${cat.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost"
                  >
                    Ver Catalogo
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
