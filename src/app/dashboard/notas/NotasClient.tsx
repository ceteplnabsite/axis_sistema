"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, ChevronRight, Users, Filter, ArrowLeft, TrendingUp, FileText, BarChart3, GraduationCap } from "lucide-react"

export default function NotasClient({ turmas }: { turmas: any[] }) {
  const router = useRouter()
  const [filterTurno, setFilterTurno] = useState("")
  const [filterNome, setFilterNome] = useState("")

  const filteredTurmas = turmas.filter(t => {
    const matchTurno = filterTurno ? t.turno === filterTurno : true
    const matchNome = filterNome ? t.nome.toLowerCase().includes(filterNome.toLowerCase()) : true
    return matchTurno && matchNome
  })

  const uniqueTurnos = Array.from(new Set(turmas.map(t => t.turno).filter(Boolean)))

  const launchTips = [
    {
      title: "Lançamento Ágil",
      description: "As notas são registradas por unidade e a média anual é calculada em tempo real.",
      icon: <FileText className="w-5 h-5 text-emerald-600" />,
      color: "emerald"
    },
    {
      title: "Status de Turma",
      description: "Monitore rapidamente quais turmas já possuem fechamento de notas concluído.",
      icon: <CheckCircle2 className="w-5 h-5 text-slate-700" />,
      color: "blue"
    },
    {
      title: "Recuperação Final",
      description: "Acesse o módulo específico para lançamento de notas substitutivas anuais.",
      icon: <TrendingUp className="w-5 h-5 text-orange-600" />,
      color: "orange"
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-300 sticky top-0 z-50 -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center space-x-5">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-slate-800 tracking-tight">Lançar Notas</h1>
                <p className="text-base text-slate-700 font-medium">Gestão de avaliações e fechamento de unidades</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link 
                  href="/dashboard/notas/recuperacao"
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-medium hover:bg-slate-800 transition-all text-xs uppercase tracking-widest active:scale-95 shadow-xl shadow-slate-300"
              >
                  <TrendingUp size={16} /> Lançar Recuperação Final
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 space-y-8">
        
        {/* Dicas Fixas - Estilo Resultados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {launchTips.map((tip, index) => (
             <div key={index} className="bg-white/60 border border-slate-300/60 p-5 rounded-3xl flex items-start space-x-4 hover:bg-white hover:border-slate-300 hover:shadow-xl hover:shadow-slate-300/30 transition-all group">
                <div className={`p-3 rounded-2xl bg-${tip.color}-50 text-${tip.color}-600 group-hover:bg-${tip.color}-600 group-hover:text-white transition-all shadow-inner`}>
                   {tip.icon}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-800 uppercase tracking-widest mb-1">{tip.title}</h3>
                  <p className="text-[11px] font-medium text-slate-400 uppercase leading-relaxed">{tip.description}</p>
                </div>
             </div>
          ))}
        </div>

        {/* Filtros Premium */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-300/40 border border-slate-200 flex flex-wrap gap-6 items-end relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl"></div>
            
            <div className="flex-1 min-w-[250px] space-y-2">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-2">Pesquisar Turma</label>
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 group-focus-within:text-emerald-600 group-focus-within:bg-emerald-50 transition-all">
                        <Search size={18} />
                    </div>
                    <input 
                        type="text"
                        value={filterNome}
                        onChange={(e) => setFilterNome(e.target.value)}
                        placeholder="Ex: 1º Ano, TDS, Enfermagem..."
                        className="w-full bg-slate-50 hover:bg-slate-200 border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700 shadow-inner placeholder:text-slate-300"
                    />
                </div>
            </div>

            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-2">Turno / Período</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 group-focus-within:text-emerald-600 group-focus-within:bg-emerald-50 transition-all">
                    <Filter size={16} />
                  </div>
                  <select 
                      value={filterTurno}
                      onChange={(e) => setFilterTurno(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-200 border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-emerald-500 transition-all appearance-none cursor-pointer font-medium text-slate-700 shadow-inner"
                  >
                      <option value="">Selecione o Turno...</option>
                      {uniqueTurnos.map((t: any) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
            </div>

            <div className="pb-2.5">
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-100 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{filteredTurmas.length} turmas mapeadas</span>
                </div>
            </div>
        </div>

        {/* Listagem Estilo Premium */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-300/50 border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-200 bg-slate-50/10 flex items-center justify-between">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                 <Users size={16} />
               </div>
               Listagem de Turmas para Lançamento
            </h2>
            <div className="hidden md:block">
              <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-200">
                Acesso Rápido Habilitado
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-300">
                <tr>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest">Turma / Série</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest text-center">Turno</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest text-center">Estudantes</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest text-center">Disciplinas</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest text-center w-24">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTurmas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-300">
                      <BarChart3 className="w-12 h-12 opacity-20 mx-auto mb-3" />
                      <p className="text-sm font-medium uppercase tracking-widest">Ajuste os filtros para localizar a turma</p>
                    </td>
                  </tr>
                ) : (
                  filteredTurmas.map((turma) => (
                    <tr 
                      key={turma.id} 
                      className="group hover:bg-emerald-50/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/notas/lancar/${turma.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <span className="text-base font-medium text-slate-700 uppercase group-hover:text-emerald-700 transition-colors">{turma.nome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-slate-200 text-slate-600 text-[11px] font-medium rounded-lg border border-slate-300 uppercase tracking-wider">
                          {turma.turno || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-slate-700 flex items-center justify-center gap-1.5"><Users size={14} className="text-slate-300" /> {turma._count.estudantes}</span>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-slate-700 flex items-center justify-center gap-1.5"><GraduationCap size={14} className="text-slate-300" /> {turma._count.disciplinas}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <div className="flex justify-center">
                            <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center transition-all">
                               <ChevronRight size={16} />
                            </div>
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}
