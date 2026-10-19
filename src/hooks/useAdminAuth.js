/* Hook compartido para verificar auth del admin */
import { useState, useEffect } from 'react'

export function useAdminAuth() {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [accessKeyInput, setAccessKeyInput] = useState('')
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' })

  useEffect(() => {
    const host = window.location.hostname
    const isLocal = host === 'localhost' || host === '127.0.0.1'
    const isAdminSubdomain = host.startsWith('admin.')
    const stored = sessionStorage.getItem('eg_admin_session')
    if (isAdminSubdomain || isLocal || stored === 'true') {
      setIsAuthorized(true)
    }
  }, [])

  const handleUnlock = (e) => {
    e.preventDefault()
    const host = window.location.hostname
    const isLocal = host === 'localhost' || host === '127.0.0.1'
    if (accessKeyInput === 'Gissel2026' || isLocal) {
      setIsAuthorized(true)
      sessionStorage.setItem('eg_admin_session', 'true')
    } else {
      setStatusMsg({ text: 'Clave de acceso no valida.', type: 'error' })
    }
  }

  return { isAuthorized, accessKeyInput, setAccessKeyInput, handleUnlock, statusMsg, setStatusMsg }
}
