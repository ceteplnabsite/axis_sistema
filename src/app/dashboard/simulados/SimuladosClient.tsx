"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Search, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  BookOpen,
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Target,
  FileText,
  Layers,
  X
} from "lucide-react"

interface Turma {
  id: string
  nome: string
}

interface Area {
  id: string
  nome: string
}

interface Estudante {
  matricula: string
  nome: string
  notasSimulado: Array<{
    nota: number
    unidade: number
  }>
}

export default function SimuladosClient({ 
  turmas, 
  areas, 
  user 
}: { 
  turmas: Turma[], 
  areas: Area[], 
  user: any 
}) {
  const [selectedTurma, setSelectedTurma] = useState("")
  const [selectedArea, setSelectedArea] = useState("")
  const [selectedUnidade, setSelectedUnidade] = useState("1")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [estudantes, setEstudantes] = useState<Estudante[]>([])
  const [notasTemp, setNotasTemp] = useState<Record<string, string>>({})
  const [originalNotas, setOriginalNotas] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [canLaunch, setCanLaunch] = useState(false)

  useEffect(() => {
    if (selectedTurma && selectedArea && selectedUnidade) {
      loadEstudantes()
    } else {
      setCanLaunch(user.isSuperuser || user.isDirecao)
    }
  }, [selectedTurma, selectedArea, selectedUnidade])

  const loadEstudantes = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/simulados?turmaId=${selectedTurma}&areaId=${selectedArea}&unidade=${selectedUnidade}`)
      const data = await res.json()
      if (res.ok) {
        const { estudantes: list, canEdit } = data
        setEstudantes(list)
        setCanLaunch(canEdit)

        const initialNotas: Record<string, string> = {}
        list.forEach((est: Estudante) => {
          if (est.notasSimulado.length > 0) {
            initialNotas[est.matricula] = est.notasSimulado[0].nota.toString()
          } else {
            initialNotas[est.matricula] = ""
          }
        })
        setNotasTemp(initialNotas)
        setOriginalNotas(initialNotas)
      } else {
        setMessage({ type: 'error', text: data.message || 'Erro ao carregar estudantes' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão' })
    } finally {
      setLoading(false)
    }
  }

  const handleNotaChange = (matricula: string, value: string) => {
    if (value === "" || (/^\d*\.?\d*$/.test(value) && parseFloat(value) <= 4)) {
      setNotasTemp(prev => ({ ...prev, [matricula]: value }))
    }
  }

  const hasUnsavedChanges = () => {
    for (const matricula of Object.keys(notasTemp)) {
      if (notasTemp[matricula] !== originalNotas[matricula]) {
        return true
      }
    }
    return false
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setShowModal(true)
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSaving(true)
    setMessage(null)

    const notasToSave = Object.entries(notasTemp)
      .filter(([_, nota]) => nota !== "")
      .map(([matricula, nota]) => ({
        estudanteId: matricula,
        nota: parseFloat(nota)
      }))

    try {
      const res = await fetch('/api/simulados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaId: selectedArea,
          unidade: selectedUnidade,
          turmaId: selectedTurma,
          notas: notasToSave
        })
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Notas salvas com sucesso!' })
        setShowModal(false)
        loadEstudantes()
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.message || 'Erro ao salvar notas' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão ao salvar' })
    } finally {
      setSaving(false)
    }
  }

  const filteredEstudantes = estudantes.filter(est => 
    est.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    media: filteredEstudantes.length > 0 
      ? (filteredEstudantes.reduce((acc, est) => acc + (parseFloat(notasTemp[est.matricula]) || 0), 0) / filteredEstudantes.length).toFixed(1)
      : "0.0",
    total: filteredEstudantes.length,
    aprovados: filteredEstudantes.filter(est => (parseFloat(notasTemp[est.matricula]) || 0) >= 2.4).length
  }

  const simuTips = [
    {
      title: "Áreas de Conhecimento",
      description: "As notas são lançadas por áreas (Ex: CNT, CH, Linguagens) e valem até 4.0 pontos.",
      icon: <Target className="w-5 h-5 text-slate-700" />,
      color: "indigo"
    },
    {
      title: "Unidades Letivas",
      description: "Selecione entre Unidade 1 ou 2 para registrar o desempenho do simulado correspondente.",
      icon: <FileText className="w-5 h-5 text-slate-700" />,
      color: "blue"
    },
    {
      title: "Desempenho Geral",
      description: "O sistema monitora o aproveitamento da área para prever o rendimento no ENEM/Vestibulares.",
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
      color: "emerald"
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-300 sticky top-0 z-50 -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center space-x-5">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-slate-800 tracking-tight">Simulados</h1>
                <p className="text-base text-slate-700 font-medium">Gestão de notas por áreas de conhecimento</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(user.isSuperuser || user.isDirecao) && (
                <Link 
                  href="/dashboard/simulados/responsaveis"
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-medium hover:bg-slate-800 transition-all text-xs uppercase tracking-widest active:scale-95 shadow-xl shadow-slate-300"
                >
                  <Users size={16} /> Designar Responsáveis
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 space-y-8">
        {/* Dicas Fixas - Estilo Resultados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {simuTips.map((tip, index) => (
             <div key={index} className="bg-white/60 border border-slate-300/60 p-5 rounded-3xl flex items-start space-x-4 hover:bg-white hover:border-slate-300 hover:shadow-xl hover:shadow-slate-300/30 transition-all group">
                <div className={`p-3 rounded-2xl bg-${tip.color}-50 text-${tip.color}-600 group-hover:bg-${tip.color}-600 group-hover:text-white transition-all shadow-inner`}>
                   {tip.icon}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-800 uppercase tracking-widest mb-1">{tip.title}</h3>
                  <p className="text-[11px] font-medium text-slate-400 uppercase leading-relaxed">{tip.description}</p>
                </div>
             </div>
          ))}
        </div>

        {/* Filtros Premium */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-300/40 border border-slate-200 flex flex-wrap gap-6 items-end relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl"></div>
            
            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-2">Filtrar por Turma</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 group-focus-within:text-rose-600 group-focus-within:bg-rose-50 transition-all">
                    <Users size={16} />
                  </div>
                  <select
                    value={selectedTurma}
                    onChange={(e) => setSelectedTurma(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-200 border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all appearance-none cursor-pointer font-medium text-slate-700 shadow-inner"
                  >
                    <option value="">Selecione a Turma...</option>
                    {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
            </div>

            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-2">Área de Conhecimento</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 group-focus-within:text-rose-600 group-focus-within:bg-rose-50 transition-all">
                    <BookOpen size={16} />
                  </div>
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-200 border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all appearance-none cursor-pointer font-medium text-slate-700 shadow-inner"
                  >
                    <option value="">Selecione a Área...</option>
                    {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
            </div>

            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-2">Unidade / Etapa</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 group-focus-within:text-rose-600 group-focus-within:bg-rose-50 transition-all">
                    <Layers size={16} />
                  </div>
                  <select
                    value={selectedUnidade}
                    onChange={(e) => setSelectedUnidade(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-200 border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all appearance-none cursor-pointer font-medium text-slate-700 shadow-inner"
                  >
                    <option value="1">1ª Unidade</option>
                    <option value="2">2ª Unidade</option>
                  </select>
                </div>
            </div>

            <div className="flex items-center gap-3 pb-1">
                <div className="text-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Média</p>
                    <p className="text-lg font-black text-slate-700 leading-none mt-1">{stats.media}</p>
                </div>
                <div className="text-center px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-widest">Aprov.</p>
                    <p className="text-lg font-black text-emerald-700 leading-none mt-1">{stats.total > 0 ? Math.round((stats.aprovados / stats.total) * 100) : 0}%</p>
                </div>
            </div>
        </div>
        {/* Lançamento Estilo Resultados */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/10 flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-800 flex items-center gap-2">
              <Users size={20} className="text-slate-400" />
              Matriz de Avaliação Somativa
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
              {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span className="text-xs font-medium">{message.text}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-300">
                <tr>
                  <th className="px-6 py-4 text-sm font-medium text-slate-400 uppercase tracking-widest">Estudante</th>
                  <th className="px-6 py-4 text-sm font-medium text-slate-400 uppercase tracking-widest w-40 text-center">Pontuação</th>
                  <th className="px-6 py-4 text-sm font-medium text-slate-400 uppercase tracking-widest text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-slate-700 animate-spin" />
                        <p className="text-slate-400 text-xs font-medium uppercase tracking-widest animate-pulse">Sincronizando...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredEstudantes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-16 text-center text-slate-300">
                      <BarChart3 className="w-12 h-12 opacity-20 mx-auto mb-3" />
                      <p className="text-xs font-medium uppercase tracking-widest">Selecione os filtros para iniciar</p>
                    </td>
                  </tr>
                ) : (
                  filteredEstudantes.map((est) => {
                    const notaNum = parseFloat(notasTemp[est.matricula])
                    const isAltaPerformance = notaNum > 3.5
                    const isNaMedia = notaNum >= 2.4 && notaNum <= 3.5
                    const hasNota = notasTemp[est.matricula] !== ""

                    return (
                      <tr key={est.matricula} className="hover:bg-slate-50 transition-colors">
                         <td className="px-6 py-3.5">
                           <div className="flex flex-col">
                             <span className="text-base font-medium text-slate-700 uppercase">{est.nome}</span>
                             <span className="text-[11px] font-medium text-slate-400 tracking-widest uppercase">Matrícula: {est.matricula}</span>
                           </div>
                         </td>
                        <td className="px-6 py-3.5">
                          <div className="flex justify-center">
                            <div className="relative group">
                              <input
                                type="text"
                                value={notasTemp[est.matricula]}
                                onChange={(e) => handleNotaChange(est.matricula, e.target.value)}
                                disabled={!canLaunch}
                                 className={`w-20 text-center py-2 border-2 rounded-xl text-base font-medium outline-none transition-all ${
                                   hasUnsavedChanges() && notasTemp[est.matricula] !== originalNotas[est.matricula] ? 'border-slate-400 bg-white ring-4 ring-slate-500/5' :
                                   !hasNota ? 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400' : 
                                   isAltaPerformance ? 'border-emerald-100 bg-emerald-50 text-emerald-700 focus:border-emerald-400' : 
                                   isNaMedia ? 'border-slate-200 bg-slate-100 text-slate-800 focus:border-blue-400' :
                                   'border-red-100 bg-red-50 text-red-700 focus:border-red-400'
                                 }`}
                                placeholder="0.0"
                              />
                              <div className="absolute -top-1 -right-1 group-focus-within:block hidden">
                                <div className="w-2 h-2 bg-slate-500 rounded-full animate-ping" />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {hasNota ? (
                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                              isAltaPerformance ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                              isNaMedia ? 'bg-slate-200 text-slate-800 border-slate-300' :
                              'bg-red-100 text-red-700 border-red-200'
                            }`}>
                              {isAltaPerformance ? 'Alta Performance' : isNaMedia ? 'Na Média' : 'Abaixo da Média'}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[10px] font-medium uppercase tracking-widest italic opacity-50">Não Lançado</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredEstudantes.length > 0 && canLaunch && (
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-4">
               <div className="hidden md:block">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Verifique se as notas são de 0.0 a 4.0 antes de salvar.</p>
               </div>
              <button
                onClick={handleSubmit}
                disabled={saving || !hasUnsavedChanges()}
                 className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-2xl font-medium text-xs shadow-xl shadow-slate-300 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save size={16} />}
                {saving ? 'SINCRONIZANDO...' : 'SALVAR RESULTADO'}
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
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Revise as alterações do Simulado</p>
                  </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-300 rounded-xl transition-all"><X size={20}/></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 bg-slate-50/20 custom-scrollbar">
              {estudantes.filter(e => notasTemp[e.matricula] !== originalNotas[e.matricula]).map((est, i) => (
                 <div key={i} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                   <span className="text-sm font-medium text-slate-700 uppercase truncate pr-4">{est.nome}</span>
                   <div className="flex gap-2">
                      <span className="text-[11px] font-medium bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                        Nova Nota: {notasTemp[est.matricula] || '0.0'}
                      </span>
                   </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-slate-200 bg-white">
              <div className="flex justify-end gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all uppercase tracking-widest text-xs flex-1 md:flex-none text-center"
                >
                  Continuar Editando
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-3 bg-slate-600 text-white rounded-xl font-medium hover:bg-slate-700 transition-all shadow-xl shadow-slate-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs flex-1 md:flex-none"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Confirmando...' : 'Confirmar e Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
