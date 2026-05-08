"use client"

import { useState } from "react"
import { CheckCircle2, UserPlus, Search, Clock, FileText, Check, Loader2, MessageSquare, Send, X } from "lucide-react"
import Link from "next/link"
import { resolvePendencia, responderPendencia, resolvePendenciasBulk } from "./actions"

export default function PendenciasClient({ pendencias }: { pendencias: any[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [showResolved, setShowResolved] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolvingGroup, setResolvingGroup] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<any | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [isSendingReply, setIsSendingReply] = useState(false)

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

  const parsedList = pendencias
    .filter(p => showResolved ? p.isResolved : !p.isResolved)
    .map(p => {
      return {
        id: p.id,
        isResolved: p.isResolved,
        date: new Date(p.createdAt).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        professor: p.sender.name || p.sender.username,
        turma: extractData(p.content, "Turma"),
        estudante: extractData(p.content, "Estudante") || p.subject.replace("[Cadastro Pendente] Estudante", "").trim(),
        matricula: extractData(p.content, "Matrícula"),
        observacao: extractData(p.content, "Observação do professor")
      }
    }).filter(p => 
      p.estudante.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.turma.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.professor.toLowerCase().includes(searchTerm.toLowerCase())
    )

  const handleResolve = async (id: string) => {
    setResolvingId(id)
    await resolvePendencia(id)
    setResolvingId(null)
  }

  const handleSendReply = async () => {
    if (!replyContent.trim() || !replyingTo) return
    
    setIsSendingReply(true)
    const res = await responderPendencia(replyingTo.id, replyContent)
    setIsSendingReply(false)
    
    if (res.success) {
      setReplyingTo(null)
      setReplyContent("")
    }
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
    await resolvePendenciasBulk(ids)
    setResolvingGroup(null)
  }

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
              Controle de Pendências
            </h1>
            <p className="text-slate-500 font-medium mt-1 ml-1">
              Gerencie solicitações de estudantes que precisam ser cadastrados.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link 
              href="/dashboard/estudantes/novo"
              className="flex-1 md:flex-none text-center bg-white text-slate-700 px-6 py-3 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              Novo Estudante
            </Link>
            <Link 
              href="/dashboard/estudantes/novo"
              className="flex-1 md:flex-none text-center bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
            >
              + Cadastrar
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
              onClick={() => setShowResolved(false)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${!showResolved ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Pendentes ({stats.pendentes})
            </button>
            <button 
              onClick={() => setShowResolved(true)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${showResolved ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Resolvidas ({stats.resolvidos})
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por estudante, turma ou professor..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-medium transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Grouped List */}
        <div className="space-y-8">
          {finalGroupedArray.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 border-dashed">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700">Nenhuma solicitação encontrada</h3>
              <p className="text-slate-500 mt-2">
                {showResolved ? "Não há solicitações marcadas como resolvidas ainda." : "Tudo em dia! Nenhuma pendência de cadastro no momento."}
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
                  {!showResolved && (
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
                  {group.items.map((item) => (
                    <div key={item.id} className={`bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center hover:shadow-md transition-all group ${item.isResolved ? 'opacity-75 grayscale-[0.3]' : ''}`}>
                      
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                          {item.isResolved ? (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100 flex items-center gap-1">
                              <Check size={12} /> Resolvido
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-rose-100">
                              Pendente
                            </span>
                          )}
                          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                            <Clock size={14} /> {item.date}
                          </span>
                        </div>
                        
                        <div>
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-slate-500">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-sm shadow-indigo-200"></div>
                              Turma: <strong className="text-slate-700">{item.turma}</strong>
                            </span>
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                              Matrícula Informada: <strong className="text-slate-700">{item.matricula || "N/A"}</strong>
                            </span>
                          </div>
                        </div>

                        {item.observacao && (
                          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm text-slate-600 flex items-start gap-3">
                            <FileText size={18} className="mt-0.5 shrink-0 text-slate-400" />
                            <p><strong className="text-slate-700">Observação do Professor:</strong> {item.observacao}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                            {item.professor.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            Solicitado por: <span className="text-slate-600">{item.professor}</span>
                          </p>
                        </div>
                      </div>

                      {!item.isResolved && (
                        <div className="w-full md:w-auto shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-8 flex flex-col gap-3">
                          <button
                            onClick={() => handleResolve(item.id)}
                            disabled={resolvingId === item.id}
                            className="w-full md:w-60 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50"
                          >
                            {resolvingId === item.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                            Marcar como Resolvido
                          </button>
                          <button
                            onClick={() => setReplyingTo(item)}
                            className="w-full md:w-60 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-4 rounded-2xl font-bold text-sm transition-all shadow-sm active:scale-95"
                          >
                            <MessageSquare className="w-5 h-5 text-indigo-500" />
                            Responder Professor
                          </button>
                        </div>
                      )}
                      
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Reply Modal */}
      {replyingTo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 flex items-center justify-between border-b bg-slate-50/50 border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Responder Professor</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Assunto: {replyingTo.estudante}</p>
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
