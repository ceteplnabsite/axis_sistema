"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Info, 
  TrendingUp, 
  GraduationCap, 
  Users,
  Search,
  Loader2,
  TrendingDown,
  AlertTriangle
} from "lucide-react"

interface NotaRecuperacao {
  id: string
  nota: number
  status: string
  estudanteId: string
  estudanteNome: string
  disciplinaId: string
  disciplinaNome: string
  notaRecuperacao?: number | null
}

export default function RecuperacaoTurmaClient({
  turmaId,
  turmaNome,
  notasRecuperacao,
  disciplinas
}: {
  turmaId: string
  turmaNome: string
  notasRecuperacao: NotaRecuperacao[]
  disciplinas: { id: string; nome: string }[]
}) {
  const router = useRouter()
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [notas, setNotas] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    notasRecuperacao.forEach(n => { if (n.notaRecuperacao !== null && n.notaRecuperacao !== undefined) initial[n.id] = n.notaRecuperacao.toString() })
    return initial
  })

  const [originalNotas, setOriginalNotas] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    notasRecuperacao.forEach(n => { if (n.notaRecuperacao !== null && n.notaRecuperacao !== undefined) initial[n.id] = n.notaRecuperacao.toString() })
    return initial
  })

  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const hasUnsavedChanges = () => JSON.stringify(notas) !== JSON.stringify(originalNotas)

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { if (hasUnsavedChanges()) { e.preventDefault(); e.returnValue = ""; } }
    window.addEventListener("beforeunload", handleBeforeUnload); return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [notas, originalNotas])

  const handleNotaChange = (notaId: string, valor: string) => setNotas(prev => ({ ...prev, [notaId]: valor }))
  const toggleNaoRealizou = (notaId: string, checked: boolean) => setNotas(prev => ({ ...prev, [notaId]: checked ? '-1' : '' }))
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setShowConfirmModal(true); }

  const handleConfirmSave = async () => {
    setSaving(true); setShowConfirmModal(false); setMessage(null);
    try {
      const relevantNotaIds = new Set(notasRecuperacao.filter(n => n.disciplinaId === disciplinaSelecionada).map(n => n.id))
      const notasArray = Object.entries(notas).filter(([id]) => relevantNotaIds.has(id)).map(([notaId, val]) => ({ notaId, notaRecuperacao: parseFloat(val) })).filter(n => !isNaN(n.notaRecuperacao))
      const response = await fetch('/api/notas/recuperacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notas: notasArray }) })
      if (response.ok) { setMessage({ type: 'success', text: 'Notas salvas!' }); setOriginalNotas(JSON.parse(JSON.stringify(notas))); router.refresh(); }
      else { const error = await response.json(); setMessage({ type: 'error', text: error.message || 'Erro ao salvar' }); }
    } catch (error) { setMessage({ type: 'error', text: 'Erro de conexão' }) } finally { setSaving(false) }
  }

  const disciplineObj = disciplinas.find(d => d.id === disciplinaSelecionada)

  const recuperacaoTips = [
    {
      title: "Recuperação Final",
      description: "A nota substitui o resultado final se for superior a 5.0.",
      icon: <TrendingUp className="w-5 h-5 text-rose-600" />,
      color: "rose"
    },
    {
      title: "Alerta de Risco",
      description: "Médias críticas no conselho requerem atenção imediata.",
      icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
      color: "orange"
    },
    {
      title: "Nota Substitutiva",
      description: "O sistema calcula automaticamente o status baseado no lançamento.",
      icon: <CheckCircle2 className="w-5 h-5 text-amber-600" />,
      color: "amber"
    }
  ]

  const filteredNotas = notasRecuperacao.filter(n => 
    n.disciplinaId === disciplinaSelecionada && 
    n.estudanteNome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    total: filteredNotas.length,
    aprovados: filteredNotas.filter(n => (parseFloat(notas[n.id]) >= 5 && notas[n.id] !== '-1')).length
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Estilo Simulados */}
      <header className="bg-white shadow-sm border-b border-slate-300 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/notas/recuperacao" className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-700">
                <ArrowLeft size={20}/>
              </Link>
              <div>
                <h1 className="text-3xl font-medium text-slate-800 tracking-tight">
                  {disciplinaSelecionada ? disciplineObj?.nome : "Lançar Recuperação Final"}
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
                {saving ? 'SALVANDO...' : 'SALVAR RECUPERAÇÃO FINAL'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Dicas Estilo Simulados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recuperacaoTips.map((tip, index) => (
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
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider ml-1">Disciplina Alvo</label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    value={disciplinaSelecionada}
                    onChange={(e) => setDisciplinaSelecionada(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-rose-500 transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="">Selecione a disciplina para recuperação final...</option>
                    {disciplinas.map((disc) => <option key={disc.id} value={disc.id}>{disc.nome}</option>)}
                  </select>
                </div>
            </div>
            
            <div className="flex items-center gap-3 pb-1">
                <div className="text-center px-4 py-2 bg-rose-50 rounded-xl border border-rose-100">
                    <p className="text-[10px] font-medium text-rose-400 uppercase tracking-widest">Pendente</p>
                    <p className="text-base font-medium text-rose-700 leading-none mt-1">{stats.total}</p>
                </div>
                <div className="text-center px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-widest">Recuperado</p>
                    <p className="text-base font-medium text-emerald-700 leading-none mt-1">{stats.aprovados}</p>
                </div>
            </div>
        </div>

        {/* Lançamento Estilo Simulados */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/10 flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-800 flex items-center gap-2">
               <Users size={20} className="text-slate-400" />
               Painel de Recuperação Final
            </h2>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-400 transition-all shadow-sm"
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
                  <th className="px-4 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest w-32 text-center">Média Anual</th>
                  <th className="px-4 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest w-32 text-center">Recuperação</th>
                  <th className="px-4 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest w-16 text-center">Faltou</th>
                  <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest w-32 text-center">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {!disciplinaSelecionada ? (
                   <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-300">
                        <TrendingDown className="w-12 h-12 opacity-20 mx-auto mb-3" />
                        <p className="text-sm font-medium uppercase tracking-widest">Selecione uma disciplina para iniciar</p>
                      </td>
                   </tr>
                ) : filteredNotas.length === 0 ? (
                   <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-300">
                        <Search className="w-12 h-12 opacity-20 mx-auto mb-3" />
                        <p className="text-sm font-medium uppercase tracking-widest">Nenhum estudante sob recuperação final nesta disciplina</p>
                      </td>
                   </tr>
                ) : (
                  filteredNotas.map((nota, index) => {
                    const currentVal = notas[nota.id] || ''
                    const isFaltou = currentVal === '-1'
                    const num = parseFloat(currentVal)
                    const isModified = currentVal !== originalNotas[nota.id] && !saving

                    let status = { text: 'PENDENTE', class: 'text-slate-300' }
                    if (currentVal) {
                      if (isFaltou) status = { text: 'DE CONSELHO', class: 'text-rose-600 bg-rose-50 border-rose-100' }
                      else if (num >= 5) status = { text: 'APROVADO', class: 'text-emerald-600 bg-emerald-50 border-emerald-100' }
                      else status = { text: 'DE CONSELHO', class: 'text-rose-600 bg-rose-50 border-rose-100' }
                    }

                    return (
                       <tr key={nota.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-400 font-medium text-center">{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-medium text-slate-700 uppercase">{nota.estudanteNome}</span>
                              {nota.status === 'DESISTENTE' && (
                                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-medium rounded uppercase tracking-tighter shadow-sm border border-rose-200">DESISTENTE</span>
                              )}
                            </div>
                            <span className="text-[11px] font-medium text-slate-400 tracking-widest uppercase">Matrícula: {nota.estudanteId}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-medium text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">{nota.nota.toFixed(1)}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <input
                            type="number" step="0.1"
                            value={isFaltou || nota.status === 'DESISTENTE' ? '' : currentVal} 
                            disabled={isFaltou || nota.status === 'DESISTENTE'}
                            onChange={(e) => handleNotaChange(nota.id, e.target.value)}
                             className={`w-16 h-9 text-center border-2 rounded-xl text-base font-medium transition-all outline-none ${
                                 isFaltou || nota.status === 'DESISTENTE' ? 'bg-slate-200 border-slate-200 text-slate-300 pointer-events-none' : 
                                 isModified ? 'border-rose-400 bg-white ring-4 ring-rose-500/5 shadow-sm' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-rose-400'
                             }`}
                             placeholder={nota.status === 'DESISTENTE' ? "-" : "0.0"}
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                           <input type="checkbox" checked={isFaltou} onChange={(e) => toggleNaoRealizou(nota.id, e.target.checked)} className="w-5 h-5 text-rose-600 border-slate-300 rounded-lg cursor-pointer transition-all active:scale-90" />
                        </td>
                        <td className="px-6 py-4 text-center">
                            <span className={`inline-block whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-medium border uppercase tracking-widest ${
                              nota.status === 'DESISTENTE' ? 'text-rose-700 bg-rose-50 border-rose-100' : status.class
                            }`}>
                             {nota.status === 'DESISTENTE' ? 'DESISTENTE' : status.text}
                           </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {disciplinaSelecionada && filteredNotas.length > 0 && (
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-4">
              <div className="hidden md:block">
                 <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Confirme o lançamento para substituir a média anual automática.</p>
              </div>
               <button
                onClick={handleSubmit}
                disabled={saving || !hasUnsavedChanges()}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-2xl font-medium text-sm shadow-xl shadow-slate-300 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                {saving ? 'SINCRONIZANDO...' : 'SALVAR RECUPERAÇÃO FINAL'}
              </button>
            </div>
          )}
        </div>
      </main>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-white">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-200"><TrendingUp size={20}/></div>
                  <div>
                    <h3 className="text-lg font-medium text-slate-800 uppercase tracking-tight">Consolidar Recuperação Final</h3>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Ação permanente no boletim anual</p>
                  </div>
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="p-2 hover:bg-slate-300 rounded-xl transition-all"><X size={20}/></button>
            </div>
            <div className="p-6 max-h-[50vh] overflow-y-auto space-y-2 bg-slate-50/20 custom-scrollbar">
              {notasRecuperacao.filter(n => n.disciplinaId === disciplinaSelecionada && notas[n.id] !== originalNotas[n.id]).map(n => (
                 <div key={n.id} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-sm font-medium text-slate-700 uppercase truncate pr-4">{n.estudanteNome}</span>
                  <span className="text-sm font-medium text-rose-600 min-w-max">{notas[n.id] === '-1' ? 'FALTOU' : `NOTA: ${notas[n.id]}`}</span>
                </div>
              ))}
            </div>
             <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 flex gap-4">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 text-sm font-medium text-slate-400 hover:bg-white rounded-2xl transition-all">Cancelar</button>
              <button onClick={handleConfirmSave} className="flex-1 py-3 bg-rose-600 text-white text-sm font-medium rounded-2xl shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95">Finalizar Envio</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
