'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NuevaEncuestaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [esDiagnostico, setEsDiagnostico] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) {
      setError('El título es obligatorio')
      return
    }

    setCargando(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data, error: err } = await supabase
      .from('surveys')
      .insert({
        title: titulo.trim(),
        description: descripcion.trim() || null,
        is_diagnostic: esDiagnostico,
        status: 'draft',
        tenant_id: user.id,
        created_by: user.id,
      })
      .select()
      .single()

    if (err) {
      setError('Error al crear la encuesta: ' + err.message)
      setCargando(false)
      return
    }

    router.push(`/dashboard/encuestas/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
          Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <Link href="/dashboard/encuestas" className="text-gray-400 hover:text-gray-600 text-sm">
          Encuestas
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-sm font-medium text-gray-900">Nueva encuesta</h1>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Nueva encuesta</h2>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Encuesta de satisfacción Q2 2025"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe el propósito de esta encuesta..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
            <input
              type="checkbox"
              id="diagnostico"
              checked={esDiagnostico}
              onChange={(e) => setEsDiagnostico(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-purple-600"
            />
            <label htmlFor="diagnostico" className="cursor-pointer">
              <span className="block text-sm font-medium text-purple-900">
                Encuesta de diagnóstico con IA
              </span>
              <span className="block text-xs text-purple-600 mt-0.5">
                Al completarla, la IA analizará las respuestas y recomendará el grupo de curso más adecuado
              </span>
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
          )}

          <div className="flex items-center justify-between pt-2">
            <Link
              href="/dashboard/encuestas"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={cargando}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {cargando ? 'Creando...' : 'Crear encuesta'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}