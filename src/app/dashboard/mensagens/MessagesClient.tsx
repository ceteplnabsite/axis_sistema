"use client"

import { useState, useEffect, useMemo, useTransition } from "react"
import { 
  MessageSquare, 
  Send, 
  Inbox, 
  User, 
  Search, 
  CheckCheck, 
  AlertCircle,
  Megaphone,
  LifeBuoy,
  Plus,
  ArrowLeft,
  Clock,
  MoreVertical,
  X,
  Tag,
  Check,
  Loader2,
  ChevronRight,
  Pin
} from "lucide-react"
import RichTextEditor from "@/components/RichTextEditor"
import ComunicadoPainel from "./ComunicadoPainel"
import MarkdownContent from "@/components/MarkdownContent"
import { sendMessage, markAsRead, getMessageThread, deleteMessage, markAllAsRead, getFilaChamados, getResumoFila, updateTicketStatus } from "./actions"
import PainelFila from "./PainelFila"
import { atendeCategoria, ehChamado, situacaoDaMensagem, tempoEsperando, MOTIVO_FECHAMENTO_AUTOMATICO, MOTIVO_LIMPEZA_ANTIGOS } from "@/lib/chamados-regras"
import type { FiltroFila, ResumoChamados } from "@/lib/chamados"
import { useRouter } from "next/navigation"

/** Campos que o rótulo de status do chamado usa */
type MsgChamado = {
  category: string; status: string; senderId: string; createdAt: string | Date
  respondido?: boolean; assignedToId?: string | null; fechamento?: string | null
  replies?: { senderId: string; createdAt: string | Date }[]
}

/** Formata data/hora sempre no fuso de Brasília */
const TIMEZONE = 'America/Sao_Paulo'

function formatarData(val: Date | string): string {
  return new Date(val).toLocaleDateString('pt-BR', { timeZone: TIMEZONE, day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatarHora(val: Date | string): string {
  return new Date(val).toLocaleTimeString('pt-BR', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' })
}

export default function MessagesClient({ 
  receivedMessages, 
  sentMessages,
  users,
  turmas = [],
  currentUserRole,
  currentUserId,
  resumoFila = null,
  filaInicial = null
}: { 
  receivedMessages: any[], 
  sentMessages: any[],
  users: any[],
  turmas?: any[],
  currentUserRole: { isSuperuser: boolean, isDirecao: boolean, isStaff: boolean }
  currentUserId: string
  resumoFila?: ResumoChamados | null
  filaInicial?: FiltroFila | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // States
  const [activeTab, setActiveTab] = useState<"inbox" | "sent" | "new">("inbox")
  const [inboxMessages, setInboxMessages] = useState<any[]>(receivedMessages)
  const [sentMessagesList, setSentMessagesList] = useState<any[]>(sentMessages)
  const [selectedMessage, setSelectedMessage] = useState<any>(null)

  // ── Fila de chamados (quem atende) ──
  const [resumo, setResumo] = useState<ResumoChamados | null>(resumoFila)
  const [filtroFila, setFiltroFila] = useState<FiltroFila | null>(resumoFila ? filaInicial : null)
  const [listaFila, setListaFila] = useState<typeof receivedMessages | null>(null)
  const [carregandoFila, setCarregandoFila] = useState(false)
  useEffect(() => {
    if (!filtroFila) { setListaFila(null); return }
    let vivo = true
    setCarregandoFila(true)
    getFilaChamados(filtroFila).then(l => { if (vivo) setListaFila(l) }).finally(() => { if (vivo) setCarregandoFila(false) })
    return () => { vivo = false }
  }, [filtroFila])
  const atualizarFila = () => {
    getResumoFila().then(r => setResumo(r))
    if (filtroFila) getFilaChamados(filtroFila).then(setListaFila)
    router.refresh()
  }
  const atendo = (msg: { category?: string } | null) => atendeCategoria({ id: currentUserId, ...currentUserRole }, msg?.category)

  /** Rótulo do status do chamado conforme quem está vendo */
  const rotuloChamado = (msg: MsgChamado, conversa?: { senderId: string; createdAt: string | Date }[]) => {
    if (!ehChamado(msg?.category)) return null
    const { situacao, atrasado, horasEsperando } = situacaoDaMensagem(msg, conversa)
    const souEquipe = atendo(msg) && msg.senderId !== currentUserId
    const base = 'px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border'
    if (situacao === 'RESOLVIDO') return {
      texto: msg.fechamento === MOTIVO_FECHAMENTO_AUTOMATICO ? 'Resolvido · sem retorno'
        : msg.fechamento === MOTIVO_LIMPEZA_ANTIGOS ? 'Encerrado' : 'Resolvido',
      classe: msg.fechamento === MOTIVO_LIMPEZA_ANTIGOS ? `${base} bg-slate-50 text-slate-600 border-slate-200` : `${base} bg-emerald-50 text-emerald-700 border-emerald-200`,
      atraso: null, situacao }
    if (situacao === 'AGUARDANDO_SOLICITANTE') return souEquipe
      ? { texto: 'Aguardando solicitante', classe: `${base} bg-slate-50 text-slate-600 border-slate-200`, atraso: null, situacao }
      : { texto: 'Aguardando você', classe: `${base} bg-amber-100 text-amber-800 border-amber-300`, atraso: null, situacao }
    const texto = souEquipe
      ? (situacao === 'NOVO' ? 'Novo' : 'Aguardando equipe')
      : (msg.assignedToId || situacao === 'AGUARDANDO_EQUIPE' ? 'Em atendimento' : 'Enviado')
    return {
      texto, situacao,
      classe: `${base} ${souEquipe ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`,
      atraso: souEquipe && atrasado ? `Sem resposta ${tempoEsperando(horasEsperando)}` : null
    }
  }
  const [threadMessages, setThreadMessages] = useState<any[]>([])
  
  const [newMsgSubject, setNewMsgSubject] = useState("")
  const [predefinedSubject, setPredefinedSubject] = useState("")
  const [newMsgContent, setNewMsgContent] = useState("")
  const isTeacherOnly = currentUserRole.isStaff && !currentUserRole.isSuperuser && !currentUserRole.isDirecao
  const [newMsgCategory, setNewMsgCategory] = useState(isTeacherOnly ? "SUPORTE" : "GERAL")
  const [newMsgReceiver, setNewMsgReceiver] = useState("")
  const [newMsgPriority, setNewMsgPriority] = useState("MEDIA")
  const [requerCiencia, setRequerCiencia] = useState(false)
  const [fixarComunicado, setFixarComunicado] = useState(false)
  const podeGerirComunicados = currentUserRole.isSuperuser || currentUserRole.isDirecao
  const ehComunicado = newMsgCategory === "COMUNICADO" || newMsgCategory.startsWith("COMUNICADO_")

  /** Para quem a mensagem foi enviada (lista de enviadas) */
  const rotuloDestino = (msg: { receiver?: { name?: string | null } | null; receiverId?: string | null; category?: string }): string => {
    if (msg.receiver?.name) return msg.receiver.name
    const r: string | null = msg.receiverId ?? null
    if (r === 'GROUP_TEACHERS') return 'Professores'
    if (r === 'GROUP_DIRECAO') return 'Direção'
    if (r === 'GROUP_STUDENTS') return 'Estudantes'
    if (r?.startsWith('TURMA_')) {
      const nome = turmas?.find(t => t.id === r.slice(6))?.nome
      return nome ? `Professores da ${nome}` : 'Professores de uma turma'
    }
    if (msg.category === 'SUPORTE') return 'Suporte técnico'
    if (msg.category === 'DIRECAO') return 'Direção'
    return msg.category === 'COMUNICADO' ? 'Todos' : 'Geral'
  }
  const [sending, setSending] = useState(false)
  const [replying, setReplying] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  
  const [selectedTurmaId, setSelectedTurmaId] = useState("")
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState("")
  const [selectedEstudanteId, setSelectedEstudanteId] = useState("")
  const [turmaDetails, setTurmaDetails] = useState<{disciplinas: any[], estudantes: any[]}>({ disciplinas: [], estudantes: [] })

  useEffect(() => {
    if (selectedTurmaId) {
        import('./actions').then(m => m.getTurmaDetails(selectedTurmaId)).then(setTurmaDetails)
    } else {
        setTurmaDetails({ disciplinas: [], estudantes: [] })
    }
  }, [selectedTurmaId])
  
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(receivedMessages.length === 20 || sentMessages.length === 20)

  useEffect(() => {
    setInboxMessages(receivedMessages)
    setSentMessagesList(sentMessages)
  }, [receivedMessages, sentMessages])

  const filteredBySearchAndCategory = useMemo(() => {
    let list: any[] = activeTab === "inbox" ? (filtroFila && listaFila ? listaFila : inboxMessages) : sentMessagesList
    
    if (filterCategory !== "ALL") {
        list = list.filter((m: any) => m.category === filterCategory)
    }

    // comunicados fixados sempre no topo
    list = [...list].sort((a: { fixado?: boolean }, b: { fixado?: boolean }) => Number(!!b.fixado) - Number(!!a.fixado))
    if (!searchQuery) return list
    return list.filter((m: any) => 
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.sender?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [activeTab, inboxMessages, sentMessagesList, searchQuery, filterCategory, filtroFila, listaFila])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const { getMessages } = await import('./actions')
      const { received, sent } = await getMessages({ page: nextPage, limit: 20 })
      
      if (received.length === 0 && sent.length === 0) {
        setHasMore(false)
      } else {
        setInboxMessages(prev => {
            const newItems = received.filter((r: any) => !prev.some(p => p.id === r.id))
            return [...prev, ...newItems].sort((a: any, b: any) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
        })
        setSentMessagesList(prev => {
            const newItems = sent.filter((s: any) => !prev.some(p => p.id === s.id))
            return [...prev, ...newItems].sort((a: any, b: any) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
        })
        setPage(nextPage)
        if (received.length < 20 && sent.length < 20) setHasMore(false)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMore(false)
    }
  }

  const [loadingThread, setLoadingThread] = useState(false)

  const handleSelectMessage = async (msg: any) => {
    setSelectedMessage(msg)
    setThreadMessages([msg])
    setLoadingThread(true)
    
    if (activeTab === "inbox" && !msg.isRead) {
      setInboxMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m))
      markAsRead(msg.id).catch(err => console.error("Erro ao marcar como lida:", err))
    }

    try {
      const { getMessageThread } = await import('./actions')
      const thread = await getMessageThread(msg.id)
      setThreadMessages(thread)
    } finally {
      setLoadingThread(false)
    }
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    let finalSubject = newMsgSubject;
    if (newMsgCategory === "SUPORTE" || newMsgCategory === "DIRECAO") {
        if (!predefinedSubject) return;
        const details = [];
        if (selectedTurmaId) details.push(turmas?.find(t => t.id === selectedTurmaId)?.nome || selectedTurmaId)
        if (selectedDisciplinaId) details.push(turmaDetails.disciplinas.find(d => d.id === selectedDisciplinaId)?.nome || selectedDisciplinaId)
        if (selectedEstudanteId) details.push(turmaDetails.estudantes.find(s => s.id === selectedEstudanteId)?.nome || selectedEstudanteId)
        
        const detailsStr = details.length > 0 ? ` - ${details.join(' | ')}` : '';
        finalSubject = `[${predefinedSubject}] ${newMsgSubject ? newMsgSubject : ''}${detailsStr}`.trim()
    }

    if (!finalSubject || !newMsgContent || sending) return
    if (newMsgCategory === "COMUNICADO_TURMA" && !newMsgReceiver) return

    setSending(true)
    const formData = new FormData()
    formData.append("subject", finalSubject)
    formData.append("content", newMsgContent)
    formData.append("priority", newMsgPriority)
    if (ehComunicado) {
      formData.append("requerCiencia", String(requerCiencia))
      formData.append("fixado", String(fixarComunicado && podeGerirComunicados))
    }
    
    if (newMsgCategory.startsWith("COMUNICADO_")) {
        formData.append("category", "COMUNICADO")
        if (newMsgCategory === "COMUNICADO_ESTUDANTES") formData.append("receiverId", "GROUP_STUDENTS")
        if (newMsgCategory === "COMUNICADO_PROFESSORES") formData.append("receiverId", "GROUP_TEACHERS")
        if (newMsgCategory === "COMUNICADO_TURMA") formData.append("receiverId", `TURMA_${newMsgReceiver}`)
    } else {
        formData.append("category", newMsgCategory)
        if (newMsgCategory === "GERAL") formData.append("receiverId", newMsgReceiver)
    }
    
    const res = await sendMessage(formData)
    setSending(false)

    if (res?.success) {
      setNewMsgSubject("")
      setPredefinedSubject("")
      setNewMsgContent("")
      setNewMsgCategory(isTeacherOnly ? "SUPORTE" : "GERAL")
      setNewMsgReceiver("")
      setSelectedTurmaId("")
      setSelectedDisciplinaId("")
      setSelectedEstudanteId("")
      setRequerCiencia(false)
      setFixarComunicado(false)
      setActiveTab("sent")
      startTransition(() => {
        router.refresh()
      })
    }
  }

  const handleQuickReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim() || !selectedMessage || replying) return

    const content = replyContent.trim()
    setReplying(true)
    setReplyContent("")

    try {
        const rootId = selectedMessage.id
        let targetReceiverId = ""
        const lastOther = [...threadMessages].reverse().find(m => m.senderId !== currentUserId)
        if (lastOther) targetReceiverId = lastOther.senderId
        else if (selectedMessage.senderId !== currentUserId) targetReceiverId = selectedMessage.senderId

        const formData = new FormData()
        formData.append("subject", `Re: ${selectedMessage.subject}`)
        formData.append("content", content)
        formData.append("category", selectedMessage.category)
        if (rootId) formData.append("parentId", rootId)
        if (targetReceiverId) formData.append("receiverId", targetReceiverId)

        const res = await sendMessage(formData)
        if (res?.success) {
            const newThread = await getMessageThread(selectedMessage.id)
            setThreadMessages(newThread)
            if (ehChamado(selectedMessage.category)) {
              const souSolicitante = selectedMessage.senderId === currentUserId
              const novo = souSolicitante
                ? { status: selectedMessage.assignedToId ? 'EM_ATENDIMENTO' : 'ABERTO', isResolved: false, fechamento: null }
                : { status: 'AGUARDANDO_RESPOSTA', isResolved: false, fechamento: null, assignedToId: selectedMessage.assignedToId ?? currentUserId, assignedTo: selectedMessage.assignedTo ?? { name: 'Você' } }
              setSelectedMessage((m: any) => ({ ...m, ...novo }))
              atualizarFila()
            }
        } else if (res?.error) {
            setReplyContent(content)
            alert(res.error)
        }
    } finally {
        setReplying(false)
    }
  }

  const getCatStyles = (cat: string) => {
    switch(cat) {
      case "COMUNICADO": return { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500", border: "border-amber-100", label: "📢 Comunicado" }
      case "SUPORTE": return { bg: "bg-indigo-50", text: "text-indigo-600", dot: "bg-indigo-500", border: "border-indigo-100", label: "🛠️ Chamado Técnico" }
      case "DIRECAO": return { bg: "bg-purple-50", text: "text-purple-600", dot: "bg-purple-500", border: "border-purple-100", label: "🏛️ Chamado Direção" }
      default: return { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500", border: "border-emerald-100", label: "💬 Mensagem Geral" }
    }
  }

  const rotuloAberto = selectedMessage ? rotuloChamado(selectedMessage, loadingThread ? undefined : threadMessages) : null
  const podeMudarStatus = !!selectedMessage && ehChamado(selectedMessage.category) && (atendo(selectedMessage) || selectedMessage.senderId === currentUserId)
  const mudarStatus = async (status: 'RESOLVIDO' | 'ABERTO') => {
    const r = await updateTicketStatus(selectedMessage.id, status)
    if (r && 'status' in r && r.status) {
      const novo = { status: r.status, isResolved: status === 'RESOLVIDO', fechamento: null }
      setSelectedMessage((m: any) => ({ ...m, ...novo }))
      setInboxMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, ...novo } : m))
      setSentMessagesList(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, ...novo } : m))
      atualizarFila()
    }
  }

  const priorities = [
    { value: "BAIXA", label: "Baixa", color: "text-slate-400" },
    { value: "MEDIA", label: "Média", color: "text-blue-500" },
    { value: "ALTA", label: "Alta", color: "text-orange-500 font-bold" },
    { value: "CRITICA", label: "Crítica", color: "text-rose-600 font-black" }
  ]

  return (
    <div className="flex flex-col bg-white rounded-[2.5rem] shadow-2xl shadow-slate-300/40 border border-slate-200 min-h-[calc(100vh-180px)] overflow-hidden animate-in fade-in duration-500">
      
      {/* View 1: Listagem de Chamados (Full Width) */}
      {!selectedMessage && activeTab !== 'new' && (
        <div className="flex flex-col h-full bg-slate-50/20">
          <div className="p-8 md:px-12 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Painel de Chamados</h2>
              <button 
                onClick={async () => {
                  startTransition(async () => {
                    await markAllAsRead()
                    setInboxMessages(prev => prev.map(m => ({ ...m, isRead: true })))
                    router.refresh()
                  })
                }}
                disabled={isPending}
                className="text-xs font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-colors mt-3 flex items-center gap-2"
              >
                <CheckCheck size={14} /> Marcar todos como lidos
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab("inbox")}
                  className={`px-8 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === 'inbox' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Fila de Chamados
                </button>
                <button
                  onClick={() => setActiveTab("sent")}
                  className={`px-8 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === 'sent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Meus Chamados
                </button>
              </div>
              <button
                onClick={() => { setActiveTab("new"); setSelectedMessage(null); }}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2 font-bold text-sm"
              >
                <Plus size={18} /> Novo Chamado
              </button>
            </div>
          </div>

          <div className="p-8 md:px-12">
            {activeTab === 'inbox' && resumo && (
              <PainelFila resumo={resumo} filtro={filtroFila} onFiltro={setFiltroFila} />
            )}
            <div className="relative max-w-md mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Buscar ticket por assunto ou remetente..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBySearchAndCategory.map((msg: any) => {
                const style = getCatStyles(msg.category)
                const isUnread = !msg.isRead && activeTab === 'inbox'
                const rotulo = rotuloChamado(msg)
                const priorityData = priorities.find(p => p.value === msg.priority) || priorities[1]

                return (
                  <div 
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`group p-6 rounded-[2rem] cursor-pointer transition-all border flex flex-col justify-between min-h-[160px] ${
                      isUnread 
                        ? 'bg-indigo-50/40 border-indigo-200 shadow-md shadow-indigo-100/50' 
                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100/40'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${style.bg} ${style.text} ${style.border}`}>
                            {style.label}
                          </span>
                          {rotulo && <span className={rotulo.classe}>{rotulo.texto}</span>}
                          {rotulo?.atraso && (
                            <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"><Clock size={10} /> {rotulo.atraso}</span>
                          )}
                          {msg.fixado && (
                            <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white flex items-center gap-1"><Pin size={10} /> Fixado</span>
                          )}
                          {msg.category === 'COMUNICADO' && msg.requerCiencia && msg.senderId !== currentUserId && !msg.ciencias?.length && (
                            <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-800 border border-amber-200">Ciência pendente</span>
                          )}
                          {msg.category === 'COMUNICADO' && msg.requerCiencia && msg.senderId === currentUserId && (
                            <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-700 border border-slate-200">{msg._count?.ciencias ?? 0} {(msg._count?.ciencias ?? 0) === 1 ? 'ciente' : 'cientes'}</span>
                          )}
                        </div>
                        {isUnread && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Não lida</span>
                          </div>
                        )}
                      </div>
                      
                      <h4 className={`text-base leading-tight mb-2 ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`}>
                        {msg.ticketNumber && msg.category !== 'COMUNICADO' ? <span className="text-indigo-500 mr-2">#{msg.ticketNumber}</span> : ''}
                        {msg.subject.replace(/\[Ticket\]|\[Cadastro Pendente\]/gi, '').trim() || 'Sem Assunto'}
                      </h4>
                      
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                           {activeTab === 'inbox' ? (msg.sender?.name?.charAt(0) || msg.sender?.username?.charAt(0)) : (rotuloDestino(msg).charAt(0))}
                        </div>
                        <span className="text-xs font-medium text-slate-500 truncate">
                          {activeTab === 'inbox' ? (msg.sender?.name || msg.sender?.username) : rotuloDestino(msg)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100/80">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${priorityData.color}`}>
                        {msg.category === 'COMUNICADO' ? '' : `Prio: ${priorityData.label}`}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {formatarData(msg.updatedAt || msg.createdAt)}
                      </span>
                    </div>
                  </div>
                )
              })}
              
              {filteredBySearchAndCategory.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                    <Inbox className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-black text-slate-700">Nenhum chamado encontrado</h3>
                  <p className="text-sm font-medium text-slate-400 mt-2">Você não tem chamados pendentes nesta categoria.</p>
                </div>
              )}
            </div>

            {carregandoFila && (
              <div className="flex justify-center py-8 text-slate-400"><Loader2 className="animate-spin" /></div>
            )}
            {hasMore && filteredBySearchAndCategory.length > 0 && !searchQuery && !(activeTab === 'inbox' && filtroFila) && (
              <div className="flex justify-center mt-12 mb-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <><Loader2 size={16} className="animate-spin" /> Carregando...</>
                  ) : (
                    "Carregar mais antigos"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View 2: Criação de Novo Chamado (Full Width) */}
      {activeTab === "new" && (
        <div className="flex-1 flex flex-col bg-slate-50/30 overflow-y-auto">
          <div className="px-8 py-6 bg-white border-b border-slate-100 flex items-center gap-4 sticky top-0 z-10">
            <button onClick={() => setActiveTab("inbox")} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{ehComunicado ? 'Novo Comunicado' : 'Abrir Novo Chamado'}</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">{ehComunicado ? 'Chega para todo o público escolhido' : 'Preencha os detalhes do seu ticket'}</p>
            </div>
          </div>

          <div className="flex-1 p-8 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8 bg-white p-8 md:p-10 rounded-[2rem] shadow-sm border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoria / Departamento</label>
                  <select 
                    value={newMsgCategory} 
                    onChange={e => setNewMsgCategory(e.target.value)}
                    className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                  >
                    <option value="SUPORTE">Suporte Técnico (Sistema)</option>
                    <option value="DIRECAO">Direção (Pedagógico)</option>
                    {(currentUserRole.isDirecao || currentUserRole.isSuperuser) && (
                      <>
                        <option value="GERAL">Mensagem Privada</option>
                        <option value="COMUNICADO">Comunicado para todos</option>
                        <option value="COMUNICADO_PROFESSORES">Comunicado para professores</option>
                      </>
                    )}
                    <option value="COMUNICADO_TURMA">Aviso para os professores de uma turma</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Nível de Urgência</label>
                  <select 
                    value={newMsgPriority} 
                    onChange={e => setNewMsgPriority(e.target.value)}
                    className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                  >
                    <option value="BAIXA">Baixa (Pode esperar)</option>
                    <option value="MEDIA">Normal</option>
                    <option value="ALTA">Alta (Importante)</option>
                    <option value="CRITICA">Crítica (Impedimento)</option>
                  </select>
                </div>

                {newMsgCategory === "COMUNICADO_TURMA" && (
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Turma</label>
                    <select
                      value={newMsgReceiver}
                      onChange={e => setNewMsgReceiver(e.target.value)}
                      className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                    >
                      <option value="">Selecione a turma...</option>
                      {turmas?.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                )}

                {ehComunicado && (
                  <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
                    <label className="flex items-start gap-3 flex-1 p-4 rounded-2xl border border-slate-200 bg-white cursor-pointer">
                      <input type="checkbox" checked={requerCiencia} onChange={e => setRequerCiencia(e.target.checked)} className="mt-1" />
                      <span><span className="block font-bold text-slate-800 text-sm">Pedir confirmação de ciência</span><span className="block text-xs text-slate-500">Cada pessoa clica em &ldquo;Estou ciente&rdquo; e você acompanha quem confirmou.</span></span>
                    </label>
                    {podeGerirComunicados && (
                      <label className="flex items-start gap-3 flex-1 p-4 rounded-2xl border border-slate-200 bg-white cursor-pointer">
                        <input type="checkbox" checked={fixarComunicado} onChange={e => setFixarComunicado(e.target.checked)} className="mt-1" />
                        <span><span className="block font-bold text-slate-800 text-sm">Fixar no topo</span><span className="block text-xs text-slate-500">Fica em destaque na lista de todos até ser desafixado.</span></span>
                      </label>
                    )}
                  </div>
                )}

                {newMsgCategory === "GERAL" && (
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Atribuir A / Destinatário</label>
                    <select 
                      value={newMsgReceiver} 
                      onChange={e => setNewMsgReceiver(e.target.value)}
                      className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                    >
                      <option value="">Selecione o usuário responsável...</option>
                      {users.filter(u => u.id !== currentUserId).map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.username} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Assunto / Tópico</label>
                  {newMsgCategory === 'SUPORTE' ? (
                    <select
                      value={predefinedSubject}
                      onChange={e => {
                         const val = e.target.value;
                         if (val === 'ESTUDANTE_FALTANDO') {
                             router.push('/dashboard/reportar-estudante');
                         } else {
                             setPredefinedSubject(val);
                             setNewMsgSubject('');
                         }
                      }}
                      className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                    >
                      <option value="">Selecione o tópico principal...</option>
                      <option value="Lançamento de Notas/Faltas">Problema no Lançamento de Notas/Faltas</option>
                      <option value="Gerador de Provas">Problema no Gerador de Provas</option>
                      <option value="Dúvida de Uso">Dúvida sobre uso do sistema</option>
                      <option value="Erro Inesperado (Bug)">Erro Inesperado (Bug) / Tela Travada</option>
                      <option value="ESTUDANTE_FALTANDO">Estudante Faltando na Lista / Turma Errada</option>
                      <option value="Outro Problema">Outro problema técnico</option>
                    </select>
                  ) : newMsgCategory === 'DIRECAO' ? (
                    <select
                      value={predefinedSubject}
                      onChange={e => { setPredefinedSubject(e.target.value); setNewMsgSubject(''); }}
                      className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                    >
                      <option value="">Selecione o tópico principal...</option>
                      <option value="Ajuste de Notas">Solicitação de Ajuste de Notas (Fora do Prazo)</option>
                      <option value="Ocorrência Grave">Ocorrência / Indisciplina Grave</option>
                      <option value="Solicitação de Material">Solicitação de Material / Infraestrutura</option>
                      <option value="Dúvida Pedagógica">Dúvida ou Orientação Pedagógica</option>
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={newMsgSubject} 
                      onChange={e => setNewMsgSubject(e.target.value)}
                      placeholder="Assunto da mensagem"
                      className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                    />
                  )}
                </div>

                {(newMsgCategory === 'SUPORTE' || newMsgCategory === 'DIRECAO') && predefinedSubject && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    {/* Campos Dinâmicos baseados no Assunto */}
                    {(predefinedSubject === 'Lançamento de Notas/Faltas' || predefinedSubject === 'Ajuste de Notas' || predefinedSubject === 'Gerador de Provas' || predefinedSubject === 'Ocorrência Grave') && (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Turma (Opcional para provas)</label>
                        <select 
                          value={selectedTurmaId} 
                          onChange={e => setSelectedTurmaId(e.target.value)}
                          className="w-full p-3.5 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-sm text-slate-700 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                        >
                          <option value="">Selecione a Turma...</option>
                          {turmas?.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                      </div>
                    )}
                    
                    {(predefinedSubject === 'Lançamento de Notas/Faltas' || predefinedSubject === 'Ajuste de Notas' || predefinedSubject === 'Gerador de Provas') && (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Disciplina</label>
                        <select 
                          value={selectedDisciplinaId} 
                          onChange={e => setSelectedDisciplinaId(e.target.value)}
                          disabled={!selectedTurmaId || turmaDetails.disciplinas.length === 0}
                          className="w-full p-3.5 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-sm text-slate-700 focus:bg-white focus:border-indigo-500 transition-all outline-none disabled:opacity-50"
                        >
                          <option value="">Selecione a Disciplina...</option>
                          {turmaDetails.disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                        </select>
                      </div>
                    )}

                    {predefinedSubject === 'Ocorrência Grave' && (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estudante</label>
                        <select 
                          value={selectedEstudanteId} 
                          onChange={e => setSelectedEstudanteId(e.target.value)}
                          disabled={!selectedTurmaId || turmaDetails.estudantes.length === 0}
                          className="w-full p-3.5 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-sm text-slate-700 focus:bg-white focus:border-indigo-500 transition-all outline-none disabled:opacity-50"
                        >
                          <option value="">Selecione o Estudante...</option>
                          {turmaDetails.estudantes.map((e: any) => <option key={e.matricula} value={e.matricula}>{e.nome}</option>)}
                        </select>
                      </div>
                    )}

                    {(predefinedSubject === 'Outro Problema' || predefinedSubject === 'Solicitação de Material' || predefinedSubject === 'Dúvida Pedagógica' || predefinedSubject === 'Gerador de Provas') && (
                      <div className="space-y-3 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Detalhes Rápidos / Título</label>
                        <input 
                          type="text" 
                          value={newMsgSubject} 
                          onChange={e => setNewMsgSubject(e.target.value)}
                          placeholder="Ex: Laboratório de Informática / Não consigo cadastrar questão"
                          className="w-full p-3.5 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-sm text-slate-700 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">{ehComunicado ? 'Texto do comunicado' : 'Descrição Completa da Ocorrência'}</label>
                <div className="rounded-2xl overflow-hidden border border-slate-200">
                  <RichTextEditor
                    value={newMsgContent}
                    onChange={setNewMsgContent}
                    className="min-h-[300px] border-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={sending}
                  className="w-full md:w-auto px-12 bg-indigo-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
                >
                  {sending ? <Loader2 className="animate-spin w-5 h-5" /> : <Send size={20} />}
                  {sending ? "Enviando..." : ehComunicado ? "Enviar Comunicado" : "Registrar Chamado"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 3: Detalhes do Chamado (Full Width) */}
      {selectedMessage && (
        <div className="flex-1 flex flex-col h-full bg-slate-50/30 overflow-hidden">
          <div className="px-8 py-6 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-5">
               <button 
                 onClick={() => { setSelectedMessage(null); setThreadMessages([]); }} 
                 className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"
               >
                 <ArrowLeft size={20} className="text-slate-600" />
               </button>
               <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {selectedMessage.category === 'COMUNICADO'
                        ? (selectedMessage.fixado ? '📌 COMUNICADO FIXADO' : 'COMUNICADO')
                        : `CHAMADO #${selectedMessage.ticketNumber || selectedMessage.id.substring(selectedMessage.id.length - 6).toUpperCase()}`}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${getCatStyles(selectedMessage.category).bg} ${getCatStyles(selectedMessage.category).text} ${getCatStyles(selectedMessage.category).border}`}>
                      {getCatStyles(selectedMessage.category).label}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
                    {selectedMessage.subject.replace(/\[Ticket\]|\[Cadastro Pendente\]/gi, '').trim()}
                  </h3>
               </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                <Clock size={16} className="text-slate-400" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Aberto em</span>
                  <span className="text-xs font-bold text-slate-600">{formatarData(selectedMessage.createdAt)}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {selectedMessage.assignedTo && (
                  <div className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1.5">
                    <User size={12} />
                    {selectedMessage.assignedTo.name}
                  </div>
                )}
                
                {(currentUserRole.isSuperuser || currentUserRole.isDirecao) && !selectedMessage.assignedToId && selectedMessage.category !== 'COMUNICADO' && (
                  <button 
                    onClick={async () => {
                      const { assignTicket } = await import('./actions')
                      await assignTicket(selectedMessage.id)
                      const newThread = await getMessageThread(selectedMessage.id)
                      setThreadMessages(newThread)
                      setSelectedMessage({...selectedMessage, assignedToId: currentUserId, assignedTo: { name: 'Você' }})
                    }}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <User size={12} /> Assumir Chamado
                  </button>
                )}

                {rotuloAberto && (
                  <span className={`${rotuloAberto.classe} !px-4 !py-2.5 !text-[10px] !rounded-xl`}>{rotuloAberto.texto}</span>
                )}

                {podeMudarStatus && rotuloAberto?.situacao !== 'RESOLVIDO' && (
                  <button
                    onClick={() => mudarStatus('RESOLVIDO')}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 transition-colors shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    <Check size={12} /> Marcar Resolvido
                  </button>
                )}
                {podeMudarStatus && rotuloAberto?.situacao === 'RESOLVIDO' && (
                  <button
                    onClick={() => mudarStatus('ABERTO')}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                  >
                    Reabrir
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-6 custom-scrollbar bg-slate-50/50">
            <div className="max-w-4xl mx-auto space-y-6">
              {rotuloAberto?.texto === 'Aguardando você' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-900">A equipe respondeu. <b>Se resolveu</b>, marque como resolvido; se não, responda abaixo. Sem retorno em 7 dias, o chamado é fechado.</p>
                  <button onClick={() => mudarStatus('RESOLVIDO')} className="shrink-0 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">Resolveu, obrigado</button>
                </div>
              )}
              {rotuloAberto?.situacao === 'RESOLVIDO' && selectedMessage.fechamento === MOTIVO_FECHAMENTO_AUTOMATICO && (
                <p className="text-sm text-slate-500 text-center">Fechado automaticamente após 7 dias sem retorno. Se ainda precisar, é só responder que ele reabre.</p>
              )}
              {rotuloAberto?.situacao === 'RESOLVIDO' && selectedMessage.fechamento === MOTIVO_LIMPEZA_ANTIGOS && (
                <p className="text-sm text-slate-500 text-center">Chamado antigo encerrado na revisão de 04/11/2026. Se o problema continua, é só responder aqui que ele reabre.</p>
              )}
              {selectedMessage.category === 'COMUNICADO' && !selectedMessage.parentId && (
                <ComunicadoPainel
                  key={selectedMessage.id}
                  mensagem={selectedMessage}
                  currentUserId={currentUserId}
                  podeGerir={podeGerirComunicados || selectedMessage.senderId === currentUserId}
                  podeFixar={podeGerirComunicados}
                  onAtualizar={({ fixado, cienteEm }) => {
                    const atualizar = <T extends { id: string }>(m: T): T => m.id !== selectedMessage.id ? m : {
                      ...m,
                      ...(fixado !== undefined ? { fixado } : {}),
                      ...(cienteEm ? { ciencias: [{ createdAt: cienteEm }] } : {})
                    }
                    setInboxMessages(prev => prev.map(atualizar))
                    setSentMessagesList(prev => prev.map(atualizar))
                    setSelectedMessage((m: { id: string }) => atualizar(m))
                  }}
                />
              )}
              {threadMessages.map((m, idx) => {
                const isMe = m.senderId === currentUserId
                return (
                  <div key={m.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className={`w-full p-8 rounded-[2rem] shadow-sm border ${
                      isMe ? 'bg-white border-indigo-100' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-6 pb-5 border-b border-slate-100">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center font-black text-lg ${
                             isMe ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-600'
                           }`}>
                             {m.sender?.name?.charAt(0) || m.sender?.username?.charAt(0) || '?'}
                           </div>
                           <div>
                              <p className="text-base font-black text-slate-800">{m.sender?.name || m.sender?.username}</p>
                              <p className="text-xs font-bold text-slate-400">{formatarData(m.createdAt)} às {formatarHora(m.createdAt)}</p>
                           </div>
                        </div>
                        {isMe && <CheckCheck size={20} className="text-indigo-400" />}
                      </div>
                      <div className="text-sm font-medium text-slate-700 leading-relaxed max-w-none prose prose-slate">
                        <MarkdownContent content={m.content} />
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {loadingThread && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60 animate-in fade-in">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Carregando histórico...</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-8 md:px-12 bg-white border-t border-slate-100 shrink-0">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleQuickReply} className="flex flex-col md:flex-row gap-4">
                <input 
                  type="text"
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Escreva sua interação ou resposta para este chamado..."
                  className="flex-1 px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] font-bold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                />
                <button 
                  type="submit"
                  disabled={!replyContent.trim() || replying}
                  className="px-10 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {replying ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  {replying ? 'Enviando...' : 'Responder'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  )
}
