'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

const CAMPOS_LABELS: Record<string, string> = {
  apellidos: 'Apellidos',
  nombres: 'Nombres',
  email: 'Correo electrónico',
  telefono: 'Teléfono',
  documento: 'Documento de identidad',
  empresa: 'Empresa / Institución',
  carrera: 'Carrera',
  cargo: 'Cargo',
  ciudad: 'Ciudad',
}

const CAMPOS_TIPOS: Record<string, string> = {
  apellidos: 'text',
  nombres: 'text',
  email: 'email',
  telefono: 'tel',
  documento: 'text',
  empresa: 'text',
  carrera: 'text',
  cargo: 'text',
  ciudad: 'text',
}

function getMomentoColor(momento: string): string {
  const lower = momento.toLowerCase()
  if (lower.includes('entrada')) return 'bg-green-100 text-green-700 border-green-200'
  if (lower.includes('salida')) return 'bg-blue-100 text-blue-700 border-blue-200'
  return 'bg-amber-100 text-amber-700 border-amber-200'
}

function getLabelCampo(key: string): string {
  if (key.startsWith('custom_')) return key.replace('custom_', '')
  return CAMPOS_LABELS[key] || key
}

function getTipoCampo(key: string): string {
  if (key.startsWith('custom_')) return 'text'
  return CAMPOS_TIPOS[key] || 'text'
}

export default function AsistenciaPublicaPage({
  params,
}: {
  params: Promise<{ identifier: string }>
}) {
  const { identifier } = use(params)
  const searchParams = useSearchParams()
  const momento = searchParams.get('momento') || ''
  const supabase = createClient()

  const [evento, setEvento] = useState<any>(null)
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [camposRequeridos, setCamposRequeridos] = useState<string[]>([])
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [completado, setCompletado] = useState(false)
  const [error, setError] = useState('')
  const [horaRegistro, setHoraRegistro] = useState('')

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('attendance_events')
        .select('*')
        .eq('id', identifier)
        .eq('status', 'active')
        .single()

      if (!data) {
        setError('Este evento no existe o no está disponible')
        setCargando(false)
        return
      }

      if (momento && !data.moments?.includes(momento)) {
        setError('Este momento de registro no está disponible para este evento')
        setCargando(false)
        return
      }

      setEvento(data)
      setCamposRequeridos(data.settings?.campos_requeridos || ['apellidos', 'nombres'])
      setCargando(false)
    }
    cargar()
  }, [identifier, momento])

  function setCampo(key: string, value: string) {
    setCampos(prev => ({ ...prev, [key]: value }))
  }

  async function registrar() {
    const faltantes = camposRequeridos.filter(c => !campos[c]?.trim())
    if (faltantes.length > 0) {
      setError(`Por favor completa: ${faltantes.map(f => getLabelCampo(f)).join(', ')}`)
      return
    }

    setEnviando(true)
    setError('')

    const ahora = new Date()

    const { error: err } = await supabase
      .from('attendance_records')
      .insert({
        event_id: identifier,
        moment: momento,
        identifier: campos.email || campos.documento || campos.nombres || 'anonimo',
        metadata: campos,
        recorded_at: ahora.toISOString(),
      })

    if (err) {
      setError('Error al registrar: ' + err.message)
      setEnviando(false)
      return
    }

    setHoraRegistro(ahora.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }))
    setCompletado(true)
    setEnviando(false)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    )
  }

  if (error && !evento) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (completado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Asistencia registrada</h2>
          <p className="text-gray-400 text-sm mb-3">Tu registro de <span className="font-medium">{momento}</span> fue guardado a las {horaRegistro}</p>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${getMomentoColor(momento)}`}>
            {momento}
          </div>
          <div className="mt-6 space-y-3">
            <button
              onClick={() => { setCampos({}); setCompletado(false); setError('') }}
              className="w-full border border-gray-200 hover:border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Registrar otra persona
            </button>
            <p className="text-xs text-gray-400">Puedes cerrar esta pestaña con seguridad</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-md mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium mb-3 ${getMomentoColor(momento)}`}>
            {momento}
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{evento.title}</h1>
          {evento.description && <p className="text-gray-400 text-sm mt-1">{evento.description}</p>}
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-medium text-gray-900 mb-4">Tus datos</h2>
          <div className="space-y-4">
            {camposRequeridos.map(campo => (
              <div key={campo}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {getLabelCampo(campo)} <span className="text-red-400">*</span>
                </label>
                <input
                  type={getTipoCampo(campo)}
                  value={campos[campo] || ''}
                  onChange={e => setCampo(campo, e.target.value)}
                  placeholder={`Tu ${getLabelCampo(campo).toLowerCase()}...`}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={registrar}
          disabled={enviando}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3.5 rounded-xl text-sm font-medium transition-colors"
        >
          {enviando ? 'Registrando...' : `Registrar ${momento.toLowerCase()}`}
        </button>

        <p className="text-center text-xs text-gray-400 pb-4">Powered by Survey Studio</p>
      </div>
    </div>
  )
}
