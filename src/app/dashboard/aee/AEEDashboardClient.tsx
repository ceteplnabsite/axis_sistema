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
              <div className="relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                  <div className="space-y-4 max-w-2xl">
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1]">Atendimento Especializado <span className="text-indigo-400">(AEE)</span></h1>
                    <p className="text-slate-400 text-lg">Monitore necessidades específicas e garanta acessibilidade e equidade para cada estudante.</p>
                  </div>
                  {isDirecao && (
                    <button onClick={() => setActivePanel("create")} className="px-6 py-4 bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Nova Ficha</button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[ { icon: Users, label: "Atendidos", val: aeeAlunos.length }, { icon: ClipboardCheck, label: "Pendentes", val: "--" }, { icon: GraduationCap, label: "Acessibilidade", val: "100%" }, { icon: ShieldCheck, label: "Gestão", val: "Ativa" } ].map((stat, i) => {
                    const Icon = stat.icon
                    return (<div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6">
                      <Icon size={18} className="text-indigo-400 mb-4" />
                      <p className="text-2xl font-black text-white">{stat.val}</p>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{stat.label}</p>
                    </div>)
                  })}
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-slate-50/50"><th className="px-8 py-4 text-left text-[10px] font-black uppercase text-slate-400">Estudante</th><th className="px-8 py-4 text-left text-[10px] font-black uppercase text-slate-400">CIDs</th><th className="px-8 py-4 text-right"></th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {aeeAlunos.map( (aluno: any) => (
                      <tr key={aluno.id} className="hover:bg-slate-50"><td className="px-8 py-5"><p className="text-[13px] font-bold text-slate-800 uppercase">{aluno.estudante.nome}</p></td><td className="px-8 py-5">{aluno.cids.map((c: any) => <span key={c} className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold mr-1">{c}</span>)}</td><td className="px-8 py-5 text-right"><button onClick={() => openEdit(aluno)} className="p-2 bg-slate-100 rounded-lg"><ChevronRight size={16} /></button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-12 pb-24">
            {activePanel === "create" && !selectedStudent ? (
              <div className="max-w-2xl mx-auto space-y-8 py-10">
                <div className="text-center"><h3 className="text-xl font-bold">Vincular Estudante</h3></div>
                <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Buscar..." className="w-full pl-12 py-4 bg-white border border-slate-200 rounded-2xl outline-none" /></div>
                <div className="space-y-2">
                  {estudantesSemAee.filter((s: any) => s.nome.toLowerCase().includes(studentSearch.toLowerCase())).map((student: any) => (
                    <button key={student.id} onClick={() => openCreate(student)} className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-500 transition-all font-bold">{student.nome} <Plus size={18} /></button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-slate-200/40 font-bold">
                  <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-200">{formData.fotoUrl ? <img src={formData.fotoUrl} className="w-full h-full object-cover rounded-2xl" /> : <Users size={28} className="text-slate-200" />}</div>
                  <div className="flex-1">
                    <h3 className="text-xl uppercase">{activePanel === "create" ? selectedStudent?.nome : selectedProfile?.estudante.nome}</h3>
                    <p className="text-xs text-slate-400">{activePanel === "create" ? selectedStudent?.matricula : selectedProfile?.estudante.matricula} | {activePanel === "create" ? selectedStudent?.turma.nome : selectedProfile?.estudante.turma.nome}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400">Diagnóstico (CIDs)</label>
                    {isEditing ? (
                      <div className="space-y-2"><input type="text" placeholder="CID..." value={cidSearch} onChange={e => setCidSearch(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg" />{CIDS_AEE.filter(c => c.code.includes(cidSearch.toUpperCase())).slice(0,5).map((c: any) => <button key={c.code} onClick={() => toggleCID(c.code)} className={`block w-full text-left p-1 ${formData.cids.includes(c.code) ? "font-bold" : ""}`}>{c.code} - {c.label}</button>)}</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">{formData.cids.map((c: any) => <span key={c} className="bg-slate-100 p-2 rounded-xl text-xs font-bold">{c}</span>)}</div>
                    )}
                  </div>
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400">Ações</label>
                    {activePanel === "edit" && isDirecao && (<div className="p-4 bg-indigo-50 rounded-2xl flex justify-between items-center"><p className="font-bold">Ciência Docente: {selectedProfile.acknowledgements.length}</p><button onClick={() => document.getElementById("relatorio")?.scrollIntoView({ behavior: "smooth" })} className="text-xs uppercase font-black text-indigo-500">Ver</button></div>)}
                  </div>
                </div>
                {activePanel === "edit" && isDirecao && (
                  <div id="relatorio" className="pt-8 border-t space-y-4">
                    <h3 className="font-bold uppercase">Relatório de Ciência</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(() => {
                        const profs = Array.from(new Map([...selectedProfile.estudante.turma.usuariosPermitidos.map((u:any)=>[u.id,u]), ...selectedProfile.estudante.turma.disciplinas.flatMap((d:any)=>d.usuariosPermitidos).map((u:any)=>[u.id,u])]).values())
                        const lidos = new Set(selectedProfile.acknowledgements.map((a:any)=>a.user.id))
                        return profs.map((p:any) => <div key={p.id} className={`p-2 rounded-xl text-[10px] ${lidos.has(p.id) ? "bg-emerald-50" : "bg-slate-50"}`}>{p.name}</div>)
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
