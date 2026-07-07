"use client"

import { useState, useMemo, useRef } from "react"
import { X, Save, AlertCircle, Info, Image as ImageIcon, Calculator, Plus, CheckCircle2, BookOpen, Users } from "lucide-react"
import dynamic from "next/dynamic"
import 'react-quill-new/dist/quill.snow.css'
import SimbolosPanel from "@/components/SimbolosPanel"

// Importação dinâmica do React Quill para evitar erros de SSR
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactQuill = dynamic(() => import("react-quill-new"), { 
  ssr: false,
  loading: () => <div className="h-40 w-full bg-slate-50 animate-pulse rounded-2xl border border-slate-100" />
}) as any

export default function QuestaoForm({ questao, onClose, onSuccess, turmas, disciplinas }: any) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    enunciado: questao?.enunciado || '',
    alternativaA: questao?.alternativaA || '',
    alternativaB: questao?.alternativaB || '',
    alternativaC: questao?.alternativaC || '',
    alternativaD: questao?.alternativaD || '',
    alternativaE: questao?.alternativaE || '',
    correta: questao?.correta || 'A',
    dificuldade: questao?.dificuldade || 'MEDIO',
    muleta: questao?.muleta || '',
    unidade: questao?.unidade || '2',
    tipo: questao?.tipo || 'NORMAL',
    imagemUrl: questao?.imagemUrl || '',
    disciplinasIds: questao?.disciplinas?.map((d: any) => d.id) || [],
    turmasIds: questao?.turmas?.map((t: any) => t.id) || []
  })

  const [showConfirm, setShowConfirm] = useState(false)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const quillRef = useRef<any>(null)
  const [alternativaFocada, setAlternativaFocada] = useState<string | null>(null)
  const alternativaRefs = useRef<Record<string, any>>({})
  
  const [currentStep, setCurrentStep] = useState(1)
  
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    // Validação de campos obrigatórios
    if (!formData.enunciado || formData.enunciado === '<p><br></p>' || formData.enunciado.trim() === '') {
      setError('O enunciado da questão é obrigatório.')
      return
    }

    if (!formData.alternativaA || !formData.alternativaB || !formData.alternativaC || !formData.alternativaD || !formData.alternativaE) {
      setError('Todas as alternativas (A, B, C, D e E) são obrigatórias.')
      return
    }

    if (!formData.unidade) {
      setError('A seleção da unidade é obrigatória.')
      return
    }

    if (formData.disciplinasIds.length === 0) {
      setError('Selecione pelo menos uma disciplina associada.')
      return
    }

    if (!showConfirm && !questao?.isCopy && questao) {
      setShowConfirm(true)
      return
    }

    setLoading(true)
    setError('')
    setShowConfirm(false)

    try {
      const isCopy = questao?.isCopy
      const url = (questao && !isCopy) ? `/api/questoes/${questao.id}` : '/api/questoes'
      const method = (questao && !isCopy) ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        onSuccess()
      } else {
        const data = await res.json()
        setError(data.message || 'Erro ao salvar questão')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (id: string, field: 'disciplinasIds' | 'turmasIds') => {
    const current = [...formData[field]]
    const index = current.indexOf(id)
    
    if (index > -1) {
      current.splice(index, 1)
    } else {
      current.push(id)
    }

    const newData: any = { ...formData, [field]: current }

    // Inteligência: Ao selecionar um vínculo (disciplina), garante que a turma está vinculada
    if (field === 'disciplinasIds') {
      const selectedTurmasIds = disciplinas
        .filter((d: any) => newData.disciplinasIds.includes(d.id))
        .map((d: any) => d.turmaId)
      
      // We don't want to remove previously selected turmas, just ensure we don't drop them if they still have disciplines selected
      // Actually, since Turmas are selected first now, we don't necessarily need this reverse link as much, but we keep it safe.
    } else if (field === 'turmasIds') {
      // If a turma is unselected, we should probably unselect its disciplines
      if (!current.includes(id)) {
         newData.disciplinasIds = newData.disciplinasIds.filter((dId: string) => {
            const disc = disciplinas.find((d: any) => d.id === dId);
            return disc ? current.includes(disc.turmaId) : false;
         });
      }
    }

    setFormData(newData)
  }

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['clean']
    ],
  }

  const quillFormats = [
    'bold', 'italic', 'underline', 'strike',
    'script', 'color', 'background',
    'list', 'bullet', 'align'
  ]

  const miniQuillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      ['clean']
    ],
  }

  const miniQuillFormats = [
    'bold', 'italic', 'underline', 'script'
  ]

  const selectAllSameName = (nome: string, serie?: string) => {
    const sameNamed = disciplinas.filter((d: any) => 
      d.nome === nome && (!serie || d.serie === serie)
    )
    const newDiscIds = [...new Set([...formData.disciplinasIds, ...sameNamed.map((d: any) => d.id)])]
    const newTurmaIds = [...new Set([...formData.turmasIds, ...sameNamed.map((d: any) => d.turmaId)])]
    
    setFormData({
      ...formData,
      disciplinasIds: newDiscIds,
      turmasIds: newTurmaIds
    })
  }

  const distribuirAlternativas = (texto: string, startLetter: string = 'A') => {
    let parts: string[] = []
    
    // 1. Tentar dividir por padrões de letras (a) b) c) d) e) ou A. B. C. D. E.)
    const labelRegex = /(?:^|\s+)([a-eA-E][\).:-]\s+)/g
    const matches = Array.from(texto.matchAll(labelRegex))
    
    if (matches.length >= 2) {
      matches.forEach((match, i) => {
        const nextMatch = matches[i + 1]
        const start = match.index! + match[0].length
        const end = nextMatch ? nextMatch.index! : texto.length
        const content = texto.substring(start, end).trim()
        if (content) parts.push(content)
      })
    } else {
      // 2. Tentar dividir por números (1. 2. 3. 4. 5.)
      const numRegex = /(?:^|\s+)([1-5][\).:-]\s+)/g
      const numMatches = Array.from(texto.matchAll(numRegex))
      
      if (numMatches.length >= 2) {
        numMatches.forEach((match, i) => {
          const nextMatch = numMatches[i + 1]
          const start = match.index! + match[0].length
          const end = nextMatch ? nextMatch.index! : texto.length
          const content = texto.substring(start, end).trim()
          if (content) parts.push(content)
        })
      } else {
        // 3. Fallback: tentar dividir por quebra de linha
        const lines = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '')
        if (lines.length >= 2) {
          parts = lines
        } else {
          // Último caso: tenta quebrar por delimitadores de alternativas mesmo sem espaço perfeito
          const simpleSplit = texto.split(/\s+[a-eA-E][\).:-]\s*/).filter(p => p.trim() !== '')
          if (simpleSplit.length >= 2) {
            parts = simpleSplit
          } else {
            parts = [texto]
          }
        }
      }
    }

    if (parts.length > 0) {
      const letters = ['A', 'B', 'C', 'D', 'E']
      const startIndex = letters.indexOf(startLetter)
      
      setFormData(prev => {
        const newData = { ...prev }
        parts.forEach((part, index) => {
          const targetIndex = startIndex + index
          if (targetIndex < letters.length) {
            const cleaned = part.replace(/^([a-eA-E0-9][\).:-]\s*|[a-eA-E0-9]\s+[\-\u2013\u2014]\s*|[\-\*\u2022]\s*)/, '').trim()
            const field = `alternativa${letters[targetIndex]}`
            // @ts-ignore
            newData[field] = cleaned
          }
        })
        return newData
      })
      setShowPasteModal(false)
      setPasteText('')
    }
  }

  const handlePasteAlternativas = (e: React.ClipboardEvent, startLetter: string) => {
    const pasteData = e.clipboardData.getData('text')
    
    const hasLabels = /(?:^|\s+)([b-eB-E1-5][\).:-]\s+)/.test(pasteData)
    const hasMultipleLines = pasteData.split(/\r?\n/).filter(l => l.trim().length > 0).length >= 2
    
    // Se tiver mais de 10 caracteres e parecer ter múltiplas partes, intercepta
    if (pasteData.length > 10 && (hasLabels || hasMultipleLines)) {
      e.preventDefault()
      e.stopPropagation()
      
      // Usa timeout para garantir que o Quill não sobrescreva o estado com seu próprio evento de paste/onChange
      setTimeout(() => {
        distribuirAlternativas(pasteData, startLetter)
      }, 50)
    }
  }

  const disciplinasPorTurmaSelecionada = useMemo(() => {
    return disciplinas.filter((d: any) => formData.turmasIds.includes(d.turmaId));
  }, [disciplinas, formData.turmasIds])
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Basic validation
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida.')
      return
    }

    // Size validation (e.g. max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem original é muito grande. Máximo 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Max width/height 800px
        const MAX_SIZE = 800
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width
            width = MAX_SIZE
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height
            height = MAX_SIZE
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        // Compress to JPEG 60% quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
        
        setFormData({ ...formData, imagemUrl: dataUrl })
      }
      img.src = readerEvent.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {questao?.isCopy ? 'Criar Variação' : (questao ? 'Editar Questão' : 'Nova Questão')}
            </h2>
            <p className="text-sm text-gray-500">
              {questao?.isCopy ? 'Altere o que desejar para criar uma nova versão desta questão.' : 'Preencha os dados da questão para curadoria da coordenação.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Stepper Header */}
        <div className="flex items-center justify-center sm:justify-start gap-2 px-6 sm:px-8 py-4 bg-gray-50/80 border-b border-gray-100 overflow-x-auto no-scrollbar">
          {[1, 2, 3].map(step => (
            <div key={step} className={`flex items-center gap-2 ${currentStep === step ? 'text-blue-600' : 'text-gray-400'}`}>
               <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentStep === step ? 'bg-blue-600 text-white shadow-md' : (currentStep > step ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500')}`}>
                 {currentStep > step ? <CheckCircle2 size={14} /> : step}
               </div>
               <span className={`text-xs font-bold whitespace-nowrap transition-all ${currentStep === step ? 'text-blue-700' : 'hidden sm:block'}`}>
                 {step === 1 ? 'Configurações' : step === 2 ? 'Enunciado' : 'Alternativas'}
               </span>
               {step < 3 && <div className={`w-4 sm:w-8 h-[2px] mx-1 sm:mx-2 rounded-full transition-all ${currentStep > step ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 text-sm font-medium">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* Enunciado Rich Text */}
          {currentStep === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="space-y-3">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-bold text-gray-700">Enunciado da Questão</label>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suporte a negrito, itálico e listas</span>
            </div>
            <div className="rich-text-editor">
              <ReactQuill 
                ref={quillRef}
                theme="snow"
                value={formData.enunciado}
                onChange={(content: string) => setFormData({...formData, enunciado: content})}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Descreva o problema ou contexto da questão..."
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 transition-all font-sans"
              />
            </div>
            <style jsx global>{`
              .rich-text-editor .ql-toolbar.ql-snow {
                border: none;
                border-bottom: 1px solid #f1f5f9;
                background: #f8fafc;
                padding: 12px;
              }
              .rich-text-editor .ql-container.ql-snow {
                border: none;
                min-height: 180px;
                font-family: inherit;
                font-size: 14px;
              }
              .rich-text-editor .ql-editor {
                min-height: 180px;
                line-height: 1.6;
              }
              .rich-text-editor .ql-editor.ql-blank::before {
                color: #cbd5e1;
                font-style: normal;
              }
            `}</style>

            {/* Painel de símbolos para o enunciado */}
            <SimbolosPanel
              onInsertQuill={(s) => {
                const editor = quillRef.current?.getEditor?.()
                if (editor) {
                  const range = editor.getSelection(true)
                  editor.insertText(range?.index ?? editor.getLength(), s)
                  editor.setSelection((range?.index ?? editor.getLength()) + s.length)
                }
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Opções Extra */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Calculator size={16} className="text-slate-700" />
                  Fórmula ou Texto Muleta (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.muleta}
                  onChange={(e) => setFormData({...formData, muleta: e.target.value})}
                  placeholder="Ex: x = (-b ± √∆) / 2a"
                  className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <ImageIcon size={16} className="text-indigo-600" />
                  Imagem da Questão (Opcional)
                </label>
                
                {formData.imagemUrl ? (
                  <div className="relative group rounded-xl overflow-hidden border border-gray-200">
                    <img src={formData.imagemUrl} alt="Preview" className="w-full h-32 object-cover bg-gray-50" />
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, imagemUrl: ''})}
                      className="absolute top-2 right-2 bg-rose-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                      title="Remover imagem"
                    >
                      <X size={16} />
                    </button>
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
                      Imagem otimizada
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label 
                      htmlFor="image-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                    >
                      <div className="p-3 bg-gray-50 rounded-full group-hover:bg-white text-gray-400 group-hover:text-blue-500 transition-all mb-2 shadow-sm">
                        <ImageIcon size={20} />
                      </div>
                      <p className="text-xs font-bold text-gray-500 group-hover:text-slate-700 text-center">
                        Clique para enviar imagem
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Será otimizada automaticamente
                      </p>
                    </label>
                    <div className="text-center mt-2">
                      <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                        Ou cole a URL abaixo
                      </span>
                    </div>
                    <input
                      type="url"
                      value={formData.imagemUrl}
                      onChange={(e) => setFormData({...formData, imagemUrl: e.target.value})}
                      placeholder="https://..."
                      className="mt-2 w-full bg-gray-50 border-gray-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
          )}

          {/* Unidade */}
          {currentStep === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Info size={16} className="text-slate-700" />
                  Alocação da Unidade
                </label>
                <select
                  required
                  value={formData.unidade || '2'}
                  onChange={(e) => setFormData({...formData, unidade: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                >
                  <option value="">Selecione a Unidade Alvo...</option>
                  <option value="1">1ª Unidade</option>
                  <option value="2">2ª Unidade</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1 pl-1">Isso ajudará a gerar provas automaticamente filtrando pelas questões dessa unidade.</p>
              </div>

              {/* Tipo de Questão */}
              <div className="flex-1 min-w-[200px]">
                <label className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                  <Info size={16} className="text-slate-700" />
                  Tipo de Questão
                </label>
                <select
                  required
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="RECUPERACAO">Recuperação</option>
                </select>
              </div>
            </div>
          </div>
          )}

          {/* Alternativas */}
          {currentStep === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 ml-1">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Alternativas de Resposta</h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100 hover:bg-blue-100 transition-all font-bold text-[10px] uppercase tracking-tight hover:scale-105 active:scale-95"
                >
                  <Plus size={12} />
                  Colar Bloco
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 animate-in fade-in slide-in-from-right-4 duration-500 shadow-sm shadow-emerald-50">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-tight">Clique na letra da questão correta</span>
                </div>
              </div>
            </div>

            {/* Painel de símbolos para as alternativas */}
            <SimbolosPanel
              onInsert={(s) => {
                if (!alternativaFocada) return
                const editor = alternativaRefs.current[alternativaFocada]?.getEditor?.()
                if (editor) {
                  const range = editor.getSelection(true)
                  editor.insertText(range?.index ?? editor.getLength(), s)
                  editor.setSelection((range?.index ?? editor.getLength()) + s.length)
                }
              }}
            />

            <div className="grid gap-4">
              {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                <div key={letter} className="flex gap-4 items-start">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, correta: letter})}
                    className={`mt-2 shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center font-black transition-all ${
                      formData.correta === letter
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-blue-200'
                    }`}
                  >
                    {letter}
                  </button>
                  <div 
                    className={`flex-1 rich-text-editor-mini rounded-xl overflow-hidden transition-all border-2 ${
                      alternativaFocada === letter ? 'border-blue-300 bg-blue-50/30 ring-2 ring-blue-500/20' : 'border-gray-100 bg-gray-50'
                    }`}
                    onPasteCapture={(e: any) => handlePasteAlternativas(e, letter)}
                  >
                    <ReactQuill 
                      ref={(el: any) => { alternativaRefs.current[letter] = el }}
                      theme="snow"
                      value={formData[`alternativa${letter}` as keyof typeof formData] as string}
                      onChange={(content: string) => setFormData({...formData, [`alternativa${letter}`]: content})}
                      onFocus={() => setAlternativaFocada(letter)}
                      modules={miniQuillModules}
                      formats={miniQuillFormats}
                      placeholder={letter === 'A' ? "Dica: você ainda pode colar uma lista de alternativas direto aqui..." : `Texto da alternativa ${letter}...`}
                      className="font-sans"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            .rich-text-editor-mini .ql-toolbar.ql-snow {
              border: none;
              border-bottom: 1px solid #f1f5f9;
              background: #f8fafc;
              padding: 6px;
            }
            .rich-text-editor-mini .ql-container.ql-snow {
              border: none;
              min-height: 40px;
              font-family: inherit;
              font-size: 14px;
            }
            .rich-text-editor-mini .ql-editor {
              min-height: 40px;
              line-height: 1.5;
              padding: 10px 12px;
            }
          `}} />
          </div>
          )}

          {/* Vínculo Inteligente Unificado */}
          {currentStep === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 border-t pt-8 border-gray-100">
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-bold text-gray-700">Onde aplicar esta questão?</label>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                 <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Vincular a Diários</span>
              </div>
            </div>
            
            <p className="text-[11px] text-slate-500 font-medium ml-1">
              Primeiro selecione a(s) Turma(s) alvo, em seguida selecione a disciplina desejada.
            </p>

            <div className="space-y-6">
              {/* Passo 1: Seleção de Turmas */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Passo 1: Turmas</span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {turmas.map((t: any) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleSelection(t.id, 'turmasIds')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shadow-sm ${
                        formData.turmasIds.includes(t.id)
                        ? 'bg-emerald-600 border-emerald-600 text-white translate-y-[-2px] shadow-emerald-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-400 hover:bg-slate-50'
                      }`}
                    >
                      <Users size={14} className={formData.turmasIds.includes(t.id) ? 'text-emerald-100' : 'text-slate-400'} />
                      {t.nome}
                    </button>
                  ))}
                </div>
              </div>

              {/* Passo 2: Seleção de Disciplinas (visível apenas se houver turmas selecionadas) */}
              {formData.turmasIds.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Passo 2: Disciplinas nas Turmas Selecionadas</span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {disciplinasPorTurmaSelecionada.map((d: any) => {
                      const turmaNome = turmas.find((t: any) => t.id === d.turmaId)?.nome || '';
                      return (
                        <div key={d.id} className="group relative">
                          <button
                            type="button"
                            onClick={() => toggleSelection(d.id, 'disciplinasIds')}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shadow-sm ${
                              formData.disciplinasIds.includes(d.id)
                              ? 'bg-blue-600 border-blue-600 text-white translate-y-[-2px] shadow-blue-200'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:bg-slate-50'
                            }`}
                          >
                            <BookOpen size={14} className={formData.disciplinasIds.includes(d.id) ? 'text-blue-100' : 'text-slate-400'} />
                            <span className="flex flex-col items-start leading-tight">
                               <span>{d.nome}</span>
                               <span className={`text-[9px] font-medium ${formData.disciplinasIds.includes(d.id) ? 'text-blue-200' : 'text-slate-400'}`}>{turmaNome}</span>
                            </span>
                          </button>
                          
                          {!formData.disciplinasIds.includes(d.id) && (
                            <button
                              type="button"
                              onClick={() => selectAllSameName(d.nome)}
                              className="hidden group-hover:flex absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1.5 shadow-lg animate-in zoom-in-50 items-center justify-center z-10"
                              title={`Selecionar ${d.nome} em todas as turmas marcadas`}
                            >
                              <Plus size={10} strokeWidth={4} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
          )}
        </form>

        <div className="p-4 sm:p-6 border-t border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-between sticky bottom-0 z-50">
          <button
            type="button"
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : onClose()}
            className="px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all text-sm"
          >
            {currentStep > 1 ? '← Voltar' : 'Cancelar'}
          </button>
          
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-gray-200 active:scale-95 text-sm"
            >
              Próximo Passo →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-blue-200 active:scale-95 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {questao ? 'Salvar Alterações' : 'Salvar Questão'}
            </button>
          )}
        </div>
      </div>

      {/* Modal de Assistente de Colagem */}
      {showPasteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-none">Colar Bloco de Respostas</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Preenchimento Automático</p>
                  </div>
                </div>
                <button onClick={() => setShowPasteModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <p className="text-sm text-slate-600 font-medium mb-4 leading-relaxed">
                Cole abaixo o texto contendo as alternativas. O sistema irá identificar cada uma (por linhas ou letras) e preencher os campos A-E.
              </p>

              <textarea
                autoFocus
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Ex: a) Opção 1 b) Opção 2 c) Opção 3..."
                className="w-full h-48 bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium resize-none mb-6"
              />

              <div className="grid grid-cols-2 gap-4">
                 <button 
                  onClick={() => setShowPasteModal(false)} 
                  className="py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-all text-sm"
                 >
                  Cancelar
                 </button>
                 <button 
                  onClick={() => distribuirAlternativas(pasteText)} 
                  disabled={!pasteText.trim()}
                  className="py-4 rounded-2xl font-black bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-200 text-sm flex items-center justify-center gap-2"
                 >
                  <Save size={18} />
                  Distribuir nos Campos
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Modal de Confirmação para Edição */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6">
                 <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Salvar Edição?</h3>
              <p className="text-sm text-slate-500 font-medium mb-8">
                As alterações realizadas nesta questão serão aplicadas permanentemente. 
                {questao?.status === 'APROVADA' && (
                  <span className="block mt-2 text-rose-600 font-bold">
                     Atenção: Esta questão já estava aprovada. Ao salvar a edição, ela voltará para o status PENDENTE para nova revisão da coordenação.
                  </span>
                )}
                Deseja confirmar?
              </p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setShowConfirm(false)} className="py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-all text-sm">Cancelar</button>
                 <button onClick={() => handleSubmit()} className="py-3 rounded-xl font-black bg-blue-700 text-white hover:bg-slate-800 transition-all shadow-lg text-sm">Confirmar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
