'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'

const TIPOS_BLOQUE = [
  { type: 'welcome', label: 'Bienvenida', desc: 'Pantalla inicial con título y mensaje', icon: '👋' },
  { type: 'section', label: 'Separador de sección', desc: 'Divide la encuesta en partes', icon: '📌' },
  { type: 'statement', label: 'Texto informativo', desc: 'Mensaje o instrucción para el participante', icon: '📝' },
  { type: 'policy', label: 'Política / Consentimiento', desc: 'El participante debe aceptar para continuar', icon: '✅' },
  { type: 'farewell', label: 'Despedida', desc: 'Mensaje final al completar la encuesta', icon: '🎉' },
]

const COLORES = ['#000000', '#374151', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed', '#db2777']

interface Props {
  surveyId: string
  position: number
  onClose: () => void
  onSaved: () => void
  bloqueExistente?: any
}

function ToolbarButton({ onClick, active, children, title }: { onClick: () => void, active?: boolean, children: React.ReactNode, title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1 rounded text-sm font-medium transition-colors ${active ? 'text-white' : 'text-gray-600 hover:bg-gray-100'}`}
      style={active ? { background: 'var(--color-secundario)' } : {}}
    >
      {children}
    </button>
  )
}

export default function AddBloqueModal({ surveyId, position, onClose, onSaved, bloqueExistente }: Props) {
  const supabase = createClient()
  const esEdicion = !!bloqueExistente

  const [paso, setPaso] = useState<'tipo' | 'config'>(esEdicion ? 'config' : 'tipo')
  const [tipoSeleccionado, setTipoSeleccionado] = useState(bloqueExistente?.type || '')
  const [titulo, setTitulo] = useState('')
  const [textoCheckbox, setTextoCheckbox] = useState('Acepto los términos y condiciones')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [colorSeleccionado, setColorSeleccionado] = useState('#000000')
  const [icono, setIcono] = useState('')

  const ICONOS_SUGERIDOS = ['', '📋', '📊', '📌', '✅', '🔔', '💡', '📎', '🏢', '👤', '📧', '🔒', '⭐', '🎯', '📈']

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'min-h-[120px] focus:outline-none text-sm text-gray-700 prose prose-sm max-w-none',
      },
    },
  })

  useEffect(() => {
    if (!esEdicion || !editor) return
    const config = bloqueExistente.config || {}
    setTitulo(config.titulo || bloqueExistente.label || '')
    setTextoCheckbox(config.texto_checkbox || 'Acepto los términos y condiciones')
    setIcono(config.icono || '')
    if (config.contenido_html) {
      editor.commands.setContent(config.contenido_html)
    } else if (config.contenido) {
      editor.commands.setContent(`<p>${config.contenido}</p>`)
    }
  }, [editor])

  const tipoInfo = TIPOS_BLOQUE.find(t => t.type === tipoSeleccionado)

  function seleccionarTipo(tipo: string) {
    setTipoSeleccionado(tipo)
    setPaso('config')
  }

  async function guardar() {
    if (!titulo.trim()) { setError('El título es obligatorio'); return }
    setCargando(true)
    setError('')

    const contenidoHtml = editor?.getHTML() || ''
    const contenidoTexto = editor?.getText() || ''

    const config: Record<string, any> = {
      titulo: titulo.trim(),
      contenido: contenidoTexto,
      contenido_html: contenidoHtml,
      icono: icono.trim(),
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {paso === 'tipo' && (
          <div className="p-6 space-y-2">
            {TIPOS_BLOQUE.map((tipo) => (
              <button
                key={tipo.type}
                onClick={() => seleccionarTipo(tipo.type)}
                className="w-full text-left p-4 border border-gray-200 rounded-xl transition-colors group flex items-center gap-4 hover:border-gray-300 hover:shadow-sm"
              >
                <span className="text-2xl">{tipo.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-700">{tipo.label}</div>
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
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tipoSeleccionado === 'policy' ? 'Texto de la política' : 'Contenido'}
                <span className="text-gray-400 font-normal ml-1">(opcional)</span>
              </label>

              {/* Toolbar */}
              <div className="border border-gray-200 rounded-t-xl px-2 py-1.5 flex items-center gap-0.5 flex-wrap bg-gray-50">
                <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Negrita">
                  <strong>B</strong>
                </ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Cursiva">
                  <em>I</em>
                </ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Subrayado">
                  <span className="underline">U</span>
                </ToolbarButton>

                <div className="w-px h-5 bg-gray-200 mx-1" />

                <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Título">
                  H2
                </ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })} title="Subtítulo">
                  H3
                </ToolbarButton>

                <div className="w-px h-5 bg-gray-200 mx-1" />

                <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Lista">
                  ≡
                </ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Lista numerada">
                  1.
                </ToolbarButton>

                <div className="w-px h-5 bg-gray-200 mx-1" />

                <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign('left').run()} active={editor?.isActive({ textAlign: 'left' })} title="Alinear izquierda">
                  ←
                </ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign('center').run()} active={editor?.isActive({ textAlign: 'center' })} title="Centrar">
                  ↔
                </ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign('right').run()} active={editor?.isActive({ textAlign: 'right' })} title="Alinear derecha">
                  →
                </ToolbarButton>

                <div className="w-px h-5 bg-gray-200 mx-1" />

                {/* Color picker */}
                <div className="flex items-center gap-1">
                  {COLORES.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setColorSeleccionado(color)
                        editor?.chain().focus().setColor(color).run()
                      }}
                      className="w-4 h-4 rounded-full border border-gray-200 hover:scale-125 transition-transform"
                      style={{ background: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Editor */}
              <div className="border border-t-0 border-gray-200 rounded-b-xl px-4 py-3">
                <EditorContent editor={editor} />
              </div>
            </div>

            {tipoSeleccionado === 'policy' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Texto del checkbox de aceptación</label>
                <input
                  type="text"
                  value={textoCheckbox}
                  onChange={e => setTextoCheckbox(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                />
                <p className="text-xs text-gray-400 mt-1">El participante debe marcar este checkbox para continuar.</p>
              </div>
            )}

            {/* Ícono personalizado */}
            {(tipoSeleccionado === 'welcome' || tipoSeleccionado === 'farewell') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ícono <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {ICONOS_SUGERIDOS.map((ic, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIcono(ic)}
                      className={`w-9 h-9 rounded-lg border text-lg flex items-center justify-center transition-colors ${icono === ic ? 'border-transparent' : 'border-gray-200 hover:border-gray-300'}`}
                      style={icono === ic ? { borderColor: 'var(--color-secundario)', background: 'var(--color-secundario)15' } : {}}
                    >
                      {ic || <span className="text-xs text-gray-400">∅</span>}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={icono}
                    onChange={e => setIcono(e.target.value)}
                    placeholder="Pega emoji..."
                    className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

            <div className="flex items-center justify-between pt-2">
              <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button
                onClick={guardar}
                disabled={cargando}
                className="text-white hover:opacity-90 disabled:opacity-50 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: 'var(--color-secundario)' }}
              >
                {cargando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Guardar bloque'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
