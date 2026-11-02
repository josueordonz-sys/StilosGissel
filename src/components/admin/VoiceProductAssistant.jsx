import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Función para normalizar texto hablado de números en español a dígitos
 */
function parseSpokenPrice(text) {
  if (!text) return ''
  const clean = text.toLowerCase().trim()

  // Extraer dígitos directos (ej: "1200", "500", "L. 300", "1,100")
  const directDigits = clean.replace(/,/g, '').replace(/[^0-9.]/g, '')
  if (directDigits && !isNaN(parseFloat(directDigits)) && parseFloat(directDigits) > 0) {
    return directDigits
  }

  // Mapeo básico de números hablados
  const numWords = {
    cero: 0, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
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

  const numMatch = t.match(/\b\d+\b/)
  if (numMatch) return numMatch[0]

  return text.toUpperCase().trim()
}

/**
 * Normaliza género hablado
 */
function parseSpokenGender(text) {
  const t = text.toLowerCase()
  if (t.includes('hombre') || t.includes('caballero') || t.includes('masculino') || t.includes('varon')) return 'hombre'
  if (t.includes('mujer') || t.includes('dama') || t.includes('femenino') || t.includes('chica')) return 'mujer'
  if (t.includes('unisex') || t.includes('ambos')) return 'unisex'
  return 'mujer'
}

const PASOS = [
  {
    key: 'nombre',
    titulo: 'Nombre de la Prenda',
    pregunta: 'Dime el nombre de la prenda o producto.',
    ayuda: 'Ej: Camisa Guess, Cartera Tote Bag, Perfume Sauvage...'
  },
  {
    key: 'marca',
    titulo: 'Marca',
    pregunta: '¿Cuál es la marca? Si no tiene marca, puedes decir omitir.',
    ayuda: 'Ej: Guess, Tommy Hilfiger, Zara, Shein, o pulsa Omitir'
  },
  {
    key: 'talla',
    titulo: 'Talla',
    pregunta: '¿Qué talla es? Por ejemplo S, M, L o XL. Si no aplica, di omitir.',
    ayuda: 'Ej: S, M, L, XL, 38, Única o pulsa Omitir'
  },
  {
    key: 'precio',
    titulo: 'Precio en Lempiras',
    pregunta: '¿Cuál es el precio de la prenda en lempiras?',
    ayuda: 'Ej: 1100, 500, 350...'
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
    ayuda: 'Di mujer, hombre o unisex'
  },
  {
    key: 'descripcion',
    titulo: 'Descripción',
    pregunta: 'Dime una breve descripción de la prenda, o di omitir para terminar.',
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
  const [textInput, setTextInput] = useState('')
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  const recognitionRef = useRef(null)
  const utteranceRef = useRef(null)
  const isCancelledRef = useRef(false)
  const speakTimeoutRef = useRef(null)
  // Intención del usuario: true = quiere tener el mic encendido
  const shouldListenRef = useRef(false)
  const restartTimerRef = useRef(null)

  const pasoActual = PASOS[pasoIndex]

  // Función interna que arranca UNA instancia de SpeechRecognition
  const _createAndStart = useCallback(() => {
    if (typeof window === 'undefined') return
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRec) {
      setErrorMsg('Tu navegador no soporta reconocimiento de voz. Usa Google Chrome o Edge.')
      return
    }

    try {
      // Abortar la instancia anterior antes de crear una nueva
      if (recognitionRef.current) {
        try { recognitionRef.current.onend = null } catch (_) {}
        try { recognitionRef.current.abort() } catch (_) {}
        recognitionRef.current = null
      }

      const rec = new SpeechRec()
      rec.lang = 'es-419'
      rec.continuous = false   // false es más estable; reiniciamos en onend
      rec.interimResults = true
      rec.maxAlternatives = 1

      rec.onstart = () => {
        setIsListening(true)
        setErrorMsg('')
      }

      rec.onresult = (event) => {
        let interimText = ''
        let finalText = ''
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i]
          if (item.isFinal) {
            finalText += item[0].transcript
          } else {
            interimText += item[0].transcript
          }
        }
        const heard = (finalText || interimText).trim()
        if (heard) setTextInput(heard)
      }

      rec.onerror = (e) => {
        if (e.error === 'not-allowed') {
          shouldListenRef.current = false
          setErrorMsg('Micrófono bloqueado. Permite el acceso en el candado de la barra de direcciones y recarga.')
          setIsListening(false)
        }
        // 'no-speech', 'aborted' y otros: los ignoramos; onend reiniciará si toca
      }

      rec.onend = () => {
        // Chrome siempre llama onend aunque continuous=false — reiniciamos si el usuario quiere seguir
        if (shouldListenRef.current && !isCancelledRef.current) {
          // Pequeño delay para evitar el loop de "start → end inmediato"
          restartTimerRef.current = setTimeout(() => {
            if (shouldListenRef.current && !isCancelledRef.current) {
              _createAndStart()
            }
          }, 150)
        } else {
          setIsListening(false)
        }
      }

      recognitionRef.current = rec
      rec.start()
    } catch (err) {
      console.warn('Error al iniciar micrófono:', err)
      // Reintentar en 400ms si el usuario aún quiere escuchar
      if (shouldListenRef.current && !isCancelledRef.current) {
        restartTimerRef.current = setTimeout(_createAndStart, 400)
      } else {
        setIsListening(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Iniciar reconocimiento (pública): marca la intención y arranca
  const startListening = useCallback(() => {
    shouldListenRef.current = true
    _createAndStart()
  }, [_createAndStart])

  // Detener el micrófono (pública): cancela la intención y detiene todo
  const stopListening = useCallback(() => {
    shouldListenRef.current = false
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null } catch (_) {}
      try { recognitionRef.current.abort() } catch (_) {}
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  // Sintetizar voz en español con timeout de seguridad
  const speakText = useCallback((text, callback) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !voiceEnabled) {
      if (callback) callback()
      return
    }

    try {
      window.speechSynthesis.cancel()
    } catch (_) {}

    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current)
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utteranceRef.current = utterance
    utterance.lang = 'es-419'
    utterance.rate = 1.05
    utterance.pitch = 1.0

    // Seleccionar voz en español
    try {
      const voices = window.speechSynthesis.getVoices()
      const spanishVoice = voices.find(v => v.lang.startsWith('es') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Paulina') || v.name.includes('Monica') || v.name.includes('Sabina'))) ||
        voices.find(v => v.lang.startsWith('es'))
      if (spanishVoice) {
        utterance.voice = spanishVoice
      }
    } catch (_) {}

    let finished = false
    const onDone = () => {
      if (finished) return
      finished = true
      setIsSpeaking(false)
      if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current)
      if (callback && !isCancelledRef.current) {
        callback()
      }
    }

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = onDone
    utterance.onerror = onDone

    // Timeout de seguridad: Si en 3.5s no disparó onend (bug de Chrome), forzar fin y escuchar
    speakTimeoutRef.current = setTimeout(onDone, 3500)

    try {
      window.speechSynthesis.speak(utterance)
    } catch (_) {
      onDone()
    }
  }, [voiceEnabled])

  // Aplicar respuesta del paso actual y avanzar
  const submitCurrentAnswer = (answerText) => {
    const raw = (answerText || textInput).trim()
    const lower = raw.toLowerCase()
    const isOmitir = !raw || lower.includes('omitir') || lower === 'ninguna' || lower === 'ninguno' || lower === 'no tiene' || lower === 'paso' || lower === 'siguiente' || lower === 'no'

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

    // Avanzar
    if (pasoIndex < PASOS.length - 1) {
      setPasoIndex(p => p + 1)
      setTextInput('')
    } else {
      // Fin del cuestionario
      stopListening()
      speakText('Perfecto. Todos los datos han sido registrados en el formulario. Solo agrega la foto y presiona guardar.', () => {
        if (onComplete) onComplete()
        onClose()
      })
    }
  }

  // Al abrir el modal o cambiar de paso
  useEffect(() => {
    if (!isOpen) return
    isCancelledRef.current = false
    setTextInput('')

    // Hablar y encender micrófono
    speakText(pasoActual.pregunta, () => {
      if (!isCancelledRef.current) {
        startListening()
      }
    })

    return () => {
      isCancelledRef.current = true
      shouldListenRef.current = false
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
      if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel() } catch (_) {}
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.onend = null } catch (_) {}
        try { recognitionRef.current.abort() } catch (_) {}
      }
    }
  }, [isOpen, pasoIndex, pasoActual, speakText, startListening])

  const handleClose = () => {
    isCancelledRef.current = true
    shouldListenRef.current = false
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
    if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel() } catch (_) {}
    }
    stopListening()
    onClose()
  }

  const toggleMic = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(18, 18, 18, 0.75)',
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
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--color-text-main)' }}>
              Asistente de Voz
            </h2>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>
              Paso {pasoIndex + 1} de {PASOS.length} • {pasoActual.titulo}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Toggle voz asistente */}
            <button
              type="button"
              onClick={() => setVoiceEnabled(v => !v)}
              style={{
                background: voiceEnabled ? 'rgba(156, 124, 68, 0.12)' : 'var(--color-surface-soft)',
                border: `1px solid ${voiceEnabled ? 'var(--color-gold)' : 'var(--color-border)'}`,
                color: voiceEnabled ? 'var(--color-gold-dark)' : 'var(--color-text-muted)',
                borderRadius: '20px',
                padding: '4px 10px',
                fontSize: '0.68rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title={voiceEnabled ? 'Voz del asistente activa' : 'Voz del asistente silenciada'}
            >
              {voiceEnabled ? 'Voz activa' : 'Voz silenciada'}
            </button>

            <button
              type="button"
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                padding: '6px'
              }}
              title="Cerrar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Barra de progreso */}
        <div style={{ height: '4px', background: 'var(--color-surface-soft)', borderRadius: '2px', overflow: 'hidden', marginBottom: '1.25rem' }}>
          <div
            style={{
              height: '100%',
              background: 'var(--color-gold-dark)',
              width: `${((pasoIndex + 1) / PASOS.length) * 100}%`,
              transition: 'width 0.35s ease'
            }}
          />
        </div>

        {/* Tarjeta de Pregunta */}
        <div
          style={{
            background: 'var(--color-surface-soft)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '1.1rem 1.25rem',
            textAlign: 'center',
            marginBottom: '1.25rem'
          }}
        >
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-gold-dark)', display: 'block', marginBottom: '6px' }}>
            {isSpeaking ? 'El asistente está preguntando...' : isListening ? 'Escuchando tu voz...' : 'Micrófono en pausa'}
          </span>

          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-main)', margin: '0 0 0.4rem', lineHeight: 1.4 }}>
            "{pasoActual.pregunta}"
          </p>

          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>
            {pasoActual.ayuda}
          </span>
        </div>

        {/* Botón Central de Micrófono & Transcripción */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            onClick={toggleMic}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: isListening ? '#dc2626' : 'var(--color-black)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isListening ? '0 0 0 8px rgba(220, 38, 38, 0.2), 0 8px 20px rgba(220, 38, 38, 0.3)' : '0 4px 14px rgba(0,0,0,0.15)',
              transition: 'all 0.25s ease'
            }}
            title={isListening ? 'Micrófono activo (haz clic para pausar)' : 'Toca para activar el micrófono y hablar'}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </button>

          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isListening ? '#dc2626' : 'var(--color-text-muted)' }}>
            {isListening ? 'Escuchando... habla ahora' : 'Toca el botón para hablar'}
          </span>

          {/* Campo editable en vivo con lo que se va escuchando */}
          <div style={{ width: '100%', display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submitCurrentAnswer()
                }
              }}
              placeholder={isListening ? 'Escuchando lo que dices...' : 'Escribe o dicta aquí tu respuesta...'}
              style={{
                flex: 1,
                padding: '0.7rem 0.9rem',
                border: '1.5px solid var(--color-border)',
                borderRadius: '6px',
                fontSize: '0.9rem',
                outline: 'none',
                fontFamily: 'var(--font-body)',
                color: 'var(--color-text-main)',
                background: '#ffffff'
              }}
            />
            <button
              type="button"
              className="a-btn a-btn-primary"
              style={{ padding: '0.7rem 1.1rem', fontSize: '0.75rem' }}
              onClick={() => submitCurrentAnswer()}
            >
              Siguiente
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.6rem 0.8rem', marginBottom: '1rem', fontSize: '0.72rem', color: '#b91c1c', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        {/* Resumen de campos guardados */}
        <div
          style={{
            background: '#faf9f6',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '0.65rem 0.85rem',
            marginBottom: '1.25rem',
            fontSize: '0.7rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.4rem 0.9rem'
          }}
        >
          <span><strong>Nombre:</strong> {currentForm.nombre || '—'}</span>
          <span><strong>Marca:</strong> {currentForm.marca || '—'}</span>
          <span><strong>Talla:</strong> {currentForm.talla || '—'}</span>
          <span><strong>Precio:</strong> {currentForm.precio ? `L. ${currentForm.precio}` : '—'}</span>
          <span><strong>Cat:</strong> {currentForm.categoria || '—'}</span>
          <span><strong>Género:</strong> {currentForm.genero || '—'}</span>
        </div>

        {/* Botones inferiores */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            className="a-btn a-btn-outline a-btn-sm"
            onClick={() => speakText(pasoActual.pregunta, () => startListening())}
            title="Volver a escuchar la pregunta"
          >
            Repetir pregunta
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="a-btn a-btn-outline a-btn-sm"
              onClick={() => submitCurrentAnswer('omitir')}
            >
              Omitir paso
            </button>
            <button
              type="button"
              className="a-btn a-btn-danger"
              style={{ fontSize: '0.7rem', padding: '0.45rem 0.8rem' }}
              onClick={handleClose}
            >
              Detener
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
