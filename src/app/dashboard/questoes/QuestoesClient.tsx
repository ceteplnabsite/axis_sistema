"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MoreVertical,
  Edit2,
  Trash2,
  MessageSquare,
  ChevronDown,
  Info,
  Image as ImageIcon,
  Calculator,
  Copy,
  X,
  Layers,
  Zap,
  BookOpen
} from "lucide-react"
import { stripHtml } from "@/lib/text-utils"
import QuestaoForm from "./QuestaoForm"
import TeacherTipsModal from "@/components/TeacherTipsModal"

export default function QuestoesClient({ user, turmas, disciplinas, metrics }: any) {
  const [questoes, setQuestoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuestao, setEditingQuestao] = useState<any>(null)
  const [filters, setFilters] = useState({
    turmaId: '',
    disciplinaId: '',
    status: '',
    unidade: '',
    search: ''
  })
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const questaoTips = [
    {
      title: "Crie com Variedade",
      description: "Você pode adicionar textos longos e até 4 imagens por questão. Use o editor para formatar o enunciado e as alternativas com clareza.",
      icon: <ImageIcon className="w-10 h-10 text-rose-600" />,
      color: "bg-rose-600"
    },
    {
      title: "Organize por Turmas",
      description: "Vincule suas questões às turmas e disciplinas corretas. Isso facilita muito na hora de gerar uma prova específica mais tarde.",
      icon: <Layers className="w-10 h-10 text-indigo-600" />,
      color: "bg-indigo-600"
    },
    {
      title: "Gerador Automático",
      description: "Suas questões alimentam o Gerador de Provas. Basta selecionar o assunto e o sistema monta o exame para você em segundos.",
      icon: <Zap className="w-10 h-10 text-amber-500" />,
      color: "bg-amber-500"
    }
  ]

  const isAdmin = user.isSuperuser || user.isDirecao

  const fetchQuestoes = useCallback(async () => {
    setLoading(true)
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '')
    )
    const params = new URLSearchParams(activeFilters)
    try {
      const res = await fetch(`/api/questoes?${params.toString()}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setQuestoes(data)
      } else {
        console.error("API did not return an array:", data)
        setQuestoes([])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchQuestoes()
  }, [fetchQuestoes])

  const handleStatusUpdate = async (id: string, newStatus: string, feedback?: string) => {
    try {
      const res = await fetch(`/api/questoes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, feedbackAdmin: feedback })
      })
      if (res.ok) fetchQuestoes()
    } catch (error) {
      console.error(error)
    }
  }

  const handleBulkStatusUpdate = async (newStatus: string, feedback?: string) => {
    if (!confirm(`Deseja alterar o status de ${selectedIds.length} questões para ${newStatus}?`)) return
    
    setLoading(true)
    try {
      // Fazemos o update sequencial ou paralelo. Por simplicidade e segurança, paralelo aqui.
      await Promise.all(selectedIds.map(id => 
        fetch(`/api/questoes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, feedbackAdmin: feedback })
        })
      ))
      setSelectedIds([])
      fetchQuestoes()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta questão?')) return
    try {
      const res = await fetch(`/api/questoes/${id}`, { method: 'DELETE' })
      if (res.ok) fetchQuestoes()
    } catch (error) {
      console.error(error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APROVADA':
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold"><CheckCircle2 size={14} /> Aprovada</span>
      case 'REJEITADA':
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold"><XCircle size={14} /> Rejeitada</span>
      default:
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold"><Clock size={14} /> Pendente</span>
    }
  }

  const getDificuldadeColor = (nivel: string) => {
    switch (nivel) {
      case 'FACIL': return 'text-green-500'
      case 'MEDIO': return 'text-amber-500'
      case 'DIFICIL': return 'text-rose-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 space-y-10">
      <TeacherTipsModal 
        storageKey="seen_tips_questoes"
        title="Dicas do Banco"
        tips={questaoTips}
      />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Banco de Questões</h1>
          <p className="text-gray-500">
            {isAdmin 
              ? "Gerencie e faça a curadoria das questões enviadas pelos professores." 
              : "Envie suas questões e acompanhe o processo de aprovação pela coordenação."}
          </p>
        </div>
        <button
          onClick={() => { setEditingQuestao(null); setShowForm(true); }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          <Plus size={20} />
          Nova Questão
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-blue-50 text-slate-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Search size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total no Banco</p>
            <p className="text-2xl font-black text-gray-900">{metrics.totalAprovadas}</p>
            <p className="text-[10px] text-gray-400 font-medium">Questões prontas para uso</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{isAdmin ? "Total Aprovadas" : "Minhas Questões"}</p>
            <p className="text-2xl font-black text-gray-900">{isAdmin ? metrics.totalAprovadas : metrics.minhasQuestoes}</p>
            <p className="text-[10px] text-gray-400 font-medium">{isAdmin ? "Global no sistema" : "Enviadas por você"}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Aguardando Revisão</p>
            <p className="text-2xl font-black text-gray-900">{metrics.totalPendentes}</p>
            <p className="text-[10px] text-gray-400 font-medium">Pendentes de aprovação</p>
          </div>
        </div>
      </div>

      {/* Filtros Premium */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-2 rounded-[2rem] border border-slate-200 shadow-sm">
        {/* Search Input */}
        <div className="flex-1 relative group self-stretch md:self-auto min-w-[280px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-slate-700 transition-colors" />
          <input
            type="text"
            placeholder="Pesquisar por enunciado..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-transparent rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none font-medium"
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
        </div>

        {/* Dropdowns & Reset */}
        <div className="flex flex-wrap items-center gap-2 px-2 pb-2 md:pb-0">
          <select 
            value={filters.turmaId}
            onChange={(e) => setFilters({...filters, turmaId: e.target.value, disciplinaId: ''})}
            className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <option value="">Todas as Turmas</option>
            {turmas.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>

          <select 
            value={filters.disciplinaId}
            onChange={(e) => setFilters({...filters, disciplinaId: e.target.value})}
            className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <option value="">Disciplinas</option>
            {disciplinas
              .filter((d: any) => !filters.turmaId || d.turmaId === filters.turmaId)
              .map((d: any) => <option key={d.id} value={d.id}>{d.label || d.nome}</option>)}
          </select>

          <select 
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <option value="">Status</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="APROVADA">Aprovadas</option>
            <option value="REJEITADA">Rejeitadas</option>
          </select>

          <select 
            value={filters.unidade || ''}
            onChange={(e) => setFilters({...filters, unidade: e.target.value})}
            className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <option value="">Unidades</option>
            <option value="1">1ª Unidade</option>
            <option value="2">2ª Unidade</option>
          </select>

          {(filters.search || filters.turmaId || filters.disciplinaId || filters.status || filters.unidade) && (
            <button 
              onClick={() => setFilters({ turmaId: '', disciplinaId: '', status: '', unidade: '', search: '' })}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all group"
              title="Limpar filtros"
            >
              <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Ações em Massa */}
      {selectedIds.length > 0 && isAdmin && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-blue-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-3 pr-6 border-r border-slate-700">
            <div className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
              {selectedIds.length}
            </div>
            <span className="text-sm font-medium">Selecionadas</span>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => handleBulkStatusUpdate('APROVADA')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm font-bold transition-all"
            >
              <CheckCircle2 size={18} /> Aprovar Todas
            </button>
            <button 
              onClick={() => {
                const fb = prompt('Motivo do veto em massa:')
                if (fb) handleBulkStatusUpdate('REJEITADA', fb)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 rounded-xl text-sm font-bold transition-all"
            >
              <X size={18} /> Vetar Todas
            </button>
            <button 
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de Questões */}
      <div className="grid gap-8">
        {loading ? (
          <div className="p-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Carregando questões...</p>
          </div>
        ) : questoes.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={40} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Nenhuma questão encontrada</h3>
            <p className="text-gray-500 mt-2">Tente ajustar os filtros ou cadastre sua primeira questão.</p>
          </div>
        ) : (
          questoes.map((q: any) => (
            <div key={q.id} className={`bg-white rounded-2xl shadow-sm border transition-all hover:shadow-md relative overflow-hidden ${
              q.status === 'REJEITADA' ? 'border-rose-100' : 'border-gray-100'
            }`}>
              {/* Checkbox de Seleção (Apenas Admin) */}
              {isAdmin && (
                <div className="absolute top-6 left-4 z-10">
                  <input 
                    type="checkbox"
                    checked={selectedIds.includes(q.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds([...selectedIds, q.id])
                      else setSelectedIds(selectedIds.filter(id => id !== q.id))
                    }}
                    className="w-5 h-5 rounded-md border-gray-300 text-slate-700 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              )}

              <div className={`p-6 ${isAdmin ? 'pl-14' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-wrap gap-3">
                    {getStatusBadge(q.status)}

                    {q.unidade && (
                      <span className="text-[10px] font-black uppercase px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {q.unidade}ª Unidade
                      </span>
                    )}
                    {q.imagemUrl && <span className="text-gray-400"><ImageIcon size={16} /></span>}
                    {q.muleta && <span className="text-gray-400"><Calculator size={16} /></span>}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isAdmin && q.status === 'PENDENTE' && (
                      <div className="flex gap-2 mr-4">
                        <button 
                          onClick={() => handleStatusUpdate(q.id, 'APROVADA')}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Aprovar questão"
                        >
                          <CheckCircle2 size={20} />
                        </button>
                        <button 
                          onClick={() => {
                            const fb = prompt('Motivo do veto:')
                            if (fb) handleStatusUpdate(q.id, 'REJEITADA', fb)
                          }}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                           title="Vetar questão"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    )}

                    {!isAdmin && q.status !== 'APROVADA' && (
                      <button 
                        onClick={() => { setEditingQuestao(q); setShowForm(true); }}
                        className="p-2 text-slate-700 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar questão"
                      >
                        <Edit2 size={18} />
                      </button>
                    )}

                    {/* Botão de Duplicar (Para todos) */}
                    <button 
                      onClick={() => { 
                        const { id, createdAt, updatedAt, status, feedbackAdmin, ...content } = q;
                        setEditingQuestao({ ...content, isCopy: true }); 
                        setShowForm(true); 
                      }}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Duplicar e criar variação"
                    >
                      <Copy size={18} />
                    </button>

                    {(!isAdmin && q.status !== 'APROVADA') || isAdmin ? (
                      <button 
                        onClick={() => handleDelete(q.id)}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <div 
                      className="text-gray-800 font-medium leading-relaxed ql-editor !p-0"
                      dangerouslySetInnerHTML={{ __html: q.enunciado }}
                    />
                    {q.imagemUrl && (
                      <div className="mt-3 relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                        <img 
                          src={q.imagemUrl} 
                          alt="Imagem da questão" 
                          className="max-h-64 object-contain mx-auto"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                      <div key={letter} className={`p-3 rounded-xl border text-sm flex gap-3 ${
                        q.correta === letter ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-50/50 border-gray-100 text-gray-600'
                      }`}>
                        <span className="font-bold">{letter})</span>
                        <span>{q[`alternativa${letter}`]}</span>
                      </div>
                    ))}
                  </div>

                  {q.feedbackAdmin && (
                    <div className="mt-4 p-4 bg-rose-50 rounded-xl border border-rose-100 flex gap-3 items-start">
                      <MessageSquare className="text-rose-500 shrink-0" size={18} />
                      <div>
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <p className="text-xs font-bold text-rose-700 uppercase flex items-center gap-2">
                             Feedback de: <span className="text-rose-900 bg-rose-200/50 px-2 py-0.5 rounded text-[10px]">{q.adminFeedback?.name || 'Coordenação'}</span>
                          </p>
                          <span className="text-[10px] text-rose-400 font-medium bg-white/50 px-2 py-0.5 rounded border border-rose-100/50">
                            {new Date(q.updatedAt).toLocaleString('pt-BR', { 
                              day: '2-digit', month: '2-digit', year: 'numeric', 
                              hour: '2-digit', minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-rose-800 font-medium italic pl-2 border-l-2 border-rose-300">"{q.feedbackAdmin}"</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-50 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-400">
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1 font-medium text-gray-500">
                      <Plus size={14} /> Professor: {q.professor.name}
                    </span>
                    <span>• {new Date(q.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {q.disciplinas.map((d: any) => (
                      <span key={d.id} className="bg-blue-50 text-slate-700 px-2 py-1 rounded-lg font-bold uppercase tracking-tighter border border-blue-100 flex items-center gap-1.5 shadow-sm">
                        <BookOpen size={10} className="text-blue-400" />
                        {d.nome} <span className="text-blue-400">({d.turma?.nome})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <QuestaoForm 
          questao={editingQuestao}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchQuestoes(); }}
          turmas={turmas}
          disciplinas={disciplinas}
        />
      )}
    </div>
  )
}
