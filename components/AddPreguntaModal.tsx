'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const TIPO_ICONS: Record<string, string> = {
  single_choice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/></svg>`,
  multiple_choice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="4" height="4" rx="1"/><rect x="3" y="11" width="4" height="4" rx="1"/><rect x="3" y="17" width="4" height="4" rx="1"/><line x1="10" y1="7" x2="21" y2="7"/><line x1="10" y1="13" x2="21" y2="13"/><line x1="10" y1="19" x2="21" y2="19"/></svg>`,
  dropdown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="15,14 18,17 21,14"/></svg>`,
  likert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><circle cx="6" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="2" fill="currentColor" stroke="none"/><line x1="3" y1="8" x2="3" y2="16"/><line x1="21" y1="8" x2="21" y2="16"/></svg>`,
  matrix: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
  matrix_multiple: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><rect x="10" y="10" width="4" height="4" rx="0.5" fill="currentColor" stroke="none"/></svg>`,
  thumbs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`,
  nps: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="8" width="3" height="8" rx="0.5"/><rect x="7" y="6" width="3" height="10" rx="0.5"/><rect x="12" y="4" width="3" height="12" rx="0.5"/><rect x="17" y="2" width="3" height="14" rx="0.5"/></svg>`,
  star_rating: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>`,
  text: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="14" y2="17"/></svg>`,
  long_text: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="13" y2="16"/></svg>`,
  scale: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><circle cx="9" cy="12" r="3" fill="currentColor" stroke="none"/><line x1="3" y1="8" x2="3" y2="16"/><line x1="21" y1="8" x2="21" y2="16"/></svg>`,
  date: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>`,
}

const TIPOS = [
  { type: 'single_choice', label: 'Seleccion unica', desc: 'Elige una opcion' },
  { type: 'multiple_choice', label: 'Seleccion multiple', desc: 'Elige varias opciones' },
  { type: 'dropdown', label: 'Menu desplegable', desc: 'Lista desplegable' },
  { type: 'likert', label: 'Escala Likert', desc: 'De acuerdo / En desacuerdo' },
  { type: 'matrix', label: 'Matriz radio', desc: 'Filas x columnas, una opcion' },
  { type: 'matrix_multiple', label: 'Matriz multiple', desc: 'Filas x columnas, varias opciones' },
  { type: 'thumbs', label: 'Pulgares', desc: 'Pulgar arriba o abajo' },
  { type: 'nps', label: 'NPS', desc: 'Puntuacion del 0 al 10' },
  { type: 'star_rating', label: 'Estrellas', desc: 'Calificacion con estrellas' },
  { type: 'text', label: 'Texto libre', desc: 'Respuesta corta' },
  { type: 'long_text', label: 'Texto largo', desc: 'Respuesta larga' },
  { type: 'scale', label: 'Escala numerica', desc: 'Rango de numeros' },
  { type: 'date', label: 'Fecha', desc: 'Selector de fecha' },
]

interface Opcion {
  label: string
  score: number
}

const OPCIONES_DEFAULT: Record<string, Opcion[]> = {
  single_choice: [{ label: 'Opcion 1', score: 1 }, { label: 'Opcion 2', score: 2 }, { label: 'Opcion 3', score: 3 }],
  multiple_choice: [{ label: 'Opcion 1', score: 1 }, { label: 'Opcion 2', score: 2 }, { label: 'Opcion 3', score: 3 }],
  dropdown: [{ label: 'Opcion 1', score: 1 }, { label: 'Opcion 2', score: 2 }, { label: 'Opcion 3', score: 3 }],
  likert: [{ label: 'Muy de acuerdo', score: 5 }, { label: 'De acuerdo', score: 4 }, { label: 'Neutral', score: 3 }, { label: 'En desacuerdo', score: 2 }, { label: 'Muy en desacuerdo', score: 1 }],
}

const COLUMNAS_MATRIZ_DEFAULT = ['Muy de acuerdo', 'De acuerdo', 'Neutral', 'En desacuerdo', 'Muy en desacuerdo']
const FILAS_MATRIZ_DEFAULT = ['Pregunta 1', 'Pregunta 2', 'Pregunta 3']

interface Props {
  surveyId: string
  position: number
  onClose: () => void
  onSaved: () => void
  preguntaExistente?: any
}

export default function AddPreguntaModal({ surveyId, position, onClose, onSaved, preguntaExistente }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const esEdicion = !!preguntaExistente

  const [paso, setPaso] = useState<'tipo' | 'config'>(esEdicion ? 'config' : 'tipo')
  const [tipoSeleccionado, setTipoSeleccionado] = useState(preguntaExistente?.type || '')
  const [label, setLabel] = useState(preguntaExistente?.label || '')
  const [requerida, setRequerida] = useState(preguntaExistente?.required ?? true)
  const [opciones, setOpciones] = useState<Opcion[]>([])
  const [filasMatriz, setFilasMatriz] = useState<string[]>(FILAS_MATRIZ_DEFAULT)
  const [columnasMatriz, setColumnasMatriz] = useState<string[]>(COLUMNAS_MATRIZ_DEFAULT)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!esEdicion) return
    const tipo = preguntaExistente.type
    const config = preguntaExistente.config || {}
    const tieneOpciones = ['single_choice', 'multiple_choice', 'dropdown', 'likert'].includes(tipo)
    const esMatriz = tipo === 'matrix' || tipo === 'matrix_multiple'

    if (tieneOpciones && config.options) {
      setOpciones(config.options)
    } else if (tieneOpciones) {
      setOpciones(OPCIONES_DEFAULT[tipo] || [])
    }

    if (esMatriz) {
      setFilasMatriz(config.filas || FILAS_MATRIZ_DEFAULT)
      setColumnasMatriz(config.columnas || COLUMNAS_MATRIZ_DEFAULT)
    }
  }, [])

  function seleccionarTipo(tipo: string) {
    setTipoSeleccionado(tipo)
    setOpciones(OPCIONES_DEFAULT[tipo] || [])
    if (tipo === 'matrix' || tipo === 'matrix_multiple') {
      setFilasMatriz(FILAS_MATRIZ_DEFAULT)
      setColumnasMatriz(COLUMNAS_MATRIZ_DEFAULT)
    }
    setPaso('config')
  }

  function agregarOpcion() {
    setOpciones([...opciones, { label: `Opcion ${opciones.length + 1}`, score: opciones.length + 1 }])
  }

  function editarLabel(index: number, valor: string) {
    const nuevas = [...opciones]
    nuevas[index] = { ...nuevas[index], label: valor }
    setOpciones(nuevas)
  }

  function editarScore(index: number, valor: number) {
    const nuevas = [...opciones]
    nuevas[index] = { ...nuevas[index], score: valor }
    setOpciones(nuevas)
  }

  function eliminarOpcion(index: number) {
    setOpciones(opciones.filter((_, i) => i !== index))
  }

  async function guardar() {
    if (!label.trim()) { setError('El texto de la pregunta es obligatorio'); return }
    setCargando(true)
    setError('')

    const tieneOpciones = ['single_choice', 'multiple_choice', 'dropdown', 'likert'].includes(tipoSeleccionado)
    const esMatriz = tipoSeleccionado === 'matrix' || tipoSeleccionado === 'matrix_multiple'

    let config: Record<string, any> = {}
    if (tieneOpciones) config = { options: opciones }
    if (esMatriz) config = { filas: filasMatriz, columnas: columnasMatriz, multiple: tipoSeleccionado === 'matrix_multiple' }

    if (esEdicion) {
      // UPDATE
      const { error: errUpdate } = await supabase
        .from('questions')
        .update({ label: label.trim(), required: requerida, config })
        .eq('id', preguntaExistente.id)

      if (errUpdate) { setError('Error al guardar: ' + errUpdate.message); setCargando(false); return }

      if (tieneOpciones) {
        await supabase.from('question_options').delete().eq('question_id', preguntaExistente.id)
        if (opciones.length > 0) {
          await supabase.from('question_options').insert(
            opciones.map((op, i) => ({ question_id: preguntaExistente.id, label: op.label, position: i, score_value: op.score }))
          )
        }
      }
    } else {
      // INSERT
      const { data: pregunta, error: errPregunta } = await supabase
        .from('questions')
        .insert({ survey_id: surveyId, type: tipoSeleccionado, label: label.trim(), position, required: requerida, config })
        .select().single()

      if (errPregunta) { setError('Error al guardar pregunta: ' + errPregunta.message); setCargando(false); return }

      if (tieneOpciones && opciones.length > 0 && pregunta) {
        await supabase.from('question_options').insert(
          opciones.map((op, i) => ({ question_id: pregunta.id, label: op.label, position: i, score_value: op.score }))
        )
      }
    }

    onSaved()
    onClose()
    router.refresh()
  }

  const tipoInfo = TIPOS.find(t => t.type === tipoSeleccionado)
  const tieneOpciones = ['single_choice', 'multiple_choice', 'dropdown', 'likert'].includes(tipoSeleccionado)
  const esMatriz = tipoSeleccionado === 'matrix' || tipoSeleccionado === 'matrix_multiple'
  const esPulgares = tipoSeleccionado === 'thumbs'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            {paso === 'config' && !esEdicion && (
              <button onClick={() => setPaso('tipo')} className="text-gray-400 hover:text-gray-600 text-sm">Volver</button>
            )}
            <h3 className="font-medium text-gray-900">
              {esEdicion ? `Editar pregunta — ${tipoInfo?.label}` : paso === 'tipo' ? 'Elegir tipo de pregunta' : `Nueva pregunta — ${tipoInfo?.label}`}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">x</button>
        </div>

        {paso === 'tipo' && (
          <div className="p-6 grid grid-cols-3 gap-2">
            {TIPOS.map((tipo) => (
              <button key={tipo.type} onClick={() => seleccionarTipo(tipo.type)} className="text-left p-3 border border-gray-200 hover:border-green-400 hover:bg-green-50 rounded-xl transition-colors group">
                <div className="w-6 h-6 mb-2 text-gray-400 group-hover:text-green-600" dangerouslySetInnerHTML={{ __html: TIPO_ICONS[tipo.type] || '' }} />
                <div className="text-xs font-medium text-gray-700 group-hover:text-green-700">{tipo.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{tipo.desc}</div>
              </button>
            ))}
          </div>
        )}

        {paso === 'config' && (
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Texto de la pregunta</label>
              <textarea value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Escribe tu pregunta aqui..." rows={2} autoFocus className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-2 resize-none" />
            </div>

            {tieneOpciones && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Opciones de respuesta</label>
                  <span className="text-xs text-gray-400">Score IA</span>
                </div>
                <div className="space-y-2">
                  {opciones.map((op, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-gray-300 text-xs w-4 shrink-0">{i + 1}</span>
                      <input type="text" value={op.label} onChange={(e) => editarLabel(i, e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-2" />
                      <input type="number" value={op.score} onChange={(e) => editarScore(i, parseInt(e.target.value) || 0)} className="w-14 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-2" min={0} max={100} />
                      <button onClick={() => eliminarOpcion(i)} className="text-gray-300 hover:text-red-400 text-lg leading-none">x</button>
                    </div>
                  ))}
                  <button onClick={agregarOpcion} className="text-sm hover:opacity-80 font-medium" style={{ color: 'var(--color-secundario)' }}>+ Agregar opcion</button>
                </div>
                <p className="text-xs text-gray-400 mt-2">El score se usa para el diagnostico con IA.</p>
              </div>
            )}

            {esMatriz && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filas (aspectos a evaluar)</label>
                  <div className="space-y-2">
                    {filasMatriz.map((fila, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-gray-300 text-xs w-4 shrink-0">{i + 1}</span>
                        <input type="text" value={fila} onChange={(e) => { const n = [...filasMatriz]; n[i] = e.target.value; setFilasMatriz(n) }} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-2" />
                        <button onClick={() => setFilasMatriz(filasMatriz.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 text-lg leading-none">x</button>
                      </div>
                    ))}
                    <button onClick={() => setFilasMatriz([...filasMatriz, `Aspecto ${filasMatriz.length + 1}`])} className="text-sm hover:opacity-80 font-medium" style={{ color: 'var(--color-secundario)' }}>+ Agregar fila</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Columnas (escala de respuesta)</label>
                  <div className="space-y-2">
                    {columnasMatriz.map((col, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-gray-300 text-xs w-4 shrink-0">{i + 1}</span>
                        <input type="text" value={col} onChange={(e) => { const n = [...columnasMatriz]; n[i] = e.target.value; setColumnasMatriz(n) }} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-2" />
                        <button onClick={() => setColumnasMatriz(columnasMatriz.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 text-lg leading-none">x</button>
                      </div>
                    ))}
                    <button onClick={() => setColumnasMatriz([...columnasMatriz, `Opcion ${columnasMatriz.length + 1}`])} className="text-sm hover:opacity-80 font-medium" style={{ color: 'var(--color-secundario)' }}>+ Agregar columna</button>
                  </div>
                </div>
              </div>
            )}

            {esPulgares && (
              <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👍</span>
                  <span className="text-sm text-gray-600">Pulgar arriba (score: 5)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👎</span>
                  <span className="text-sm text-gray-600">Pulgar abajo (score: 1)</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input type="checkbox" id="requerida" checked={requerida} onChange={(e) => setRequerida(e.target.checked)} className="w-4 h-4 accent-[var(--color-secundario)]" />
              <label htmlFor="requerida" className="text-sm text-gray-600 cursor-pointer">Pregunta obligatoria</label>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

            <div className="flex items-center justify-between pt-2">
              <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={guardar} disabled={cargando} className="text-white hover:opacity-90 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ background: 'var(--color-secundario)' }}>
                {cargando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Guardar pregunta'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
