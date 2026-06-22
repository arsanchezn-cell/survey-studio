'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  colorPrimario: string
  colorSecundario: string
  colorAcento: string
  userEmail: string
}

const navItems = [
  { href: '/dashboard', label: 'Inicio' },
  { href: '/dashboard/encuestas', label: 'Encuestas' },
  { href: '/dashboard/cursos', label: 'Cursos' },
  { href: '/dashboard/asistencias', label: 'Asistencias' },
  { href: '/dashboard/configuracion', label: 'Configuracion' },
]

export default function MobileMenu({ colorPrimario, colorSecundario, colorAcento, userEmail }: Props) {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      {/* Boton hamburguesa */}
      <button onClick={() => setAbierto(true)} className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Overlay */}
      {abierto && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setAbierto(false)} />

          {/* Menu lateral */}
          <div className="relative w-72 h-full flex flex-col z-10" style={{ background: colorPrimario }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5">
              <p className="text-white font-semibold">Menu</p>
              <button onClick={() => setAbierto(false)} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="mx-6 h-px mb-4" style={{ background: 'rgba(255,255,255,0.1)' }} />

            {/* Nav */}
            <nav className="flex-1 px-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-3" style={{ color: `${colorAcento}b3` }}>Modulos</p>
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setAbierto(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mx-6 h-px mb-4" style={{ background: 'rgba(255,255,255,0.1)' }} />

            {/* Usuario */}
            <div className="px-4 pb-8">
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-semibold" style={{ background: colorSecundario }}>
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{userEmail.split('@')[0]}</p>
                  <p className="text-xs truncate" style={{ color: colorAcento }}>{userEmail}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
