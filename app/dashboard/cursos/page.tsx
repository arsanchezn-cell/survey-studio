'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  closed: 'bg-red-100 text-red-600',
  archived: 'bg-yellow-100 text-yellow-700',
}

const statusLabel: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  closed: 'Cerrado',
  archived: 'Archivado',
}

export default function CursosPage() {
  const supabase = createClient()
  const router = useRouter()
  const [cursos, setCursos] = useState<any[]>([])
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

      const { data: cursosData } = await supabase
        .from('courses')
        .select(`*, course_groups(id, name, capacity, enrolled_count, schedule_label, is_active)`)
        .eq('tenant_id', userData.tenant_id)
        .order('created_at', { ascending: false })

      setCursos(cursosData || [])
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
          <h1 className="text-sm font-medium text-gray-900">Cursos</h1>
        </div>
        <Link
          href="/dashboard/cursos/nuevo"
          className="text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
          style={{ background: 'var(--color-secundario)' }}
        >
          + Nuevo curso
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {cursos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="text-4xl mb-4">🎓</div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">No hay cursos aún</h2>
            <p className="text-gray-400 text-sm mb-6">Crea tu primer curso y configura los grupos de inscripción</p>
            <Link
              href="/dashboard/cursos/nuevo"
              className="text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
              style={{ background: 'var(--color-secundario)' }}
            >
              + Crear primer curso
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {cursos.map(curso => {
              const grupos = curso.course_groups || []
              const totalInscritos = grupos.reduce((a: number, g: any) => a + (g.enrolled_count || 0), 0)
              const totalCupos = grupos.reduce((a: number, g: any) => a + (g.capacity || 0), 0)
              const gruposActivos = grupos.filter((g: any) => g.is_active).length

              return (
                <Link
                  key={curso.id}
                  href={`/dashboard/cursos/${curso.id}`}
                  className="block bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.03)' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-base font-medium text-gray-900 truncate">{curso.title}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[curso.status] || statusColor.draft}`}>
                          {statusLabel[curso.status] || 'Borrador'}
                        </span>
                        {curso.is_paid && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 shrink-0">
                            {curso.currency} {curso.price}
                          </span>
                        )}
                      </div>
                      {curso.description && (
                        <p className="text-sm text-gray-400 truncate">{curso.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-6 shrink-0 text-right">
                      <div>
                        <p className="text-lg font-medium text-gray-900">{gruposActivos}</p>
                        <p className="text-xs text-gray-400">grupos</p>
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-900">{totalInscritos}/{totalCupos}</p>
                        <p className="text-xs text-gray-400">inscritos</p>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}