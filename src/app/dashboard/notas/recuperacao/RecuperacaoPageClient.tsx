"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, ChevronRight, Users, Filter, ArrowLeft, TrendingUp, AlertTriangle, FileText, CheckCircle2, BarChart3 } from "lucide-react"

interface RecuperacaoPageClientProps {
  turmas: any[]
  totalAlunosEmRecuperacao: number
}

export default function RecuperacaoPageClient({ turmas, totalAlunosEmRecuperacao }: RecuperacaoPageClientProps) {
  const [filterTurno, setFilterTurno] = useState("")
  const [filterNome, setFilterNome] = useState("")

  const filteredTurmas = turmas.filter(t => {
    const matchTurno = filterTurno ? t.turno === filterTurno : true
    const matchNome = filterNome ? t.nome.toLowerCase().includes(filterNome.toLowerCase()) : true
    return matchTurno && matchNome
  })

  const uniqueTurnos = Array.from(new Set(turmas.map(t => t.turno).filter(Boolean)))

  const recuperacaoTips = [
    {
      title: "Recuperação Final",
      description: "Lançamento da última oportunidade de aprovação para alunos retidos.",
      icon: <TrendingUp className="w-5 h-5 text-rose-600" />,
      color: "rose"
    },
    {
      title: "Nota Substitutiva",
      description: "A nota de recuperação substitui o resultado final se for superior a 5.0.",
      icon: <CheckCircle2 className="w-5 h-5 text-orange-600" />,
      color: "orange"
    },
    {
      title: "Alerta de Risco",
      description: "Fique atento aos alunos com médias críticas no conselho de classe.",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      color: "amber"
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-300 sticky top-0 z-50 -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex items-center space-x-5">
            <Link
              href="/dashboard/notas"
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-medium text-slate-800 tracking-tight">Lançar Recuperação Final</h1>
              <p className="text-base text-slate-700 font-medium">Registro de notas substitutivas por turma</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 space-y-8">
        
        {/* Dicas Fixas - Estilo Resultados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recuperacaoTips.map((tip, index) => (
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

        {/* Filtros Estilo Simulados */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-5 items-end">
            <div className="flex-1 min-w-[250px] space-y-1.5">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider ml-1">Turma</label>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text"
                        value={filterNome}
                        onChange={(e) => setFilterNome(e.target.value)}
                        placeholder="Ex: 1TIM1, 3TDS..."
                        className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-rose-500 transition-all font-medium"
                    />
                </div>
            </div>

            <div className="flex-1 min-w-[200px] space-y-1.5">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider ml-1">Turno</label>
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select 
                      value={filterTurno}
                      onChange={(e) => setFilterTurno(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-rose-500 transition-all appearance-none cursor-pointer"
                  >
                      <option value="">Selecione o Turno...</option>
                      {uniqueTurnos.map((t: any) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
            </div>

            <div className="flex items-center gap-3 pb-1">
                <div className="text-center px-4 py-2 bg-rose-50 rounded-xl border border-rose-100">
                    <p className="text-[10px] font-medium text-rose-400 uppercase tracking-widest">Alerta</p>
                    <p className="text-base font-medium text-rose-700 leading-none mt-1">{totalAlunosEmRecuperacao}</p>
                </div>
            </div>
        </div>

        {/* Listagem Estilo Simulados (Table) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/10 flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-800 flex items-center gap-2">
               <TrendingUp size={20} className="text-slate-400" />
               Turmas com Pendências (Final)
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-300">
                <tr>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest">Turma / Pendência</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest text-center">Turno</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest text-center">Estudantes</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest text-center w-24">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTurmas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center text-slate-300">
                      <BarChart3 className="w-12 h-12 opacity-20 mx-auto mb-3" />
                       <p className="text-sm font-medium uppercase tracking-widest">Nenhuma turma com pendências encontrada</p>
                    </td>
                  </tr>
                ) : (
                  filteredTurmas.map((turma) => (
                    <tr 
                      key={turma.id} 
                      className="group hover:bg-rose-50/30 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/dashboard/notas/recuperacao/${turma.id}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <span className="text-base font-medium text-slate-700 uppercase group-hover:text-rose-700 transition-colors">{turma.nome}</span>
                           <span className="text-[11px] font-medium text-rose-600/60 uppercase">{turma.totalRecuperacao} ALUNOS PARA RECUPERAÇÃO FINAL</span>
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
                         <div className="flex justify-center">
                            <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-rose-500 group-hover:text-white flex items-center justify-center transition-all">
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
