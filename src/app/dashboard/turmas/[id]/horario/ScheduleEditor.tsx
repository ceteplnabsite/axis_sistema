
"use client"

import { useState } from "react"
import { ArrowLeft, Save, Loader2, Calendar, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { saveSchedule } from "../../schedule-actions"

// Days of week 1=Seg to 5=Sex
const DAYS = [
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
]

// Assuming 6 periods based on image
const PERIODS = [1, 2, 3, 4, 5, 6]

type ScheduleEntry = {
  disciplina: string
  professor: string
}

export default function ScheduleEditor({ turma, initialSchedule }: { turma: any, initialSchedule: any[] }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [schedule, setSchedule] = useState<Record<string, ScheduleEntry>>(() => {
    const map: Record<string, ScheduleEntry> = {}
    initialSchedule.forEach((sc: any) => {
      map[`${sc.diaSemana}-${sc.horario}`] = {
        disciplina: sc.disciplina,
        professor: sc.professor || ""
      }
    })
    return map
  })

  const handleChange = (dia: number, horario: number, field: "disciplina" | "professor", value: string) => {
    const key = `${dia}-${horario}`
    
    let newProfessor = undefined
    if (field === "disciplina") {
        // Busca insensível a maiúsculas/minúsculas e espaços
        const normalizedValue = value.trim().toLowerCase()
        const selectedDisc = turma.disciplinas?.find((d: any) => 
            d.nome.trim().toLowerCase() === normalizedValue
        )
        
        if (selectedDisc && selectedDisc.usuariosPermitidos?.length > 0) {
            newProfessor = selectedDisc.usuariosPermitidos[0].name || selectedDisc.usuariosPermitidos[0].username
        } else {
            newProfessor = ""
        }
    }

    setSchedule(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
        ...(newProfessor !== undefined ? { professor: newProfessor } : {})
      }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Convert map to array for server action
      const items = []
      for (const key in schedule) {
        const entry = schedule[key]
        if (entry.disciplina.trim()) {
           const [d, h] = key.split('-').map(Number)
           items.push({
             diaSemana: d,
             horario: h,
             disciplina: entry.disciplina,
             professor: entry.professor
           })
        }
      }

      await saveSchedule(turma.id, items)
      router.refresh()
      alert("Horário salvo com sucesso!")
    } catch (error) {
      console.error(error)
      alert("Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-300 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/turmas"
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-slate-800 tracking-tight flex items-center gap-2">
                   <Calendar className="w-6 h-6 text-slate-700" />
                   Horário: {turma.nome}
                </h1>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                   {turma.curso} • {turma.anoLetivo}
                </p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="text-xs font-medium uppercase tracking-wide">Salvar Alterações</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Instruções do Sistema */}
        <div className="bg-slate-100 border border-slate-200 rounded-[2rem] p-6 flex items-start gap-4">
          <div className="w-10 h-10 bg-slate-200 rounded-2xl flex items-center justify-center shrink-0">
             <Info className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900 uppercase tracking-tight mb-1">Como preencher</h4>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              Basta selecionar a <span className="font-medium">disciplina</span> desejada em cada célula do quadro. 
              O nome do <span className="font-medium">professor responsável</span> será identificado e preenchido automaticamente pelo sistema 
              com base nas disciplinas cadastradas para esta turma.
            </p>
            <p className="text-[10px] text-slate-600 font-medium mt-2 italic">
              Caso alguma disciplina não apareça na lista, entre em contato com o <span className="underline">Suporte Técnico</span> através da aba de Mensagens.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-300 overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full min-w-[1000px]">
               <thead>
                 <tr className="bg-slate-50 border-b border-slate-300">
                   <th className="p-4 text-center w-20">
                     <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Horário</span>
                   </th>
                   {DAYS.map(day => (
                     <th key={day.id} className="p-4 w-[18%]">
                       <span className="text-sm font-medium text-slate-800 uppercase tracking-tight block text-center bg-slate-100/50 py-2 rounded-xl border border-slate-200/50 text-slate-800">
                         {day.label}
                       </span>
                     </th>
                   ))}
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-200">
                 {PERIODS.map(period => (
                   <tr key={period} className="hover:bg-slate-50/30 transition-colors group">
                     <td className="p-4 text-center border-r border-slate-200 bg-slate-50/30 font-medium text-slate-400">
                       {period}º
                     </td>
                     {DAYS.map(day => {
                       const key = `${day.id}-${period}`
                       const entry = schedule[key] || { disciplina: "", professor: "" }
                       
                       return (
                          <td key={day.id} className="p-2 border-r border-slate-200 last:border-0 h-20 relative group-hover/cell:bg-slate-50 transition-colors">
                             <div className="h-full flex flex-col items-center justify-center text-center">
                                <select 
                                  value={entry.disciplina}
                                  onChange={e => handleChange(day.id, period, 'disciplina', e.target.value)}
                                  className="w-full text-[10px] font-medium text-slate-800 bg-transparent outline-none text-center transition-all appearance-none cursor-pointer"
                                >
                                  <option value="" className="text-slate-300">--------</option>
                                  {turma.disciplinas?.map((d: any) => (
                                     <option key={d.id} value={d.nome}>{d.nome}</option>
                                  ))}
                                </select>
                                {entry.professor && (
                                  <span className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter mt-0.5 truncate w-full px-1">
                                    {entry.professor}
                                  </span>
                                )}
                             </div>
                          </td>
                       )
                     })}
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      </main>
    </div>
  )
}
