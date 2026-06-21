import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  let branding: any = {}
  if (userData?.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('branding, name')
      .eq('id', userData.tenant_id)
      .single()
    branding = tenant?.branding || {}
  }

  const colorPrimario = branding.color_primario || '#1e3a5f'
  const colorSecundario = branding.color_secundario || '#3b82f6'
  const colorAcento = branding.color_acento || '#93c5fd'
  const nombrePlataforma = branding.nombre_plataforma || 'Survey Studio'
  const subtitulo = branding.subtitulo || 'Plataforma de encuestas'

  const navItems = [
    {
      href: '/dashboard/encuestas',
      label: 'Encuestas',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colorAcento} strokeWidth="2" strokeLinecap="round">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <line x1="9" y1="12" x2="15" y2="12"/>
          <line x1="9" y1="16" x2="13" y2="16"/>
        </svg>
      ),
    },
    {
      href: '/dashboard/cursos',
      label: 'Cursos',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colorAcento} strokeWidth="2" strokeLinecap="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>
      ),
    },
    {
      href: '/dashboard/asistencias',
      label: 'Asistencias',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colorAcento} strokeWidth="2" strokeLinecap="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <polyline points="16 11 18 13 22 9"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Inyectar variables CSS del tenant */}
      <style>{`
        :root {
          --color-primario: ${colorPrimario};
          --color-secundario: ${colorSecundario};
          --color-acento: ${colorAcento};
        }
      `}</style>

      {/* Sidebar */}
      <aside className="w-60 flex flex-col fixed h-full z-30" style={{ background: `linear-gradient(180deg, ${colorPrimario} 0%, ${colorPrimario}cc 100%)` }}>

        {/* Logo */}
        <div className="px-6 py-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: colorSecundario }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <rect x="9" y="3" width="6" height="4" rx="1" stroke="white" strokeWidth="2"/>
                <line x1="9" y1="12" x2="15" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <line x1="9" y1="16" x2="13" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">{nombrePlataforma}</p>
              <p className="text-xs" style={{ color: colorAcento }}>{subtitulo}</p>
            </div>
          </Link>
        </div>

        <div className="mx-6 h-px mb-4" style={{ background: 'rgba(255,255,255,0.1)' }} />

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-3" style={{ color: `${colorAcento}b3` }}>Modulos</p>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all nav-item"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${colorSecundario}40` }}>
                {item.icon}
              </div>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mx-6 h-px mb-4" style={{ background: 'rgba(255,255,255,0.1)' }} />

        {/* Bottom */}
        <div className="px-4 pb-6 space-y-1">
          <Link
            href="/dashboard/configuracion"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all nav-item"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colorAcento} strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </div>
            <span className="font-medium">Configuración</span>
          </Link>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-semibold" style={{ background: colorSecundario }}>
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.email?.split('@')[0]}</p>
              <p className="text-xs truncate" style={{ color: colorAcento }}>{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 ml-60" style={{ background: `color-mix(in srgb, ${colorPrimario} 5%, #f8fafc)` }}>
        {children}
      </div>
    </div>
  )
}
