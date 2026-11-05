"use client"

import { useState, useEffect, useMemo, useRef, useTransition } from "react"
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
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox")
  const [compondo, setCompondo] = useState(false)
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
  const areaConversa = useRef<HTMLDivElement>(null)
  useEffect(() => { const el = areaConversa.current; if (el) el.scrollTop = el.scrollHeight }, [threadMessages])

  /** Com quem é a conversa direta (o outro lado) */
  const participanteConversa = (msg: { senderId: string; sender?: { name?: string | null; username?: string | null } | null; receiver?: { name?: string | null } | null; receiverId?: string | null; category?: string }): string => {
    if (msg.senderId !== currentUserId) return msg.sender?.name || msg.sender?.username || ''
    const outro = threadMessages.find(m => m.senderId !== currentUserId)
    return outro?.sender?.name || rotuloDestino(msg)
  }

  const handleSelectMessage = async (msg: any) => {
    setCompondo(false)
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
    if (newMsgCategory === "COMUNICADO_TURMA" && !newMsgReceiver) { alert('Escolha a turma.'); return }
    if (newMsgCategory === "GERAL" && !newMsgReceiver) { alert('Escolha para quem é a mensagem.'); return }

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

    if (res?.error) { alert(res.error); return }
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
      setCompondo(false)
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
      default: return { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500", border: "border-emerald-100", label: "💬 Conversa" }
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
    <div className="flex flex-col lg:flex-row bg-white rounded-[2rem] shadow-xl shadow-slate-300/30 border border-slate-200 min-h-[calc(100vh-180px)] lg:h-[calc(100vh-180px)] overflow-hidden animate-in fade-in duration-500">
      
      {/* Coluna 1: lista (no celular some quando há conversa aberta) */}
      <div className={`${selectedMessage || compondo ? 'hidden lg:flex' : 'flex'} flex-col lg:w-[400px] xl:w-[440px] lg:shrink-0 lg:border-r border-slate-200 bg-slate-50/40 min-h-0`}>
        <div className="p-5 border-b border-slate-200 bg-white space-y-4 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Mensagens</h2>
            <button
              onClick={() => { setCompondo(true); setSelectedMessage(null); setThreadMessages([]) }}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 font-bold text-sm"
            >
              <Plus size={16} /> Nova
            </button>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl" role="tablist">
            {([['inbox', 'Recebidas'], ['sent', 'Enviadas']] as const).map(([v, r]) => (
              <button key={v} role="tab" aria-selected={activeTab === v} onClick={() => setActiveTab(v)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${activeTab === v ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {r}
              </button>
            ))}
          </div>
          {activeTab === 'inbox' && resumo && (
            <PainelFila resumo={resumo} filtro={filtroFila} onFiltro={setFiltroFila} compacto />
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por assunto, texto ou nome..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
          {activeTab === 'inbox' && (
            <button
              onClick={() => startTransition(async () => {
                await markAllAsRead()
                setInboxMessages(prev => prev.map(m => ({ ...m, isRead: true })))
                router.refresh()
              })}
              disabled={isPending}
              className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-700 flex items-center gap-1.5"
            >
              <CheckCheck size={13} /> Marcar todas como lidas
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 min-h-0">
          {filteredBySearchAndCategory.map((msg: any) => {
            const style = getCatStyles(msg.category)
            const isUnread = !msg.isRead && activeTab === 'inbox'
            const rotulo = rotuloChamado(msg)
            const ativo = selectedMessage?.id === msg.id
            const quem = activeTab === 'inbox' && msg.senderId !== currentUserId ? (msg.sender?.name || msg.sender?.username) : `${msg.category === 'GERAL' ? 'Com' : 'Para'}: ${rotuloDestino(msg)}`
            const urgente = ehChamado(msg.category) && (msg.priority === 'ALTA' || msg.priority === 'CRITICA')
            return (
              <button
                key={msg.id}
                type="button"
                onClick={() => handleSelectMessage(msg)}
                aria-current={ativo ? 'true' : undefined}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  ativo ? 'bg-indigo-50 border-indigo-300'
                    : isUnread ? 'bg-white border-indigo-200 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm truncate ${isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>{quem}</span>
                  <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1.5">
                    {isUnread && <span className="w-2 h-2 rounded-full bg-indigo-500" title="Não lida" aria-label="Não lida" />}
                    {formatarData(msg.updatedAt || msg.createdAt)}
                  </span>
                </div>
                <p className={`text-sm mt-0.5 line-clamp-2 ${isUnread ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                  {msg.ticketNumber && ehChamado(msg.category) ? <span className="text-indigo-500 mr-1.5">#{msg.ticketNumber}</span> : null}
                  {msg.subject.replace(/\[Ticket\]|\[Cadastro Pendente\]/gi, '').trim() || 'Sem assunto'}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${style.bg} ${style.text} ${style.border}`}>{style.label}</span>
                  {rotulo && <span className={rotulo.classe}>{rotulo.texto}</span>}
                  {rotulo?.atraso && (
                    <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"><Clock size={10} /> {rotulo.atraso}</span>
                  )}
                  {urgente && <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-orange-50 text-orange-700 border border-orange-200">{msg.priority === 'CRITICA' ? 'Crítica' : 'Alta'}</span>}
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
              </button>
            )
          })}

          {carregandoFila && (
            <div className="flex justify-center py-8 text-slate-400"><Loader2 className="animate-spin" /></div>
          )}

          {!carregandoFila && filteredBySearchAndCategory.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Inbox className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-600">Nada por aqui</p>
              <p className="text-xs text-slate-400 mt-1">Nenhuma mensagem neste filtro.</p>
            </div>
          )}

          {hasMore && filteredBySearchAndCategory.length > 0 && !searchQuery && !(activeTab === 'inbox' && filtroFila) && (
            <div className="flex justify-center pt-2 pb-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
              >
                {loadingMore ? <><Loader2 size={16} className="animate-spin" /> Carregando...</> : 'Carregar mais antigas'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Coluna 2: conversa aberta, nova mensagem ou vazio */}
      <div className={`${selectedMessage || compondo ? 'flex' : 'hidden lg:flex'} flex-1 flex-col min-w-0 min-h-0`}>
      {!selectedMessage && !compondo && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-50/30">
          <MessageSquare className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-base font-bold text-slate-600">Selecione uma conversa</p>
          <p className="text-sm text-slate-400 mt-1">ou clique em <b>Nova</b> para escrever.</p>
        </div>
      )}

      {/* View 2: Criação de Novo Chamado (Full Width) */}
      {compondo && (
        <div className="flex-1 flex flex-col bg-slate-50/30 overflow-y-auto">
          <div className="px-8 py-6 bg-white border-b border-slate-100 flex items-center gap-4 sticky top-0 z-10">
            <button onClick={() => setCompondo(false)} aria-label="Voltar" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{ehComunicado ? 'Novo Comunicado' : newMsgCategory === 'GERAL' ? 'Nova Conversa' : 'Abrir Novo Chamado'}</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">{ehComunicado ? 'Chega para todo o público escolhido' : newMsgCategory === 'GERAL' ? 'Só você e a pessoa escolhida veem' : 'Preencha os detalhes do seu ticket'}</p>
            </div>
          </div>

          <div className="flex-1 p-8 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8 bg-white p-8 md:p-10 rounded-[2rem] shadow-sm border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className={`space-y-3 ${ehChamado(newMsgCategory) ? '' : 'md:col-span-2'}`}>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoria / Departamento</label>
                  <select 
                    value={newMsgCategory} 
                    onChange={e => setNewMsgCategory(e.target.value)}
                    className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                  >
                    <option value="SUPORTE">Suporte Técnico (Sistema)</option>
                    <option value="DIRECAO">Chamado para a Direção (Pedagógico)</option>
                    <option value="GERAL">{isTeacherOnly ? 'Conversa direta com alguém da Direção' : 'Conversa direta (mensagem privada)'}</option>
                    {(currentUserRole.isDirecao || currentUserRole.isSuperuser) && (
                      <>
                        <option value="COMUNICADO">Comunicado para todos</option>
                        <option value="COMUNICADO_PROFESSORES">Comunicado para professores</option>
                      </>
                    )}
                    <option value="COMUNICADO_TURMA">Aviso para os professores de uma turma</option>
                  </select>
                </div>

                {ehChamado(newMsgCategory) && <div className="space-y-3">
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
                </div>}

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
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">{isTeacherOnly ? 'Com quem da Direção' : 'Para'}</label>
                    <select 
                      value={newMsgReceiver} 
                      onChange={e => setNewMsgReceiver(e.target.value)}
                      className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                    >
                      <option value="">{isTeacherOnly ? 'Selecione a pessoa da Direção…' : 'Selecione a pessoa…'}</option>
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
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">{ehComunicado ? 'Texto do comunicado' : newMsgCategory === 'GERAL' ? 'Mensagem' : 'Descrição Completa da Ocorrência'}</label>
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
                  {sending ? "Enviando..." : ehComunicado ? "Enviar Comunicado" : newMsgCategory === "GERAL" ? "Enviar mensagem" : "Registrar Chamado"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversa aberta */}
      {selectedMessage && !compondo && (
        <div className="flex-1 flex flex-col h-full bg-slate-50/30 overflow-hidden">
          <div className="px-5 py-4 bg-white border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4 z-10 shrink-0">
            <div className="flex items-center gap-4 min-w-0">
               <button 
                 onClick={() => { setSelectedMessage(null); setThreadMessages([]); }} 
                 aria-label="Fechar conversa"
                 className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all shrink-0"
               >
                 <ArrowLeft size={20} className="text-slate-600" />
               </button>
               <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {selectedMessage.category === 'COMUNICADO'
                        ? (selectedMessage.fixado ? '📌 COMUNICADO FIXADO' : 'COMUNICADO')
                        : selectedMessage.category === 'GERAL'
                          ? `CONVERSA COM ${(participanteConversa(selectedMessage) || '').toUpperCase()}`
                          : `CHAMADO #${selectedMessage.ticketNumber || selectedMessage.id.substring(selectedMessage.id.length - 6).toUpperCase()}`}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${getCatStyles(selectedMessage.category).bg} ${getCatStyles(selectedMessage.category).text} ${getCatStyles(selectedMessage.category).border}`}>
                      {getCatStyles(selectedMessage.category).label}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight leading-snug break-words">
                    {selectedMessage.subject.replace(/\[Ticket\]|\[Cadastro Pendente\]/gi, '').trim()}
                  </h3>
               </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                <Clock size={14} className="text-slate-400" /> {ehChamado(selectedMessage.category) ? 'Aberto em' : 'Iniciada em'} {formatarData(selectedMessage.createdAt)}
              </span>
              
              <div className="flex flex-wrap items-center gap-2">
                {selectedMessage.assignedTo && (
                  <div className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1.5">
                    <User size={12} />
                    {selectedMessage.assignedTo.name}
                  </div>
                )}
                
                {atendo(selectedMessage) && selectedMessage.senderId !== currentUserId && !selectedMessage.assignedToId && ehChamado(selectedMessage.category) && (
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

          <div ref={areaConversa} className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-slate-50/50 min-h-0">
            <div className="max-w-3xl mx-auto space-y-4">
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
              {threadMessages.map((m) => {
                const isMe = m.senderId === currentUserId
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2.5`}>
                    {!isMe && (
                      <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0 mt-5" aria-hidden>
                        {m.sender?.name?.charAt(0) || m.sender?.username?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className={`max-w-[85%] md:max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <p className={`text-[11px] text-slate-400 mb-1 px-1 ${isMe ? 'text-right' : ''}`}>
                        <span className="font-bold text-slate-500">{isMe ? 'Você' : (m.sender?.name || m.sender?.username)}</span> · {formatarData(m.createdAt)} às {formatarHora(m.createdAt)}
                      </p>
                      <div className={`px-4 py-3 rounded-2xl border text-sm leading-relaxed text-slate-800 prose prose-slate prose-sm max-w-none break-words ${
                        isMe ? 'bg-indigo-50 border-indigo-100 rounded-tr-md' : 'bg-white border-slate-200 rounded-tl-md'}`}>
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

          <div className="p-4 md:px-6 bg-white border-t border-slate-200 shrink-0">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleQuickReply} className="flex items-end gap-3">
                <label htmlFor="resposta" className="sr-only">Sua resposta</label>
                <textarea
                  id="resposta"
                  rows={2}
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleQuickReply(e as unknown as React.FormEvent) } }}
                  placeholder={selectedMessage.category === 'GERAL' ? 'Escreva uma mensagem…' : 'Escreva sua resposta…'}
                  className="flex-1 resize-none max-h-40 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 outline-none"
                />
                <button
                  type="submit"
                  disabled={!replyContent.trim() || replying}
                  className="h-12 px-5 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                >
                  {replying ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  <span className="hidden sm:inline">{replying ? 'Enviando…' : 'Enviar'}</span>
                </button>
              </form>
              <p className="text-[11px] text-slate-400 mt-1.5 px-1 hidden md:block">Enter envia · Shift+Enter pula linha</p>
            </div>
          </div>
        </div>
      )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  )
}
