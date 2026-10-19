import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import AdminAuthGate from '../../components/admin/AdminAuthGate'
import '../admin/AdminDashboard.css'

export default function AdminDashboard() {
  const auth = useAdminAuth()

  const [stats, setStats] = useState({
    totalProductos: 0,
    totalCategorias: 0,
    ventasHoy: 0,
    ingresosHoy: 0,
    pedidosPendientes: 0,
    totalPropietarios: 0,
    // Totales por tienda
    totalGissel: 0,
    ventasGissel: 0,
    totalShein: 0,
    ventasShein: 0,
  })
  const [ventasRecientes, setVentasRecientes] = useState([])
  const [pedidosRecientes, setPedidosRecientes] = useState([])
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Fetch propietarios para mapear IDs de Tienda Gissel y Shein
      const [
        { count: totalProductos },
        { count: totalCategorias },
        { data: ventasData },
        { count: pedidosPendientes },
        { count: totalPropietarios },
        { data: ventasRec },
        { data: pedidosRec },
        { data: propietariosData },
      ] = await Promise.all([
        supabase.from('productos').select('*', { count: 'exact', head: true }),
        supabase.from('categorias').select('*', { count: 'exact', head: true }),
        supabase
          .from('ventas')
          .select('precio_venta, nombre_propietario, propietario_id')
          .gte('fecha_venta', today.toISOString()),
        supabase.from('pedidos').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
        supabase.from('propietarios').select('*', { count: 'exact', head: true }),
        supabase
          .from('ventas')
          .select('id,nombre_producto,precio_venta,nombre_propietario,nombre_zona,canal,fecha_venta')
          .order('fecha_venta', { ascending: false })
          .limit(8),
        supabase
          .from('pedidos')
          .select('id,nombre_producto,precio,nombre_cliente,estado,created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('propietarios')
          .select('id, nombre')
          .eq('activo', true),
      ])

      const ingresosHoy = (ventasData || []).reduce((sum, v) => sum + parseFloat(v.precio_venta || 0), 0)

      // Identificar los IDs de Tienda Gissel y Tienda Shein
      const propsMap = {}
      ;(propietariosData || []).forEach(p => {
        propsMap[p.id] = p.nombre
      })

      // También considerar los IDs literales usados en inventario
      const isGissel = (propId, propNombre) => {
        if (!propId && !propNombre) return false
        const nombre = propsMap[propId] || propNombre || ''
        return nombre.toLowerCase().includes('gissel') || propId === 'tienda-gissel'
      }
      const isShein = (propId, propNombre) => {
        if (!propId && !propNombre) return false
        const nombre = propsMap[propId] || propNombre || ''
        return nombre.toLowerCase().includes('shein') || propId === 'tienda-shein'
      }

      const ventasArr = ventasData || []
      const gisselVentas = ventasArr.filter(v => isGissel(v.propietario_id, v.nombre_propietario))
      const sheinVentas  = ventasArr.filter(v => isShein(v.propietario_id, v.nombre_propietario))

      const totalGissel = gisselVentas.reduce((s, v) => s + parseFloat(v.precio_venta || 0), 0)
      const totalShein  = sheinVentas.reduce((s, v) => s + parseFloat(v.precio_venta || 0), 0)

      setStats({
        totalProductos: totalProductos || 0,
        totalCategorias: totalCategorias || 0,
        ventasHoy: ventasArr.length,
        ingresosHoy,
        pedidosPendientes: pedidosPendientes || 0,
        totalPropietarios: totalPropietarios || 0,
        totalGissel,
        ventasGissel: gisselVentas.length,
        totalShein,
        ventasShein: sheinVentas.length,
      })
      setVentasRecientes(ventasRec || [])
      setPedidosRecientes(pedidosRec || [])
    } catch (err) {
      console.error('Error cargando stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (auth.isAuthorized) loadStats()
  }, [auth.isAuthorized, loadStats])

  if (!auth.isAuthorized) return <AdminAuthGate auth={auth} />

  const fmtLPS = (v) => `L ${Number(v).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`

  return (
    <div className="admin-dashboard">
      <div className="apage-header">
        <div>
          <span className="overline">Panel Principal</span>
          <h1 className="apage-title">Dashboard</h1>
          <p className="apage-subtitle">Vista general del negocio — actualizado en tiempo real</p>
        </div>
        <button className="a-btn a-btn-outline" onClick={loadStats}>
          Actualizar
        </button>
      </div>

      {/* Totales del día por tienda */}
      <div className="dash-stores-header">
        <span className="overline" style={{ color: 'var(--color-gold-dark)', letterSpacing: '0.12em', fontSize: '0.7rem', fontWeight: 700 }}>
          RESUMEN DEL DÍA POR TIENDA
        </span>
      </div>

      <div className="dash-stores-grid">
        {/* Tienda S'TILOS GISSEL */}
        <div className="dash-store-card dash-store-card--gissel">
          <div className="dash-store-card__badge">Tienda S'TILOS GISSEL</div>
          <div className="dash-store-card__amount">
            {loading ? <span className="dash-store-skeleton">Cargando...</span> : fmtLPS(stats.totalGissel)}
          </div>
          <div className="dash-store-card__meta">
            {stats.ventasGissel} venta{stats.ventasGissel !== 1 ? 's' : ''} hoy
          </div>
          <div className="dash-store-card__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
        </div>

        {/* Tienda SHEIN */}
        <div className="dash-store-card dash-store-card--shein">
          <div className="dash-store-card__badge">Tienda SHEIN</div>
          <div className="dash-store-card__amount">
            {loading ? <span className="dash-store-skeleton">Cargando...</span> : fmtLPS(stats.totalShein)}
          </div>
          <div className="dash-store-card__meta">
            {stats.ventasShein} venta{stats.ventasShein !== 1 ? 's' : ''} hoy
          </div>
          <div className="dash-store-card__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
        </div>

        {/* Total combinado del día */}
        <div className="dash-store-card dash-store-card--total">
          <div className="dash-store-card__badge">Total del Día (Ambas Tiendas)</div>
          <div className="dash-store-card__amount dash-store-card__amount--bold">
            {loading ? <span className="dash-store-skeleton">Cargando...</span> : fmtLPS(stats.ingresosHoy)}
          </div>
          <div className="dash-store-card__meta">
            {stats.ventasHoy} venta{stats.ventasHoy !== 1 ? 's' : ''} en total hoy
          </div>
          <div className="dash-store-card__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Stats generales */}
      <div className="a-stats-grid">
        <div className="a-stat-card">
          <span className="a-stat-label">Productos en Catálogo</span>
          <span className="a-stat-value">{loading ? '—' : stats.totalProductos}</span>
          <span className="a-stat-sub">{stats.totalCategorias} categorías activas</span>
        </div>
        <div className="a-stat-card">
          <span className="a-stat-label">Pedidos Online Pendientes</span>
          <span className="a-stat-value">{loading ? '—' : stats.pedidosPendientes}</span>
          <span className="a-stat-sub">por confirmar o enviar</span>
        </div>
        <div className="a-stat-card">
          <span className="a-stat-label">Consignatarios / Propietarios</span>
          <span className="a-stat-value">{loading ? '—' : stats.totalPropietarios}</span>
          <span className="a-stat-sub">registrados en el sistema</span>
        </div>
      </div>

      <div className="dash-grid">
        {/* Ventas recientes */}
        <div className="a-card">
          <div className="a-card-header">
            <div>
              <p className="a-card-title">Ventas Recientes</p>
              <p className="a-card-subtitle">Últimos cobros registrados en zona de cobro</p>
            </div>
            <a href="/admin/ventas" className="a-btn a-btn-outline a-btn-sm">Ver Todas</a>
          </div>
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Monto</th>
                  <th>Vendido por</th>
                  <th>Zona</th>
                  <th>Canal</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {ventasRecientes.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>Sin ventas registradas aún</td></tr>
                ) : ventasRecientes.map(v => (
                  <tr key={v.id}>
                    <td>{v.nombre_producto}</td>
                    <td><strong>{fmtLPS(v.precio_venta)}</strong></td>
                    <td>{v.nombre_propietario || '—'}</td>
                    <td>{v.nombre_zona || '—'}</td>
                    <td>
                      <span className={`a-badge ${v.canal === 'online' ? 'a-badge--blue' : 'a-badge--gold'}`}>
                        {v.canal}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(v.fecha_venta).toLocaleDateString('es-HN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pedidos online pendientes */}
        <div className="a-card">
          <div className="a-card-header">
            <div>
              <p className="a-card-title">Pedidos Online</p>
              <p className="a-card-subtitle">Solicitudes recientes desde la tienda pública</p>
            </div>
            <a href="/admin/pedidos" className="a-btn a-btn-outline a-btn-sm">Gestionar</a>
          </div>
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cliente</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pedidosRecientes.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>Sin pedidos aún</td></tr>
                ) : pedidosRecientes.map(p => (
                  <tr key={p.id}>
                    <td>{p.nombre_producto}</td>
                    <td>{p.nombre_cliente}</td>
                    <td>{fmtLPS(p.precio)}</td>
                    <td>
                      <span className={`a-badge ${
                        p.estado === 'pendiente'  ? 'a-badge--gray'  :
                        p.estado === 'confirmado' ? 'a-badge--blue'  :
                        p.estado === 'enviado'    ? 'a-badge--gold'  :
                        p.estado === 'entregado'  ? 'a-badge--green' :
                        'a-badge--red'
                      }`}>{p.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
