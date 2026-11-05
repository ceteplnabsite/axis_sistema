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
import { sendMessage, markAsRead, getMessageThread, deleteMessage, markAllAsRead, getFilaChamados, getResumoFila, updateTicketStatus, getTodasTurmasAtivas } from "./actions"
import PainelFila from "./PainelFila"
import { Avatar, CategoriaTag, mesmoDia, previa, rotuloDia, tempoCurto } from "./mensagens-ui"
import { atendeCategoria, ehChamado, situacaoDaMensagem, tempoEsperando, MOTIVO_FECHAMENTO_AUTOMATICO, MOTIVO_LIMPEZA_ANTIGOS } from "@/lib/chamados-regras"
import type { FiltroFila, ResumoChamados } from "@/lib/chamados"
import { useRouter } from "next/navigation"

const TOPICO_TURMA = 'Turma/Disciplina'
const OUTRA = '__OUTRA__'
const PROBLEMAS_TURMA = ['Turma faltando', 'Disciplina faltando', 'Turma ou disciplina errada'] as const

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
  const naoLidas = inboxMessages.filter(m => !m.isRead).length
  const atendo = (msg: { category?: string } | null) => atendeCategoria({ id: currentUserId, ...currentUserRole }, msg?.category)

  /** Rótulo do status do chamado conforme quem está vendo */
  const rotuloChamado = (msg: MsgChamado, conversa?: { senderId: string; createdAt: string | Date }[]) => {
    if (!ehChamado(msg?.category)) return null
    const { situacao, atrasado, horasEsperando } = situacaoDaMensagem(msg, conversa)
    const souEquipe = atendo(msg) && msg.senderId !== currentUserId
    const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border'
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
  // chamado "Turma ou disciplina faltando / errada"
  const [problemaTurma, setProblemaTurma] = useState("")
  const [turmaOutra, setTurmaOutra] = useState("")
  const [disciplinaOutra, setDisciplinaOutra] = useState("")
  const [todasTurmas, setTodasTurmas] = useState<{ id: string; nome: string }[] | null>(null)
  const ehTopicoTurma = newMsgCategory === 'SUPORTE' && predefinedSubject === TOPICO_TURMA
  useEffect(() => {
    if (ehTopicoTurma && todasTurmas === null) getTodasTurmasAtivas().then(setTodasTurmas)
  }, [ehTopicoTurma, todasTurmas])

  useEffect(() => {
    if (selectedTurmaId && selectedTurmaId !== OUTRA) {
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
    let conteudo = newMsgContent
    if (ehTopicoTurma) {
        const turmaNome = selectedTurmaId === OUTRA ? turmaOutra.trim() : (todasTurmas?.find(t => t.id === selectedTurmaId)?.nome ?? '')
        const discNome = selectedDisciplinaId === OUTRA || selectedTurmaId === OUTRA ? disciplinaOutra.trim() : (turmaDetails.disciplinas.find(d => d.id === selectedDisciplinaId)?.nome ?? '')
        if (!problemaTurma) { alert('Escolha o que está acontecendo.'); return }
        if (!turmaNome) { alert('Escolha a turma (ou digite em "Outra").'); return }
        if (!discNome) { alert('Escolha a disciplina (ou digite em "Outra").'); return }
        const naoListada = [selectedTurmaId === OUTRA && 'turma não está na lista', (selectedDisciplinaId === OUTRA || selectedTurmaId === OUTRA) && 'disciplina não está na lista'].filter(Boolean).join(', ')
        finalSubject = `[${TOPICO_TURMA}] ${problemaTurma} - ${turmaNome} | ${discNome}`
        // o texto das mensagens é Markdown simples (uma linha por parágrafo)
        const resumo = [`**${problemaTurma}**`, `Turma: ${turmaNome}`, `Disciplina: ${discNome}`, ...(naoListada ? [`*(${naoListada})*`] : [])].join('\n')
        conteudo = newMsgContent.trim() ? `${resumo}\n\n${newMsgContent.trim()}` : resumo
    } else if (newMsgCategory === "SUPORTE" || newMsgCategory === "DIRECAO") {
        if (!predefinedSubject) { alert('Escolha o assunto do chamado.'); return }
        const details = [];
        if (selectedTurmaId) details.push(turmas?.find(t => t.id === selectedTurmaId)?.nome || selectedTurmaId)
        if (selectedDisciplinaId) details.push(turmaDetails.disciplinas.find(d => d.id === selectedDisciplinaId)?.nome || selectedDisciplinaId)
        if (selectedEstudanteId) details.push(turmaDetails.estudantes.find(s => s.matricula === selectedEstudanteId)?.nome || selectedEstudanteId)
        
        const detailsStr = details.length > 0 ? ` - ${details.join(' | ')}` : '';
        finalSubject = `[${predefinedSubject}] ${newMsgSubject ? newMsgSubject : ''}${detailsStr}`.trim()
    }

    if (sending) return
    if (!finalSubject) { alert('Escreva o assunto.'); return }
    if (!conteudo.trim()) { alert('Escreva a mensagem.'); return }
    if (newMsgCategory === "COMUNICADO_TURMA" && !newMsgReceiver) { alert('Escolha a turma.'); return }
    if (newMsgCategory === "GERAL" && !newMsgReceiver) { alert('Escolha para quem é a mensagem.'); return }

    setSending(true)
    const formData = new FormData()
    formData.append("subject", finalSubject)
    formData.append("content", conteudo)
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
      setProblemaTurma("")
      setTurmaOutra("")
      setDisciplinaOutra("")
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
    const caixa = document.getElementById('resposta') as HTMLTextAreaElement | null
    if (caixa) caixa.style.height = 'auto'

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

  return (
    <div className="flex flex-col lg:flex-row bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[calc(100vh-170px)] lg:h-[calc(100vh-170px)] overflow-hidden">
      
      {/* Coluna 1: lista (no celular some quando há conversa aberta) */}
      <div className={`${selectedMessage || compondo ? 'hidden lg:flex' : 'flex'} flex-col lg:w-[380px] xl:w-[420px] lg:shrink-0 lg:border-r border-slate-200 bg-white min-h-0`}>
        <div className="px-4 pt-4 pb-3 space-y-3 shrink-0 border-b border-slate-100">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Caixa de entrada</h2>
            <button
              onClick={() => { setCompondo(true); setSelectedMessage(null); setThreadMessages([]) }}
              className="h-9 px-3.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5 text-sm font-medium shadow-sm"
            >
              <Plus size={16} /> Nova
            </button>
          </div>
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg text-sm" role="tablist">
            {([['inbox', 'Recebidas', naoLidas], ['sent', 'Enviadas', 0]] as const).map(([v, r, n]) => (
              <button key={v} role="tab" aria-selected={activeTab === v} onClick={() => setActiveTab(v)}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition-colors ${activeTab === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {r}
                {n > 0 && <span className="min-w-5 px-1.5 rounded-full bg-indigo-600 text-white text-[11px] leading-5">{n}</span>}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="search"
              aria-label="Buscar mensagens"
              placeholder="Buscar"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-slate-100 border border-transparent rounded-lg text-sm placeholder:text-slate-400 focus:bg-white focus:border-slate-300 outline-none"
            />
          </div>
          {activeTab === 'inbox' && resumo && (
            <PainelFila resumo={resumo} filtro={filtroFila} onFiltro={setFiltroFila} compacto />
          )}
        </div>

        {activeTab === 'inbox' && naoLidas > 0 && (
          <div className="px-4 py-2 flex justify-end border-b border-slate-100">
            <button
              onClick={() => startTransition(async () => {
                await markAllAsRead()
                setInboxMessages(prev => prev.map(m => ({ ...m, isRead: true })))
                router.refresh()
              })}
              disabled={isPending}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <CheckCheck size={14} /> Marcar todas como lidas
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
          {filteredBySearchAndCategory.map((msg: any) => {
            const isUnread = !msg.isRead && activeTab === 'inbox'
            const rotulo = rotuloChamado(msg)
            const ativo = selectedMessage?.id === msg.id
            const outro = activeTab === 'inbox' && msg.senderId !== currentUserId ? (msg.sender?.name || msg.sender?.username) : rotuloDestino(msg)
            const ultima = msg.replies?.[0]
            const textoPrevia = previa(ultima?.content ?? msg.content)
            const minha = (ultima?.senderId ?? msg.senderId) === currentUserId
            const urgente = ehChamado(msg.category) && (msg.priority === 'ALTA' || msg.priority === 'CRITICA')
            return (
              <button
                key={msg.id}
                type="button"
                onClick={() => handleSelectMessage(msg)}
                aria-current={ativo ? 'true' : undefined}
                className={`relative w-full text-left flex gap-3 px-3 py-3 rounded-xl transition-colors ${ativo ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
              >
                {ativo && <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-indigo-600" />}
                <Avatar nome={outro} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-sm ${isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>{outro}</span>
                    <span className={`shrink-0 text-xs ${isUnread ? 'text-indigo-600 font-semibold' : 'text-slate-400'}`}>{tempoCurto(msg.updatedAt || msg.createdAt)}</span>
                  </div>
                  <p className={`truncate text-[13px] ${isUnread ? 'font-medium text-slate-900' : 'text-slate-700'}`}>
                    {msg.ticketNumber && ehChamado(msg.category) ? <span className="text-slate-400 mr-1">#{msg.ticketNumber}</span> : null}
                    {msg.subject.replace(/\[Ticket\]|\[Cadastro Pendente\]/gi, '').trim() || 'Sem assunto'}
                  </p>
                  {textoPrevia && <p className="truncate text-[13px] text-slate-500">{minha ? 'Você: ' : ''}{textoPrevia}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <CategoriaTag categoria={msg.category} />
                    {rotulo && <span className={rotulo.classe}>{rotulo.texto}</span>}
                    {rotulo?.atraso && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200"><Clock size={11} /> {rotulo.atraso}</span>}
                    {urgente && <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200">{msg.priority === 'CRITICA' ? 'Crítica' : 'Alta'}</span>}
                    {msg.fixado && <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700"><Pin size={11} /> Fixado</span>}
                    {msg.category === 'COMUNICADO' && msg.requerCiencia && msg.senderId !== currentUserId && !msg.ciencias?.length && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">Confirmar ciência</span>
                    )}
                    {msg.category === 'COMUNICADO' && msg.requerCiencia && msg.senderId === currentUserId && (
                      <span className="text-[11px] text-slate-500">{msg._count?.ciencias ?? 0} {(msg._count?.ciencias ?? 0) === 1 ? 'ciente' : 'cientes'}</span>
                    )}
                  </div>
                </div>
                {isUnread && <span aria-label="Não lida" className="mt-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />}
              </button>
            )
          })}

          {carregandoFila && (
            <div className="flex justify-center py-8 text-slate-400"><Loader2 className="animate-spin" /></div>
          )}

          {!carregandoFila && filteredBySearchAndCategory.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center text-center px-6">
              <Inbox className="w-9 h-9 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-700">Nada por aqui</p>
              <p className="text-xs text-slate-400 mt-1">{searchQuery ? 'Nenhuma mensagem com esse termo.' : 'Nenhuma mensagem neste filtro.'}</p>
            </div>
          )}

          {hasMore && filteredBySearchAndCategory.length > 0 && !searchQuery && !(activeTab === 'inbox' && filtroFila) && (
            <div className="flex justify-center pt-2 pb-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2 disabled:opacity-50"
              >
                {loadingMore ? <><Loader2 size={16} className="animate-spin" /> Carregando…</> : 'Carregar mais antigas'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Coluna 2: conversa aberta, nova mensagem ou vazio */}
      <div className={`${selectedMessage || compondo ? 'flex' : 'hidden lg:flex'} flex-1 flex-col min-w-0 min-h-0`}>
      {!selectedMessage && !compondo && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-50">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-base font-semibold text-slate-800">Nenhuma conversa aberta</p>
          <p className="text-sm text-slate-500 mt-1">Escolha uma mensagem na lista ou comece uma nova.</p>
        </div>
      )}

      {/* View 2: Criação de Novo Chamado (Full Width) */}
      {compondo && (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
          <div className="px-4 md:px-6 py-3 bg-white border-b border-slate-200 flex items-center gap-3 sticky top-0 z-10">
            <button onClick={() => setCompondo(false)} aria-label="Voltar" className="p-2 -ml-1 rounded-lg hover:bg-slate-100">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{ehComunicado ? 'Novo Comunicado' : newMsgCategory === 'GERAL' ? 'Nova Conversa' : 'Abrir Novo Chamado'}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{ehComunicado ? 'Chega para todo o público escolhido' : newMsgCategory === 'GERAL' ? 'Só você e a pessoa escolhida veem' : 'Preencha os detalhes do seu ticket'}</p>
            </div>
          </div>

          <div className="flex-1 p-4 md:p-8">
            <div className="max-w-2xl mx-auto space-y-6 bg-white p-5 md:p-7 rounded-2xl shadow-sm border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className={`space-y-3 ${ehChamado(newMsgCategory) ? '' : 'md:col-span-2'}`}>
                  <label className="text-sm font-medium text-slate-700">Categoria / Departamento</label>
                  <select 
                    value={newMsgCategory} 
                    onChange={e => setNewMsgCategory(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none"
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

                {ehChamado(newMsgCategory) && <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Nível de Urgência</label>
                  <select 
                    value={newMsgPriority} 
                    onChange={e => setNewMsgPriority(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none"
                  >
                    <option value="BAIXA">Baixa (Pode esperar)</option>
                    <option value="MEDIA">Normal</option>
                    <option value="ALTA">Alta (Importante)</option>
                    <option value="CRITICA">Crítica (Impedimento)</option>
                  </select>
                </div>}

                {newMsgCategory === "COMUNICADO_TURMA" && (
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Turma</label>
                    <select
                      value={newMsgReceiver}
                      onChange={e => setNewMsgReceiver(e.target.value)}
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none"
                    >
                      <option value="">Selecione a turma...</option>
                      {turmas?.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                )}

                {ehComunicado && (
                  <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
                    <label className="flex items-start gap-3 flex-1 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={requerCiencia} onChange={e => setRequerCiencia(e.target.checked)} className="mt-1" />
                      <span><span className="block font-medium text-slate-800 text-sm">Pedir confirmação de ciência</span><span className="block text-xs text-slate-500">Cada pessoa clica em &ldquo;Estou ciente&rdquo; e você acompanha quem confirmou.</span></span>
                    </label>
                    {podeGerirComunicados && (
                      <label className="flex items-start gap-3 flex-1 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={fixarComunicado} onChange={e => setFixarComunicado(e.target.checked)} className="mt-1" />
                        <span><span className="block font-medium text-slate-800 text-sm">Fixar no topo</span><span className="block text-xs text-slate-500">Fica em destaque na lista de todos até ser desafixado.</span></span>
                      </label>
                    )}
                  </div>
                )}

                {newMsgCategory === "GERAL" && (
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">{isTeacherOnly ? 'Com quem da Direção' : 'Para'}</label>
                    <select 
                      value={newMsgReceiver} 
                      onChange={e => setNewMsgReceiver(e.target.value)}
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none"
                    >
                      <option value="">{isTeacherOnly ? 'Selecione a pessoa da Direção…' : 'Selecione a pessoa…'}</option>
                      {users.filter(u => u.id !== currentUserId).map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.username} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Assunto / Tópico</label>
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
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none"
                    >
                      <option value="">Selecione o tópico principal...</option>
                      <option value="Lançamento de Notas/Faltas">Problema no Lançamento de Notas/Faltas</option>
                      <option value="Gerador de Provas">Problema no Gerador de Provas</option>
                      <option value="Dúvida de Uso">Dúvida sobre uso do sistema</option>
                      <option value="Erro Inesperado (Bug)">Erro Inesperado (Bug) / Tela Travada</option>
                      <option value={TOPICO_TURMA}>Turma ou disciplina faltando / errada</option>
                      <option value="ESTUDANTE_FALTANDO">Estudante faltando na lista</option>
                      <option value="Outro Problema">Outro problema técnico</option>
                    </select>
                  ) : newMsgCategory === 'DIRECAO' ? (
                    <select
                      value={predefinedSubject}
                      onChange={e => { setPredefinedSubject(e.target.value); setNewMsgSubject(''); }}
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none"
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
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none"
                    />
                  )}
                </div>

                {ehTopicoTurma && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="space-y-1.5 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">O que está acontecendo?</span>
                      <div className="flex flex-wrap gap-2" role="radiogroup">
                        {PROBLEMAS_TURMA.map(p => (
                          <button key={p} type="button" role="radio" aria-checked={problemaTurma === p} onClick={() => setProblemaTurma(p)}
                            className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${problemaTurma === p ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="ch-turma" className="text-sm font-medium text-slate-700">Turma</label>
                      <select id="ch-turma" value={selectedTurmaId} onChange={e => { setSelectedTurmaId(e.target.value); setSelectedDisciplinaId(''); setDisciplinaOutra('') }} className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none">
                        <option value="">{todasTurmas === null ? 'Carregando turmas…' : 'Selecione a turma…'}</option>
                        {todasTurmas?.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        <option value={OUTRA}>Outra (não está na lista)</option>
                      </select>
                      {selectedTurmaId === OUTRA && (
                        <input value={turmaOutra} onChange={e => setTurmaOutra(e.target.value)} placeholder="Qual turma? Ex.: 2TACV1" aria-label="Qual turma" className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="ch-disc" className="text-sm font-medium text-slate-700">Disciplina</label>
                      {selectedTurmaId === OUTRA ? (
                        <input id="ch-disc" value={disciplinaOutra} onChange={e => setDisciplinaOutra(e.target.value)} placeholder="Qual disciplina?" className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                      ) : (
                        <>
                          <select id="ch-disc" value={selectedDisciplinaId} onChange={e => setSelectedDisciplinaId(e.target.value)} disabled={!selectedTurmaId} className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none disabled:opacity-50 disabled:bg-slate-50">
                            <option value="">{selectedTurmaId ? 'Selecione a disciplina…' : 'Escolha a turma primeiro'}</option>
                            {turmaDetails.disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                            {selectedTurmaId && <option value={OUTRA}>Outra (não está na lista)</option>}
                          </select>
                          {selectedDisciplinaId === OUTRA && (
                            <input value={disciplinaOutra} onChange={e => setDisciplinaOutra(e.target.value)} placeholder="Qual disciplina?" aria-label="Qual disciplina" className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {(newMsgCategory === 'SUPORTE' || newMsgCategory === 'DIRECAO') && predefinedSubject && !ehTopicoTurma && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    {/* Campos Dinâmicos baseados no Assunto */}
                    {(predefinedSubject === 'Lançamento de Notas/Faltas' || predefinedSubject === 'Ajuste de Notas' || predefinedSubject === 'Gerador de Provas' || predefinedSubject === 'Ocorrência Grave') && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Turma (Opcional para provas)</label>
                        <select 
                          value={selectedTurmaId} 
                          onChange={e => setSelectedTurmaId(e.target.value)}
                          className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none"
                        >
                          <option value="">Selecione a Turma...</option>
                          {turmas?.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                      </div>
                    )}
                    
                    {(predefinedSubject === 'Lançamento de Notas/Faltas' || predefinedSubject === 'Ajuste de Notas' || predefinedSubject === 'Gerador de Provas') && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Disciplina</label>
                        <select 
                          value={selectedDisciplinaId} 
                          onChange={e => setSelectedDisciplinaId(e.target.value)}
                          disabled={!selectedTurmaId || turmaDetails.disciplinas.length === 0}
                          className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none disabled:opacity-50 disabled:bg-slate-50"
                        >
                          <option value="">Selecione a Disciplina...</option>
                          {turmaDetails.disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                        </select>
                      </div>
                    )}

                    {predefinedSubject === 'Ocorrência Grave' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Estudante</label>
                        <select 
                          value={selectedEstudanteId} 
                          onChange={e => setSelectedEstudanteId(e.target.value)}
                          disabled={!selectedTurmaId || turmaDetails.estudantes.length === 0}
                          className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none disabled:opacity-50 disabled:bg-slate-50"
                        >
                          <option value="">Selecione o Estudante...</option>
                          {turmaDetails.estudantes.map((e: any) => <option key={e.matricula} value={e.matricula}>{e.nome}</option>)}
                        </select>
                      </div>
                    )}

                    {(predefinedSubject === 'Outro Problema' || predefinedSubject === 'Solicitação de Material' || predefinedSubject === 'Dúvida Pedagógica' || predefinedSubject === 'Gerador de Provas') && (
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-medium text-slate-600">Detalhes Rápidos / Título</label>
                        <input 
                          type="text" 
                          value={newMsgSubject} 
                          onChange={e => setNewMsgSubject(e.target.value)}
                          placeholder="Ex: Laboratório de Informática / Não consigo cadastrar questão"
                          className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">{ehComunicado ? 'Texto do comunicado' : newMsgCategory === 'GERAL' ? 'Mensagem' : ehTopicoTurma ? 'Detalhes (opcional)' : 'Descrição do problema'}</label>
                <div className="rounded-xl overflow-hidden border border-slate-300 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
                  <RichTextEditor
                    value={newMsgContent}
                    onChange={setNewMsgContent}
                    className="min-h-[220px] border-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={sending}
                  className="w-full md:w-auto h-11 px-6 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
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
        <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
          <div className="px-4 md:px-5 py-3 bg-white border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3 z-10 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => { setSelectedMessage(null); setThreadMessages([]); }}
                aria-label="Fechar conversa"
                className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-slate-100 shrink-0"
              >
                <ArrowLeft size={20} className="text-slate-600" />
              </button>
              <Avatar nome={selectedMessage.category === 'GERAL' ? participanteConversa(selectedMessage) : (selectedMessage.sender?.name || selectedMessage.sender?.username)} />
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-slate-900 leading-snug break-words">
                  {selectedMessage.ticketNumber && ehChamado(selectedMessage.category) && <span className="text-slate-400 font-normal mr-1.5">#{selectedMessage.ticketNumber}</span>}
                  {selectedMessage.subject.replace(/\[Ticket\]|\[Cadastro Pendente\]/gi, '').trim()}
                </h3>
                <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  <CategoriaTag categoria={selectedMessage.category} />
                  {selectedMessage.fixado && <span className="inline-flex items-center gap-1"><Pin size={11} /> Fixado</span>}
                  <span>·</span>
                  <span>
                    {selectedMessage.category === 'GERAL'
                      ? `com ${participanteConversa(selectedMessage)}`
                      : selectedMessage.category === 'COMUNICADO'
                        ? `de ${selectedMessage.sender?.name || selectedMessage.sender?.username}`
                        : `aberto por ${selectedMessage.senderId === currentUserId ? 'você' : (selectedMessage.sender?.name || selectedMessage.sender?.username)}`}
                    {' em '}{formatarData(selectedMessage.createdAt)}
                  </span>
                  {selectedMessage.assignedTo && ehChamado(selectedMessage.category) && (
                    <><span>·</span><span className="inline-flex items-center gap-1"><User size={11} /> {selectedMessage.assignedTo.name}</span></>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {rotuloAberto && <span className={rotuloAberto.classe}>{rotuloAberto.texto}</span>}
              {atendo(selectedMessage) && selectedMessage.senderId !== currentUserId && !selectedMessage.assignedToId && ehChamado(selectedMessage.category) && (
                <button
                  onClick={async () => {
                    const { assignTicket } = await import('./actions')
                    await assignTicket(selectedMessage.id)
                    const newThread = await getMessageThread(selectedMessage.id)
                    setThreadMessages(newThread)
                    setSelectedMessage({...selectedMessage, assignedToId: currentUserId, assignedTo: { name: 'Você' }})
                  }}
                  className="h-8 px-3 rounded-lg text-sm font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 flex items-center gap-1.5"
                >
                  <User size={14} /> Assumir
                </button>
              )}
              {podeMudarStatus && rotuloAberto?.situacao !== 'RESOLVIDO' && (
                <button
                  onClick={() => mudarStatus('RESOLVIDO')}
                  className="h-8 px-3 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <Check size={14} /> Resolvido
                </button>
              )}
              {podeMudarStatus && rotuloAberto?.situacao === 'RESOLVIDO' && (
                <button
                  onClick={() => mudarStatus('ABERTO')}
                  className="h-8 px-3 rounded-lg text-sm font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300"
                >
                  Reabrir
                </button>
              )}
            </div>
          </div>

          <div ref={areaConversa} className="flex-1 overflow-y-auto px-4 md:px-6 py-4 custom-scrollbar bg-slate-50 min-h-0">
            <div className="max-w-3xl mx-auto">
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
              {threadMessages.map((m, i) => {
                const isMe = m.senderId === currentUserId
                const ant = threadMessages[i - 1]
                const novoDia = !ant || !mesmoDia(ant.createdAt, m.createdAt)
                // agrupa mensagens seguidas da mesma pessoa (até 10 min)
                const continua = !!ant && !novoDia && ant.senderId === m.senderId && new Date(m.createdAt).getTime() - new Date(ant.createdAt).getTime() < 10 * 60_000
                const nome = m.sender?.name || m.sender?.username
                return (
                  <div key={m.id}>
                    {novoDia && (
                      <div className="flex items-center gap-3 my-4" role="separator">
                        <span className="flex-1 h-px bg-slate-200" />
                        <span className="text-[11px] font-medium text-slate-500">{rotuloDia(m.createdAt)}</span>
                        <span className="flex-1 h-px bg-slate-200" />
                      </div>
                    )}
                    <div className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'} ${continua ? 'mt-1' : 'mt-3'}`}>
                      {!isMe && (continua ? <span className="w-8 shrink-0" /> : <Avatar nome={nome} tamanho="sm" />)}
                      <div className={`max-w-[85%] md:max-w-[72%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {!continua && (
                          <p className="text-[11px] text-slate-500 mb-1 px-1">
                            {!isMe && <span className="font-semibold text-slate-700 mr-1.5">{nome}</span>}
                            {formatarHora(m.createdAt)}
                          </p>
                        )}
                        <div className={`px-3.5 py-2.5 text-sm leading-relaxed break-words prose prose-sm max-w-none prose-p:my-1 first:prose-p:mt-0 ${
                          isMe
                            ? 'bg-indigo-600 text-white prose-invert rounded-2xl rounded-br-md shadow-sm'
                            : 'bg-white text-slate-800 prose-slate border border-slate-200 rounded-2xl rounded-bl-md shadow-sm'}`}>
                          <MarkdownContent content={m.content} />
                        </div>
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

          <div className="px-4 md:px-6 py-3 bg-white border-t border-slate-200 shrink-0">
            <form onSubmit={handleQuickReply} className="max-w-3xl mx-auto">
              <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white pl-4 pr-1.5 py-1.5 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-shadow">
                <label htmlFor="resposta" className="sr-only">Sua resposta</label>
                <textarea
                  id="resposta"
                  rows={1}
                  value={replyContent}
                  onChange={e => { setReplyContent(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px` }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleQuickReply(e as unknown as React.FormEvent) } }}
                  placeholder={selectedMessage.category === 'GERAL' ? `Mensagem para ${participanteConversa(selectedMessage)}` : 'Escreva sua resposta'}
                  className="flex-1 resize-none bg-transparent py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none max-h-40"
                />
                <button
                  type="submit"
                  aria-label="Enviar"
                  disabled={!replyContent.trim() || replying}
                  className="w-9 h-9 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center shrink-0 transition-colors"
                >
                  {replying ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 px-1 hidden md:block">Enter envia · Shift+Enter quebra a linha</p>
            </form>
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
