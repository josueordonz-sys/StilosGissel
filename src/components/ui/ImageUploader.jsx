import { useState, useRef, useId, useEffect } from 'react'
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
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [cameraStream, setCameraStream] = useState(null)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const cameraRequestRef = useRef(0)
  const processFileRef = useRef(null)
  const fileInputId = useId()

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach(track => track.stop())
    cameraStreamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach(track => track.stop())
  }, [])

  useEffect(() => {
    if (cameraOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream
      videoRef.current.play().catch(() => {
        setCameraError('No se pudo iniciar la vista de la cámara. Inténtalo de nuevo.')
      })
    }
  }, [cameraOpen, cameraStream])

  useEffect(() => {
    const handleWindowPaste = (event) => {
      const image = Array.from(event.clipboardData?.items || [])
        .find(item => item.type.startsWith('image/'))
        ?.getAsFile()

      if (image) {
        event.preventDefault()
        const extension = image.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
        processFileRef.current?.(new File([image], `imagen-pegada-${Date.now()}.${extension}`, { type: image.type }))
      }
    }

    window.addEventListener('paste', handleWindowPaste)
    return () => window.removeEventListener('paste', handleWindowPaste)
  }, [])

  const openCamera = async () => {
    const requestId = ++cameraRequestRef.current
    setCameraError('')
    setCameraOpen(true)

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('La cámara no está disponible. Abre esta página con HTTPS o selecciona una foto de tus archivos.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      })
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      cameraStreamRef.current = stream
      setCameraStream(stream)
    } catch (error) {
      setCameraError(error.name === 'NotAllowedError'
        ? 'Permite el acceso a la cámara en tu navegador para tomar la foto.'
        : 'No se pudo abrir la cámara. Revisa que esté disponible y vuelve a intentarlo.')
    }
  }

  const closeCamera = () => {
    cameraRequestRef.current += 1
    stopCamera()
    setCameraStream(null)
    setCameraOpen(false)
    setCameraError('')
  }

  const takePhoto = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      if (blob) {
        closeCamera()
        processFile(new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      } else {
        setCameraError('No se pudo preparar la foto. Inténtalo de nuevo.')
      }
    }, 'image/jpeg', 0.92)
  }

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

  processFileRef.current = processFile

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
      <label htmlFor={fileInputId} className="overline image-uploader__label">{label} *</label>

      {/* Input oculto compatible con carrete móvil y explorador desktop */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="image-uploader__input"
        id={fileInputId}
        name="image"
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
                JPG, PNG, WEBP o HEIC · También puedes pegar una imagen aquí
              </span>
            </div>
          )}
        </div>
      )}

      <div className="image-uploader__actions">
        <button type="button" className="btn btn-ghost image-uploader__camera-button" onClick={openCamera} disabled={uploading}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M14 4h-4l-2 3H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2-3Z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
          Tomar foto con la cámara
        </button>
      </div>

      {cameraOpen && (
        <div className="image-uploader__camera-backdrop" onClick={closeCamera}>
          <section className="image-uploader__camera-dialog" role="dialog" aria-modal="true" aria-label="Tomar foto" onClick={e => e.stopPropagation()}>
            <h2 className="image-uploader__camera-title">Tomar foto</h2>
            {cameraError ? (
              <p className="image-uploader__error" role="alert">{cameraError}</p>
            ) : (
              <video ref={videoRef} className="image-uploader__camera-video" autoPlay playsInline muted />
            )}
            <div className="image-uploader__camera-actions">
              <button type="button" className="btn btn-ghost" onClick={closeCamera}>Cancelar</button>
              {!cameraError && <button type="button" className="btn btn-primary" onClick={takePhoto}>Capturar foto</button>}
            </div>
          </section>
        </div>
      )}

      {errorMsg && (
        <span className="body-sm image-uploader__error">{errorMsg}</span>
      )}
    </div>
  )
}
