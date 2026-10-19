import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './ImageUploader.css'

/**
 * ImageUploader — Selector y cargador de imágenes desde el dispositivo (archivos o carrete de galería).
 * Sube automáticamente al bucket 'productos' de Supabase Storage.
 * Si el bucket aún no ha sido creado en el dashboard, realiza fallback a Base64 para que nunca falle.
 */
export default function ImageUploader({ value, onChange, label = 'Foto del Producto' }) {
  const [uploading, setUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const processFile = async (file) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrorMsg('El archivo seleccionado debe ser una imagen.')
      return
    }

    setErrorMsg('')
    setUploading(true)

    try {
      // 1. Intentar subir a Supabase Storage (bucket 'productos')
      const fileExt = file.name.split('.').pop() || 'jpg'
      const cleanFileName = file.name
        .substring(0, file.name.lastIndexOf('.'))
        .replace(/[^a-zA-Z0-9]/g, '_')
      const fileName = `${Date.now()}_${cleanFileName}.${fileExt}`
      const filePath = `uploads/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('productos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (!uploadError && uploadData) {
        // Obtener la URL pública permanente del archivo
        const { data: urlData } = supabase.storage
          .from('productos')
          .getPublicUrl(filePath)

        if (urlData?.publicUrl) {
          onChange(urlData.publicUrl)
          setUploading(false)
          return
        }
      }

      // 2. Si el bucket aún no está creado o dio error de permisos, usar Base64 transparente
      const reader = new FileReader()
      reader.onload = (e) => {
        onChange(e.target.result)
        setUploading(false)
      }
      reader.onerror = () => {
        setErrorMsg('Error al leer la imagen del dispositivo.')
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      // Fallback seguro a Base64 en cualquier excepción
      const reader = new FileReader()
      reader.onload = (e) => {
        onChange(e.target.result)
        setUploading(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleRemove = (e) => {
    e.stopPropagation()
    onChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="image-uploader">
      <label className="overline image-uploader__label">{label} *</label>

      {/* Input oculto compatible con carrete móvil y explorador desktop */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="image-uploader__input"
        id="device-image-input"
      />

      {value ? (
        /* Vista previa con opción de reemplazar o quitar */
        <div className="image-uploader__preview-wrap">
          <img src={value} alt="Vista previa" className="image-uploader__preview" />
          <div className="image-uploader__preview-overlay">
            <button
              type="button"
              className="btn btn-ghost image-uploader__btn-change"
              onClick={() => fileInputRef.current?.click()}
            >
              Cambiar Foto
            </button>
            <button
              type="button"
              className="btn btn-ghost image-uploader__btn-remove"
              onClick={handleRemove}
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        /* Zona de carga y arrastre */
        <div
          className={`image-uploader__dropzone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
        >
          {uploading ? (
            <div className="image-uploader__loading">
              <div className="image-uploader__spinner" />
              <span className="body-sm">Cargando foto del dispositivo...</span>
            </div>
          ) : (
            <div className="image-uploader__prompt">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p className="image-uploader__main-text">
                Toca para seleccionar desde el carrete o archivos
              </p>
              <span className="body-sm image-uploader__subtext">
                Formatos: JPG, PNG, WEBP, HEIC (Dispositivo o Galeria)
              </span>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <span className="body-sm image-uploader__error">{errorMsg}</span>
      )}
    </div>
  )
}
