import { createContext, useContext, useState, useEffect, useMemo } from 'react'

const CartContext = createContext(null)

const CART_STORAGE_KEY = 'estilogissel_cart'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (e) {
      console.error('Error al cargar carrito de localStorage:', e)
      return []
    }
  })

  const [isOpen, setIsOpen] = useState(false)
  const [lastAddedItem, setLastAddedItem] = useState(null)

  // Persistir en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch (e) {
      console.error('Error al guardar carrito en localStorage:', e)
    }
  }, [items])

  // Contadores y totales
  const totalCount = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.quantity || 1), 0)
  }, [items])

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => {
      const price = Number(item.product?.precio) || 0
      return acc + price * (item.quantity || 1)
    }, 0)
  }, [items])

  const formattedSubtotal = useMemo(() => {
    return `L. ${subtotal.toLocaleString('es-HN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }, [subtotal])

  const openCart = () => setIsOpen(true)
  const closeCart = () => setIsOpen(false)
  const toggleCart = () => setIsOpen(prev => !prev)

  /**
   * Agregar producto al carrito
   * @param {Object} product - Objeto del producto
   * @param {Object|null} selectedColor - Variante de color seleccionada { hex, name }
   * @param {number} quantity - Cantidad a agregar
   * @param {boolean} shouldOpenDrawer - Si debe abrir el drawer automáticamente (default true)
   */
  const addToCart = (product, selectedColor = null, quantity = 1, shouldOpenDrawer = true) => {
    if (!product || !product.id) return

    const colorKey = selectedColor?.name || selectedColor?.hex || 'default'
    const cartItemId = `${product.id}-${colorKey}`

    setItems(prevItems => {
      const existingIndex = prevItems.findIndex(i => i.cartItemId === cartItemId)

      if (existingIndex > -1) {
        const updated = [...prevItems]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        }
        return updated
      }

      return [
        ...prevItems,
        {
          cartItemId,
          product,
          selectedColor,
          quantity: Math.max(1, quantity)
        }
      ]
    })

    setLastAddedItem({
      productId: product.id,
      nombre: product.nombre,
      timestamp: Date.now()
    })

    if (shouldOpenDrawer) {
      setIsOpen(true)
    }
  }

  /**
   * Modificar cantidad de un ítem
   */
  const updateQuantity = (cartItemId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(cartItemId)
      return
    }

    setItems(prevItems =>
      prevItems.map(item =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: newQty }
          : item
      )
    )
  }

  /**
   * Eliminar ítem del carrito
   */
  const removeFromCart = (cartItemId) => {
    setItems(prevItems => prevItems.filter(item => item.cartItemId !== cartItemId))
  }

  /**
   * Vaciar todo el carrito
   */
  const clearCart = () => {
    setItems([])
  }

  const value = {
    items,
    totalCount,
    subtotal,
    formattedSubtotal,
    isOpen,
    openCart,
    closeCart,
    toggleCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    lastAddedItem
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart debe ser utilizado dentro de un CartProvider')
  }
  return context
}
