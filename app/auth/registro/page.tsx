'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegistroPage() {
  const supabase = createClient()
  const router = useRouter()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [verConfirmar, setVerConfirmar] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function handleRegistro() {
    if (!nombre || !email || !password || !confirmar) {
      setError('Completa todos los campos')
      return
    }
    if (password !== confirmar) {
      setError('Las contrasenas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres')
      return
    }

    setCargando(true)
    setError('')

    // 1. Crear usuario en Supabase Auth
    const { data, error: errAuth } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: nombre } }
    })

    if (errAuth || !data.user) {
      setError(errAuth?.message || 'Error al crear la cuenta')
      setCargando(false)
      return
    }

    // 2. Llamar funcion que crea tenant + user atomicamente
    const { error: errFn } = await supabase.rpc('registrar_nuevo_usuario', {
      p_user_id: data.user.id,
      p_email: email,
      p_full_name: nombre,
    })

    if (errFn) {
      setError('Error al configurar la cuenta: ' + errFn.message)
      setCargando(false)
      return
    }

    // 3. Redirigir al dashboard
    router.push('/dashboard')
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Survey Studio</h1>
          <p className="text-gray-500 mt-1 text-sm">Crea tu cuenta</p>
        </div>

        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={e => { setNombre(e.target.value); setError('') }}
              placeholder="Tu nombre"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Correo electronico</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="tu@correo.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Contrasena</label>
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

          {/* Confirmar password */}
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

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Boton */}
          <button
            onClick={handleRegistro}
            disabled={cargando}
            className="w-full py-3 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-secundario, #16a34a)' }}
          >
            {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          <p className="text-center text-xs text-gray-400">
            Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="text-gray-600 hover:text-gray-800 font-medium">
              Inicia sesion
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
