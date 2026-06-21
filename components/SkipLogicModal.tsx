'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface Pregunta {
  id: string
  label: string
  type: string
  position: number
  config: any
}

interface ReglaSalto {
  id: string
  source_question_id: string
  operator: string
  value: string
  action: string
  target_question_id: string
}

interface Props {
  pregunta: Pregunta
  todasPreguntas: Pregunta[]
  onClose: () => void
}

const OPERADORES: Record<string, { label: string; tipos: string[] }> = {
  equals: { label: 'es igual a', tipos: ['single_choice', 'dropdown', 'likert', 'thumbs', 'nps', 'star_rating', 'scale', 'text'] },
  not_equals: { label: 'es diferente a', tipos: ['single_choice', 'dropdown', 'likert', 'thumbs', 'nps', 'star_rating', 'scale', 'text'] },
  contains: { label: 'contiene', tipos: ['text', 'long_text'] },
  greater_than: { label: 'es mayor a', tipos: ['nps', 'star_rating', 'scale'] },
  less_than: { label: 'es menor a', tipos: ['nps', 'star_rating', 'scale'] },
}

function getOperadoresPorTipo(tipo: string) {
  return Object.entries(OPERADORES)
    .filter(([, v]) => v.tipos.includes(tipo))
    .map(([k, v]) => ({ value: k, label: v.label }))
}

function getValoresPorTipo(pregunta: Pregunta) {
  if (['single_choice', 'dropdown', 'likert'].includes(pregunta.type)) {
    return pregunta.config?.options?.map((o: any) => o.label) || []
  }
  if (pregunta.type === 'thumbs') return ['up', 'down']
  if (pregunta.type === 'nps') return Array.from({ length: 11 }, (_, i) => String(i))
  if (pregunta.type === 'star_rating') return ['1', '2', '3', '4', '5']
  if (pregunta.type === 'scale') return Array.from({ length: 10 }, (_, i) => String(i + 1))
  return []
}

export default function SkipLogicModal({ pregunta, todasPreguntas, onClose }: Props) {
  const supabase = createClient()
  const [reglas, setReglas] = useState<ReglaSalto[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [nuevaRegla, setNuevaRegla] = useState({
    operator: '',
    value: '',
    action: 'skip_to',
    target_question_id: '',
  })

  const preguntasDestino = todasPreguntas.filter(p => p.position > pregunta.position)
  const operadores = getOperadoresPorTipo(pregunta.type)
  const valoresSugeridos = getValoresPorTipo(pregunta)

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('skip_logic_rules')
        .select('*')
        .eq('source_question_id', pregunta.id)
      setReglas(data || [])
      setCargando(false)
    }
    cargar()
  }, [pregunta.id])

  async function guardarRegla() {
    if (!nuevaRegla.operator || !nuevaRegla.value || !nuevaRegla.target_question_id) return
    setGuardando(true)
    const { data, error } = await supabase
      .from('skip_logic_rules')
      .insert({
        source_question_id: pregunta.id,
        operator: nuevaRegla.operator,
        value: nuevaRegla.value,
        action: nuevaRegla.action,
        target_question_id: nuevaRegla.target_question_id,
      })
      .select()
      .single()
    if (!error && data) {
      setReglas([...reglas, data])
      setNuevaRegla({ operator: '', value: '', action: 'skip_to', target_question_id: '' })
    }
    setGuardando(false)
  }

  async function eliminarRegla(id: string) {
    await supabase.from('skip_logic_rules').delete().eq('id', id)
    setReglas(reglas.filter(r => r.id !== id))
  }

  function nombrePregunta(id: string) {
    const p = todasPreguntas.find(p => p.id === id)
    return p ? `P${p.position + 1}: ${p.label.substring(0, 40)}${p.label.length > 40 ? '...' : ''}` : id
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h3 className="font-medium text-gray-900">Lógica de salto</h3>
            <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{pregunta.label}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">x</button>
        </div>

        <div className="p-6 space-y-5">
          {preguntasDestino.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Esta es la última pregunta — no hay preguntas destino disponibles.</p>
          ) : operadores.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Este tipo de pregunta no soporta lógica de salto todavía.</p>
          ) : (
            <>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nueva regla</p>

                <div className="space-y-2">
                  <label className="text-xs text-gray-500">Si la respuesta</label>
                  <select
                    value={nuevaRegla.operator}
                    onChange={e => setNuevaRegla({ ...nuevaRegla, operator: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Selecciona condición...</option>
                    {operadores.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-500">El valor</label>
                  {valoresSugeridos.length > 0 ? (
                    <select
                      value={nuevaRegla.value}
                      onChange={e => setNuevaRegla({ ...nuevaRegla, value: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Selecciona valor...</option>
                      {valoresSugeridos.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={nuevaRegla.value}
                      onChange={e => setNuevaRegla({ ...nuevaRegla, value: e.target.value })}
                      placeholder="Escribe el valor..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-500">Entonces saltar a</label>
                  <select
                    value={nuevaRegla.target_question_id}
                    onChange={e => setNuevaRegla({ ...nuevaRegla, target_question_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Selecciona pregunta destino...</option>
                    {preguntasDestino.map(p => (
                      <option key={p.id} value={p.id}>
                        P{p.position + 1}: {p.label.substring(0, 50)}{p.label.length > 50 ? '...' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={guardarRegla}
                  disabled={guardando || !nuevaRegla.operator || !nuevaRegla.value || !nuevaRegla.target_question_id}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {guardando ? 'Guardando...' : '+ Agregar regla'}
                </button>
              </div>

              {cargando ? (
                <p className="text-xs text-gray-400 text-center">Cargando reglas...</p>
              ) : reglas.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Reglas activas</p>
                  <div className="space-y-2">
                    {reglas.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-500">Si respuesta </span>
                          <span className="font-medium text-gray-900">{OPERADORES[r.operator]?.label || r.operator}</span>
                          <span className="text-gray-500"> "{r.value}" → saltar a </span>
                          <span className="font-medium text-gray-900">{nombrePregunta(r.target_question_id)}</span>
                        </div>
                        <button
                          onClick={() => eliminarRegla(r.id)}
                          className="text-gray-300 hover:text-red-400 text-lg leading-none ml-3 shrink-0"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center">No hay reglas configuradas aún.</p>
              )}
            </>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
