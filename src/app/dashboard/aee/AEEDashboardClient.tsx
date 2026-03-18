"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Accessibility, Search, Filter, Users,
  ChevronRight, CheckCircle2, AlertCircle,
  PlusCircle, GraduationCap, X,
  Save, Loader2, Phone, ClipboardCheck, Info, Upload,
  Trash2, Clock, Edit3, ArrowLeft
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
      {/* Header F*/}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-300 sticky top-0 z-50 -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
             <div className="flex items-center space-x-5">
               <Link
                 href="/dashboard"
                 className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
               >
                 <ArrowLeft size={20} />
               </Link>
               <div>
                 <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Atendimento Especializado (AEE)</h1>
                 <p className="text-base text-slate-700 font-medium">Controle de Inclusão e Acessibilidade</p>
               </div>
             </div>

             {isDirecao && (
               <button
                 onClick={() => { setActivePanel('create'); setSelectedStudent(null); setStudentSearch(""); }}
                 className="flex items-center justify-center space-y-0 space-x-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2.5 rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-sm text-sm font-medium uppercase tracking-widest active:scale-95"
               >
                 <PlusCircle className="w-4 h-4" />
                 <span className="whitespace-nowrap">Nova Ficha</span>
               </button>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 mt-8 space-y-8">

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 text-slate-900">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xl font-semibold">{aeeAlunos.length}</p>
                <p className="text-[10px] text-slate-900 uppercase tracking-widest">Alunos Mapeados</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100 text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-xl font-semibold">{aeeAlunos.filter(a => a.acknowledgements.length > 0).length}</p>
                <p className="text-[10px] text-slate-900 uppercase tracking-widest">Leituras Confirmadas</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-100 text-amber-600">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-xl font-semibold">{aeeAlunos.filter(a => a.acknowledgements.length === 0).length}</p>
                <p className="text-[10px] text-slate-900 uppercase tracking-widest">Pendentes de Leitura</p>
              </div>
           </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
           <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" placeholder="Buscar aluno..." 
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-black/5 outline-none transition-all"
              />
           </div>
           <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400 ml-2" />
              <select 
                value={filterTurma} onChange={e => setFilterTurma(e.target.value)}
                className="flex-1 md:w-56 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium outline-none appearance-none focus:bg-white transition-all cursor-pointer"
              >
                 <option value="">Todas as Turmas</option>
                 {todasTurmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
           </div>
        </div>

        {/* LIST */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
           {filteredAlunos.length === 0 ? (
             <div className="p-20 text-center">
               <Accessibility size={48} className="mx-auto text-slate-200 mb-4" />
               <p className="text-slate-900 uppercase tracking-widest text-[10px]">Nenhum registro encontrado</p>
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
      </main>

      {/* FULL PAGE OVERLAY FOR DETAILS */}
      {activePanel && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in fade-in duration-300 flex flex-col">
          {/* Top Bar Overlay */}
          <div className="sticky top-0 bg-white border-b border-slate-200 z-50">
             <div className="max-w-5xl mx-auto px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <button onClick={() => setActivePanel(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                      <X size={20} className="text-slate-900" />
                   </button>
                   <div className="h-6 w-px bg-slate-200" />
                   <div>
                      <h2 className="text-base font-semibold tracking-tight">
                        {activePanel === 'create' ? 'Nova Ficha de Atendimento' : 'Ficha Individual de AEE'}
                      </h2>
                      <p className="text-[10px] text-slate-900 uppercase tracking-widest">Registro Ofical de Inclusão</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   {isDirecao && activePanel === 'edit' && !isEditing && (
                      <button 
                         onClick={() => setIsEditing(true)}
                         className="flex items-center gap-2 bg-white border border-slate-300 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest hover:bg-slate-50 transition-all"
                      >
                         <Edit3 size={14} /> Editar Ficha
                      </button>
                   )}
                   {(activePanel === 'create' || (isDirecao && isEditing)) && (
                      <button 
                         onClick={handleSave} disabled={saving}
                         className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
                      >
                         {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                         {saving ? 'Gravando...' : 'Salvar Alterações'}
                      </button>
                   )}
                   {!isDirecao && activePanel === 'edit' && !selectedProfile?.acknowledgements?.some((ack: any) => ack.user.id === usuario.id) && (
                      <button 
                         onClick={() => handleAtestar(selectedProfile)} disabled={saving}
                         className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest hover:bg-emerald-700 transition-all"
                      >
                         {saving ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
                         Confirmar Ciência
                      </button>
                   )}
                </div>
             </div>
          </div>

          {/* Content Overlay */}
          <div className="flex-1 w-full max-w-5xl mx-auto p-10 space-y-12 animate-in slide-in-from-bottom-4 duration-500">
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
                </div>
             ) : (
                <div className="space-y-10">
                   {/* DESKTOP BANNER: Identificação Horizontal */}
                   <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-8 shadow-sm">
                      <div className="relative group shrink-0">
                         <div className="w-20 h-20 bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center">
                            {formData.fotoUrl ? (
                               <img src={formData.fotoUrl} className="w-full h-full object-cover" />
                            ) : (
                               <Users size={28} className="text-slate-300" />
                            )}
                         </div>
                         {isEditing && (
                            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl cursor-pointer">
                               <Upload size={16} className="text-white" />
                               <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                         )}
                      </div>
                      <div className="flex-1 text-center md:text-left space-y-1">
                         <h3 className="text-xl font-semibold uppercase text-slate-900 tracking-tight">
                            {activePanel === 'create' ? selectedStudent?.nome : selectedProfile?.estudante.nome}
                         </h3>
                         <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
                            <p className="text-[10px] text-slate-900 uppercase tracking-widest bg-white px-2 py-1 border border-slate-200 rounded">
                               MAT: {activePanel === 'create' ? selectedStudent?.matricula : selectedProfile?.estudante.matricula}
                            </p>
                            <div className="h-4 w-px bg-slate-300 hidden md:block" />
                            <p className="text-sm font-semibold text-slate-900 uppercase">
                               TURMA {activePanel === 'create' ? selectedStudent?.turma.nome : selectedProfile?.estudante.turma.nome}
                            </p>
                         </div>
                      </div>
                      {activePanel === 'edit' && !isEditing && (
                         <div className="shrink-0 flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-900 uppercase tracking-widest">Status:</span>
                            {selectedProfile.acknowledgements.length === 0 ? (
                               <div className="flex items-center gap-1.5 text-amber-600">
                                  <Clock size={14} />
                                  <span className="text-xs font-semibold uppercase tracking-tight">Aguardando Ciência</span>
                               </div>
                            ) : (
                               <div className="flex items-center gap-1.5 text-emerald-600">
                                  <CheckCircle2 size={14} />
                                  <span className="text-xs font-semibold uppercase tracking-tight">{selectedProfile.acknowledgements.length} Leituras</span>
                               </div>
                            )}
                         </div>
                      )}
                   </div>

                   {/* Grid Principal Mais Distribuído */}
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      
                      {/* Coluna 1: Diagnóstico e Necessidades */}
                      <div className="space-y-8">
                         {/* CIDs Row */}
                         <div className="space-y-4">
                            <label className="text-[11px] text-slate-900 uppercase tracking-widest font-semibold flex items-center gap-2 border-b border-slate-200 pb-2">
                               <AlertCircle size={16} /> Diagnóstico (CIDs)
                            </label>
                            {isEditing ? (
                               <div className="space-y-4">
                                  <div className="relative">
                                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                     <input 
                                       type="text" placeholder="Filtrar CIDs..." value={cidSearch} onChange={e => setCidSearch(e.target.value)}
                                       className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none"
                                     />
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                                     {CIDS_AEE.filter(c => c.code.includes(cidSearch.toUpperCase()) || c.label.toUpperCase().includes(cidSearch.toUpperCase())).map(c => (
                                        <button 
                                           key={c.code} onClick={() => toggleCID(c.code)}
                                           className={`px-3 py-1.5 rounded-lg border text-[9px] font-semibold uppercase transition-all ${
                                              formData.cids.includes(c.code) ? 'bg-black text-white' : 'bg-white text-slate-900'
                                           }`}
                                        >
                                           {c.code}
                                        </button>
                                     ))}
                                  </div>
                               </div>
                            ) : (
                               <div className="flex flex-wrap gap-2 text-slate-900">
                                  {formData.cids.length > 0 ? formData.cids.map(code => (
                                     <div key={code} className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-medium text-slate-900 uppercase" title={CIDS_AEE.find(c => c.code === code)?.label}>
                                        {code}
                                     </div>
                                  )) : <p className="text-xs text-slate-900 italic">Sem diagnóstico informado.</p>}
                               </div>
                            )}
                         </div>

                         {/* Configurações de Prova */}
                         <div className="space-y-4">
                            <p className="text-[11px] text-slate-900 uppercase tracking-widest font-semibold border-b border-slate-200 pb-2">Necessidades de Prova</p>
                            {[
                               { id: 'precisaProvaAdaptada', label: 'Prova Adaptada', icon: ClipboardCheck },
                               { id: 'precisaProvaSalaEspecial', label: 'Sala Especial / AEE', icon: Graduate }
                            ].map(item => {
                              const Icon = item.icon as any
                              const isSelected = (formData as any)[item.id]
                              return (
                                <button 
                                   key={item.id} disabled={!isEditing}
                                   onClick={() => setFormData(f => ({ ...f, [item.id]: !isSelected }))}
                                   className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                                      isSelected ? 'bg-black text-white' : 'bg-white border-slate-200 text-slate-900'
                                   } ${!isEditing && 'opacity-90'}`}
                                >
                                   <Icon size={16} />
                                   <span className="text-[10px] uppercase tracking-widest font-semibold">{item.label}</span>
                                </button>
                              )
                            })}
                         </div>
                      </div>

                      {/* Coluna 2: Informações Pedagógicas (Mais Larga) */}
                      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                         {[
                            { id: 'condicao', label: 'Condição do Estudante', icon: Info, rows: 12, placeholder: 'Descreva a condição médica e pedagógica...' },
                            { id: 'recomendacoes', label: 'Instruções ao Professor', icon: ClipboardCheck, rows: 12, placeholder: 'Instruções para avaliações e suporte...' }
                         ].map(field => {
                            const Icon = field.icon as any
                            return (
                               <div key={field.id} className="space-y-4 h-full flex flex-col">
                                  <label className="text-[11px] text-slate-900 uppercase tracking-widest font-semibold flex items-center gap-2 border-b border-slate-200 pb-2">
                                     <Icon size={16} className="text-slate-900" /> {field.label}
                                  </label>
                                  <textarea 
                                     rows={field.rows} readOnly={!isEditing}
                                     value={(formData as any)[field.id]} onChange={e => setFormData(f => ({ ...f, [field.id]: e.target.value }))}
                                     placeholder={isEditing ? field.placeholder : 'Nenhuma informação cadastrada.'}
                                     className={`flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-base font-medium outline-none transition-all ${isEditing ? 'focus:bg-white' : 'cursor-default'}`}
                                  />
                               </div>
                            )
                         })}
                      </div>
                   </div>

                   {/* Rodapé Interno e Social */}
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-10 border-t border-slate-200">
                      
                      {/* Contatos Emergência */}
                      <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4 shadow-xl">
                         <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                            <Phone size={14} className="text-white/40" />
                            <p className="text-[10px] uppercase tracking-widest text-white/60">Emergência</p>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                            <div className="space-y-1">
                               <label className="text-[9px] uppercase tracking-widest text-white/30">Responsável</label>
                               <input 
                                  type="text" readOnly={!isEditing} value={formData.contatoNome}
                                  onChange={e => setFormData(f => ({ ...f, contatoNome: e.target.value }))}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
                               />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] uppercase tracking-widest text-white/30">Telefone</label>
                               <input 
                                  type="text" readOnly={!isEditing} value={formData.contatoTelefone}
                                  onChange={e => setFormData(f => ({ ...f, contatoTelefone: formatPhone(e.target.value) }))}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none font-mono"
                               />
                            </div>
                         </div>
                      </div>

                      {/* Notas Direção */}
                      {isDirecao && (
                         <div className="space-y-4">
                            <label className="text-[11px] text-slate-900 uppercase tracking-widest font-semibold flex items-center gap-2 border-b border-slate-200 pb-2">
                               <GraduationCap size={16} /> Administrativo
                            </label>
                            <textarea 
                               rows={4} readOnly={!isEditing} value={formData.notasDirecao}
                               onChange={e => setFormData(f => ({ ...f, notasDirecao: e.target.value }))}
                               placeholder="Notas administrativas..."
                               className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm font-medium outline-none ${isEditing ? 'focus:bg-white text-slate-900' : 'opacity-80 text-slate-900'}`}
                            />
                         </div>
                      )}

                      {/* Resumo Ciência (Se edição) */}
                      {activePanel === 'edit' && isDirecao && (() => {
                         const turma = selectedProfile.estudante.turma
                         const profsMap = new Map()
                         turma.usuariosPermitidos.forEach((u: any) => profsMap.set(u.id, u.name))
                         turma.disciplinas.forEach((d: any) => d.usuariosPermitidos.forEach((u: any) => profsMap.set(u.id, u.name)))
                         const todosProfessores = Array.from(profsMap.entries()).map(([id, name]) => ({ id, name }))
                         const lidos = selectedProfile.acknowledgements.map((ack: any) => ack.user.id)
                         const lidosCont = lidos.length
                         const totalCont = todosProfessores.length

                         return (
                            <div className="space-y-4">
                               <label className="text-[11px] text-slate-900 uppercase tracking-widest font-semibold flex items-center gap-2 border-b border-slate-200 pb-2">
                                  <CheckCircle2 size={16} /> Gestão de Leituras
                               </label>
                               <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                                  <div className="flex justify-between items-end">
                                     <p className="text-[10px] text-slate-900 uppercase tracking-widest font-semibold">Progresso da Ciência</p>
                                     <p className="text-sm font-bold text-slate-900">{lidosCont} / {totalCont}</p>
                                  </div>
                                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                     <div className="h-full bg-black transition-all" style={{ width: `${(lidosCont/totalCont)*100}%` }} />
                                  </div>
                                  <button 
                                     onClick={() => {
                                        const el = document.getElementById('relatorio-leituras')
                                        el?.scrollIntoView({ behavior: 'smooth' })
                                     }}
                                     className="w-full py-2 text-[10px] text-slate-900 uppercase tracking-widest font-black border border-slate-300 rounded hover:bg-white transition-all"
                                  >
                                     Ver Lista Completa
                                  </button>
                               </div>
                            </div>
                         )
                      })()}
                   </div>
                   
                   {/* Relatório de Ciência (Parte de Baixo Separada) */}
                   {activePanel === 'edit' && isDirecao && (
                      <div id="relatorio-leituras" className="pt-10 border-t border-slate-200 space-y-8 animate-in fade-in duration-700">
                         <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tight">Relatório Nominal de Ciência</h3>
                            <div className="flex gap-4">
                               <div className="flex items-center gap-2 text-[10px] text-slate-900 font-bold uppercase"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Já Leram</div>
                               <div className="flex items-center gap-2 text-[10px] text-slate-900 font-bold uppercase"><div className="w-2 h-2 rounded-full bg-slate-300" /> Pendente</div>
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {(() => {
                               const turma = selectedProfile.estudante.turma
                               const profsMap = new Map()
                               turma.usuariosPermitidos.forEach((u: any) => profsMap.set(u.id, u.name))
                               turma.disciplinas.forEach((d: any) => d.usuariosPermitidos.forEach((u: any) => profsMap.set(u.id, u.name)))
                               const lidosMap = new Map()
                               selectedProfile.acknowledgements.forEach((ack: any) => lidosMap.set(ack.user.id, new Date(ack.readAt).toLocaleString('pt-BR')))
                               
                               return Array.from(profsMap.entries()).map(([id, name]) => {
                                  const lidoAt = lidosMap.get(id)
                                  return (
                                     <div key={id} className={`p-4 rounded-xl border transition-all ${lidoAt ? 'bg-white border-emerald-100 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                                        <div className="flex items-center gap-3">
                                           <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] ${lidoAt ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                              {name.charAt(0)}
                                           </div>
                                           <div className="min-w-0">
                                              <p className="text-xs font-semibold text-slate-900 truncate uppercase mt-0.5">{name}</p>
                                              <p className="text-[9px] text-slate-900 uppercase tracking-tighter opacity-70">
                                                 {lidoAt ? `Lido em ${lidoAt}` : 'Pendente'}
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
        </div>
      )}

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
