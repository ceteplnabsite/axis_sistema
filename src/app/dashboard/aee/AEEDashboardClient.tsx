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
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12 pb-24">
              <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-8 md:p-12 shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
                <div className="relative">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <div className="space-y-4 max-w-2xl">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                        <Accessibility size={14} className="text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">Gestão Educacional</span>
                      </div>
                      <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1]">
                        Atendimento Especializado <span className="text-indigo-400">(AEE)</span>
                      </h1>
                      <p className="text-slate-400 text-lg">
                        Monitore necessidades específicas e garanta acessibilidade e equidade para cada estudante.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {isDirecao && (
                        <button 
                          onClick={() => setActivePanel("create")}
                          className="px-6 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2 group"
                        >
                          <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                          Nova Ficha
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {( [ { icon: Users, label: "Atendidos", val: aeeAlunos.length }, { icon: ClipboardCheck, label: "Pendentes", val: "--" }, { icon: GraduationCap, label: "Acessibilidade", val: "100%" }, { icon: ShieldCheck, label: "Gestão", val: "Ativa" } ] ).map((stat, i) => {
                      const Icon = stat.icon
                      return (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-colors group cursor-default">
                          <Icon size={18} className="text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
                          <div>
                            <p className="text-2xl font-black text-white">{stat.val}</p>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{stat.label}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/40">
                    <div className="p-8 border-b border-slate-50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                          <Users size={20} className="text-slate-400" />
                          Estudantes Atendidos
                        </h3>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          {aeeAlunos.length} Registros
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50">
                            <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Estudante</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">CIDs</th>
                            <th className="px-8 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {aeeAlunos.map( aluno => (
                            <tr key={aluno.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-600 border border-slate-200 group-hover:bg-white transition-all shadow-sm">
                                    {aluno.estudante.nome.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[13px] font-bold text-slate-800 truncate uppercase">{aluno.estudante.nome}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{aluno.estudante.turma.nome}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex flex-wrap gap-1.5">
                                  {aluno.cids.slice(0, 2).map(c => (
                                    <span key={c} className="px-2 py-0.5 bg-slate-900/5 text-slate-900 rounded-md text-[9px] font-bold border border-slate-900/10">{c}</span>
                                  ))}
                                  {aluno.cids.length > 2 && (
                                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-500 rounded-md text-[9px] font-bold">+{aluno.cids.length - 2}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-8 py-5 text-right w-10">
                                <button onClick={() => openEdit(aluno)} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all">
                                  <ChevronRight size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-500/30 space-y-6">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <ShieldCheck size={24} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold">Segurança de Dados</h4>
                      <p className="text-indigo-100/70 text-sm leading-relaxed">Todas as informações do AEE são sensíveis e protegidas pela LGPD. Apenas profissionais autorizados têm acesso a estes prontuários.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-12 pb-24">
              {activePanel === "create" && !selectedStudent ? (
                <div className="max-w-2xl mx-auto space-y-8 py-10">
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">Vincular Estudante</h3>
                    <p className="text-xs uppercase tracking-widest font-black text-slate-400">Apenas alunos sem ficha ativa</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Buscar por nome ou matrícula..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {estudantesSemAee.filter(s => s.nome.toLowerCase().includes(studentSearch.toLowerCase()) || s.matricula.includes(studentSearch)).map(student => (
                      <button key={student.id} onClick={() => openCreate(student)} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-500 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-bold text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors uppercase">{student.nome.charAt(0)}</div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-slate-800 uppercase">{student.nome}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.turma.nome} | {student.matricula}</p>
                          </div>
                        </div>
                        <Plus size={18} className="text-slate-200 group-hover:text-indigo-500" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* BANNER IDENTIFICACAO COMPACTO */}
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-slate-200/40">
                    <div className="relative group shrink-0">
                      <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
                        {formData.fotoUrl ? (<img src={formData.fotoUrl} className="w-full h-full object-cover" />) : (<Users size={28} className="text-slate-300" />)}
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
                        <h3 className="text-xl font-bold text-slate-800 whitespace-nowrap">{activePanel === "create" ? selectedStudent?.nome : selectedProfile?.estudante.nome}</h3>
                        {activePanel === "edit" && !isEditing && (
                          <div className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 text-[9px] font-black uppercase tracking-widest select-none">Ficha Ativa</div>
                        )}
                      </div>
                      <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
                        <div className="flex items-center gap-2"><span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Matrícula</span><span className="text-xs font-bold">{activePanel === "create" ? selectedStudent?.matricula : selectedProfile?.estudante.matricula}</span></div>
                        <div className="w-px h-3 bg-slate-200" />
                        <div className="flex items-center gap-2"><span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Turma</span><span className="text-xs font-bold uppercase">{activePanel === "create" ? selectedStudent?.turma.nome : selectedProfile?.estudante.turma.nome}</span></div>
                      </div>
                    </div>
                    {activePanel === "edit" && !isEditing && (
                      <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 shadow-inner flex flex-col justify-center min-w-[120px]">
                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1">Auditória</p>
                        {selectedProfile.acknowledgements.length === 0 ? (
                          <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[10px] uppercase"><Clock size={12} className="animate-pulse" /> 0 Leitura</div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase"><CheckCircle2 size={12} /> {selectedProfile.acknowledgements.length} Lidos</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/40 space-y-4">
                      <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2"><div className="p-1 bg-rose-50 text-rose-500 rounded-md border-rose-100"><AlertCircle size={12} /></div> Diagnóstico Clínico (CIDs)</label>
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" /><input type="text" placeholder="Buscar CID..." value={cidSearch} onChange={e => setCidSearch(e.target.value)} className="w-full pl-9 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none" /></div>
                          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto custom-scrollbar">
                            {CIDS_AEE.filter(c => c.code.includes(cidSearch.toUpperCase())).map(c => (
                              <button key={c.code} onClick={() => toggleCID(c.code)} className={`flex items-center justify-between px-2 py-1.5 rounded-md border text-[9px] font-bold ${formData.cids.includes(c.code) ? "bg-black text-white" : "bg-white text-slate-700"}`}>
                                <div className="flex items-center gap-2"><span className="px-1 rounded bg-slate-100">{c.code}</span>{c.label}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-1">
                          {formData.cids.length > 0 ? formData.cids.map(code => (<div key={code} className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-[11px] font-bold text-slate-800 uppercase">{code} - {CIDS_AEE.find(c => c.code === code)?.label}</div>)) : (<p className="text-center py-4 text-[9px] text-slate-400 font-bold italic">Sem diagnóstico clínico</p>)}
                        </div>
                      )}
                    </div>
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/40 space-y-4">
                      <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2"><div className="p-1 bg-indigo-50 text-indigo-500 rounded-md"><ClipboardCheck size={12} /></div> Necessidades Avaliativas</label>
                      <div className="grid grid-cols-1 gap-2">
                        {[ { id: "precisaProvaAdaptada", label: "Prova Adaptada" }, { id: "precisaProvaSalaEspecial", label: "Sala Especial / AEE" } ].map(item => (
                          <button key={item.id} disabled={!isEditing} onClick={() => setFormData(f => ({ ...f, [item.id]: !(f as any)[item.id] }))} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${ (formData as any)[item.id] ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-50 text-slate-400" }`}>
                            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                            {(formData as any)[item.id] && <CheckCircle2 size={12} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xl shadow-slate-200/40 space-y-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-3">Contatos Emergência</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Nome</label><input type="text" readOnly={!isEditing} value={formData.contatoNome} onChange={e => setFormData(f => ({ ...f, contatoNome: e.target.value }))} className="w-full bg-slate-50 rounded-lg px-2 py-1.5 text-[12px] font-bold outline-none" /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Telefone</label><input type="text" readOnly={!isEditing} value={formData.contatoTelefone} onChange={e => setFormData(f => ({ ...f, contatoTelefone: formatPhone(e.target.value) }))} className="w-full bg-slate-50 rounded-lg px-2 py-1.5 text-[12px] font-bold outline-none" /></div>
                      </div>
                    </div>
                    {activePanel === "edit" && isDirecao && (() => {
                      const lidos = selectedProfile.acknowledgements.length
                      const total = Array.from(new Map([...selectedProfile.estudante.turma.usuariosPermitidos.map((u:any)=>[u.id,u]), ...selectedProfile.estudante.turma.disciplinas.flatMap((d:any)=>d.usuariosPermitidos).map((u:any)=>[u.id,u])]).values()).length
                      return (
                        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xl shadow-slate-200/40 flex items-center justify-between">
                          <div><p className="text-[10px] font-black uppercase text-slate-400 mb-1">Progresso Ciência</p><p className="text-2xl font-black text-slate-800">{lidos} / {total}</p></div>
                          <button onClick={() => document.getElementById("relatorio-leituras")?.scrollIntoView({ behavior: "smooth" })} className="px-4 py-2 bg-indigo-50 text-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-widest">Auditoria</button>
                        </div>
                      )
                    })()}
                  </div>
                  {activePanel === "edit" && isDirecao && (
                    <div id="relatorio-leituras" className="pt-8 border-t border-slate-200 space-y-6">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2"><div className="w-1 h-4 bg-indigo-500 rounded-full" /> Auditoria de Visualização</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {(() => {
                          const profsMap = new Map([...selectedProfile.estudante.turma.usuariosPermitidos.map((u:any)=>[u.id,u]), ...selectedProfile.estudante.turma.disciplinas.flatMap((d:any)=>d.usuariosPermitidos).map((u:any)=>[u.id,u])])
                          const lidosMap = new Map(selectedProfile.acknowledgements.map((ack: any) => [ack.user.id, new Date(ack.readAt).toLocaleString("pt-BR")]))
                          return Array.from(profsMap.values()).map((prof: any) => {
                            const lidoAt = lidosMap.get(prof.id)
                            return (<div key={prof.id} className={`p-3 rounded-2xl border ${lidoAt ? "bg-emerald-50/20 border-emerald-100" : "bg-slate-50 border-slate-100 opacity-60"}`}><p className="text-[10px] font-bold truncate">{prof.name}</p><p className="text-[7px] font-black uppercase opacity-50">{lidoAt ? "Lido" : "Pendente"}</p></div>)
                          })
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )
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
