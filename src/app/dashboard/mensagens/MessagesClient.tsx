"use client"

import { useState, useEffect, useMemo } from "react"
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
  Building2,
  Users,
  Trash2,
  Loader2,
  Info,
  ChevronRight,
  Plus,
  ArrowLeft,
  Clock,
  MoreVertical,
  Reply,
  X
} from "lucide-react"
import RichTextEditor from "@/components/RichTextEditor"
import MarkdownContent from "@/components/MarkdownContent"
import { sendMessage, markAsRead, getMessageThread, deleteMessage, getMessages } from "./actions"
import { useRouter } from "next/navigation"
import TeacherTipsModal from "@/components/TeacherTipsModal"

/** Formata data/hora sempre no fuso de Brasília, tanto no servidor quanto no cliente */
const TIMEZONE = 'America/Sao_Paulo'

function formatarData(val: Date | string): string {
  return new Date(val).toLocaleDateString('pt-BR', { timeZone: TIMEZONE, day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatarHora(val: Date | string): string {
  return new Date(val).toLocaleTimeString('pt-BR', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' })
}

type Message = {
  id: string
  subject: string
  content: string
  category: "COMUNICADO" | "SUPORTE" | "DIRECAO" | "GERAL"
  isRead: boolean
  createdAt: Date | string
  sender: {
    id?: string
    name: string | null
    email: string | null
    username: string
  }
}

type SentMessage = {
  id: string
  subject: string
  content: string
  category: "COMUNICADO" | "SUPORTE" | "DIRECAO" | "GERAL"
  isRead: boolean
  createdAt: Date | string
  receiver: {
    id: string
    name: string | null
    email: string | null
  } | null
}

type UserOption = {
  id: string
  name: string | null
  username: string
  role: string
  isStudent?: boolean
}

type TurmaOption = {
  id: string
  nome: string
  curso: string | null
  serie: string | null
}

export default function MessagesClient({ 
  receivedMessages, 
  sentMessages,
  users,
  turmas = [],
  currentUserRole,
  currentUserId
}: { 
  receivedMessages: Message[], 
  sentMessages: SentMessage[],
  users: UserOption[],
  turmas?: TurmaOption[],
  currentUserRole: { isSuperuser: boolean, isDirecao: boolean, isStaff: boolean }
  currentUserId: string
}) {
  const router = useRouter()

  const messageTips = [
    {
      title: "Categorias de Apoio",
      description: "Use 'Suporte Técnico' para problemas no sistema e 'Direção' para assuntos pedagógicos ou administrativos. Isso agiliza o tempo de resposta.",
      icon: <LifeBuoy className="w-10 h-10 text-slate-700" />,
      color: "bg-slate-700"
    },
    {
      title: "Comunicação em Tempo Real",
      description: "O sistema funciona como um chat. Ao abrir uma mensagem, você verá todo o histórico da conversa e poderá responder rapidamente no campo inferior.",
      icon: <MessageSquare className="w-10 h-10 text-emerald-600" />,
      color: "bg-emerald-600"
    },
    {
      title: "Comunicados Oficiais",
      description: "Mensagens da Direção marcadas como 'Comunicado' são enviadas para todos os usuários. Fique atento aos alertas na aba de entrada.",
      icon: <Megaphone className="w-10 h-10 text-orange-600" />,
      color: "bg-orange-600"
    }
  ]

  // States
  const [activeTab, setActiveTab] = useState<"inbox" | "sent" | "new">("inbox")
  const [inboxMessages, setInboxMessages] = useState<Message[]>(receivedMessages)
  const [sentMessagesList, setSentMessagesList] = useState<SentMessage[]>(sentMessages)
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [inboxPage, setInboxPage] = useState(1)
  const [sentPage, setSentPage] = useState(1)
  const [hasMoreInbox, setHasMoreInbox] = useState(receivedMessages.length >= 20)
  const [hasMoreSent, setHasMoreSent] = useState(sentMessages.length >= 20)
  
  const [newMsgSubject, setNewMsgSubject] = useState("")
  const [newMsgContent, setNewMsgContent] = useState("")
  const isTeacherOnly = currentUserRole.isStaff && !currentUserRole.isSuperuser && !currentUserRole.isDirecao
  const [newMsgCategory, setNewMsgCategory] = useState(isTeacherOnly ? "DIRECAO" : "GERAL")
  const [newMsgReceiver, setNewMsgReceiver] = useState("")
  const [allowReplies, setAllowReplies] = useState(true)
  const [sending, setSending] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  
  const [threadMessages, setThreadMessages] = useState<any[]>([])
  const [replyContent, setReplyContent] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setInboxMessages(receivedMessages)
    setSentMessagesList(sentMessages)
  }, [receivedMessages, sentMessages])

  const filteredMessages = useMemo(() => {
    const list = activeTab === "inbox" ? inboxMessages : sentMessagesList
    if (!searchQuery) return list
    return list.filter((m: any) => 
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.sender?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [activeTab, inboxMessages, sentMessagesList, searchQuery])

  const handleSelectMessage = async (msg: any) => {
    setSelectedMessage(msg)
    setThreadMessages([])
    
    // Marcar como lido localmente primeiro para ser instantâneo
    if (activeTab === "inbox" && !msg.isRead) {
      setInboxMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m))
      // Notifica o servidor em background sem refresh
      markAsRead(msg.id).catch(err => console.error("Erro ao marcar como lida:", err))
    }

    const thread = await getMessageThread(msg.id)
    setThreadMessages(thread)
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    setSending(true)
    setShowConfirm(false)
    const formData = new FormData()
    formData.append("subject", newMsgSubject)
    formData.append("content", newMsgContent)
    // Tratamento de categorias especiais de grupo
    if (newMsgCategory.startsWith("COMUNICADO_")) {
        formData.append("category", "COMUNICADO")
        if (newMsgCategory === "COMUNICADO_ESTUDANTES") formData.append("receiverId", "GROUP_STUDENTS")
        if (newMsgCategory === "COMUNICADO_PROFESSORES") formData.append("receiverId", "GROUP_TEACHERS")
        if (newMsgCategory === "COMUNICADO_TURMA") formData.append("receiverId", `TURMA_${newMsgReceiver}`)
    } else {
        formData.append("category", newMsgCategory)
        if (newMsgCategory === "GERAL") formData.append("receiverId", newMsgReceiver)
    }
    
    formData.append("allowReplies", String(allowReplies))

    const res = await sendMessage(formData)
    setSending(false)

    if (res?.success) {
      setNewMsgSubject("")
      setNewMsgContent("")
      setNewMsgCategory(isTeacherOnly ? "DIRECAO" : "GERAL")
      setNewMsgReceiver("")
      setActiveTab("sent")
      router.refresh()
    }
  }

  const handleQuickReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim() || !selectedMessage) return

    const rootId = threadMessages.length > 0 
      ? (threadMessages[0].parentId || threadMessages[0].id) 
      : selectedMessage.id

    let targetReceiverId = ""
    const lastOther = [...threadMessages].reverse().find(m => m.senderId !== currentUserId)
    if (lastOther) targetReceiverId = lastOther.senderId
    else if (selectedMessage.senderId !== currentUserId) targetReceiverId = selectedMessage.senderId
    else if (selectedMessage.receiverId && selectedMessage.receiverId !== currentUserId) targetReceiverId = selectedMessage.receiverId

    const formData = new FormData()
    formData.append("subject", `Re: ${selectedMessage.subject}`)
    formData.append("content", replyContent)
    
    // Se for Suporte ou Direção, mantemos a categoria para que todos da equipe vejam a resposta
    const replyCategory = (selectedMessage.category === "SUPORTE" || selectedMessage.category === "DIRECAO") 
      ? selectedMessage.category 
      : "GERAL"
      
    formData.append("category", replyCategory)
    if (rootId) formData.append("parentId", rootId)
    if (targetReceiverId) formData.append("receiverId", targetReceiverId)

    await sendMessage(formData)
    setReplyContent("")
    const newThread = await getMessageThread(selectedMessage.id)
    setThreadMessages(newThread)
  }

  const getCatStyles = (cat: string) => {
    switch(cat) {
      case "COMUNICADO": return { bg: "bg-orange-50", text: "text-orange-600", dot: "bg-orange-500", border: "border-orange-100", label: "Comunicado" }
      case "SUPORTE": return { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500", border: "border-slate-200", label: "Suporte" }
      case "DIRECAO": return { bg: "bg-purple-50", text: "text-purple-600", dot: "bg-purple-500", border: "border-purple-100", label: "Direção" }
      default: return { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500", border: "border-emerald-100", label: "Geral" }
    }
  }

  return (
    <>
      <TeacherTipsModal storageKey="seen_tips_mensagens_v2" title="Dicas de Comunicação" tips={messageTips} />
      
      <div className="flex bg-white rounded-3xl shadow-2xl shadow-slate-300/60 border border-slate-300 h-[calc(100vh-180px)] overflow-hidden">
        
        {/* Sidebar - Listagem */}
        <div className={`w-full md:w-[380px] border-r border-slate-200 flex flex-col bg-slate-50/30 ${(selectedMessage || activeTab === 'new') ? 'hidden md:flex' : 'flex animate-in slide-in-from-left duration-300'}`}>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-medium text-slate-800 tracking-tight">Conversas</h2>
              <button 
                onClick={() => { setActiveTab("new"); setSelectedMessage(null); }}
                className="p-2 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-300 active:scale-90"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="flex gap-1 bg-slate-200 p-1 rounded-2xl">
              <button 
                onClick={() => setActiveTab("inbox")}
                className={`flex-1 py-2 text-xs font-medium uppercase tracking-wider rounded-xl transition-all ${activeTab === 'inbox' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
              >
                Entrada
              </button>
              <button 
                onClick={() => setActiveTab("sent")}
                className={`flex-1 py-2 text-xs font-medium uppercase tracking-wider rounded-xl transition-all ${activeTab === 'sent' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
              >
                Enviados
              </button>
            </div>

            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-slate-700 transition-colors" />
              <input 
                type="text" 
                placeholder="Buscar conversa..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-slate-500/20 outline-none transition-all placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-6 space-y-1 custom-scrollbar">
            {filteredMessages.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Inbox size={24} />
                </div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Vazio por aqui</p>
              </div>
            ) : filteredMessages.map((msg: any) => {
              const style = getCatStyles(msg.category)
              const isSelected = selectedMessage?.id === msg.id
              const isUnread = !msg.isRead

              return (
                <div 
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg)}
                  className={`relative p-5 rounded-[1.5rem] cursor-pointer transition-all border group mb-2 last:mb-0 ${
                    isSelected 
                      ? 'bg-white border-slate-300 shadow-xl shadow-slate-500/10' 
                      : isUnread 
                        ? 'bg-slate-100/60 border-slate-200 shadow-sm shadow-slate-200/50' 
                        : 'bg-slate-200/50 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-lg hover:shadow-slate-300/40'
                  }`}
                >
                  {/* Indicador de Mensagem Nova - Barra Lateral */}
                  {isUnread && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-slate-700 rounded-r-full shadow-lg shadow-slate-300" />
                  )}

                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-medium uppercase tracking-tight border ${style.bg} ${style.text} ${style.border}`}>
                        {style.label}
                      </span>
                      {isUnread && (
                        <span className="bg-slate-700 text-white text-[8px] font-medium px-1.5 py-0.5 rounded-md animate-pulse uppercase tracking-tighter">
                          Nova
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-[10px] font-medium leading-none ${isUnread ? 'text-slate-700' : 'text-slate-400'}`}>
                        {formatarData(msg.createdAt)}
                      </span>
                      <span className={`text-[9px] font-medium mt-1 uppercase tracking-tighter ${isUnread ? 'text-blue-400' : 'text-slate-300'}`}>
                        {formatarHora(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  <h4 className={`text-sm truncate pr-4 ${isUnread ? 'font-medium text-slate-800' : 'font-medium text-slate-700'}`}>
                    {msg.subject}
                  </h4>
                  <p className={`text-xs truncate mt-0.5 ${isUnread ? 'font-medium text-slate-700/70' : 'text-slate-400 font-medium'}`}>
                    {activeTab === 'inbox' ? `De: ${msg.sender.name || msg.sender.username}` : `Para: ${msg.receiver?.name || 'Sistema'}`}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Área Principal - Chat ou Novo */}
        <div className={`flex-1 flex flex-col bg-white overflow-hidden ${!selectedMessage && activeTab !== 'new' ? 'hidden md:flex' : 'flex animate-in fade-in duration-500'}`}>
          
          {activeTab === "new" ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 md:p-12 pb-40 md:pb-48 flex justify-center custom-scrollbar">
                <div className="w-full max-w-xl space-y-8 md:space-y-10">
                  <div className="flex items-center justify-between">
                     <div>
                      <h2 className="text-2xl font-medium text-slate-800 tracking-tight">Nova Mensagem</h2>
                      <p className="text-[11px] md:text-sm font-medium text-slate-600 mt-1">Combine comunicação clara com objetividade.</p>
                     </div>
                     <button onClick={() => setActiveTab("inbox")} className="p-2 md:p-3 hover:bg-slate-200 rounded-2xl transition-all">
                       <X className="w-5 h-5 text-slate-400" />
                     </button>
                  </div>

                  <form className="space-y-4 md:space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Para quem?</label>
                        <select 
                          value={newMsgCategory} 
                          onChange={e => setNewMsgCategory(e.target.value)}
                          className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium text-slate-700 focus:ring-2 focus:ring-slate-500 transition-all outline-none"
                        >
                          {(currentUserRole.isSuperuser || currentUserRole.isDirecao) && <option value="GERAL">Indivíduo (Geral)</option>}
                          <option value="SUPORTE">Suporte Técnico</option>
                          <option value="DIRECAO">Direção</option>
                          {(currentUserRole.isDirecao || currentUserRole.isSuperuser) ? (
                            <>
                              <option value="COMUNICADO">Comunicado (Todos)</option>
                              <option value="COMUNICADO_ESTUDANTES">Comunicado (Estudantes)</option>
                              <option value="COMUNICADO_PROFESSORES">Comunicado (Professores)</option>
                              <option value="COMUNICADO_TURMA">Comunicado (Turma)</option>
                            </>
                          ) : currentUserRole.isStaff && (
                            <option value="COMUNICADO_TURMA">Comunicado (Turma)</option>
                          )}
                        </select>
                      </div>

                      {newMsgCategory === "GERAL" && (
                        <div className="space-y-2 animate-in slide-in-from-right-4">
                          <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Destinatário</label>
                          <select 
                            required
                            value={newMsgReceiver} 
                            onChange={e => setNewMsgReceiver(e.target.value)}
                            className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium text-slate-700 focus:ring-2 focus:ring-slate-500 transition-all outline-none"
                          >
                            <option value="">Selecione...</option>
                            {users.filter(u => !u.isStudent).map(u => (
                              <option key={u.id} value={u.id}>{u.name || u.username} ({u.role})</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {newMsgCategory === "COMUNICADO_TURMA" && (
                        <div className="space-y-2 animate-in slide-in-from-right-4">
                          <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Selecionar Turma</label>
                          <select 
                            required
                            value={newMsgReceiver} 
                            onChange={e => setNewMsgReceiver(e.target.value)}
                            className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium text-slate-700 focus:ring-2 focus:ring-slate-500 transition-all outline-none"
                          >
                            <option value="">Selecione a turma...</option>
                            {turmas.map(t => (
                              <option key={t.id} value={t.id}>{t.nome} - {t.curso}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Assunto</label>
                      <input 
                        type="text" 
                        value={newMsgSubject} 
                        onChange={e => setNewMsgSubject(e.target.value)}
                        placeholder="Sobre o que vamos falar?"
                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium text-slate-800 focus:ring-2 focus:ring-slate-500 transition-all outline-none placeholder:text-slate-300"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Sua Mensagem</label>
                      <RichTextEditor
                        value={newMsgContent}
                        onChange={setNewMsgContent}
                        className="min-h-[200px]"
                        placeholder="Escreva aqui os detalhes..."
                        required
                      />
                    </div>

                    <div className="flex justify-center md:justify-end pt-6 pb-12">
                      <button 
                        type="button" 
                        onClick={() => handleSendMessage()}
                        disabled={sending}
                        className="group flex items-center justify-center gap-3 bg-slate-900 text-white w-full md:w-auto px-10 py-5 rounded-2xl font-medium text-sm uppercase tracking-widest hover:bg-slate-700 transition-all shadow-xl shadow-slate-300 disabled:opacity-50 active:scale-95"
                      >
                        {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                        {sending ? "Enviando..." : "Enviar Agora"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Modal de Confirmação para Mensagem */}
              {showConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                  <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                      <div className="w-16 h-16 bg-slate-100 text-slate-700 rounded-[1.2rem] flex items-center justify-center mb-6">
                          <Send className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-medium text-slate-800 mb-2">Enviar Mensagem?</h3>
                      <p className="text-slate-600 font-medium mb-8">
                         Você está enviando este comunicado para o sistema. Esta ação notificará os destinatários.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => setShowConfirm(false)} className="py-4 rounded-2xl font-medium text-slate-400 hover:bg-slate-50 transition-all">Cancelar</button>
                          <button onClick={() => handleSendMessage()} className="py-4 rounded-2xl font-medium bg-slate-900 text-white hover:bg-slate-700 transition-all shadow-lg">Confirmar</button>
                      </div>
                  </div>
                </div>
              )}
            </>
          ) : selectedMessage ? (
            <div className="flex-1 flex flex-col h-full bg-slate-50/20">
              {/* Header Conversa */}
              <div className="px-8 py-6 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-5">
                   <button onClick={() => setSelectedMessage(null)} className="p-2 md:hidden hover:bg-slate-50 rounded-xl transition-all"><ArrowLeft size={20} /></button>
                   <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-[1.2rem] flex items-center justify-center font-medium text-lg">
                      {selectedMessage.senderId === currentUserId ? 'Eu' : (selectedMessage.sender?.name?.charAt(0) || '?')}
                   </div>
                   <div>
                      <h3 className="text-lg font-medium text-slate-800 tracking-tight leading-none">{selectedMessage.subject}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                         <span className="text-[10px] font-medium uppercase text-slate-400 flex items-center gap-1">
                           <Clock size={12} /> {formatarData(selectedMessage.createdAt)} às {formatarHora(selectedMessage.createdAt)}
                         </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-[10px] font-medium text-slate-700 uppercase tracking-widest">{getCatStyles(selectedMessage.category).label}</span>
                      </div>
                   </div>
                </div>

                <div className="flex items-center gap-2">
                   <button className="p-3 hover:bg-slate-50 text-slate-400 rounded-2xl transition-all"><MoreVertical size={20} /></button>
                </div>
              </div>

              {/* Thread de Mensagens */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-white/40">
                {threadMessages.length === 0 ? (
                  <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-300" size={40} /></div>
                ) : (
                  threadMessages.map((m, idx) => {
                    const isMe = m.senderId === currentUserId
                    return (
                      <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`max-w-[85%] md:max-w-[70%] p-5 rounded-[1.8rem] shadow-sm relative ${
                          isMe 
                            ? 'bg-slate-900 text-white rounded-br-none shadow-slate-300' 
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                        }`}>
                          {!isMe && (
                             <p className="text-[10px] font-medium uppercase tracking-wider text-slate-700 mb-1.5 opacity-80">{m.sender?.name || m.sender?.username}</p>
                          )}
                          <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                            <MarkdownContent content={m.content} />
                          </div>
                           <div className={`mt-3 flex items-center justify-end gap-1.5 text-[9px] font-medium ${isMe ? 'text-slate-400' : 'text-slate-400'}`}>
                             {formatarHora(m.createdAt)}
                             {isMe && <CheckCheck size={12} className="text-slate-600" />}
                           </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Barra de Resposta */}
              {selectedMessage.allowReplies !== false && (
                <div className="p-4 md:p-8 bg-white border-t border-slate-200 shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.05)]">
                  <form onSubmit={handleQuickReply} className="relative group">
                    <input 
                      type="text"
                      value={replyContent}
                      onChange={e => setReplyContent(e.target.value)}
                      placeholder="Escreva sua resposta..."
                      className="w-full pl-6 pr-20 py-5 bg-slate-50 border-none rounded-[1.8rem] font-medium text-slate-800 focus:ring-2 focus:ring-slate-500 focus:bg-white transition-all outline-none placeholder:text-slate-300"
                    />
                    <button 
                      type="submit"
                      disabled={!replyContent.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-4 bg-slate-700 text-white rounded-[1.4rem] hover:bg-slate-800 transition-all shadow-lg shadow-slate-300 active:scale-95 disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/10">
              <div className="w-32 h-32 bg-white rounded-3xl shadow-xl shadow-slate-300/50 flex items-center justify-center mb-10 animate-bounce duration-[3000ms]">
                 <div className="w-16 h-16 bg-slate-100 text-slate-700 rounded-[1.5rem] flex items-center justify-center">
                   <MessageSquare size={32} />
                 </div>
              </div>
              <h3 className="text-2xl font-medium text-slate-800 tracking-tight">Suas Mensagens</h3>
              <p className="text-slate-400 font-medium max-w-[280px] mt-3 leading-relaxed">
                Selecione uma conversa ao lado para ler os detalhes ou clica no "+" para iniciar uma nova.
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </>
  )
}


