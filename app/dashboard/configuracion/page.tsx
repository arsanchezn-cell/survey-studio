'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const PALETAS = [
  { nombre: 'Azul océano', primario: '#1e3a5f', secundario: '#3b82f6', acento: '#93c5fd' },
  { nombre: 'Verde esmeralda', primario: '#064e3b', secundario: '#059669', acento: '#6ee7b7' },
  { nombre: 'Púrpura real', primario: '#3b0764', secundario: '#7c3aed', acento: '#c4b5fd' },
  { nombre: 'Rojo carmesí', primario: '#7f1d1d', secundario: '#dc2626', acento: '#fca5a5' },
  { nombre: 'Naranja ámbar', primario: '#78350f', secundario: '#d97706', acento: '#fcd34d' },
  { nombre: 'Gris pizarra', primario: '#1e293b', secundario: '#475569', acento: '#94a3b8' },
]

export default function ConfiguracionPage() {
  const supabase = createClient()
  const router = useRouter()

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)

  const [nombrePlataforma, setNombrePlataforma] = useState('Survey Studio')
  const [subtitulo, setSubtitulo] = useState('Plataforma de encuestas')
  const [colorPrimario, setColorPrimario] = useState('#1e3a5f')
  const [colorSecundario, setColorSecundario] = useState('#3b82f6')
  const [colorAcento, setColorAcento] = useState('#93c5fd')
  const [mostrarPoweredBy, setMostrarPoweredBy] = useState(true)

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!userData) return
      setTenantId(userData.tenant_id)

      const { data: tenant } = await supabase
        .from('tenants')
        .select('branding, name')
        .eq('id', userData.tenant_id)
        .single()

      if (tenant?.branding) {
        const b = tenant.branding
        setNombrePlataforma(b.nombre_plataforma || tenant.name || 'Survey Studio')
        setSubtitulo(b.subtitulo || 'Plataforma de encuestas')
        setColorPrimario(b.color_primario || '#1e3a5f')
        setColorSecundario(b.color_secundario || '#3b82f6')
        setColorAcento(b.color_acento || '#93c5fd')
        setMostrarPoweredBy(b.mostrar_powered_by ?? true)
      }

      setCargando(false)
    }
    cargar()
  }, [])

  function aplicarPaleta(paleta: typeof PALETAS[0]) {
    setColorPrimario(paleta.primario)
    setColorSecundario(paleta.secundario)
    setColorAcento(paleta.acento)
  }

  async function guardar() {
    if (!tenantId) return
    setGuardando(true)

    await supabase
      .from('tenants')
      .update({
        branding: {
          nombre_plataforma: nombrePlataforma.trim(),
          subtitulo: subtitulo.trim(),
          color_primario: colorPrimario,
          color_secundario: colorSecundario,
          color_acento: colorAcento,
          mostrar_powered_by: mostrarPoweredBy,
        }
      })
      .eq('id', tenantId)

    setGuardando(false)
    setGuardado(true)
    router.refresh()
    setTimeout(() => setGuardado(false), 2000)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">Dashboard</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-medium text-gray-900">Configuración</h1>
        </div>
        <button
          onClick={guardar}
          disabled={guardando}
          className="disabled:opacity-50 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90" style={{ background: 'var(--color-secundario)' }}
        >
          {guardando ? 'Guardando...' : guardado ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Identidad */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-medium text-gray-900">Identidad de la plataforma</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la plataforma</label>
            <input
              type="text"
              value={nombrePlataforma}
              onChange={e => setNombrePlataforma(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secundario)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subtítulo</label>
            <input
              type="text"
              value={subtitulo}
              onChange={e => setSubtitulo(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secundario)]"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="poweredBy"
              checked={mostrarPoweredBy}
              onChange={e => setMostrarPoweredBy(e.target.checked)}
              className="accent-[var(--color-secundario)] w-4 h-4"
            />
            <label htmlFor="poweredBy" className="text-sm text-gray-700 cursor-pointer">
              Mostrar "Powered by Survey Studio" en páginas públicas
            </label>
          </div>
        </div>

        {/* Paleta de colores */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-medium text-gray-900">Paleta de colores</h2>
          <p className="text-sm text-gray-400">Elige una paleta predefinida o personaliza los colores manualmente</p>

          {/* Paletas predefinidas */}
          <div className="grid grid-cols-3 gap-3">
            {PALETAS.map(paleta => (
              <button
                key={paleta.nombre}
                onClick={() => aplicarPaleta(paleta)}
                className={`p-3 border-2 rounded-xl text-left transition-colors ${
                  colorPrimario === paleta.primario ? 'border-blue-400' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex gap-1.5 mb-2">
                  <div className="w-5 h-5 rounded-full" style={{ background: paleta.primario }} />
                  <div className="w-5 h-5 rounded-full" style={{ background: paleta.secundario }} />
                  <div className="w-5 h-5 rounded-full" style={{ background: paleta.acento }} />
                </div>
                <p className="text-xs font-medium text-gray-700">{paleta.nombre}</p>
              </button>
            ))}
          </div>

          {/* Colores personalizados */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Personalizar</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-2">Color primario</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colorPrimario}
                    onChange={e => setColorPrimario(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={colorPrimario}
                    onChange={e => setColorPrimario(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-secundario)] font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Color secundario</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colorSecundario}
                    onChange={e => setColorSecundario(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={colorSecundario}
                    onChange={e => setColorSecundario(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-secundario)] font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Color acento</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colorAcento}
                    onChange={e => setColorAcento(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={colorAcento}
                    onChange={e => setColorAcento(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-secundario)] font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview sidebar */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Vista previa del sidebar</p>
            <div className="rounded-2xl overflow-hidden w-48" style={{ background: `linear-gradient(180deg, ${colorPrimario} 0%, ${colorPrimario}cc 100%)` }}>
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: colorSecundario }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      <rect x="9" y="3" width="6" height="4" rx="1" stroke="white" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold leading-tight">{nombrePlataforma || 'Survey Studio'}</p>
                    <p className="text-xs" style={{ color: colorAcento }}>{subtitulo || 'Plataforma'}</p>
                  </div>
                </div>
                {['Encuestas', 'Cursos', 'Asistencias'].map(item => (
                  <div key={item} className="flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${colorSecundario}40` }}>
                      <div className="w-2 h-2 rounded-sm" style={{ background: colorAcento }} />
                    </div>
                    <span className="text-xs text-white font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
