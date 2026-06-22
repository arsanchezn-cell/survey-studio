'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [verConfirmar, setVerConfirmar] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)
  const [sesionLista, setSesionLista] = useState(false)

  useEffect(() => {
    // Supabase maneja el token del URL automaticamente con onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSesionLista(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset() {
    if (!password || !confirmar) { setError('Completa todos los campos'); return }
    if (password !== confirmar) { setError('Las contrasenas no coinciden'); return }
    if (password.length < 6) { setError('La contrasena debe tener al menos 6 caracteres'); return }

    setCargando(true)
    setError('')

    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setError('Error al actualizar: ' + err.message)
      setCargando(false)
    } else {
      setListo(true)
      setTimeout(() => router.push('/dashboard'), 2000)
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

  if (listo) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Contrasena actualizada</h2>
        <p className="text-gray-500 text-sm">Redirigiendo al dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Survey Studio</h1>
          <p className="text-gray-500 mt-1 text-sm">Elige tu nueva contrasena</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nueva contrasena</label>
            <div className="relative">
              <input
                type={verPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Minimo 6 caracteres"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <button type="button" onClick={() => setVerPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <IconoOjo ver={verPassword} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Confirmar contrasena</label>
            <div className="relative">
              <input
                type={verConfirmar ? 'text' : 'password'}
                value={confirmar}
                onChange={e => { setConfirmar(e.target.value); setError('') }}
                placeholder="Repite tu contrasena"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <button type="button" onClick={() => setVerConfirmar(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <IconoOjo ver={verConfirmar} />
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handleReset}
            disabled={cargando}
            className="w-full py-3 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-secundario, #16a34a)' }}
          >
            {cargando ? 'Guardando...' : 'Guardar nueva contrasena'}
          </button>
        </div>
      </div>
    </div>
  )
}
