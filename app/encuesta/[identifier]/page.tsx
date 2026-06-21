'use client'

import { useState, useEffect, use, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'

interface Pregunta {
  id: string
  type: string
  label: string
  required: boolean
  position: number
  config: any
}

interface ReglaLogica {
  id: string
  source_question_id: string
  operator: string
  value: string
  action: string
  target_question_id: string
}

const TIPOS_BLOQUE = ['welcome', 'section', 'statement', 'policy', 'farewell']

function evaluarRegla(regla: ReglaLogica, respuesta: any): boolean {
  if (respuesta === undefined || respuesta === null || respuesta === '') return false
  const val = String(respuesta)
  switch (regla.operator) {
    case 'equals': return val === regla.value
    case 'not_equals': return val !== regla.value
    case 'contains': return val.toLowerCase().includes(regla.value.toLowerCase())
    case 'greater_than': return parseFloat(val) > parseFloat(regla.value)
    case 'less_than': return parseFloat(val) < parseFloat(regla.value)
    default: return false
  }
}

function BloqueContenido({ bloque, respuestas, setRespuesta, highlight }: {
  bloque: Pregunta
  respuestas: Record<string, any>
  setRespuesta: (id: string, value: any) => void
  highlight?: boolean
}) {
  const config = bloque.config || {}

  if (bloque.type === 'welcome') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="text-4xl mb-4">👋</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">{config.titulo || bloque.label}</h2>
        {config.contenido && <p className="text-gray-500 text-sm leading-relaxed max-w-lg mx-auto">{config.contenido}</p>}
      </div>
    )
  }

  if (bloque.type === 'farewell') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">{config.titulo || bloque.label}</h2>
        {config.contenido && <p className="text-gray-500 text-sm leading-relaxed max-w-lg mx-auto">{config.contenido}</p>}
      </div>
    )
  }

  if (bloque.type === 'section') {
    return (
      <div className="flex items-center gap-4 py-2">
        <div className="flex-1 h-px bg-gray-200"></div>
        <div className="text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{config.titulo || bloque.label}</p>
          {config.contenido && <p className="text-xs text-gray-400 mt-1">{config.contenido}</p>}
        </div>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>
    )
  }

  if (bloque.type === 'statement') {
    return (
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
        <p className="text-sm font-medium text-blue-900 mb-1">{config.titulo || bloque.label}</p>
        {config.contenido && <p className="text-sm text-blue-700 leading-relaxed">{config.contenido}</p>}
      </div>
    )
  }

  if (bloque.type === 'policy') {
    return (
      <div className={`bg-white rounded-2xl border-2 p-6 transition-colors ${highlight ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
        <p className="text-sm font-medium text-gray-900 mb-2">{config.titulo || bloque.label}</p>
        {config.contenido && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 max-h-40 overflow-y-auto">
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{config.contenido}</p>
          </div>
        )}
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={respuestas[bloque.id] === true} onChange={e => setRespuesta(bloque.id, e.target.checked)} className="mt-0.5 accent-green-600 w-4 h-4 shrink-0" />
          <span className="text-sm text-gray-700">
            {config.texto_checkbox || 'Acepto los términos y condiciones'}
            <span className="text-red-400 ml-1">*</span>
          </span>
        </label>
        {highlight && <p className="text-xs text-red-500 mt-2">Debes aceptar para continuar</p>}
      </div>
    )
  }

  return null
}

export default function EncuestaPublicaPage({
  params,
}: {
  params: Promise<{ identifier: string }>
}) {
  const { identifier } = use(params)
  const supabase = createClient()

  const [encuesta, setEncuesta] = useState<any>(null)
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [reglas, setReglas] = useState<ReglaLogica[]>([])
  const [respuestas, setRespuestas] = useState<Record<string, any>>({})
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [completado, setCompletado] = useState(false)
  const [error, setError] = useState('')
  const [distribucion, setDistribucion] = useState<any>(null)
  const [camposPendientes, setCamposPendientes] = useState<Set<string>>(new Set())
  const refsElementos = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    async function cargar() {
      const { data: dist } = await supabase
        .from('survey_distributions')
        .select('*, surveys(*)')
        .eq('identifier', identifier)
        .eq('is_active', true)
        .single()

      if (!dist) {
        setError('Esta encuesta no existe o no esta disponible')
        setCargando(false)
        return
      }

      setDistribucion(dist)
      setEncuesta(dist.surveys)

      const { data: preg } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_id', dist.surveys.id)
        .order('position', { ascending: true })

      const preguntasCargadas = preg || []
      setPreguntas(preguntasCargadas)

      if (preguntasCargadas.length > 0) {
        const ids = preguntasCargadas.map((p: Pregunta) => p.id)
        const { data: reglasData } = await supabase
          .from('skip_logic_rules')
          .select('*')
          .in('source_question_id', ids)
        setReglas(reglasData || [])
      }

      setCargando(false)
    }
    cargar()
  }, [identifier])

  const elementosVisibles = useMemo(() => {
    const ocultas = new Set<string>()
    preguntas.forEach(pregunta => {
      if (TIPOS_BLOQUE.includes(pregunta.type)) return
      const reglasDeEsta = reglas.filter(r => r.source_question_id === pregunta.id)
      reglasDeEsta.forEach(regla => {
        const respuesta = respuestas[pregunta.id]
        if (evaluarRegla(regla, respuesta)) {
          const destino = preguntas.find(p => p.id === regla.target_question_id)
          if (destino) {
            preguntas.forEach(p => {
              if (p.position > pregunta.position && p.position < destino.position) {
                ocultas.add(p.id)
              }
            })
          }
        }
      })
    })
    return preguntas.filter(p => !ocultas.has(p.id))
  }, [preguntas, reglas, respuestas])

  function setRespuesta(questionId: string, value: any) {
    setRespuestas(prev => ({ ...prev, [questionId]: value }))
    if (camposPendientes.has(questionId)) {
      setCamposPendientes(prev => {
        const nuevo = new Set(prev)
        nuevo.delete(questionId)
        return nuevo
      })
    }
  }

  async function enviar() {
    const obligatorios = elementosVisibles.filter(p => p.required)
    const sinResponder = obligatorios.filter(p => {
      if (p.type === 'policy') return respuestas[p.id] !== true
      if (p.type === 'matrix' || p.type === 'matrix_multiple') {
        const filas = p.config?.filas || []
        return filas.some((_: any, fi: number) => {
          const r = respuestas[`${p.id}_${fi}`]
          return r === undefined || r === null || (Array.isArray(r) && r.length === 0)
        })
      }
      const r = respuestas[p.id]
      return r === undefined || r === '' || r === null
    })

    if (sinResponder.length > 0) {
      const pendientesIds = new Set(sinResponder.map(p => p.id))
      setCamposPendientes(pendientesIds)
      setError(`Por favor completa todos los campos obligatorios (${sinResponder.length} pendientes)`)
      const primero = sinResponder[0]
      const ref = refsElementos.current[primero.id]
      if (ref) ref.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setCamposPendientes(new Set())
    setEnviando(true)
    setError('')

    const { data: response, error: errResp } = await supabase
      .from('survey_responses')
      .insert({
        survey_id: encuesta.id,
        distribution_id: distribucion.id,
        status: 'completed',
        completion_pct: 100,
      })
      .select()
      .single()

    if (errResp) {
      setError('Error al enviar: ' + errResp.message)
      setEnviando(false)
      return
    }

    const answersToInsert = elementosVisibles
      .filter(p => !TIPOS_BLOQUE.includes(p.type))
      .flatMap(p => {
        if (p.type === 'matrix' || p.type === 'matrix_multiple') {
          const filas = p.config?.filas || []
          const filaAnswers: Record<string, any> = {}
          filas.forEach((_: any, fi: number) => {
            const val = respuestas[`${p.id}_${fi}`]
            if (val !== undefined) filaAnswers[`fila_${fi}`] = val
          })
          if (Object.keys(filaAnswers).length === 0) return []
          return [{ response_id: response.id, question_id: p.id, value: { answer: filaAnswers } }]
        }
        if (respuestas[p.id] === undefined) return []
        return [{ response_id: response.id, question_id: p.id, value: { answer: respuestas[p.id] } }]
      })

    await supabase.from('response_answers').insert(answersToInsert)

    await supabase
      .from('survey_distributions')
      .update({ response_count: (distribucion.response_count || 0) + 1 })
      .eq('id', distribucion.id)

    setCompletado(true)
    setEnviando(false)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando encuesta...</p>
      </div>
    )
  }

  if (error && !encuesta) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    )
  }

  if (completado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✓</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Gracias por tu respuesta</h2>
          <p className="text-gray-500 text-sm">Tus respuestas han sido registradas correctamente.</p>
          <p className="text-xs text-gray-400 mt-4">Puedes cerrar esta pestaña con seguridad</p>
        </div>
      </div>
    )
  }

  let preguntaIndex = 0

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">{encuesta.title}</h1>
          {encuesta.description && <p className="text-gray-500 text-sm mt-2">{encuesta.description}</p>}
        </div>

        <div className="space-y-4">
          {elementosVisibles.map((elemento) => {
            if (TIPOS_BLOQUE.includes(elemento.type)) {
              return (
                <div key={elemento.id} ref={el => { refsElementos.current[elemento.id] = el }}>
                  <BloqueContenido bloque={elemento} respuestas={respuestas} setRespuesta={setRespuesta} highlight={camposPendientes.has(elemento.id)} />
                </div>
              )
            }

            preguntaIndex++
            const index = preguntaIndex
            const pendiente = camposPendientes.has(elemento.id)

            return (
              <div key={elemento.id} ref={el => { refsElementos.current[elemento.id] = el }} className={`bg-white rounded-2xl border-2 p-6 transition-colors ${pendiente ? 'border-red-300' : 'border-gray-200'}`}>
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-xs text-gray-400 mt-1 shrink-0">{index}</span>
                  <p className="text-sm font-medium text-gray-900">
                    {elemento.label}
                    {elemento.required && <span className="text-red-400 ml-1">*</span>}
                  </p>
                </div>

                {pendiente && <p className="text-xs text-red-500 mb-3 ml-6">Este campo es obligatorio</p>}

                <div className="ml-6">
                  {elemento.type === 'single_choice' && (
                    <div className="space-y-2">
                      {elemento.config?.options?.map((op: any, i: number) => (
                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                          <input type="radio" name={elemento.id} value={op.label} checked={respuestas[elemento.id] === op.label} onChange={() => setRespuesta(elemento.id, op.label)} className="accent-green-600" />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900">{op.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {elemento.type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {elemento.config?.options?.map((op: any, i: number) => {
                        const sel: string[] = Array.isArray(respuestas[elemento.id]) ? respuestas[elemento.id] : []
                        return (
                          <label key={i} className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" checked={sel.includes(op.label)} onChange={(e) => { if (e.target.checked) setRespuesta(elemento.id, [...sel, op.label]); else setRespuesta(elemento.id, sel.filter((s: string) => s !== op.label)) }} className="accent-green-600" />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">{op.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {elemento.type === 'likert' && (
                    <div className="space-y-2">
                      {elemento.config?.options?.map((op: any, i: number) => (
                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                          <input type="radio" name={elemento.id} value={op.label} checked={respuestas[elemento.id] === op.label} onChange={() => setRespuesta(elemento.id, op.label)} className="accent-green-600" />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900">{op.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {elemento.type === 'nps' && (
                    <div className="flex gap-2 flex-wrap">
                      {Array.from({ length: 11 }, (_, i) => (
                        <button key={i} onClick={() => setRespuesta(elemento.id, i)} className={`w-10 h-10 rounded-xl text-sm font-medium border transition-colors ${respuestas[elemento.id] === i ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-400'}`}>{i}</button>
                      ))}
                    </div>
                  )}

                  {elemento.type === 'star_rating' && (
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <button key={i} onClick={() => setRespuesta(elemento.id, i + 1)} className={`text-2xl transition-colors ${respuestas[elemento.id] >= i + 1 ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}>★</button>
                      ))}
                    </div>
                  )}

                  {elemento.type === 'text' && (
                    <input type="text" value={respuestas[elemento.id] || ''} onChange={(e) => setRespuesta(elemento.id, e.target.value)} placeholder="Tu respuesta..." className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${pendiente ? 'border-red-300' : 'border-gray-200'}`} />
                  )}

                  {elemento.type === 'long_text' && (
                    <textarea value={respuestas[elemento.id] || ''} onChange={(e) => setRespuesta(elemento.id, e.target.value)} placeholder="Tu respuesta..." rows={4} className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none ${pendiente ? 'border-red-300' : 'border-gray-200'}`} />
                  )}

                  {elemento.type === 'date' && (
                    <input type="date" value={respuestas[elemento.id] || ''} onChange={(e) => setRespuesta(elemento.id, e.target.value)} className={`border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${pendiente ? 'border-red-300' : 'border-gray-200'}`} />
                  )}

                  {elemento.type === 'dropdown' && (
                    <select value={respuestas[elemento.id] || ''} onChange={(e) => setRespuesta(elemento.id, e.target.value)} className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white ${pendiente ? 'border-red-300' : 'border-gray-200'}`}>
                      <option value="">Selecciona una opcion...</option>
                      {elemento.config?.options?.map((op: any, i: number) => (
                        <option key={i} value={op.label}>{op.label}</option>
                      ))}
                    </select>
                  )}

                  {elemento.type === 'thumbs' && (
                    <div className="flex items-center gap-4">
                      <button onClick={() => setRespuesta(elemento.id, 'up')} className={`text-4xl transition-transform hover:scale-110 ${respuestas[elemento.id] === 'up' ? 'opacity-100' : 'opacity-40'}`}>👍</button>
                      <button onClick={() => setRespuesta(elemento.id, 'down')} className={`text-4xl transition-transform hover:scale-110 ${respuestas[elemento.id] === 'down' ? 'opacity-100' : 'opacity-40'}`}>👎</button>
                    </div>
                  )}

                  {(elemento.type === 'matrix' || elemento.type === 'matrix_multiple') && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left py-2 pr-4 text-gray-500 font-normal w-1/3"></th>
                            {elemento.config?.columnas?.map((col: string, i: number) => (
                              <th key={i} className="text-center py-2 px-2 text-xs text-gray-500 font-medium">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {elemento.config?.filas?.map((fila: string, fi: number) => (
                            <tr key={fi} className="border-t border-gray-100">
                              <td className="py-3 pr-4 text-gray-700 text-sm">{fila}</td>
                              {elemento.config?.columnas?.map((col: string, ci: number) => (
                                <td key={ci} className="text-center py-3 px-2">
                                  {elemento.config?.multiple ? (
                                    <input type="checkbox" checked={Array.isArray(respuestas[`${elemento.id}_${fi}`]) && respuestas[`${elemento.id}_${fi}`].includes(col)} onChange={(e) => { const key = `${elemento.id}_${fi}`; const cur = Array.isArray(respuestas[key]) ? respuestas[key] : []; if (e.target.checked) setRespuesta(key, [...cur, col]); else setRespuesta(key, cur.filter((v: string) => v !== col)) }} className="accent-green-600" />
                                  ) : (
                                    <input type="radio" name={`${elemento.id}_${fi}`} value={col} checked={respuestas[`${elemento.id}_${fi}`] === col} onChange={() => setRespuesta(`${elemento.id}_${fi}`, col)} className="accent-green-600" />
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {elemento.type === 'scale' && (
                    <div className="space-y-2">
                      <input type="range" min={1} max={10} value={respuestas[elemento.id] || 5} onChange={(e) => setRespuesta(elemento.id, parseInt(e.target.value))} className="w-full accent-green-600" />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>1</span>
                        <span className="font-medium text-green-600">{respuestas[elemento.id] || 5}</span>
                        <span>10</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={enviar} disabled={enviando} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl text-sm font-medium transition-colors">
            {enviando ? 'Enviando...' : 'Enviar respuestas'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Powered by Survey Studio</p>
      </div>
    </div>
  )
}
