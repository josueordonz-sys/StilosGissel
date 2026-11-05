import { useState, useEffect } from 'react'
import { getGeminiApiKey, saveGeminiApiKey } from '../../services/geminiService'

export default function GeminiConfigModal({ isOpen, onClose, onKeySaved }) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    if (isOpen) {
      setApiKey(getGeminiApiKey())
      setSavedMsg('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = (e) => {
    e.preventDefault()
    saveGeminiApiKey(apiKey)
    setSavedMsg('Clave guardada con éxito.')
    onKeySaved?.(apiKey.trim())
    setTimeout(() => {
      onClose()
    }, 600)
  }

  const handleRemove = () => {
    saveGeminiApiKey('')
    setApiKey('')
    setSavedMsg('Clave eliminada.')
    onKeySaved?.('')
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 15, 15, 0.72)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '10px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
          maxWidth: '460px',
          width: '100%',
          padding: '1.75rem 1.5rem',
          boxSizing: 'border-box',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '14px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            fontSize: '1.25rem',
            cursor: 'pointer',
            color: 'var(--color-text-muted)'
          }}
          aria-label="Cerrar modal"
        >
          ✕
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.6rem' }}>
          <span style={{ fontSize: '1.3rem' }}>✨</span>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--color-text-main)' }}>
            Google Gemini Vision (Gratis)
          </h2>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
          Al subir una foto, Gemini analiza la prenda automáticamente y completa el <strong>Nombre</strong>, la <strong>Categoría</strong>, el <strong>Género</strong> y la <strong>Descripción</strong>. Tú solo colocas talla y precio.
        </p>

        <div style={{ background: '#fcfaf6', border: '1px solid #ebdcc5', borderRadius: '6px', padding: '10px 12px', marginBottom: '1.2rem', fontSize: '0.78rem', color: '#685124', lineHeight: 1.45 }}>
          <strong>¿Cómo obtener tu clave gratuita?</strong>
          <ol style={{ margin: '6px 0 0 0', paddingLeft: '18px' }}>
            <li>Entra a <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--color-gold-dark)', fontWeight: 700, textDecoration: 'underline' }}>Google AI Studio (Click aquí)</a> con tu cuenta de Google.</li>
            <li>Toca <strong>"Create API key"</strong>.</li>
            <li>Copia la clave y pégala aquí abajo.</li>
          </ol>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px', color: 'var(--color-text-main)' }}>
              API Key de Gemini
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                style={{
                  width: '100%',
                  padding: '9px 38px 9px 10px',
                  boxSizing: 'border-box',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace'
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  color: 'var(--color-gold-dark)',
                  padding: '4px'
                }}
              >
                {showKey ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          {savedMsg && (
            <div style={{ color: '#2e7d32', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              {savedMsg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            {apiKey && (
              <button
                type="button"
                onClick={handleRemove}
                style={{
                  background: 'transparent',
                  border: '1px solid #e0e0e0',
                  padding: '7px 12px',
                  fontSize: '0.78rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#d32f2f',
                  marginRight: 'auto'
                }}
              >
                Borrar Clave
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                padding: '7px 14px',
                fontSize: '0.82rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="a-btn a-btn-primary"
              style={{
                padding: '7px 16px',
                fontSize: '0.82rem',
                fontWeight: 600
              }}
            >
              Guardar Clave
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
