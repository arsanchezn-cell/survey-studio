'use client'

import { useState, useEffect, use, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const TIPOS_BLOQUE = ['welcome', 'section', 'statement', 'policy', 'farewell']

function BloqueContenido({ bloque, respuestas, setRespuesta, highlight }: {
  bloque: any
  respuestas: Record<string, any>
  setRespuesta: (id: string, value: any) => void
  highlight?: boolean
}) {
  const config = bloque.config || {}

  if (bloque.type === 'welcome') return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
      {config.icono ? (
        <div className="text-4xl mb-4">{config.icono}</div>
      ) : (
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-secundario)15' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-secundario)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
      )}
      <h2 className="text-xl font-semibold text-gray-900 mb-3">{config.titulo || bloque.label}</h2>
      {(config.contenido_html || config.contenido) && (
        config.contenido_html
          ? <div className="text-gray-500 text-sm leading-relaxed max-w-lg mx-auto prose prose-sm" dangerouslySetInnerHTML={{ __html: config.contenido_html }} />
          : <p className="text-gray-500 text-sm leading-relaxed max-w-lg mx-auto">{config.contenido}</p>
      )}
    </div>
  )

  if (bloque.type === 'farewell') return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
      {config.icono ? (
        <div className="text-4xl mb-4">{config.icono}</div>
      ) : (
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#f0fdf4' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
      )}
      <h2 className="text-xl font-semibold text-gray-900 mb-3">{config.titulo || bloque.label}</h2>
      {(config.contenido_html || config.contenido) && (
        config.contenido_html
          ? <div className="text-gray-500 text-sm leading-relaxed max-w-lg mx-auto prose prose-sm" dangerouslySetInnerHTML={{ __html: config.contenido_html }} />
          : <p className="text-gray-500 text-sm leading-relaxed max-w-lg mx-auto">{config.contenido}</p>
      )}
    </div>
  )

  if (bloque.type === 'section') return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1 h-px bg-gray-200"></div>
      <div className="text-center">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{config.titulo || bloque.label}</p>
        {config.contenido && <p className="text-xs text-gray-400 mt-1">{config.contenido}</p>}
      </div>
      <div className="flex-1 h-px bg-gray-200"></div>
    </div>
  )

  if (bloque.type === 'statement') return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
      <p className="text-sm font-medium text-blue-900 mb-1">{config.titulo || bloque.label}</p>
      {(config.contenido_html || config.contenido) && (
        config.contenido_html
          ? <div className="text-sm text-blue-700 leading-relaxed prose prose-sm" dangerouslySetInnerHTML={{ __html: config.contenido_html }} />
          : <p className="text-sm text-blue-700 leading-relaxed">{config.contenido}</p>
      )}
    </div>
  )

  if (bloque.type === 'policy') return (
    <div className={`bg-white rounded-2xl border-2 p-6 transition-colors ${highlight ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
      <p className="text-sm font-medium text-gray-900 mb-2">{config.titulo || bloque.label}</p>
      {(config.contenido_html || config.contenido) && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 max-h-40 overflow-y-auto">
          {config.contenido_html
            ? <div className="text-xs text-gray-600 leading-relaxed prose prose-sm" dangerouslySetInnerHTML={{ __html: config.contenido_html }} />
            : <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{config.contenido}</p>
          }
        </div>
      )}
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={respuestas[bloque.id] === true} onChange={e => setRespuesta(bloque.id, e.target.checked)} className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--color-secundario)]" />
        <span className="text-sm text-gray-700">
          {config.texto_checkbox || 'Acepto los terminos y condiciones'}
          <span className="text-red-400 ml-1">*</span>
        </span>
      </label>
      {highlight && <p className="text-xs text-red-500 mt-2">Debes aceptar para continuar</p>}
    </div>
  )

  return null
}

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()

  const [encuesta, setEncuesta] = useState<any>(null)
  const [preguntas, setPreguntas] = useState<any[]>([])
  const [respuestas, setRespuestas] = useState<Record<string, any>>({})
  const [cargando, setCargando] = useState(true)
  const [enviado, setEnviado] = useState(false)
  const [paginaActual, setPaginaActual] = useState(0)
  const [camposPendientes, setCamposPendientes] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const refsElementos = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    async function cargar() {
      const { data: enc } = await supabase.from('surveys').select('*').eq('id', id).single()
      setEncuesta(enc)
      const { data: pregs } = await supabase.from('questions').select('*').eq('survey_id', id).order('position', { ascending: true })
      setPreguntas(pregs || [])
      setCargando(false)
    }
    cargar()
  }, [id])

  // Paginacion: dividir por bloques tipo 'section'
  const paginas = useMemo(() => {
    const tieneSecciones = preguntas.some(el => el.type === 'section')
    if (!tieneSecciones) return [preguntas]

    const pags: typeof preguntas[] = []
    let grupo: typeof preguntas = []

    preguntas.forEach(el => {
      if (el.type === 'section' && grupo.length > 0) {
        pags.push(grupo)
        grupo = [el]
      } else {
        grupo.push(el)
      }
    })
    if (grupo.length > 0) pags.push(grupo)
    return pags
  }, [preguntas])

  const totalPaginas = paginas.length
  const elementosPagina = paginas[paginaActual] || []
  const esUltimaPagina = paginaActual === totalPaginas - 1

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

  function avanzarPagina() {
    const obligatoriosPagina = elementosPagina.filter(p => p.required)
    const sinResponder = obligatoriosPagina.filter(p => {
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
      setCamposPendientes(new Set(sinResponder.map((p: any) => p.id)))
      setError(`Por favor completa todos los campos obligatorios (${sinResponder.length} pendientes)`)
      const ref = refsElementos.current[sinResponder[0].id]
      if (ref) ref.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setCamposPendientes(new Set())
    setError('')
    setPaginaActual(prev => prev + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function retrocederPagina() {
    setError('')
    setCamposPendientes(new Set())
    setPaginaActual(prev => prev - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const Banner = () => (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-amber-600 text-xs font-medium">MODO VISTA PREVIA</span>
        <span className="text-amber-500 text-xs">Las respuestas no se guardan</span>
      </div>
      <Link href={`/dashboard/encuestas/${id}`} className="text-xs text-amber-700 hover:text-amber-900 font-medium">Volver al editor</Link>
    </div>
  )

  if (cargando) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Cargando vista previa...</p>
    </div>
  )

  if (enviado) return (
    <div className="min-h-screen bg-gray-50">
      <Banner />
      <div className="flex items-center justify-center min-h-[80vh] p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Pagina de agradecimiento</h2>
          <p className="text-gray-500 text-sm mb-6">Asi veran los participantes el final de la encuesta.</p>
          <button onClick={() => { setEnviado(false); setRespuestas({}); setPaginaActual(0) }} className="text-sm font-medium hover:opacity-80" style={{ color: 'var(--color-secundario)' }}>
            Reiniciar vista previa
          </button>
        </div>
      </div>
    </div>
  )

  let preguntaIndex = 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Banner />
      <div className="py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">{encuesta?.title}</h1>
            {encuesta?.description && <p className="text-gray-500 text-sm mt-2">{encuesta.description}</p>}
          </div>

          {/* Barra de progreso (solo si hay multiples paginas) */}
          {totalPaginas > 1 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Pagina {paginaActual + 1} de {totalPaginas}</span>
                <span className="text-xs text-gray-400">{Math.round(((paginaActual + 1) / totalPaginas) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${((paginaActual + 1) / totalPaginas) * 100}%`, background: 'var(--color-secundario)' }}
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            {elementosPagina.map((pregunta: any) => {
              if (TIPOS_BLOQUE.includes(pregunta.type)) {
                return (
                  <div key={pregunta.id} ref={el => { refsElementos.current[pregunta.id] = el }}>
                    <BloqueContenido bloque={pregunta} respuestas={respuestas} setRespuesta={setRespuesta} highlight={camposPendientes.has(pregunta.id)} />
                  </div>
                )
              }

              preguntaIndex++
              const pendiente = camposPendientes.has(pregunta.id)

              return (
                <div key={pregunta.id} ref={el => { refsElementos.current[pregunta.id] = el }} className={`bg-white rounded-2xl border-2 p-6 transition-colors ${pendiente ? 'border-red-300' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-xs text-gray-400 mt-1 shrink-0">{preguntaIndex}</span>
                    <p className="text-sm font-medium text-gray-900">
                      {pregunta.label}
                      {pregunta.required && <span className="text-red-400 ml-1">*</span>}
                    </p>
                  </div>
                  {pendiente && <p className="text-xs text-red-500 mb-3 ml-6">Este campo es obligatorio</p>}
                  <div className="ml-6">
                    {(pregunta.type === 'single_choice' || pregunta.type === 'likert') && (
                      <div className="space-y-2">
                        {pregunta.config?.options?.map((op: any, i: number) => (
                          <label key={i} className="flex items-center gap-3 cursor-pointer group">
                            <input type="radio" name={pregunta.id} value={op.label} checked={respuestas[pregunta.id] === op.label} onChange={() => setRespuesta(pregunta.id, op.label)} className="accent-[var(--color-secundario)]" />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">{op.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {pregunta.type === 'multiple_choice' && (
                      <div className="space-y-2">
                        {pregunta.config?.options?.map((op: any, i: number) => {
                          const sel: string[] = Array.isArray(respuestas[pregunta.id]) ? respuestas[pregunta.id] : []
                          return (
                            <label key={i} className="flex items-center gap-3 cursor-pointer group">
                              <input type="checkbox" checked={sel.includes(op.label)} onChange={(e) => { if (e.target.checked) setRespuesta(pregunta.id, [...sel, op.label]); else setRespuesta(pregunta.id, sel.filter((s: string) => s !== op.label)) }} className="accent-[var(--color-secundario)]" />
                              <span className="text-sm text-gray-700 group-hover:text-gray-900">{op.label}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                    {pregunta.type === 'nps' && (
                      <div className="flex gap-2 flex-wrap">
                        {Array.from({ length: 11 }, (_, i) => (
                          <button key={i} onClick={() => setRespuesta(pregunta.id, i)} className={`w-10 h-10 rounded-xl text-sm font-medium border transition-colors ${respuestas[pregunta.id] === i ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`} style={respuestas[pregunta.id] === i ? { background: 'var(--color-secundario)' } : {}}>{i}</button>
                        ))}
                      </div>
                    )}
                    {pregunta.type === 'star_rating' && (
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <button key={i} onClick={() => setRespuesta(pregunta.id, i + 1)} className={`text-2xl transition-colors ${respuestas[pregunta.id] >= i + 1 ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}>&#9733;</button>
                        ))}
                      </div>
                    )}
                    {pregunta.type === 'text' && <input type="text" value={respuestas[pregunta.id] || ''} onChange={e => setRespuesta(pregunta.id, e.target.value)} placeholder="Tu respuesta..." className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secundario)] ${pendiente ? 'border-red-300' : 'border-gray-200'}`} />}
                    {pregunta.type === 'long_text' && <textarea value={respuestas[pregunta.id] || ''} onChange={e => setRespuesta(pregunta.id, e.target.value)} placeholder="Tu respuesta..." rows={4} className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secundario)] resize-none ${pendiente ? 'border-red-300' : 'border-gray-200'}`} />}
                    {pregunta.type === 'date' && <input type="date" value={respuestas[pregunta.id] || ''} onChange={e => setRespuesta(pregunta.id, e.target.value)} className={`border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secundario)] ${pendiente ? 'border-red-300' : 'border-gray-200'}`} />}
                    {pregunta.type === 'dropdown' && (
                      <select value={respuestas[pregunta.id] || ''} onChange={e => setRespuesta(pregunta.id, e.target.value)} className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secundario)] bg-white ${pendiente ? 'border-red-300' : 'border-gray-200'}`}>
                        <option value="">Selecciona una opcion...</option>
                        {pregunta.config?.options?.map((op: any, i: number) => <option key={i} value={op.label}>{op.label}</option>)}
                      </select>
                    )}
                    {pregunta.type === 'thumbs' && (
                      <div className="flex items-center gap-4">
                        <button onClick={() => setRespuesta(pregunta.id, 'up')} className={`text-4xl transition-transform hover:scale-110 ${respuestas[pregunta.id] === 'up' ? 'opacity-100' : 'opacity-40'}`}>&#128077;</button>
                        <button onClick={() => setRespuesta(pregunta.id, 'down')} className={`text-4xl transition-transform hover:scale-110 ${respuestas[pregunta.id] === 'down' ? 'opacity-100' : 'opacity-40'}`}>&#128078;</button>
                      </div>
                    )}
                    {(pregunta.type === 'matrix' || pregunta.type === 'matrix_multiple') && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left py-2 pr-4 text-gray-500 font-normal w-1/3"></th>
                              {pregunta.config?.columnas?.map((col: string, i: number) => (
                                <th key={i} className="text-center py-2 px-2 text-xs text-gray-500 font-medium">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {pregunta.config?.filas?.map((fila: string, fi: number) => (
                              <tr key={fi} className="border-t border-gray-100">
                                <td className="py-3 pr-4 text-gray-700 text-sm">{fila}</td>
                                {pregunta.config?.columnas?.map((col: string, ci: number) => (
                                  <td key={ci} className="text-center py-3 px-2">
                                    {pregunta.config?.multiple ? (
                                      <input type="checkbox" checked={Array.isArray(respuestas[`${pregunta.id}_${fi}`]) && respuestas[`${pregunta.id}_${fi}`].includes(col)} onChange={(e) => { const key = `${pregunta.id}_${fi}`; const cur = Array.isArray(respuestas[key]) ? respuestas[key] : []; if (e.target.checked) setRespuesta(key, [...cur, col]); else setRespuesta(key, cur.filter((v: string) => v !== col)) }} className="accent-[var(--color-secundario)]" />
                                    ) : (
                                      <input type="radio" name={`${pregunta.id}_${fi}`} value={col} checked={respuestas[`${pregunta.id}_${fi}`] === col} onChange={() => setRespuesta(`${pregunta.id}_${fi}`, col)} className="accent-[var(--color-secundario)]" />
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {pregunta.type === 'scale' && (
                      <div className="space-y-2">
                        <input type="range" min={1} max={10} value={respuestas[pregunta.id] || 5} onChange={e => setRespuesta(pregunta.id, parseInt(e.target.value))} className="w-full accent-[var(--color-secundario)]" />
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>1</span>
                          <span className="font-medium text-green-600">{respuestas[pregunta.id] || 5}</span>
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

          {/* Botones de navegacion */}
          <div className="mt-6 flex items-center justify-between">
            <div>
              {paginaActual > 0 && (
                <button
                  onClick={retrocederPagina}
                  className="text-sm text-gray-600 px-6 py-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:text-gray-800 transition-colors"
                >
                  &larr; Anterior
                </button>
              )}
            </div>
            <div>
              {esUltimaPagina ? (
                <button
                  onClick={() => setEnviado(true)}
                  className="text-white px-8 py-3 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
                  style={{ background: 'var(--color-secundario)' }}
                >
                  Enviar respuestas
                </button>
              ) : (
                <button
                  onClick={avanzarPagina}
                  className="text-white px-8 py-3 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
                  style={{ background: 'var(--color-secundario)' }}
                >
                  Siguiente &rarr;
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">Vista previa - las respuestas no se guardan</p>
        </div>
      </div>
    </div>
  )
}
