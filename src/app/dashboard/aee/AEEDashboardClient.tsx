"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Accessibility, Search, Filter, Users, 
  ChevronRight, CheckCircle2, AlertCircle, 
  PlusCircle, GraduationCap, X, 
  Save, Loader2, Phone, ClipboardCheck, Info, Upload,
  Trash2
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
  
  // Side Panel State
  const [activePanel, setActivePanel] = useState<'create' | 'edit' | null>(null)
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

  const filteredAlunos = aeeAlunos.filter((a: any) => {
    const matchSearch = a.estudante.nome.toLowerCase().includes(searchTerm.toLowerCase()) || a.estudante.matricula.includes(searchTerm)
    const matchTurma = filterTurma ? a.estudante.turmaId === filterTurma : true
    return matchSearch && matchTurma
  })

  // Handlers
  const openEdit = (profile: any) => {
    setSelectedProfile(profile)
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
    return numbers.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d)(\d{4})$/, "$1-$2")
  }

  const toggleCID = (code: string) => {
    setFormData(p => ({ ...p, cids: p.cids.includes(code) ? p.cids.filter(c => c !== code) : [...p.cids, code] }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return alert("Máximo 2MB")
    const reader = new FileReader()
    reader.onload = () => setFormData(p => ({ ...p, fotoUrl: reader.result as string }))
    reader.readAsDataURL(file)
  }

  return (
    <div className="min-h-screen bg-white pb-10 font-sans text-slate-900">
      {/* Header Fino Moderno */}
      <header className="bg-white/90 backdrop-blur sticky top-0 z-40 border-b border-slate-100 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-xl">
               <Accessibility size={24} />
             </div>
             <div>
               <h1 className="text-xl font-bold tracking-tight">Painel AEE</h1>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inclusão Pedagógica</p>
             </div>
          </div>
          {isDirecao && (
            <button 
              onClick={() => { setActivePanel('create'); setSelectedStudent(null); setStudentSearch(""); }}
              className="bg-slate-950 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-3"
            >
              <PlusCircle size={16} /> Nova Ficha
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 mt-10 space-y-10">
        
        {/* Banner Stats Horizontal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-5">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 text-slate-900">
                <Users size={24} />
              </div>
              <div>
                <p className="text-2xl font-black">{aeeAlunos.length}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fichas Ativas</p>
              </div>
           </div>
           <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center gap-5">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-emerald-200 text-emerald-600">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-2xl font-black">{aeeAlunos.filter(a => a.acknowledgements.length > 0).length}</p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest text-opacity-70">Leituras Confirmadas</p>
              </div>
           </div>
           <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-center gap-5">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-amber-200 text-amber-600">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-2xl font-black">{aeeAlunos.filter(a => a.acknowledgements.length === 0).length}</p>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest text-opacity-70">Aguardando Leitura</p>
              </div>
           </div>
        </div>

        {/* Barra de Filtros Minimalista */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input 
                type="text" placeholder="Buscar por nome ou matrícula..." 
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-semibold focus:bg-white focus:ring-4 focus:ring-slate-100 outline-none transition-all"
              />
           </div>
           <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <select 
                  value={filterTurma} onChange={e => setFilterTurma(e.target.value)}
                  className="w-full pl-11 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-semibold outline-none appearance-none focus:bg-white transition-all"
                >
                   <option value="">Todas as Turmas</option>
                   {todasTurmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
           </div>
        </div>

        {/* LISTA DE ESTUDANTES (Design Novo em Lista) */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50">
           {filteredAlunos.length === 0 ? (
             <div className="p-24 text-center">
               <Accessibility size={64} className="mx-auto text-slate-100 mb-6" />
               <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Nenhum aluno encontrado</p>
             </div>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                       <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estudante</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Turma</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnóstico (CIDs)</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status de Leitura</th>
                       <th className="px-8 py-5 text-right"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {filteredAlunos.map(a => (
                      <tr 
                        key={a.id} 
                        onClick={() => openEdit(a)}
                        className="group hover:bg-slate-50/80 cursor-pointer transition-all"
                      >
                         <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform overflow-hidden">
                                  {a.fotoUrl ? <img src={a.fotoUrl} className="w-full h-full object-cover" /> : a.estudante.nome.charAt(0)}
                               </div>
                               <div>
                                  <p className="font-bold text-slate-800 uppercase tracking-tight leading-none mb-1">{a.estudante.nome}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">MAT: {a.estudante.matricula}</p>
                               </div>
                            </div>
                         </td>
                         <td className="px-8 py-6">
                            <span className="text-xs font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 uppercase tracking-tight">
                               {a.estudante.turma.nome}
                            </span>
                         </td>
                         <td className="px-8 py-6">
                            <div className="flex flex-wrap gap-1.5">
                               {a.cids.slice(0, 3).map((c: string) => (
                                 <span key={c} className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100 uppercase">{c}</span>
                               ))}
                               {a.cids.length > 3 && <span className="text-[9px] font-black text-slate-400">+{a.cids.length - 3}</span>}
                            </div>
                         </td>
                         <td className="px-8 py-6">
                            {a.acknowledgements.length === 0 ? (
                               <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Pendente</span>
                               </div>
                            ) : (
                               <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                  <CheckCircle2 size={12} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">{a.acknowledgements.length} Leituras</span>
                               </div>
                            )}
                         </td>
                         <td className="px-8 py-6 text-right">
                            <div className="inline-flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                               <span>Detalhes</span>
                               <ChevronRight size={16} className="text-slate-400" />
                            </div>
                         </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>
           )}
        </div>
      </main>

      {/* PAINEL LATERAL (SLIDE-OVER) PARA DETALHES/EDIÇÃO */}
      {activePanel && (
        <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
           <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setActivePanel(null)} />
           
           <div className="relative w-full max-w-3xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-500 ease-out border-l border-slate-100 group/panel">
              {/* Header Panel */}
              <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-slate-950 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl">
                       <Accessibility size={28} />
                    </div>
                    <div>
                       <h2 className="text-xl font-bold tracking-tight">
                         {activePanel === 'create' ? 'Nova Ficha AEE' : 'Detalhes do Atendimento'}
                       </h2>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Configuração de Inclusão</p>
                    </div>
                 </div>
                 <button onClick={() => setActivePanel(null)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all">
                    <X size={24} className="text-slate-400" />
                 </button>
              </div>

              {/* Body Panel */}
              <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                 
                 {activePanel === 'create' && !selectedStudent ? (
                    <div className="space-y-6">
                       <div className="relative group">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                          <input 
                             type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                             placeholder="Buscar estudante para vincular..."
                             className="w-full pl-12 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-bold focus:border-slate-900 outline-none transition-all"
                          />
                       </div>
                       <div className="grid grid-cols-1 gap-3">
                          {estudantesSemAee.filter(s => s.nome.toLowerCase().includes(studentSearch.toLowerCase())).slice(0, 6).map(s => (
                             <button 
                                key={s.matricula} onClick={() => openCreate(s)}
                                className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:border-slate-900 hover:shadow-lg transition-all group"
                             >
                                <div className="flex items-center gap-4 text-left">
                                   <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center font-bold text-slate-400">{s.nome.charAt(0)}</div>
                                   <div>
                                      <p className="text-sm font-bold uppercase">{s.nome}</p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase">{s.turma.nome}</p>
                                   </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-200 group-hover:text-slate-900" />
                             </button>
                          ))}
                       </div>
                    </div>
                 ) : (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-500">
                       
                       {/* Identificação e Foto */}
                       <div className="flex items-start gap-8 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                          <div className="relative group/avatar">
                             <div className="w-24 h-24 bg-white rounded-3xl overflow-hidden shadow-xl border border-white p-1">
                                {formData.fotoUrl ? (
                                   <img src={formData.fotoUrl} className="w-full h-full object-cover rounded-2xl" />
                                ) : (
                                   <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                                      <Users size={40} />
                                   </div>
                                )}
                             </div>
                             {isDirecao && (
                                <label className="absolute inset-0 bg-slate-950/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity rounded-3xl cursor-pointer">
                                   <Upload size={20} className="text-white" />
                                   <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                </label>
                             )}
                          </div>
                          <div>
                             <h3 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                                {activePanel === 'create' ? selectedStudent?.nome : selectedProfile?.estudante.nome}
                             </h3>
                             <div className="flex items-center gap-3 mt-2">
                                <span className="bg-slate-950 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{activePanel === 'create' ? selectedStudent?.turma.nome : selectedProfile?.estudante.turma.nome}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula: {activePanel === 'create' ? selectedStudent?.matricula : selectedProfile?.estudante.matricula}</span>
                             </div>
                          </div>
                       </div>

                       {/* Configurações de Prova */}
                       <div className="grid grid-cols-2 gap-4">
                          {[
                             { id: 'precisaProvaAdaptada', label: 'Prova Adaptada', icon: ClipboardCheck },
                             { id: 'precisaProvaSalaEspecial', label: 'Sala Especial / AEE', icon: Home }
                          ].map(item => {
                            const Icon = item.icon as any
                            const isSelected = (formData as any)[item.id]
                            return (
                              <button 
                                 key={item.id}
                                 disabled={!isDirecao}
                                 onClick={() => setFormData(f => ({ ...f, [item.id]: !isSelected }))}
                                 className={`flex items-center gap-4 p-5 rounded-3xl border-2 transition-all ${
                                    isSelected 
                                    ? 'bg-slate-950 border-slate-950 text-white shadow-xl shadow-slate-200' 
                                    : 'bg-white border-slate-100 text-slate-400 grayscale'
                                 } ${!isDirecao && 'opacity-80'}`}
                              >
                                 <Icon size={20} />
                                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                              </button>
                            )
                          })}
                       </div>

                       {/* CIDs Selection */}
                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-between">
                             <span>Diagnóstico Clínico (CIDs)</span>
                             <span className="text-slate-900">{formData.cids.length} selecionados</span>
                          </label>
                          <div className="relative">
                             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                             <input 
                               type="text" placeholder="Pesquisar CID..." value={cidSearch} onChange={e => setCidSearch(e.target.value)}
                               className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white outline-none"
                             />
                          </div>
                          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                             {CIDS_AEE.filter(c => c.code.includes(cidSearch.toUpperCase()) || c.label.toUpperCase().includes(cidSearch.toUpperCase())).map(c => (
                                <button 
                                   key={c.code} onClick={() => toggleCID(c.code)}
                                   disabled={!isDirecao}
                                   className={`px-4 py-3 rounded-2xl border-2 text-[10px] font-bold uppercase transition-all ${
                                      formData.cids.includes(c.code) 
                                      ? 'bg-slate-950 border-slate-950 text-white' 
                                      : 'bg-white border-slate-100 text-slate-500'
                                   }`}
                                >
                                   {c.code} · {c.label}
                                </button>
                             ))}
                          </div>
                       </div>

                       {/* Text Areas */}
                       {[
                         { id: 'condicao', label: 'Contexto e Condição (Clínica/Escolar)', icon: Info, rows: 4, placeholder: 'Descreva a condição do estudante...' },
                         { id: 'recomendacoes', label: 'Instruções para os Professores', icon: ClipboardCheck, rows: 6, placeholder: 'Instruções sobre avaliações, tempo extra, suporte...' }
                       ].map(field => {
                          const Icon = field.icon as any
                          return (
                             <div key={field.id} className="space-y-4">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                   <Icon size={18} className="text-slate-900" /> {field.label}
                                </label>
                                <textarea 
                                   rows={field.rows} readOnly={!isDirecao}
                                   value={(formData as any)[field.id]} onChange={e => setFormData(f => ({ ...f, [field.id]: e.target.value }))}
                                   placeholder={field.placeholder}
                                   className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] px-8 py-6 text-base font-medium focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                                />
                             </div>
                          )
                       })}

                       {/* Contatos Emergência */}
                       <div className="grid grid-cols-2 gap-6 bg-slate-950 text-white p-8 rounded-[2.5rem] shadow-2xl">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Nome Responsável</label>
                             <input 
                                type="text" readOnly={!isDirecao}
                                value={formData.contatoNome} onChange={e => setFormData(f => ({ ...f, contatoNome: e.target.value }))}
                                placeholder="Pai/Mãe..."
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold outline-none placeholder:text-white/20"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Telefone Emergência</label>
                             <input 
                                type="text" readOnly={!isDirecao}
                                value={formData.contatoTelefone} onChange={e => setFormData(f => ({ ...f, contatoTelefone: formatPhone(e.target.value) }))}
                                placeholder="(00) 0 0000-0000"
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold outline-none placeholder:text-white/20 font-mono"
                             />
                          </div>
                       </div>

                       {/* Notas Direção (Só Direção) */}
                       {isDirecao && (
                          <div className="space-y-4">
                             <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <GraduationCap size={18} className="text-slate-900" /> Observações Internas (Direção)
                             </label>
                             <textarea 
                                rows={3} value={formData.notasDirecao} onChange={e => setFormData(f => ({ ...f, notasDirecao: e.target.value }))}
                                placeholder="Notas restritas à gestão..."
                                className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-6 text-sm font-medium focus:bg-white outline-none"
                             />
                          </div>
                       )}

                       {/* Histórico Professores que Leram */}
                       {activePanel === 'edit' && selectedProfile?.acknowledgements?.length > 0 && (
                          <div className="space-y-5 bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100">
                             <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 font-black">
                                <CheckCircle2 size={14} /> Leituras Confirmadas ({selectedProfile.acknowledgements.length})
                             </h4>
                             <div className="grid grid-cols-2 gap-3">
                                {selectedProfile.acknowledgements.map((ack: any) => (
                                   <div key={ack.id} className="bg-white p-3 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">{ack.user.name.charAt(0)}</div>
                                      <div>
                                         <p className="text-[11px] font-bold text-slate-800">{ack.user.name}</p>
                                         <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(ack.readAt).toLocaleDateString()}</p>
                                      </div>
                                   </div>
                                ))}
                             </div>
                          </div>
                       )}
                    </div>
                 )}
              </div>

              {/* Footer Panel */}
              <div className="p-10 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between sticky bottom-0 z-10">
                 <div className="flex-1 mr-6">
                    {!isDirecao && activePanel === 'edit' && !selectedProfile?.acknowledgements?.some((ack: any) => ack.userId === usuario.id) && (
                       <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest animate-pulse">Ação Obrigatória: Favor confirmar ciência abaixo</p>
                    )}
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => setActivePanel(null)} className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">Cancelar</button>
                    {isDirecao ? (
                       <button 
                          onClick={handleSave} disabled={saving}
                          className="bg-slate-950 text-white px-10 py-5 rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-800 shadow-2xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                       >
                          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          {saving ? 'Gravando...' : 'Salvar Alterações'}
                       </button>
                    ) : (
                       activePanel === 'edit' && !selectedProfile?.acknowledgements?.some((ack: any) => ack.userId === usuario.id) && (
                         <button 
                            onClick={() => handleAtestar(selectedProfile)} disabled={saving}
                            className="bg-emerald-600 text-white px-10 py-5 rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-emerald-700 shadow-2xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                         >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
                            Confirmar Ciência
                         </button>
                       )
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Estilos Adicionais */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  )
}

function Home(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
