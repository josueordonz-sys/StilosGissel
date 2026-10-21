import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import { useCategories } from '../../hooks/useCategories'
import AdminAuthGate from '../../components/admin/AdminAuthGate'
import ImageUploader from '../../components/ui/ImageUploader'
import './AdminCategorias.css'

const EMPTY_CAT = {
  nombre: '',
  slug: '',
  descripcion: '',
  imagen_url: '',
  imagen_sin_fondo: '',
  orden: 1,
}

export default function AdminCategorias() {
  const auth = useAdminAuth()
  const { categories, refetch } = useCategories()
  const [form, setForm] = useState(EMPTY_CAT)
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' })
  const [editCat, setEditCat] = useState(null)

  const autoSlug = (nombre) =>
    nombre.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const handleSave = async (e) => {
    e.preventDefault()
    const { nombre, slug } = form
    if (!nombre || !slug) {
      setStatusMsg({ text: 'Nombre y slug son obligatorios.', type: 'error' })
      return
    }
    const payload = {
      nombre: nombre.trim(),
      slug: autoSlug(slug),
      descripcion: form.descripcion.trim(),
      imagen_url: form.imagen_url || 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1600&q=80',
      imagen_sin_fondo: form.imagen_sin_fondo || null,
      orden: parseInt(form.orden, 10) || categories.length + 1,
    }

    try {
      if (editCat) {
        let { error } = await supabase.from('categorias').update(payload).eq('id', editCat.id)
        if (error && (error.message.includes('imagen_sin_fondo') || error.code === '42703')) {
          // Si la columna aún no ha sido creada en la base de datos de Supabase, guardar sin ella y avisar
          const { imagen_sin_fondo, ...fallbackPayload } = payload
          const { error: err2 } = await supabase.from('categorias').update(fallbackPayload).eq('id', editCat.id)
          if (err2) throw err2
          setStatusMsg({
            text: `Categoría actualizada. Nota: Para guardar la imagen sin fondo permanentemente en Supabase, ejecuta en el SQL Editor: ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS imagen_sin_fondo TEXT;`,
            type: 'warning'
          })
        } else if (error) {
          throw error
        } else {
          setStatusMsg({ text: `Categoría "${payload.nombre}" actualizada exitosamente.`, type: 'success' })
        }
        setEditCat(null)
      } else {
        let { error } = await supabase.from('categorias').insert([payload])
        if (error && (error.message.includes('imagen_sin_fondo') || error.code === '42703')) {
          const { imagen_sin_fondo, ...fallbackPayload } = payload
          const { error: err2 } = await supabase.from('categorias').insert([fallbackPayload])
          if (err2) throw err2
          setStatusMsg({
            text: `Categoría "${payload.nombre}" creada. Nota: Para guardar la imagen sin fondo en Supabase, ejecuta: ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS imagen_sin_fondo TEXT;`,
            type: 'warning'
          })
        } else if (error) {
          throw error
        } else {
          setStatusMsg({ text: `Categoría "${payload.nombre}" creada exitosamente.`, type: 'success' })
        }
      }
      setForm(EMPTY_CAT)
      refetch()
    } catch (err) {
      setStatusMsg({ text: `Error: ${err.message}`, type: 'error' })
    }
  }

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`Eliminar la categoria "${nombre}"? Los productos con esta categoria quedaran sin categoria.`)) return
    try {
      const { error } = await supabase.from('categorias').delete().eq('id', id)
      if (error) throw error
      setStatusMsg({ text: `Categoria "${nombre}" eliminada.`, type: 'success' })
      refetch()
    } catch (err) {
      setStatusMsg({ text: `Error: ${err.message}`, type: 'error' })
    }
  }

  const startEdit = (c) => {
    setEditCat(c)
    setForm({
      nombre: c.nombre,
      slug: c.slug,
      descripcion: c.descripcion || '',
      imagen_url: c.imagen_url || '',
      imagen_sin_fondo: c.imagen_sin_fondo || '',
      orden: c.orden
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!auth.isAuthorized) return <AdminAuthGate auth={auth} />

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      <div className="apage-header">
        <div>
          <span className="overline">Estructura del Catalogo</span>
          <h1 className="apage-title">Categorias</h1>
          <p className="apage-subtitle">{categories.length} categorias activas</p>
        </div>
      </div>

      {statusMsg.text && (
        <div className={`a-status a-status--${statusMsg.type}`}>{statusMsg.text}</div>
      )}

      <div className="admin-categories-grid">

        {/* Formulario */}
        <div className="a-card">
          <p className="a-card-title">{editCat ? `Editando: ${editCat.nombre}` : 'Nueva Categoria'}</p>
          <p className="a-card-subtitle">Define el nombre, slug URL y foto de la categoria.</p>

          <form onSubmit={handleSave} className="a-form">
            <div className="a-field">
              <label htmlFor="cat-nombre" className="a-label">Nombre *</label>
              <input
                id="cat-nombre"
                className="a-input"
                placeholder="Ej: Accesorios"
                value={form.nombre}
                onChange={e => {
                  const nombre = e.target.value
                  setForm(f => ({ ...f, nombre, slug: f.slug || autoSlug(nombre) }))
                }}
              />
            </div>

            <div className="a-field">
              <label htmlFor="cat-slug" className="a-label">Slug (URL) *</label>
              <div style={{ display: 'flex', border: '1px solid var(--color-border)', background: '#fff' }}>
                <span style={{ padding: '0 0.75rem', lineHeight: '2.8rem', color: 'var(--color-gold-dark)', fontWeight: 600, fontSize: '0.82rem', borderRight: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
                  /categoria/
                </span>
                <input
                  id="cat-slug"
                  className="a-input"
                  style={{ border: 'none', boxShadow: 'none' }}
                  placeholder="accesorios"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: autoSlug(e.target.value) }))}
                />
              </div>
            </div>

            <div className="a-field">
              <label htmlFor="cat-desc" className="a-label">Descripcion</label>
              <textarea
                id="cat-desc"
                className="a-input a-textarea"
                placeholder="Descripcion breve de la categoria..."
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </div>

            <div className="a-field">
              <label htmlFor="cat-orden" className="a-label">Orden de aparicion</label>
              <input
                id="cat-orden"
                className="a-input"
                type="number"
                min="1"
                value={form.orden}
                onChange={e => setForm(f => ({ ...f, orden: e.target.value }))}
              />
            </div>

            <div className="a-field">
              <span className="a-label">Imagen de Portada</span>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                Se muestra en la página de inicio como fondo de la tarjeta de categoría.
              </p>
              <ImageUploader
                value={form.imagen_url}
                onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
              />
            </div>

            <div className="a-field" style={{ marginTop: 'var(--space-md)' }}>
              <span className="a-label">Imagen sin fondo <span style={{ color: 'var(--color-gold)' }}>(para menú de navegación)</span></span>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                Usa una imagen PNG con fondo transparente. Se muestra en el menú móvil sobre el fondo glass.
              </p>
              <ImageUploader
                value={form.imagen_sin_fondo}
                onChange={url => setForm(f => ({ ...f, imagen_sin_fondo: url }))}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <button id="cat-submit" type="submit" className="a-btn a-btn-primary">
                {editCat ? 'Guardar Cambios' : 'Crear Categoria'}
              </button>
              {editCat && (
                <button type="button" className="a-btn a-btn-outline" onClick={() => { setEditCat(null); setForm(EMPTY_CAT) }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista */}
        <div className="a-card">
          <p className="a-card-title">Categorias Existentes</p>
          <div className="admin-categories-list">
            {categories.map(c => (
              <div key={c.id ?? c.slug} className="admin-category-item">
                <img
                  src={c.imagen_url}
                  alt={c.nombre}
                  className="admin-category-item__image"
                />
                <div className="admin-category-item__details">
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 500 }}>{c.nombre}</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--color-gold-dark)' }}>/{c.slug}</p>
                  {c.descripcion && <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{c.descripcion}</p>}
                </div>
                <div className="admin-category-item__actions">
                  <button type="button" className="a-btn a-btn-outline a-btn-sm" onClick={() => startEdit(c)}>Editar</button>
                  <button type="button" className="a-btn a-btn-danger" onClick={() => handleDelete(c.id, c.nombre)}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
