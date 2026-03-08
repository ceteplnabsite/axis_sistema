"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, Save, BookOpen, Search, CheckCircle2, 
  Loader2, Info, ChevronDown, ChevronUp, Filter,
  School, GraduationCap, X
} from "lucide-react"

export default function VincularDisciplinasClient({ usuario, todasDisciplinas }: { usuario: any, todasDisciplinas: any[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>(
    usuario.disciplinasPermitidas.map((d: any) => d.id)
  )
  const [expandedTurmas, setExpandedTurmas] = useState<Record<string, boolean>>({})

  // Organizar e filtrar disciplinas
  const disciplinasPorTurma = useMemo(() => {
    const grouped = todasDisciplinas.reduce((acc: any, disc: any) => {
      const turma = disc.turma.nome
      // Filtro por nome da turma ou da disciplina
      const matchesSearch = 
        turma.toLowerCase().includes(search.toLowerCase()) || 
        disc.nome.toLowerCase().includes(search.toLowerCase())
      
      if (!matchesSearch) return acc

      if (!acc[turma]) acc[turma] = []
      acc[turma].push(disc)
      return acc
    }, {})
    return grouped
  }, [todasDisciplinas, search])

  const toggleTurma = (turma: string) => {
    setExpandedTurmas(prev => ({ ...prev, [turma]: !prev[turma] }))
  }

  const toggleDisciplina = (id: string) => {
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
            
            <button
              onClick={handleSave} disabled={loading}
              className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-[1.25rem] font-medium text-sm hover:bg-slate-800 shadow-xl shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Salvar Alterações</span>
            </button>
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
          {search && (
            <button 
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-5 flex items-center p-1"
            >
              <X className="w-5 h-5 text-slate-400 hover:text-slate-700" />
            </button>
          )}
        </div>

        {turmaEntries.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-600 font-medium">Nenhuma turma encontrada para "{search}"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {turmaEntries.map(([turma, discs]: [string, any]) => {
              const isExpanded = expandedTurmas[turma] || search.length > 0
              const selecionadasNaTurma = discs.filter((d: any) => selectedIds.includes(d.id)).length
              
              return (
                <div 
                  key={turma} 
                  className={`bg-white rounded-[2rem] border transition-all overflow-hidden ${
                    isExpanded ? 'ring-2 ring-slate-900 border-transparent shadow-xl' : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {/* Cabeçalho da Turma (Acordeão) */}
                  <button
                    onClick={() => toggleTurma(turma)}
                    className="w-full px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                        isExpanded ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        <School className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-800 uppercase tracking-tight text-lg">{turma}</h3>
                        <p className="text-xs font-medium text-slate-400">
                           {selecionadasNaTurma} de {discs.length} disciplinas vinculadas
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
                        {discs.map((disc: any) => {
                          const isSelected = selectedIds.includes(disc.id)
                          return (
                            <label 
                              key={disc.id} 
                              className={`group flex items-center space-x-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-slate-100 border-slate-700 shadow-sm' 
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <span className={`text-sm font-medium flex-grow ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
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
            {selectedIds.length} selecionadas no total
         </span>
      </div>
    </div>
  )
}
