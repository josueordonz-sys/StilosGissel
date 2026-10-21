import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import AdminAuthGate from '../../components/admin/AdminAuthGate'
import './AdminVentas.css'

// Audio Beep para confirmación de escaneo
function playBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(920, ctx.currentTime)
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.12)
  } catch (e) {
    // Silencioso si no hay soporte
  }
}

function speakProductAdded() {
  if (typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return
  window.speechSynthesis.cancel()
  const message = new window.SpeechSynthesisUtterance('Producto agregado correctamente')
  message.lang = 'es-HN'
  message.rate = 1
  window.speechSynthesis.speak(message)
}

export default function AdminVentas() {
  const auth = useAdminAuth()

  // Base de datos
  const [productos, setProductos] = useState([])
  const [zonas, setZonas] = useState([])
  const [propietarios, setPropietarios] = useState([])
  const [ventas, setVentas] = useState([])
  const [pedidosPendientes, setPedidosPendientes] = useState([])
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' })

  // Pestañas de venta
  const [salesTabs, setSalesTabs] = useState([
    { id: 1, name: 'Venta 1', cliente: 'Consumidor Final', items: [], discountPct: 0, zonaId: '' }
  ])
  const [activeTabId, setActiveTabId] = useState(1)

  // Búsqueda en escritorio
  const [searchTerm, setSearchTerm] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')

  // Modo de vista
  const [viewMode, setViewMode] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth <= 840 ? 'mobile' : 'desktop'
  })

  // Cámara / Escáner QR en Móvil
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const barcodeDetectorRef = useRef(null)
  const scanIntervalRef = useRef(null)
  const scanHandledRef = useRef(false)

  // Modal de Cobro & Vuelto & Quién Vendió
  const [showCobroModal, setShowCobroModal] = useState(false)
  const [metodoPago, setMetodoPago] = useState('Efectivo') // 'Efectivo' | 'Transferencia' | 'Tarjeta'
  const [efectivoRecibido, setEfectivoRecibido] = useState('')
  const [vendedorNombre, setVendedorNombre] = useState('')

  // Factura Térmica
  const [lastTicket, setLastTicket] = useState(null)
  const [showTicketModal, setShowTicketModal] = useState(false)
  const barcodeInputRef = useRef(null)

  // Cargar datos
  const loadData = useCallback(async () => {
    try {
      const [
        { data: prods },
        { data: zon },
        { data: props },
        { data: vents },
        { data: pedidos }
      ] = await Promise.all([
        supabase.from('productos').select('*').gt('stock', 0).order('nombre'),
        supabase.from('zonas_cobro').select('*').eq('activo', true).order('nombre'),
        supabase.from('propietarios').select('*').eq('activo', true).order('nombre'),
        supabase.from('ventas').select('*').order('fecha_venta', { ascending: false }).limit(60),
        supabase.from('pedidos').select('producto_id, nombre_producto, telefono, estado, notas').eq('estado', 'pendiente')
      ])
      setProductos(prods || [])
      setZonas(zon || [])
      setPropietarios(props || [])
      setVentas(vents || [])
      setPedidosPendientes(pedidos || [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    if (auth.isAuthorized) loadData()
  }, [auth.isAuthorized, loadData])

  // Detección automática de pantalla móvil
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 840 && viewMode === 'desktop') {
        setViewMode('mobile')
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [viewMode])

  // Pestaña actual y artículos
  const currentTab = salesTabs.find(t => t.id === activeTabId) || salesTabs[0]
  const cartItems = currentTab?.items || []

  // Cálculos financieros
  const subtotalGravado = cartItems.reduce((acc, it) => acc + (it.precio * it.cantidad), 0)
  const descuentoMonto = (subtotalGravado * (currentTab.discountPct || 0)) / 100
  const isvMonto = (subtotalGravado - descuentoMonto) * 0.15
  const totalPagar = Math.max(0, subtotalGravado - descuentoMonto)

  // Vuelto
  const efectivoNum = parseFloat(efectivoRecibido) || 0
  const vueltoCalculado = efectivoNum - totalPagar
  const fmtLPS = (v) => `L ${Number(v || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Agregar al carrito
  const handleAddToCart = useCallback((product) => {
    const pedidoPendiente = pedidosPendientes.find(p => p.producto_id === product?.id)
    if (pedidoPendiente) {
      setStatusMsg({ text: `Advertencia: "${pedidoPendiente.nombre_producto}" tiene un pedido pendiente de confirmar (${pedidoPendiente.telefono || 'sin teléfono'}). Contacta al cliente antes de venderlo.`, type: 'error' })
      return
    }
    if (!product || product.stock <= 0) {
      setStatusMsg({ text: `El producto "${product?.nombre || ''}" no tiene stock disponible.`, type: 'error' })
      return
    }

    const activeSale = salesTabs.find(tab => tab.id === activeTabId)
    const currentItem = activeSale?.items.find(item => item.id === product.id)
    if (currentItem && currentItem.cantidad >= product.stock) {
      setStatusMsg({ text: `Stock máximo alcanzado (${product.stock}) para ${product.nombre}`, type: 'error' })
      return
    }

    setSalesTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab

      const existingIndex = tab.items.findIndex(i => i.id === product.id)
      let updatedItems = []

      if (existingIndex > -1) {
        const currentQty = tab.items[existingIndex].cantidad
        if (currentQty >= product.stock) {
          setStatusMsg({ text: `Stock máximo alcanzado (${product.stock}) para ${product.nombre}`, type: 'error' })
          return tab
        }
        updatedItems = [...tab.items]
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          cantidad: currentQty + 1
        }
      } else {
        updatedItems = [
          ...tab.items,
          {
            id: product.id,
            codigo: product.codigo_barra || product.id.slice(0, 8),
            nombre: product.nombre,
            marca: product.marca || '',
            precio: Number(product.precio),
            cantidad: 1,
            propietario_id: product.propietario_id,
            stockMax: product.stock
          }
        ]
      }

      return { ...tab, items: updatedItems }
    }))

    playBeep()
    if (navigator.vibrate) navigator.vibrate([80])

    setStatusMsg({
      text: `Agregado: ${product.nombre} ${product.marca ? `(${product.marca})` : ''} — ${fmtLPS(product.precio)}`,
      type: 'success'
    })
    if (viewMode === 'mobile') speakProductAdded()
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 2500)
  }, [activeTabId, fmtLPS, pedidosPendientes, salesTabs, viewMode])

  // Escaneo con pistola lectora o enter manual en escritorio
  const handleBarcodeSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    const term = barcodeInput.trim().toLowerCase()
    if (!term) return

    let found = productos.find(p => p.codigo_barra?.toLowerCase() === term)
    if (!found) {
      found = productos.find(p => p.id?.toLowerCase() === term || term.includes(p.id?.toLowerCase()))
    }
    if (!found) {
      found = productos.find(p => p.nombre?.toLowerCase().includes(term) || p.marca?.toLowerCase().includes(term))
    }

    if (found) {
      handleAddToCart(found)
      setBarcodeInput('')
    } else {
      setStatusMsg({ text: `No se encontró prenda con código "${term}".`, type: 'error' })
    }
  }

  // Modificar cantidades y eliminar
  const handleUpdateQty = (itemId, newQty) => {
    setSalesTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab
      if (newQty <= 0) {
        return { ...tab, items: tab.items.filter(i => i.id !== itemId) }
      }
      return {
        ...tab,
        items: tab.items.map(i => {
          if (i.id === itemId) {
            return { ...i, cantidad: Math.min(newQty, i.stockMax || 999) }
          }
          return i
        })
      }
    }))
  }

  const handleRemoveItem = (itemId) => {
    setSalesTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab
      return { ...tab, items: tab.items.filter(i => i.id !== itemId) }
    }))
  }

  const handleClearCart = () => {
    setSalesTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab
      return { ...tab, items: [] }
    }))
  }

  // Pestañas de venta
  const handleNewTab = () => {
    const nextId = (Math.max(...salesTabs.map(t => t.id), 0)) + 1
    setSalesTabs(prev => [
      ...prev,
      { id: nextId, name: `Venta ${nextId}`, cliente: 'Consumidor Final', items: [], discountPct: 0, zonaId: zonas[0]?.id || '' }
    ])
    setActiveTabId(nextId)
  }

  const handleCloseTab = (tabId) => {
    if (salesTabs.length === 1) {
      handleClearCart()
      return
    }
    const filtered = salesTabs.filter(t => t.id !== tabId)
    setSalesTabs(filtered)
    if (activeTabId === tabId) {
      setActiveTabId(filtered[0].id)
    }
  }

  const updateCurrentTabField = (field, value) => {
    setSalesTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab
      return { ...tab, [field]: value }
    }))
  }

  // Atajo F5 para cobrar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F5' && !showCobroModal && cartItems.length > 0) {
        e.preventDefault()
        setShowCobroModal(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCobroModal, cartItems.length])

  // CÁMARA ESCÁNER QR EN MÓVIL
  const startCamera = async () => {
    setCameraError(null)
    scanHandledRef.current = false
    setIsCameraActive(true)

    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      if ('BarcodeDetector' in window) {
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a']
        })
      }

      let lastScannedCode = ''
      let lastScannedTime = 0

      scanIntervalRef.current = setInterval(async () => {
        if (scanHandledRef.current) return
        if (!videoRef.current || videoRef.current.readyState < 2) return

        try {
          if (barcodeDetectorRef.current) {
            const barcodes = await barcodeDetectorRef.current.detect(videoRef.current)
            if (scanHandledRef.current) return
            if (barcodes && barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue?.trim()
              const now = Date.now()

              if (rawValue && (rawValue !== lastScannedCode || now - lastScannedTime > 2500)) {
                lastScannedCode = rawValue
                lastScannedTime = now

                const term = rawValue.toLowerCase()
                const found = productos.find(p =>
                  p.codigo_barra?.toLowerCase() === term ||
                  p.id?.toLowerCase() === term ||
                  term.includes(p.id?.toLowerCase())
                )

                if (found) {
                  scanHandledRef.current = true
                  handleAddToCart(found)
                  stopCamera()
                } else {
                  setStatusMsg({ text: `Código no encontrado: "${rawValue}"`, type: 'error' })
                }
              }
            }
          }
        } catch (err) {
          // ignora frames
        }
      }, 300)

    } catch (err) {
      console.error('Error cámara:', err)
      setCameraError('Permiso de cámara no concedido o no disponible.')
      setIsCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    scanIntervalRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
  }

  useEffect(() => {
    return () => stopCamera()
  }, [])

  // COMPLETAR VENTA Y EMITIR FACTURA TÉRMICA
  const handleCompletarVenta = async () => {
    if (cartItems.length === 0) return
    if (!vendedorNombre.trim()) {
      setStatusMsg({ text: 'Por favor indica quién vendió el producto.', type: 'error' })
      return
    }
    if (metodoPago === 'Efectivo' && vueltoCalculado < 0) {
      setStatusMsg({ text: 'El efectivo recibido es menor al total a pagar.', type: 'error' })
      return
    }

    try {
      const zona = zonas.find(z => z.id === currentTab.zonaId) || zonas[0]
      const seller = vendedorNombre.trim()

      const rows = cartItems.map(item => ({
        producto_id: item.id,
        nombre_producto: item.nombre,
        precio_venta: item.precio * item.cantidad,
        propietario_id: item.propietario_id || null,
        nombre_propietario: seller,
        zona_cobro_id: zona?.id || null,
        nombre_zona: zona?.nombre || 'Caja Principal',
        canal: 'tienda',
        notas: `Vendedor: ${seller} | Pago: ${metodoPago} | Cliente: ${currentTab.cliente || 'Consumidor Final'} | Cant: ${item.cantidad} | Ticket: #SG-${Date.now().toString().slice(-6)}`
      }))

      const { error: insertErr } = await supabase.from('ventas').insert(rows)
      if (insertErr) throw insertErr

      // Descontar stock
      for (const item of cartItems) {
        const prodDb = productos.find(p => p.id === item.id)
        if (prodDb) {
          const newStock = Math.max(0, (prodDb.stock || 1) - item.cantidad)
          await supabase.from('productos').update({ stock: newStock }).eq('id', item.id)
        }
      }

      // Snapshot ticket
      const ticketData = {
        ticketNumber: `SG-${Date.now().toString().slice(-6)}`,
        fecha: new Date().toLocaleDateString('es-HN'),
        hora: new Date().toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' }),
        cliente: currentTab.cliente || 'Consumidor Final',
        vendedor: seller,
        cajero: auth.user?.nombre || seller,
        zona: zona?.nombre || 'Caja Principal',
        items: [...cartItems],
        subtotal: subtotalGravado,
        descuento: descuentoMonto,
        descuentoPct: currentTab.discountPct,
        isv: isvMonto,
        total: totalPagar,
        metodoPago,
        efectivoRecibido: metodoPago === 'Efectivo' ? efectivoNum : totalPagar,
        vuelto: metodoPago === 'Efectivo' ? Math.max(0, vueltoCalculado) : 0
      }

      setLastTicket(ticketData)
      setShowCobroModal(false)
      setShowTicketModal(true)

      handleClearCart()
      setEfectivoRecibido('')
      loadData()

      // Imprimir factura térmica
      setTimeout(() => {
        window.print()
      }, 500)

    } catch (err) {
      console.error(err)
      setStatusMsg({ text: `Error al procesar venta: ${err.message}`, type: 'error' })
    }
  }

  // Filtrar catálogo en desktop
  const filteredProducts = productos.filter(p => {
    const s = searchTerm.toLowerCase()
    return (
      p.nombre?.toLowerCase().includes(s) ||
      p.marca?.toLowerCase().includes(s) ||
      p.codigo_barra?.toLowerCase().includes(s)
    )
  })

  if (!auth.isAuthorized) return <AdminAuthGate auth={auth} />

  return (
    <div className="pos-container">
      {/* ── TOPBAR S'TILOS GISSEL (Colores de la página) ── */}
      <header className="pos-topbar">
        <div className="pos-topbar__left">
          <h1 className="pos-topbar__title">
            Zona de Cobro — S'TILOS GISSEL
          </h1>

          {/* Pestañas de Venta */}
          <div className="pos-topbar__tabs">
            {salesTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`pos-sale-tab ${tab.id === activeTabId ? 'is-active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                {tab.name}
                {salesTabs.length > 1 && (
                  <span
                    className="pos-sale-tab__close"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCloseTab(tab.id)
                    }}
                    title="Cerrar venta"
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="pos-topbar__actions">
          <button
            type="button"
            className="pos-btn-new-sale"
            onClick={handleNewTab}
          >
            + Nueva Venta
          </button>

          <button
            type="button"
            className="pos-btn-view-toggle"
            onClick={() => {
              if (viewMode === 'desktop') {
                setViewMode('mobile')
              } else {
                stopCamera()
                setViewMode('desktop')
              }
            }}
          >
            {viewMode === 'desktop' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                Modo Móvil (Cámara QR)
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                Modo Escritorio (Pistola)
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Alertas */}
      {statusMsg.text && (
        <div className={`a-status a-status--${statusMsg.type}`} style={{ margin: 0 }}>
          {statusMsg.text}
        </div>
      )}

      {/* ──────────────────────────────────────────────────
          VISTA 1: ESCRITORIO (A toda pantalla con colores de la tienda)
          ────────────────────────────────────────────────── */}
      {viewMode === 'desktop' && (
        <div className="pos-desktop-layout">
          {/* Columna Izquierda: Búsqueda, Pistola y Catálogo */}
          <div className="pos-panel-left">
            <div className="pos-form-row">
              <label className="pos-form-label" htmlFor="pos-customer">Cliente:</label>
              <input
                id="pos-customer"
                name="customer"
                type="text"
                className="pos-input"
                placeholder="Consumidor Final"
                value={currentTab.cliente}
                onChange={(e) => updateCurrentTabField('cliente', e.target.value)}
              />
            </div>

            {/* Input Escáner de Pistola */}
            <form onSubmit={handleBarcodeSubmit} className="pos-form-row">
              <label htmlFor="pos-barcode" className="pos-form-label pos-form-label--scanner">
                Escanea código:
              </label>
              <input
                id="pos-barcode"
                name="barcode"
                ref={barcodeInputRef}
                type="text"
                className="pos-input pos-input--scanner"
                placeholder="Escanea con la pistola de código de barras o escribe y presiona Enter..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                autoFocus
              />
            </form>

            {/* Buscar prendas */}
            <div className="pos-form-row">
              <label className="pos-form-label" htmlFor="pos-product-search">Buscar producto:</label>
              <input
                id="pos-product-search"
                name="productSearch"
                type="text"
                className="pos-input"
                placeholder="Filtrar por nombre, marca o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Tabla de Productos Disponibles */}
            <div className="pos-table-wrap">
              <table className="pos-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Prenda / Artículo</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th style={{ textAlign: 'center' }}>Agregar</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#78716c' }}>
                        No se encontraron prendas con stock disponible.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(prod => (
                      <tr key={prod.id} onClick={() => handleAddToCart(prod)}>
                        <td>
                          <span className="pos-code-badge">
                            {prod.codigo_barra || prod.id.slice(0, 10)}
                          </span>
                        </td>
                        <td>
                          <strong>{prod.nombre}</strong>
                          {prod.marca && <span style={{ color: 'var(--color-gold)', fontSize: '0.75rem', marginLeft: '6px' }}>({prod.marca})</span>}
                        </td>
                        <td style={{ color: 'var(--color-gold-dark)', fontWeight: 700 }}>
                          {fmtLPS(prod.precio)}
                        </td>
                        <td>
                          <span style={{ color: prod.stock <= 2 ? '#b91c1c' : '#44403c', fontWeight: 600 }}>
                            {prod.stock}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="pos-btn-add-mini"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddToCart(prod)
                            }}
                            title="Agregar al Carrito"
                          >
                            +
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Opciones Inferiores */}
            <div className="pos-left-bottom">

              <div className="pos-discount-wrap">
                <label htmlFor="pos-discount">Descuento:</label>
                <select
                  id="pos-discount"
                  name="discount"
                  aria-label="Descuento de la venta"
                  className="pos-discount-select"
                  value={currentTab.discountPct}
                  onChange={(e) => updateCurrentTabField('discountPct', Number(e.target.value))}
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                  <option value={15}>15%</option>
                  <option value={20}>20%</option>
                  <option value={25}>25%</option>
                  <option value={50}>50%</option>
                </select>
              </div>

              {zonas.length > 0 && (
                <div className="pos-discount-wrap">
                  <label htmlFor="pos-zone">Zona:</label>
                  <select
                    id="pos-zone"
                    name="zone"
                    aria-label="Zona de cobro"
                    className="pos-discount-select"
                    value={currentTab.zonaId}
                    onChange={(e) => updateCurrentTabField('zonaId', e.target.value)}
                  >
                    {zonas.map(z => (
                      <option key={z.id} value={z.id}>{z.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Carrito de Compra / Venta */}
          <div className="pos-panel-right">
            <h2 className="pos-cart-title">Carrito de Venta</h2>

            <div className="pos-cart-table-wrap">
              <table className="pos-table">
                <thead>
                  <tr>
                    <th>CÓDIGO</th>
                    <th>DESCRIPCIÓN</th>
                    <th style={{ textAlign: 'center' }}>CANT</th>
                    <th>P. UNIT</th>
                    <th>TOTAL</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '4rem 1rem', color: '#78716c' }}>
                        Carrito vacío. Escanea un código de prenda o selecciónala de la lista.
                      </td>
                    </tr>
                  ) : (
                    cartItems.map(item => (
                      <tr key={item.id}>
                        <td>
                          <span className="pos-code-badge">{item.codigo}</span>
                        </td>
                        <td>
                          <strong>{item.nombre}</strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="pos-cart-qty-ctrl">
                            <button
                              type="button"
                              className="pos-cart-qty-btn"
                              onClick={() => handleUpdateQty(item.id, item.cantidad - 1)}
                            >
                              −
                            </button>
                            <span className="pos-cart-qty-num">{item.cantidad}</span>
                            <button
                              type="button"
                              className="pos-cart-qty-btn"
                              onClick={() => handleUpdateQty(item.id, item.cantidad + 1)}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td>{fmtLPS(item.precio)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>
                          {fmtLPS(item.precio * item.cantidad)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="pos-btn-del-item"
                            onClick={() => handleRemoveItem(item.id)}
                            title="Eliminar"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumen Financiero */}
            <div className="pos-cart-summary">
              <div className="pos-summary-line">
                <span>Subtotal Gravado 15%:</span>
                <span>{fmtLPS(subtotalGravado)}</span>
              </div>
              {currentTab.discountPct > 0 && (
                <div className="pos-summary-line pos-summary-line--discount">
                  <span>Descuento ({currentTab.discountPct}%):</span>
                  <span>- {fmtLPS(descuentoMonto)}</span>
                </div>
              )}
              <div className="pos-summary-line">
                <span>I.S.V. 15%:</span>
                <span>{fmtLPS(isvMonto)}</span>
              </div>
              <div className="pos-summary-line pos-summary-line--total">
                <span>TOTAL A PAGAR:</span>
                <span className="pos-summary-total-val">{fmtLPS(totalPagar)}</span>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="pos-cart-actions">
              <button
                type="button"
                className="pos-btn-cart-secondary pos-btn-cart-secondary--red"
                onClick={() => {
                  if (cartItems.length > 0) {
                    handleRemoveItem(cartItems[cartItems.length - 1].id)
                  }
                }}
                disabled={cartItems.length === 0}
              >
                Quitar Item
              </button>

              <button
                type="button"
                className="pos-btn-cart-secondary"
                onClick={handleClearCart}
                disabled={cartItems.length === 0}
              >
                Limpiar Todo
              </button>

              <button
                type="button"
                className="pos-btn-cobrar"
                onClick={() => setShowCobroModal(true)}
                disabled={cartItems.length === 0}
              >
                COBRAR (F5)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────
          VISTA 2: MÓVIL DIRECTA A TODA LA PANTALLA
          (Cámara QR directa + Carrito sin inventario redundante)
          ────────────────────────────────────────────────── */}
      {viewMode === 'mobile' && (
        <div className="pos-mobile-full-layout">
          {/* Barra de Marca Móvil */}
          <div className="pos-mobile-brand-bar">
            <div className="pos-mobile-brand-info">
              <img src="/logo_sin_fondo.webp" alt="S'TILOS GISSEL" className="pos-mobile-brand-logo" />
              <div>
                <h2 className="pos-mobile-brand-name">S'TILOS GISSEL</h2>
                <span className="pos-mobile-brand-sub">ESCÁNER QR & COBRO RÁPIDO</span>
              </div>
            </div>

            <div className="pos-mobile-cart-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <span>{cartItems.length} {cartItems.length === 1 ? 'prenda' : 'prendas'}</span>
            </div>
          </div>

          {/* TARJETA CÁMARA ESCÁNER QR DIRECTA */}
          <div className="pos-mobile-scanner-card">
            <div className="pos-mobile-scanner-header">
              <span>CÁMARA DEL CELULAR</span>
              <span className="pos-mobile-scanner-badge">
                {isCameraActive ? 'ESCANEANDO QR' : 'LISTO PARA ESCANEAR'}
              </span>
            </div>

            <div className="pos-camera-viewport">
              {isCameraActive ? (
                <>
                  <video ref={videoRef} className="pos-camera-video" autoPlay playsInline muted />
                  <div className="pos-camera-reticle">
                    <div className="pos-camera-laser-gold" />
                  </div>
                </>
              ) : (
                <div className="pos-camera-idle-text">
                  <div className="pos-camera-idle-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <strong style={{ display: 'block', fontSize: '1.05rem', marginBottom: '0.3rem' }}>
                    Escáner de Código QR y Barra
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: '#a1a1aa' }}>
                    Apunta con la cámara a la etiqueta de la prenda para agregarla automáticamente a la venta.
                  </span>
                </div>
              )}
            </div>

            {cameraError && (
              <p style={{ color: '#b91c1c', fontSize: '0.8rem', margin: 0, textAlign: 'center' }}>
                {cameraError}
              </p>
            )}

            {isCameraActive ? (
              <button
                type="button"
                className="pos-btn-camera-toggle pos-btn-camera-toggle--stop"
                onClick={stopCamera}
              >
                Pausar Cámara
              </button>
            ) : (
              <button
                type="button"
                className="pos-btn-camera-toggle pos-btn-camera-toggle--start"
                onClick={startCamera}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Activar Cámara Escáner QR
              </button>
            )}
          </div>

          {/* CARRITO DE VENTA MÓVIL DIRECTO */}
          <div className="pos-mobile-cart-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--color-text-main)' }}>
                Artículos en Venta ({cartItems.length})
              </h3>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#b91c1c', fontSize: '0.76rem', textDecoration: 'underline', cursor: 'pointer' }}
                  onClick={handleClearCart}
                >
                  Vaciar
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#78716c', fontSize: '0.85rem' }}>
                Apunta con la cámara al código QR de la prenda para comenzar a cobrar.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '280px', overflowY: 'auto' }}>
                {cartItems.map(item => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.8rem',
                      background: 'var(--color-surface-soft)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.86rem', display: 'block', color: 'var(--color-text-main)' }}>
                        {item.nombre}
                      </strong>
                      <span style={{ fontSize: '0.74rem', color: 'var(--color-gold-dark)' }}>
                        {fmtLPS(item.precio)} c/u
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div className="pos-cart-qty-ctrl">
                        <button
                          type="button"
                          className="pos-cart-qty-btn"
                          onClick={() => handleUpdateQty(item.id, item.cantidad - 1)}
                        >
                          −
                        </button>
                        <span className="pos-cart-qty-num">{item.cantidad}</span>
                        <button
                          type="button"
                          className="pos-cart-qty-btn"
                          onClick={() => handleUpdateQty(item.id, item.cantidad + 1)}
                        >
                          +
                        </button>
                      </div>

                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-main)', minWidth: '65px', textAlign: 'right' }}>
                        {fmtLPS(item.precio * item.cantidad)}
                      </span>

                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#b91c1c', fontSize: '1rem', cursor: 'pointer', padding: '0 4px' }}
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total y Botón de Cobro Móvil */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Total:</span>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-gold-dark)' }}>
                {fmtLPS(totalPagar)}
              </span>
            </div>

            <button
              type="button"
              className="pos-btn-cobrar"
              onClick={() => setShowCobroModal(true)}
              disabled={cartItems.length === 0}
              style={{ width: '100%', padding: '0.95rem' }}
            >
              COBRAR {fmtLPS(totalPagar)}
            </button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────
          MODAL DE COBRO (Vuelto y Denominaciones)
          ────────────────────────────────────────────────── */}
      {showCobroModal && (
        <div className="pos-modal-backdrop" onClick={() => setShowCobroModal(false)}>
          <div className="pos-cobro-modal" onClick={e => e.stopPropagation()}>
            <div className="pos-cobro-modal__header">
              <h3 className="pos-cobro-modal__title">Cobro de Venta</h3>
              <button
                type="button"
                className="pos-cobro-modal__close"
                onClick={() => setShowCobroModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="pos-cobro-modal__body">
              {/* Total Destacado */}
              <div className="pos-total-display-box">
                <span className="pos-total-display-sub">Total a Cobrar</span>
                <div className="pos-total-display-val">{fmtLPS(totalPagar)}</div>
              </div>

              {/* Quién vendió este producto */}
              <div className="pos-cash-input-wrap">
                <label htmlFor="pos-seller" className="pos-form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span>¿Quién vendió este producto? *</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-gold-dark)', fontWeight: 600 }}>Obligatorio</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="pos-seller"
                    name="seller"
                    type="text"
                    className="pos-input"
                    placeholder="Nombre del vendedor o cajero..."
                    value={vendedorNombre}
                    onChange={e => setVendedorNombre(e.target.value)}
                    required
                  />
                  {propietarios.length > 0 && (
                    <select
                      id="pos-seller-select"
                      name="sellerPreset"
                      aria-label="Seleccionar personal"
                      className="pos-discount-select"
                      style={{ maxWidth: '140px', cursor: 'pointer' }}
                      onChange={e => {
                        if (e.target.value) setVendedorNombre(e.target.value)
                      }}
                      value=""
                    >
                      <option value="">Personal</option>
                      {propietarios.map(p => (
                        <option key={p.id} value={p.nombre}>{p.nombre}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Forma de Pago */}
              <div>
                <span className="pos-form-label" style={{ display: 'block', marginBottom: '0.4rem' }}>
                  Forma de Pago:
                </span>
                <div className="pos-payment-method-pills">
                  {['Efectivo', 'Transferencia', 'Tarjeta'].map(met => (
                    <button
                      key={met}
                      type="button"
                      className={`pos-method-pill ${metodoPago === met ? 'is-active' : ''}`}
                      onClick={() => {
                        setMetodoPago(met)
                        if (met !== 'Efectivo') {
                          setEfectivoRecibido(totalPagar.toString())
                        }
                      }}
                    >
                      {met}
                    </button>
                  ))}
                </div>
              </div>

              {/* Efectivo Recibido y Botones de Denominación */}
              {metodoPago === 'Efectivo' && (
                <div className="pos-cash-input-wrap">
                  <label htmlFor="pos-cash-received" className="pos-form-label">Efectivo Recibido (Lempiras):</label>
                  <input
                    id="pos-cash-received"
                    name="cashReceived"
                    type="number"
                    step="any"
                    className="pos-cash-input"
                    placeholder="0.00"
                    value={efectivoRecibido}
                    onChange={e => setEfectivoRecibido(e.target.value)}
                  />

                  {/* Denominaciones Rápidas */}
                  <div className="pos-denominations">
                    <button
                      type="button"
                      className="pos-denom-btn"
                      onClick={() => setEfectivoRecibido(totalPagar.toString())}
                    >
                      Exacto ({fmtLPS(totalPagar)})
                    </button>
                    {[100, 200, 500, 1000, 2000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        className="pos-denom-btn"
                        onClick={() => setEfectivoRecibido(amt.toString())}
                      >
                        L {amt}
                      </button>
                    ))}
                  </div>

                  {/* Vuelto / Cambio */}
                  {efectivoRecibido && (
                    <div className={`pos-vuelto-box ${vueltoCalculado >= 0 ? 'pos-vuelto-box--success' : 'pos-vuelto-box--insufficient'}`}>
                      <span>{vueltoCalculado >= 0 ? 'VUELTO / CAMBIO:' : 'FALTANTE:'}</span>
                      <span className="pos-vuelto-val">
                        {fmtLPS(Math.abs(vueltoCalculado))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {metodoPago === 'Transferencia' && (
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, background: 'var(--color-surface-soft)', padding: '0.85rem', borderRadius: '6px' }}>
                  Verifica que el cliente haya realizado la transferencia a una de las cuentas bancarias de S'TILOS GISSEL y te muestre su comprobante.
                </p>
              )}
            </div>

            <div className="pos-cobro-modal__footer">
              <button
                type="button"
                className="pos-btn-cart-secondary"
                onClick={() => setShowCobroModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="pos-btn-cobrar"
                onClick={handleCompletarVenta}
                disabled={!vendedorNombre.trim() || (metodoPago === 'Efectivo' && vueltoCalculado < 0)}
              >
                Completar e Imprimir Factura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────
          TICKET / FACTURA TÉRMICA CON LOGO
          ────────────────────────────────────────────────── */}
      {showTicketModal && lastTicket && (
        <div className="pos-modal-backdrop" onClick={() => setShowTicketModal(false)}>
          <div className="pos-ticket-modal" onClick={e => e.stopPropagation()}>
            <div className="thermal-ticket">
              <div className="thermal-ticket__header">
                <img src="/logo_sin_fondo.webp" alt="Logo" className="thermal-ticket__logo" />
                <h3 className="thermal-ticket__brand">S'TILOS GISSEL</h3>
                <p className="thermal-ticket__sub">Moda & Artículos Exclusivos</p>
                <p className="thermal-ticket__sub">Tel / WhatsApp: +504 9794-1476</p>
                <p className="thermal-ticket__sub">Honduras — Envíos a todo el país</p>
              </div>

              <hr className="thermal-ticket__divider" />

              <div className="thermal-ticket__meta">
                <div><strong>TICKET:</strong> #{lastTicket.ticketNumber}</div>
                <div><strong>FECHA:</strong> {lastTicket.fecha} {lastTicket.hora}</div>
                <div><strong>CLIENTE:</strong> {lastTicket.cliente}</div>
                <div><strong>VENDIDO POR:</strong> {lastTicket.vendedor}</div>
                <div><strong>ZONA / CAJA:</strong> {lastTicket.zona}</div>
              </div>

              <hr className="thermal-ticket__divider" />

              <table className="thermal-ticket__table">
                <thead>
                  <tr>
                    <th>DESCRIPCIÓN</th>
                    <th style={{ textAlign: 'center' }}>CANT</th>
                    <th style={{ textAlign: 'right' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {lastTicket.items.map(it => (
                    <tr key={it.id}>
                      <td>{it.nombre}</td>
                      <td style={{ textAlign: 'center' }}>{it.cantidad}</td>
                      <td style={{ textAlign: 'right' }}>{fmtLPS(it.precio * it.cantidad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="thermal-ticket__totals">
                <div className="thermal-ticket__total-line">
                  <span>Subtotal:</span>
                  <span>{fmtLPS(lastTicket.subtotal)}</span>
                </div>
                {lastTicket.descuento > 0 && (
                  <div className="thermal-ticket__total-line">
                    <span>Descuento:</span>
                    <span>- {fmtLPS(lastTicket.descuento)}</span>
                  </div>
                )}
                <div className="thermal-ticket__total-line">
                  <span>I.S.V. (15%):</span>
                  <span>{fmtLPS(lastTicket.isv)}</span>
                </div>
                <div className="thermal-ticket__total-line thermal-ticket__total-line--final">
                  <span>TOTAL A PAGAR:</span>
                  <span>{fmtLPS(lastTicket.total)}</span>
                </div>
                <div className="thermal-ticket__total-line">
                  <span>Método de Pago:</span>
                  <span>{lastTicket.metodoPago}</span>
                </div>
                <div className="thermal-ticket__total-line">
                  <span>Efectivo Recibido:</span>
                  <span>{fmtLPS(lastTicket.efectivoRecibido)}</span>
                </div>
                <div className="thermal-ticket__total-line" style={{ fontWeight: 700 }}>
                  <span>CAMBIO / VUELTO:</span>
                  <span>{fmtLPS(lastTicket.vuelto)}</span>
                </div>
              </div>

              <div className="thermal-ticket__footer">
                <hr className="thermal-ticket__divider" />
                <p>¡Gracias por su compra en S'TILOS GISSEL!</p>
                <p>Piezas exclusivas y garantizadas.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="pos-btn-cobrar"
                style={{ padding: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
                onClick={() => window.print()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Imprimir Ticket
              </button>
              <button
                type="button"
                className="pos-btn-cart-secondary"
                onClick={() => setShowTicketModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor Oculto para Impresión Directa */}
      {lastTicket && (
        <div className="thermal-ticket-container">
          <div className="thermal-ticket">
            <div className="thermal-ticket__header">
              <img src="/logo_sin_fondo.webp" alt="Logo" className="thermal-ticket__logo" />
              <h3 className="thermal-ticket__brand">S'TILOS GISSEL</h3>
              <p className="thermal-ticket__sub">Moda & Artículos Exclusivos</p>
              <p className="thermal-ticket__sub">Tel / WhatsApp: +504 9794-1476</p>
              <p className="thermal-ticket__sub">Honduras — Envíos a todo el país</p>
            </div>

            <hr className="thermal-ticket__divider" />

            <div className="thermal-ticket__meta">
              <div><strong>TICKET:</strong> #{lastTicket.ticketNumber}</div>
              <div><strong>FECHA:</strong> {lastTicket.fecha} {lastTicket.hora}</div>
              <div><strong>CLIENTE:</strong> {lastTicket.cliente}</div>
              <div><strong>VENDIDO POR:</strong> {lastTicket.vendedor}</div>
              <div><strong>ZONA / CAJA:</strong> {lastTicket.zona}</div>
            </div>

            <hr className="thermal-ticket__divider" />

            <table className="thermal-ticket__table">
              <thead>
                <tr>
                  <th>DESCRIPCIÓN</th>
                  <th style={{ textAlign: 'center' }}>CANT</th>
                  <th style={{ textAlign: 'right' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {lastTicket.items.map(it => (
                  <tr key={it.id}>
                    <td>{it.nombre}</td>
                    <td style={{ textAlign: 'center' }}>{it.cantidad}</td>
                    <td style={{ textAlign: 'right' }}>{fmtLPS(it.precio * it.cantidad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="thermal-ticket__totals">
              <div className="thermal-ticket__total-line">
                <span>Subtotal:</span>
                <span>{fmtLPS(lastTicket.subtotal)}</span>
              </div>
              {lastTicket.descuento > 0 && (
                <div className="thermal-ticket__total-line">
                  <span>Descuento:</span>
                  <span>- {fmtLPS(lastTicket.descuento)}</span>
                </div>
              )}
              <div className="thermal-ticket__total-line">
                <span>I.S.V. (15%):</span>
                <span>{fmtLPS(lastTicket.isv)}</span>
              </div>
              <div className="thermal-ticket__total-line thermal-ticket__total-line--final">
                <span>TOTAL A PAGAR:</span>
                <span>{fmtLPS(lastTicket.total)}</span>
              </div>
              <div className="thermal-ticket__total-line">
                <span>Método de Pago:</span>
                <span>{lastTicket.metodoPago}</span>
              </div>
              <div className="thermal-ticket__total-line">
                <span>Efectivo Recibido:</span>
                <span>{fmtLPS(lastTicket.efectivoRecibido)}</span>
              </div>
              <div className="thermal-ticket__total-line" style={{ fontWeight: 700 }}>
                <span>CAMBIO / VUELTO:</span>
                <span>{fmtLPS(lastTicket.vuelto)}</span>
              </div>
            </div>

            <div className="thermal-ticket__footer">
              <hr className="thermal-ticket__divider" />
              <p>¡Gracias por su compra en S'TILOS GISSEL!</p>
              <p>Piezas exclusivas y garantizadas.</p>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}
