/* Hook de autenticación verificado exclusivamente por Supabase Auth con Rate Limiting y auditoría */
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getClientFingerprint, fetchClientPublicIp } from '../lib/security'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_1_MIN_MS = 60 * 1000       // 1er bloqueo: 1 minuto (60s)
const LOCKOUT_5_MIN_MS = 5 * 60 * 1000   // Bloqueos subsiguientes: 5 minutos (300s)

export function useAdminAuth() {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' })

  // Estados de Rate Limiting
  const [failedAttempts, setFailedAttempts] = useState(() => {
    try {
      return parseInt(localStorage.getItem('eg_auth_failed_attempts') || '0', 10)
    } catch (_) {
      return 0
    }
  })

  const [lockoutRemaining, setLockoutRemaining] = useState(0)
  const countdownTimerRef = useRef(null)

  // Revisar si existe bloqueo activo al cargar
  useEffect(() => {
    try {
      const lockoutUntil = parseInt(localStorage.getItem('eg_auth_lockout_until') || '0', 10)
      const now = Date.now()
      if (lockoutUntil > now) {
        setLockoutRemaining(Math.ceil((lockoutUntil - now) / 1000))
      }
    } catch (_) {}
  }, [])

  // Timer de cuenta regresiva para el Rate Limit
  useEffect(() => {
    if (lockoutRemaining <= 0) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      return
    }

    countdownTimerRef.current = setInterval(() => {
      setLockoutRemaining(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current)
          try {
            localStorage.removeItem('eg_auth_lockout_until')
          } catch (_) {}
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    }
  }, [lockoutRemaining])

  // Registrar auditoría de acceso (IP, sistema operativo, si es bot/Linux/VM)
  const logAccessAttempt = useCallback(async (email, exito, detalleError = '') => {
    try {
      const fingerprint = getClientFingerprint()
      const ip = await fetchClientPublicIp()

      const auditPayload = {
        email,
        exito,
        ip_address: ip,
        sistema_operativo: fingerprint.os,
        es_linux: fingerprint.isLinux,
        es_automatizado: fingerprint.isAutomated,
        user_agent: fingerprint.userAgent,
        resolucion: fingerprint.screenResolution,
        zona_horaria: fingerprint.timezone,
        detalle: detalleError || (exito ? 'Inicio de sesión autorizado' : 'Intento fallido'),
        created_at: new Date().toISOString()
      }

      await supabase.from('admin_audit_logs').insert(auditPayload)
    } catch (_) {
      // No bloquear la experiencia si la tabla de auditoría aún no se ha creado
    }
  }, [])

  // Escuchar sesión activa de Supabase
  useEffect(() => {
    let mounted = true

    async function checkCurrentSession() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('Error al verificar sesión en Supabase:', error.message)
        }
        if (mounted) {
          setSession(data?.session || null)
          setUser(data?.session?.user || null)
          setLoading(false)
        }
      } catch (err) {
        console.warn('Excepción al consultar sesión Supabase:', err)
        if (mounted) setLoading(false)
      }
    }

    checkCurrentSession()

    // Suscribirse a cambios de estado de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return
      setSession(currentSession)
      setUser(currentSession?.user || null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  // Inicio de sesión protegido con Rate Limiting y verificado por Supabase
  const handleLogin = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setStatusMsg({ text: '', type: '' })

    // Validar si el cliente está bloqueado por Rate Limiting
    if (lockoutRemaining > 0) {
      setStatusMsg({
        text: `Acceso temporalmente bloqueado por seguridad. Espera ${lockoutRemaining} segundos antes de volver a intentar.`,
        type: 'error'
      })
      return
    }

    const cleanEmail = emailInput.trim()
    const cleanPassword = passwordInput

    if (!cleanEmail || !cleanPassword) {
      setStatusMsg({ text: 'Por favor ingresa tu correo y contraseña.', type: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      })

      if (error) {
        // Incrementar contador de intentos fallidos
        const nuevosIntentos = failedAttempts + 1
        setFailedAttempts(nuevosIntentos)
        try {
          localStorage.setItem('eg_auth_failed_attempts', String(nuevosIntentos))
        } catch (_) {}

        // Aplicar bloqueo si se superó el límite permitido
        if (nuevosIntentos >= MAX_FAILED_ATTEMPTS) {
          const duracionMs = nuevosIntentos > MAX_FAILED_ATTEMPTS ? LOCKOUT_5_MIN_MS : LOCKOUT_1_MIN_MS
          const lockoutUntil = Date.now() + duracionMs
          const segundosBloqueo = Math.ceil(duracionMs / 1000)

          try {
            localStorage.setItem('eg_auth_lockout_until', String(lockoutUntil))
          } catch (_) {}

          setLockoutRemaining(segundosBloqueo)
          const msgBloqueo = `Demasiados intentos fallidos (${nuevosIntentos}/${MAX_FAILED_ATTEMPTS}). Acceso bloqueado por ${segundosBloqueo} segundos.`
          setStatusMsg({ text: msgBloqueo, type: 'error' })
          logAccessAttempt(cleanEmail, false, `RATE_LIMIT_ACTIVADO: ${msgBloqueo}`)
          return
        }

        let mensajeError = error.message
        if (error.message.includes('Invalid login credentials')) {
          mensajeError = `Credenciales no válidas. Intentos restantes: ${MAX_FAILED_ATTEMPTS - nuevosIntentos}`
        } else if (error.message.includes('Email not confirmed')) {
          mensajeError = 'El correo electrónico no ha sido verificado en Supabase.'
        } else if (error.message.includes('Too many requests')) {
          mensajeError = 'Demasiados intentos. Espera unos momentos antes de reintentar.'
        }
        setStatusMsg({ text: mensajeError, type: 'error' })
        logAccessAttempt(cleanEmail, false, mensajeError)
      } else if (data?.user) {
        // Login exitoso: Resetear contadores de Rate Limit
        setFailedAttempts(0)
        setLockoutRemaining(0)
        try {
          localStorage.removeItem('eg_auth_failed_attempts')
          localStorage.removeItem('eg_auth_lockout_until')
        } catch (_) {}

        setSession(data.session)
        setUser(data.user)
        setStatusMsg({ text: 'Acceso autorizado. Cargando panel...', type: 'success' })
        logAccessAttempt(cleanEmail, true, 'Acceso exitoso')
      }
    } catch (err) {
      setStatusMsg({ text: 'Error al conectar con Supabase: ' + err.message, type: 'error' })
      logAccessAttempt(cleanEmail, false, err.message)
    } finally {
      setSubmitting(false)
    }
  }, [emailInput, passwordInput, lockoutRemaining, failedAttempts, logAccessAttempt])

  // Cerrar sesión en Supabase
  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Error al cerrar sesión:', err)
    } finally {
      setSession(null)
      setUser(null)
      sessionStorage.removeItem('eg_admin_session')
      sessionStorage.removeItem('eg_admin_role')
      if (typeof window !== 'undefined') {
        const isAdminSubdomain = window.location.hostname.startsWith('admin.')
        window.location.href = isAdminSubdomain ? '/' : '/admin'
      }
    }
  }, [])

  const isAuthorized = Boolean(user && session)

  return {
    isAuthorized,
    user,
    session,
    loading,
    emailInput,
    setEmailInput,
    passwordInput,
    setPasswordInput,
    submitting,
    statusMsg,
    setStatusMsg,
    handleLogin,
    handleUnlock: handleLogin,
    handleLogout,
    // Datos de Rate Limiting
    lockoutRemaining,
    failedAttempts,
    maxAttempts: MAX_FAILED_ATTEMPTS
  }
}
