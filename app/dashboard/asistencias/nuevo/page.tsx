'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const CAMPOS_DISPONIBLES = [
  { key: 'apellidos', label: 'Apellidos' },
  { key: 'nombres', label: 'Nombres' },
  { key: 'email', label: 'Correo electrónico' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'documento', label: 'Documento de identidad' },
  { key: 'empresa', label: 'Empresa / Institución' },
  { key: 'carrera', label: 'Carrera' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'ciudad', label: 'Ciudad' },
]

type Momento = {
  id: string
  label: string
  tipo: 'entrada' | 'salida' | 'custom'
}

type CampoCustom = {
  id: string
  label: string
}

type Curso = {
  id: string
  title: string
  grupos: { id: string; name: string }[]
}

function SortableMomento({ momento, onDelete, onRename }: {
  momento: Momento
  onDelete: (id: string) => void
  onRename: (id: string, label: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: momento.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-white border-2 border-blue-200 rounded-xl"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="5" r="1" fill="currentColor"/>
          <circle cx="9" cy="12" r="1" fill="currentColor"/>
          <circle cx="9" cy="19" r="1" fill="currentColor"/>
          <circle cx="15" cy="5" r="1" fill="currentColor"/>
          <circle cx="15" cy="12" r="1" fill="currentColor"/>
          <circle cx="15" cy="19" r="1" fill="currentColor"/>
        </svg>
      </button>

      {momento.tipo === 'custom' ? (
        <input
          type="text"
          value={momento.label}
          onChange={e => onRename(momento.id, e.target.value)}
          placeholder="Nombre del momento..."
          className="flex-1 text-sm text-gray-900 font-medium bg-transparent focus:outline-none placeholder-gray-300"
        />
      ) : (
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{momento.label}</p>
          <p className="text-xs text-gray-400">{momento.tipo === 'entrada' ? 'Al inicio del evento' : 'Al finalizar el evento'}</p>
        </div>
      )}

      <button
        onClick={() => onDelete(momento.id)}
        className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}

export default function NuevoEventoPage() {
  const supabase = createClient()
  const router = useRouter()

  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [momentos, setMomentos] = useState<Momento[]>([
    { id: 'entrada', label: 'Entrada', tipo: 'entrada' },
    { id: 'salida', label: 'Salida', tipo: 'salida' },
  ])
  const [campos, setCampos] = useState<string[]>(['apellidos', 'nombres'])
  const [camposCustom, setCamposCustom] = useState<CampoCustom[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Vínculo con curso
  const [cursos, setCursos] = useState<Curso[]>([])
  const [cursoSeleccionado, setCursoSeleccionado] = useState<string>('')
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    async function cargarCursos() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
      if (!userData) return

      const { data: cursosData } = await supabase
        .from('courses')
        .select('id, title')
        .eq('tenant_id', userData.tenant_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (!cursosData) return

      const cursosConGrupos = await Promise.all(cursosData.map(async curso => {
        const { data: grupos } = await supabase
          .from('course_groups')
          .select('id, name')
          .eq('course_id', curso.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
        return { ...curso, grupos: grupos || [] }
      }))

      setCursos(cursosConGrupos)
    }
    cargarCursos()
  }, [])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setMomentos(prev => {
        const oldIndex = prev.findIndex(m => m.id === active.id)
        const newIndex = prev.findIndex(m => m.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  function agregarMomento() {
    const id = `custom_${Date.now()}`
    const idxSalida = momentos.findIndex(m => m.tipo === 'salida')
    const nuevo: Momento = { id, label: '', tipo: 'custom' }
    if (idxSalida !== -1) {
      const copia = [...momentos]
      copia.splice(idxSalida, 0, nuevo)
      setMomentos(copia)
    } else {
      setMomentos(prev => [...prev, nuevo])
    }
  }

  function eliminarMomento(id: string) {
    setMomentos(prev => prev.filter(m => m.id !== id))
  }

  function renombrarMomento(id: string, label: string) {
    setMomentos(prev => prev.map(m => m.id === id ? { ...m, label } : m))
  }

  function toggleCampo(key: string) {
    setCampos(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key])
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

  function handleCursoChange(cursoId: string) {
    setCursoSeleccionado(cursoId)
    setGrupoSeleccionado('')
  }

  const gruposDelCurso = cursos.find(c => c.id === cursoSeleccionado)?.grupos || []

  async function guardar() {
    if (!titulo.trim()) { setError('El título del evento es obligatorio'); return }
    if (momentos.length === 0) { setError('Agrega al menos un momento'); return }
    const momentosSinNombre = momentos.filter(m => m.tipo === 'custom' && !m.label.trim())
    if (momentosSinNombre.length > 0) { setError('Todos los momentos deben tener nombre'); return }
    const camposCustomSinNombre = camposCustom.filter(c => !c.label.trim())
    if (camposCustomSinNombre.length > 0) { setError('Todos los campos personalizados deben tener nombre'); return }
    if (campos.length === 0 && camposCustom.length === 0) { setError('Selecciona al menos un campo'); return }
    if (cursoSeleccionado && !grupoSeleccionado) { setError('Selecciona un grupo del curso'); return }

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

    const momentosArray = momentos.map(m => m.label.trim())

    const { data: evento, error: err } = await supabase
      .from('attendance_events')
      .insert({
        tenant_id: userData.tenant_id,
        title: titulo.trim(),
        description: descripcion.trim(),
        moments: momentosArray,
        settings: { campos_requeridos: [...campos, ...camposCustom.filter(c => c.label.trim()).map(c => `custom_${c.label.trim()}`)] },
        status: 'active',
        course_group_id: grupoSeleccionado || null,
      })
      .select()
      .single()

    if (err) {
      setError('Error al crear evento: ' + err.message)
      setGuardando(false)
      return
    }

    router.push(`/dashboard/asistencias/${evento.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">Dashboard</Link>
          <span className="text-gray-300">/</span>
          <Link href="/dashboard/asistencias" className="text-gray-400 hover:text-gray-600 text-sm">Asistencias</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-medium text-gray-900">Nuevo evento</h1>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-medium text-gray-900">Información del evento</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ej: Conferencia de Marketing Digital"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción <span className="text-gray-400 font-normal">(opcional)</span></label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Describe brevemente el evento..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-2 resize-none"
            />
          </div>
        </div>

        {/* Vincular a curso */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="font-medium text-gray-900">Vincular a curso <span className="text-gray-400 font-normal text-sm">(opcional)</span></h2>
            <p className="text-sm text-gray-400 mt-0.5">Asocia este evento a un grupo para cruzar inscritos con asistentes</p>
          </div>

          {cursos.length === 0 ? (
            <p className="text-sm text-gray-400">No hay cursos activos disponibles</p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Curso</label>
                <select
                  value={cursoSeleccionado}
                  onChange={e => handleCursoChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-2 bg-white"
                >
                  <option value="">Sin vincular</option>
                  {cursos.map(curso => (
                    <option key={curso.id} value={curso.id}>{curso.title}</option>
                  ))}
                </select>
              </div>

              {cursoSeleccionado && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grupo</label>
                  {gruposDelCurso.length === 0 ? (
                    <p className="text-sm text-gray-400">Este curso no tiene grupos activos</p>
                  ) : (
                    <select
                      value={grupoSeleccionado}
                      onChange={e => setGrupoSeleccionado(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-2 bg-white"
                    >
                      <option value="">Selecciona un grupo...</option>
                      {gruposDelCurso.map(grupo => (
                        <option key={grupo.id} value={grupo.id}>{grupo.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {cursoSeleccionado && grupoSeleccionado && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <polyline points="9 11 12 14 22 4"/>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                  <p className="text-xs text-blue-700">
                    Los inscritos de este grupo aparecerán en el reporte de asistencia
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Momentos */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-medium text-gray-900">Momentos de registro</h2>
            <button
              onClick={agregarMomento}
              className="flex items-center gap-1.5 text-xs hover:opacity-80" className="font-medium transition-colors" style={{ color: 'var(--color-secundario)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Agregar momento
            </button>
          </div>
          <p className="text-sm text-gray-400 mb-4">Cada momento genera un QR independiente · Arrastra para reordenar</p>

          {momentos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay momentos. Agrega al menos uno.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={momentos.map(m => m.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {momentos.map(momento => (
                    <SortableMomento
                      key={momento.id}
                      momento={momento}
                      onDelete={eliminarMomento}
                      onRename={renombrarMomento}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Campos */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-medium text-gray-900">Datos del participante</h2>
            <button
              onClick={agregarCampoCustom}
              className="flex items-center gap-1.5 text-xs hover:opacity-80" className="font-medium transition-colors" style={{ color: 'var(--color-secundario)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Campo personalizado
            </button>
          </div>
          <p className="text-sm text-gray-400 mb-4">Selecciona qué información se solicitará al registrar asistencia</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {CAMPOS_DISPONIBLES.map(campo => (
              <label key={campo.key} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:border-gray-200 transition-colors">
                <input
                  type="checkbox"
                  checked={campos.includes(campo.key)}
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
                <div key={campo.id} className="flex items-center gap-2 p-3 border border-blue-100 bg-blue-50 rounded-xl">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2" className="shrink-0">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                  <input
                    type="text"
                    value={campo.label}
                    onChange={e => renombrarCampoCustom(campo.id, e.target.value)}
                    placeholder="Nombre del campo..."
                    className="flex-1 text-sm text-gray-900 bg-transparent focus:outline-none placeholder-gray-300"
                  />
                  <button
                    onClick={() => eliminarCampoCustom(campo.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between pb-8">
          <Link href="/dashboard/asistencias" className="text-sm text-gray-500 hover:text-gray-700">Cancelar</Link>
          <button
            onClick={guardar}
            disabled={guardando}
            className="text-white hover:opacity-90 disabled:opacity-50 text-white px-8 py-3 rounded-xl text-sm font-medium transition-colors" style={{ background: 'var(--color-secundario)' }}
          >
            {guardando ? 'Creando...' : 'Crear evento'}
          </button>
        </div>
      </main>
    </div>
  )
}
