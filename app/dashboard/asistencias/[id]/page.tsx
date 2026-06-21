'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { QRCodeCanvas } from 'qrcode.react'
import * as XLSX from 'xlsx'

function getMomentoEmoji(momento: string): string {
  const lower = momento.toLowerCase()
  if (lower.includes('entrada')) return '🚪'
  if (lower.includes('salida')) return '🏁'
  return '📍'
}

function getLabelCampo(key: string): string {
  const labels: Record<string, string> = {
    apellidos: 'Apellidos', nombres: 'Nombres', email: 'Email',
    telefono: 'Teléfono', documento: 'Documento', empresa: 'Empresa',
    cargo: 'Cargo', ciudad: 'Ciudad', carrera: 'Carrera',
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

export default function AsistenciaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const supabase = createClient()
  const router = useRouter()

  const [evento, setEvento] = useState<any>(null)
  const [registros, setRegistros] = useState<any[]>([])
  const [momentoActivo, setMomentoActivo] = useState<string>('')
  const [cargando, setCargando] = useState(true)
  const [linkCopiado, setLinkCopiado] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('attendance_events')
        .select('*')
        .eq('id', id)
        .single()

      if (!data) { router.push('/dashboard/asistencias'); return }
      setEvento(data)
      if (data.moments?.length > 0) setMomentoActivo(data.moments[0])

      const { data: regs } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('event_id', id)
        .order('recorded_at', { ascending: false })

      setRegistros(regs || [])
      setCargando(false)
    }
    cargar()

    // Realtime
    const channel = supabase
      .channel('registros-asistencia')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'attendance_records',
        filter: `event_id=eq.${id}`,
      }, payload => {
        setRegistros(prev => [payload.new as any, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  function getLink(momento: string) {
    return `${window.location.origin}/asistencia/${id}?momento=${encodeURIComponent(momento)}`
  }

  function copiarLink(momento: string) {
    navigator.clipboard.writeText(getLink(momento))
    setLinkCopiado(momento)
    setTimeout(() => setLinkCopiado(null), 2000)
  }

  function getRegistrosPorMomento(momento: string) {
    return registros.filter(r => r.moment === momento)
  }

  function exportarExcel() {
    const camposEvento: string[] = evento.settings?.campos_requeridos || ['apellidos', 'nombres']
    const wb = XLSX.utils.book_new()

    const headers = ['No.', 'Momento', ...camposEvento.map(k => getLabelCampo(k)), 'Hora']
    const filas = registros.map((reg, idx) => [
      idx + 1,
      reg.moment,
      ...camposEvento.map(k => getValorCampo(reg.metadata, k)),
      new Date(reg.recorded_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...filas])
    ws['!cols'] = [{ wch: 5 }, { wch: 14 }, ...camposEvento.map(() => ({ wch: 20 })), { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Registros')

    const nombreArchivo = `${evento.title} — Asistencias.xlsx`.replace(/[/\?%*:|"<>]/g, '-')
    XLSX.writeFile(wb, nombreArchivo)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    )
  }

  const momentos: string[] = evento.moments || []
  const camposEvento: string[] = evento.settings?.campos_requeridos || ['apellidos', 'nombres']

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">Dashboard</Link>
          <span className="text-gray-300">/</span>
          <Link href="/dashboard/asistencias" className="text-gray-400 hover:text-gray-600 text-sm">Asistencias</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-medium text-gray-900 truncate max-w-xs">{evento.title}</h1>
        </div>
        <Link
          href={`/dashboard/asistencias/${id}/editar`}
          className="flex items-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          ✏️ Editar evento
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{evento.title}</h2>
              {evento.description && <p className="text-gray-400 text-sm mt-1">{evento.description}</p>}
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-2xl font-medium text-gray-900">{registros.length}</p>
                <p className="text-xs text-gray-400">registros totales</p>
              </div>
              <div>
                <p className="text-2xl font-medium text-gray-900">{momentos.length}</p>
                <p className="text-xs text-gray-400">momentos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs de momentos */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {momentos.map(m => (
            <button
              key={m}
              onClick={() => setMomentoActivo(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${momentoActivo === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {getMomentoEmoji(m)} {m} ({getRegistrosPorMomento(m).length})
            </button>
          ))}
        </div>

        {momentoActivo && (
          <div className="grid grid-cols-3 gap-6">
            {/* QR */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
              <p className="text-sm font-medium text-gray-900 mb-4">
                {getMomentoEmoji(momentoActivo)} QR de {momentoActivo}
              </p>
              <div className="flex justify-center mb-4">
                <QRCodeCanvas
                  value={typeof window !== 'undefined' ? getLink(momentoActivo) : ''}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#1e3a5f"
                  level="M"
                />
              </div>
              <button
                onClick={() => copiarLink(momentoActivo)}
                className="w-full text-sm border border-gray-200 hover:border-blue-400 text-gray-600 hover:text-blue-600 py-2 rounded-xl transition-colors"
              >
                {linkCopiado === momentoActivo ? '✓ Link copiado' : '🔗 Copiar link'}
              </button>
            </div>

            {/* Registros */}
            <div className="col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">
                  Registros de {momentoActivo}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{getRegistrosPorMomento(momentoActivo).length} personas</span>
                  {getRegistrosPorMomento(momentoActivo).length > 0 && (
                    <button
                      onClick={exportarExcel}
                      className="flex items-center gap-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
                    >
                      ⬇ Excel
                    </button>
                  )}
                </div>
              </div>
              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {getRegistrosPorMomento(momentoActivo).length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-400">Sin registros aún</p>
                    <p className="text-xs text-gray-300 mt-1">Comparte el QR para empezar a registrar</p>
                  </div>
                ) : (
                  getRegistrosPorMomento(momentoActivo).map(reg => (
                    <div key={reg.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Primer campo como nombre principal */}
                          <p className="text-sm font-medium text-gray-900">
                            {[getValorCampo(reg.metadata, camposEvento[0]), camposEvento[1] ? getValorCampo(reg.metadata, camposEvento[1]) : '']
                              .filter(v => v && v !== '—').join(', ') || '—'}
                          </p>
                          {/* Resto de campos */}
                          {camposEvento.slice(2).map(key => {
                            const val = getValorCampo(reg.metadata, key)
                            if (val === '—') return null
                            return <p key={key} className="text-xs text-gray-400">{val}</p>
                          })}
                        </div>
                        <p className="text-xs text-gray-300 shrink-0">
                          {new Date(reg.recorded_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
