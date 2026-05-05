"use client"

import { useState } from "react"
import { CheckCircle2, UserPlus, Search, Clock, FileText, Check, Loader2 } from "lucide-react"
import Link from "next/link"
import { resolvePendencia } from "./actions"

export default function PendenciasClient({ pendencias }: { pendencias: any[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  
  const extractData = (content: string, field: string) => {
    const regex = new RegExp(`<strong>${field}:<\\/strong> (.*?)<\\/(?:li|p)>`)
    const match = content.match(regex)
    return match ? match[1].trim() : ""
  }

  const parsedList = pendencias.map(p => {
    return {
      id: p.id,
      date: new Date(p.createdAt).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      professor: p.sender.name || p.sender.username,
      turma: extractData(p.content, "Turma"),
      estudante: extractData(p.content, "Estudante") || p.subject.replace("[Cadastro Pendente] Estudante", "").trim(),
      matricula: extractData(p.content, "Matrícula"),
      observacao: extractData(p.content, "Observação do professor")
    }
  }).filter(p => 
    p.estudante.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.turma.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.professor.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleResolve = async (id: string) => {
    setResolvingId(id)
    await resolvePendencia(id)
    setResolvingId(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                <UserPlus size={24} />
              </div>
              Alunos Pendentes
            </h1>
            <p className="text-slate-500 font-medium mt-1 ml-1">
              Lista de solicitações de estudantes que não apareceram na lista de simulados.
            </p>
          </div>
          <Link 
            href="/dashboard/estudantes/novo"
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            + Cadastrar Estudante
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por estudante, turma ou professor..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-medium transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {parsedList.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 border-dashed">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-slate-700">Nenhuma pendência encontrada</h3>
              <p className="text-slate-500 text-sm mt-1">Todos os estudantes parecem estar nas turmas corretas.</p>
            </div>
          ) : (
            parsedList.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center hover:shadow-md transition-all group">
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-rose-100">
                      Pendente
                    </span>
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                      <Clock size={14} /> {item.date}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 uppercase">{item.estudante}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm font-medium text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                        Turma: <strong className="text-slate-700">{item.turma}</strong>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                        Matrícula: <strong className="text-slate-700">{item.matricula || "N/A"}</strong>
                      </span>
                    </div>
                  </div>

                  {item.observacao && (
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-sm text-amber-800 flex items-start gap-2">
                      <FileText size={16} className="mt-0.5 shrink-0 text-amber-500" />
                      <p><strong>Obs:</strong> {item.observacao}</p>
                    </div>
                  )}

                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest pt-2">
                    Solicitado por: <span className="text-slate-600">{item.professor}</span>
                  </p>
                </div>

                <div className="w-full md:w-auto shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                  <button
                    onClick={() => handleResolve(item.id)}
                    disabled={resolvingId === item.id}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                  >
                    {resolvingId === item.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    Marcar como Resolvido
                  </button>
                </div>
                
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
