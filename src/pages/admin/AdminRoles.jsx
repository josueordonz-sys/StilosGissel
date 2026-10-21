import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import AdminAuthGate from '../../components/admin/AdminAuthGate'
import './AdminRoles.css'

const ALL_PERMISOS = [
  { key: 'dashboard',   label: 'Dashboard' },
  { key: 'inventario',  label: 'Inventario' },
  { key: 'categorias',  label: 'Categorias' },
  { key: 'ventas',      label: 'Zona de Cobro' },
  { key: 'pedidos',     label: 'Pedidos Online' },
  { key: 'roles',       label: 'Roles y Accesos' },
]

const EMPTY_ROL = { nombre: '', permisos: {} }
const EMPTY_USER = { nombre: '', email: '', clave_hash: '', rol_id: '' }

export default function AdminRoles() {
  const auth = useAdminAuth()
  const [roles, setRoles] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [rolForm, setRolForm] = useState(EMPTY_ROL)
  const [userForm, setUserForm] = useState(EMPTY_USER)
  const [editRol, setEditRol] = useState(null)
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' })
  const [activeTab, setActiveTab] = useState('roles') // 'roles' | 'usuarios'

  const loadData = useCallback(async () => {
    try {
      const [{ data: rols }, { data: users }] = await Promise.all([
        supabase.from('roles').select('*').order('nombre'),
        supabase.from('admin_users').select('*, roles(nombre)').order('nombre'),
      ])
      setRoles(rols || [])
      setUsuarios(users || [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    if (auth.isAuthorized) loadData()
  }, [auth.isAuthorized, loadData])

  // Permisos toggle
  const togglePermiso = (key) => {
    setRolForm(f => ({
      ...f,
      permisos: { ...f.permisos, [key]: !f.permisos[key] }
    }))
  }

  const handleSaveRol = async (e) => {
    e.preventDefault()
    if (!rolForm.nombre) { setStatusMsg({ text: 'El nombre del rol es obligatorio.', type: 'error' }); return }
    try {
      if (editRol) {
        const { error } = await supabase.from('roles').update({ nombre: rolForm.nombre.trim(), permisos: rolForm.permisos }).eq('id', editRol.id)
        if (error) throw error
        setStatusMsg({ text: `Rol "${rolForm.nombre}" actualizado.`, type: 'success' })
        setEditRol(null)
      } else {
        const { error } = await supabase.from('roles').insert([{ nombre: rolForm.nombre.trim(), permisos: rolForm.permisos }])
        if (error) throw error
        setStatusMsg({ text: `Rol "${rolForm.nombre}" creado.`, type: 'success' })
      }
      setRolForm(EMPTY_ROL)
      loadData()
    } catch (err) {
      setStatusMsg({ text: `Error: ${err.message}`, type: 'error' })
    }
  }

  const handleDeleteRol = async (id, nombre) => {
    if (!window.confirm(`Eliminar el rol "${nombre}"?`)) return
    try {
      const { error } = await supabase.from('roles').delete().eq('id', id)
      if (error) throw error
      setStatusMsg({ text: `Rol "${nombre}" eliminado.`, type: 'success' })
      loadData()
    } catch (err) {
      setStatusMsg({ text: `Error: ${err.message}`, type: 'error' })
    }
  }

  const startEditRol = (r) => {
    setEditRol(r)
    setRolForm({ nombre: r.nombre, permisos: r.permisos || {} })
    setActiveTab('roles')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaveUser = async (e) => {
    e.preventDefault()
    const { nombre, email, clave_hash, rol_id } = userForm
    if (!nombre || !email || !clave_hash || !rol_id) {
      setStatusMsg({ text: 'Nombre, email, clave y rol son obligatorios.', type: 'error' })
      return
    }
    try {
      const { error } = await supabase.from('admin_users').insert([{
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        clave_hash: clave_hash,
        rol_id,
      }])
      if (error) throw error
      setStatusMsg({ text: `Usuario "${nombre}" creado. Puede ingresar al panel con su clave.`, type: 'success' })
      setUserForm(EMPTY_USER)
      loadData()
    } catch (err) {
      setStatusMsg({ text: `Error: ${err.message}`, type: 'error' })
    }
  }

  const handleDeleteUser = async (id, nombre) => {
    if (!window.confirm(`Eliminar al usuario "${nombre}"?`)) return
    try {
      const { error } = await supabase.from('admin_users').delete().eq('id', id)
      if (error) throw error
      setStatusMsg({ text: `Usuario "${nombre}" eliminado.`, type: 'success' })
      loadData()
    } catch (err) {
      setStatusMsg({ text: `Error: ${err.message}`, type: 'error' })
    }
  }

  if (!auth.isAuthorized) return <AdminAuthGate auth={auth} />

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      <div className="apage-header">
        <div>
          <span className="overline">Control de Acceso</span>
          <h1 className="apage-title">Roles y Accesos</h1>
          <p className="apage-subtitle">Define que pantallas puede ver cada miembro del equipo</p>
        </div>
      </div>

      {statusMsg.text && <div className={`a-status a-status--${statusMsg.type}`}>{statusMsg.text}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-xl)' }}>
        {['roles', 'usuarios'].map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.75rem 1.5rem',
              fontFamily: 'var(--font-body)',
              fontSize: '0.7rem',
              fontWeight: activeTab === tab ? 700 : 400,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: activeTab === tab ? 'var(--color-gold-dark)' : 'var(--color-text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--color-gold-dark)' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '-1px',
              borderBottomWidth: '2px',
              borderBottomStyle: 'solid',
            }}
          >
            {tab === 'roles' ? 'Roles de Acceso' : 'Usuarios del Panel'}
          </button>
        ))}
      </div>

      {activeTab === 'roles' && (
        <div className="admin-roles-grid">
          {/* Formulario rol */}
          <div className="a-card">
            <p className="a-card-title">{editRol ? `Editando: ${editRol.nombre}` : 'Crear Nuevo Rol'}</p>
            <p className="a-card-subtitle">Define el nombre y los modulos a los que este rol tendra acceso.</p>

            <form onSubmit={handleSaveRol} className="a-form">
              <div className="a-field">
                <label htmlFor="rol-nombre" className="a-label">Nombre del Rol *</label>
                <input
                  id="rol-nombre"
                  className="a-input"
                  placeholder="Ej: Vendedora, Bodeguero, Gerente..."
                  value={rolForm.nombre}
                  onChange={e => setRolForm(f => ({ ...f, nombre: e.target.value }))}
                />
              </div>

              <div className="a-field">
                <label className="a-label">Modulos con Acceso</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {ALL_PERMISOS.map(({ key, label }) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        id={`permiso-${key}`}
                        name={`permiso-${key}`}
                        type="checkbox"
                        style={{ accentColor: 'var(--color-gold-dark)', width: '16px', height: '16px' }}
                        checked={!!rolForm.permisos[key]}
                        onChange={() => togglePermiso(key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <button id="rol-submit" type="submit" className="a-btn a-btn-primary">
                  {editRol ? 'Guardar Cambios' : 'Crear Rol'}
                </button>
                {editRol && (
                  <button type="button" className="a-btn a-btn-outline" onClick={() => { setEditRol(null); setRolForm(EMPTY_ROL) }}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de roles */}
          <div className="a-card">
            <p className="a-card-title">Roles Configurados</p>
            <div className="admin-roles-list">
              {roles.map(r => (
                <div key={r.id} className="admin-role-item">
                  <div className="admin-role-item__header">
                    <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>{r.nombre}</strong>
                    <div className="admin-role-item__actions">
                      <button type="button" className="a-btn a-btn-outline a-btn-sm" onClick={() => startEditRol(r)}>Editar</button>
                      <button type="button" className="a-btn a-btn-danger" onClick={() => handleDeleteRol(r.id, r.nombre)}>Eliminar</button>
                    </div>
                  </div>
                  <div className="admin-role-item__permissions">
                    {ALL_PERMISOS.map(({ key, label }) =>
                      r.permisos?.[key] ? (
                        <span key={key} className="a-badge a-badge--green">{label}</span>
                      ) : (
                        <span key={key} className="a-badge a-badge--gray">{label}</span>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'usuarios' && (
        <div className="admin-users-grid">
          {/* Formulario usuario */}
          <div className="a-card">
            <p className="a-card-title">Agregar Usuario al Panel</p>
            <p className="a-card-subtitle">El usuario podra ingresar al panel con su email y clave asignada.</p>

            <form onSubmit={handleSaveUser} className="a-form">
              <div className="a-field">
                <label htmlFor="usr-nombre" className="a-label">Nombre Completo *</label>
                <input id="usr-nombre" className="a-input" placeholder="Nombre del colaborador" value={userForm.nombre} onChange={e => setUserForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="a-field">
                <label htmlFor="usr-email" className="a-label">Email *</label>
                <input id="usr-email" className="a-input" type="email" placeholder="correo@ejemplo.com" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="a-field">
                <label htmlFor="usr-clave" className="a-label">Clave de Acceso *</label>
                <input id="usr-clave" className="a-input" type="password" placeholder="Clave inicial..." value={userForm.clave_hash} onChange={e => setUserForm(f => ({ ...f, clave_hash: e.target.value }))} />
              </div>
              <div className="a-field">
                <label htmlFor="usr-rol" className="a-label">Rol Asignado *</label>
                <select id="usr-rol" className="a-input a-select" value={userForm.rol_id} onChange={e => setUserForm(f => ({ ...f, rol_id: e.target.value }))}>
                  <option value="">— Selecciona un rol —</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>
              <button id="usr-submit" type="submit" className="a-btn a-btn-primary">Agregar Usuario</button>
            </form>
          </div>

          {/* Lista de usuarios */}
          <div className="a-card">
            <p className="a-card-title">Usuarios Registrados</p>
            <div className="a-table-wrap">
              <table className="a-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Activo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Sin usuarios aun.</td></tr>
                  ) : usuarios.map(u => (
                    <tr key={u.id}>
                      <td><strong>{u.nombre}</strong></td>
                      <td style={{ fontSize: '0.72rem' }}>{u.email}</td>
                      <td>
                        <span className="a-badge a-badge--gold">{u.roles?.nombre || '—'}</span>
                      </td>
                      <td>
                        <span className={`a-badge ${u.activo ? 'a-badge--green' : 'a-badge--red'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="a-btn a-btn-danger" onClick={() => handleDeleteUser(u.id, u.nombre)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
