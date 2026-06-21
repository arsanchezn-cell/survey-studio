'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const CAMPOS_DISPONIBLES = [
  { key: 'apellidos', label: 'Apellidos', tipo: 'text' },
  { key: 'nombres', label: 'Nombres', tipo: 'text' },
  { key: 'email', label: 'Correo electrónico', tipo: 'email' },
  { key: 'telefono', label: 'Teléfono', tipo: 'text' },
  { key: 'documento', label: 'Documento de identidad', tipo: 'text' },
  { key: 'empresa', label: 'Empresa / Institución', tipo: 'text' },
  { key: 'cargo', label: 'Cargo', tipo: 'text' },
  { key: 'ciudad', label: 'Ciudad', tipo: 'text' },
]

type CampoCustom = {
  id: string
  label: string
}

interface Grupo {
  nombre: string
  capacidad: string
  horario: string
  ubicacion: string
  fecha_inicio: string
  fecha_fin: string
}

const GRUPO_VACIO: Grupo = {
  nombre: '',
  capacidad: '',
  horario: '',
  ubicacion: '',
  fecha_inicio: '',
  fecha_fin: '',
}

export default function NuevoCursoPage() {
  const supabase = createClient()
  const router = useRouter()

  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [esPago, setEsPago] = useState(false)
  const [precio, setPrecio] = useState('')
  const [moneda, setMoneda] = useState('USD')
  const [camposRequeridos, setCamposRequeridos] = useState<string[]>(['apellidos', 'nombres', 'email'])
  const [camposCustom, setCamposCustom] = useState<CampoCustom[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([{ ...GRUPO_VACIO }])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function toggleCampo(key: string) {
    setCamposRequeridos(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  function agregarCampoCustom() {
    setCamposCustom(prev => [...prev, { id: `custom_${Date.now()}`, label: '' }])
  }

  function eliminarCampoCustom(id: string) {
    setCamposCustom(prev => prev.filter(c => c.id !== id))
  }

  function renombrarCampoCustom(id: string, label: string) {
    setCamposCustom(prev => prev.map(c => c.id === id ? { ...c, label } : c))
  }

  function actualizarGrupo(index: number, campo: keyof Grupo, valor: string) {
    const nuevos = [...grupos]
    nuevos[index] = { ...nuevos[index], [campo]: valor }
    setGrupos(nuevos)
  }

  function agregarGrupo() {
    setGrupos([...grupos, { ...GRUPO_VACIO }])
  }

  function eliminarGrupo(index: number) {
    setGrupos(grupos.filter((_, i) => i !== index))
  }

  async function guardar() {
    if (!titulo.trim()) { setError('El título del curso es obligatorio'); return }
    if (grupos.some(g => !g.nombre.trim() || !g.capacidad)) {
      setError('Cada grupo debe tener nombre y capacidad')
      return
    }
    const camposCustomSinNombre = camposCustom.filter(c => !c.label.trim())
    if (camposCustomSinNombre.length > 0) { setError('Todos los campos personalizados deben tener nombre'); return }

    setGuardando(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!userData) return

    const todosLosCampos = [
      ...camposRequeridos,
      ...camposCustom.filter(c => c.label.trim()).map(c => `custom_${c.label.trim()}`)
    ]

    const { data: curso, error: errCurso } = await supabase
      .from('courses')
      .insert({
        tenant_id: userData.tenant_id,
        created_by: user.id,
        title: titulo.trim(),
        description: descripcion.trim(),
        is_paid: esPago,
        price: esPago ? parseFloat(precio) || 0 : 0,
        currency: moneda,
        status: 'active',
        settings: { campos_requeridos: todosLosCampos },
      })
      .select()
      .single()

    if (errCurso) {
      setError('Error al crear curso: ' + errCurso.message)
      setGuardando(false)
      return
    }

    const gruposData = grupos.map(g => ({
      course_id: curso.id,
      name: g.nombre.trim(),
      capacity: parseInt(g.capacidad) || 0,
      enrolled_count: 0,
      schedule_label: g.horario.trim(),
      location: g.ubicacion.trim(),
      starts_at: g.fecha_inicio || null,
      ends_at: g.fecha_fin || null,
      is_active: true,
    }))

    const { error: errGrupos } = await supabase.from('course_groups').insert(gruposData)

    if (errGrupos) {
      setError('Error al crear grupos: ' + errGrupos.message)
      setGuardando(false)
      return
    }

    router.push(`/dashboard/cursos/${curso.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">Dashboard</Link>
          <span className="text-gray-300">/</span>
          <Link href="/dashboard/cursos" className="text-gray-400 hover:text-gray-600 text-sm">Cursos</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-medium text-gray-900">Nuevo curso</h1>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-medium text-gray-900">Información del curso</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ej: Excel Avanzado para Empresas"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción <span className="text-gray-400 font-normal">(opcional)</span></label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Describe brevemente el contenido y objetivos del curso..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-2 resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="esPago" checked={esPago} onChange={e => setEsPago(e.target.checked)} className="accent-[var(--color-secundario)] w-4 h-4" />
            <label htmlFor="esPago" className="text-sm text-gray-700 cursor-pointer">Curso de pago</label>
          </div>
          {esPago && (
            <div className="flex gap-3">
              <select value={moneda} onChange={e => setMoneda(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-2 bg-white">
                <option>USD</option><option>EUR</option><option>COP</option><option>MXN</option><option>ARS</option><option>CLP</option><option>PEN</option>
              </select>
              <input type="number" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="0.00" className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-2" />
            </div>
          )}
        </div>

        {/* Campos del participante */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-medium text-gray-900">Datos del participante</h2>
            <button
              onClick={agregarCampoCustom}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors" style={{ color: 'var(--color-secundario)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Campo personalizado
            </button>
          </div>
          <p className="text-sm text-gray-400 mb-4">Selecciona qué información se solicitará al inscribirse</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {CAMPOS_DISPONIBLES.map(campo => (
              <label key={campo.key} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:border-gray-200 transition-colors">
                <input
                  type="checkbox"
                  checked={camposRequeridos.includes(campo.key)}
                  onChange={() => toggleCampo(campo.key)}
                  className="accent-[var(--color-secundario)] w-4 h-4 shrink-0"
                />
                <span className="text-sm text-gray-700">{campo.label}</span>
              </label>
            ))}
          </div>
          {camposCustom.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">Campos personalizados</p>
              {camposCustom.map(campo => (
                <div key={campo.id} className="flex items-center gap-2 p-3 border border-green-100 bg-green-50 rounded-xl">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="2" className="shrink-0">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                  <input
                    type="text"
                    value={campo.label}
                    onChange={e => renombrarCampoCustom(campo.id, e.target.value)}
                    placeholder="Nombre del campo..."
                    className="flex-1 text-sm text-gray-900 bg-transparent focus:outline-none placeholder-gray-300"
                  />
                  <button onClick={() => eliminarCampoCustom(campo.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grupos */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-medium text-gray-900">Grupos</h2>
              <p className="text-sm text-gray-400 mt-0.5">Configura los horarios y cupos disponibles</p>
            </div>
            <button onClick={agregarGrupo} className="text-sm hover:opacity-80 font-medium" style={{ color: 'var(--color-secundario)' }}>+ Agregar grupo</button>
          </div>
          <div className="space-y-4">
            {grupos.map((grupo, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Grupo {i + 1}</span>
                  {grupos.length > 1 && (
                    <button onClick={() => eliminarGrupo(i)} className="text-gray-300 hover:text-red-400 text-sm">Eliminar</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nombre del grupo</label>
                    <input type="text" value={grupo.nombre} onChange={e => actualizarGrupo(i, 'nombre', e.target.value)} placeholder="Ej: Grupo A — Mañana" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Capacidad máxima</label>
                    <input type="number" value={grupo.capacidad} onChange={e => actualizarGrupo(i, 'capacidad', e.target.value)} placeholder="20" min={1} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Horario</label>
                    <input type="text" value={grupo.horario} onChange={e => actualizarGrupo(i, 'horario', e.target.value)} placeholder="Ej: Lunes y Miércoles 8:00–10:00am" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ubicación / Modalidad</label>
                    <input type="text" value={grupo.ubicacion} onChange={e => actualizarGrupo(i, 'ubicacion', e.target.value)} placeholder="Ej: Virtual / Sede Norte" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fecha inicio <span className="text-gray-300">(opcional)</span></label>
                    <input type="date" value={grupo.fecha_inicio} onChange={e => actualizarGrupo(i, 'fecha_inicio', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fecha fin <span className="text-gray-300">(opcional)</span></label>
                    <input type="date" value={grupo.fecha_fin} onChange={e => actualizarGrupo(i, 'fecha_fin', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between pb-8">
          <Link href="/dashboard/cursos" className="text-sm text-gray-500 hover:text-gray-700">Cancelar</Link>
          <button onClick={guardar} disabled={guardando} className="text-white hover:opacity-90 disabled:opacity-50 text-white px-8 py-3 rounded-xl text-sm font-medium transition-colors" style={{ background: 'var(--color-secundario)' }}>
            {guardando ? 'Guardando...' : 'Crear curso'}
          </button>
        </div>
      </main>
    </div>
  )
}
