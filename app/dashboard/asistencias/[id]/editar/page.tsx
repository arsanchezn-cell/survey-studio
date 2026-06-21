'use client'

import { useState, useEffect, use } from 'react'
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

type Momento = { id: string; label: string; tipo: 'entrada' | 'salida' | 'custom' }
type CampoCustom = { id: string; label: string }

function SortableMomento({ momento, onDelete, onRename }: {
  momento: Momento
  onDelete: (id: string) => void
  onRename: (id: string, label: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: momento.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-4 bg-white border-2 border-blue-200 rounded-xl">
      <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/>
          <circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/>
        </svg>
      </button>
      <input
        type="text"
        value={momento.label}
        onChange={e => onRename(momento.id, e.target.value)}
        placeholder="Nombre del momento..."
        className="flex-1 text-sm text-gray-900 font-medium bg-transparent focus:outline-none placeholder-gray-300"
      />
      <button onClick={() => onDelete(momento.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}

export default function EditarAsistenciaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const supabase = createClient()
  const router = useRouter()

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [momentos, setMomentos] = useState<Momento[]>([])
  const [campos, setCampos] = useState<string[]>([])
  const [camposCustom, setCamposCustom] = useState<CampoCustom[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('attendance_events')
        .select('*')
        .eq('id', id)
        .single()

      if (!data) { router.push('/dashboard/asistencias'); return }

      setTitulo(data.title || '')
      setDescripcion(data.description || '')

      // Convertir momentos guardados a objetos
      const momentosObj: Momento[] = (data.moments || []).map((m: string, i: number) => {
        const lower = m.toLowerCase()
        const tipo = lower === 'entrada' ? 'entrada' : lower === 'salida' ? 'salida' : 'custom'
        return { id: `m_${i}_${Date.now()}`, label: m, tipo }
      })
      setMomentos(momentosObj)

      const todosLosCampos: string[] = data.settings?.campos_requeridos || ['apellidos', 'nombres']
      const camposPredefinidos = todosLosCampos.filter((c: string) => !c.startsWith('custom_'))
      const camposPersonalizados = todosLosCampos
        .filter((c: string) => c.startsWith('custom_'))
        .map((c: string, i: number) => ({ id: `cp_${i}_${Date.now()}`, label: c.replace('custom_', '') }))

      setCampos(camposPredefinidos)
      setCamposCustom(camposPersonalizados)
      setCargando(false)
    }
    cargar()
  }, [id])

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
    setMomentos(prev => [...prev, { id, label: '', tipo: 'custom' }])
  }

  function eliminarMomento(mid: string) {
    setMomentos(prev => prev.filter(m => m.id !== mid))
  }

  function renombrarMomento(mid: string, label: string) {
    setMomentos(prev => prev.map(m => m.id === mid ? { ...m, label } : m))
  }

  function toggleCampo(key: string) {
    setCampos(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key])
  }

  function agregarCampoCustom() {
    setCamposCustom(prev => [...prev, { id: `custom_${Date.now()}`, label: '' }])
  }

  function eliminarCampoCustom(cid: string) {
    setCamposCustom(prev => prev.filter(c => c.id !== cid))
  }

  function renombrarCampoCustom(cid: string, label: string) {
    setCamposCustom(prev => prev.map(c => c.id === cid ? { ...c, label } : c))
  }

  async function guardar() {
    if (!titulo.trim()) { setError('El título es obligatorio'); return }
    if (momentos.length === 0) { setError('Agrega al menos un momento'); return }
    const momentosSinNombre = momentos.filter(m => !m.label.trim())
    if (momentosSinNombre.length > 0) { setError('Todos los momentos deben tener nombre'); return }
    const camposCustomSinNombre = camposCustom.filter(c => !c.label.trim())
    if (camposCustomSinNombre.length > 0) { setError('Todos los campos personalizados deben tener nombre'); return }
    if (campos.length === 0 && camposCustom.length === 0) { setError('Selecciona al menos un campo'); return }

    setGuardando(true)
    setError('')

    const momentosArray = momentos.map(m => m.label.trim())
    const todosLosCampos = [
      ...campos,
      ...camposCustom.filter(c => c.label.trim()).map(c => `custom_${c.label.trim()}`)
    ]

    const { error: err } = await supabase
      .from('attendance_events')
      .update({
        title: titulo.trim(),
        description: descripcion.trim(),
        moments: momentosArray,
        settings: { campos_requeridos: todosLosCampos },
      })
      .eq('id', id)

    if (err) { setError('Error al guardar: ' + err.message); setGuardando(false); return }

    router.push(`/dashboard/asistencias/${id}`)
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
          <Link href="/dashboard/asistencias" className="text-gray-400 hover:text-gray-600 text-sm">Asistencias</Link>
          <span className="text-gray-300">/</span>
          <Link href={`/dashboard/asistencias/${id}`} className="text-gray-400 hover:text-gray-600 text-sm truncate max-w-xs">{titulo}</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-medium text-gray-900">Editar</h1>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-medium text-gray-900">Información del evento</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
            <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción <span className="text-gray-400 font-normal">(opcional)</span></label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-2 resize-none" />
          </div>
        </div>

        {/* Momentos */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-medium text-gray-900">Momentos de registro</h2>
            <button onClick={agregarMomento} className="flex items-center gap-1.5 text-xs hover:opacity-80" className="font-medium transition-colors" style={{ color: 'var(--color-secundario)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
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
                    <SortableMomento key={momento.id} momento={momento} onDelete={eliminarMomento} onRename={renombrarMomento} />
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
            <button onClick={agregarCampoCustom} className="flex items-center gap-1.5 text-xs hover:opacity-80" className="font-medium transition-colors" style={{ color: 'var(--color-secundario)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Campo personalizado
            </button>
          </div>
          <p className="text-sm text-gray-400 mb-4">Selecciona qué información se solicitará al registrar asistencia</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {CAMPOS_DISPONIBLES.map(campo => (
              <label key={campo.key} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:border-gray-200 transition-colors">
                <input type="checkbox" checked={campos.includes(campo.key)} onChange={() => toggleCampo(campo.key)} className="accent-[var(--color-secundario)] w-4 h-4 shrink-0" />
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
                  <input type="text" value={campo.label} onChange={e => renombrarCampoCustom(campo.id, e.target.value)} placeholder="Nombre del campo..." className="flex-1 text-sm text-gray-900 bg-transparent focus:outline-none placeholder-gray-300" />
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

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between pb-8">
          <Link href={`/dashboard/asistencias/${id}`} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</Link>
          <button onClick={guardar} disabled={guardando} className="text-white hover:opacity-90 disabled:opacity-50 text-white px-8 py-3 rounded-xl text-sm font-medium transition-colors" style={{ background: 'var(--color-secundario)' }}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </main>
    </div>
  )
}
