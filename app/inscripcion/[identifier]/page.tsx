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
  cargo: 'text',
  ciudad: 'text',
}

function getLabelCampo(key: string): string {
  if (key.startsWith('custom_')) return key.replace('custom_', '')
  return CAMPOS_LABELS[key] || key
}

function getTipoCampo(key: string): string {
  if (key.startsWith('custom_')) return 'text'
  return CAMPOS_TIPOS[key] || 'text'
}

export default function InscripcionPage({
  params,
}: {
  params: Promise<{ identifier: string }>
}) {
  const { identifier } = use(params)
  const searchParams = useSearchParams()
  const grupoFiltro = searchParams.get('grupo')
  const supabase = createClient()

  const [curso, setCurso] = useState<any>(null)
  const [grupos, setGrupos] = useState<any[]>([])
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('')
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [completado, setCompletado] = useState(false)
  const [error, setError] = useState('')
  const [camposRequeridos, setCamposRequeridos] = useState<string[]>([])

  useEffect(() => {
    async function cargar() {
      const { data: cursoData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', identifier)
        .eq('status', 'active')
        .single()

      if (!cursoData) {
        setError('Este curso no existe o no está disponible')
        setCargando(false)
        return
      }

      setCurso(cursoData)
      setCamposRequeridos(cursoData.settings?.campos_requeridos || ['apellidos', 'nombres', 'email'])

      const { data: gruposData } = await supabase
        .from('course_groups')
        .select('*')
        .eq('course_id', cursoData.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      const gruposFiltrados = grupoFiltro
        ? (gruposData || []).filter((g: any) => g.id === grupoFiltro)
        : (gruposData || [])

      setGrupos(gruposFiltrados)

      if (grupoFiltro && gruposFiltrados.length === 1) {
        setGrupoSeleccionado(grupoFiltro)
      }

      setCargando(false)
    }
    cargar()
  }, [identifier, grupoFiltro])

  useEffect(() => {
    if (!curso) return
    const channel = supabase
      .channel('grupos-cupos')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'course_groups',
        filter: `course_id=eq.${curso.id}`,
      }, payload => {
        setGrupos(prev => prev.map(g => g.id === payload.new.id ? { ...g, ...payload.new } : g))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [curso])

  function setCampo(key: string, value: string) {
    setCampos(prev => ({ ...prev, [key]: value }))
  }

  async function inscribirse() {
    if (!grupoSeleccionado) {
      setError('Selecciona un grupo para inscribirte')
      return
    }

    const faltantes = camposRequeridos.filter(c => !campos[c]?.trim())
    if (faltantes.length > 0) {
      setError(`Por favor completa: ${faltantes.map(f => getLabelCampo(f)).join(', ')}`)
      return
    }

    const grupo = grupos.find(g => g.id === grupoSeleccionado)
    if (!grupo) return

    if ((grupo.enrolled_count || 0) >= grupo.capacity) {
      setError('Este grupo ya no tiene cupos disponibles')
      return
    }

    setEnviando(true)
    setError('')

    const { data: resultado, error: errInscripcion } = await supabase.rpc('inscribir_participante', {
      p_group_id: grupoSeleccionado,
      p_status: 'confirmed',
      p_payment_status: curso.is_paid ? 'pending' : 'not_required',
      p_enrolled_at: new Date().toISOString(),
      p_metadata: campos,
    })

    if (errInscripcion || resultado?.error) {
      setError(resultado?.error || 'Error al inscribirse: ' + errInscripcion?.message)
      setEnviando(false)
      return
    }

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

  if (error && !curso) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    )
  }

  if (completado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">¡Inscripción exitosa!</h2>
          <p className="text-gray-500 text-sm">Tu inscripción ha sido registrada. Te contactaremos pronto con más detalles.</p>
          {campos.email && (
            <p className="text-xs text-gray-400 mt-3">Confirmación enviada a {campos.email}</p>
          )}
          <div className="mt-6 space-y-3">
            <button
              onClick={() => { setCampos({}); setGrupoSeleccionado(''); setCompletado(false); setError('') }}
              className="w-full border border-gray-200 hover:border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Nueva inscripción
            </button>
            <p className="text-xs text-gray-400">Puedes cerrar esta pestaña con seguridad</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-900">{curso.title}</h1>
          {curso.description && (
            <p className="text-gray-500 text-sm mt-2">{curso.description}</p>
          )}
          {curso.is_paid && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
              <span className="text-sm font-medium text-amber-700">{curso.currency} {curso.price}</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-medium text-gray-900 mb-1">Selecciona un grupo</h2>
          <p className="text-sm text-gray-400 mb-4">Los cupos se actualizan en tiempo real</p>

          {grupos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No hay grupos disponibles por el momento</p>
          ) : (
            <div className="space-y-3">
              {grupos.map(grupo => {
                const cuposLibres = grupo.capacity - (grupo.enrolled_count || 0)
                const sinCupo = cuposLibres <= 0
                const porcentaje = Math.round(((grupo.enrolled_count || 0) / grupo.capacity) * 100)
                const seleccionado = grupoSeleccionado === grupo.id

                return (
                  <button
                    key={grupo.id}
                    onClick={() => !sinCupo && setGrupoSeleccionado(grupo.id)}
                    disabled={sinCupo}
                    className={`w-full text-left p-4 border-2 rounded-xl transition-colors ${
                      sinCupo
                        ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                        : seleccionado
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{grupo.name}</p>
                        {grupo.schedule_label && (
                          <p className="text-xs text-gray-500 mt-0.5">🕐 {grupo.schedule_label}</p>
                        )}
                        {grupo.location && (
                          <p className="text-xs text-gray-500 mt-0.5">📍 {grupo.location}</p>
                        )}
                        {(grupo.starts_at || grupo.ends_at) && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            📅 {grupo.starts_at ? new Date(grupo.starts_at).toLocaleDateString('es') : '—'} → {grupo.ends_at ? new Date(grupo.ends_at).toLocaleDateString('es') : '—'}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-medium ${sinCupo ? 'text-red-500' : 'text-gray-900'}`}>
                          {sinCupo ? 'Sin cupo' : `${cuposLibres} disponibles`}
                        </p>
                        <p className="text-xs text-gray-400">{grupo.enrolled_count || 0}/{grupo.capacity}</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${porcentaje >= 100 ? 'bg-red-400' : porcentaje >= 80 ? 'bg-amber-400' : 'bg-green-400'}`}
                        style={{ width: `${Math.min(porcentaje, 100)}%` }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

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
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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

        <div className="flex justify-end pb-8">
          <button
            onClick={inscribirse}
            disabled={enviando || grupos.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            {enviando ? 'Inscribiendo...' : 'Inscribirme'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 pb-6">Powered by Survey Studio</p>
      </div>
    </div>
  )
}
