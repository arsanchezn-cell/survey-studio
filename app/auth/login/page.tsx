'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Vista = 'login' | 'reset'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [vista, setVista] = useState<Vista>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  async function handleLogin() {
    if (!email || !password) { setError('Completa todos los campos'); return }
    setCargando(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError('Correo o contrasena incorrectos')
      setCargando(false)
    } else {
      router.push('/dashboard')
    }
  }

  async function handleReset() {
    if (!email) { setError('Ingresa tu correo electronico'); return }
    setCargando(true)
    setError('')
    // Redirigir directamente a reset-password, no al callback
    const redirectTo = `${window.location.origin}/auth/reset-password`
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setCargando(false)
    if (err) {
      setError('Error al enviar el correo: ' + err.message)
    } else {
      setMensaje('Revisa tu correo para el enlace de recuperacion')
    }
  }

  const IconoOjo = ({ ver }: { ver: boolean }) => ver ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Survey Studio</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {vista === 'login' ? 'Inicia sesion en tu cuenta' : 'Recupera tu contrasena'}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Correo electronico</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); setMensaje('') }}
              onKeyDown={e => e.key === 'Enter' && (vista === 'login' ? handleLogin() : handleReset())}
              placeholder="tu@correo.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {vista === 'login' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Contrasena</label>
              <div className="relative">
                <input
                  type={verPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="Tu contrasena"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                <button type="button" onClick={() => setVerPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  <IconoOjo ver={verPassword} />
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {mensaje && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <p className="text-sm text-green-700">{mensaje}</p>
            </div>
          )}

          {vista === 'login' ? (
            <button onClick={handleLogin} disabled={cargando} className="w-full py-3 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90" style={{ background: 'var(--color-secundario, #16a34a)' }}>
              {cargando ? 'Iniciando sesion...' : 'Iniciar sesion'}
            </button>
          ) : (
            <button onClick={handleReset} disabled={cargando || !!mensaje} className="w-full py-3 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90" style={{ background: 'var(--color-secundario, #16a34a)' }}>
              {cargando ? 'Enviando...' : 'Enviar instrucciones'}
            </button>
          )}

          <div className="text-center pt-1">
            {vista === 'login' ? (
              <button onClick={() => { setVista('reset'); setError(''); setMensaje('') }} className="text-xs text-gray-400 hover:text-gray-600 transition-colors block w-full">
                Olvide mi contrasena
              </button>
            ) : (
              <button onClick={() => { setVista('login'); setError(''); setMensaje('') }} className="text-xs text-gray-400 hover:text-gray-600 transition-colors block w-full">
                Volver a iniciar sesion
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
