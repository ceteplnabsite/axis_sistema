"use client"

import { useState } from "react"
import { X, Save, AlertCircle, Info, Image as ImageIcon, Calculator, Plus, CheckCircle2 } from "lucide-react"

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
  
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (formData.disciplinasIds.length === 0 || formData.turmasIds.length === 0) {
      setError('Selecione pelo menos uma disciplina e uma turma.')
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

    // Inteligência: Se selecionou disciplina, vincula a turma automaticamente
    if (field === 'disciplinasIds' && index === -1) {
      const disc = disciplinas.find((d: any) => d.id === id)
      if (disc && !formData.turmasIds.includes(disc.turmaId)) {
        newData.turmasIds = [...formData.turmasIds, disc.turmaId]
      }
    }

    setFormData(newData)
  }

  const selectAllSameName = (nome: string) => {
    const sameNamed = disciplinas.filter((d: any) => d.nome === nome)
    const newDiscIds = [...new Set([...formData.disciplinasIds, ...sameNamed.map((d: any) => d.id)])]
    const newTurmaIds = [...new Set([...formData.turmasIds, ...sameNamed.map((d: any) => d.turmaId)])]
    
    setFormData({
      ...formData,
      disciplinasIds: newDiscIds,
      turmasIds: newTurmaIds
    })
  }
  
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

          {/* Enunciado */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Enunciado da Questão</label>
            <textarea
              required
              rows={4}
              value={formData.enunciado}
              onChange={(e) => setFormData({...formData, enunciado: e.target.value})}
              placeholder="Digite o texto da questão aqui..."
              className="w-full bg-gray-50 border-gray-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all resize-none"
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
                    value={formData[`alternativa${letter}` as keyof typeof formData] as string}
                    onChange={(e) => setFormData({...formData, [`alternativa${letter}`]: e.target.value})}
                    placeholder={`Texto da alternativa ${letter}...`}
                    className="flex-1 bg-gray-50 border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Seleção de Turmas e Disciplinas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 ml-1">Vincular a Disciplinas</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                {disciplinas.map((d: any) => (
                  <div key={d.id} className="group relative">
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleSelection(d.id, 'disciplinasIds')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        formData.disciplinasIds.includes(d.id)
                        ? 'bg-blue-100 border-blue-200 text-blue-700'
                        : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {d.label}
                    </button>
                    {!formData.disciplinasIds.includes(d.id) && (
                      <button
                        type="button"
                        onClick={() => selectAllSameName(d.nome)}
                        className="hidden group-hover:block absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow-lg animate-in zoom-in-50"
                        title={`Selecionar ${d.nome} em todas as minhas turmas`}
                      >
                        <Plus size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 ml-1">Vincular a Turmas</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                {turmas.map((t: any) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleSelection(t.id, 'turmasIds')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      formData.turmasIds.includes(t.id)
                      ? 'bg-indigo-100 border-indigo-200 text-indigo-700'
                      : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {t.nome}
                  </button>
                ))}
              </div>
            </div>
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
