/* Hook de autenticación verificado exclusivamente por Supabase Auth con auditoría de seguridad */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getClientFingerprint, fetchClientPublicIp } from '../lib/security'

export function useAdminAuth() {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' })

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

      // Intentar persistir en Supabase si la tabla existe (silencioso si no)
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

    // Suscribirse a cambios de estado de auth (login, logout, refresh de token)
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

  // Inicio de sesión verificado por Supabase Auth (sin códigos hardcodeados)
  const handleLogin = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setStatusMsg({ text: '', type: '' })

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
        let mensajeError = error.message
        if (error.message.includes('Invalid login credentials')) {
          mensajeError = 'Credenciales no válidas. Verifica tu correo y contraseña.'
        } else if (error.message.includes('Email not confirmed')) {
          mensajeError = 'El correo electrónico no ha sido verificado en Supabase.'
        } else if (error.message.includes('Too many requests')) {
          mensajeError = 'Demasiados intentos. Espera unos momentos antes de reintentar.'
        }
        setStatusMsg({ text: mensajeError, type: 'error' })
        logAccessAttempt(cleanEmail, false, mensajeError)
      } else if (data?.user) {
        setSession(data.session)
        setUser(data.user)
        setStatusMsg({ text: 'Acceso autorizado. Cargando...', type: 'success' })
        logAccessAttempt(cleanEmail, true, 'Acceso exitoso')
      }
    } catch (err) {
      setStatusMsg({ text: 'Error al conectar con Supabase: ' + err.message, type: 'error' })
      logAccessAttempt(cleanEmail, false, err.message)
    } finally {
      setSubmitting(false)
    }
  }, [emailInput, passwordInput])

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
    handleUnlock: handleLogin, // Retrocompatibilidad
    handleLogout
  }
}
