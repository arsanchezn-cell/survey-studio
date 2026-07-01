import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function EncuestasPage() {
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

  // Obtener tenant_id del usuario
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  // Filtrar encuestas por tenant_id
  const { data: encuestas } = await supabase
    .from('surveys')
    .select('*')
    .eq('tenant_id', userData?.tenant_id)
    .order('created_at', { ascending: false })

  const statusColor: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    active: 'bg-green-100 text-green-700',
    closed: 'bg-red-100 text-red-600',
    archived: 'bg-yellow-100 text-yellow-700',
  }

  const statusLabel: Record<string, string> = {
    draft: 'Borrador',
    active: 'Activa',
    closed: 'Cerrada',
    archived: 'Archivada',
  }

  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">Dashboard</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-medium text-gray-900">Encuestas</h1>
        </div>
        <span className="text-sm text-gray-500">{user.email}</span>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Mis encuestas</h2>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/encuestas/nueva-ia" className="border border-purple-200 hover:border-purple-400 text-purple-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
              ✨ Generar con IA
            </Link>
            <Link href="/dashboard/encuestas/nueva" className="text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90" style={{ background: 'var(--color-secundario)' }}>
              + Nueva encuesta
            </Link>
          </div>
        </div>

        {!encuestas || encuestas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes encuestas aún</h3>
            <p className="text-gray-500 text-sm mb-6">Crea tu primera encuesta y empieza a recopilar respuestas</p>
            <Link href="/dashboard/encuestas/nueva" className="text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-90" style={{ background: 'var(--color-secundario)' }}>
              Crear primera encuesta
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {encuestas.map((encuesta) => (
              <div key={encuesta.id} className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-between hover:shadow-md transition-all" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.03)' }}>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-gray-900">{encuesta.title}</h3>
                    <span className={	ext-xs px-2 py-1 rounded-full font-medium }>{statusLabel[encuesta.status]}</span>
                    {encuesta.is_diagnostic && (<span className="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700">Diagnostico IA</span>)}
                  </div>
                  <p className="text-sm text-gray-500">Creada {new Date(encuesta.created_at).toLocaleDateString('es-ES')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={/dashboard/encuestas/} className="text-sm font-medium hover:opacity-80 transition-colors" style={{ color: 'var(--color-secundario)' }}>Editar</Link>
                  <Link href={/dashboard/encuestas//resultados} className="text-sm text-gray-500 hover:text-gray-700 font-medium">Resultados</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
