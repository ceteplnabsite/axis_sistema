"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Accessibility, Search, Filter, Users, 
  ChevronRight, CheckCircle2, AlertCircle, 
  BookOpen, PlusCircle, GraduationCap
} from "lucide-react"

export default function AEEDashboardClient({ 
  usuario, 
  aeeAlunos, 
  todasTurmas 
}: { 
  usuario: any, 
  aeeAlunos: any[],
  todasTurmas: any[]
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTurma, setFilterTurma] = useState("")
  const isDirecao = usuario.isDirecao || usuario.isSuperuser

  const filteredAlunos = aeeAlunos.filter(a => {
    const matchSearch = a.estudante.nome.toLowerCase().includes(searchTerm.toLowerCase()) || a.estudante.matricula.includes(searchTerm)
    const matchTurma = filterTurma ? a.estudante.turmaId === filterTurma : true
    return matchSearch && matchTurma
  })

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      {/* Header Estilo Premium */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Accessibility className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Painel AEE - Inclusão Escolar</h1>
              <p className="text-sm font-medium text-slate-500">Monitoramento de Atendimento Especializado</p>
            </div>
          </div>
          
          {isDirecao && (
            <Link 
              href="/dashboard/estudantes"
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 shadow-xl transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Nova Ficha AEE
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        
        {/* Resumo e Filtros */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
             <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm text-center">
                <p className="text-4xl font-black text-indigo-600 mb-1">{aeeAlunos.length}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Alunos Mapeados</p>
             </div>

             <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Pesquisar Estudante</label>
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-indigo-600" />
                    <input 
                      type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Nome ou Matrícula..."
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Filtrar por Turma</label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select 
                      value={filterTurma} onChange={(e) => setFilterTurma(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all"
                    >
                      <option value="">Todas as Turmas</option>
                      {todasTurmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                </div>
             </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {filteredAlunos.length === 0 ? (
              <div className="bg-white py-20 rounded-[3rem] border border-dashed border-slate-300 text-center">
                 <Accessibility className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                 <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Nenhum registro encontrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {filteredAlunos.map(a => (
                   <div key={a.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all group overflow-hidden relative">
                      {/* Badge de Status de Leitura */}
                      <div className="absolute top-0 right-0 p-4">
                         {a.acknowledgements.length === 0 ? (
                           <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 animate-pulse">
                              <AlertCircle className="w-3 h-3" />
                              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Atrasado</span>
                           </div>
                         ) : (
                           <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                              <CheckCircle2 className="w-3 h-3" />
                              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Em Acompanhamento</span>
                           </div>
                         )}
                      </div>

                      <div className="flex items-start gap-5">
                         <div className="w-16 h-16 bg-slate-100 rounded-[1.5rem] flex items-center justify-center text-indigo-600 text-xl font-black shrink-0">
                            {a.estudante.nome.charAt(0)}
                         </div>
                         <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-1">{a.estudante.turma.nome}</p>
                            <h3 className="text-lg font-bold text-slate-800 leading-tight truncate mb-1 group-hover:text-indigo-600 transition-colors uppercase">{a.estudante.nome}</h3>
                            <div className="flex flex-wrap gap-1.5">
                               {a.cids.map((c: string) => (
                                 <span key={c} className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 uppercase">{c}</span>
                               ))}
                            </div>
                         </div>
                      </div>

                      <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between gap-4">
                         <div className="flex items-center gap-2">
                           <div className="flex -space-x-2">
                              {a.acknowledgements.slice(0, 3).map((ack: any) => (
                                <div key={ack.id} className="w-8 h-8 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-700 shadow-sm" title={ack.user.name}>
                                   {ack.user.name.charAt(0)}
                                </div>
                              ))}
                              {a.acknowledgements.length > 3 && (
                                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                   +{a.acknowledgements.length - 3}
                                </div>
                              )}
                           </div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                             {a.acknowledgements.length} professores já leram
                           </p>
                         </div>

                         <Link 
                           href={`/dashboard/aee/${a.estudanteId}`}
                           className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors"
                         >
                            <span className="text-xs font-bold uppercase tracking-widest">Acessar Ficha</span>
                            <ChevronRight className="w-4 h-4" />
                         </Link>
                      </div>
                   </div>
                 ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
