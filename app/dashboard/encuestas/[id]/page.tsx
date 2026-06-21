'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import AddPreguntaModal from '@/components/AddPreguntaModal'
import AddBloqueModal from '@/components/AddBloqueModal'
import SkipLogicModal from '@/components/SkipLogicModal'
import { QRCodeCanvas } from 'qrcode.react'
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

const TIPOS_BLOQUE = ['welcome', 'section', 'statement', 'policy', 'farewell']

const BLOQUE_ICONS: Record<string, string> = {
  welcome: '👋',
  section: '📌',
  statement: '📝',
  policy: '✅',
  farewell: '🎉',
}

const BLOQUE_LABELS: Record<string, string> = {
  welcome: 'Bienvenida',
  section: 'Sección',
  statement: 'Texto informativo',
  policy: 'Política',
  farewell: 'Despedida',
}

function ElementoSortable({
  elemento,
  index,
  reglasExistentes,
  onEliminar,
  onLogica,
  onEditar,
  onEditarBloque,
}: {
  elemento: any
  index: number
  reglasExistentes: Record<string, number>
  onEliminar: (id: string) => void
  onLogica: (q: any) => void
  onEditar: (q: any) => void
  onEditarBloque: (b: any) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: elemento.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const esBloque = TIPOS_BLOQUE.includes(elemento.type)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 border rounded-xl transition-colors ${
        esBloque ? 'border-blue-100 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'
      } ${isDragging ? 'shadow-lg z-10' : ''}`}
    >
      <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 px-1" title="Arrastrar para reordenar">⠿</button>
      <span className="text-xs text-gray-400 w-5 shrink-0">{index + 1}</span>
      {esBloque && <span className="text-base shrink-0">{BLOQUE_ICONS[elemento.type]}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate">{elemento.label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{esBloque ? BLOQUE_LABELS[elemento.type] : elemento.type.replace('_', ' ')}</p>
      </div>
      {elemento.required && !esBloque && <span className="text-xs text-red-400 shrink-0">*</span>}
      {esBloque && (
        <button
          onClick={() => onEditarBloque(elemento)}
          className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-600 transition-colors shrink-0"
        >
          Editar
        </button>
      )}
      {!esBloque && (
        <>
          <button
            onClick={() => onEditar(elemento)}
            className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-600 transition-colors shrink-0"
          >
            Editar
          </button>
          <button
            onClick={() => onLogica(elemento)}
            className={`text-xs px-2 py-1 rounded-lg border transition-colors shrink-0 ${
              reglasExistentes[elemento.id]
                ? 'border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100'
                : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
            }`}
          >
            {reglasExistentes[elemento.id] ? `Lógica (${reglasExistentes[elemento.id]})` : '+ Lógica'}
          </button>
        </>
      )}
      <button onClick={() => onEliminar(elemento.id)} className="text-gray-300 hover:text-red-400 text-lg leading-none shrink-0">x</button>
    </div>
  )
}

export default function EncuestaEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()

  const [encuesta, setEncuesta] = useState<any>(null)
  const [preguntas, setPreguntas] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalBloqueAbierto, setModalBloqueAbierto] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [linkDistribucion, setLinkDistribucion] = useState<string | null>(null)
  const [mostrarQR, setMostrarQR] = useState(false)
  const [mostrarLinkModal, setMostrarLinkModal] = useState(false)
  const [preguntaLogica, setPreguntaLogica] = useState<any | null>(null)
  const [preguntaEditar, setPreguntaEditar] = useState<any | null>(null)
  const [bloqueEditar, setBloqueEditar] = useState<any | null>(null)
  const [reglasExistentes, setReglasExistentes] = useState<Record<string, number>>({})

  // Edición de título/descripción inline
  const [editandoInfo, setEditandoInfo] = useState(false)
  const [tituloEdit, setTituloEdit] = useState('')
  const [descripcionEdit, setDescripcionEdit] = useState('')
  const [guardandoInfo, setGuardandoInfo] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function cargarEncuesta() {
    const { data } = await supabase.from('surveys').select('*').eq('id', id).maybeSingle()
    setEncuesta(data)
  }

  async function cargarPreguntas() {
    const { data } = await supabase.from('questions').select('*').eq('survey_id', id).order('position', { ascending: true })
    setPreguntas(data || [])
    return data || []
  }

  async function cargarReglas(preg: any[]) {
    if (preg.length === 0) return
    const ids = preg.map(p => p.id)
    const { data } = await supabase.from('skip_logic_rules').select('source_question_id').in('source_question_id', ids)
    if (data) {
      const conteo: Record<string, number> = {}
      data.forEach(r => { conteo[r.source_question_id] = (conteo[r.source_question_id] || 0) + 1 })
      setReglasExistentes(conteo)
    }
  }

  async function cargarLinkDistribucion() {
    const { data } = await supabase.from('survey_distributions').select('identifier').eq('survey_id', id).eq('channel', 'link').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (data?.identifier) setLinkDistribucion(`${window.location.origin}/encuesta/${data.identifier}`)
  }

  async function cargarTodo() {
    setCargando(true)
    await cargarEncuesta()
    const preg = await cargarPreguntas()
    await cargarReglas(preg)
    await cargarLinkDistribucion()
    setCargando(false)
  }

  async function eliminarElemento(elementoId: string) {
    await supabase.from('questions').delete().eq('id', elementoId)
    const preg = await cargarPreguntas()
    await cargarReglas(preg)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = preguntas.findIndex(p => p.id === active.id)
    const newIndex = preguntas.findIndex(p => p.id === over.id)
    const nuevaOrden = arrayMove(preguntas, oldIndex, newIndex)
    setPreguntas(nuevaOrden)
    await Promise.all(nuevaOrden.map((p, i) => supabase.from('questions').update({ position: i }).eq('id', p.id)))
  }

  async function publicar() {
    if (encuesta?.status === 'active') return
    if (preguntas.filter(p => !TIPOS_BLOQUE.includes(p.type)).length === 0) {
      alert('Agrega al menos una pregunta antes de publicar')
      return
    }
    setPublicando(true)
    const { error: errStatus } = await supabase.from('surveys').update({ status: 'active' }).eq('id', id)
    if (errStatus) { alert('Error al publicar: ' + errStatus.message); setPublicando(false); return }
    const identifier = crypto.randomUUID()
    await supabase.from('survey_distributions').insert({ survey_id: id, channel: 'link', identifier })
    const link = `${window.location.origin}/encuesta/${identifier}`
    setLinkDistribucion(link)
    setMostrarLinkModal(true)
    await cargarEncuesta()
    setPublicando(false)
  }

  async function guardarInfo() {
    if (!tituloEdit.trim()) return
    setGuardandoInfo(true)
    await supabase.from('surveys').update({ title: tituloEdit.trim(), description: descripcionEdit.trim() }).eq('id', id)
    await cargarEncuesta()
    setEditandoInfo(false)
    setGuardandoInfo(false)
  }

  function abrirEdicionInfo() {
    setTituloEdit(encuesta.title || '')
    setDescripcionEdit(encuesta.description || '')
    setEditandoInfo(true)
  }

  useEffect(() => { cargarTodo() }, [id])

  if (cargando) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400 text-sm">Cargando...</p></div>
  }

  if (!encuesta) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400 text-sm">Encuesta no encontrada</p></div>
  }

  const soloPreguntas = preguntas.filter(p => !TIPOS_BLOQUE.includes(p.type))

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">Dashboard</Link>
          <span className="text-gray-300">/</span>
          <Link href="/dashboard/encuestas" className="text-gray-400 hover:text-gray-600 text-sm">Encuestas</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-medium text-gray-900 max-w-xs truncate">{encuesta.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[encuesta.status]}`}>{statusLabel[encuesta.status]}</span>
          {encuesta.is_diagnostic && <span className="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700">Diagnostico IA</span>}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 mr-4">
            {editandoInfo ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={tituloEdit}
                  onChange={e => setTituloEdit(e.target.value)}
                  className="w-full text-2xl font-semibold text-gray-900 border-b-2 border-green-400 focus:outline-none bg-transparent pb-1"
                  autoFocus
                />
                <input
                  type="text"
                  value={descripcionEdit}
                  onChange={e => setDescripcionEdit(e.target.value)}
                  placeholder="Descripción (opcional)"
                  className="w-full text-sm text-gray-500 border-b border-gray-200 focus:outline-none bg-transparent pb-1"
                />
                <div className="flex items-center gap-3 pt-1">
                  <button onClick={guardarInfo} disabled={guardandoInfo} className="text-xs text-white px-3 py-1.5 rounded-lg font-medium transition-colors hover:opacity-90" style={{ background: 'var(--color-secundario)' }}>
                    {guardandoInfo ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={() => setEditandoInfo(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="group cursor-pointer" onClick={abrirEdicionInfo}>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold text-gray-900">{encuesta.title}</h2>
                  <span className="text-gray-300 group-hover:text-gray-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
                </div>
                {encuesta.description && <p className="text-gray-500 text-sm mt-1">{encuesta.description}</p>}
                {!encuesta.description && <p className="text-gray-300 text-sm mt-1 opacity-0 group-hover:opacity-100 transition-opacity">+ Agregar descripción</p>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a href={`/encuesta/preview/${id}`} target="_blank" className="border border-gray-200 hover:border-gray-300 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors">Vista previa</a>
            <button onClick={publicar} disabled={publicando || encuesta?.status === 'active'} className="text-white hover:opacity-90 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors" style={{ background: 'var(--color-secundario)' }}>
              {publicando ? 'Publicando...' : encuesta?.status === 'active' ? 'Publicada' : 'Publicar'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-gray-900">Contenido</h3>
                  {preguntas.length > 0 && <p className="text-xs text-gray-400 mt-0.5">Arrastra para reordenar · Clic en Editar para modificar una pregunta</p>}
                </div>
                {preguntas.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setModalBloqueAbierto(true)} className="text-sm hover:opacity-80 font-medium" style={{ color: 'var(--color-secundario)' }}>+ Bloque</button>
                    <button onClick={() => setModalAbierto(true)} className="text-sm hover:opacity-80 font-medium" style={{ color: 'var(--color-secundario)' }}>+ Pregunta</button>
                  </div>
                )}
              </div>

              {preguntas.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl space-y-3">
                  <p className="text-gray-400 text-sm">No hay contenido aún</p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setModalBloqueAbierto(true)} className="hover:opacity-80 text-sm font-medium" style={{ color: 'var(--color-secundario)' }}>+ Agregar bloque</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => setModalAbierto(true)} className="hover:opacity-80 text-sm font-medium" style={{ color: 'var(--color-secundario)' }}>+ Agregar pregunta</button>
                  </div>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={preguntas.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {preguntas.map((q, i) => (
                        <ElementoSortable
                          key={q.id}
                          elemento={q}
                          index={i}
                          reglasExistentes={reglasExistentes}
                          onEliminar={eliminarElemento}
                          onLogica={setPreguntaLogica}
                          onEditar={setPreguntaEditar}
                          onEditarBloque={setBloqueEditar}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-medium text-gray-900 mb-3 text-sm">Configuracion</h3>
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex justify-between"><span>Preguntas</span><span className="font-medium text-gray-900">{soloPreguntas.length}</span></div>
                <div className="flex justify-between"><span>Bloques</span><span className="font-medium text-gray-900">{preguntas.length - soloPreguntas.length}</span></div>
                <div className="flex justify-between"><span>Estado</span><span className="font-medium text-gray-900">{statusLabel[encuesta.status]}</span></div>
                <div className="flex justify-between"><span>Diagnostico IA</span><span className="font-medium text-gray-900">{encuesta.is_diagnostic ? 'Si' : 'No'}</span></div>
                <div className="flex justify-between"><span>Reglas lógica</span><span className="font-medium text-gray-900">{Object.values(reglasExistentes).reduce((a, b) => a + b, 0)}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-medium text-gray-900 mb-3 text-sm">Distribucion</h3>
              <div className="space-y-2">
                {['Link', 'QR'].map((canal) => (
                  <button key={canal} onClick={() => { if (canal === 'QR') setMostrarQR(true); if (canal === 'Link') setMostrarLinkModal(true) }} className="w-full text-left text-sm text-gray-500 hover:text-green-600 py-1 transition-colors">
                    + Compartir por {canal}
                  </button>
                ))}
                {['Email', 'WhatsApp'].map((canal) => (
                  <button key={canal} disabled className="w-full text-left text-sm text-gray-300 py-1 cursor-not-allowed">+ Compartir por {canal} (próximamente)</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {mostrarLinkModal && linkDistribucion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <h3 className="font-medium text-gray-900 mb-2">Link de la encuesta</h3>
            <p className="text-sm text-gray-500 mb-4">Comparte este link con tus participantes</p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-sm text-gray-700 flex-1 truncate">{linkDistribucion}</p>
              <button onClick={() => { navigator.clipboard.writeText(linkDistribucion); alert('Link copiado') }} className="hover:opacity-80 text-sm font-medium shrink-0" style={{ color: 'var(--color-secundario)' }}>Copiar</button>
            </div>
            <button onClick={() => setMostrarLinkModal(false)} className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700">Cerrar</button>
          </div>
        </div>
      )}

      {mostrarQR && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 flex flex-col items-center">
            <h3 className="font-medium text-gray-900 mb-1">Código QR</h3>
            <p className="text-sm text-gray-500 mb-4 text-center">Escanea para responder la encuesta</p>
            {linkDistribucion ? <QRCodeCanvas value={linkDistribucion} size={200} /> : <p className="text-sm text-red-400 text-center">Primero publica la encuesta para generar el QR</p>}
            <button onClick={() => setMostrarQR(false)} className="mt-6 text-sm text-gray-500 hover:text-gray-700">Cerrar</button>
          </div>
        </div>
      )}

      {preguntaLogica && (
        <SkipLogicModal
          pregunta={preguntaLogica}
          todasPreguntas={preguntas}
          onClose={async () => { setPreguntaLogica(null); const preg = await cargarPreguntas(); await cargarReglas(preg) }}
        />
      )}

      {preguntaEditar && (
        <AddPreguntaModal
          surveyId={id}
          position={preguntaEditar.position}
          preguntaExistente={preguntaEditar}
          onClose={() => setPreguntaEditar(null)}
          onSaved={() => { cargarTodo(); setPreguntaEditar(null) }}
        />
      )}

      {bloqueEditar && (
        <AddBloqueModal
          surveyId={id}
          position={bloqueEditar.position}
          bloqueExistente={bloqueEditar}
          onClose={() => setBloqueEditar(null)}
          onSaved={() => { cargarTodo(); setBloqueEditar(null) }}
        />
      )}

      {modalBloqueAbierto && (
        <AddBloqueModal surveyId={id} position={preguntas.length} onClose={() => setModalBloqueAbierto(false)} onSaved={() => cargarTodo()} />
      )}

      {modalAbierto && (
        <AddPreguntaModal surveyId={id} position={preguntas.length} onClose={() => setModalAbierto(false)} onSaved={() => cargarTodo()} />
      )}
    </div>
  )
}
