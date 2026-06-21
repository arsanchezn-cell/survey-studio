'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PreguntaGenerada {
  label: string
  type: string
  required: boolean
  opciones?: { label: string; score: number }[]
}

interface EncuestaGenerada {
  title: string
  description: string
  preguntas: PreguntaGenerada[]
}

export default function NuevaIAPage() {
  const supabase = createClient()
  const router = useRouter()

  const [prompt, setPrompt] = useState('')
  const [generando, setGenerando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [encuestaGenerada, setEncuestaGenerada] = useState<EncuestaGenerada | null>(null)
  const [error, setError] = useState('')
  const [esDiagnostico, setEsDiagnostico] = useState(false)

  async function generarEncuesta() {
    if (!prompt.trim()) {
      setError('Describe la encuesta que quieres crear')
      return
    }

    setGenerando(true)
    setError('')
    setEncuestaGenerada(null)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_KEY || '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: `Genera una encuesta completa basada en esta descripcion: "${prompt}"

Responde UNICAMENTE con un objeto JSON valido, sin markdown, sin explicaciones, sin backticks. Solo el JSON.

El JSON debe tener exactamente esta estructura:
{
  "title": "titulo de la encuesta",
  "description": "descripcion breve",
  "preguntas": [
    {
      "label": "texto de la pregunta",
      "type": "single_choice",
      "required": true,
      "opciones": [
        { "label": "opcion 1", "score": 1 },
        { "label": "opcion 2", "score": 2 }
      ]
    }
  ]
}

Tipos permitidos: single_choice, multiple_choice, likert, nps, text, long_text, star_rating, scale, date.
Para single_choice, multiple_choice y likert incluye opciones con scores del 1 al 5.
Para nps, text, long_text, star_rating, scale, date NO incluyas opciones.
Genera entre 5 y 8 preguntas variadas y relevantes al tema.
Los scores deben reflejar el nivel de satisfaccion o acuerdo (1=minimo, 5=maximo).`,
            },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error('Error al conectar con la IA')
      }

      const data = await response.json()
      const texto = data.content[0].text.trim()

      let parsed: EncuestaGenerada
      try {
        parsed = JSON.parse(texto)
      } catch {
        const match = texto.match(/\{[\s\S]*\}/)
        if (match) {
          parsed = JSON.parse(match[0])
        } else {
          throw new Error('La IA no devolvio un JSON valido')
        }
      }

      setEncuestaGenerada(parsed)
    } catch (err: any) {
      setError('Error al generar: ' + err.message)
    } finally {
      setGenerando(false)
    }
  }

  async function guardarEncuesta() {
    if (!encuestaGenerada) return

    setGuardando(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data: survey, error: errSurvey } = await supabase
      .from('surveys')
      .insert({
        title: encuestaGenerada.title,
        description: encuestaGenerada.description,
        is_diagnostic: esDiagnostico,
        status: 'draft',
        tenant_id: user.id,
        created_by: user.id,
      })
      .select()
      .single()

    if (errSurvey) {
      setError('Error al guardar: ' + errSurvey.message)
      setGuardando(false)
      return
    }

    for (let i = 0; i < encuestaGenerada.preguntas.length; i++) {
      const p = encuestaGenerada.preguntas[i]
      const tieneOpciones = ['single_choice', 'multiple_choice', 'likert'].includes(p.type)

      const { data: pregunta, error: errPreg } = await supabase
        .from('questions')
        .insert({
          survey_id: survey.id,
          type: p.type,
          label: p.label,
          position: i,
          required: p.required,
          config: tieneOpciones && p.opciones ? { options: p.opciones } : {},
        })
        .select()
        .single()

      if (errPreg) continue

      if (tieneOpciones && p.opciones && pregunta) {
        await supabase.from('question_options').insert(
          p.opciones.map((op, j) => ({
            question_id: pregunta.id,
            label: op.label,
            position: j,
            score_value: op.score,
          }))
        )
      }
    }

    router.push(`/dashboard/encuestas/${survey.id}`)
  }

  const ejemplos = [
    'Encuesta de satisfaccion de empleados sobre el clima laboral',
    'Evaluacion de la calidad de un curso de programacion',
    'Diagnostico de conocimientos previos en matematicas',
    'Encuesta de satisfaccion del cliente sobre servicio al cliente',
    'Evaluacion de bienestar mental en estudiantes universitarios',
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">Dashboard</Link>
        <span className="text-gray-300">/</span>
        <Link href="/dashboard/encuestas" className="text-gray-400 hover:text-gray-600 text-sm">Encuestas</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-sm font-medium text-gray-900">Generar con IA</h1>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">✨</span>
            <h2 className="text-2xl font-semibold text-gray-900">Generar encuesta con IA</h2>
          </div>
          <p className="text-gray-500 text-sm">Describe la encuesta que necesitas y la IA la creara automaticamente con preguntas relevantes.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Describe tu encuesta
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Quiero una encuesta de satisfaccion para evaluar la experiencia de mis estudiantes al finalizar un curso de Excel..."
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none mb-4"
          />

          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">Ejemplos:</p>
            <div className="flex flex-wrap gap-2">
              {ejemplos.map((ej, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(ej)}
                  className="text-xs bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 text-gray-600 hover:text-purple-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  {ej}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100 mb-4">
            <input
              type="checkbox"
              id="diagnostico"
              checked={esDiagnostico}
              onChange={(e) => setEsDiagnostico(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-purple-600"
            />
            <label htmlFor="diagnostico" className="cursor-pointer">
              <span className="block text-sm font-medium text-purple-900">Encuesta de diagnostico con IA</span>
              <span className="block text-xs text-purple-600 mt-0.5">Al completarla, la IA recomendara el grupo de curso mas adecuado</span>
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl mb-4">{error}</p>
          )}

          <button
            onClick={generarEncuesta}
            disabled={generando}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {generando ? (
              <>
                <span className="animate-spin">⟳</span>
                Generando encuesta...
              </>
            ) : (
              <>
                <span>✨</span>
                Generar encuesta
              </>
            )}
          </button>
        </div>

        {encuestaGenerada && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-purple-200 p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Generado por IA</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mt-3">{encuestaGenerada.title}</h3>
              <p className="text-gray-500 text-sm mt-1">{encuestaGenerada.description}</p>
            </div>

            <div className="space-y-3">
              {encuestaGenerada.preguntas.map((p, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-xs text-gray-400 mt-1 shrink-0 w-5">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{p.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{p.type.replace('_', ' ')}</span>
                        {p.required && <span className="text-xs text-red-400">obligatoria</span>}
                      </div>
                      {p.opciones && p.opciones.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.opciones.map((op, j) => (
                            <span key={j} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-1 rounded-lg">
                              {op.label} <span className="text-gray-400">({op.score})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setEncuestaGenerada(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Regenerar
              </button>
              <button
                onClick={guardarEncuesta}
                disabled={guardando}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl text-sm font-medium transition-colors"
              >
                {guardando ? 'Guardando...' : 'Guardar y editar encuesta'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
