"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, UserPlus, Search, Clock, FileText, Check, Loader2, MessageSquare, Send, X, ChevronDown, ChevronUp, Tag, User, AlertCircle, Megaphone } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { resolvePendencia, responderPendencia, resolvePendenciasBulk, atualizarStatusPendencia } from "./actions"

export default function PendenciasClient({ 
  pendencias, 
  serverFilters,
  admins,
  currentUser
}: { 
  pendencias: any[],
  serverFilters: { showResolved: boolean, search?: string },
  admins: any[],
  currentUser: any
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [searchTerm, setSearchTerm] = useState(serverFilters.search || "")
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolvingGroup, setResolvingGroup] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<any | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [isSendingReply, setIsSendingReply] = useState(false)
  const [expandedPendencies, setExpandedPendencies] = useState<Set<string>>(new Set())
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, string | null>>({})


  const stats = {
    total: pendencias.length,
    resolvidos: pendencias.filter(p => p.isResolved).length,
    pendentes: pendencias.filter(p => !p.isResolved).length
  }
  
  const extractData = (content: string, field: string) => {
    const regex = new RegExp(`<strong>${field}:<\\/strong> (.*?)<\\/(?:li|p)>`)
    const match = content.match(regex)
    return match ? match[1].trim() : ""
  }

  const parsedList = pendencias.map(p => {
    return {
      id: p.id,
      isResolved: p.isResolved,
      status: p.status,
      internalStatus: optimisticStatuses[p.id] !== undefined ? optimisticStatuses[p.id] : p.internalStatus,
      date: new Date(p.createdAt).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      professor: p.sender.name || p.sender.username,
      turma: extractData(p.content, "Turma"),
      estudante: extractData(p.content, "Estudante") || p.subject.replace("[Cadastro Pendente] Estudante", "").trim(),
      matricula: extractData(p.content, "Matrícula"),
      observacao: extractData(p.content, "Observação do professor"),
      replies: p.replies || []
    }
  })

  const updateFilters = (newFilters: { status?: string, q?: string }) => {
    const params = new URLSearchParams(window.location.search)
    if (newFilters.status !== undefined) params.set('status', newFilters.status)
    if (newFilters.q !== undefined) {
      if (newFilters.q) params.set('q', newFilters.q)
      else params.delete('q')
    }
    
    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }

  const handleResolve = async (id: string) => {
    setResolvingId(id)
    const res = await resolvePendencia(id)
    setResolvingId(null)
    if (res.success) {
      startTransition(() => {
        router.refresh()
      })
    }
  }

  const handleSendReply = async () => {
    if (!replyContent.trim() || !replyingTo) return
    
    setIsSendingReply(true)
    const res = await responderPendencia(replyingTo.id, replyContent)
    setIsSendingReply(false)
    
    if (res.success) {
      setReplyingTo(null)
      setReplyContent("")
      startTransition(() => {
        router.refresh()
      })
    }
  }

  const handleStatusUpdate = async (id: string, status: string | null) => {
    setOptimisticStatuses(prev => ({ ...prev, [id]: status }))
    setUpdatingStatusId(id)
    const res = await atualizarStatusPendencia(id, status)
    setUpdatingStatusId(null)
    if (!res.success) {
      setOptimisticStatuses(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } else {
      startTransition(() => {
        router.refresh()
      })
    }
  }

  const toggleExpand = (id: string) => {
    const next = new Set(expandedPendencies)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedPendencies(next)
  }

  const groupedList = parsedList.reduce((acc, item) => {
    const key = item.estudante.toLowerCase().trim();
    if (!acc[key]) {
      acc[key] = {
        nome: item.estudante,
        items: []
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { nome: string, items: any[] }>);

  const finalGroupedArray = Object.values(groupedList).sort((a, b) => a.nome.localeCompare(b.nome));

  const handleResolveAll = async (ids: string[], groupName: string) => {
    setResolvingGroup(groupName)
    const res = await resolvePendenciasBulk(ids)
    setResolvingGroup(null)
    if (res.success) {
      startTransition(() => {
        router.refresh()
      })
    }
  }

  const templates = [
    { label: "Falta Matrícula", text: "Bom dia, pró! Tudo bem? Estou tentando cadastrar o aluno aqui, mas vi que falta o número da matrícula. Consegue me passar para eu finalizar o processo? Obrigada!" },
    { label: "Falta Turma", text: "Olá, recebemos sua solicitação mas não conseguimos identificar a turma correta do aluno. Poderia confirmar para nós?" },
    { label: "Dados Incorretos", text: "Olá! Os dados informados para este estudante não conferem com nossa base. Poderia conferir se o nome e matrícula estão corretos?" }
  ]

  const statusOptions = [
    { label: "Aguardando Matrícula", color: "bg-amber-100 text-amber-700" },
    { label: "Documentação Pendente", color: "bg-orange-100 text-orange-700" },
    { label: "Em Análise", color: "bg-blue-100 text-blue-700" },
    { label: "Dados Incorretos", color: "bg-rose-100 text-rose-700" }
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                <UserPlus size={24} />
              </div>
              Solicitações de Cadastro
            </h1>
            <p className="text-slate-500 font-medium mt-1 ml-1">
              Alunos não localizados pelos professores nas turmas.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link 
              href="/dashboard/estudantes/novo"
              className="flex-1 md:flex-none text-center bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
            >
              + Cadastrar Aluno
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
              <FileText size={28} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total</p>
              <h2 className="text-3xl font-black text-slate-800">{stats.total}</h2>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
              <Clock size={28} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pendentes</p>
              <h2 className="text-3xl font-black text-rose-600">{stats.pendentes}</h2>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Resolvidas</p>
              <h2 className="text-3xl font-black text-emerald-600">{stats.resolvidos}</h2>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => updateFilters({ status: 'pendente' })}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${!serverFilters.showResolved ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Pendências
            </button>
            <button 
              onClick={() => updateFilters({ status: 'resolvido' })}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${serverFilters.showResolved ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Histórico / Resolvidos
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por estudante, turma ou professor..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') updateFilters({ q: searchTerm })
              }}
              onBlur={() => updateFilters({ q: searchTerm })}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-medium transition-all shadow-sm"
            />
            {isPending && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 size={16} className="animate-spin text-indigo-500" />
              </div>
            )}
          </div>
        </div>

        {/* Grouped List */}
        <div className="space-y-8">
          {finalGroupedArray.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 border-dashed">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700">Nenhum chamado encontrado</h3>
              <p className="text-slate-500 mt-2">
                {serverFilters.showResolved ? "Não há chamados resolvidos ainda." : "Excelente! Não há chamados abertos no momento."}
              </p>
            </div>
          ) : (
            finalGroupedArray.map((group) => (
              <div key={group.nome} className="space-y-4">
                {/* Student Header */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{group.nome}</h2>
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {group.items.length} {group.items.length === 1 ? 'solicitação' : 'solicitações'}
                    </span>
                  </div>
                  {!serverFilters.showResolved && (
                    <button
                      onClick={() => handleResolveAll(group.items.map(i => i.id), group.nome)}
                      disabled={resolvingGroup !== null}
                      className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors flex items-center gap-2"
                    >
                      {resolvingGroup === group.nome ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Resolver Tudo
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {group.items.map((item) => {
                    const isExpanded = expandedPendencies.has(item.id)
                    return (
                      <div key={item.id} className={`bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all ${item.isResolved ? 'opacity-75 grayscale-[0.3]' : ''}`}>
                        <div className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                          <div className="flex-1 space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                                <Clock size={14} /> {item.date}
                              </span>
                              {item.internalStatus && (
                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border flex items-center gap-1.5 ${statusOptions.find(s => s.label === item.internalStatus)?.color || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                  <Tag size={10} /> {item.internalStatus}
                                </span>
                              )}
                            </div>
                            
                            <div>
                              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-slate-500">
                                <span className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-sm shadow-indigo-200"></div>
                                  Turma: <strong className="text-slate-700">{item.turma}</strong>
                                </span>
                                <span className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                                  Matrícula: <strong className="text-slate-700">{item.matricula || "N/A"}</strong>
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                    {item.professor.charAt(0).toUpperCase()}
                                  </div>
                                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                    De: <span className="text-slate-600">{item.professor}</span>
                                  </p>
                                </div>
                              </div>
                              
                              <button 
                                onClick={() => toggleExpand(item.id)}
                                className="text-xs font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-1 transition-colors"
                              >
                                {item.replies.length > 0 ? `${item.replies.length} ${item.replies.length === 1 ? 'Mensagem' : 'Mensagens'}` : 'Ver Detalhes'}
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </div>

                          {!item.isResolved && (
                            <div className="w-full md:w-auto shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-8 flex flex-col gap-3">
                              <button
                                onClick={() => handleResolve(item.id)}
                                disabled={resolvingId === item.id}
                                className="w-full md:w-64 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50"
                              >
                                {resolvingId === item.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                Resolver Chamado
                              </button>
                              <button
                                onClick={() => setReplyingTo(item)}
                                className="w-full md:w-64 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-sm active:scale-95"
                              >
                                <MessageSquare className="w-5 h-5 text-indigo-500" />
                                Responder Professor
                              </button>
                              
                              {/* Advanced Controls Dropdown */}
                              {isExpanded && (
                                <div className="grid grid-cols-1 gap-2 animate-in fade-in duration-300">
                                  <div className="flex gap-2">
                                    <div className="flex-1 flex flex-col gap-1">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Interno:</label>
                                      <select 
                                        value={item.internalStatus || ""}
                                        onChange={(e) => handleStatusUpdate(item.id, e.target.value || null)}
                                        className="w-full bg-slate-100 border-none rounded-xl px-3 py-2 text-[10px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                      >
                                        <option value="">Sem Status</option>
                                        {statusOptions.map(opt => (
                                          <option key={opt.label} value={opt.label}>{opt.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Details and Conversation History */}
                        {isExpanded && (
                          <div className="bg-slate-50 border-t border-slate-100 p-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                            {/* Original Observation */}
                            {item.observacao && (
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solicitação Original</h4>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 text-sm text-slate-600">
                                  {item.observacao}
                                </div>
                              </div>
                            )}

                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linha do Tempo / Conversa</h4>
                              {item.replies.length === 0 ? (
                                <p className="text-sm text-slate-400 italic">Nenhum evento registrado ainda.</p>
                              ) : (
                                <div className="space-y-4">
                                  {item.replies.map((reply: any) => (
                                    <div key={reply.id} className="flex gap-3 items-start">
                                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                                        {reply.sender.name?.charAt(0) || reply.sender.username.charAt(0)}
                                      </div>
                                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-1">
                                        <div className="flex justify-between items-center mb-2">
                                          <span className="text-[11px] font-bold text-slate-700">{reply.sender.name || reply.sender.username}</span>
                                          <span className="text-[10px] text-slate-400 font-medium">{new Date(reply.createdAt).toLocaleString('pt-BR')}</span>
                                        </div>
                                        <div className="text-sm text-slate-600 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: reply.content }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Reply Modal */}
      {replyingTo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 flex items-center justify-between border-b bg-slate-50/50 border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Responder Chamado</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Chamado #{replyingTo.id.slice(-6).toUpperCase()} - {replyingTo.estudante}</p>
                </div>
              </div>
              <button 
                onClick={() => setReplyingTo(null)} 
                className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Templates Section */}
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Mensagens Rápidas (Templates)</label>
                <div className="flex flex-wrap gap-2">
                  {templates.map(template => (
                    <button
                      key={template.label}
                      onClick={() => setReplyContent(template.text)}
                      className="px-4 py-2 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-xl border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Sua Resposta</label>
                <textarea
                  autoFocus
                  placeholder="Escreva aqui sua resposta para o professor..."
                  className="w-full h-40 bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:ring-0 outline-none transition-all placeholder:text-slate-400 resize-none"
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setReplyingTo(null)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={isSendingReply || !replyContent.trim()}
                  className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50"
                >
                  {isSendingReply ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Enviar Mensagem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
