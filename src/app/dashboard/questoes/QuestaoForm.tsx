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
    unidade: questao?.unidade || '',
    imagemUrl: questao?.imagemUrl || '',
    disciplinasIds: questao?.disciplinas?.map((d: any) => d.id) || [],
    turmasIds: questao?.turmas?.map((t: any) => t.id) || []
  })

  const [showConfirm, setShowConfirm] = useState(false)
  const quillRef = useRef<any>(null)
  const [alternativaFocada, setAlternativaFocada] = useState<string | null>(null)
  const alternativaRefs = useRef<Record<string, HTMLInputElement | null>>({})
  
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
      
      newData.turmasIds = [...new Set(selectedTurmasIds)]
    }

    setFormData(newData)
  }

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
  }

  const quillFormats = [
    'bold', 'italic', 'underline', 'list', 'bullet'
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

  const disciplinasPorSerie = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    disciplinas.forEach((d: any) => {
      const serie = d.serie || 'Outros'
      if (!grouped[serie]) grouped[serie] = []
      grouped[serie].push(d)
    })
    // Ordenar as chaves (séries)
    return Object.keys(grouped).sort().reduce((obj: any, key) => {
      obj[key] = grouped[key]
      return obj
    }, {})
  }, [disciplinas])
  
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
              {questao?.isCopy ? 'Criar Variação' : (questao ? 'Editar Questão' : 'Nova Questão Pedagógica')}
            </h2>
            <p className="text-sm text-gray-500">
              {questao?.isCopy ? 'Altere o que desejar para criar uma nova versão desta questão.' : 'Preencha os dados da questão para curadoria da coordenação.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 text-sm font-medium">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* Enunciado Rich Text */}
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

            {/* Unidade */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Info size={16} className="text-slate-700" />
                  Alocação da Unidade
                </label>
                <select
                  required
                  value={formData.unidade}
                  onChange={(e) => setFormData({...formData, unidade: e.target.value})}
                  className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-500 transition-all font-medium appearance-none cursor-pointer text-slate-900"
                >
                  <option value="">Selecione a Unidade Alvo...</option>
                  <option value="1">1ª Unidade</option>
                  <option value="2">2ª Unidade</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1 pl-1">Isso ajudará a gerar provas automaticamente filtrando pelas questões dessa unidade.</p>
              </div>
            </div>
          </div>

          {/* Alternativas */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 ml-1">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Alternativas de Resposta</h3>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 animate-in fade-in slide-in-from-right-4 duration-500">
                <CheckCircle2 size={14} />
                <span className="text-[10px] font-black uppercase tracking-tight">Clique na letra da questão correta</span>
              </div>
            </div>

            {/* Painel de símbolos para as alternativas */}
            <SimbolosPanel
              onInsert={(s) => {
                if (!alternativaFocada) return
                const el = alternativaRefs.current[alternativaFocada]
                if (!el) return
                const start = el.selectionStart ?? el.value.length
                const end = el.selectionEnd ?? el.value.length
                const newVal = el.value.substring(0, start) + s + el.value.substring(end)
                setFormData(prev => ({ ...prev, [`alternativa${alternativaFocada}`]: newVal }))
                requestAnimationFrame(() => {
                  el.selectionStart = el.selectionEnd = start + s.length
                  el.focus()
                })
              }}
            />

            <div className="grid gap-4">
              {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                <div key={letter} className="flex gap-4 items-center">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, correta: letter})}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-black transition-all ${
                      formData.correta === letter
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-blue-200'
                    }`}
                  >
                    {letter}
                  </button>
                  <input
                    required
                    type="text"
                    ref={(el) => { alternativaRefs.current[letter] = el }}
                    onFocus={() => setAlternativaFocada(letter)}
                    value={formData[`alternativa${letter}` as keyof typeof formData] as string}
                    onChange={(e) => setFormData({...formData, [`alternativa${letter}`]: e.target.value})}
                    placeholder={`Texto da alternativa ${letter}...`}
                    className={`flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all border-2 ${
                      alternativaFocada === letter ? 'border-blue-300 bg-blue-50/30' : 'border-gray-100'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Vínculo Inteligente Unificado */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-bold text-gray-700">Onde aplicar esta questão?</label>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                 <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Vincular a Diários</span>
              </div>
            </div>
            
            <p className="text-[11px] text-slate-500 font-medium ml-1">
              Selecione as disciplinas/turmas. Ao selecionar uma disciplina, o vínculo com a turma correspondente é feito automaticamente.
            </p>

            <div className="space-y-6">
              {Object.entries(disciplinasPorSerie).map(([serie, items]: [string, any]) => (
                <div key={serie} className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{serie}</span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((d: any) => (
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
                          {d.label || d.nome}
                        </button>
                        
                        {!formData.disciplinasIds.includes(d.id) && (
                          <button
                            type="button"
                            onClick={() => selectAllSameName(d.nome, d.serie)}
                            className="hidden group-hover:flex absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1.5 shadow-lg animate-in zoom-in-50 items-center justify-center z-10"
                            title={`Selecionar ${d.nome} em todos os ${d.serie}`}
                          >
                            <Plus size={10} strokeWidth={4} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {formData.disciplinasIds.length > 0 && (
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Users size={12} /> Turmas Vinculadas Automaticamente:
                </p>
                <div className="flex flex-wrap gap-2">
                  {turmas.filter((t: any) => formData.turmasIds.includes(t.id)).map((t: any) => (
                    <span key={t.id} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 shadow-sm animate-in zoom-in-90">
                      {t.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-white transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={20} />
            )}
            {questao ? 'Salvar Alterações' : 'Enviar Questão'}
          </button>
        </div>
      </div>

      {/* Modal de Confirmação para Edição */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6">
                 <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Salvar Edição?</h3>
              <p className="text-sm text-slate-500 font-medium mb-8">
                As alterações realizadas nesta questão serão aplicadas permanentemente. Deseja confirmar?
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
