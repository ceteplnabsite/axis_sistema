"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, 
  Save, 
  AlertCircle, 
  Info, 
  UserMinus, 
  X, 
  CheckCircle2, 
  GraduationCap, 
  Users, 
  FileText,
  BarChart2,
  TrendingUp,
  Search,
  Loader2,
  Accessibility
} from "lucide-react"

interface Estudante {
  matricula: string
  nome: string
  aeeProfile?: {
    id: string
    acknowledgements: any[]
  }
}

interface Disciplina {
  id: string
  nome: string
}

interface NotaState {
  nota1: string
  nota2: string
  nota3: string
  isDesistente: boolean
  isDesistenteUnid1: boolean
  isDesistenteUnid2: boolean
  isDesistenteUnid3: boolean
}

export default function LancarNotasTurmaClient({
  turmaId,
  turmaNome,
  modalidade,
  disciplinas,
  estudantes
}: {
  turmaId: string
  turmaNome: string
  modalidade?: string | null
  disciplinas: Disciplina[]
  estudantes: Estudante[]
}) {
  const isSemestral = modalidade === 'PROEJA' || modalidade === 'SUBSEQUENTE'
  const UNIDADES = isSemestral ? ['1', '2'] : ['1', '2', '3']

  const router = useRouter()
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState("")
  const [notas, setNotas] = useState<Record<string, NotaState>>({})
  const [originalNotas, setOriginalNotas] = useState<Record<string, NotaState>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const hasUnsavedChanges = () => {
    return JSON.stringify(notas) !== JSON.stringify(originalNotas)
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) { e.preventDefault(); e.returnValue = ""; }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [notas, originalNotas])

  const handleNotaChange = (estudanteId: string, campo: 'nota1' | 'nota2' | 'nota3', valor: string) => {
    if (valor !== '') {
      if (valor.includes('.')) { const parts = valor.split('.'); if (parts[1].length > 1) return; }
      const num = parseFloat(valor); if (num > 10 || num < 0) return;
    }
    setNotas(prev => ({
      ...prev,
      [estudanteId]: {
        ...(prev[estudanteId] || { nota1: '', nota2: '', nota3: '', isDesistente: false, isDesistenteUnid1: false, isDesistenteUnid2: false, isDesistenteUnid3: false }),
        [campo]: valor
      }
    }))
  }

  const handleDesistenteChange = (estudanteId: string, field: 'isDesistente' | 'isDesistenteUnid1' | 'isDesistenteUnid2' | 'isDesistenteUnid3', checked: boolean) => {
    setNotas(prev => ({
      ...prev,
      [estudanteId]: {
        ...(prev[estudanteId] || { nota1: '', nota2: '', nota3: '', isDesistente: false, isDesistenteUnid1: false, isDesistenteUnid2: false, isDesistenteUnid3: false }),
        [field]: checked
      }
    }))
  }

  const calcularMedia = (estudanteId: string) => {
    const nota = notas[estudanteId]; if (!nota) return '-'; 
    const isDE = isSemestral 
      ? (nota.isDesistenteUnid1 && nota.isDesistenteUnid2)
      : (nota.isDesistenteUnid1 && nota.isDesistenteUnid2 && nota.isDesistenteUnid3)
    
    if (isDE) return 'DE';
    
    const n1 = parseFloat(nota.nota1 || '0')
    const n2 = parseFloat(nota.nota2 || '0')
    const n3 = isSemestral ? 0 : parseFloat(nota.nota3 || '0')
    
    return isSemestral ? ((n1 + n2) / 2).toFixed(1) : ((n1 + n2 + n3) / 3).toFixed(1)
  }

  const getStatusColor = (media: string) => {
    if (media === 'DE') return 'text-slate-400'; if (media === '-') return 'text-slate-300';
    return parseFloat(media) >= 5 ? 'text-emerald-600' : 'text-rose-600'
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); if (!disciplinaSelecionada) { setMessage({ type: 'error', text: 'Selecione uma disciplina' }); return; }
    setShowModal(true);
  }

  const confirmSave = async () => {
    setSaving(true); setMessage(null); setShowModal(false);
    try {
      const changedEntries = Object.entries(notas).filter(([id, d]) => JSON.stringify(d) !== JSON.stringify(originalNotas[id] || {}));
      const notasArray = changedEntries.map(([estudanteId, data]) => ({ estudanteId, disciplinaId: disciplinaSelecionada, ...data }));
      const response = await fetch('/api/notas/lancar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notas: notasArray }) });
      if (response.ok) { setMessage({ type: 'success', text: 'Notas salvas!' }); setOriginalNotas(JSON.parse(JSON.stringify(notas))); router.refresh(); }
      else { const error = await response.json(); setMessage({ type: 'error', text: error.message || 'Erro ao salvar' }); }
    } catch (error) { setMessage({ type: 'error', text: 'Erro de conexão' }) } finally { setSaving(false) }
  }

  useEffect(() => {
    if (disciplinaSelecionada) {
      setLoading(true)
      fetch(`/api/notas/turma/${turmaId}/disciplina/${disciplinaSelecionada}`)
        .then(res => res.json())
        .then(data => {
          const dict: Record<string, NotaState> = {}
          if (Array.isArray(data)) data.forEach((n: any) => { dict[n.estudanteId] = { nota1: n.nota1?.toString() || '', nota2: n.nota2?.toString() || '', nota3: n.nota3?.toString() || '', isDesistente: n.status === 'DESISTENTE', isDesistenteUnid1: !!n.isDesistenteUnid1, isDesistenteUnid2: !!n.isDesistenteUnid2, isDesistenteUnid3: !!n.isDesistenteUnid3 } })
          setNotas(dict); setOriginalNotas(JSON.parse(JSON.stringify(dict)))
        }).finally(() => setLoading(false))
    }
  }, [disciplinaSelecionada, turmaId])

  const selectedDiscName = disciplinas.find(d => d.id === disciplinaSelecionada)?.nome

  const launchTips = [
    {
      title: "Lançamento Ágil",
      description: "As notas são salvas por unidade e a média é calculada em tempo real.",
      icon: <FileText className="w-5 h-5 text-emerald-600" />,
      color: "emerald"
    },
    {
      title: "Status de Aluno",
      description: "Marque como infrequente aquele aluno que não frequenta ou só apareceu para fazer a prova, clicando no ícone lateral (👥).",
      icon: <UserMinus className="w-5 h-5 text-slate-700" />,
      color: "blue"
    },
    {
      title: "Acompanhamento",
      description: "Médias abaixo de 5.0 são destacadas em vermelho para intervenção pedagógica.",
      icon: <TrendingUp className="w-5 h-5 text-orange-600" />,
      color: "orange"
    }
  ]

  const filteredEstudantes = estudantes.filter(est => 
    est.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Estilo Simulados - Ajustado para ser Flush com o Layout */}
      <header className="bg-white shadow-sm border-b border-slate-300 sticky top-0 z-50 -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/notas" className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-700">
                <ArrowLeft size={20}/>
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-slate-800 tracking-tight">
                  {disciplinaSelecionada ? selectedDiscName : "Lançar Notas"}
                </h1>
                <p className="text-base text-slate-700 font-medium">{disciplinaSelecionada ? `Turma: ${turmaNome}` : `Turma Selecionada: ${turmaNome}`}</p>
              </div>
            </div>

            {hasUnsavedChanges() && (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 bg-slate-900 border border-slate-900 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-all text-sm active:scale-95 shadow-lg shadow-slate-300"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={16} />}
                {saving ? 'SALVANDO...' : 'SALVAR NOTAS'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Dicas Estilo Simulados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {launchTips.map((tip, index) => (
             <div key={index} className="bg-white/60 border border-slate-300/60 p-4 rounded-2xl flex items-start space-x-4 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all">
                <div className={`p-2.5 rounded-xl bg-${tip.color}-50 text-${tip.color}-600`}>
                   {tip.icon}
                </div>
                <div>
                  <h3 className="text-base font-medium text-slate-800 mb-1">{tip.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{tip.description}</p>
                </div>
             </div>
          ))}
        </div>

        {/* Filtros Estilo Simulados */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-5 items-end">
            <div className="flex-1 min-w-[300px] space-y-1.5">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider ml-1">Disciplina</label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    value={disciplinaSelecionada}
                    onChange={(e) => setDisciplinaSelecionada(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-slate-500 transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="">Selecione a disciplina para lançamento...</option>
                    {disciplinas.map((disc) => <option key={disc.id} value={disc.id}>{disc.nome}</option>)}
                  </select>
                </div>
            </div>
            
            <div className="hidden lg:flex items-center gap-3 pb-1 border-l pl-5 border-slate-200 flex-1">
               <div className="bg-orange-50/50 p-2.5 rounded-xl text-orange-600 border border-orange-100/50"><UserMinus size={18}/></div>
               <p className="text-[11px] text-slate-600 leading-tight font-medium max-w-[450px]">
                 <strong className="text-slate-700">Aluno sem nota?</strong> Marque como <strong className="text-slate-700">Infrequente</strong> aquele aluno que não frequenta ou só apareceu para fazer a prova, clicando no ícone <span className="inline-flex mx-1 p-1 bg-white border border-slate-300 rounded text-slate-400"><UserMinus size={10}/></span> ao lado da nota para não afetar cálculos indevidos.
               </p>
            </div>
        </div>

        {/* Lançamento Estilo Simulados */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/10 flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-800 flex items-center gap-2">
              <Users size={20} className="text-slate-400" />
              Matriz de Rendimento Acadêmico
            </h2>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400 transition-all shadow-sm"
              />
            </div>
          </div>

          {message && (
            <div className={`p-3 flex items-center gap-2 border-b ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-300">
                <tr>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest w-12 text-center">#</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest">Estudante</th>
                  {UNIDADES.map(u => (
                    <th key={u} className="px-4 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest w-32 text-center">Unidade {u}</th>
                  ))}
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest w-24 text-center">Média</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {loading ? (
                   <tr>
                     <td colSpan={6} className="px-6 py-16 text-center">
                       <div className="flex flex-col items-center gap-2">
                         <Loader2 className="w-8 h-8 text-slate-700 animate-spin" />
                         <p className="text-slate-400 text-sm font-medium uppercase tracking-widest animate-pulse">Sincronizando...</p>
                       </div>
                     </td>
                   </tr>
                ) : !disciplinaSelecionada ? (
                   <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-300">
                        <BarChart2 className="w-12 h-12 opacity-20 mx-auto mb-3" />
                        <p className="text-sm font-medium uppercase tracking-widest">Selecione uma disciplina para iniciar o lançamento</p>
                      </td>
                   </tr>
                ) : filteredEstudantes.length === 0 ? (
                   <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-300">
                        <Search className="w-12 h-12 opacity-20 mx-auto mb-3" />
                        <p className="text-sm font-medium uppercase tracking-widest">Nenhum estudante encontrado</p>
                      </td>
                   </tr>
                ) : (
                  filteredEstudantes.map((estudante, index) => {
                    const dados = notas[estudante.matricula] || { nota1: '', nota2: '', nota3: '', isDesistente: false, isDesistenteUnid1: false, isDesistenteUnid2: false, isDesistenteUnid3: false }
                    const media = calcularMedia(estudante.matricula)
                    const isDesistente = dados.isDesistente

                    return (
                      <tr key={estudante.matricula} className={`hover:bg-slate-50 transition-colors ${isDesistente ? 'bg-amber-50/20 grayscale-[0.5]' : ''}`}>
                        <td className="px-6 py-4 text-sm text-slate-400 font-medium text-center">{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col relative group/name">
                             <div className="flex items-center gap-2">
                                <span className={`text-base font-medium uppercase ${isDesistente ? 'text-amber-700' : 'text-slate-700'}`}>{estudante.nome}</span>
                                {estudante.aeeProfile && (
                                   <Link 
                                     href={`/dashboard/aee/${estudante.matricula}`}
                                     className={`p-1.5 rounded-full border-2 transition-all flex items-center justify-center hover:scale-110 active:scale-95 ${
                                       estudante.aeeProfile.acknowledgements.length > 0 
                                       ? 'bg-emerald-50 border-emerald-500 text-emerald-600' 
                                       : 'bg-amber-50 border-amber-500 text-amber-600 animate-pulse'
                                     }`}
                                     title={estudante.aeeProfile.acknowledgements.length > 0 ? "Ficha AEE: Lida" : "Ficha AEE: LEITURA PENDENTE!"}
                                   >
                                      <Accessibility className="w-4 h-4" />
                                   </Link>
                                )}
                             </div>
                            <span className="text-[11px] font-medium text-slate-400 tracking-widest uppercase">Matrícula: {estudante.matricula}</span>
                          </div>
                        </td>
                        {UNIDADES.map((u) => {
                          const isUnidDesistente = (dados as any)[`isDesistenteUnid${u}`]
                          const val = (dados as any)[`nota${u}`]
                          const isModified = val !== (originalNotas[estudante.matricula] as any)?.[`nota${u}`] && !saving

                          return (
                            <td key={u} className="px-4 py-4 text-center">
                              <div className="flex flex-col items-center gap-1.5 group relative">
                                <input
                                  type="number" step="0.1"
                                  value={val}
                                  onChange={(e) => handleNotaChange(estudante.matricula, `nota${u}` as any, e.target.value)}
                                  className={`w-14 h-9 text-center border-2 rounded-xl text-base font-medium transition-all outline-none ${
                                    isUnidDesistente ? 'bg-orange-50 border-orange-200 text-orange-600' : 
                                    isModified ? 'border-slate-400 bg-white ring-4 ring-slate-500/5' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400'
                                  }`}
                                  placeholder="0.0"
                                />
                                <button 
                                    type="button" 
                                    onClick={() => handleDesistenteChange(estudante.matricula, `isDesistenteUnid${u}` as any, !isUnidDesistente)} 
                                    className={`absolute -right-3 -bottom-2 p-1.5 rounded-full transition-all shadow-sm flex items-center justify-center ${
                                        isUnidDesistente 
                                        ? 'bg-orange-100 text-orange-600 scale-100 z-10 ring-2 ring-white' 
                                        : 'bg-white text-slate-300 hover:text-orange-500 hover:bg-orange-50 scale-100 opacity-60 hover:opacity-100 group-hover:opacity-100 border border-slate-300 z-10'
                                    }`} 
                                    title={isUnidDesistente ? "Desmarcar infrequente" : "Marcar como Infrequente (não frequenta ou só veio fazer prova)"}
                                >
                                    <UserMinus size={isUnidDesistente ? 14 : 12}/>
                                </button>
                              </div>
                            </td>
                          )
                        })}
                        <td className="px-6 py-4 text-center">
                          <span className={`text-base font-medium ${getStatusColor(media)}`}>{media}</span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {disciplinaSelecionada && filteredEstudantes.length > 0 && (
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-4">
              <div className="hidden md:block">
                 <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Confira todas as notas antes de salvar o fechamento.</p>
              </div>
               <button
                onClick={handleSubmit}
                disabled={saving || !hasUnsavedChanges()}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-2xl font-medium text-sm shadow-xl shadow-slate-300 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                {saving ? 'SINCRONIZANDO...' : 'SALVAR NOTAS'}
              </button>
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-white">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-slate-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-300"><Save size={20}/></div>
                  <div>
                     <h3 className="text-lg font-medium text-slate-800 uppercase tracking-tight">Consolidar Dados</h3>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Revise as alterações da turma</p>
                  </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-300 rounded-xl transition-all"><X size={20}/></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 bg-slate-50/20 custom-scrollbar">
              {estudantes.filter(e => JSON.stringify(notas[e.matricula]) !== JSON.stringify(originalNotas[e.matricula] || {})).map((est, i) => (
                 <div key={i} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                   <span className="text-sm font-medium text-slate-700 uppercase truncate pr-4">{est.nome}</span>
                   <div className="flex gap-2">
                       {UNIDADES.map(u => {
                        const val = (notas[est.matricula] as any)?.[`nota${u}`]
                        const isNaoRealizou = (notas[est.matricula] as any)?.[`isDesistenteUnid${u}`]
                        const origVal = (originalNotas[est.matricula] as any)?.[`nota${u}`]
                        const origNR = (originalNotas[est.matricula] as any)?.[`isDesistenteUnid${u}`]
                        if (val === origVal && isNaoRealizou === origNR) return null
                        return <span key={u} className="text-[11px] font-medium bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">{u}ª: {val || '0'} {isNaoRealizou && <span className="text-amber-600 ml-1">(INF)</span>}</span>
                      })}
                   </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 flex gap-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-sm font-medium text-slate-400 hover:bg-white rounded-2xl transition-all">Cancelar</button>
              <button onClick={confirmSave} className="flex-1 py-3 bg-slate-600 text-white text-sm font-medium rounded-2xl shadow-xl shadow-slate-300 hover:bg-slate-700 transition-all active:scale-95">Confirmar e Gravar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
