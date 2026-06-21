'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Pregunta {
  id: string
  type: string
  label: string
  required: boolean
  position: number
  config: any
  question_options: any[]
}

export default function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const supabase = createClient()

  const [encuesta, setEncuesta] = useState<any>(null)
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [respuestas, setRespuestas] = useState<Record<string, any>>({})
  const [cargando, setCargando] = useState(true)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    async function cargar() {
      const { data: enc } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .single()
      setEncuesta(enc)

      const { data: pregs } = await supabase
        .from('questions')
        .select('*, question_options(*)')
        .eq('survey_id', id)
        .order('position', { ascending: true })
      setPreguntas(pregs || [])
      setCargando(false)
    }
    cargar()
  }, [id])

  function setRespuesta(questionId: string, value: any) {
    setRespuestas(prev => ({ ...prev, [questionId]: value }))
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando vista previa...</p>
      </div>
    )
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 text-xs font-medium">MODO VISTA PREVIA</span>
            <span className="text-amber-500 text-xs">Las respuestas no se guardan</span>
          </div>
          <Link href={`/dashboard/encuestas/${id}`} className="text-xs text-amber-700 hover:text-amber-900 font-medium">
            Volver al editor
          </Link>
        </div>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Pagina de agradecimiento</h2>
            <p className="text-gray-500 text-sm mb-6">Asi veran los participantes el final de la encuesta.</p>
            <button
              onClick={() => { setEnviado(false); setRespuestas({}) }}
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              Reiniciar vista previa
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-600 text-xs font-medium">MODO VISTA PREVIA</span>
          <span className="text-amber-500 text-xs">Las respuestas no se guardan</span>
        </div>
        <Link href={`/dashboard/encuestas/${id}`} className="text-xs text-amber-700 hover:text-amber-900 font-medium">
          Volver al editor
        </Link>
      </div>

      <div className="py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">{encuesta?.title}</h1>
            {encuesta?.description && (
              <p className="text-gray-500 text-sm mt-2">{encuesta.description}</p>
            )}
          </div>

          <div className="space-y-4">
            {preguntas.map((pregunta, index) => (
              <div key={pregunta.id} className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-xs text-gray-400 mt-1 shrink-0">{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {pregunta.label}
                      {pregunta.required && <span className="text-red-400 ml-1">*</span>}
                    </p>
                  </div>
                </div>

                <div className="ml-6">
                  {pregunta.type === 'single_choice' && (
                    <div className="space-y-2">
                      {pregunta.question_options?.map((op: any, i: number) => (
                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="radio"
                            name={pregunta.id}
                            value={op.label}
                            checked={respuestas[pregunta.id] === op.label}
                            onChange={() => setRespuesta(pregunta.id, op.label)}
                            className="accent-green-600"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900">{op.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {pregunta.type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {pregunta.question_options?.map((op: any, i: number) => {
                        const seleccionadas: string[] = Array.isArray(respuestas[pregunta.id]) ? respuestas[pregunta.id] : []
                        return (
                          <label key={i} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={seleccionadas.includes(op.label)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setRespuesta(pregunta.id, [...seleccionadas, op.label])
                                } else {
                                  setRespuesta(pregunta.id, seleccionadas.filter((s: string) => s !== op.label))
                                }
                              }}
                              className="accent-green-600"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">{op.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {pregunta.type === 'likert' && (
                    <div className="space-y-2">
                      {pregunta.question_options?.map((op: any, i: number) => (
                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="radio"
                            name={pregunta.id}
                            value={op.label}
                            checked={respuestas[pregunta.id] === op.label}
                            onChange={() => setRespuesta(pregunta.id, op.label)}
                            className="accent-green-600"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900">{op.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {pregunta.type === 'nps' && (
                    <div className="flex gap-2 flex-wrap">
                      {Array.from({ length: 11 }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setRespuesta(pregunta.id, i)}
                          className={`w-10 h-10 rounded-xl text-sm font-medium border transition-colors ${
                            respuestas[pregunta.id] === i
                              ? 'bg-green-600 text-white border-green-600'
                              : 'border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-600'
                          }`}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                  )}

                  {pregunta.type === 'star_rating' && (
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setRespuesta(pregunta.id, i + 1)}
                          className={`text-2xl transition-colors ${
                            respuestas[pregunta.id] >= i + 1 ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
                          }`}
                        >
                          *
                        </button>
                      ))}
                    </div>
                  )}

                  {pregunta.type === 'text' && (
                    <input
                      type="text"
                      value={respuestas[pregunta.id] || ''}
                      onChange={(e) => setRespuesta(pregunta.id, e.target.value)}
                      placeholder="Tu respuesta..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  )}

                  {pregunta.type === 'long_text' && (
                    <textarea
                      value={respuestas[pregunta.id] || ''}
                      onChange={(e) => setRespuesta(pregunta.id, e.target.value)}
                      placeholder="Tu respuesta..."
                      rows={4}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    />
                  )}

                  {pregunta.type === 'date' && (
                    <input
                      type="date"
                      value={respuestas[pregunta.id] || ''}
                      onChange={(e) => setRespuesta(pregunta.id, e.target.value)}
                      className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  )}


                  {pregunta.type === 'dropdown' && (
                    <select
                      value={respuestas[pregunta.id] || ''}
                      onChange={(e) => setRespuesta(pregunta.id, e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    >
                      <option value="">Selecciona una opcion...</option>
                      {pregunta.question_options?.map((op: any, i: number) => (
                        <option key={i} value={op.label}>{op.label}</option>
                      ))}
                    </select>
                  )}

                  {pregunta.type === 'thumbs' && (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setRespuesta(pregunta.id, 'up')}
                        className={`text-4xl transition-transform hover:scale-110 ${respuestas[pregunta.id] === 'up' ? 'opacity-100' : 'opacity-40'}`}
                      >
                        👍
                      </button>
                      <button
                        onClick={() => setRespuesta(pregunta.id, 'down')}
                        className={`text-4xl transition-transform hover:scale-110 ${respuestas[pregunta.id] === 'down' ? 'opacity-100' : 'opacity-40'}`}
                      >
                        👎
                      </button>
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
                                    <input
                                      type="checkbox"
                                      checked={Array.isArray(respuestas[`${pregunta.id}_${fi}`]) && respuestas[`${pregunta.id}_${fi}`].includes(col)}
                                      onChange={(e) => {
                                        const key = `${pregunta.id}_${fi}`
                                        const current = Array.isArray(respuestas[key]) ? respuestas[key] : []
                                        if (e.target.checked) setRespuesta(key, [...current, col])
                                        else setRespuesta(key, current.filter((v: string) => v !== col))
                                      }}
                                      className="accent-green-600"
                                    />
                                  ) : (
                                    <input
                                      type="radio"
                                      name={`${pregunta.id}_${fi}`}
                                      value={col}
                                      checked={respuestas[`${pregunta.id}_${fi}`] === col}
                                      onChange={() => setRespuesta(`${pregunta.id}_${fi}`, col)}
                                      className="accent-green-600"
                                    />
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
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={respuestas[pregunta.id] || 5}
                        onChange={(e) => setRespuesta(pregunta.id, parseInt(e.target.value))}
                        className="w-full accent-green-600"
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>1</span>
                        <span className="font-medium text-green-600">{respuestas[pregunta.id] || 5}</span>
                        <span>10</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setEnviado(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl text-sm font-medium transition-colors"
            >
              Enviar respuestas
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Vista previa — las respuestas no se guardan
          </p>
        </div>
      </div>
    </div>
  )
}
