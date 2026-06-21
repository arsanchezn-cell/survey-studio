import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  let totalEncuestas = 0
  let totalRespuestas = 0
  let totalCursos = 0
  let totalInscritos = 0
  let totalEventos = 0
  let totalAsistencias = 0

  if (userData?.tenant_id) {
    const [encuestasRes, cursosRes, eventosRes] = await Promise.all([
      supabase.from('surveys').select('id', { count: 'exact' }).eq('tenant_id', userData.tenant_id),
      supabase.from('courses').select('id', { count: 'exact' }).eq('tenant_id', userData.tenant_id),
      supabase.from('attendance_events').select('id', { count: 'exact' }).eq('tenant_id', userData.tenant_id),
    ])
    totalEncuestas = encuestasRes.count || 0
    totalCursos = cursosRes.count || 0
    totalEventos = eventosRes.count || 0

    if (totalEncuestas > 0) {
      const { count } = await supabase
        .from('survey_responses')
        .select('id', { count: 'exact' })
        .eq('status', 'completed')
      totalRespuestas = count || 0
    }

    if (totalCursos > 0) {
      const cursosData = await supabase
        .from('courses')
        .select('id')
        .eq('tenant_id', userData.tenant_id)
      if (cursosData.data) {
        const courseIds = cursosData.data.map(c => c.id)
        const gruposRes = await supabase
          .from('course_groups')
          .select('enrolled_count')
          .in('course_id', courseIds)
        totalInscritos = (gruposRes.data || []).reduce((a, g) => a + (g.enrolled_count || 0), 0)
      }
    }

    if (totalEventos > 0) {
      const eventosData = await supabase
        .from('attendance_events')
        .select('id')
        .eq('tenant_id', userData.tenant_id)
      if (eventosData.data) {
        const eventoIds = eventosData.data.map(e => e.id)
        const { count } = await supabase
          .from('attendance_records')
          .select('id', { count: 'exact' })
          .in('event_id', eventoIds)
        totalAsistencias = count || 0
      }
    }
  }

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = user.email?.split('@')[0] || 'usuario'

  const metricas = [
    {
      label: 'Encuestas activas',
      value: totalEncuestas,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <line x1="9" y1="12" x2="15" y2="12"/>
          <line x1="9" y1="16" x2="13" y2="16"/>
        </svg>
      ),
      color: '#3b82f6',
      bg: '#eff6ff',
      href: '/dashboard/encuestas',
    },
    {
      label: 'Respuestas recibidas',
      value: totalRespuestas,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
      color: '#8b5cf6',
      bg: '#f5f3ff',
      href: '/dashboard/encuestas',
    },
    {
      label: 'Cursos publicados',
      value: totalCursos,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>
      ),
      color: '#0891b2',
      bg: '#ecfeff',
      href: '/dashboard/cursos',
    },
    {
      label: 'Inscritos en cursos',
      value: totalInscritos,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      ),
      color: '#059669',
      bg: '#ecfdf5',
      href: '/dashboard/cursos',
    },
    {
      label: 'Eventos de asistencia',
      value: totalEventos,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
      color: '#d97706',
      bg: '#fffbeb',
      href: '/dashboard/asistencias',
    },
    {
      label: 'Registros de asistencia',
      value: totalAsistencias,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="9 11 12 14 22 4"/>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
      ),
      color: '#ea580c',
      bg: '#fff7ed',
      href: '/dashboard/asistencias',
    },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      {/* Header */}
      <div className="px-8 pt-8 pb-6">
        <h1 className="text-2xl font-semibold text-slate-800">{saludo}, {nombre} 👋</h1>
        <p className="text-slate-500 text-sm mt-1">Aquí tienes un resumen de tu actividad</p>
      </div>

      {/* Métricas — 3 columnas x 2 filas */}
      <div className="px-8 grid grid-cols-3 gap-4 mb-8">
        {metricas.map((m, idx) => (
          <Link
            key={m.label}
            href={m.href}
            className={`block rounded-2xl p-5 border hover:shadow-lg transition-all group card-metrica-${idx + 1}`}
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ background: m.bg, color: m.color }}>
                {m.icon}
              </div>
            </div>
            <p className="text-3xl font-semibold text-slate-800 mb-1">{m.value}</p>
            <p className="text-sm" style={{ color: m.color }}>{m.label}</p>
          </Link>
        ))}
      </div>

      {/* Accesos rápidos */}
      <div className="px-8 mb-8">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-3 gap-4">

          {/* Encuestas */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}>
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#eff6ff' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold text-slate-700">Encuestas</span>
              </div>
              <Link href="/dashboard/encuestas" className="text-xs hover:opacity-80 font-medium" style={{ color: 'var(--color-secundario)' }}>Ver todas →</Link>
            </div>
            <div className="p-4 space-y-2">
              <Link href="/dashboard/encuestas/nueva" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-blue-300 group-hover:text-blue-500 transition-colors">
                  <span className="text-lg leading-none">+</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Crear encuesta manual</p>
                  <p className="text-xs text-slate-400">Diseña tu encuesta paso a paso</p>
                </div>
              </Link>
              <Link href="/dashboard/encuestas/nueva-ia" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#eff6ff' }}>
                  <span className="text-base">✨</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Generar con IA</p>
                  <p className="text-xs text-slate-400">Describe y la IA la crea por ti</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Cursos */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}>
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#ecfeff' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold text-slate-700">Cursos</span>
              </div>
              <Link href="/dashboard/cursos" className="text-xs hover:opacity-80 font-medium" style={{ color: 'var(--color-secundario)' }}>Ver todos →</Link>
            </div>
            <div className="p-4 space-y-2">
              <Link href="/dashboard/cursos/nuevo" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-cyan-300 group-hover:text-cyan-500 transition-colors">
                  <span className="text-lg leading-none">+</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Crear nuevo curso</p>
                  <p className="text-xs text-slate-400">Configura grupos y cupos</p>
                </div>
              </Link>
              <Link href="/dashboard/cursos" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#ecfeff' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Ver inscritos</p>
                  <p className="text-xs text-slate-400">Gestiona las inscripciones</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Asistencias */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}>
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#fffbeb' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
                    <polyline points="9 11 12 14 22 4"/>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold text-slate-700">Asistencias</span>
              </div>
              <Link href="/dashboard/asistencias" className="text-xs hover:opacity-80 font-medium" style={{ color: 'var(--color-secundario)' }}>Ver todos →</Link>
            </div>
            <div className="p-4 space-y-2">
              <Link href="/dashboard/asistencias/nuevo" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-amber-300 group-hover:text-amber-500 transition-colors">
                  <span className="text-lg leading-none">+</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Crear evento</p>
                  <p className="text-xs text-slate-400">Configura momentos y campos</p>
                </div>
              </Link>
              <Link href="/dashboard/asistencias" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fffbeb' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Ver registros</p>
                  <p className="text-xs text-slate-400">Consulta quién asistió</p>
                </div>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
