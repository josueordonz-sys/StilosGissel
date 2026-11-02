import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Función para normalizar texto hablado de números en español a dígitos
 */
function parseSpokenPrice(text) {
  if (!text) return ''
  const clean = text.toLowerCase().trim()

  // Si ya tiene números directos (ej: "1200", "500", "L. 300")
  const directDigits = clean.replace(/[^0-9.]/g, '')
  if (directDigits && !isNaN(parseFloat(directDigits))) {
    return directDigits
  }

  // Mapeo básico de números comunes hablados en Honduras / español
  const numWords = {
    cero: 0, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
    once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
    veinte: 20, veinticinco: 25, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
    cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500,
    seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900, mil: 1000
  }

  const words = clean.split(/\s+/)
  let total = 0
  let current = 0

  for (const w of words) {
    if (w === 'mil') {
      current = current === 0 ? 1000 : current * 1000
      total += current
      current = 0
    } else if (numWords[w] !== undefined) {
      current += numWords[w]
    }
  }
  total += current

  return total > 0 ? String(total) : clean.replace(/[^0-9.]/g, '')
}

/**
 * Normaliza nombres de tallas habladas
 */
function parseSpokenSize(text) {
  if (!text) return ''
  const t = text.toLowerCase().trim().replace(/[.,]/g, '')

  if (t.includes('doble') && (t.includes('equis') || t.includes('xl'))) return '2XL'
  if (t.includes('equis ele') || t.includes('xl') || t.includes('extra grande')) return 'XL'
  if (t.includes('equis ese') || t.includes('xs') || t.includes('extra pequeña')) return 'XS'
  if (t === 'l' || t.includes('grande')) return 'L'
  if (t === 'm' || t.includes('mediana') || t.includes('medio')) return 'M'
  if (t === 's' || t.includes('pequeña') || t.includes('chica')) return 'S'
  if (t.includes('unica') || t.includes('única')) return 'Única'

  // Si dice número (ej: "talla 38" o "38")
  const numMatch = t.match(/\b\d+\b/)
  if (numMatch) return numMatch[0]

  return text.toUpperCase().trim()
}

/**
 * Normaliza género hablado
 */
function parseSpokenGender(text) {
  const t = text.toLowerCase()
  if (t.includes('hombre') || t.includes('caballero') || t.includes('masculino')) return 'hombre'
  if (t.includes('mujer') || t.includes('dama') || t.includes('femenino')) return 'mujer'
  if (t.includes('unisex') || t.includes('ambos')) return 'unisex'
  return 'mujer'
}

const PASOS = [
  {
    key: 'nombre',
    titulo: 'Nombre de la Prenda',
    pregunta: 'Dime el nombre de la prenda o producto.',
    ayuda: 'Ejemplo: Camisa Guess, Cartera Tote Bag, Perfume Sauvage...'
  },
  {
    key: 'marca',
    titulo: 'Marca',
    pregunta: '¿Cuál es la marca? Si no tiene marca, puedes decir "omitir".',
    ayuda: 'Ejemplo: Guess, Tommy Hilfiger, Zara, Shein, o di "omitir"'
  },
  {
    key: 'talla',
    titulo: 'Talla',
    pregunta: '¿Qué talla es? Por ejemplo S, M, L o XL. Si no aplica, di "omitir".',
    ayuda: 'Ejemplo: S, M, L, XL, 38, Única o "omitir"'
  },
  {
    key: 'precio',
    titulo: 'Precio en Lempiras',
    pregunta: '¿Cuál es el precio de la prenda en lempiras?',
    ayuda: 'Ejemplo: 1200, 500, 350...'
  },
  {
    key: 'categoria',
    titulo: 'Categoría',
    pregunta: '¿A qué categoría pertenece? Por ejemplo camisas, perfumes, carteras o zapatos.',
    ayuda: 'Di el nombre de la categoría'
  },
  {
    key: 'genero',
    titulo: 'Género',
    pregunta: '¿Es para mujer, hombre o unisex?',
    ayuda: 'Di "mujer", "hombre" o "unisex"'
  },
  {
    key: 'descripcion',
    titulo: 'Descripción',
    pregunta: 'Dime una breve descripción de la prenda, o di "omitir" para terminar.',
    ayuda: 'Detalles, color o estado de la prenda'
  }
]

export default function VoiceProductAssistant({
  isOpen,
  onClose,
  categories = [],
  onFieldUpdate,
  currentForm = {},
  onComplete
}) {
  const [pasoIndex, setPasoIndex] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcripcion, setTranscripcion] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const recognitionRef = useRef(null)
  const isCancelledRef = useRef(false)

  const pasoActual = PASOS[pasoIndex]

  // Sintetizar voz en español
  const speakText = useCallback((text, callback) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (callback) callback()
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-HN'
    utterance.rate = 1.05
    utterance.pitch = 1.0

    // Buscar una voz en español si está disponible
    const voices = window.speechSynthesis.getVoices()
    const spanishVoice = voices.find(v => v.lang.startsWith('es') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Paulina') || v.name.includes('Monica'))) ||
      voices.find(v => v.lang.startsWith('es'))

    if (spanishVoice) {
      utterance.voice = spanishVoice
    }

    utterance.onstart = () => {
      setIsSpeaking(true)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      if (callback && !isCancelledRef.current) {
        callback()
      }
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
      if (callback && !isCancelledRef.current) {
        callback()
      }
    }

    window.speechSynthesis.speak(utterance)
  }, [])

  // Iniciar reconocimiento de voz para escuchar la respuesta
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRec) {
      setErrorMsg('Tu navegador no soporta reconocimiento de voz nativo. Te recomendamos usar Google Chrome, Edge o Safari.')
      return
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }

      const rec = new SpeechRec()
      rec.lang = 'es-HN'
      rec.continuous = false
      rec.interimResults = true
      rec.maxAlternatives = 1

      rec.onstart = () => {
        setIsListening(true)
        setErrorMsg('')
      }

      rec.onresult = (event) => {
        const result = event.results[0]
        const text = result[0].transcript
        setTranscripcion(text)

        if (result.isFinal) {
          rec.stop()
          handleUserAnswer(text)
        }
      }

      rec.onerror = (e) => {
        setIsListening(false)
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          setErrorMsg(`Aviso: ${e.error}. Puedes presionar "Repetir pregunta" o avanzar manualmente.`)
        }
      }

      rec.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = rec
      rec.start()
    } catch (err) {
      setIsListening(false)
      console.warn('Error al iniciar reconocimiento:', err)
    }
  }, [pasoIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Procesar lo que dijo el usuario para el paso actual
  const handleUserAnswer = (spokenText) => {
    const raw = spokenText.trim()
    const lower = raw.toLowerCase()
    const isOmitir = lower.includes('omitir') || lower === 'ninguna' || lower === 'ninguno' || lower === 'no tiene' || lower === 'paso' || lower === 'siguiente'

    const key = pasoActual.key

    if (!isOmitir) {
      let finalValue = raw

      if (key === 'precio') {
        finalValue = parseSpokenPrice(raw)
      } else if (key === 'talla') {
        finalValue = parseSpokenSize(raw)
      } else if (key === 'genero') {
        finalValue = parseSpokenGender(raw)
      } else if (key === 'categoria') {
        // Encontrar categoría coincidente
        const matched = categories.find(c =>
          lower.includes(c.nombre.toLowerCase()) ||
          lower.includes(c.slug.toLowerCase())
        )
        if (matched) {
          finalValue = matched.slug
        } else if (categories.length > 0) {
          finalValue = categories[0].slug
        }
      }

      onFieldUpdate(key, finalValue)
    }

    // Avanzar al siguiente paso
    if (pasoIndex < PASOS.length - 1) {
      const nextIndex = pasoIndex + 1
      setPasoIndex(nextIndex)
      setTranscripcion('')
    } else {
      // Fin del asistente
      speakText('Perfecto. Todos los datos han sido registrados en el formulario. Solo agrega la foto y presiona guardar.', () => {
        if (onComplete) onComplete()
        onClose()
      })
    }
  }

  // Al abrir el asistente o cambiar de paso, hablar la pregunta y luego escuchar
  useEffect(() => {
    if (!isOpen) return
    isCancelledRef.current = false
    setTranscripcion('')

    speakText(pasoActual.pregunta, () => {
      if (!isCancelledRef.current) {
        startListening()
      }
    })

    return () => {
      isCancelledRef.current = true
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [isOpen, pasoIndex, pasoActual, speakText, startListening])

  // Detener todo y cerrar
  const handleClose = () => {
    isCancelledRef.current = true
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }
    setIsListening(false)
    setIsSpeaking(false)
    onClose()
  }

  // Omitir paso actual
  const handleSkipStep = () => {
    if (recognitionRef.current) recognitionRef.current.abort()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    if (pasoIndex < PASOS.length - 1) {
      setPasoIndex(p => p + 1)
      setTranscripcion('')
    } else {
      speakText('Listo. Completaste los campos. Ahora agrega la foto.', () => {
        if (onComplete) onComplete()
        onClose()
      })
    }
  }

  // Repetir la pregunta
  const handleRepeat = () => {
    if (recognitionRef.current) recognitionRef.current.abort()
    speakText(pasoActual.pregunta, () => {
      startListening()
    })
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(18, 18, 18, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.25s ease'
      }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)',
          padding: '1.75rem',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera del Asistente */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: isListening ? '#cf2222' : 'var(--color-black)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                boxShadow: isListening ? '0 0 0 6px rgba(207, 34, 34, 0.18)' : 'none'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--color-text-main)' }}>
                Asistente de Voz
              </h2>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>
                Paso {pasoIndex + 1} de {PASOS.length} • {pasoActual.titulo}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: '6px',
              borderRadius: '4px'
            }}
            title="Cerrar asistente"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Barra de progreso */}
        <div style={{ height: '4px', background: 'var(--color-surface-soft)', borderRadius: '2px', overflow: 'hidden', marginBottom: '1.5rem' }}>
          <div
            style={{
              height: '100%',
              background: 'var(--color-gold-dark)',
              width: `${((pasoIndex + 1) / PASOS.length) * 100}%`,
              transition: 'width 0.35s ease'
            }}
          />
        </div>

        {/* Tarjeta de Pregunta Activa */}
        <div
          style={{
            background: 'var(--color-surface-soft)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '1.25rem',
            textAlign: 'center',
            marginBottom: '1.25rem'
          }}
        >
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-gold-dark)', display: 'block', marginBottom: '6px' }}>
            {isSpeaking ? 'El asistente está preguntando...' : isListening ? 'Escuchando tu voz...' : 'Esperando respuesta...'}
          </span>

          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-main)', margin: '0 0 0.5rem', lineHeight: 1.4 }}>
            "{pasoActual.pregunta}"
          </p>

          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>
            {pasoActual.ayuda}
          </span>
        </div>

        {/* Transcripción en vivo */}
        <div
          style={{
            minHeight: '52px',
            background: isListening ? 'rgba(207, 34, 34, 0.05)' : '#ffffff',
            border: `1px dashed ${isListening ? 'rgba(207, 34, 34, 0.4)' : 'var(--color-border)'}`,
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            marginBottom: '1.2rem',
            transition: 'all 0.25s ease'
          }}
        >
          {transcripcion ? (
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
              Escuché: <span style={{ color: 'var(--color-gold-dark)' }}>"{transcripcion}"</span>
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              {isListening ? 'Habla ahora con tu micrófono...' : isSpeaking ? 'Escuchando después de la pregunta...' : 'Presiona "Repetir" si no escuchaste.'}
            </p>
          )}
        </div>

        {errorMsg && (
          <p style={{ fontSize: '0.72rem', color: '#b91c1c', margin: '0 0 1rem', textAlign: 'center' }}>
            {errorMsg}
          </p>
        )}

        {/* Resumen de campos llenados en tiempo real */}
        <div
          style={{
            background: '#faf9f6',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '0.65rem 0.9rem',
            marginBottom: '1.4rem',
            fontSize: '0.72rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem 1rem'
          }}
        >
          <span><strong>Nombre:</strong> {currentForm.nombre || '—'}</span>
          <span><strong>Marca:</strong> {currentForm.marca || '—'}</span>
          <span><strong>Talla:</strong> {currentForm.talla || '—'}</span>
          <span><strong>Precio:</strong> {currentForm.precio ? `L. ${currentForm.precio}` : '—'}</span>
          <span><strong>Cat:</strong> {currentForm.categoria || '—'}</span>
          <span><strong>Género:</strong> {currentForm.genero || '—'}</span>
        </div>

        {/* Botones de Control */}
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="a-btn a-btn-outline a-btn-sm"
            onClick={handleRepeat}
            disabled={isSpeaking}
            title="Volver a escuchar la pregunta"
          >
            Repetir pregunta
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="a-btn a-btn-outline a-btn-sm"
              onClick={handleSkipStep}
              title="Avanzar sin llenar este dato"
            >
              Omitir paso
            </button>
            <button
              type="button"
              className="a-btn a-btn-danger"
              style={{ fontSize: '0.72rem', padding: '0.45rem 0.85rem' }}
              onClick={handleClose}
            >
              Detener asistente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
