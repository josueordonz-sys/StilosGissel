/**
 * barcodeGenerator.js
 * Genera Código de Barra EAN-13 (visual idéntico a la imagen de referencia)
 * y Código QR con logo del negocio en el centro.
 * 100% nativo, sin dependencias externas.
 */

// ─────────────────────────────────────────────
// EAN-13 TABLES
// ─────────────────────────────────────────────
const L_CODES = [
  '0001101','0011001','0010011','0111101','0100011',
  '0110001','0101111','0111011','0110111','0001011'
]
const G_CODES = [
  '0100111','0110011','0011011','0100001','0011101',
  '0111001','0000101','0010001','0001001','0010111'
]
const R_CODES = [
  '1110010','1100110','1101100','1000010','1011100',
  '1001110','1010000','1000100','1001000','1110100'
]
// First digit parity table
const PARITY = [
  'LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG',
  'LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'
]
const GUARD_NORMAL = '101'
const GUARD_CENTER = '01010'

/**
 * Calcula el dígito verificador EAN-13
 */
function ean13Check(digits12) {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits12[i], 10) * (i % 2 === 0 ? 1 : 3)
  }
  return (10 - (sum % 10)) % 10
}

/**
 * Genera un código EAN-13 de 13 dígitos único para una prenda.
 * Prefijo 978 (estilo ISBN) + 9 dígitos aleatorios + checksum.
 */
export function generateBarcode() {
  const body = String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')
  const digits12 = `978${body}`
  const check = ean13Check(digits12)
  return `${digits12}${check}`
}

/**
 * Genera el SVG de un código de barra EAN-13
 * visualmente idéntico a la imagen de referencia:
 * barras negras sobre fondo blanco, número debajo dividido en 3 grupos.
 *
 * @param {string} text   - 13 dígitos EAN-13 (se rellena/trunca si hace falta)
 * @param {object} opts   - { height, barWidth, showText }
 * @returns {string}      SVG completo como cadena
 */
export function generateBarcodeSvg(text, opts = {}) {
  // Normalizar a 12 dígitos + checksum
  let raw = String(text || '').replace(/\D/g, '')
  if (raw.length < 12) raw = raw.padStart(12, '0')
  if (raw.length === 12) raw = raw + ean13Check(raw)
  if (raw.length > 13) raw = raw.slice(0, 12) + ean13Check(raw.slice(0, 12))

  const digits = raw.slice(0, 13).split('').map(Number)
  const height   = opts.height   ?? 70
  const bw       = opts.barWidth ?? 2
  const showText = opts.showText !== false

  const firstDigit = digits[0]
  const leftDigits = digits.slice(1, 7)
  const rightDigits = digits.slice(7, 13)
  const parity = PARITY[firstDigit]

  // Build bit string
  let bits = ''
  bits += GUARD_NORMAL
  for (let i = 0; i < 6; i++) {
    bits += parity[i] === 'L' ? L_CODES[leftDigits[i]] : G_CODES[leftDigits[i]]
  }
  bits += GUARD_CENTER
  for (let i = 0; i < 6; i++) {
    bits += R_CODES[rightDigits[i]]
  }
  bits += GUARD_NORMAL

  // The guard bars extend ~5px below the normal bars
  const guardExtend = 5
  const totalBars = bits.length
  const quietLeft  = 11 * bw
  const quietRight = 7 * bw
  const codeWidth  = totalBars * bw
  const totalWidth = quietLeft + codeWidth + quietRight
  const textH      = showText ? 18 : 0
  const svgH       = height + textH

  // Guard positions (bits 0,1,2 | center 32-36 | last 3)
  const guardPositions = new Set([0, 1, 2, 32, 33, 34, 35, 36, bits.length - 3, bits.length - 2, bits.length - 1])

  let rects = ''
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      const x = quietLeft + i * bw
      const isGuard = guardPositions.has(i)
      const barH = isGuard ? height + guardExtend : height
      rects += `<rect x="${x}" y="0" width="${bw}" height="${barH}" fill="#000"/>`
    }
  }

  // Text groups: firstDigit | leftDigits | rightDigits
  let textEl = ''
  if (showText) {
    const y = height + guardExtend + 13
    const leftCx  = quietLeft + (33 * bw) / 2
    const rightCx = quietLeft + (33 + 5 + 7) * bw + (42 * bw) / 2

    textEl = `
      <text x="${quietLeft - 4}" y="${y}" font-family="monospace" font-size="10" font-weight="700" text-anchor="end" fill="#000">${firstDigit}</text>
      <text x="${leftCx}"        y="${y}" font-family="monospace" font-size="10" font-weight="700" text-anchor="middle" fill="#000" letter-spacing="1">${leftDigits.join(' ')}</text>
      <text x="${rightCx}"       y="${y}" font-family="monospace" font-size="10" font-weight="700" text-anchor="middle" fill="#000" letter-spacing="1">${rightDigits.join(' ')}</text>
    `
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${svgH}" width="${totalWidth}" height="${svgH}" style="display:block;background:#fff;max-width:100%;height:auto;">
  <rect width="${totalWidth}" height="${svgH}" fill="#fff"/>
  ${rects}
  ${textEl}
</svg>`
}

// ─────────────────────────────────────────────
// QR CON LOGO EN EL CENTRO
// ─────────────────────────────────────────────

/**
 * URL del producto para codificar en el QR
 */
export function getProductQrUrl(productId) {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://estilosgissel.com'
  return `${base}/producto/${productId}`
}

/**
 * Genera la URL de un QR limpio (sin logo) usando api.qrserver.com
 * Se sigue usando para fallback en la etiqueta impresa
 */
export function getQrImageUrl(data, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&ecc=H&margin=1`
}

/**
 * Genera un QR SVG con el logo de Stilos Gissel superpuesto en el centro.
 * Usa un <image> con el logo /logo_sin_fondo.webp sobre la imagen QR de API.
 * El logo queda en un recuadro blanco redondeado en el centro.
 *
 * @param {string} data   - Contenido a codificar (URL del producto)
 * @param {number} size   - Tamaño total del SVG (default 220)
 * @returns {string}      HTML string con <div> conteniendo img del QR + logo superpuesto
 */
export function getQrWithLogoHtml(data, size = 220) {
  const qrUrl = getQrImageUrl(data, size)
  const logoSize = Math.round(size * 0.22)
  const logoPad  = Math.round(size * 0.03)
  const boxSize  = logoSize + logoPad * 2
  const boxPos   = (size - boxSize) / 2

  return `
    <div style="position:relative;display:inline-block;line-height:0;border-radius:6px;overflow:hidden;">
      <img
        src="${qrUrl}"
        width="${size}"
        height="${size}"
        alt="QR Code"
        style="display:block;"
        crossorigin="anonymous"
      />
      <div style="
        position:absolute;
        top:${boxPos}px;
        left:${boxPos}px;
        width:${boxSize}px;
        height:${boxSize}px;
        background:#fff;
        border-radius:6px;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 0 0 2px rgba(0,0,0,0.08);
      ">
        <img
          src="/logo_sin_fondo.webp"
          width="${logoSize}"
          height="${logoSize}"
          alt="Stilos Gissel"
          style="object-fit:contain;"
        />
      </div>
    </div>
  `
}

/**
 * Genera el HTML listo para imprimir de un QR con logo
 * (para la ventana de impresión de etiqueta)
 */
export function getQrWithLogoImgHtml(data, size = 200) {
  const qrUrl = getQrImageUrl(data, size)
  const logoSize = Math.round(size * 0.22)
  const logoPad  = Math.round(size * 0.03)
  const boxSize  = logoSize + logoPad * 2
  const boxPos   = (size - boxSize) / 2
  return `
    <div style="position:relative;display:inline-block;line-height:0;">
      <img src="${qrUrl}" width="${size}" height="${size}" style="display:block;" />
      <div style="
        position:absolute;
        top:${boxPos}px;left:${boxPos}px;
        width:${boxSize}px;height:${boxSize}px;
        background:#fff;border-radius:5px;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 0 0 2px rgba(0,0,0,0.1);
      ">
        <img src="/logo_sin_fondo.webp" width="${logoSize}" height="${logoSize}" style="object-fit:contain;" />
      </div>
    </div>
  `
}
