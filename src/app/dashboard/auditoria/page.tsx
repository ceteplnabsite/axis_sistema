import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ChevronLeft, Search, Filter, Download, User as UserIcon, Calendar, Activity, Database, Shield, History, Clock, ShieldAlert } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: 'Áxis - Auditoria'
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AuditoriaPage({ 
  searchParams 
}: { 
  searchParams: { q?: string, entity?: string } 
}) {
  const session = await auth()
  
  // Apenas Superuser pode acessar auditoria
  if (!session || !session.user.isSuperuser) {
    redirect("/dashboard")
  }

  const query = searchParams.q || ""
  const entityFilter = searchParams.entity || ""

  let logs: any[] = []
  try {
    // Force raw query to bypass client property issues/cache
    // Adicionado filtros reais via SQL
    const rawLogs = await prisma.$queryRaw`
      SELECT 
        al.id, al.action, al.entity_type as "entityType", al.entity_id as "entityId", 
        al.details, al.created_at as "createdAt", 
        u.name as "userName", u.email as "userEmail"
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 
        (u.name ILIKE ${'%' + query + '%'} OR al.details ILIKE ${'%' + query + '%'} OR al.entity_type ILIKE ${'%' + query + '%'})
        AND (${entityFilter} = '' OR al.entity_type = ${entityFilter})
      ORDER BY al.created_at DESC
      LIMIT 100
    ` as any[]
    
    logs = rawLogs.map(l => ({
      ...l,
      user: { name: l.userName, email: l.userEmail }
    }))
  } catch (error) {
    console.error("Error fetching audit logs:", error)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Link href="/dashboard" className="text-xs font-medium text-slate-400 hover:text-slate-700 flex items-center gap-1 mb-2 transition-colors">
              <ChevronLeft size={14} /> Voltar ao Dashboard
            </Link>
            <h1 className="text-3xl font-medium text-slate-800 tracking-tight flex items-center gap-3">
              <History className="w-8 h-8 text-slate-700" />
              Central de Auditoria
            </h1>
            <p className="text-sm text-slate-600 font-medium">Monitoramento em tempo real de todas as ações críticas do sistema.</p>
          </div>
          
          <div className="bg-white p-4 rounded-3xl border border-slate-300 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <ShieldAlert size={20} />
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-1">Status de Segurança</p>
              <p className="text-sm font-medium text-slate-800">Monitoramento Ativo</p>
            </div>
          </div>
        </div>

        {/* Filters Placeholder */}
        <div className="bg-white border border-slate-300 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
          <form className="flex-1 relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              name="q"
              type="text" 
              defaultValue={query}
              placeholder="Buscar por usuário, detalhes ou entidade..." 
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-slate-500/20 transition-all outline-none"
            />
            <button type="submit" className="hidden" />
          </form>
          <div className="h-10 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex flex-wrap gap-2">
            <Link 
              href="/dashboard/auditoria" 
              className={`px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-widest border transition-all ${
                !entityFilter ? 'bg-slate-700 border-slate-700 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Todos
            </Link>
            {['NOTA', 'QUESTAO', 'USUARIO', 'TURMA'].map(filter => (
              <Link 
                key={filter} 
                href={`/dashboard/auditoria?entity=${filter}${query ? `&q=${query}` : ''}`}
                className={`px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-widest border transition-all ${
                  entityFilter === filter ? 'bg-slate-700 border-slate-700 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {filter}
              </Link>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white border border-slate-300 rounded-3xl overflow-hidden shadow-xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Data / Hora</th>
                <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Autor</th>
                <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Ação</th>
                <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Alvo / Impacto</th>
                <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Entidade</th>
                <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Alterações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.length > 0 ? logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400">
                        <Clock size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700">
                          {new Date(log.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {new Date(log.createdAt).toLocaleTimeString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-medium text-[10px]">
                        {log.user?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{log.user?.name || 'Desconhecido'}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{log.user?.email || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-medium uppercase tracking-widest ${
                      log.action === 'INSERT' ? 'bg-emerald-50 text-emerald-600' :
                      log.action === 'UPDATE' ? 'bg-slate-100 text-slate-700' :
                      'bg-rose-50 text-rose-600'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    {(() => {
                      try {
                        const d = log.details ? JSON.parse(log.details) : {}
                        return (
                          <div>
                            <p className="text-sm font-medium text-slate-800">{d.alvo || d.nome || '-'}</p>
                            {d.disciplina && <p className="text-[10px] text-slate-400 font-medium">{d.disciplina}</p>}
                          </div>
                        )
                      } catch (e) {
                        return <span className="text-slate-400">-</span>
                      }
                    })()}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       <Database size={14} className="text-slate-300" />
                       <span className="text-xs font-medium text-slate-700 uppercase tracking-tight">{log.entityType}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="max-w-xs">
                      {(() => {
                        try {
                          if (!log.details) return <span className="text-slate-400 italic">Sem detalhes</span>
                          const d = JSON.parse(log.details)
                          
                          // Se tiver anterior e atual, fazemos o "vs"
                          if (d.anterior && d.atual) {
                            const keys = Object.keys(d.atual)
                            return (
                              <div className="flex flex-col gap-1.5">
                                {keys.map(k => {
                                  const oldVal = d.anterior[k]
                                  const newVal = d.atual[k]
                                  if (oldVal === newVal) return null
                                  
                                  return (
                                    <div key={k} className="flex items-center gap-2 text-[10px]">
                                      <span className="font-medium text-slate-400 uppercase w-6">{k}:</span>
                                      <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded border border-rose-100 line-through">
                                        {oldVal !== null ? String(oldVal) : 'Ø'}
                                      </span>
                                      <span className="text-slate-300">→</span>
                                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 font-medium">
                                        {newVal !== null ? String(newVal) : 'Ø'}
                                      </span>
                                    </div>
                                  )
                                })}
                                {d.context && <span className="text-[10px] text-slate-400 italic">Contexto: {d.context}</span>}
                              </div>
                            )
                          }

                          const entries = Object.entries(d).filter(([k]) => !['alvo', 'disciplina', 'nome', 'context', 'method'].includes(k))
                          if (entries.length === 0) return <span className="text-slate-400 italic">Ação concluída</span>

                          return (
                            <div className="flex flex-wrap gap-1">
                              {entries.map(([k, v]) => (
                                <span key={k} className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-medium text-slate-700 border border-slate-300">
                                  {k}: <span className="font-medium text-slate-800">{String(v)}</span>
                                </span>
                              ))}
                            </div>
                          )
                        } catch (e) {
                          return <p className="text-[10px] text-slate-400 truncate italic">{log.details}</p>
                        }
                      })()}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="max-w-xs mx-auto space-y-4">
                      <div className="w-16 h-16 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-300 mx-auto">
                        <ShieldAlert size={32} />
                      </div>
                      <p className="text-sm font-medium text-slate-400 uppercase tracking-widest leading-relaxed">
                        Nenhum registro de auditoria encontrado ou erro na conexão.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
