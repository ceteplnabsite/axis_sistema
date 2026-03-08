"use client"

import { useState, useEffect } from "react"
import { 
  X, 
  Calendar, 
  BookOpen, 
  Users,
  Layout,
  Target,
  Wrench,
  GraduationCap,
  Download,
  User as UserIcon,
  FileText
} from "lucide-react"

interface Turma {
  id: string
  nome: string
}

interface Plano {
  id: string
  disciplinaNome: string
  periodoInicio: string
  periodoFim: string
  indicadores: string
  conteudos: string
  metodologias: string
  recursos: string
  avaliacao: string
  observacoes?: string
  professor: { name: string }
  turmas: Turma[]
}

interface PlanoViewProps {
  planoId: string
  onClose: () => void
}

export default function PlanoView({ planoId, onClose }: PlanoViewProps) {
  const [plano, setPlano] = useState<Plano | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/planos/${planoId}`)
      .then(res => res.json())
      .then(data => {
        setPlano(data)
        setLoading(false)
      })
  }, [planoId])

  const handleDownload = () => window.open(`/api/planos/${planoId}/pdf`, '_blank')

  if (loading) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Buscando Detalhes...</p>
        </div>
      </div>
    )
  }

  if (!plano) return null

  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR')

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
        
        {/* Header Compact */}
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-white relative shrink-0">
          <div className="absolute top-0 left-0 w-1.5 bg-indigo-600 h-full" />
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                 <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-tight uppercase">{plano.disciplinaNome}</h2>
                <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar size={12} className="text-indigo-400" /> {formatDate(plano.periodoInicio)} - {formatDate(plano.periodoFim)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <UserIcon size={12} className="text-indigo-400" /> PROF. {plano.professor.name.toUpperCase()}
                    </span>
                </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg transition-all text-slate-300 hover:text-slate-600"><X size={20} /></button>
        </div>

        {/* Content Compact */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/20 custom-scrollbar">
          <div className="space-y-3 px-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <Users className="w-3.5 h-3.5" /> Turmas Atendidas
            </h3>
            <div className="flex flex-wrap gap-1.5">
                {plano.turmas.map(t => <span key={t.id} className="px-3 py-1.5 bg-white border border-slate-100 shadow-sm rounded-lg font-bold text-slate-600 text-[10px] uppercase">{t.nome}</span>)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ViewSection icon={<Target size={14} className="text-blue-500" />} title="Indicadores" content={plano.indicadores} />
              <ViewSection icon={<BookOpen size={14} className="text-emerald-500" />} title="Conteúdos" content={plano.conteudos} />
              <ViewSection icon={<Layout size={14} className="text-amber-500" />} title="Metodologia" content={plano.metodologias} />
              <ViewSection icon={<Wrench size={14} className="text-purple-500" />} title="Recursos" content={plano.recursos} />
              <ViewSection full icon={<GraduationCap size={14} className="text-rose-500" />} title="Avaliação" content={plano.avaliacao} />
              {plano.observacoes && <ViewSection full icon={<FileText size={14} className="text-slate-400" />} title="Observações" content={plano.observacoes} />}
          </div>
        </div>

        {/* Footer Compact */}
        <div className="p-4 border-t border-slate-50 bg-white flex items-center justify-end gap-3 shrink-0">
            <button onClick={onClose} className="px-6 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-50 transition-all">Fechar</button>
            <button onClick={handleDownload} className="px-8 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95">
                <Download size={14} /> Exportar (PDF)
            </button>
        </div>
      </div>
    </div>
  )
}

function ViewSection({ icon, title, content, full = false }: any) {
    return (
        <div className={`space-y-2 ${full ? 'md:col-span-2' : ''}`}>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                {icon} {title}
            </label>
            <div className="w-full p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                {content}
            </div>
        </div>
    )
}
