"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Search, Users, Plus, Filter, Accessibility,
  Trash2, AlertCircle, Info, ClipboardCheck, Phone,
  Settings, Save, Pencil, Clock, CheckCircle2, Upload,
  X, GraduationCap, ChevronRight, FileDown, Lock, FileText, ShieldCheck,
  PlusCircle, Edit3, Loader2
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

  // States
  const [activePanel, setActivePanel] = useState<'create' | 'edit' | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [studentSearch, setStudentSearch] = useState("")
  const [cidSearch, setCidSearch] = useState("")

  const [formData, setFormData] = useState({
    cids: [] as string[],
    condicao: "",
    recomendacoes: "",
    notasDirecao: "",
    contatoNome: "",
    contatoTelefone: "",
    precisaProvaAdaptada: false,
    precisaProvaSalaEspecial: false,
    fotoUrl: ""
  })

  // Handlers
  const filteredAlunos = aeeAlunos.filter((a: any) => {
    const matchSearch = a.estudante.nome.toLowerCase().includes(searchTerm.toLowerCase()) || a.estudante.matricula.includes(searchTerm)
    const matchTurma = filterTurma ? a.estudante.turmaId === filterTurma : true
    return matchSearch && matchTurma
  })

  const openEdit = (profile: any) => {
    setSelectedProfile(profile)
    setIsEditing(false) // Começa apenas visualizando
    setFormData({
      cids: profile.cids || [],
      condicao: profile.condicao || "",
      recomendacoes: profile.recomendacoes || "",
      notasDirecao: profile.notasDirecao || "",
      contatoNome: profile.contatoNome || "",
      contatoTelefone: profile.contatoTelefone || "",
      precisaProvaAdaptada: profile.precisaProvaAdaptada || false,
      precisaProvaSalaEspecial: profile.precisaProvaSalaEspecial || false,
      fotoUrl: profile.fotoUrl || ""
    })
    setActivePanel('edit')
  }

  const openCreate = (student: any) => {
    setSelectedStudent(student)
    setIsEditing(true) // Criação é sempre edição
    setFormData({
      cids: [], condicao: "", recomendacoes: "", notasDirecao: "",
      contatoNome: "", contatoTelefone: "",
      precisaProvaAdaptada: false, precisaProvaSalaEspecial: false, fotoUrl: ""
    })
    setActivePanel('create')
  }

  const handleSave = async () => {
    const matricula = activePanel === 'create' ? selectedStudent?.matricula : selectedProfile?.estudante.matricula
    if (!matricula || saving) return

    setSaving(true)
    try {
      const res = await fetch(`/api/estudantes/${matricula}/aee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setIsEditing(false)
        setActivePanel(null)
        router.refresh()
      } else {
        alert('Erro ao salvar ficha')
      }
    } catch {
      alert('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  const handleAtestar = async (profile: any) => {
    if (isDirecao) return
    setSaving(true)
    try {
      const res = await fetch(`/api/estudantes/${profile.estudante.matricula}/aee/atestar`, { method: 'POST' })
      if (res.ok) router.refresh()
    } catch {
      alert('Erro ao atestar leitura')
    } finally {
      setSaving(false)
    }
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11)
    if (numbers.length <= 10) return numbers.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d)(\d{4})$/, "$1-$2")
    return numbers.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d)(\d{4})$/, "$1-$2")
  }

  const toggleCID = (code: string) => {
    if (!isEditing) return
    setFormData(p => ({ ...p, cids: p.cids.includes(code) ? p.cids.filter(c => c !== code) : [...p.cids, code] }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing) return
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return alert("Máximo 2MB")
    const reader = new FileReader()
    reader.onload = () => setFormData(p => ({ ...p, fotoUrl: reader.result as string }))
    reader.readAsDataURL(file)
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10 text-slate-900 antialiased">
      {/* Header Dinâmico */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-300 sticky top-0 z-50 -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
             <div className="flex items-center space-x-5">
               <button
                 onClick={() => activePanel ? setActivePanel(null) : router.push('/dashboard')}
                 className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
               >
                 <ArrowLeft size={20} />
               </button>
               <div>
                 <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                   {activePanel === 'create' ? 'Nova Ficha de Atendimento' : activePanel === 'edit' ? 'Ficha Individual de AEE' : 'Atendimento Especializado (AEE)'}
                 </h1>
                 <p className="text-base text-slate-700 font-medium">
                   {activePanel ? 'Registro Oficial de Inclusão' : 'Controle de Inclusão e Acessibilidade'}
                 </p>
               </div>
             </div>

             <div className="flex items-center gap-3">
               {!activePanel && isDirecao && (
                 <button
                   onClick={() => { setActivePanel('create'); setSelectedStudent(null); setStudentSearch(""); }}
                   className="flex items-center justify-center space-y-0 space-x-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2.5 rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-sm text-sm font-medium uppercase tracking-widest active:scale-95"
                 >
                   <PlusCircle className="w-4 h-4" />
                   <span className="whitespace-nowrap">Nova Ficha</span>
                 </button>
               )}

               {activePanel === 'edit' && isDirecao && !isEditing && (
                 <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 bg-white border border-slate-300 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                 >
                    <Edit3 size={14} /> Editar Ficha
                 </button>
               )}

               {(activePanel === 'create' || (isDirecao && isEditing)) && (
                 <button 
                    onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 shadow-sm"
                 >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Gravando...' : 'Salvar Alterações'}
                 </button>
               )}

               {!isDirecao && activePanel === 'edit' && !selectedProfile?.acknowledgements?.some((ack: any) => ack.user.id === usuario.id) && (
                 <button 
                    onClick={() => handleAtestar(selectedProfile)} disabled={saving}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm"
                 >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
                    Confirmar Ciência
                 </button>
               )}
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 space-y-8">
        {!activePanel ? (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4 shadow-xl shadow-slate-200/50">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 text-slate-900 shadow-sm">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">{aeeAlunos.length}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Alunos Mapeados</p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4 shadow-xl shadow-slate-200/50">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 text-emerald-600 shadow-sm">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">{aeeAlunos.filter(a => a.acknowledgements.length > 0).length}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Leituras Confirmadas</p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4 shadow-xl shadow-slate-200/50">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100 text-amber-600 shadow-sm">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">{aeeAlunos.filter(a => a.acknowledgements.length === 0).length}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Pendentes de Leitura</p>
                  </div>
               </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-5 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/60">
               <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" placeholder="Buscar aluno por nome ou matrícula..." 
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-slate-100 outline-none transition-all placeholder:text-slate-400"
                  />
               </div>
               <div className="flex items-center gap-2 w-full md:w-auto">
                  <Filter className="w-4 h-4 text-slate-400 ml-2" />
                  <select 
                    value={filterTurma} onChange={e => setFilterTurma(e.target.value)}
                    className="flex-1 md:w-64 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none appearance-none focus:bg-white transition-all cursor-pointer shadow-sm hover:bg-slate-100"
                  >
                     <option value="">Todas as Turmas</option>
                     {todasTurmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
               </div>
            </div>

            {/* LIST */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-300/40">
               {filteredAlunos.length === 0 ? (
                 <div className="p-24 text-center">
                   <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200 border border-slate-100 shadow-inner">
                      <Accessibility size={40} />
                   </div>
                   <p className="text-slate-400 uppercase tracking-[0.2em] text-[10px] font-black">Nenhum registro encontrado</p>
                   <p className="text-slate-900 font-medium mt-2">Tente outros critérios de busca ou filtros.</p>
                 </div>
               ) : (
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                           <th className="px-6 py-3.5 text-[10px] text-slate-900 uppercase tracking-widest font-semibold">Estudante</th>
                           <th className="px-6 py-3.5 text-[10px] text-slate-900 uppercase tracking-widest font-semibold">Turma</th>
                           <th className="px-6 py-3.5 text-[10px] text-slate-900 uppercase tracking-widest font-semibold">Diagnóstico</th>
                           <th className="px-6 py-3.5 text-[10px] text-slate-900 uppercase tracking-widest font-semibold">Acompanhamento</th>
                           <th className="px-6 py-3.5 text-right"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {filteredAlunos.map(a => (
                          <tr key={a.id} onClick={() => openEdit(a)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                   <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-900 font-medium text-sm border border-slate-200 overflow-hidden">
                                      {a.fotoUrl ? <img src={a.fotoUrl} className="w-full h-full object-cover" /> : a.estudante.nome.charAt(0)}
                                   </div>
                                   <div>
                                      <p className="text-sm font-medium text-slate-900 uppercase leading-none mb-1">{a.estudante.nome}</p>
                                      <p className="text-[10px] text-slate-900 uppercase tracking-tighter">Mat: {a.estudante.matricula}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-4 text-xs text-slate-900 font-medium uppercase">{a.estudante.turma.nome}</td>
                             <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                   {a.cids.slice(0, 2).map((c: string) => (
                                     <span key={c} className="text-[9px] bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded border border-slate-200 uppercase">{c}</span>
                                   ))}
                                   {a.cids.length > 2 && <span className="text-[9px] text-slate-900">+{a.cids.length - 2}</span>}
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                {a.acknowledgements.length === 0 ? (
                                   <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                                      <div className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                                      <span className="text-[9px] uppercase tracking-widest font-medium">Pendente</span>
                                   </div>
                                ) : (
                                   <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                                      <CheckCircle2 size={10} />
                                      <span className="text-[9px] uppercase tracking-widest font-medium">Lido</span>
                                   </div>
                                )}
                             </td>
                             <td className="px-6 py-4 text-right">
                               <ChevronRight size={16} className="inline text-slate-300 group-hover:text-black transition-colors" />
                             </td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                 </div>
               )}
            </div>
          </>
        ) : (
          <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-12">
             {activePanel === 'create' && !selectedStudent ? (
                <div className="max-w-2xl mx-auto space-y-8 py-10">
                   <div className="text-center space-y-2">
                      <h3 className="text-xl font-semibold">Vincular Estudante</h3>
                      <p className="text-sm text-slate-900">Pesquise abaixo para carregar os dados base do estudante.</p>
                   </div>
                   <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                         type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                         placeholder="Nome ou Matrícula..."
                         className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-black/5 outline-none transition-all"
                      />
                   </div>
                   <div className="grid grid-cols-1 gap-2">
                      {estudantesSemAee.filter(s => s.nome.toLowerCase().includes(studentSearch.toLowerCase())).slice(0, 8).map(s => (
                         <button 
                            key={s.matricula} onClick={() => openCreate(s)}
                            className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-black transition-all group"
                         >
                            <div className="flex items-center gap-4 text-left">
                               <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-medium text-slate-400">{s.nome.charAt(0)}</div>
                               <div>
                                  <p className="text-sm font-semibold uppercase text-slate-900">{s.nome}</p>
                                  <p className="text-[10px] text-slate-900 uppercase tracking-widest">{s.turma.nome}</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-slate-300 group-hover:text-black" />
                         </button>
                      ))}
                   </div>
                  ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                   {/* DESKTOP BANNER: Identificação Horizontal Compacta */}
                   <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-slate-200/40">
                      <div className="relative group shrink-0">
                         <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
                            {formData.fotoUrl ? (
                               <img src={formData.fotoUrl} className="w-full h-full object-cover" />
                            ) : (
                               <Users size={28} className="text-slate-300" />
                            )}
                         </div>
                         {isEditing && (
                            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer">
                               <Upload size={16} className="text-white" />
                               <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                         )}
                      </div>
                      <div className="flex-1 text-center md:text-left space-y-1">
                         <div className="flex flex-col md:flex-row md:items-center gap-3">
                            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                               {activePanel === 'create' ? selectedStudent?.nome : selectedProfile?.estudante.nome}
                            </h3>
                            {activePanel === 'edit' && !isEditing && (
                               <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 self-center md:self-auto">
                                  <Accessibility size={10} />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Ficha Ativa</span>
                               </div>
                            )}
                         </div>
                         <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
                            <div className="flex items-center gap-2">
                               <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">Matrícula</span>
                               <span className="text-xs font-bold text-slate-700">{activePanel === 'create' ? selectedStudent?.matricula : selectedProfile?.estudante.matricula}</span>
                            </div>
                            <div className="w-px h-3 bg-slate-200 hidden md:block" />
                            <div className="flex items-center gap-2">
                               <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">Turma</span>
                               <span className="text-xs font-bold text-slate-700 uppercase">{activePanel === 'create' ? selectedStudent?.turma.nome : selectedProfile?.estudante.turma.nome}</span>
                            </div>
                         </div>
                      </div>
                      
                      {activePanel === 'edit' && !isEditing && (
                         <div className="shrink-0 flex items-center gap-4 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 shadow-inner">
                            <div>
                               <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Ciência</p>
                               {selectedProfile.acknowledgements.length === 0 ? (
                                  <div className="flex items-center gap-1 text-amber-600">
                                     <Clock size={12} className="animate-pulse" />
                                     <span className="text-[10px] font-bold uppercase tracking-tight">Pendente</span>
                                  </div>
                               ) : (
                                  <div className="flex items-center gap-1 text-emerald-600">
                                     <CheckCircle2 size={12} />
                                     <span className="text-[10px] font-bold uppercase tracking-tight">{selectedProfile.acknowledgements.length} Leituras</span>
                                  </div>
                               )}
                            </div>
                         </div>
                      )}
                   </div>

                   {/* Grid Superior: Dados Compactos */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Diagnóstico (CIDs) */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl shadow-slate-200/40 space-y-3">
                         <label className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="p-1 bg-rose-50 text-rose-500 rounded-md border border-rose-100">
                               <AlertCircle size={12} />
                            </div>
                            Diagnóstico Clínico (CIDs)
                         </label>
                         
                         {isEditing ? (
                            <div className="space-y-2">
                               <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                  <input 
                                    type="text" placeholder="Buscar CID..." value={cidSearch} onChange={e => setCidSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-bold focus:bg-white outline-none"
                                  />
                               </div>
                               <div className="flex flex-col gap-1 max-h-32 overflow-y-auto p-1 custom-scrollbar">
                                  {CIDS_AEE.filter(c => c.code.includes(cidSearch.toUpperCase()) || c.label.toUpperCase().includes(cidSearch.toUpperCase())).map(c => (
                                     <button 
                                        key={c.code} onClick={() => toggleCID(c.code)}
                                        className={`flex items-center justify-between px-2 py-1.5 rounded-md border text-[8px] font-bold transition-all text-left ${
                                           formData.cids.includes(c.code) ? 'bg-black text-white border-black' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                     >
                                        <div className="flex items-center gap-2">
                                           <span className={`px-1 rounded font-black border ${formData.cids.includes(c.code) ? 'bg-white/20 border-white/30' : 'bg-slate-100 border-slate-200 text-slate-900'}`}>{c.code}</span>
                                           <span className="uppercase tracking-tight opacity-90 line-clamp-1">{c.label}</span>
                                        </div>
                                        {formData.cids.includes(c.code) && <CheckCircle2 size={10} className="text-white" />}
                                     </button>
                                  ))}
                               </div>
                            </div>
                         ) : (
                            <div className="grid grid-cols-1 gap-1.5">
                               {formData.cids.length > 0 ? formData.cids.map(code => {
                                  const cid = CIDS_AEE.find(c => c.code === code)
                                  return (
                                     <div key={code} className="bg-slate-50 border border-slate-100 p-2 rounded-xl flex items-center gap-2 transition-all hover:bg-white hover:border-slate-200">
                                        <div className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0">
                                           {code}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-800 uppercase tracking-tight leading-tight">
                                           {cid?.label || "CID Desconhecido"}
                                        </div>
                                     </div>
                                  )
                               }) : (
                                  <div className="py-4 text-center border border-dashed border-slate-200 rounded-xl">
                                     <p className="text-[9px] text-slate-400 italic font-medium">Nenhum diagnóstico registrado.</p>
                                  </div>
                               )}
                            </div>
                         )}
                      </div>

                      {/* Configurações de Prova */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl shadow-slate-200/40 space-y-3">
                         <label className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="p-1 bg-indigo-50 text-indigo-500 rounded-md border border-indigo-100">
                               <ClipboardCheck size={12} />
                            </div>
                            Necessidades Avaliativas
                         </label>
                         
                         <div className="grid grid-cols-1 gap-2">
                            {[
                               { id: 'precisaProvaAdaptada', label: 'Prova Adaptada', icon: FileText, color: 'indigo' },
                               { id: 'precisaProvaSalaEspecial', label: 'Sala Especial / AEE', icon: GraduationCap, color: 'emerald' }
                            ].map(item => {
                               const Icon = item.icon as any
                               const isSelected = (formData as any)[item.id]
                               return (
                                 <button 
                                    key={item.id} disabled={!isEditing}
                                    onClick={() => setFormData(f => ({ ...f, [item.id]: !isSelected }))}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all text-left ${
                                       isSelected 
                                          ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                          : 'bg-white border-slate-100 text-slate-700 hover:border-slate-200'
                                    } ${!isEditing && 'cursor-default'}`}
                                 >
                                    <div className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                       <Icon size={14} />
                                    </div>
                                    <div>
                                       <span className="text-[10px] font-black uppercase tracking-widest block leading-none">{item.label}</span>
                                       <span className={`text-[7px] font-bold uppercase tracking-tighter ${isSelected ? 'text-white/50' : 'text-slate-400'}`}>
                                          {isSelected ? 'Configuração Ativada' : 'Não Solicitado'}
                                       </span>
                                    </div>
                                 </button>
                               )
                            })}
                         </div>
                      </div>
                   </div>

                   {/* BLOCOS TEXTUAIS HORIZONTAIS */}
                   <div className="space-y-6">
                      {[
                         { id: 'condicao', label: 'Condição e Contexto Biopsicossocial', icon: Info, rows: 4, placeholder: '...', color: 'slate' },
                         { id: 'recomendacoes', label: 'Diretrizes PDI e Recomendações', icon: ShieldCheck, rows: 5, placeholder: '...', color: 'indigo' }
                      ].map(field => {
                         const Icon = field.icon as any
                         return (
                            <div key={field.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/40 space-y-4">
                               <label className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-3">
                                  <div className={`p-1.5 bg-${field.color}-50 text-${field.color}-500 rounded-lg border border-${field.color}-100`}>
                                     <Icon size={16} />
                                  </div>
                                  {field.label}
                               </label>
                               <textarea 
                                  rows={field.rows} readOnly={!isEditing}
                                  value={(formData as any)[field.id]} onChange={e => setFormData(f => ({ ...f, [field.id]: e.target.value }))}
                                  placeholder={isEditing ? field.placeholder : '...'}
                                  className={`w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-medium text-slate-900 leading-relaxed outline-none transition-all ${isEditing ? 'focus:bg-white focus:ring-4 focus:ring-slate-100' : 'cursor-default border-transparent'}`}
                               />
                            </div>
                         )
                      })}

                      {isDirecao && (
                         <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                            <label className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-3">
                               <div className="p-1.5 bg-white/5 text-white/40 rounded-lg border border-white/10">
                                  <Lock size={16} />
                                </div>
                               Observações Administrativas Internas
                            </label>
                            <textarea 
                               rows={3} readOnly={!isEditing} value={formData.notasDirecao}
                               onChange={e => setFormData(f => ({ ...f, notasDirecao: e.target.value }))}
                               placeholder="..."
                               className={`w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-sm font-medium text-white leading-relaxed outline-none transition-all placeholder:text-white/20 ${isEditing ? 'focus:bg-white/10' : 'cursor-default border-transparent'}`}
                            />
                         </div>
                      )}
                   </div>

                   {/* Rodapé: Contatos e Resumo de Leitura */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Contatos Emergência */}
                      <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xl shadow-slate-200/40 space-y-4">
                         <div className="flex items-center gap-3 pb-3 border-b border-slate-50">
                            <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg">
                               <Phone size={14} />
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Contatos de Emergência</p>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                               <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-1">Nome</label>
                               <input 
                                  type="text" readOnly={!isEditing} value={formData.contatoNome}
                                  onChange={e => setFormData(f => ({ ...f, contatoNome: e.target.value }))}
                                  className={`w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-[13px] font-bold text-slate-700 outline-none ${isEditing ? 'focus:bg-white focus:border-slate-200' : 'border-transparent bg-transparent cursor-default'}`}
                               />
                            </div>
                            <div className="space-y-1.5">
                               <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-1">Telefone</label>
                               <input 
                                  type="text" readOnly={!isEditing} value={formData.contatoTelefone}
                                  onChange={e => setFormData(f => ({ ...f, contatoTelefone: formatPhone(e.target.value) }))}
                                  className={`w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-[13px] font-bold text-slate-700 outline-none font-mono ${isEditing ? 'focus:bg-white focus:border-slate-200' : 'border-transparent bg-transparent cursor-default'}`}
                               />
                            </div>
                         </div>
                      </div>

                      {/* Resumo de Ciência */}
                {activePanel === "edit" && isDirecao && (() => {
                  const lidosCont = selectedProfile.acknowledgements.length
                  const totalCont = Array.from(new Map([...selectedProfile.estudante.turma.usuariosPermitidos.map((u:any)=>[u.id,u]), ...selectedProfile.estudante.turma.disciplinas.flatMap((d:any)=>d.usuariosPermitidos).map((u:any)=>[u.id,u])]).values()).length

                  return (
                    <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xl shadow-slate-200/40 space-y-4 flex flex-col justify-center">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg">
                            <CheckCircle2 size={14} />
                          </div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Controle Docente</label>
                        </div>
                        <div className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-[10px] font-black shadow-sm">
                          {lidosCont} / {totalCont}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000" style={{ width: `${(lidosCont/totalCont)*100}%` }} />
                        </div>
                        <button 
                          onClick={() => document.getElementById("relatorio-leituras")?.scrollIntoView({ behavior: "smooth" })}
                          className="w-full py-2.5 text-[9px] text-slate-900 font-black uppercase tracking-widest border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                        >
                          Ver Auditoria Nominal
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Relatório de Ciência Nominal */}
              {activePanel === "edit" && isDirecao && (
                <div id="relatorio-leituras" className="pt-8 border-t border-slate-200 space-y-6 animate-in fade-in duration-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-3">
                      <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                      Relatório de Ciência
                    </h3>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5 text-[8px] text-slate-400 font-black uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Já Lidos</div>
                      <div className="flex items-center gap-1.5 text-[8px] text-slate-400 font-black uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-slate-200" /> Pendentes</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(() => {
                      const profsMap = new Map([...selectedProfile.estudante.turma.usuariosPermitidos.map((u:any)=>[u.id,u]), ...selectedProfile.estudante.turma.disciplinas.flatMap((d:any)=>d.usuariosPermitidos).map((u:any)=>[u.id,u])])
                      const lidosMap = new Map(selectedProfile.acknowledgements.map((ack: any) => [ack.user.id, new Date(ack.readAt).toLocaleString("pt-BR")]))
                      return Array.from(profsMap.values()).map((prof: any) => {
                        const lidoAt = lidosMap.get(prof.id)
                        return (
                          <div key={prof.id} className={`p-4 rounded-2xl border transition-all ${lidoAt ? "bg-white border-emerald-100 shadow-sm" : "bg-slate-50/50 border-slate-100 opacity-60"}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] ${lidoAt ? "bg-emerald-500 text-white" : "bg-white text-slate-300 border border-slate-100"}`}>
                                {prof.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-slate-800 truncate uppercase">{prof.name}</p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                  {lidoAt ? `Lido em ${lidoAt}` : "Não Visualizado"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </main>

      {/* Global CSS for Custom Scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  )
}

function Graduate(props: any) {
   return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10v6l10 5 10-5v-6"/><path d="M12 3 2 10l10 7 10-7-10-7z"/><path d="M12 17v4"/></svg>
}
