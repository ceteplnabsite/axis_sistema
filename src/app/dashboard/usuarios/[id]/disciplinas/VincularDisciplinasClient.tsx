"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, Save, BookOpen, Search, CheckCircle2, 
  Loader2, Info, ChevronDown, ChevronUp, Filter,
  School, GraduationCap, X, ClipboardPaste, AlertCircle
} from "lucide-react"

export default function VincularDisciplinasClient({ usuario, todasDisciplinas }: { usuario: any, todasDisciplinas: any[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>(
    usuario.disciplinasPermitidas.map((d: any) => d.id)
  )
  const [expandedTurmas, setExpandedTurmas] = useState<Record<string, boolean>>(() => {
    // Auto-expandir turmas que já possuem vínculos ativos
    const initial: Record<string, boolean> = {}
    todasDisciplinas.forEach(d => {
      if (usuario.disciplinasPermitidas.some((up: any) => up.id === d.id)) {
        initial[d.turma.id] = true
      }
    })
    return initial
  })
  const [showOnlySelected, setShowOnlySelected] = useState(false)

  // Organizar e filtrar disciplinas
  const disciplinasPorTurma = useMemo(() => {
    const grouped = todasDisciplinas.reduce((acc: any, disc: any) => {
      const turmaLabel = disc.turma.modalidade 
        ? `${disc.turma.nome} (${disc.turma.modalidade})`
        : disc.turma.nome
      
      const turmaKey = disc.turma.id

      // Filtro por nome da turma ou da disciplina
      const matchesSearch = 
        turmaLabel.toLowerCase().includes(search.toLowerCase()) || 
        disc.nome.toLowerCase().includes(search.toLowerCase())
      
      const isSelected = selectedIds.includes(disc.id)
      const matchesFilter = showOnlySelected ? isSelected : true

      if (!matchesSearch || !matchesFilter) return acc

      if (!acc[turmaKey]) {
        acc[turmaKey] = {
          label: turmaLabel,
          disciplinas: []
        }
      }
      acc[turmaKey].disciplinas.push(disc)
      return acc
    }, {})
    return grouped
  }, [todasDisciplinas, search])

  const disciplinasSelecionadasList = useMemo(() => {
    return todasDisciplinas
      .filter((d: any) => selectedIds.includes(d.id))
      .map((d: any) => ({
        id: d.id,
        nome: d.nome,
        turma: d.turma.modalidade ? `${d.turma.nome} (${d.turma.modalidade})` : d.turma.nome
      }))
      .sort((a: any, b: any) => a.turma.localeCompare(b.turma) || a.nome.localeCompare(b.nome))
  }, [todasDisciplinas, selectedIds])

  const toggleTurma = (turma: string) => {
    setExpandedTurmas(prev => ({ ...prev, [turma]: !prev[turma] }))
  }

  const toggleDisciplina = (id: string) => {
    const isNowSelected = !selectedIds.includes(id)

    if (isNowSelected) {
      // Verificar se essa disciplina tem outro professor vinculado nas props
      const disc = todasDisciplinas.find(d => d.id === id)
      const outro = disc?.usuariosPermitidos?.find((u: any) => u.id !== usuario.id)
      
      if (outro) {
        if (!confirm(`Esta disciplina já está vinculada ao professor(a) ${outro.name}. Ao confirmar, ela será transferida para ${usuario.name}. Deseja continuar?`)) {
          return
        }
      }
    }

    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/usuarios/${usuario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          disciplinasIds: selectedIds 
        })
      })

      if (response.ok) {
        router.push('/dashboard/usuarios')
        router.refresh()
      }
    } catch (err) {
      alert('Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const turmaEntries = Object.entries(disciplinasPorTurma)

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header Fixo Premium */}
      <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-300">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard/usuarios" 
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors border border-transparent hover:border-slate-300"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </Link>
              <div>
                <h1 className="text-xl font-medium text-slate-800 leading-tight">Vincular Disciplinas</h1>
                <p className="text-xs font-medium text-slate-700 uppercase tracking-tight">
                   Professor: {usuario.name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/usuarios/${usuario.id}/importar-horario`}
                className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2.5 rounded-[1.25rem] font-medium text-sm hover:bg-slate-50 transition-all"
              >
                <ClipboardPaste className="w-4 h-4" />
                <span>Importar Horário</span>
              </Link>
              <button
                onClick={handleSave} disabled={loading}
                className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-[1.25rem] font-medium text-sm hover:bg-slate-800 shadow-xl shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        
        {/* Barra de Pesquisa e Filtro */}
        <div className="relative mb-10 group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
          </div>
          <input 
            type="text"
            placeholder="Buscar por turma ou disciplina..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-14 pr-12 py-5 bg-white border border-slate-300 rounded-[2rem] shadow-sm focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none font-medium text-slate-700 transition-all"
          />
          <div className="absolute inset-y-0 right-5 flex items-center gap-2">
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                title="Limpar busca"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-700" />
              </button>
            )}
            <button
               onClick={() => setShowOnlySelected(!showOnlySelected)}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                 showOnlySelected 
                 ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                 : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
               }`}
            >
               <Filter className="w-3.5 h-3.5" />
               {showOnlySelected ? 'Mostrando Apenas Vinculadas' : 'Ver Todas'}
            </button>
          </div>
        </div>
        
        {/* Banner de Aviso de Regra */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 shadow-sm">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-bold mb-1">Regra de Exclusividade Ativa</p>
            <p className="text-xs font-medium opacity-90 leading-relaxed">
              Cada disciplina pode ter apenas <strong>um professor associado</strong>. 
              Ao selecionar uma matéria que já possui professor (marcada em <span className="text-amber-700 font-bold">amarelo</span>), 
              o vínculo anterior será removido e transferido para este usuário ao salvar.
            </p>
          </div>
        </div>

        {/* Disciplinas Vinculadas Atualmente */}
        {disciplinasSelecionadasList.length > 0 && (
          <div className="mb-10 p-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-400" />
              Disciplinas Já Vinculadas ({disciplinasSelecionadasList.length})
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {disciplinasSelecionadasList.map((disc: any) => (
                <div key={disc.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-700 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold">{disc.nome} <span className="text-slate-400 font-medium">· {disc.turma}</span></span>
                  <button 
                    onClick={() => toggleDisciplina(disc.id)}
                    className="ml-1 p-1 hover:bg-rose-100 hover:text-rose-600 text-slate-400 rounded-lg transition-colors"
                    title="Remover"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {turmaEntries.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-600 font-medium">Nenhuma turma encontrada para "{search}"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {turmaEntries.map(([turmaKey, data]: [string, any]) => {
              const { label, disciplinas } = data
              const isExpanded = expandedTurmas[turmaKey] || search.length > 0
              const selecionadasNaTurma = disciplinas.filter((d: any) => selectedIds.includes(d.id)).length
              
              return (
                <div 
                  key={turmaKey} 
                  className={`bg-white rounded-[2rem] border transition-all overflow-hidden ${
                    isExpanded ? 'ring-2 ring-slate-900 border-transparent shadow-xl' : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {/* Cabeçalho da Turma (Acordeão) */}
                  <button
                    onClick={() => toggleTurma(turmaKey)}
                    className="w-full px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                        isExpanded ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        <School className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-800 uppercase tracking-tight text-lg">{label}</h3>
                        <p className="text-xs font-medium text-slate-400">
                           {selecionadasNaTurma} de {disciplinas.length} disciplinas vinculadas
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                       {selecionadasNaTurma > 0 && !isExpanded && (
                         <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-medium rounded-full uppercase">
                            Ativo
                         </span>
                       )}
                       {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </button>

                  {/* Conteúdo das Disciplinas */}
                  {isExpanded && (
                    <div className="px-8 pb-8 animate-in slide-in-from-top-2 duration-300">
                      <div className="h-px bg-slate-200 mb-6" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {disciplinas.map((disc: any) => {
                          const isSelected = selectedIds.includes(disc.id)
                          // Identificar se outro professor (que não seja este) está vinculado
                          const outroProfessor = disc.usuariosPermitidos?.find((u: any) => u.id !== usuario.id)
                          
                          return (
                            <label 
                              key={disc.id} 
                              className={`group flex flex-col p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                                isSelected 
                                  ? 'bg-slate-100 border-slate-700 shadow-sm' 
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              } ${outroProfessor && !isSelected ? 'border-amber-200 bg-amber-50/30' : ''}`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={`text-sm font-semibold flex-grow ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                                  {disc.nome}
                                </span>
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                  isSelected ? 'border-slate-700 bg-slate-700' : 'border-slate-300 group-hover:border-slate-300'
                                }`}>
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={isSelected}
                                    onChange={() => toggleDisciplina(disc.id)}
                                  />
                                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                </div>
                              </div>
                              
                              {outroProfessor && !isSelected && (
                                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-600 font-bold uppercase tracking-tight bg-amber-100/50 px-2 py-1 rounded-lg">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>{outroProfessor.name || 'Outro Prof.'}</span>
                                </div>
                              )}

                              {isSelected && usuario.disciplinasPermitidas.some((up: any) => up.id === disc.id) && (
                                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold uppercase tracking-tight bg-emerald-100/50 px-2 py-1 rounded-lg">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>VINCULADA A VOCÊ</span>
                                </div>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Info Flutuante no Rodapé */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-4 border border-white/10 backdrop-blur-md">
         <Info className="w-4 h-4 text-blue-400" />
         <span className="text-xs font-medium uppercase tracking-widest leading-none">
            {selectedIds.length} selecionadas
         </span>
         {todasDisciplinas.some(d => selectedIds.includes(d.id) && d.usuariosPermitidos?.some((u: any) => u.id !== usuario.id)) && (
           <div className="flex items-center gap-2 border-l border-white/20 pl-4 ml-4">
             <AlertCircle className="w-4 h-4 text-amber-400" />
             <span className="text-xs font-bold text-amber-400 uppercase tracking-tight">Vínculos serão transferidos</span>
           </div>
         )}
      </div>
    </div>
  )
}
