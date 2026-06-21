'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const statusColor: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
  archived: 'bg-yellow-100 text-yellow-700',
}

const statusLabel: Record<string, string> = {
  active: 'Activo',
  closed: 'Cerrado',
  archived: 'Archivado',
}

function getMomentoColor(momento: string): string {
  const lower = momento.toLowerCase()
  if (lower.includes('entrada')) return 'bg-green-50 text-green-700 border border-green-200'
  if (lower.includes('salida')) return 'bg-blue-50 text-blue-700 border border-blue-200'
  return 'bg-amber-50 text-amber-700 border border-amber-200'
}

export default function AsistenciasPage() {
  const supabase = createClient()
  const router = useRouter()
  const [eventos, setEventos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!userData) return

      const { data } = await supabase
        .from('attendance_events')
        .select('*')
        .eq('tenant_id', userData.tenant_id)
        .order('created_at', { ascending: false })

      setEventos(data || [])
      setCargando(false)
    }
    cargar()
  }, [])

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">Dashboard</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-medium text-gray-900">Asistencias</h1>
        </div>
        <Link
          href="/dashboard/asistencias/nuevo"
          className="text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          style={{ background: 'var(--color-secundario)' }}
        >
          + Nuevo evento
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {eventos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">No hay eventos aún</h2>
            <p className="text-gray-400 text-sm mb-6">Crea un evento para empezar a registrar asistencias con QR</p>
            <Link
              href="/dashboard/asistencias/nuevo"
              className="text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'var(--color-secundario)' }}
            >
              + Crear primer evento
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {eventos.map(evento => (
              <Link
                key={evento.id}
                href={`/dashboard/asistencias/${evento.id}`}
                className="block bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.03)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-sm font-medium text-gray-900 truncate">{evento.title}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[evento.status] || statusColor.active}`}>
                        {statusLabel[evento.status] || 'Activo'}
                      </span>
                    </div>
                    {evento.description && (
                      <p className="text-xs text-gray-400 truncate mb-2">{evento.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      {(evento.moments || []).map((m: string, i: number) => (
                        <span key={i} className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getMomentoColor(m)}`}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">{new Date(evento.created_at).toLocaleDateString('es')}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
