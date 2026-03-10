"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Shield, GraduationCap, PauseCircle, Clock, CheckCircle2,
  CheckCheck, Loader2, X, Users, Search, Filter
} from "lucide-react"
import UserActions from "./UserActions"

interface Usuario {
  id: string
  name: string | null
  email: string
  username: string | null
  isSuperuser: boolean
  isStaff: boolean
  isActive: boolean
  isApproved: boolean
  _count: { disciplinasPermitidas: number }
}

interface UsuariosClientProps {
  usuarios: Usuario[]
}

export default function UsuariosClient({ usuarios }: UsuariosClientProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [aprovando, setAprovando] = useState(false)
  const [resultMsg, setResultMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [search, setSearch] = useState("")
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pendentes" | "ativos">("todos")

  // Filtragem
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(u => {
      const matchSearch =
        !search ||
        (u.name?.toLowerCase().includes(search.toLowerCase())) ||
        (u.email.toLowerCase().includes(search.toLowerCase())) ||
        (u.username?.toLowerCase().includes(search.toLowerCase()))

      const matchStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "pendentes" && !u.isApproved) ||
        (filtroStatus === "ativos" && u.isApproved && u.isActive)

      return matchSearch && matchStatus
    })
  }, [usuarios, search, filtroStatus])

  // Só pendentes podem ser aprovados em massa
  const pendentesSelecionados = Array.from(selectedIds).filter(id =>
    usuarios.find(u => u.id === id && !u.isApproved)
  )
  const totalPendentes = usuarios.filter(u => !u.isApproved).length

  // Contadores gerais (sempre sobre a lista completa)
  const stats = useMemo(() => ({
    total:      usuarios.length,
    ativos:     usuarios.filter(u => u.isApproved && u.isActive).length,
    pendentes:  usuarios.filter(u => !u.isApproved).length,
    pausados:   usuarios.filter(u => u.isApproved && !u.isActive).length,
    professores:usuarios.filter(u => u.isStaff && !u.isSuperuser && u.isApproved).length,
    admins:     usuarios.filter(u => u.isSuperuser).length,
  }), [usuarios])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === usuariosFiltrados.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(usuariosFiltrados.map(u => u.id)))
    }
  }

  const selecionarTodosPendentes = () => {
    setSelectedIds(new Set(usuarios.filter(u => !u.isApproved).map(u => u.id)))
  }

  const handleAprovarEmMassa = async () => {
    if (pendentesSelecionados.length === 0) return
    if (!confirm(`Aprovar ${pendentesSelecionados.length} usuário(s)? Uma senha será gerada e enviada por e-mail para cada um.`)) return

    setAprovando(true)
    setResultMsg(null)
    try {
      const res = await fetch('/api/usuarios/aprovar-em-massa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: pendentesSelecionados })
      })
      const data = await res.json()

      setResultMsg({ text: data.message, ok: res.ok })
      setTimeout(() => setResultMsg(null), 6000)
      setSelectedIds(new Set())
      router.refresh()
    } catch {
      setResultMsg({ text: 'Erro de conexão com o servidor', ok: false })
    } finally {
      setAprovando(false)
    }
  }

  return (
    <>
      {/* Cards de contadores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {/* Total */}
        <button
          onClick={() => setFiltroStatus('todos')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filtroStatus === 'todos'
              ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-300'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <Users className={`w-4 h-4 mb-2 ${filtroStatus === 'todos' ? 'text-white/60' : 'text-slate-400'}`} />
          <p className={`text-2xl font-black leading-none ${filtroStatus === 'todos' ? 'text-white' : 'text-slate-800'}`}>{stats.total}</p>
          <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${filtroStatus === 'todos' ? 'text-white/60' : 'text-slate-400'}`}>Total</p>
        </button>

        {/* Ativos */}
        <button
          onClick={() => setFiltroStatus('ativos')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filtroStatus === 'ativos'
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200'
              : 'bg-white border-slate-200 hover:border-emerald-200 hover:shadow-sm'
          }`}
        >
          <CheckCircle2 className={`w-4 h-4 mb-2 ${filtroStatus === 'ativos' ? 'text-white/70' : 'text-emerald-500'}`} />
          <p className={`text-2xl font-black leading-none ${filtroStatus === 'ativos' ? 'text-white' : 'text-slate-800'}`}>{stats.ativos}</p>
          <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${filtroStatus === 'ativos' ? 'text-white/60' : 'text-slate-400'}`}>Ativos</p>
        </button>

        {/* Pendentes */}
        <button
          onClick={() => setFiltroStatus('pendentes')}
          className={`p-4 rounded-2xl border text-left transition-all relative ${
            filtroStatus === 'pendentes'
              ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200'
              : 'bg-white border-slate-200 hover:border-amber-200 hover:shadow-sm'
          }`}
        >
          {stats.pendentes > 0 && filtroStatus !== 'pendentes' && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
          <Clock className={`w-4 h-4 mb-2 ${filtroStatus === 'pendentes' ? 'text-white/70' : 'text-amber-500'}`} />
          <p className={`text-2xl font-black leading-none ${filtroStatus === 'pendentes' ? 'text-white' : 'text-slate-800'}`}>{stats.pendentes}</p>
          <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${filtroStatus === 'pendentes' ? 'text-white/60' : 'text-slate-400'}`}>Pendentes</p>
        </button>

        {/* Pausados */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white text-left">
          <PauseCircle className="w-4 h-4 mb-2 text-rose-400" />
          <p className="text-2xl font-black leading-none text-slate-800">{stats.pausados}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest mt-1 text-slate-400">Pausados</p>
        </div>

        {/* Professores */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white text-left">
          <GraduationCap className="w-4 h-4 mb-2 text-blue-500" />
          <p className="text-2xl font-black leading-none text-slate-800">{stats.professores}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest mt-1 text-slate-400">Professores</p>
        </div>

        {/* Admins */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white text-left">
          <Shield className="w-4 h-4 mb-2 text-purple-500" />
          <p className="text-2xl font-black leading-none text-slate-800">{stats.admins}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest mt-1 text-slate-400">Admins</p>
        </div>
      </div>
      {/* Barra de ferramentas */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
        {/* Busca */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou @username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        {/* Filtro de status */}
        <div className="relative shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value as any)}
            className="pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer transition-all"
          >
            <option value="todos">Todos</option>
            <option value="pendentes">Pendentes ({totalPendentes})</option>
            <option value="ativos">Ativos</option>
          </select>
        </div>

        {/* Botão atalho: selecionar todos pendentes */}
        {totalPendentes > 0 && (
          <button
            onClick={selecionarTodosPendentes}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
          >
            <Clock className="w-3.5 h-3.5" />
            Selecionar {totalPendentes} pendente{totalPendentes !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-300 border border-slate-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-300">
              <tr>
                {/* Checkbox selecionar todos */}
                <th className="pl-6 pr-2 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={usuariosFiltrados.length > 0 && selectedIds.size === usuariosFiltrados.length}
                    ref={el => {
                      if (el) el.indeterminate =
                        selectedIds.size > 0 && selectedIds.size < usuariosFiltrados.length
                    }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                  />
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-widest">Usuário</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-slate-600 uppercase tracking-widest">Função & Status</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-slate-600 uppercase tracking-widest">Permissões</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-slate-600 uppercase tracking-widest">Gerenciamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {usuariosFiltrados.map((usuario) => (
                <tr
                  key={usuario.id}
                  onClick={() => toggleSelect(usuario.id)}
                  className={`transition-colors cursor-pointer
                    ${selectedIds.has(usuario.id) ? 'bg-blue-50' : ''}
                    ${!selectedIds.has(usuario.id) && !usuario.isActive ? 'opacity-60 bg-slate-100' : ''}
                    ${!selectedIds.has(usuario.id) ? 'hover:bg-slate-50' : ''}
                  `}
                >
                  {/* Checkbox */}
                  <td className="pl-6 pr-2 py-4 w-10" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(usuario.id)}
                      onChange={() => toggleSelect(usuario.id)}
                      className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                    />
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-medium text-lg shadow-inner ${
                        !usuario.isApproved
                          ? 'bg-amber-400'
                          : !usuario.isActive
                            ? 'bg-slate-300'
                            : usuario.isSuperuser
                              ? 'bg-gradient-to-br from-slate-500 to-purple-600'
                              : 'bg-gradient-to-br from-slate-500 to-slate-600'
                      }`}>
                        {usuario.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center gap-2">
                          <div className={`text-sm font-medium tracking-tight ${!usuario.isActive ? 'text-slate-600' : 'text-slate-800'}`}>
                            {usuario.name || 'Sem nome'}
                          </div>
                          {!usuario.isApproved && (
                            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                          )}
                        </div>
                        <div className="text-xs text-slate-600 font-medium tracking-tight">{usuario.email}</div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">
                          @{usuario.username}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-1.5">
                        {!usuario.isApproved ? (
                          <span className="px-2.5 py-0.5 inline-flex items-center text-[10px] font-medium uppercase tracking-wider rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 mr-1" />
                            Solicitação
                          </span>
                        ) : (
                          <>
                            {usuario.isSuperuser && (
                              <span className="px-2.5 py-0.5 inline-flex items-center text-[10px] font-medium uppercase tracking-wider rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                                <Shield className="w-3 h-3 mr-1" />Admin
                              </span>
                            )}
                            {usuario.isStaff && (
                              <span className="px-2.5 py-0.5 inline-flex items-center text-[10px] font-medium uppercase tracking-wider rounded-full bg-slate-200 text-slate-800 border border-slate-300">
                                <GraduationCap className="w-3 h-3 mr-1" />Professor
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {usuario.isApproved && !usuario.isActive && (
                        <span className="px-2.5 py-0.5 inline-flex items-center text-[10px] font-medium uppercase tracking-wider rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                          <PauseCircle className="w-3 h-3 mr-1" />Acesso Pausado
                        </span>
                      )}
                      {usuario.isApproved && usuario.isActive && (
                        <span className="px-2.5 py-0.5 inline-flex items-center text-[10px] font-medium uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />Ativo
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    {usuario.isSuperuser ? (
                      <span className="text-slate-700 font-medium text-[10px] uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">Controle Total</span>
                    ) : !usuario.isApproved ? (
                      <span className="text-slate-400 italic text-[10px] font-medium uppercase tracking-widest">A aguardar</span>
                    ) : (
                      <span className="font-medium text-slate-700 text-xs">
                        {usuario._count.disciplinasPermitidas} <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">Disciplinas</span>
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <UserActions
                      userId={usuario.id}
                      userName={usuario.name || ''}
                      isActive={usuario.isActive}
                      isApproved={usuario.isApproved}
                      isSuperuser={usuario.isSuperuser}
                      isStaff={usuario.isStaff}
                    />
                  </td>
                </tr>
              ))}

              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Nenhum usuário encontrado</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barra flutuante de aprovação em massa */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-4 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-slate-900/40 border border-white/10">
            {/* Contagem */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-black shrink-0">
                {selectedIds.size}
              </div>
              <span className="text-sm font-semibold whitespace-nowrap">
                {selectedIds.size === 1 ? 'usuário selecionado' : 'usuários selecionados'}
              </span>
            </div>

            <div className="w-px h-5 bg-white/20" />

            {/* Cancelar */}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-semibold text-white/50 hover:text-white transition-colors uppercase tracking-widest"
            >
              Cancelar
            </button>

            {/* Aprovar em massa (só aparece se há pendentes na seleção) */}
            {pendentesSelecionados.length > 0 && (
              <button
                onClick={handleAprovarEmMassa}
                disabled={aprovando}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50 active:scale-95"
              >
                {aprovando
                  ? <Loader2 size={14} className="animate-spin" />
                  : <CheckCheck size={14} />}
                Aprovar {pendentesSelecionados.length > 1
                  ? `${pendentesSelecionados.length} pendentes`
                  : 'pendente'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toast de resultado */}
      {resultMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className={`flex items-center gap-3 text-white px-5 py-3.5 rounded-2xl shadow-2xl max-w-sm border ${
            resultMsg.ok
              ? 'bg-emerald-600 border-emerald-500/50 shadow-emerald-900/30'
              : 'bg-rose-600 border-rose-500/50 shadow-rose-900/30'
          }`}>
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              {resultMsg.ok ? <CheckCheck size={16} /> : <X size={16} />}
            </div>
            <p className="text-sm font-semibold leading-tight flex-1">{resultMsg.text}</p>
            <button
              onClick={() => setResultMsg(null)}
              className="shrink-0 text-white/60 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
