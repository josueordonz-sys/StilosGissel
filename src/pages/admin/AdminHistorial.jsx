import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import AdminAuthGate from '../../components/admin/AdminAuthGate'
import './AdminHistorial.css'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtLPS = (v) =>
  `L ${Number(v).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`

const toDateStr = (d) => d.toISOString().split('T')[0] // "YYYY-MM-DD"

const localDayBounds = (dateStr) => {
  // Returns start (00:00:00) and end (23:59:59) for a local date string
  const start = new Date(`${dateStr}T00:00:00`)
  const end   = new Date(`${dateStr}T23:59:59`)
  return { start, end }
}

const formatDisplayDate = (dateStr) => {
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('es-HN', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  })
}

const isToday = (dateStr) => toDateStr(new Date()) === dateStr
const isYesterday = (dateStr) => {
  const yest = new Date()
  yest.setDate(yest.getDate() - 1)
  return toDateStr(yest) === dateStr
}

const dayLabel = (dateStr) => {
  if (isToday(dateStr))     return 'Hoy'
  if (isYesterday(dateStr)) return 'Ayer'
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminHistorial() {
  const auth = useAdminAuth()

  // Fecha seleccionada (YYYY-MM-DD), inicia en ayer
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const [selectedDate, setSelectedDate] = useState(toDateStr(yesterday))

  const [data, setData] = useState({
    totalGissel: 0, ventasGissel: 0, itemsGissel: [],
    totalShein:  0, ventasShein:  0, itemsShein:  [],
    totalDia:    0, ventasTotales: 0,
  })
  const [loading, setLoading] = useState(true)

  // ─── Carga datos del día seleccionado ───────────────────────────────────────
  const loadDay = useCallback(async (dateStr) => {
    setLoading(true)
    try {
      const { start, end } = localDayBounds(dateStr)

      const [
        { data: ventasData },
        { data: propietariosData },
      ] = await Promise.all([
        supabase
          .from('ventas')
          .select('id, nombre_producto, precio_venta, propietario_id, nombre_propietario, nombre_zona, canal, fecha_venta')
          .gte('fecha_venta', start.toISOString())
          .lte('fecha_venta', end.toISOString())
          .order('fecha_venta', { ascending: false }),
        supabase
          .from('propietarios')
          .select('id, nombre')
          .eq('activo', true),
      ])

      const propsMap = {}
      ;(propietariosData || []).forEach(p => { propsMap[p.id] = p.nombre })

      const isGissel = (propId) => {
        const nombre = propsMap[propId] || ''
        return nombre.toLowerCase().includes('gissel') || propId === 'tienda-gissel'
      }
      const isShein = (propId) => {
        const nombre = propsMap[propId] || ''
        return nombre.toLowerCase().includes('shein') || propId === 'tienda-shein'
      }

      const ventas = ventasData || []
      const gisselItems = ventas.filter(v => isGissel(v.propietario_id))
      const sheinItems  = ventas.filter(v => isShein(v.propietario_id))

      const totalGissel = gisselItems.reduce((s, v) => s + parseFloat(v.precio_venta || 0), 0)
      const totalShein  = sheinItems.reduce((s, v) => s + parseFloat(v.precio_venta || 0), 0)

      setData({
        totalGissel, ventasGissel: gisselItems.length, itemsGissel: gisselItems,
        totalShein,  ventasShein:  sheinItems.length,  itemsShein:  sheinItems,
        totalDia: totalGissel + totalShein,
        ventasTotales: ventas.length,
      })
    } catch (err) {
      console.error('Error cargando historial:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (auth.isAuthorized) loadDay(selectedDate)
  }, [auth.isAuthorized, selectedDate, loadDay])

  if (!auth.isAuthorized) return <AdminAuthGate auth={auth} />

  // ─── Navegación entre días ─────────────────────────────────────────────────
  const goDay = (offset) => {
    const d = new Date(`${selectedDate}T12:00:00`)
    d.setDate(d.getDate() + offset)
    const newStr = toDateStr(d)
    // No navegar a fechas futuras
    if (newStr <= toDateStr(new Date())) setSelectedDate(newStr)
  }

  const todayStr = toDateStr(new Date())
  const isAtToday = selectedDate === todayStr

  const badge = dayLabel(selectedDate)

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="hist-container">
      {/* Header */}
      <div className="apage-header">
        <div>
          <span className="overline">Reportes por Día</span>
          <h1 className="apage-title">Historial de Ventas</h1>
          <p className="apage-subtitle">Consulta los ingresos de cualquier día pasado por tienda</p>
        </div>
        <button className="a-btn a-btn-outline" onClick={() => loadDay(selectedDate)}>
          Actualizar
        </button>
      </div>

      {/* Navegador de Fecha */}
      <div className="hist-date-nav">
        <button
          className="hist-nav-btn"
          onClick={() => goDay(-1)}
          title="Día anterior"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div className="hist-date-center">
          {badge && <span className="hist-date-badge">{badge}</span>}
          <div className="hist-date-display">{formatDisplayDate(selectedDate)}</div>
          <input
            id="historial-date"
            name="date"
            aria-label="Fecha del historial"
            type="date"
            className="hist-date-input"
            value={selectedDate}
            max={todayStr}
            onChange={e => {
              if (e.target.value && e.target.value <= todayStr) {
                setSelectedDate(e.target.value)
              }
            }}
          />
        </div>

        <button
          className="hist-nav-btn"
          onClick={() => goDay(1)}
          disabled={isAtToday}
          title="Día siguiente"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Accesos rápidos */}
      <div className="hist-quick-links">
        {[
          { label: 'Ayer',       offset: -1 },
          { label: 'Hace 2 días', offset: -2 },
          { label: 'Hace 3 días', offset: -3 },
          { label: 'Hace 7 días', offset: -7 },
        ].map(({ label, offset }) => {
          const d = new Date()
          d.setDate(d.getDate() + offset)
          const ds = toDateStr(d)
          return (
            <button
              key={label}
              className={`hist-quick-btn ${selectedDate === ds ? 'is-active' : ''}`}
              onClick={() => setSelectedDate(ds)}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Cards por tienda */}
      <div className="dash-stores-grid hist-cards-gap">
        {/* S'TILOS GISSEL */}
        <div className="dash-store-card dash-store-card--gissel">
          <div className="dash-store-card__badge">Tienda S'TILOS GISSEL</div>
          <div className="dash-store-card__amount">
            {loading ? <span className="dash-store-skeleton">Cargando...</span> : fmtLPS(data.totalGissel)}
          </div>
          <div className="dash-store-card__meta">
            {data.ventasGissel} venta{data.ventasGissel !== 1 ? 's' : ''} ese día
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
            {loading ? <span className="dash-store-skeleton">Cargando...</span> : fmtLPS(data.totalShein)}
          </div>
          <div className="dash-store-card__meta">
            {data.ventasShein} venta{data.ventasShein !== 1 ? 's' : ''} ese día
          </div>
          <div className="dash-store-card__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
        </div>

        {/* Total combinado */}
        <div className="dash-store-card dash-store-card--total">
          <div className="dash-store-card__badge">Total del Día (Ambas Tiendas)</div>
          <div className="dash-store-card__amount dash-store-card__amount--bold">
            {loading ? <span className="dash-store-skeleton">Cargando...</span> : fmtLPS(data.totalDia)}
          </div>
          <div className="dash-store-card__meta">
            {data.ventasTotales} venta{data.ventasTotales !== 1 ? 's' : ''} en total
          </div>
          <div className="dash-store-card__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Detalle de ventas: Gissel */}
      {!loading && (
        <div className="hist-detail-grid">
          <VentasTable
            title="Detalle — S'TILOS GISSEL"
            items={data.itemsGissel}
            accentClass="hist-table--gissel"
          />
          <VentasTable
            title="Detalle — Tienda SHEIN"
            items={data.itemsShein}
            accentClass="hist-table--shein"
          />
        </div>
      )}

      {loading && (
        <div className="hist-loading">
          <div className="hist-spinner" />
          <span>Cargando ventas del día...</span>
        </div>
      )}
    </div>
  )
}

// ─── Sub-componente tabla ─────────────────────────────────────────────────────
function VentasTable({ title, items, accentClass }) {
  const total = items.reduce((s, v) => s + parseFloat(v.precio_venta || 0), 0)

  return (
    <div className={`a-card hist-table-card ${accentClass}`}>
      <div className="a-card-header">
        <div>
          <p className="a-card-title">{title}</p>
          <p className="a-card-subtitle">{items.length} transacciones · Total: {fmtLPS(total)}</p>
        </div>
      </div>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Monto</th>
              <th>Vendido por</th>
              <th>Zona</th>
              <th>Hora</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  Sin ventas registradas para esta tienda en el día seleccionado.
                </td>
              </tr>
            ) : items.map(v => (
              <tr key={v.id}>
                <td><strong>{v.nombre_producto}</strong></td>
                <td style={{ color: 'var(--color-gold-dark)', fontWeight: 700 }}>{fmtLPS(v.precio_venta)}</td>
                <td>{v.nombre_propietario || '—'}</td>
                <td>{v.nombre_zona || '—'}</td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                  {new Date(v.fecha_venta).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
