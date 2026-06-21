'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

function getLabelCampo(key: string): string {
  const labels: Record<string, string> = {
    apellidos: 'Apellidos',
    nombres: 'Nombres',
    email: 'Email',
    telefono: 'Teléfono',
    documento: 'Documento',
    empresa: 'Empresa',
    cargo: 'Cargo',
    ciudad: 'Ciudad',
    carrera: 'Carrera',
  }
  if (key.startsWith('custom_')) return key.replace('custom_', '')
  return labels[key] || key
}

function getValorCampo(metadata: any, key: string): string {
  if (key.startsWith('custom_')) {
    const label = key.replace('custom_', '')
    return metadata?.[`custom_${label}`] || metadata?.[label] || '—'
  }
  return metadata?.[key] || '—'
}

export default function CursoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const supabase = createClient()
  const router = useRouter()

  const [curso, setCurso] = useState<any>(null)
  const [grupos, setGrupos] = useState<any[]>([])
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string | null>(null)
  const [inscritos, setInscritos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [cargandoInscritos, setCargandoInscritos] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState<string | null>(null)
  const [mostrarCancelados, setMostrarCancelados] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(null)
  const [eventosVinculados, setEventosVinculados] = useState<any[]>([])
  const [eventosDisponibles, setEventosDisponibles] = useState<any[]>([])
  const [mostrarVincular, setMostrarVincular] = useState(false)
  const [vinculando, setVinculando] = useState(false)
  const [eventoReporte, setEventoReporte] = useState<any | null>(null)
  const [registrosReporte, setRegistrosReporte] = useState<any[]>([])
  const [cargandoReporte, setCargandoReporte] = useState(false)

  useEffect(() => {
    async function cargar() {
      const { data: cursoData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single()

      if (!cursoData) { router.push('/dashboard/cursos'); return }
      setCurso(cursoData)

      const { data: gruposData } = await supabase
        .from('course_groups')
        .select('*')
        .eq('course_id', id)
        .order('created_at', { ascending: true })

      setGrupos(gruposData || [])
      setCargando(false)
    }
    cargar()
  }, [id])

  async function cargarEventosGrupo(grupoId: string) {
    const { data: vinculados } = await supabase
      .from('attendance_events')
      .select('id, title, moments, status')
      .eq('course_group_id', grupoId)
      .order('created_at', { ascending: false })
    setEventosVinculados(vinculados || [])

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
    if (!userData) return

    const { data: disponibles } = await supabase
      .from('attendance_events')
      .select('id, title, moments')
      .eq('tenant_id', userData.tenant_id)
      .is('course_group_id', null)
      .order('created_at', { ascending: false })
    setEventosDisponibles(disponibles || [])
  }

  async function cargarInscritos(grupoId: string) {
    setCargandoInscritos(true)
    setGrupoSeleccionado(grupoId)
    setMostrarCancelados(false)
    setMostrarVincular(false)
    cargarEventosGrupo(grupoId)
    const { data } = await supabase
      .from('enrollments')
      .select('*')
      .eq('group_id', grupoId)
      .order('enrolled_at', { ascending: true })
    setInscritos(data || [])
    setCargandoInscritos(false)
  }

  function copiarLink(tipo: 'curso' | 'grupo', grupoId?: string) {
    const base = window.location.origin
    const url = tipo === 'curso'
      ? `${base}/inscripcion/${id}`
      : `${base}/inscripcion/${id}?grupo=${grupoId}`
    navigator.clipboard.writeText(url)
    setLinkCopiado(tipo === 'curso' ? 'curso' : grupoId || null)
    setTimeout(() => setLinkCopiado(null), 2000)
  }

  async function toggleGrupo(grupoId: string, activo: boolean) {
    await supabase.from('course_groups').update({ is_active: !activo }).eq('id', grupoId)
    setGrupos(grupos.map(g => g.id === grupoId ? { ...g, is_active: !activo } : g))
  }

  async function cambiarEstado(inscritoId: string, nuevoEstado: 'confirmed' | 'cancelled', grupoId: string) {
    setCambiandoEstado(inscritoId)
    const inscrito = inscritos.find(i => i.id === inscritoId)
    if (!inscrito) return

    const estadoAnterior = inscrito.status
    const esCancelacion = nuevoEstado === 'cancelled'
    const esReactivacion = nuevoEstado === 'confirmed' && estadoAnterior === 'cancelled'

    if (esCancelacion) {
      await supabase.rpc('cancelar_inscripcion', { p_enrollment_id: inscritoId })
    } else if (esReactivacion) {
      await supabase.rpc('reactivar_inscripcion', { p_enrollment_id: inscritoId })
    }

    setInscritos(prev => prev.map(i => i.id === inscritoId ? { ...i, status: nuevoEstado } : i))
    setGrupos(prev => prev.map(g => {
      if (g.id !== grupoId) return g
      const delta = esCancelacion ? -1 : esReactivacion ? 1 : 0
      return { ...g, enrolled_count: (g.enrolled_count || 0) + delta }
    }))

    setCambiandoEstado(null)
  }

  async function cargarReporte(evento: any) {
    if (eventoReporte?.id === evento.id) { setEventoReporte(null); return }
    setCargandoReporte(true)
    setEventoReporte(evento)
    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('event_id', evento.id)
    setRegistrosReporte(data || [])
    setCargandoReporte(false)
  }

  async function vincularEvento(eventoId: string) {
    setVinculando(true)
    await supabase.from('attendance_events').update({ course_group_id: grupoSeleccionado }).eq('id', eventoId)
    setMostrarVincular(false)
    if (grupoSeleccionado) await cargarEventosGrupo(grupoSeleccionado)
    setVinculando(false)
  }

  async function desvincularEvento(eventoId: string) {
    await supabase.from('attendance_events').update({ course_group_id: null }).eq('id', eventoId)
    if (grupoSeleccionado) await cargarEventosGrupo(grupoSeleccionado)
  }

  async function exportarAsistenciasExcel() {
    if (eventosVinculados.length === 0) return

    // Cargar todos los registros de todos los eventos vinculados
    const todosLosRegistros: Record<string, any[]> = {}
    for (const ev of eventosVinculados) {
      const { data } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('event_id', ev.id)
      todosLosRegistros[ev.id] = data || []
    }

    // Construir columnas: una por cada momento de cada evento
    const columnas: { eventoId: string; eventoTitulo: string; momento: string; header: string }[] = []
    eventosVinculados.forEach(ev => {
      (ev.moments || []).forEach((m: string) => {
        columnas.push({
          eventoId: ev.id,
          eventoTitulo: ev.title,
          momento: m,
          header: eventosVinculados.length > 1 ? `${ev.title} — ${m}` : m,
        })
      })
    })

    // Headers
    const camposCurso: string[] = curso?.settings?.campos_requeridos || ['apellidos', 'nombres', 'email']
    const headers = [...camposCurso.map(k => getLabelCampo(k)), ...columnas.map(c => c.header)]

    // Filas: inscritos confirmados
    const filas = inscritosConfirmados.map(inscrito => {
      const email = inscrito.metadata?.email?.toLowerCase() || ''
      const datosCampos = camposCurso.map(k => getValorCampo(inscrito.metadata, k))
      const datosAsistencia = columnas.map(col => {
        const regs = todosLosRegistros[col.eventoId] || []
        const asistio = regs.some(r => {
          const regEmail = (r.metadata?.email || r.identifier || '').toLowerCase()
          return r.moment === col.momento && regEmail === email
        })
        return asistio ? 'Sí' : 'No'
      })
      return [...datosCampos, ...datosAsistencia]
    })

    const ws = XLSX.utils.aoa_to_sheet([headers, ...filas])
    ws['!cols'] = [
      ...camposCurso.map(() => ({ wch: 20 })),
      ...columnas.map(() => ({ wch: 18 })),
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencias')

    const nombreArchivo = `${curso?.title || 'curso'} — Asistencias.xlsx`.replace(/[/\?%*:|"<>]/g, '-')
    XLSX.writeFile(wb, nombreArchivo)
  }

  function exportarExcel() {
    const grupoActual = grupos.find(g => g.id === grupoSeleccionado)
    const nombreGrupo = grupoActual?.name || 'grupo'
    const camposCurso: string[] = curso?.settings?.campos_requeridos || ['apellidos', 'nombres', 'email']

    const datos = mostrarCancelados ? inscritos : inscritos.filter(i => i.status !== 'cancelled')

    const headers = [
      'No.',
      ...camposCurso.map(k => getLabelCampo(k)),
      'Estado',
      'Fecha inscripción',
    ]

    const filas = datos.map((inscrito, idx) => [
      idx + 1,
      ...camposCurso.map(k => getValorCampo(inscrito.metadata, k)),
      inscrito.status === 'confirmed' ? 'Confirmado' : 'Cancelado',
      new Date(inscrito.enrolled_at).toLocaleDateString('es'),
    ])

    const ws = XLSX.utils.aoa_to_sheet([headers, ...filas])
    ws['!cols'] = [{ wch: 5 }, ...camposCurso.map(() => ({ wch: 20 })), { wch: 14 }, { wch: 18 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inscritos')

    const nombreArchivo = `${curso?.title || 'curso'} — ${nombreGrupo}.xlsx`.replace(/[/\\?%*:|"<>]/g, '-')
    XLSX.writeFile(wb, nombreArchivo)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    )
  }

  const totalInscritos = grupos.reduce((a, g) => a + (g.enrolled_count || 0), 0)
  const totalCupos = grupos.reduce((a, g) => a + (g.capacity || 0), 0)
  const grupoActual = grupos.find(g => g.id === grupoSeleccionado)
  const camposCurso: string[] = curso?.settings?.campos_requeridos || ['apellidos', 'nombres', 'email']

  const inscritosConfirmados = inscritos.filter(i => i.status !== 'cancelled')
  const inscritosCancelados = inscritos.filter(i => i.status === 'cancelled')
  const inscritosFiltrados = mostrarCancelados ? inscritos : inscritosConfirmados

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">Dashboard</Link>
          <span className="text-gray-300">/</span>
          <Link href="/dashboard/cursos" className="text-gray-400 hover:text-gray-600 text-sm">Cursos</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-medium text-gray-900 max-w-xs truncate">{curso.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/cursos/${id}/editar`}
            className="flex items-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            ✏️ Editar curso
          </Link>
          <button
            onClick={() => copiarLink('curso')}
            className="flex items-center gap-2 border border-gray-200 hover:border-green-400 text-gray-600 hover:text-green-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {linkCopiado === 'curso' ? '✓ Copiado' : '🔗 Link de inscripción'}
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{curso.title}</h2>
              {curso.description && <p className="text-gray-400 text-sm mt-1">{curso.description}</p>}
            </div>
            <div className="flex items-center gap-6 text-right shrink-0">
              <div>
                <p className="text-2xl font-medium text-gray-900">{totalInscritos}</p>
                <p className="text-xs text-gray-400">inscritos totales</p>
              </div>
              <div>
                <p className="text-2xl font-medium text-gray-900">{totalCupos - totalInscritos}</p>
                <p className="text-xs text-gray-400">cupos disponibles</p>
              </div>
              <div>
                <p className="text-2xl font-medium text-gray-900">{grupos.length}</p>
                <p className="text-xs text-gray-400">grupos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grupos */}
        <div>
          <h3 className="font-medium text-gray-900 text-sm mb-3">Grupos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {grupos.map(grupo => {
              const cuposLibres = grupo.capacity - (grupo.enrolled_count || 0)
              const porcentaje = Math.round(((grupo.enrolled_count || 0) / grupo.capacity) * 100)
              const seleccionado = grupoSeleccionado === grupo.id

              return (
                <div
                  key={grupo.id}
                  className={`bg-white rounded-2xl border-2 p-5 transition-colors cursor-pointer ${seleccionado ? 'border-[var(--color-secundario)]' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => cargarInscritos(grupo.id)}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{grupo.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${grupo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {grupo.is_active ? 'Activo' : 'Cerrado'}
                        </span>
                      </div>
                      {grupo.schedule_label && <p className="text-xs text-gray-400">🕐 {grupo.schedule_label}</p>}
                      {grupo.location && <p className="text-xs text-gray-400 mt-0.5">📍 {grupo.location}</p>}
                      {(grupo.starts_at || grupo.ends_at) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          📅 {grupo.starts_at ? new Date(grupo.starts_at).toLocaleDateString('es') : '—'} → {grupo.ends_at ? new Date(grupo.ends_at).toLocaleDateString('es') : '—'}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-medium text-gray-900">{grupo.enrolled_count || 0}/{grupo.capacity}</p>
                      <p className="text-xs text-gray-400">{cuposLibres > 0 ? `${cuposLibres} disponibles` : 'Sin cupo'}</p>
                    </div>
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${porcentaje >= 100 ? 'bg-red-400' : porcentaje >= 80 ? 'bg-amber-400' : 'bg-green-400'}`}
                      style={{ width: `${Math.min(porcentaje, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <button
                      onClick={e => { e.stopPropagation(); copiarLink('grupo', grupo.id) }}
                      className="text-xs text-gray-400 hover:text-green-600 transition-colors"
                    >
                      {linkCopiado === grupo.id ? '✓ Link copiado' : '🔗 Link de este grupo'}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); toggleGrupo(grupo.id, grupo.is_active) }}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {grupo.is_active ? 'Cerrar inscripciones' : 'Abrir inscripciones'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tabla de inscritos */}
        {grupoSeleccionado && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-medium text-gray-900 text-sm">
                  Inscritos — {grupoActual?.name}
                </h3>
                {inscritosCancelados.length > 0 && (
                  <button
                    onClick={() => setMostrarCancelados(!mostrarCancelados)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      mostrarCancelados
                        ? 'bg-gray-100 border-gray-300 text-gray-600'
                        : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {mostrarCancelados ? `Ocultar cancelados (${inscritosCancelados.length})` : `Ver cancelados (${inscritosCancelados.length})`}
                  </button>
                )}
              </div>
              {inscritosFiltrados.length > 0 && (
                <button
                  onClick={exportarExcel}
                  className="flex items-center gap-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  ⬇ Exportar Excel
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
              {cargandoInscritos ? (
                <p className="text-xs text-gray-400 text-center py-12">Cargando...</p>
              ) : inscritosFiltrados.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-12">No hay inscritos en este grupo</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left text-xs font-medium text-gray-400 px-4 py-3 w-8">#</th>
                      {camposCurso.map(key => (
                        <th key={key} className="text-left text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap">
                          {getLabelCampo(key)}
                        </th>
                      ))}
                      <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Estado</th>
                      <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Inscripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {inscritosFiltrados.map((inscrito, idx) => {
                      const cancelado = inscrito.status === 'cancelled'
                      const cargandoE = cambiandoEstado === inscrito.id
                      return (
                        <tr
                          key={inscrito.id}
                          className={`transition-colors ${cancelado ? 'bg-gray-50/50' : 'hover:bg-gray-50/50'}`}
                        >
                          <td className="px-4 py-3 text-xs text-gray-300">{idx + 1}</td>
                          {camposCurso.map((key, ki) => (
                            <td
                              key={key}
                              className={`px-4 py-3 text-xs whitespace-nowrap ${
                                ki === 0
                                  ? cancelado ? 'font-medium text-gray-400 line-through' : 'font-medium text-gray-900'
                                  : cancelado ? 'text-gray-400 line-through' : 'text-gray-600'
                              }`}
                            >
                              {getValorCampo(inscrito.metadata, key)}
                            </td>
                          ))}
                          <td className="px-4 py-3">
                            <select
                              value={inscrito.status}
                              disabled={cargandoE}
                              onChange={e => cambiarEstado(inscrito.id, e.target.value as 'confirmed' | 'cancelled', grupoSeleccionado!)}
                              className={`text-xs px-2 py-1 rounded-lg border cursor-pointer transition-colors focus:outline-none ${
                                cancelado
                                  ? 'bg-red-50 border-red-200 text-red-600'
                                  : 'bg-green-50 border-green-200 text-green-700'
                              } ${cargandoE ? 'opacity-50' : ''}`}
                            >
                              <option value="confirmed">Confirmado</option>
                              <option value="cancelled">Cancelado</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {new Date(inscrito.enrolled_at).toLocaleDateString('es')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-right">
              {inscritosConfirmados.length} confirmado{inscritosConfirmados.length !== 1 ? 's' : ''}
              {inscritosCancelados.length > 0 && ` · ${inscritosCancelados.length} cancelado${inscritosCancelados.length !== 1 ? 's' : ''}`}
            </p>

            {/* Eventos de asistencia vinculados */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 text-sm">Eventos de asistencia</h3>
                <div className="flex items-center gap-3">
                  {eventosVinculados.length > 0 && (
                    <button
                      onClick={exportarAsistenciasExcel}
                      className="flex items-center gap-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
                    >
                      ⬇ Exportar asistencias
                    </button>
                  )}
                  <button
                    onClick={() => setMostrarVincular(!mostrarVincular)}
                    className="text-xs hover:opacity-80 font-medium transition-colors" style={{ color: 'var(--color-secundario)' }}
                  >
                    + Vincular evento
                  </button>
                </div>
              </div>

              {mostrarVincular && (
                <div className="bg-white rounded-2xl border border-blue-200 p-4 mb-3">
                  <p className="text-xs text-gray-500 mb-3">Selecciona un evento de asistencia para vincularlo a este grupo</p>
                  {eventosDisponibles.length === 0 ? (
                    <p className="text-xs text-gray-400">No hay eventos disponibles sin vincular</p>
                  ) : (
                    <div className="space-y-2">
                      {eventosDisponibles.map(ev => (
                        <div key={ev.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{ev.title}</p>
                            <p className="text-xs text-gray-400">{(ev.moments || []).join(' · ')}</p>
                          </div>
                          <button
                            onClick={() => vincularEvento(ev.id)}
                            disabled={vinculando}
                            className="text-xs disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium transition-colors hover:opacity-90" style={{ background: 'var(--color-secundario)' }}
                          >
                            Vincular
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setMostrarVincular(false)} className="text-xs text-gray-400 hover:text-gray-600 mt-3">Cancelar</button>
                </div>
              )}

              {eventosVinculados.length === 0 && !mostrarVincular ? (
                <p className="text-xs text-gray-400">No hay eventos vinculados a este grupo</p>
              ) : (
                <div className="space-y-2">
                  {eventosVinculados.map(ev => {
                    const esActivo = eventoReporte?.id === ev.id
                    const momentos: string[] = ev.moments || []

                    // Build cruce: inscritos vs registros
                    const emailsAsistentes: Record<string, Set<string>> = {}
                    if (esActivo) {
                      momentos.forEach(m => { emailsAsistentes[m] = new Set() })
                      registrosReporte.forEach(r => {
                        const email = r.metadata?.email || r.identifier
                        if (email && emailsAsistentes[r.moment]) emailsAsistentes[r.moment].add(email.toLowerCase())
                      })
                    }

                    return (
                      <div key={ev.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                                <polyline points="9 11 12 14 22 4"/>
                                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{ev.title}</p>
                              <p className="text-xs text-gray-400">{momentos.join(' · ')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => cargarReporte(ev)}
                              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${esActivo ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700'}`}
                            >
                              {esActivo ? 'Ocultar reporte' : '📊 Ver reporte'}
                            </button>
                            <Link href={`/dashboard/asistencias/${ev.id}`} className="text-xs hover:opacity-80 font-medium" style={{ color: 'var(--color-secundario)' }}>
                              Ver evento →
                            </Link>
                            <button onClick={() => desvincularEvento(ev.id)} className="text-xs text-gray-400 hover:text-red-400 transition-colors">
                              Desvincular
                            </button>
                          </div>
                        </div>

                        {esActivo && (
                          <div className="border-t border-gray-100">
                            {cargandoReporte ? (
                              <p className="text-xs text-gray-400 text-center py-6">Cargando reporte...</p>
                            ) : inscritosConfirmados.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-6">No hay inscritos confirmados para cruzar</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                      <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Apellidos</th>
                                      <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Nombres</th>
                                      <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">Email</th>
                                      {momentos.map(m => (
                                        <th key={m} className="text-center text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap">{m}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {inscritosConfirmados.map(inscrito => {
                                      const email = inscrito.metadata?.email?.toLowerCase() || ''
                                      return (
                                        <tr key={inscrito.id} className="hover:bg-gray-50/50">
                                          <td className="px-4 py-3 text-xs font-medium text-gray-900">{inscrito.metadata?.apellidos || '—'}</td>
                                          <td className="px-4 py-3 text-xs text-gray-600">{inscrito.metadata?.nombres || '—'}</td>
                                          <td className="px-4 py-3 text-xs text-gray-400">{inscrito.metadata?.email || '—'}</td>
                                          {momentos.map(m => {
                                            const asistio = email && emailsAsistentes[m]?.has(email)
                                            return (
                                              <td key={m} className="px-4 py-3 text-center">
                                                {asistio
                                                  ? <span className="text-green-600 text-base">✓</span>
                                                  : <span className="text-red-400 text-base">✗</span>
                                                }
                                              </td>
                                            )
                                          })}
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                                <div className="px-4 py-3 border-t border-gray-50 flex items-center gap-4">
                                  <p className="text-xs text-gray-400">
                                    {momentos.map(m => {
                                      const asistieron = inscritosConfirmados.filter(i => {
                                        const email = i.metadata?.email?.toLowerCase() || ''
                                        return email && emailsAsistentes[m]?.has(email)
                                      }).length
                                      return `${m}: ${asistieron}/${inscritosConfirmados.length}`
                                    }).join(' · ')}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
