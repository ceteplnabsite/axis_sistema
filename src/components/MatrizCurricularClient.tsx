"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import CursoModal from "./CursoModal"
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  GraduationCap, 
  Layers,
  Search,
  Loader2,
  AlertCircle,
  Save,
  ArrowLeft,
  Filter,
  Users
} from "lucide-react"

interface Curso {
  id: string
  nome: string
  modalidade: string
}

interface Area {
  id: string
  nome: string
}

interface MatrizItem {
  id: string
  nome: string
  cursoId: string
  serie: string
  areaId: string | null
  area?: { nome: string } | null
}

export default function MatrizCurricularClient({ 
  cursos, 
  areas 
}: { 
  cursos: Curso[], 
  areas: Area[] 
}) {
  const router = useRouter()
  const [selectedCurso, setSelectedCurso] = useState("")
  const [selectedModalidade, setSelectedModalidade] = useState("")
  const [selectedSerie, setSelectedSerie] = useState("1")
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear().toString())
  const [items, setItems] = useState<MatrizItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isModalCursoOpen, setIsModalCursoOpen] = useState(false)
  
  const [selectedAreaFiltro, setSelectedAreaFiltro] = useState("")

  // Novo item
  const [novoNome, setNovoNome] = useState("")
  const [novaArea, setNovaArea] = useState("")

  useEffect(() => {
    if (selectedCurso && selectedSerie) {
      loadMatriz()
    }
  }, [selectedCurso, selectedSerie, selectedAno])

  const loadMatriz = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/matriz?cursoId=${selectedCurso}&serie=${selectedSerie}&anoLetivo=${selectedAno}`)
      if (res.ok) {
        const data = await res.json()
        setItems(Array.isArray(data) ? data : [])
      } else {
        setItems([])
      }
    } catch (err) {
      console.error(err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNome || !selectedCurso || !selectedSerie) return

    setSaving(true)
    try {
      const nomes = novoNome
        .split(/[\n,]/)
        .map(n => n.trim())
        .filter(n => n.length > 0)

      if (nomes.length === 0) return

      await Promise.all(nomes.map(nome => 
        fetch('/api/matriz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: nome,
            cursoId: selectedCurso,
            serie: selectedSerie,
            areaId: novaArea || null,
            anoLetivo: selectedAno
          })
        })
      ))

      setNovoNome("")
      setNovaArea("")
      loadMatriz()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta disciplina da matriz padrão?")) return
    try {
      await fetch(`/api/matriz?id=${id}`, { method: 'DELETE' })
      loadMatriz()
    } catch (err) {
      console.error(err)
    }
  }

  const cursosFiltrados = selectedModalidade 
    ? cursos.filter(c => c.modalidade === selectedModalidade)
    : cursos

  const itemsFiltradosNaLista = selectedAreaFiltro
    ? items.filter(i => i.areaId === selectedAreaFiltro)
    : items

  return (
    <div className="min-h-screen bg-[#fcfcfd]">
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center space-x-5">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Matriz Curricular</h1>
                <p className="text-base text-slate-600 font-medium">Definição de disciplinas padrão por curso e série</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 space-y-8">
        
        {/* Filtros Premium */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-wrap gap-6 items-end relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl"></div>
            
            <div className="flex-1 min-w-[150px] space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Modalidade</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 group-focus-within:text-blue-600 group-focus-within:bg-blue-50 transition-all">
                      <Layers size={16} />
                  </div>
                  <select 
                      value={selectedModalidade}
                      onChange={(e) => {
                        setSelectedModalidade(e.target.value)
                        setSelectedCurso("") // reset curso
                      }}
                      className="w-full bg-slate-50 hover:bg-slate-100 border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer font-bold text-slate-700 shadow-inner"
                  >
                      <option value="">Todas...</option>
                      <option value="EPTM">EPTM</option>
                      <option value="PROEJA">PROEJA</option>
                      <option value="SUBSEQUENTE">SUBSEQUENTE</option>
                  </select>
                </div>
            </div>

            <div className="flex-1 min-w-[200px] space-y-2">
                <div className="flex items-center justify-between ml-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Curso</label>
                  <button 
                    onClick={() => setIsModalCursoOpen(true)}
                    className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.1em] hover:text-blue-600 transition-colors flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-lg"
                  >
                    <Plus size={10} strokeWidth={3} />
                    Novo
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 group-focus-within:text-blue-600 group-focus-within:bg-blue-50 transition-all">
                      <GraduationCap size={16} />
                  </div>
                  <select 
                      value={selectedCurso}
                      onChange={(e) => setSelectedCurso(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100 border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer font-bold text-slate-700 shadow-inner"
                  >
                      <option value="">Selecione o Curso...</option>
                      {cursosFiltrados.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
            </div>

            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Série / Ciclo</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 group-focus-within:text-blue-600 group-focus-within:bg-blue-50 transition-all">
                    <Filter size={16} />
                  </div>
                  <select 
                      value={selectedSerie}
                      onChange={(e) => setSelectedSerie(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100 border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer font-bold text-slate-700 shadow-inner"
                  >
                      <option value="1">1ª Série / Semestre</option>
                      <option value="2">2ª Série / Semestre</option>
                      <option value="3">3ª Série / Semestre</option>
                      <option value="4">4º Semestre</option>
                      <option value="5">5º Semestre</option>
                  </select>
                </div>
            </div>

            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Ano Letivo</label>
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 group-focus-within:text-blue-600 group-focus-within:bg-blue-50 transition-all">
                        <Save size={18} />
                    </div>
                    <select 
                        value={selectedAno}
                        onChange={(e) => setSelectedAno(e.target.value)}
                        className="w-full bg-slate-50 hover:bg-slate-100 border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer font-bold text-slate-700 shadow-inner"
                    >
                         {[2024, 2025, 2026, 2027].map(ano => (
                          <option key={ano} value={ano}>{ano}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="pb-2.5">
                <div className="flex items-center gap-2 bg-blue-50 px-4 py-2.5 rounded-2xl border border-blue-100 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">{itemsFiltradosNaLista.length} disciplinas</span>
                </div>
            </div>
        </div>

        {/* Formulário de Lançamento em Lote */}
        {selectedCurso && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
               <Plus size={20} className="text-blue-600" />
               Adicionar Disciplinas à Matriz
            </h2>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">Nomes (Separe por linha ou vírgula)</label>
                <textarea
                  placeholder="Português&#10;Matemática&#10;História"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  rows={1}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-base font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none min-h-[60px] custom-scrollbar"
                />
              </div>
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">Área do Simulado</label>
                <select
                  value={novaArea}
                  onChange={(e) => setNovaArea(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-base font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none h-[60px] appearance-none cursor-pointer"
                >
                  <option value="">Sem Área Vinculada</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div className="md:col-span-3 pt-5.5">
                <button
                  type="submit"
                  disabled={saving || !novoNome}
                  className="w-full bg-slate-900 border border-slate-900 text-white font-semibold h-[60px] rounded-xl shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 text-sm uppercase tracking-widest"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Lançar na Matriz
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Listagem da Matriz */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
               <BookOpen size={20} className="text-slate-400" />
               Componentes Curriculares Definidos
            </h2>
            {selectedCurso && items.length > 0 && (
              <div className="relative min-w-[200px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-400">
                    <Filter size={14} />
                </div>
                <select 
                  value={selectedAreaFiltro}
                  onChange={(e) => setSelectedAreaFiltro(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer outline-none"
                >
                  <option value="">Todas as Áreas...</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            {!selectedCurso ? (
              <div className="p-20 text-center space-y-4">
                <Search className="w-12 h-12 text-slate-200 mx-auto" />
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Selecione um curso para ver a matriz</p>
              </div>
            ) : loading ? (
              <div className="p-20 text-center flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Sincronizando dados...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="p-20 text-center space-y-3">
                 <AlertCircle className="w-10 h-10 text-slate-200 mx-auto" />
                 <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Matriz vazia para esta configuração</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50/30 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Disciplina</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Área Vinculada</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {itemsFiltradosNaLista.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <BookOpen size={16} />
                          </div>
                          <span className="text-base font-semibold text-slate-700 uppercase">{item.nome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.area ? (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold uppercase tracking-wider border border-indigo-100">
                            {item.area.nome}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs font-medium italic">Não vinculada</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
            }
          </div>
        </div>
      </main>

      {/* Curso Modal */}
      <CursoModal 
        isOpen={isModalCursoOpen}
        onClose={() => setIsModalCursoOpen(false)}
        onSuccess={(cursosCriados: any[]) => {
          setIsModalCursoOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
