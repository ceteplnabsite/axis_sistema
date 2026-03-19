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
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-24">
              <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-6 md:p-10 shadow-2xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-slate-800 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl opacity-40" />
                <div className="relative">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="space-y-2 max-w-2xl">
                      <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Atendimento <span className="text-indigo-400">AEE</span></h1>
                      <p className="text-slate-400 text-sm">Gestão de acessibilidade e equidade educacional.</p>
                    </div>
                    {isDirecao && (<button onClick={() => setActivePanel("create")} className="px-5 py-3 bg-indigo-500 text-white rounded-xl font-black text-[10px] uppercase transition-all shadow-lg">Nova Ficha</button>)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {( [ { icon: Users, label: "Atendidos", val: aeeAlunos.length }, { icon: ShieldCheck, label: "Gestão", val: "Ativa" } ] ).map((s, i) => (<div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4"><s.icon size={16} className="text-indigo-400 mb-2" /><p className="text-xl font-black text-white">{s.val}</p><p className="text-[8px] text-slate-500 font-bold uppercase">{s.label}</p></div>))}
                  </div>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-xl">
                <div className="p-5 border-b border-slate-50 flex items-center justify-between"><h3 className="font-bold flex items-center gap-2">Estudantes</h3><span className="text-[9px] font-black uppercase text-slate-400">{aeeAlunos.length}</span></div>
                <div className="overflow-x-auto"><table className="w-full"><tbody className="divide-y divide-slate-100">
                  {aeeAlunos.map(a => (<tr key={a.id} className="hover:bg-slate-50"><td className="px-6 py-4"><p className="text-[12px] font-bold text-slate-800 uppercase">{a.estudante.nome}</p></td><td className="px-6 py-4"><div className="flex flex-wrap gap-1">{a.cids.map(c => <span key={c} className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold">{c}</span>)}</div></td><td className="px-6 py-4 text-right"><button onClick={() => openEdit(a)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white transition-all"><ChevronRight size={16} /></button></td></tr>))}
                  </tbody></table></div>
                </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500 space-y-6 pb-24">
            {activePanel === "create" && !selectedStudent ? (
              <div className="max-w-2xl mx-auto py-10 space-y-6"><div className="text-center"><h3 className="font-bold">Vincular Estudante</h3></div><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Buscar..." className="w-full pl-11 py-3 border rounded-2xl" /></div><div className="space-y-1 max-h-[300px] overflow-y-auto">{estudantesSemAee.filter(s => s.nome.toLowerCase().includes(studentSearch.toLowerCase())).map(s => (<button key={s.id} onClick={() => openCreate(s)} className="w-full flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-500 transition-all font-bold">{s.nome} <Plus size={16} /></button>))}</div></div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 p-4 rounded-3xl flex items-center gap-6 shadow-lg shadow-slate-200/40">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-200">{formData.fotoUrl ? <img src={formData.fotoUrl} className="w-full h-full object-cover rounded-2xl" /> : <Users size={24} className="text-slate-200" />}</div>
                  <div className="flex-1"><h3 className="text-lg font-black uppercase">{activePanel === "create" ? selectedStudent?.nome : selectedProfile?.estudante.nome}</h3><p className="text-[10px] text-slate-400">{activePanel === "create" ? selectedStudent?.matricula : selectedProfile?.estudante.matricula} | {activePanel === "create" ? selectedStudent?.turma.nome : selectedProfile?.estudante.turma.nome}</p></div>
                  {activePanel === "edit" && !isEditing && (<div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 shadow-inner flex flex-col justify-center"><p className="text-[7px] text-slate-400 font-black uppercase mb-1">Auditória</p>{selectedProfile.acknowledgements.length === 0 ? <p className="text-[9px] text-amber-600 font-black">PENDENTE</p> : <p className="text-[9px] text-emerald-600 font-black">{selectedProfile.acknowledgements.length} LIDOS</p>}</div>)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-3"><label className="text-[9px] font-black uppercase text-slate-400">Diagnóstico (CIDs)</label>{isEditing ? (<div className="space-y-2"><input type="text" placeholder="CID..." value={cidSearch} onChange={e => setCidSearch(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg text-xs" /><div className="max-h-32 overflow-y-auto">{CIDS_AEE.filter(c => c.code.includes(cidSearch.toUpperCase())).slice(0,5).map(c => <button key={c.code} onClick={() => toggleCID(c.code)} className="block w-full text-left p-1 text-[10px]">{c.code} - {c.label}</button>)}</div></div>) : (<div className="flex flex-wrap gap-2">{formData.cids.map(c => <span key={c} className="bg-slate-100 p-2 rounded-xl text-[10px] font-bold">{c}</span>)}</div>)}</div>
                  <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-3"><label className="text-[9px] font-black uppercase text-slate-400">Contatos</label><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><label className="text-[7px] font-bold text-slate-400 uppercase">Nome</label><input type="text" readOnly={!isEditing} value={formData.contatoNome} onChange={e => setFormData(f => ({ ...f, contatoNome: e.target.value }))} className="w-full bg-slate-50 rounded-lg px-2 py-1.5 text-[11px] font-bold outline-none" /></div><div className="space-y-1"><label className="text-[7px] font-bold text-slate-400 uppercase">Tel</label><input type="text" readOnly={!isEditing} value={formData.contatoTelefone} onChange={e => setFormData(f => ({ ...f, contatoTelefone: formatPhone(e.target.value) }))} className="w-full bg-slate-50 rounded-lg px-2 py-1.5 text-[11px] font-bold outline-none font-mono" /></div></div></div>
                </div>
                {activePanel === "edit" && isDirecao && (<div id="relatorio" className="pt-8 border-t border-slate-200 space-y-4"><h3 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2"><div className="w-1 h-3 bg-indigo-500 rounded-full" /> Auditoria de Ciência</h3><div className="grid grid-cols-2 md:grid-cols-6 gap-2">{(() => { const profs = Array.from(new Map([...selectedProfile.estudante.turma.usuariosPermitidos.map((u:any)=>[u.id,u]), ...selectedProfile.estudante.turma.disciplinas.flatMap((d:any)=>d.usuariosPermitidos).map((u:any)=>[u.id,u])]).values()); const lidos = new Set(selectedProfile.acknowledgements.map((a:any)=>a.user.id)); return profs.map((p:any) => <div key={p.id} className={`p-2 rounded-xl text-[9px] font-bold truncate ${lidos.has(p.id) ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-50 text-slate-400 border border-slate-100 opacity-60"}`}>{p.name}</div>); })()}</div></div>)}
              </div>
            )}
          </div>
        )}
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
