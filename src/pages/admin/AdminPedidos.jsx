import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import AdminAuthGate from '../../components/admin/AdminAuthGate'

const ESTADOS = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado']

const ESTADO_BADGE = {
  pendiente:  'a-badge--gray',
  confirmado: 'a-badge--blue',
  enviado:    'a-badge--gold',
  entregado:  'a-badge--green',
  cancelado:  'a-badge--red',
}

export default function AdminPedidos() {
  const auth = useAdminAuth()
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' })
  const [filterEstado, setFilterEstado] = useState('')
  const [search, setSearch] = useState('')

  const loadPedidos = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setPedidos(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (auth.isAuthorized) loadPedidos()
  }, [auth.isAuthorized, loadPedidos])

  const updateEstado = async (id, estado, pedido) => {
    try {
      const { error } = await supabase.from('pedidos').update({ estado }).eq('id', id)
      if (error) throw error

      if (estado === 'confirmado' && pedido?.producto_id) {
        const { data: prodData } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', pedido.producto_id)
          .maybeSingle()

        const currentStock = Number(prodData?.stock) || 1
        await supabase
          .from('productos')
          .update({
            publico: false,
            stock: Math.max(0, currentStock - 1)
          })
          .eq('id', pedido.producto_id)

        setStatusMsg({ text: `Pedido confirmado. "${pedido.nombre_producto}" se retiró de la tienda pública.`, type: 'success' })
      } else {
        setStatusMsg({ text: `Pedido actualizado a "${estado}".`, type: 'success' })
      }
      loadPedidos()
    } catch (err) {
      setStatusMsg({ text: `Error: ${err.message}`, type: 'error' })
    }
  }

  const aceptarPedido = async (pedido) => {
    if (!window.confirm(`¿Aceptar el pedido de "${pedido.nombre_producto}"? El artículo se retirará automáticamente del catálogo público.`)) return
    try {
      setLoading(true)
      const { error: pedError } = await supabase
        .from('pedidos')
        .update({ estado: 'confirmado' })
        .eq('id', pedido.id)
      if (pedError) throw pedError

      if (pedido.producto_id) {
        const { data: prodData } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', pedido.producto_id)
          .maybeSingle()

        const currentStock = Number(prodData?.stock) || 1
        await supabase
          .from('productos')
          .update({
            publico: false,
            stock: Math.max(0, currentStock - 1)
          })
          .eq('id', pedido.producto_id)
      }

      setStatusMsg({
        text: `Pedido aceptado. "${pedido.nombre_producto}" ha sido retirado de la tienda pública.`,
        type: 'success'
      })
      await loadPedidos()
    } catch (err) {
      setStatusMsg({ text: `Error: ${err.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const deletePedido = async (id) => {
    if (!window.confirm('Eliminar este pedido definitivamente?')) return
    try {
      const { error } = await supabase.from('pedidos').delete().eq('id', id)
      if (error) throw error
      setStatusMsg({ text: 'Pedido eliminado.', type: 'success' })
      loadPedidos()
    } catch (err) {
      setStatusMsg({ text: `Error: ${err.message}`, type: 'error' })
    }
  }

  const fmtLPS = (v) => `L ${Number(v).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`
  const fmtDate = (d) => new Date(d).toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' })
  const solicitarConfirmacion = (pedido) => {
    const telefono = (pedido.telefono || '').replace(/\D/g, '')
    if (!telefono) {
      setStatusMsg({ text: 'El pedido no tiene un teléfono válido para contactar al cliente.', type: 'error' })
      return
    }
    const mensaje = `Hola, ¿confirmas tu pedido de este artículo: ${pedido.nombre_producto}? Responde a este mensaje para confirmar.`
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener,noreferrer')
  }

  // Estadisticas rapidas
  const countByEstado = pedidos.reduce((acc, p) => {
    acc[p.estado] = (acc[p.estado] || 0) + 1
    return acc
  }, {})

  const filtrados = pedidos.filter(p => {
    const matchEstado = !filterEstado || p.estado === filterEstado
    const matchSearch = !search ||
      p.nombre_cliente?.toLowerCase().includes(search.toLowerCase()) ||
      p.nombre_producto?.toLowerCase().includes(search.toLowerCase())
    return matchEstado && matchSearch
  })

  if (!auth.isAuthorized) return <AdminAuthGate auth={auth} />

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      <div className="apage-header">
        <div>
          <span className="overline">Tienda Publica</span>
          <h1 className="apage-title">Pedidos Online</h1>
          <p className="apage-subtitle">Solicitudes realizadas desde el catalogo publico</p>
        </div>
        <button className="a-btn a-btn-outline" onClick={loadPedidos}>Actualizar</button>
      </div>

      {statusMsg.text && <div className={`a-status a-status--${statusMsg.type}`}>{statusMsg.text}</div>}

      {/* Resumen rapido */}
      <div className="a-stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {ESTADOS.map(est => (
          <div key={est} className="a-stat-card" style={{ cursor: 'pointer' }} onClick={() => setFilterEstado(filterEstado === est ? '' : est)}>
            <span className="a-stat-label">{est}</span>
            <span className="a-stat-value" style={{ fontSize: '1.6rem' }}>{countByEstado[est] || 0}</span>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="a-card">
        <div className="a-card-header">
          <div>
            <p className="a-card-title">Listado de Pedidos</p>
            <p className="a-card-subtitle">{filtrados.length} pedido(s)</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              id="ped-search"
              name="search"
              aria-label="Buscar pedido por cliente o producto"
              className="a-input"
              placeholder="Buscar cliente o producto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '210px' }}
            />
            <select
              id="ped-filter"
              name="statusFilter"
              aria-label="Filtrar pedidos por estado"
              className="a-input a-select"
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value)}
              style={{ width: '150px' }}
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem 0', fontSize: '0.82rem' }}>Cargando pedidos...</p>
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Cliente</th>
                  <th>Telefono</th>
                  <th>Direccion</th>
                  <th>Notas</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Sin pedidos.</td></tr>
                ) : filtrados.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.nombre_producto}</strong></td>
                    <td>{fmtLPS(p.precio)}</td>
                    <td>{p.nombre_cliente}</td>
                    <td>{p.telefono || '—'}</td>
                    <td style={{ maxWidth: '140px', fontSize: '0.72rem' }}>{p.direccion || '—'}</td>
                    <td style={{ maxWidth: '160px', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      <div>{p.notas || '—'}</div>
                      {(() => {
                        const match = p.notas?.match(/https?:\/\/[^\s|]+/i)
                        if (match) {
                          return (
                            <a
                              href={match[0]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="a-badge a-badge--gold"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', marginTop: '6px' }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                              Ver Comprobante
                            </a>
                          )
                        }
                        return null
                      })()}
                    </td>
                    <td>
                      <select
                        id={`pedido-estado-${p.id}`}
                        name={`pedidoEstado-${p.id}`}
                        aria-label={`Estado del pedido de ${p.nombre_producto}`}
                        className="a-input a-select"
                        style={{ width: '130px', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                        value={p.estado}
                        onChange={e => updateEstado(p.id, e.target.value, p)}
                      >
                        {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(p.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {p.estado === 'pendiente' && (
                          <button
                            type="button"
                            className="a-btn a-btn-sm"
                            style={{
                              backgroundColor: '#15803d',
                              color: '#ffffff',
                              border: '1px solid #15803d',
                              fontWeight: 600
                            }}
                            onClick={() => aceptarPedido(p)}
                            title="Aceptar pedido y retirar el artículo de la tienda pública"
                          >
                            ✓ Aceptar Pedido
                          </button>
                        )}
                        {p.estado === 'pendiente' && p.telefono && (
                          <button type="button" className="a-btn a-btn-outline a-btn-sm" onClick={() => solicitarConfirmacion(p)}>
                            Solicitar confirmación
                          </button>
                        )}
                        <button type="button" className="a-btn a-btn-danger a-btn-sm" onClick={() => deletePedido(p.id)}>
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
    </div>
  )
}
