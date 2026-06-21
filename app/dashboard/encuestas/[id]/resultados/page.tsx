'use client'

import { useState, useEffect, use, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const TIPOS_BLOQUE = ['welcome', 'section', 'statement', 'policy', 'farewell']
const COLORS_BAR = ['#639922', '#3B6D11', '#97C459', '#C0DD97', '#EAF3DE']
const COLORS_PIE = ['#639922', '#E24B4A']

export default function ResultadosPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const supabase = createClient()
  const dashboardRef = useRef<HTMLDivElement>(null)

  const [encuesta, setEncuesta] = useState<any>(null)
  const [preguntas, setPreguntas] = useState<any[]>([])
  const [respuestas, setRespuestas] = useState<any[]>([])
  const [answers, setAnswers] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [exportando, setExportando] = useState<string | null>(null)
  const [tab, setTab] = useState<'graficos' | 'individuales'>('graficos')
  const [filtroBusqueda, setFiltroBusqueda] = useState('')
  const [mostrarMenuExport, setMostrarMenuExport] = useState(false)

  useEffect(() => {
    async function cargar() {
      const { data: enc } = await supabase.from('surveys').select('*').eq('id', id).single()
      setEncuesta(enc)

      const { data: pregs } = await supabase
        .from('questions')
        .select('*, question_options(*)')
        .eq('survey_id', id)
        .order('position', { ascending: true })
      setPreguntas((pregs || []).filter((p: any) => !TIPOS_BLOQUE.includes(p.type)))

      const { data: resps } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', id)
        .eq('status', 'completed')
        .order('started_at', { ascending: false })
      setRespuestas(resps || [])

      if (resps && resps.length > 0) {
        const responseIds = resps.map((r: any) => r.id)
        const { data: ans } = await supabase.from('response_answers').select('*').in('response_id', responseIds)
        setAnswers(ans || [])
      }

      setCargando(false)
    }
    cargar()
  }, [id])

  function getAnswersForQuestion(questionId: string) {
    return answers.filter(a => a.question_id === questionId)
  }

  function getOptionCounts(questionId: string, opciones: any[]) {
    const questionAnswers = getAnswersForQuestion(questionId)
    return opciones.map(op => ({
      label: op.label,
      count: questionAnswers.filter(a => {
        const val = a.value?.answer
        if (Array.isArray(val)) return val.includes(op.label)
        return val === op.label
      }).length,
      pct: respuestas.length > 0
        ? Math.round(questionAnswers.filter(a => {
            const val = a.value?.answer
            if (Array.isArray(val)) return val.includes(op.label)
            return val === op.label
          }).length / respuestas.length * 100)
        : 0,
    }))
  }

  function getMatrixAnswersDirect(questionId: string, filas: string[], columnas: string[]) {
    const allAnswers = answers.filter(a => a.question_id === questionId)
    return filas.map((fila, fi) => {
      const colCounts = columnas.map(col => {
        const count = allAnswers.filter(a => {
          const val = a.value?.answer
          if (!val || typeof val !== 'object') return false
          const filaVal = val[`fila_${fi}`]
          if (Array.isArray(filaVal)) return filaVal.includes(col)
          return filaVal === col
        }).length
        return { col, count }
      })
      return { fila, colCounts }
    })
  }

  function getTextAnswers(questionId: string) {
    return getAnswersForQuestion(questionId).map(a => a.value?.answer).filter(Boolean)
  }

  function getNumericAverage(questionId: string) {
    const vals = getAnswersForQuestion(questionId).map(a => Number(a.value?.answer)).filter(v => !isNaN(v))
    if (vals.length === 0) return null
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  }

  function getNPSData(questionId: string) {
    const vals = getAnswersForQuestion(questionId).map(a => Number(a.value?.answer)).filter(v => !isNaN(v))
    if (vals.length === 0) return null
    const promotores = vals.filter(v => v >= 9).length
    const neutros = vals.filter(v => v >= 7 && v <= 8).length
    const detractores = vals.filter(v => v <= 6).length
    const total = vals.length
    const score = Math.round((promotores / total - detractores / total) * 100)
    return { promotores, neutros, detractores, total, score }
  }

  function getThumbsData(questionId: string) {
    const ans = getAnswersForQuestion(questionId)
    return [
      { name: '👍 Sí', value: ans.filter(a => a.value?.answer === 'up').length },
      { name: '👎 No', value: ans.filter(a => a.value?.answer === 'down').length },
    ]
  }

  function buildResumenData() {
    return preguntas.map((p, i) => {
      const tieneOpciones = ['single_choice', 'multiple_choice', 'dropdown', 'likert'].includes(p.type)
      const esMatriz = p.type === 'matrix' || p.type === 'matrix_multiple'
      const opciones = p.question_options || []
      const totalAnswers = getAnswersForQuestion(p.id).length

      let detalle = ''
      if (tieneOpciones && opciones.length > 0) {
        const counts = getOptionCounts(p.id, opciones)
        detalle = counts.map(c => `${c.label}: ${c.count} (${c.pct}%)`).join(' | ')
      } else if (esMatriz) {
        const filas = p.config?.filas || []
        const columnas = p.config?.columnas || []
        const matData = getMatrixAnswersDirect(p.id, filas, columnas)
        detalle = matData.map(r => `${r.fila}: ${r.colCounts.map(c => `${c.col}=${c.count}`).join(', ')}`).join(' | ')
      } else if (p.type === 'nps') {
        const nps = getNPSData(p.id)
        if (nps) detalle = `Score: ${nps.score} | Promotores: ${nps.promotores} | Neutros: ${nps.neutros} | Detractores: ${nps.detractores}`
      } else if (['star_rating', 'scale'].includes(p.type)) {
        const avg = getNumericAverage(p.id)
        detalle = `Promedio: ${avg ?? 'Sin datos'}`
      } else if (['text', 'long_text'].includes(p.type)) {
        const textos = getTextAnswers(p.id)
        detalle = textos.slice(0, 3).join(' / ')
      }

      return { num: i + 1, label: p.label, type: p.type, totalAnswers, detalle }
    })
  }

  async function exportarExcel() {
    setExportando('excel')
    try {
      const wb = XLSX.utils.book_new()

      const resumenData: any[] = [
        ['Encuesta:', encuesta?.title],
        ['Total respuestas:', respuestas.length],
        ['Fecha:', new Date().toLocaleDateString('es-ES')],
        [],
        ['#', 'Pregunta', 'Tipo', 'Respuestas'],
      ]
      preguntas.forEach((p, i) => resumenData.push([i + 1, p.label, p.type, getAnswersForQuestion(p.id).length]))
      const ws1 = XLSX.utils.aoa_to_sheet(resumenData)
      ws1['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 20 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(wb, ws1, 'Resumen')

      const detalleData: any[] = []
      preguntas.forEach((p, i) => {
        detalleData.push([`Pregunta ${i + 1}: ${p.label}`], ['Tipo:', p.type], [])
        const tieneOpciones = ['single_choice', 'multiple_choice', 'dropdown', 'likert'].includes(p.type)
        const esMatriz = p.type === 'matrix' || p.type === 'matrix_multiple'
        if (tieneOpciones && p.question_options?.length > 0) {
          detalleData.push(['Opción', 'Respuestas', 'Porcentaje'])
          getOptionCounts(p.id, p.question_options).forEach(c => detalleData.push([c.label, c.count, `${c.pct}%`]))
        }
        if (esMatriz) {
          const filas = p.config?.filas || []
          const columnas = p.config?.columnas || []
          detalleData.push(['Fila', ...columnas])
          getMatrixAnswersDirect(p.id, filas, columnas).forEach(r => detalleData.push([r.fila, ...r.colCounts.map(c => c.count)]))
        }
        if (['text', 'long_text'].includes(p.type)) {
          detalleData.push(['Respuestas:'])
          getTextAnswers(p.id).forEach(t => detalleData.push([t]))
        }
        if (['nps', 'star_rating', 'scale'].includes(p.type)) {
          detalleData.push(['Promedio:', getNumericAverage(p.id) ?? 'Sin datos'])
          if (p.type === 'nps') {
            const nps = getNPSData(p.id)
            if (nps) {
              detalleData.push(['NPS Score:', nps.score])
              detalleData.push(['Promotores:', nps.promotores], ['Neutros:', nps.neutros], ['Detractores:', nps.detractores])
            }
          }
        }
        detalleData.push([], [])
      })
      const ws2 = XLSX.utils.aoa_to_sheet(detalleData)
      ws2['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(wb, ws2, 'Detalle por pregunta')

      if (respuestas.length > 0) {
        const headers = ['#', 'Fecha', ...preguntas.map(p => p.label)]
        const indData: any[] = [headers]
        respuestas.forEach((resp, ri) => {
          const row: any[] = [ri + 1, resp.started_at ? new Date(resp.started_at).toLocaleDateString('es-ES') : '']
          preguntas.forEach(p => {
            const ans = answers.find(a => a.response_id === resp.id && a.question_id === p.id)
            if (!ans) { row.push('') } else {
              const val = ans.value?.answer
              if (typeof val === 'object' && !Array.isArray(val)) row.push(JSON.stringify(val))
              else row.push(Array.isArray(val) ? val.join(', ') : (val ?? ''))
            }
          })
          indData.push(row)
        })
        const ws3 = XLSX.utils.aoa_to_sheet(indData)
        ws3['!cols'] = [{ wch: 5 }, { wch: 12 }, ...preguntas.map(() => ({ wch: 25 }))]
        XLSX.utils.book_append_sheet(wb, ws3, 'Respuestas individuales')
      }

      XLSX.writeFile(wb, `${encuesta?.title || 'encuesta'}_${new Date().toISOString().split('T')[0]}.xlsx`)
    } finally {
      setExportando(null)
    }
  }

  async function exportarPDF() {
    setExportando('pdf')
    try {
      const jsPDF = (await import('jspdf')).default
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const margin = 15
      const contentW = pageW - margin * 2
      let y = margin

      const addText = (text: string, opts: { size?: number; bold?: boolean; color?: string; indent?: number; lineHeight?: number } = {}) => {
        const { size = 11, bold = false, color = '#111827', indent = 0, lineHeight = 7 } = opts
        pdf.setFontSize(size)
        pdf.setFont('helvetica', bold ? 'bold' : 'normal')
        const rgb = hexToRgb(color)
        pdf.setTextColor(rgb.r, rgb.g, rgb.b)
        const lines = pdf.splitTextToSize(text, contentW - indent)
        if (y + lines.length * lineHeight > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage()
          y = margin
        }
        pdf.text(lines, margin + indent, y)
        y += lines.length * lineHeight
      }

      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return { r, g, b }
      }

      const addBar = (pct: number, label: string, count: number, total: number, color = '#639922') => {
        if (y + 8 > pdf.internal.pageSize.getHeight() - margin) { pdf.addPage(); y = margin }
        const barW = (contentW - 60) * (pct / 100)
        const rgb = hexToRgb(color)
        pdf.setFillColor(rgb.r, rgb.g, rgb.b)
        pdf.roundedRect(margin + 55, y - 4, Math.max(barW, 1), 5, 1, 1, 'F')
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(55, 65, 81)
        pdf.text(label.substring(0, 28), margin, y)
        pdf.setTextColor(107, 114, 128)
        pdf.text(`${count} (${pct}%)`, margin + contentW - 5, y, { align: 'right' })
        y += 8
      }

      // Portada
      addText(encuesta?.title || 'Resultados', { size: 22, bold: true })
      y += 2
      addText(`Total respuestas: ${respuestas.length}  ·  Fecha: ${new Date().toLocaleDateString('es-ES')}`, { size: 10, color: '#6B7280' })
      y += 8

      pdf.setDrawColor(229, 231, 235)
      pdf.line(margin, y, pageW - margin, y)
      y += 8

      preguntas.forEach((p, i) => {
        const tieneOpciones = ['single_choice', 'multiple_choice', 'dropdown', 'likert'].includes(p.type)
        const esMatriz = p.type === 'matrix' || p.type === 'matrix_multiple'
        const esTexto = ['text', 'long_text'].includes(p.type)
        const esNPS = p.type === 'nps'
        const esNumerico = ['star_rating', 'scale'].includes(p.type)
        const totalAnswers = getAnswersForQuestion(p.id).length

        addText(`${i + 1}. ${p.label}`, { size: 13, bold: true })
        y += 1
        addText(`${p.type.replace(/_/g, ' ')} · ${totalAnswers} respuestas`, { size: 9, color: '#9CA3AF' })
        y += 4

        if (tieneOpciones && p.question_options?.length > 0) {
          const counts = getOptionCounts(p.id, p.question_options)
          const maxPct = Math.max(...counts.map((c: any) => c.pct), 1)
          counts.forEach((c: any) => {
            addBar(c.pct, c.label, c.count, totalAnswers, '#639922')
          })
        }

        if (esMatriz) {
          const filas = p.config?.filas || []
          const columnas = p.config?.columnas || []
          const matData = getMatrixAnswersDirect(p.id, filas, columnas)
          const colW = (contentW - 40) / Math.max(columnas.length, 1)
          // Header
          pdf.setFontSize(9)
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(107, 114, 128)
          columnas.forEach((col: string, ci: number) => {
            pdf.text(col.substring(0, 12), margin + 40 + ci * colW, y, { align: 'center' })
          })
          y += 6
          matData.forEach(row => {
            if (y + 7 > pdf.internal.pageSize.getHeight() - margin) { pdf.addPage(); y = margin }
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(55, 65, 81)
            pdf.text(row.fila.substring(0, 20), margin, y)
            row.colCounts.forEach((cc, ci) => {
              pdf.setFont('helvetica', cc.count > 0 ? 'bold' : 'normal')
              pdf.setTextColor(cc.count > 0 ? 22 : 156, cc.count > 0 ? 163 : 163, cc.count > 0 ? 74 : 175)
              pdf.text(String(cc.count), margin + 40 + ci * colW, y, { align: 'center' })
            })
            y += 7
          })
        }

        if (esNPS) {
          const nps = getNPSData(p.id)
          if (nps) {
            addText(`NPS Score: ${nps.score}`, { size: 28, bold: true, color: nps.score >= 0 ? '#16A34A' : '#DC2626' })
            addText(`Promotores: ${nps.promotores}   Neutros: ${nps.neutros}   Detractores: ${nps.detractores}`, { size: 11, color: '#6B7280' })
          }
        }

        if (esNumerico) {
          const avg = getNumericAverage(p.id)
          if (avg) addText(`Promedio: ${avg}`, { size: 20, bold: true })
        }

        if (esTexto) {
          const textos = getTextAnswers(p.id)
          textos.slice(0, 8).forEach(t => {
            addText(`• ${t}`, { size: 10, color: '#374151', indent: 4 })
          })
          if (textos.length > 8) addText(`... y ${textos.length - 8} respuestas más`, { size: 9, color: '#9CA3AF', indent: 4 })
        }

        y += 6
        if (i < preguntas.length - 1) {
          pdf.setDrawColor(243, 244, 246)
          pdf.line(margin, y - 3, pageW - margin, y - 3)
        }
      })

      pdf.save(`${encuesta?.title || 'resultados'}_${new Date().toISOString().split('T')[0]}.pdf`)
    } finally {
      setExportando(null)
    }
  }

  async function exportarPPT() {
    setExportando('ppt')
    try {
      const pptxgen = (await import('pptxgenjs')).default
      const prs = new pptxgen()
      prs.layout = 'LAYOUT_WIDE'

      // Portada
      const portada = prs.addSlide()
      portada.background = { color: 'F9FAFB' }
      portada.addText(encuesta?.title || 'Resultados', { x: 0.5, y: 1.5, w: 12, h: 1, fontSize: 32, bold: true, color: '111827', align: 'center' })
      portada.addText(`${respuestas.length} respuestas · ${new Date().toLocaleDateString('es-ES')}`, { x: 0.5, y: 3, w: 12, h: 0.5, fontSize: 16, color: '6B7280', align: 'center' })

      preguntas.forEach((p, i) => {
        const tieneOpciones = ['single_choice', 'multiple_choice', 'dropdown', 'likert'].includes(p.type)
        const esMatriz = p.type === 'matrix' || p.type === 'matrix_multiple'
        const esNPS = p.type === 'nps'
        const esNumerico = ['star_rating', 'scale'].includes(p.type)
        const esTexto = ['text', 'long_text'].includes(p.type)
        const totalAnswers = getAnswersForQuestion(p.id).length
        const opciones = p.question_options || []

        const slide = prs.addSlide()
        slide.background = { color: 'FFFFFF' }
        slide.addText(`${i + 1}. ${p.label}`, { x: 0.5, y: 0.3, w: 12, h: 0.7, fontSize: 18, bold: true, color: '111827' })
        slide.addText(`${p.type.replace(/_/g, ' ')} · ${totalAnswers} respuestas`, { x: 0.5, y: 1.0, w: 12, h: 0.4, fontSize: 12, color: '9CA3AF' })

        if (tieneOpciones && opciones.length > 0) {
          const counts = getOptionCounts(p.id, opciones)
          const maxCount = Math.max(...counts.map((c: any) => c.count), 1)
          counts.forEach((c: any, i: number) => {
            const y = 1.6 + i * 0.65
            const barW = Math.max((c.count / maxCount) * 8, 0.05)
            slide.addShape(prs.ShapeType.rect, { x: 2.5, y: y + 0.1, w: barW, h: 0.4, fill: { color: '639922' }, line: { color: '639922' } })
            slide.addText(c.label, { x: 0.3, y, w: 2.1, h: 0.5, fontSize: 11, color: '374151' })
            slide.addText(`${c.count} (${c.pct}%)`, { x: 11.5, y, w: 1.8, h: 0.5, fontSize: 11, color: '374151', align: 'right' })
          })
        }

        if (esMatriz) {
          const filas = p.config?.filas || []
          const columnas = p.config?.columnas || []
          const matData = getMatrixAnswersDirect(p.id, filas, columnas)

          if (filas.length > 0 && columnas.length > 0) {
            const colW = 10 / (columnas.length + 1)
            const headerRow: any[] = [
              { text: '', options: { bold: true, fontSize: 10, color: '6B7280', fill: { color: 'F3F4F6' }, border: [{ type: 'solid', pt: 0.5, color: 'E5E7EB' }] } },
              ...columnas.map((col: string) => ({
                text: col.substring(0, 15),
                options: { bold: true, fontSize: 10, color: '374151', align: 'center', fill: { color: 'F3F4F6' }, border: [{ type: 'solid', pt: 0.5, color: 'E5E7EB' }] }
              }))
            ]
            const dataRows: any[][] = matData.map(row => [
              { text: row.fila, options: { bold: true, fontSize: 10, color: '374151', fill: { color: 'FFFFFF' }, border: [{ type: 'solid', pt: 0.5, color: 'E5E7EB' }] } },
              ...row.colCounts.map(cc => ({
                text: String(cc.count),
                options: { fontSize: 11, color: cc.count > 0 ? '639922' : '9CA3AF', align: 'center', bold: cc.count > 0, fill: { color: 'FFFFFF' }, border: [{ type: 'solid', pt: 0.5, color: 'E5E7EB' }] }
              }))
            ])

            slide.addTable([headerRow, ...dataRows], {
              x: 0.5, y: 1.6, w: 12,
              colW: [2.5, ...columnas.map(() => colW)],
              rowH: 0.4,
            })
          }
        }

        if (esNPS) {
          const nps = getNPSData(p.id)
          if (nps) {
            slide.addText(`${nps.score}`, { x: 0.5, y: 1.8, w: 12, h: 1.2, fontSize: 64, bold: true, color: nps.score >= 0 ? '16A34A' : 'DC2626', align: 'center' })
            slide.addText('NPS Score', { x: 0.5, y: 3.0, w: 12, h: 0.4, fontSize: 12, color: '9CA3AF', align: 'center' })
            const barData = [
              { label: `Promotores
(9-10)`, val: nps.promotores, color: '16A34A' },
              { label: `Neutros
(7-8)`, val: nps.neutros, color: 'D97706' },
              { label: `Detractores
(0-6)`, val: nps.detractores, color: 'DC2626' },
            ]
            barData.forEach((d, i) => {
              const x = 1.5 + i * 3.5
              const maxH = 1.2
              const h = nps.total > 0 ? Math.max((d.val / nps.total) * maxH, 0.05) : 0.05
              slide.addShape(prs.ShapeType.rect, { x, y: 3.6 + (maxH - h), w: 2, h, fill: { color: d.color }, line: { color: d.color } })
              slide.addText(`${d.val}`, { x, y: 3.5 + (maxH - h) - 0.3, w: 2, h: 0.3, fontSize: 14, bold: true, color: d.color, align: 'center' })
              slide.addText(d.label, { x, y: 4.9, w: 2, h: 0.5, fontSize: 10, color: '6B7280', align: 'center' })
            })
          }
        }

        if (esNumerico) {
          const avg = getNumericAverage(p.id)
          if (avg) {
            slide.addText(avg, { x: 0.5, y: 1.8, w: 12, h: 1.2, fontSize: 64, bold: true, color: '111827', align: 'center' })
            slide.addText(p.type === 'star_rating' ? '★ promedio sobre 5 estrellas' : 'promedio sobre 10', { x: 0.5, y: 3.2, w: 12, h: 0.5, fontSize: 14, color: '9CA3AF', align: 'center' })
          }
        }

        if (esTexto) {
          const textos = getTextAnswers(p.id).slice(0, 5)
          textos.forEach((t, i) => {
            slide.addText(`"${t}"`, { x: 0.5, y: 1.6 + i * 0.8, w: 12, h: 0.7, fontSize: 12, color: '374151', italic: true })
          })
        }
      })

      await prs.writeFile({ fileName: `${encuesta?.title || 'resultados'}_${new Date().toISOString().split('T')[0]}.pptx` })
    } finally {
      setExportando(null)
    }
  }

    async function exportarWord() {
    setExportando('word')
    try {
      const { Document, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, Packer, WidthType, BorderStyle } = await import('docx')

      const children: any[] = [
        new Paragraph({
          text: encuesta?.title || 'Resultados',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: `Total respuestas: ${respuestas.length} · Fecha: ${new Date().toLocaleDateString('es-ES')}`, color: '6B7280', size: 24 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
      ]

      preguntas.forEach((p, i) => {
        const tieneOpciones = ['single_choice', 'multiple_choice', 'dropdown', 'likert'].includes(p.type)
        const esMatriz = p.type === 'matrix' || p.type === 'matrix_multiple'
        const totalAnswers = getAnswersForQuestion(p.id).length

        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${i + 1}. ${p.label}`, bold: true, size: 28 })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `${p.type.replace(/_/g, ' ')} · ${totalAnswers} respuestas`, color: '9CA3AF', size: 20 })],
            spacing: { after: 200 },
          })
        )

        if (tieneOpciones && p.question_options?.length > 0) {
          const counts = getOptionCounts(p.id, p.question_options)
          const maxCount = Math.max(...counts.map((c: any) => c.count), 1)
          const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
          const cellBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }

          counts.forEach((c: any) => {
            const blocks = Math.round((c.count / maxCount) * 30)
            const bar = '█'.repeat(Math.max(blocks, c.count > 0 ? 1 : 0))
            children.push(
              new Paragraph({
                spacing: { before: 60, after: 80 },
                children: [
                  new TextRun({ text: `${c.label}`, size: 20, color: '374151' }),
                  new TextRun({ text: `    `, size: 20 }),
                  new TextRun({ text: bar, size: 20, color: '639922' }),
                  new TextRun({ text: `    ${c.count} (${c.pct}%)`, size: 18, color: '6B7280' }),
                ],
              })
            )
          })
          children.push(new Paragraph({ spacing: { after: 200 } }))
        }

        if (esMatriz) {
          const filas = p.config?.filas || []
          const columnas = p.config?.columnas || []
          const matData = getMatrixAnswersDirect(p.id, filas, columnas)
          const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
          const tableBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder }
          const table = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorder,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('')] }),
                  ...columnas.map((col: string) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: col, bold: true, size: 18 })] })] })),
                ],
              }),
              ...matData.map(row => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.fila, bold: true, size: 20 })] })] }),
                  ...row.colCounts.map(c => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(c.count), size: 20 })] })] })),
                ],
              })),
            ],
          })
          children.push(table, new Paragraph({ spacing: { after: 200 } }))
        }

        if (p.type === 'nps') {
          const nps = getNPSData(p.id)
          if (nps) {
            children.push(
              new Paragraph({ children: [new TextRun({ text: `NPS Score: ${nps.score}`, bold: true, size: 48, color: nps.score >= 0 ? '16A34A' : 'DC2626' })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: `Promotores: ${nps.promotores}   Neutros: ${nps.neutros}   Detractores: ${nps.detractores}`, size: 22, color: '6B7280' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
            )
          }
        }

        if (['star_rating', 'scale'].includes(p.type)) {
          const avg = getNumericAverage(p.id)
          children.push(new Paragraph({ children: [new TextRun({ text: `Promedio: ${avg ?? 'Sin datos'}`, bold: true, size: 32 })], spacing: { after: 200 } }))
        }

        if (['text', 'long_text'].includes(p.type)) {
          const textos = getTextAnswers(p.id)
          textos.forEach(t => {
            children.push(new Paragraph({ children: [new TextRun({ text: `• ${t}`, size: 20, italics: true, color: '374151' })], spacing: { after: 100 } }))
          })
        }
      })

      const doc = new Document({ sections: [{ properties: {}, children }] })
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${encuesta?.title || 'resultados'}_${new Date().toISOString().split('T')[0]}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportando(null)
    }
  }

  const totalRespuestas = respuestas.length
  const respuestasFiltradas = respuestas.filter(resp => {
    if (!filtroBusqueda) return true
    const respAnswers = answers.filter(a => a.response_id === resp.id)
    return respAnswers.some(a => {
      const val = a.value?.answer
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val || '')
      return str.toLowerCase().includes(filtroBusqueda.toLowerCase())
    })
  })

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando resultados...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">Dashboard</Link>
          <span className="text-gray-300">/</span>
          <Link href="/dashboard/encuestas" className="text-gray-400 hover:text-gray-600 text-sm">Encuestas</Link>
          <span className="text-gray-300">/</span>
          <Link href={`/dashboard/encuestas/${id}`} className="text-gray-400 hover:text-gray-600 text-sm truncate max-w-xs">{encuesta?.title}</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-medium text-gray-900">Resultados</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/encuestas/${id}`} className="text-sm text-gray-500 hover:text-gray-700">Volver al editor</Link>
          {totalRespuestas > 0 && (
            <div className="relative">
              <button
                onClick={() => setMostrarMenuExport(v => !v)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                {exportando ? `Exportando ${exportando}...` : '↓ Exportar'}
                <span className="text-xs opacity-75">▾</span>
              </button>
              {mostrarMenuExport && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 w-44">
                  {[
                    { label: '📊 Excel (.xlsx)', action: () => { exportarExcel(); setMostrarMenuExport(false) } },
                    { label: '📄 PDF', action: () => { exportarPDF(); setMostrarMenuExport(false) } },
                    { label: '📑 PowerPoint', action: () => { exportarPPT(); setMostrarMenuExport(false) } },
                    { label: '📝 Word (.docx)', action: () => { exportarWord(); setMostrarMenuExport(false) } },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">{encuesta?.title}</h2>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total respuestas', value: totalRespuestas },
            { label: 'Preguntas', value: preguntas.length },
            { label: 'Tasa completitud', value: '100%' },
            { label: 'Estado', value: encuesta?.status === 'active' ? 'Activa' : 'Borrador', green: true },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">{m.label}</p>
              <p className={`text-3xl font-semibold ${m.green ? 'text-green-600 text-lg mt-1' : 'text-gray-900'}`}>{m.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {(['graficos', 'individuales'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'graficos' ? 'Gráficos' : `Respuestas individuales (${totalRespuestas})`}
            </button>
          ))}
        </div>

        {totalRespuestas === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sin respuestas aún</h3>
            <p className="text-gray-500 text-sm">Comparte el link de la encuesta para empezar a recibir respuestas</p>
          </div>
        ) : tab === 'graficos' ? (
          <div ref={dashboardRef} className="space-y-6">
            {preguntas.map((pregunta, index) => {
              const tieneOpciones = ['single_choice', 'multiple_choice', 'dropdown', 'likert'].includes(pregunta.type)
              const esMatriz = pregunta.type === 'matrix' || pregunta.type === 'matrix_multiple'
              const esTexto = ['text', 'long_text'].includes(pregunta.type)
              const esNPS = pregunta.type === 'nps'
              const esEstrellas = pregunta.type === 'star_rating'
              const esThumbs = pregunta.type === 'thumbs'
              const esScale = pregunta.type === 'scale'
              const opciones = pregunta.question_options || []
              const opcionCounts = tieneOpciones ? getOptionCounts(pregunta.id, opciones) : []
              const textAnswers = esTexto ? getTextAnswers(pregunta.id) : []
              const npsData = esNPS ? getNPSData(pregunta.id) : null
              const thumbsData = esThumbs ? getThumbsData(pregunta.id) : []
              const avg = (esEstrellas || esScale) ? getNumericAverage(pregunta.id) : null
              const filas = pregunta.config?.filas || []
              const columnas = pregunta.config?.columnas || []
              const matrizData = esMatriz ? getMatrixAnswersDirect(pregunta.id, filas, columnas) : []
              const totalAnswers = getAnswersForQuestion(pregunta.id).length

              return (
                <div key={pregunta.id} className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-start gap-3 mb-5">
                    <span className="text-xs text-gray-400 mt-1 shrink-0 w-5">{index + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{pregunta.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{pregunta.type.replace(/_/g, ' ')} · {totalAnswers} respuestas</p>
                    </div>
                  </div>

                  {tieneOpciones && opciones.length > 0 && (
                    <div className="ml-8">
                      <ResponsiveContainer width="100%" height={Math.max(opcionCounts.length * 48, 120)}>
                        <BarChart data={opcionCounts} layout="vertical" margin={{ top: 0, right: 60, left: 8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                          <XAxis type="number" domain={[0, totalRespuestas]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                          <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 12, fill: '#374151' }} />
                          <Tooltip formatter={(value: any, _: any, props: any) => [`${value} (${props.payload.pct}%)`, 'Respuestas']} contentStyle={{ borderRadius: 8, border: '0.5px solid #e5e7eb', fontSize: 12 }} />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                            {opcionCounts.map((_, i) => <Cell key={i} fill={COLORS_BAR[i % COLORS_BAR.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {esMatriz && filas.length > 0 && columnas.length > 0 && (
                    <div className="ml-8 overflow-x-auto">
                      {totalAnswers === 0 ? (
                        <p className="text-sm text-gray-400">Sin respuestas aún</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 w-1/4"></th>
                              {columnas.map((col: string, i: number) => <th key={i} className="text-center py-2 px-3 text-xs font-medium text-gray-500">{col}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {matrizData.map((row, fi) => (
                              <tr key={fi} className="border-t border-gray-50">
                                <td className="py-3 pr-4 text-sm text-gray-700 font-medium">{row.fila}</td>
                                {row.colCounts.map((cc, ci) => (
                                  <td key={ci} className="text-center py-3 px-3">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-sm font-medium text-gray-900">{cc.count}</span>
                                      <div className="w-12 bg-gray-100 rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${totalAnswers > 0 ? Math.round(cc.count / totalAnswers * 100) : 0}%` }} />
                                      </div>
                                      <span className="text-xs text-gray-400">{totalAnswers > 0 ? Math.round(cc.count / totalAnswers * 100) : 0}%</span>
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {esThumbs && (
                    <div className="ml-8 flex items-center gap-8">
                      <ResponsiveContainer width={180} height={180}>
                        <PieChart>
                          <Pie data={thumbsData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
                            {thumbsData.map((_, i) => <Cell key={i} fill={COLORS_PIE[i]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 8, border: '0.5px solid #e5e7eb', fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {thumbsData.map((d, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: COLORS_PIE[i] }} />
                            <span className="text-sm text-gray-700">{d.name}</span>
                            <span className="text-sm font-medium text-gray-900 ml-2">{d.value} ({totalRespuestas > 0 ? Math.round(d.value / totalRespuestas * 100) : 0}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {esNPS && npsData && (
                    <div className="ml-8">
                      <div className="flex items-center gap-8 mb-4">
                        <div>
                          <p className="text-5xl font-semibold text-gray-900">{npsData.score}</p>
                          <p className="text-xs text-gray-400 mt-1">NPS Score</p>
                        </div>
                        <div className="flex gap-4">
                          {[{ label: 'Promotores', val: npsData.promotores, sub: '(9-10)', color: 'text-green-600' }, { label: 'Neutros', val: npsData.neutros, sub: '(7-8)', color: 'text-amber-500' }, { label: 'Detractores', val: npsData.detractores, sub: '(0-6)', color: 'text-red-500' }].map(item => (
                            <div key={item.label} className="text-center">
                              <p className={`text-2xl font-medium ${item.color}`}>{item.val}</p>
                              <p className="text-xs text-gray-400">{item.label}<br/>{item.sub}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex rounded-full overflow-hidden h-3">
                        <div className="bg-green-500" style={{ width: `${npsData.total > 0 ? (npsData.promotores / npsData.total * 100) : 0}%` }} />
                        <div className="bg-amber-400" style={{ width: `${npsData.total > 0 ? (npsData.neutros / npsData.total * 100) : 0}%` }} />
                        <div className="bg-red-400" style={{ width: `${npsData.total > 0 ? (npsData.detractores / npsData.total * 100) : 0}%` }} />
                      </div>
                    </div>
                  )}

                  {(esEstrellas || esScale) && avg && (
                    <div className="ml-8 flex items-center gap-4">
                      <p className="text-5xl font-semibold text-gray-900">{avg}</p>
                      <div>
                        {esEstrellas && (
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }, (_, i) => <span key={i} className={`text-2xl ${i < Math.round(Number(avg)) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>)}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{esEstrellas ? 'Promedio sobre 5 estrellas' : 'Promedio sobre 10'}</p>
                      </div>
                    </div>
                  )}

                  {esTexto && (
                    <div className="ml-8 space-y-2 max-h-64 overflow-y-auto">
                      {textAnswers.length === 0 ? <p className="text-sm text-gray-400">Sin respuestas aún</p> : textAnswers.map((texto, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl px-4 py-3">
                          <p className="text-sm text-gray-700">{texto}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <input type="text" value={filtroBusqueda} onChange={e => setFiltroBusqueda(e.target.value)} placeholder="Buscar en respuestas..." className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              <span className="text-xs text-gray-400 shrink-0">{respuestasFiltradas.length} resultados</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-8">#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Fecha</th>
                    {preguntas.map(p => <th key={p.id} className="text-left px-4 py-3 text-xs font-medium text-gray-500 max-w-40"><span className="truncate block max-w-36">{p.label}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {respuestasFiltradas.map((resp, ri) => (
                    <tr key={resp.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{ri + 1}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{resp.started_at ? new Date(resp.started_at).toLocaleDateString('es-ES') : '—'}</td>
                      {preguntas.map(p => {
                        const ans = answers.find(a => a.response_id === resp.id && a.question_id === p.id)
                        const val = ans?.value?.answer
                        let display = '—'
                        if (val !== undefined && val !== null) {
                          if (Array.isArray(val)) display = val.join(', ')
                          else if (typeof val === 'object') display = JSON.stringify(val)
                          else display = String(val)
                        }
                        return <td key={p.id} className="px-4 py-3 text-gray-700 max-w-40"><span className="block truncate max-w-36" title={display}>{display}</span></td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {respuestasFiltradas.length === 0 && <div className="text-center py-8"><p className="text-sm text-gray-400">No hay resultados para esa búsqueda</p></div>}
            </div>
          </div>
        )}
      </main>

      {mostrarMenuExport && <div className="fixed inset-0 z-40" onClick={() => setMostrarMenuExport(false)} />}
    </div>
  )
}
