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
  ChevronRight
} from "lucide-react"
import RichTextEditor from "@/components/RichTextEditor"
import MarkdownContent from "@/components/MarkdownContent"
import { sendMessage, markAsRead, getMessageThread, deleteMessage, markAllAsRead } from "./actions"
import { useRouter } from "next/navigation"

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
  currentUserId
}: { 
  receivedMessages: any[], 
  sentMessages: any[],
  users: any[],
  turmas?: any[],
  currentUserRole: { isSuperuser: boolean, isDirecao: boolean, isStaff: boolean }
  currentUserId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // States
  const [activeTab, setActiveTab] = useState<"inbox" | "sent" | "new">("inbox")
  const [inboxMessages, setInboxMessages] = useState<any[]>(receivedMessages)
  const [sentMessagesList, setSentMessagesList] = useState<any[]>(sentMessages)
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [threadMessages, setThreadMessages] = useState<any[]>([])
  
  const [newMsgSubject, setNewMsgSubject] = useState("")
  const [newMsgContent, setNewMsgContent] = useState("")
  const isTeacherOnly = currentUserRole.isStaff && !currentUserRole.isSuperuser && !currentUserRole.isDirecao
  const [newMsgCategory, setNewMsgCategory] = useState(isTeacherOnly ? "SUPORTE" : "GERAL")
  const [newMsgReceiver, setNewMsgReceiver] = useState("")
  const [newMsgPriority, setNewMsgPriority] = useState("MEDIA")
  const [sending, setSending] = useState(false)
  const [replying, setReplying] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    setInboxMessages(receivedMessages)
    setSentMessagesList(sentMessages)
  }, [receivedMessages, sentMessages])

  const filteredBySearchAndCategory = useMemo(() => {
    let list: any[] = activeTab === "inbox" ? inboxMessages : sentMessagesList
    
    if (filterCategory !== "ALL") {
        list = list.filter((m: any) => m.category === filterCategory)
    }

    if (!searchQuery) return list
    return list.filter((m: any) => 
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.sender?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [activeTab, inboxMessages, sentMessagesList, searchQuery, filterCategory])

  const handleSelectMessage = async (msg: any) => {
    setSelectedMessage(msg)
    setThreadMessages([])
    
    if (activeTab === "inbox" && !msg.isRead) {
      setInboxMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m))
      markAsRead(msg.id).catch(err => console.error("Erro ao marcar como lida:", err))
    }

    const thread = await getMessageThread(msg.id)
    setThreadMessages(thread)
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newMsgSubject || !newMsgContent || sending) return

    setSending(true)
    const formData = new FormData()
    formData.append("subject", newMsgSubject)
    formData.append("content", newMsgContent)
    formData.append("priority", newMsgPriority)
    
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
      setNewMsgContent("")
      setNewMsgCategory(isTeacherOnly ? "SUPORTE" : "GERAL")
      setNewMsgReceiver("")
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

  const ticketStatuses = [
    { value: "ABERTO", label: "Aberto", color: "bg-slate-100 text-slate-600" },
    { value: "EM_ATENDIMENTO", label: "Em Atendimento", color: "bg-blue-100 text-blue-600" },
    { value: "AGUARDANDO_RESPOSTA", label: "Aguardando Resposta", color: "bg-amber-100 text-amber-600" },
    { value: "RESOLVIDO", label: "Resolvido", color: "bg-emerald-100 text-emerald-600" }
  ]

  const priorities = [
    { value: "BAIXA", label: "Baixa", color: "text-slate-400" },
    { value: "MEDIA", label: "Média", color: "text-blue-500" },
    { value: "ALTA", label: "Alta", color: "text-orange-500 font-bold" },
    { value: "CRITICA", label: "Crítica", color: "text-rose-600 font-black" }
  ]

  return (
    <div className="flex bg-white rounded-[2.5rem] shadow-2xl shadow-slate-300/40 border border-slate-200 h-[calc(100vh-180px)] overflow-hidden animate-in fade-in duration-500">
      
      {/* Sidebar - Listagem */}
      <div className={`w-full md:w-[400px] border-r border-slate-100 flex flex-col bg-slate-50/20 ${(selectedMessage || activeTab === 'new') ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Atendimento</h2>
              <button 
                onClick={async () => {
                  startTransition(async () => {
                    await markAllAsRead()
                    setInboxMessages(prev => prev.map(m => ({ ...m, isRead: true })))
                    router.refresh()
                  })
                }}
                disabled={isPending}
                className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-colors mt-2 flex items-center gap-1"
              >
                <CheckCheck size={12} /> Marcar todos como lidos
              </button>
            </div>
            <button
              onClick={() => { setActiveTab("new"); setSelectedMessage(null); }}
              className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-90 flex-shrink-0"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab("inbox")}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === 'inbox' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Entrada
            </button>
            <button
              onClick={() => setActiveTab("sent")}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === 'sent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Enviados
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar chamado..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2 custom-scrollbar">
          {filteredBySearchAndCategory.map((msg: any) => {
            const style = getCatStyles(msg.category)
            const isSelected = selectedMessage?.id === msg.id
            const isUnread = !msg.isRead && activeTab === 'inbox'
            const statusData = ticketStatuses.find(s => s.value === msg.status) || ticketStatuses[0]
            const priorityData = priorities.find(p => p.value === msg.priority) || priorities[1]

            return (
              <div 
                key={msg.id}
                onClick={() => handleSelectMessage(msg)}
                className={`group p-5 rounded-[2rem] cursor-pointer transition-all border ${
                  isSelected 
                    ? 'bg-white border-indigo-200 shadow-xl shadow-indigo-500/5 ring-1 ring-indigo-50' 
                    : isUnread 
                      ? 'bg-indigo-50/30 border-indigo-100' 
                      : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col gap-1.5">
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${style.bg} ${style.text} ${style.border}`}>
                      {style.label}
                    </span>
                    <div className="flex items-center gap-2">
                       <span className={`text-[8px] font-black uppercase tracking-widest ${priorityData.color}`}>
                        {priorityData.label}
                      </span>
                      {!msg.isResolved && msg.category !== 'GERAL' && (
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${statusData.color} border border-current opacity-70`}>
                          {statusData.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{formatarData(msg.createdAt)}</span>
                </div>
                
                <h4 className={`text-sm truncate ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                  {activeTab === 'inbox' ? (msg.sender?.name || msg.sender?.username) : (msg.receiver?.name || 'Geral')}
                </h4>
                <p className="text-[11px] font-medium text-slate-400 truncate mt-1">
                  {msg.subject.replace(/\[Ticket\]|\[Cadastro Pendente\]/gi, '').trim()}
                </p>
                {isUnread && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Novo Alerta</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Área Principal */}
      <div className={`flex-1 flex flex-col bg-white overflow-hidden ${!selectedMessage && activeTab !== 'new' ? 'hidden md:flex' : 'flex'}`}>
        
        {activeTab === "new" ? (
          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            <div className="max-w-2xl mx-auto space-y-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Novo Chamado</h2>
                  <p className="text-sm font-medium text-slate-500 mt-2">Escolha a categoria adequada para agilizar seu atendimento.</p>
                </div>
                <button onClick={() => setActiveTab("inbox")} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Para quem?</label>
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
                        <option value="COMUNICADO">Comunicado Oficial</option>
                        <option value="COMUNICADO_TURMA">Aviso para Turma</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Urgência</label>
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

                {newMsgCategory === "GERAL" && (
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destinatário</label>
                    <select 
                      value={newMsgReceiver} 
                      onChange={e => setNewMsgReceiver(e.target.value)}
                      className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                    >
                      <option value="">Selecione o usuário...</option>
                      {users.filter(u => u.id !== currentUserId).map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.username} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assunto do Chamado</label>
                <input 
                  type="text" 
                  value={newMsgSubject} 
                  onChange={e => setNewMsgSubject(e.target.value)}
                  placeholder="Ex: Erro ao lançar nota da 3ª Unidade"
                  className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição Detalhada</label>
                <RichTextEditor
                  value={newMsgContent}
                  onChange={setNewMsgContent}
                  className="min-h-[250px]"
                />
              </div>

              <button 
                onClick={() => handleSendMessage()}
                disabled={sending}
                className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
              >
                {sending ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                {sending ? "Abrindo Chamado..." : "Enviar Solicitação"}
              </button>
            </div>
          </div>
        ) : selectedMessage ? (
          <div className="flex-1 flex flex-col h-full bg-slate-50/30">
            <div className="px-10 py-8 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-6">
                 <button onClick={() => setSelectedMessage(null)} className="p-3 md:hidden bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all"><ArrowLeft size={20} /></button>
                 <div className="w-14 h-14 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-100">
                    {selectedMessage.senderId === currentUserId ? 'Eu' : (selectedMessage.sender?.name?.charAt(0) || '?')}
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">{selectedMessage.subject.replace(/\[Ticket\]|\[Cadastro Pendente\]/gi, '').trim()}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <Clock size={14} /> {formatarData(selectedMessage.createdAt)} • {formatarHora(selectedMessage.createdAt)}
                      </span>
                      <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${getCatStyles(selectedMessage.category).bg} ${getCatStyles(selectedMessage.category).text} ${getCatStyles(selectedMessage.category).border}`}>
                        {getCatStyles(selectedMessage.category).label}
                      </div>
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 {!selectedMessage.isResolved && selectedMessage.category !== 'GERAL' && (
                   <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100`}>
                     Chamado em Aberto
                   </span>
                 )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar bg-slate-50/50">
              {threadMessages.map((m, idx) => {
                const isMe = m.senderId === currentUserId
                return (
                  <div key={m.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className={`w-full p-6 rounded-2xl shadow-sm border ${
                      isMe ? 'bg-white border-indigo-100' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100/60">
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                             isMe ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
                           }`}>
                             {m.sender?.name?.charAt(0) || m.sender?.username?.charAt(0) || '?'}
                           </div>
                           <div>
                              <p className="text-sm font-bold text-slate-700">{m.sender?.name || m.sender?.username}</p>
                              <p className="text-[10px] font-medium text-slate-400">{formatarData(m.createdAt)} às {formatarHora(m.createdAt)}</p>
                           </div>
                        </div>
                        {isMe && <CheckCheck size={16} className="text-indigo-400" />}
                      </div>
                      <div className="text-sm font-medium text-slate-600 leading-relaxed max-w-none prose prose-slate prose-sm">
                        <MarkdownContent content={m.content} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-8 bg-white border-t border-slate-100">
              <form onSubmit={handleQuickReply} className="relative flex items-center gap-4">
                <input 
                  type="text"
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Escreva sua resposta para este chamado..."
                  className="w-full pl-8 pr-20 py-6 bg-slate-50 border-none rounded-[2rem] font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                />
                <button 
                  type="submit"
                  disabled={!replyContent.trim() || replying}
                  className="absolute right-3 p-4 bg-indigo-600 text-white rounded-[1.5rem] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50"
                >
                  {replying ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
            <div className="w-40 h-40 bg-indigo-50 rounded-[3rem] flex items-center justify-center mb-10 shadow-inner">
               <MessageSquare size={48} className="text-indigo-600 opacity-20" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Central de Atendimento</h3>
            <p className="text-slate-400 font-medium max-w-sm mt-4 leading-relaxed">
              Selecione uma conversa para visualizar o histórico de mensagens ou inicie um novo chamado para suporte.
            </p>
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
