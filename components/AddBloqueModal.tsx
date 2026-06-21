'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const TIPOS_BLOQUE = [
  { type: 'welcome', label: 'Bienvenida', desc: 'Pantalla inicial con título y mensaje', icon: '👋' },
  { type: 'section', label: 'Separador de sección', desc: 'Divide la encuesta en partes', icon: '📌' },
  { type: 'statement', label: 'Texto informativo', desc: 'Mensaje o instrucción para el participante', icon: '📝' },
  { type: 'policy', label: 'Política / Consentimiento', desc: 'El participante debe aceptar para continuar', icon: '✅' },
  { type: 'farewell', label: 'Despedida', desc: 'Mensaje final al completar la encuesta', icon: '🎉' },
]

interface Props {
  surveyId: string
  position: number
  onClose: () => void
  onSaved: () => void
  bloqueExistente?: any
}

export default function AddBloqueModal({ surveyId, position, onClose, onSaved, bloqueExistente }: Props) {
  const supabase = createClient()
  const esEdicion = !!bloqueExistente

  const [paso, setPaso] = useState<'tipo' | 'config'>(esEdicion ? 'config' : 'tipo')
  const [tipoSeleccionado, setTipoSeleccionado] = useState(bloqueExistente?.type || '')
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [textoCheckbox, setTextoCheckbox] = useState('Acepto los términos y condiciones')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!esEdicion) return
    const config = bloqueExistente.config || {}
    setTitulo(config.titulo || bloqueExistente.label || '')
    setContenido(config.contenido || '')
    setTextoCheckbox(config.texto_checkbox || 'Acepto los términos y condiciones')
  }, [])

  const tipoInfo = TIPOS_BLOQUE.find(t => t.type === tipoSeleccionado)

  function seleccionarTipo(tipo: string) {
    setTipoSeleccionado(tipo)
    setPaso('config')
  }

  async function guardar() {
    if (!titulo.trim()) { setError('El título es obligatorio'); return }
    setCargando(true)
    setError('')

    const config: Record<string, any> = {
      titulo: titulo.trim(),
      contenido: contenido.trim(),
    }
    if (tipoSeleccionado === 'policy') {
      config.texto_checkbox = textoCheckbox.trim() || 'Acepto los términos y condiciones'
    }

    if (esEdicion) {
      const { error: errUpdate } = await supabase
        .from('questions')
        .update({ label: titulo.trim(), config })
        .eq('id', bloqueExistente.id)

      if (errUpdate) { setError('Error al guardar: ' + errUpdate.message); setCargando(false); return }
    } else {
      const { error: errInsert } = await supabase
        .from('questions')
        .insert({
          survey_id: surveyId,
          type: tipoSeleccionado,
          label: titulo.trim(),
          position,
          required: tipoSeleccionado === 'policy',
          config,
        })

      if (errInsert) { setError('Error al guardar: ' + errInsert.message); setCargando(false); return }
    }

    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            {paso === 'config' && !esEdicion && (
              <button onClick={() => setPaso('tipo')} className="text-gray-400 hover:text-gray-600 text-sm">Volver</button>
            )}
            <h3 className="font-medium text-gray-900">
              {esEdicion ? `Editar bloque — ${tipoInfo?.icon} ${tipoInfo?.label}` : paso === 'tipo' ? 'Agregar bloque de contenido' : `${tipoInfo?.icon} ${tipoInfo?.label}`}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">x</button>
        </div>

        {paso === 'tipo' && (
          <div className="p-6 space-y-2">
            {TIPOS_BLOQUE.map((tipo) => (
              <button key={tipo.type} onClick={() => seleccionarTipo(tipo.type)} className="w-full text-left p-4 border border-gray-200 hover:border-green-400 hover:bg-green-50 rounded-xl transition-colors group flex items-center gap-4">
                <span className="text-2xl">{tipo.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-700 group-hover:text-green-700">{tipo.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{tipo.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {paso === 'config' && (
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título {tipoSeleccionado === 'section' ? 'de la sección' : ''}
              </label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder={
                  tipoSeleccionado === 'welcome' ? 'Ej: Bienvenido a nuestra encuesta' :
                  tipoSeleccionado === 'section' ? 'Ej: Sección 2 — Experiencia del usuario' :
                  tipoSeleccionado === 'statement' ? 'Ej: Instrucciones importantes' :
                  tipoSeleccionado === 'policy' ? 'Ej: Política de privacidad y uso de datos' :
                  'Ej: ¡Gracias por tu tiempo!'
                }
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tipoSeleccionado === 'policy' ? 'Texto de la política' : 'Contenido'}
                <span className="text-gray-400 font-normal ml-1">(opcional)</span>
              </label>
              <textarea
                value={contenido}
                onChange={e => setContenido(e.target.value)}
                placeholder={
                  tipoSeleccionado === 'welcome' ? 'Esta encuesta nos ayudará a mejorar nuestros servicios...' :
                  tipoSeleccionado === 'section' ? 'Descripción opcional de esta sección...' :
                  tipoSeleccionado === 'statement' ? 'Escribe aquí el mensaje o instrucción...' :
                  tipoSeleccionado === 'policy' ? 'Sus datos serán tratados de forma confidencial...' :
                  'Tus respuestas han sido registradas. Nos pondremos en contacto contigo pronto.'
                }
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-2 resize-none"
              />
            </div>

            {tipoSeleccionado === 'policy' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Texto del checkbox de aceptación</label>
                <input
                  type="text"
                  value={textoCheckbox}
                  onChange={e => setTextoCheckbox(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-2"
                />
                <p className="text-xs text-gray-400 mt-1">El participante debe marcar este checkbox para continuar.</p>
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

            <div className="flex items-center justify-between pt-2">
              <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={guardar} disabled={cargando} className="text-white hover:opacity-90 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ background: 'var(--color-secundario)' }}>
                {cargando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Guardar bloque'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
