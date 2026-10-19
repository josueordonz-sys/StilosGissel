import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { supabase } from '../../lib/supabaseClient'
import './CartDrawer.css'

const WHATSAPP_NUMBER = '50497941476'
const WHATSAPP_DISPLAY = '+504 9794-1476'
const PHONE_REGIONS = [
  { country: 'Honduras', code: '+504' }, { country: 'Guatemala', code: '+502' },
  { country: 'El Salvador', code: '+503' }, { country: 'Nicaragua', code: '+505' },
  { country: 'Costa Rica', code: '+506' }, { country: 'Panamá', code: '+507' },
  { country: 'México', code: '+52' }, { country: 'Estados Unidos', code: '+1' },
  { country: 'Colombia', code: '+57' }, { country: 'España', code: '+34' }
]

// Cuentas bancarias oficiales de S'TILOS GISSEL
const BANK_ACCOUNTS = [
  {
    id: 'atlantida',
    name: 'Banco Atlántida',
    number: '2020022320',
    holder: 'Marco Tulio Membreño Espinoza',
    badgeColor: '#cf2222',
    iconBg: '#fbebeb'
  },
  {
    id: 'bac',
    name: 'BAC Credomatic',
    number: '744722671',
    holder: 'Elsi Siomara Gomez Chinchilla',
    badgeColor: '#e01931',
    iconBg: '#feebee'
  },
  {
    id: 'banpais',
    name: 'BANPAIS',
    number: '216350229804',
    holder: 'Quengdy Yadira Hernandez',
    badgeColor: '#00549f',
    iconBg: '#e9f2fa'
  },
  {
    id: 'ficohsa',
    name: 'Ficohsa',
    number: '200018397896',
    holder: 'Francisca Enma Chinchilla Villeda',
    badgeColor: '#003a70',
    iconBg: '#e6eff7'
  },
  {
    id: 'davivienda',
    name: 'DAVIVIENDA',
    number: '3091324014',
    holder: 'Elsi Siomara Gomez Chinchilla',
    badgeColor: '#eb1c24',
    iconBg: '#fde9ea'
  },
  {
    id: 'occidente',
    name: 'Banco de Occidente',
    number: '219040148584',
    holder: 'Elsi Siomara Gomez Chinchilla',
    badgeColor: '#00843d',
    iconBg: '#e7f5ed'
  }
]

export default function CartDrawer() {
  const {
    items,
    totalCount,
    formattedSubtotal,
    isOpen,
    closeCart,
    updateQuantity,
    removeFromCart,
    clearCart
  } = useCart()

  const [paymentMethod, setPaymentMethod] = useState('whatsapp') // 'whatsapp' | 'transfer'
  const [copiedBankId, setCopiedBankId] = useState(null)
  const [phoneRegion, setPhoneRegion] = useState('+504')
  const [customerPhone, setCustomerPhone] = useState('')
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderError, setOrderError] = useState('')
  const drawerRef = useRef(null)

  // Cerrar con Escape y bloquear scroll del body
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeCart()
    }

    document.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen, closeCart])

  if (!isOpen) return null

  // Copiar número de cuenta al portapapeles
  const handleCopyAccount = (bank) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(bank.number)
        .then(() => {
          setCopiedBankId(bank.id)
          setTimeout(() => setCopiedBankId(null), 2000)
        })
        .catch(err => console.error('Error al copiar:', err))
    } else {
      // Fallback manual
      const textarea = document.createElement('textarea')
      textarea.value = bank.number
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedBankId(bank.id)
      setTimeout(() => setCopiedBankId(null), 2000)
    }
  }

  // Genera URL de WhatsApp estructurado con fotos, descripción y detalles del pedido
  const generateWhatsAppUrl = (isTransfer = false) => {
    if (items.length === 0) return '#'

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://estilosgissel.com'

    let message = ''

    if (isTransfer) {
      message += `*CONFIRMACIÓN DE TRANSFERENCIA — S'TILOS GISSEL*\n`
      message += `WhatsApp Oficial: ${WHATSAPP_DISPLAY}\n\n`
      message += `*DETALLE DEL PEDIDO:*\n`
    } else {
      message += `*NUEVO PEDIDO — S'TILOS GISSEL*\n`
      message += `WhatsApp Oficial: ${WHATSAPP_DISPLAY}\n\n`
      message += `*DETALLE DE ARTÍCULOS:*\n`
    }
    message += `Teléfono del cliente: ${phoneRegion} ${customerPhone.trim()}\n\n`

    items.forEach((item, index) => {
      const p = item.product
      const colorStr = item.selectedColor?.name
        ? ` | Color: ${item.selectedColor.name}`
        : ''
      const price = Number(p.precio) || 0
      const formatted = `L. ${(price * item.quantity).toLocaleString('es-HN', {
        minimumFractionDigits: 2
      })}`

      // URL absoluta de la foto para que WhatsApp genere vista previa y permita abrir la foto
      const rawImg = item.selectedColor?.imagen_url || p.imagen_url || ''
      const fullImgUrl = rawImg.startsWith('http')
        ? rawImg
        : rawImg ? `${origin}${rawImg}` : ''

      message += `\n${index + 1}. *${p.nombre}*${colorStr}\n`
      message += `   • Cantidad: ${item.quantity}\n`
      message += `   • Subtotal: ${formatted}\n`
      if (p.descripcion) {
        // Descripción breve del producto
        const cleanDesc = p.descripcion.replace(/\n+/g, ' ').slice(0, 110)
        message += `   • Descripción: ${cleanDesc}${p.descripcion.length > 110 ? '...' : ''}\n`
      }
      if (fullImgUrl) {
        message += `   • Foto del producto: ${fullImgUrl}\n`
      }
    })

    message += `\n─────────────────────\n`
    message += `*TOTAL A PAGAR: ${formattedSubtotal}*\n`
    message += `*MÉTODO DE PAGO:* ${isTransfer ? 'Transferencia Bancaria' : 'WhatsApp Directo'}\n`
    message += `─────────────────────\n\n`

    if (isTransfer) {
      message += `Hola S'TILOS GISSEL, ya realicé la transferencia bancaria para este pedido. Adjunto aquí la fotografía de mi comprobante de pago.`
    } else {
      message += `Hola S'TILOS GISSEL, deseo consultar disponibilidad y coordinar el envío de mi pedido.`
    }

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
  }

  const handleOrder = async (event, isTransfer = false) => {
    event.preventDefault()
    if (savingOrder) return
    if (!customerPhone.trim()) {
      setOrderError('Ingresa tu número de teléfono para continuar.')
      return
    }
    setOrderError('')
    setSavingOrder(true)
    try {
      const rows = items.map(item => ({
        producto_id: item.product.id,
        nombre_producto: item.product.nombre,
        precio: Number(item.product.precio) || 0,
        nombre_cliente: 'Pedido por WhatsApp',
        telefono: `${phoneRegion} ${customerPhone.trim()}`,
        notas: [item.selectedColor?.name && `Color: ${item.selectedColor.name}`, `Cantidad: ${item.quantity}`, `Método de pago: ${isTransfer ? 'Transferencia bancaria' : 'WhatsApp directo'}`].filter(Boolean).join(' | '),
        estado: 'pendiente'
      }))
      const { error } = await supabase.from('pedidos').insert(rows)
      if (error) throw error
      window.open(generateWhatsAppUrl(isTransfer), '_blank', 'noopener,noreferrer')
      clearCart()
      setCustomerPhone('')
      setPhoneRegion('+504')
      setPaymentMethod('whatsapp')
      closeCart()
    } catch (error) {
      setOrderError(`No se pudo registrar el pedido: ${error.message}`)
    } finally {
      setSavingOrder(false)
    }
  }

  return (
    <div className="cart-drawer-portal">
      {/* Overlay de fondo */}
      <div
        className="cart-drawer__backdrop"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Panel deslizante */}
      <aside
        ref={drawerRef}
        className="cart-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
      >
        {/* Header */}
        <div className="cart-drawer__header">
          <div className="cart-drawer__title-wrap">
            <h2 className="cart-drawer__title">Tu Bolsa</h2>
            {totalCount > 0 && (
              <span className="cart-drawer__count-badge">
                {totalCount} {totalCount === 1 ? 'artículo' : 'artículos'}
              </span>
            )}
          </div>
          <button
            type="button"
            className="cart-drawer__close-btn"
            onClick={closeCart}
            aria-label="Cerrar carrito"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="cart-drawer__empty">
            <div className="cart-drawer__empty-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <h3 className="cart-drawer__empty-title">Tu bolsa está vacía</h3>
            <p className="cart-drawer__empty-sub">
              Explora nuestras piezas exclusivas y agrega tus favoritas.
            </p>
            <button
              type="button"
              className="btn btn-primary cart-drawer__empty-btn"
              onClick={closeCart}
            >
              Comenzar a Comprar
            </button>
          </div>
        ) : (
          <div className="cart-drawer__body">
            {/* Lista de productos */}
            <div className="cart-drawer__items-list">
              {items.map((item) => {
                const p = item.product
                const price = Number(p.precio) || 0
                const formattedPrice = `L. ${price.toLocaleString('es-HN', {
                  minimumFractionDigits: 2
                })}`
                const itemImg =
                  item.selectedColor?.imagen_url ||
                  p.imagen_url ||
                  '/placeholder-product.svg'

                return (
                  <div key={item.cartItemId} className="cart-item">
                    <Link
                      to={`/producto/${p.id}`}
                      className="cart-item__image-wrap"
                      onClick={closeCart}
                    >
                      <img
                        src={itemImg}
                        alt={p.nombre}
                        className="cart-item__image"
                        loading="lazy"
                      />
                    </Link>

                    <div className="cart-item__details">
                      <div className="cart-item__top">
                        {p.marca && (
                          <span className="cart-item__brand">{p.marca}</span>
                        )}
                        <h4 className="cart-item__name">
                          <Link
                            to={`/producto/${p.id}`}
                            className="cart-item__name-link"
                            onClick={closeCart}
                          >
                            {p.nombre}
                          </Link>
                        </h4>
                      </div>

                      {item.selectedColor && (
                        <div className="cart-item__color">
                          <span
                            className="cart-item__color-dot"
                            style={{ backgroundColor: item.selectedColor.hex }}
                          />
                          <span className="cart-item__color-name">
                            {item.selectedColor.name || 'Color seleccionado'}
                          </span>
                        </div>
                      )}

                      <div className="cart-item__price">{formattedPrice}</div>

                      <div className="cart-item__actions">
                        <div className="cart-item__qty-selector">
                          <button
                            type="button"
                            className="cart-item__qty-btn"
                            onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                            aria-label="Disminuir cantidad"
                          >
                            −
                          </button>
                          <span className="cart-item__qty-value">{item.quantity}</span>
                          <button
                            type="button"
                            className="cart-item__qty-btn"
                            onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                            aria-label="Aumentar cantidad"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className="cart-item__remove-btn"
                          onClick={() => removeFromCart(item.cartItemId)}
                          aria-label={`Eliminar ${p.nombre} del carrito`}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* SECCIÓN FORMAS DE PAGO */}
            <div className="cart-drawer__phone-field">
              <label htmlFor="customer-phone">Tu número de teléfono <span aria-hidden="true">*</span></label>
              <div className="cart-drawer__phone-inputs">
                <select id="customer-phone-region" name="phoneRegion" aria-label="País del teléfono" value={phoneRegion} onChange={e => setPhoneRegion(e.target.value)} required>
                  {PHONE_REGIONS.map(region => <option key={region.code} value={region.code}>{region.country} ({region.code})</option>)}
                </select>
                <input id="customer-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" required value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Número de teléfono" />
              </div>
              {orderError && <p role="alert" style={{ color: '#b91c1c', fontSize: '0.8rem' }}>{orderError}</p>}
            </div>
            <div className="cart-drawer__payment-section">
              <span className="cart-drawer__payment-title overline">Forma de Pago</span>

              <div className="cart-drawer__payment-tabs" role="tablist">
                <button
                  type="button"
                  className={`cart-drawer__payment-tab ${paymentMethod === 'whatsapp' ? 'is-active' : ''}`}
                  onClick={() => setPaymentMethod('whatsapp')}
                  role="tab"
                  aria-selected={paymentMethod === 'whatsapp'}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  Pedir por WhatsApp
                </button>

                <button
                  type="button"
                  className={`cart-drawer__payment-tab ${paymentMethod === 'transfer' ? 'is-active' : ''}`}
                  onClick={() => setPaymentMethod('transfer')}
                  role="tab"
                  aria-selected={paymentMethod === 'transfer'}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  Transferencia
                </button>
              </div>

              {/* Vista Detalle: Transferencia Bancaria */}
              {paymentMethod === 'transfer' && (
                <div className="cart-drawer__transfer-box">
                  <div className="cart-drawer__transfer-header">
                    <h4 className="cart-drawer__transfer-title">Datos de Pago — Transferencia</h4>
                    <p className="cart-drawer__transfer-sub">
                      Toca en <strong>Copiar</strong> para copiar el número de cuenta de tu banco:
                    </p>
                  </div>

                  <div className="cart-drawer__bank-list">
                    {BANK_ACCOUNTS.map((bank) => {
                      const isCopied = copiedBankId === bank.id
                      return (
                        <div key={bank.id} className="bank-account-card">
                          <div className="bank-account-card__info">
                            <span
                              className="bank-account-card__name"
                              style={{ color: bank.badgeColor }}
                            >
                              {bank.name}
                            </span>
                            <span className="bank-account-card__number">{bank.number}</span>
                            <span className="bank-account-card__holder">{bank.holder}</span>
                          </div>

                          <button
                            type="button"
                            className={`bank-account-card__copy-btn ${isCopied ? 'is-copied' : ''}`}
                            onClick={() => handleCopyAccount(bank)}
                            aria-label={`Copiar cuenta de ${bank.name}`}
                          >
                            {isCopied ? (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Copiado
                              </>
                            ) : (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                Copiar
                              </>
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  <div className="cart-drawer__transfer-reminder">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>¡No olvides enviar tu comprobante!</span>
                  </div>
                </div>
              )}

              {/* Vista Detalle: WhatsApp Directo */}
              {paymentMethod === 'whatsapp' && (
                <div className="cart-drawer__whatsapp-box">
                  <p className="cart-drawer__whatsapp-info">
                    Te comunicaremos directamente con atención al cliente al <strong>{WHATSAPP_DISPLAY}</strong> con la descripción, fotos y precio de tus prendas seleccionadas.
                  </p>
                </div>
              )}
            </div>

            {/* Footer con Subtotal y Botones */}
            <div className="cart-drawer__footer">
              <div className="cart-drawer__summary-row">
                <span className="cart-drawer__subtotal-label">Subtotal</span>
                <span className="cart-drawer__subtotal-value">{formattedSubtotal}</span>
              </div>

              <div className="cart-drawer__cta-group">
                {paymentMethod === 'whatsapp' ? (
                  <a
                    href="#pedido"
                    onClick={event => handleOrder(event, false)}
                    aria-disabled={savingOrder}
                    className="btn btn-primary cart-drawer__btn-checkout"
                    id="btn-checkout-whatsapp"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    {savingOrder ? 'Registrando pedido…' : 'Pedir por WhatsApp'}
                  </a>
                ) : (
                  <a
                    href="#pedido"
                    onClick={event => handleOrder(event, true)}
                    aria-disabled={savingOrder}
                    className="btn btn-primary cart-drawer__btn-checkout cart-drawer__btn-transfer"
                    id="btn-confirm-transfer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {savingOrder ? 'Registrando pedido…' : 'Confirmar Transferencia'}
                  </a>
                )}

                <button
                  type="button"
                  className="btn btn-outline cart-drawer__btn-continue"
                  onClick={closeCart}
                >
                  Seguir Comprando
                </button>
              </div>

              <div className="cart-drawer__clear-wrap">
                <button
                  type="button"
                  className="cart-drawer__clear-btn"
                  onClick={clearCart}
                >
                  Vaciar carrito
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
