"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Accessibility, Search, Filter, Users, 
  ChevronRight, CheckCircle2, AlertCircle, 
  BookOpen, PlusCircle, GraduationCap, X, 
  Save, Loader2, Phone, ClipboardCheck, Info
} from "lucide-react"
import { CIDS_AEE } from "@/lib/constants-aee"

export default function AEEDashboardClient({ 
  usuario, 
  aeeAlunos, 
  todasTurmas,
  estudantesSemAee = []
}: { 
  usuario: any, 
  aeeAlunos: any[],
  todasTurmas: any[],
  estudantesSemAee?: any[]
}) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTurma, setFilterTurma] = useState("")
  const isDirecao = usuario.isDirecao || usuario.isSuperuser
  
  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
  const [studentSearch, setStudentSearch] = useState("")
  const [cidSearch, setCidSearch] = useState("")
  
  const [formData, setFormData] = useState({
    cids: [] as string[],
    condicao: "",
    recomendacoes: "",
    notasDirecao: "",
    contatoEmergencia: ""
  })

  const filteredAlunos = aeeAlunos.filter((a: any) => {
    const matchSearch = a.estudante.nome.toLowerCase().includes(searchTerm.toLowerCase()) || a.estudante.matricula.includes(searchTerm)
    const matchTurma = filterTurma ? a.estudante.turmaId === filterTurma : true
    return matchSearch && matchTurma
  })

  const studentsToCreate = estudantesSemAee.filter(s => 
    s.nome.toLowerCase().includes(studentSearch.toLowerCase()) || 
    s.matricula.includes(studentSearch)
  ).slice(0, 5) // Mostrar apenas 5 resultados na busca rápida

  const toggleCID = (code: string) => {
    setFormData(prev => ({
      ...prev,
      cids: prev.cids.includes(code)
        ? prev.cids.filter((c: string) => c !== code)
        : [...prev.cids, code]
    }))
  }

  const handleCreateProfile = async () => {
    if (!selectedStudent || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/estudantes/${selectedStudent.matricula}/aee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setIsModalOpen(false)
        resetForm()
        router.refresh()
      } else {
        alert('Erro ao criar ficha')
      }
    } catch {
      alert('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setSelectedStudent(null)
    setStudentSearch("")
    setFormData({
      cids: [],
      condicao: "",
      recomendacoes: "",
      notasDirecao: "",
      contatoEmergencia: ""
    })
  }

  const filteredCIDs = CIDS_AEE.filter((c: any) => 
    c.code.toLowerCase().includes(cidSearch.toLowerCase()) || 
    c.label.toLowerCase().includes(cidSearch.toLowerCase())
  )

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
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 shadow-xl transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Nova Ficha AEE
            </button>
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
                      {todasTurmas.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
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

      {/* MODAL DE CRIAÇÃO PREMIUM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
            onClick={() => setIsModalOpen(false)}
          ></div>
          
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[3rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <Accessibility className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Nova Ficha AEE</h2>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Inclusão e Atendimento Especializado</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 bg-slate-50/30">
              
              {/* Etapa 1: Seleção do Aluno */}
              {!selectedStudent ? (
                <div className="space-y-4 max-w-2xl mx-auto py-12">
                   <div className="text-center space-y-2 mb-8">
                     <Users className="w-12 h-12 text-slate-300 mx-auto" />
                     <h3 className="text-lg font-bold text-slate-800">Selecione o Estudante</h3>
                     <p className="text-sm text-slate-500">Apenas alunos que ainda não possuem ficha AEE são listados abaixo.</p>
                   </div>
                   
                   <div className="relative group">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                     <input 
                       type="text" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)}
                       placeholder="Buscar por nome ou matrícula..."
                       className="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-base font-semibold outline-none focus:border-indigo-500 shadow-sm transition-all"
                     />
                   </div>

                   <div className="grid grid-cols-1 gap-2">
                     {studentsToCreate.map(s => (
                       <button 
                         key={s.matricula}
                         onClick={() => setSelectedStudent(s)}
                         className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50/30 hover:shadow-md transition-all group"
                       >
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all uppercase">
                             {s.nome.charAt(0)}
                           </div>
                           <div className="text-left">
                             <p className="text-sm font-bold text-slate-800 uppercase">{s.nome}</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.turma.nome} · Matrícula: {s.matricula}</p>
                           </div>
                         </div>
                         <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 translate-x-0 group-hover:translate-x-1 transition-all" />
                       </button>
                     ))}
                     {studentSearch && studentsToCreate.length === 0 && (
                       <p className="text-center py-4 text-sm text-slate-400 italic">Nenhum estudante encontrado.</p>
                     )}
                   </div>
                </div>
              ) : (
                /* Etapa 2: Formulário */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 space-y-6">
                    {/* Resumo do Aluno Selecionado */}
                    <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-xl shadow-indigo-100 flex items-center gap-4">
                       <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                          {selectedStudent.nome.charAt(0)}
                       </div>
                       <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-base truncate uppercase">{selectedStudent.nome}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{selectedStudent.turma.nome}</p>
                          <button onClick={() => setSelectedStudent(null)} className="text-[10px] font-black uppercase tracking-widest mt-1 hover:underline flex items-center gap-1">
                            <X className="w-3 h-3" /> Trocar Aluno
                          </button>
                       </div>
                    </div>

                    {/* Seleção de CIDs */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                           <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnóstico (CIDs)</h5>
                           <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100">{formData.cids.length} selecionados</span>
                        </div>
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input 
                            type="text" placeholder="Filtrar CIDs..." value={cidSearch}
                            onChange={(e) => setCidSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10"
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {filteredCIDs.map(c => (
                            <button 
                              key={c.code} onClick={() => toggleCID(c.code)}
                              className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                                formData.cids.includes(c.code) 
                                ? 'bg-indigo-50 border-indigo-600' 
                                : 'bg-white border-slate-100 hover:border-slate-200'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                formData.cids.includes(c.code) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                              }`}>
                                {formData.cids.includes(c.code) && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter leading-none mb-0.5">{c.code}</p>
                                <p className="text-[11px] font-bold text-slate-700 leading-tight truncate">{c.label}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                    </div>

                    {/* Contato Emergência */}
                    <div className="bg-slate-900 text-white p-6 rounded-[2rem] space-y-3">
                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <Phone className="w-3.5 h-3.5" /> Contato de Emergência
                       </h5>
                       <input 
                        type="text" value={formData.contatoEmergencia}
                        onChange={(e) => setFormData({...formData, contatoEmergencia: e.target.value})}
                        placeholder="Nome e Telefone..."
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:bg-white/20 transition-all placeholder:text-white/30"
                       />
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                       {/* Contexto */}
                       <div className="space-y-4">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <Info className="w-4 h-4 text-amber-500" /> Condição do Estudante
                          </label>
                          <textarea 
                            rows={3} value={formData.condicao}
                            onChange={(e) => setFormData({...formData, condicao: e.target.value})}
                            placeholder="Descreva a condição pedagógica e médica do estudante..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                          />
                       </div>

                       {/* Orientações */}
                       <div className="space-y-4 bg-emerald-50/50 p-6 rounded-[2.5rem] border border-emerald-100">
                          <label className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                             <ClipboardCheck className="w-4 h-4" /> Orientações para o Professor
                          </label>
                          <textarea 
                            rows={5} value={formData.recomendacoes}
                            onChange={(e) => setFormData({...formData, recomendacoes: e.target.value})}
                            placeholder="Recomendações sobre avaliações, tempo extra, apoio em sala..."
                            className="w-full bg-white border border-emerald-200 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                          />
                       </div>

                       {/* Observações Internas */}
                       <div className="space-y-4">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <GraduationCap className="w-4 h-4 text-purple-500" /> Observações da Coordenação
                          </label>
                          <textarea 
                            rows={2} value={formData.notasDirecao}
                            onChange={(e) => setFormData({...formData, notasDirecao: e.target.value})}
                            placeholder="Notas administrativas e acompanhamento interno..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                          />
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-slate-100 bg-white flex justify-end gap-4 sticky bottom-0 z-10">
              <button 
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="px-8 py-4 text-sm font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateProfile}
                disabled={!selectedStudent || saving || formData.cids.length === 0}
                className="flex items-center gap-3 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all disabled:opacity-50 disabled:grayscale"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Criando...' : 'Criar Ficha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
