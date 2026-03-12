"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  FileText, 
  User, 
  Users, 
  Trash2, 
  Edit3, 
  Printer, 
  Download,
  ChevronRight,
  Info,
  Clock,
  ArrowLeft,
  FileWarning,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import OcorrenciaForm from "@/components/OcorrenciaForm"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Ocorrencia {
  id: string
  titulo: string
  descricao: string
  tipo: string
  data: string
  registradoPorId: string
  autor: { name: string | null }
  estudantes: {
    matricula: string
    nome: string
    turma: { nome: string }
  }[]
  createdAt: string
}

export default function OcorrenciasClient() {
  const { data: session } = useSession()
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<Ocorrencia | null>(null)
  
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    studentName: "",
    type: ""
  })

  const fetchOcorrencias = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams(filters).toString()
      const res = await fetch(`/api/ocorrencias?${query}`)
      const data = await res.json()
      setOcorrencias(data)
    } catch (error) {
      console.error("Erro ao carregar ocorrências:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOcorrencias()
  }, [filters])

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return
    
    try {
      const res = await fetch(`/api/ocorrencias/${id}`, { method: 'DELETE' })
      if (res.ok) fetchOcorrencias()
    } catch (error) {
      console.error("Erro ao excluir:", error)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'comportamental': return 'bg-rose-50 text-rose-600 border-rose-100'
      case 'pedagógica': return 'bg-blue-50 text-blue-600 border-blue-100'
      case 'médica': return 'bg-emerald-50 text-emerald-600 border-emerald-100'
      case 'elogio': return 'bg-amber-50 text-amber-600 border-amber-100'
      default: return 'bg-slate-50 text-slate-600 border-slate-100'
    }
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'comportamental': return <AlertTriangle className="w-4 h-4" />
      case 'médica': return <Clock className="w-4 h-4" />
      case 'elogio': return <CheckCircle2 className="w-4 h-4" />
      default: return <Info className="w-4 h-4" />
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      {/* Header Premium */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-6">
              <Link
                href="/dashboard"
                className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200 shadow-sm"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Livro de Ocorrências</h1>
                <p className="text-slate-500 font-medium">Registro histórico e acompanhamento escolar</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-semibold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              >
                <Printer size={18} />
                <span className="hidden sm:inline">Imprimir Tudo</span>
              </button>
              <button 
                onClick={() => { setShowForm(true); setSelectedOcorrencia(null); }}
                className="flex items-center gap-2 bg-slate-900 text-white px-7 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
              >
                <Plus size={20} />
                <span>Novo Registro</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Seção de Filtros */}
      <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Estudante</label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nome..."
                value={filters.studentName}
                onChange={e => setFilters({...filters, studentName: e.target.value})}
                className="w-full bg-slate-50 border-transparent rounded-2xl pl-12 pr-6 py-4 text-sm focus:ring-4 focus:ring-slate-900/5 focus:bg-white focus:border-slate-200 transition-all font-medium placeholder:text-slate-300 shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Período Inicial</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={18} />
              <input 
                type="date"
                value={filters.startDate}
                onChange={e => setFilters({...filters, startDate: e.target.value})}
                className="w-full bg-slate-50 border-transparent rounded-2xl pl-12 pr-6 py-4 text-sm focus:ring-4 focus:ring-slate-900/5 focus:bg-white focus:border-slate-200 transition-all font-medium shadow-inner cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Período Final</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={18} />
              <input 
                type="date"
                value={filters.endDate}
                onChange={e => setFilters({...filters, endDate: e.target.value})}
                className="w-full bg-slate-50 border-transparent rounded-2xl pl-12 pr-6 py-4 text-sm focus:ring-4 focus:ring-slate-900/5 focus:bg-white focus:border-slate-200 transition-all font-medium shadow-inner cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo de Ocorrência</label>
            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={18} />
              <select 
                value={filters.type}
                onChange={e => setFilters({...filters, type: e.target.value})}
                className="w-full bg-slate-50 border-transparent rounded-2xl pl-12 pr-10 py-4 text-sm focus:ring-4 focus:ring-slate-900/5 focus:bg-white focus:border-slate-200 transition-all font-medium shadow-inner cursor-pointer appearance-none"
              >
                <option value="">Todos os tipos</option>
                <option value="Comportamental">Comportamental</option>
                <option value="Pedagógica">Pedagógica</option>
                <option value="Médica">Médica</option>
                <option value="Elogio">Elogio</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Lista de Registros */}
      <section className="space-y-6 print:space-y-8">
        {loading ? (
          <div className="py-32 text-center">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 font-bold uppercase tracking-widest animate-pulse">Consultando Registros...</p>
          </div>
        ) : ocorrencias.length === 0 ? (
          <div className="py-32 text-center bg-white border border-dashed border-slate-200 rounded-[3rem]">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
              <FileWarning size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhum registro localizado</h3>
            <p className="text-slate-400 max-w-xs mx-auto">Tente ajustar seus filtros ou verifique se há registros cadastrados no período.</p>
          </div>
        ) : (
          ocorrencias.map((item) => (
            <div 
              key={item.id} 
              className="group bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 shadow-lg shadow-slate-200/30 hover:shadow-2xl hover:shadow-slate-300/40 transition-all duration-500 relative overflow-hidden print:shadow-none print:border-slate-200 print:mb-8"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-1000 print:hidden"></div>
              
              <div className="relative z-10 space-y-8">
                {/* Header do Registro */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-2 ${getTipoColor(item.tipo)}`}>
                        {getTipoIcon(item.tipo)}
                        {item.tipo}
                      </span>
                      <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/20">
                        {format(new Date(item.data), "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight group-hover:text-blue-900 transition-colors">
                      {item.titulo}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 print:hidden">
                    <button 
                      onClick={() => { setSelectedOcorrencia(item); setShowForm(true); }}
                      className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all border border-transparent hover:border-slate-200"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 group-hover:bg-white group-hover:shadow-inner transition-all duration-500 print:bg-white print:border-slate-200">
                  <p className="text-slate-700 text-lg leading-relaxed font-medium whitespace-pre-wrap">
                    {item.descricao}
                  </p>
                </div>

                {/* Rodapé - Estudantes e Autor */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-4">
                  <div className="flex flex-wrap gap-4">
                    {item.estudantes.map(est => (
                      <div key={est.matricula} className="flex items-center gap-3 bg-white border border-slate-200 pl-2 pr-5 py-2 rounded-2xl shadow-sm hover:border-slate-900 transition-colors cursor-default">
                        <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-xs ring-4 ring-slate-50">
                          {est.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-none mb-1">{est.nome}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Turma: {est.turma.nome}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 border-l border-slate-100 pl-8 md:pl-10 print:border-slate-200">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-2">Registrado por</p>
                      <p className="font-bold text-slate-900 text-sm whitespace-nowrap">{item.autor.name || "Sistema"}</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200">
                      <User size={20} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Footer Info */}
      <section className="py-12 border-t border-slate-200 print:hidden">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-200">
            <Printer size={24} />
          </div>
          <h4 className="text-slate-900 font-bold uppercase tracking-[0.1em]">Configuração de Impressão</h4>
          <p className="text-slate-400 text-sm max-w-sm">Use os filtros acima para definir o conteúdo do relatório mensal desejado antes de imprimir.</p>
        </div>
      </section>

      {/* Modais */}
      {showForm && (
        <OcorrenciaForm
          ocorrencia={selectedOcorrencia} 
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchOcorrencias(); }}
        />
      )}

      {/* Estilos para impressão */}
      <style jsx global>{`
        @media print {
          body { background: white !important; padding: 0 !important; }
          .print\\:hidden { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
          header { display: none !important; }
          .grid { display: none !important; }
          section { border: none !important; box-shadow: none !important; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  )
}
