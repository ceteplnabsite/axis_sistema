"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Loader2, 
  Plus, 
  Users, 
  Award,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

interface Turma {
  id: string
  nome: string
}

interface Area {
  id: string
  nome: string
}

interface User {
  id: string
  name: string | null
  email: string
}

interface Responsavel {
  id: string
  userId: string
  turmaId: string
  areaId: string
  user: { name: string | null, email: string }
  turma: { nome: string }
  area: { nome: string }
}

export default function ResponsaveisClient({
  turmas,
  areas,
  professores
}: {
  turmas: Turma[],
  areas: Area[],
  professores: User[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  
  const [formData, setFormData] = useState({
    userId: "",
    turmaId: "",
    areaId: ""
  })
  
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadResponsaveis()
  }, [])

  const loadResponsaveis = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/simulados/responsaveis')
      const data = await res.json()
      if (res.ok) setResponsaveis(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/simulados/responsaveis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setMessage({ type: 'success', text: "Responsável designado com sucesso!" })
        setFormData({ userId: "", turmaId: "", areaId: "" })
        loadResponsaveis()
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.message || "Erro ao salvar" })
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Erro de conexão" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta responsabilidade?")) return
    
    try {
      const res = await fetch(`/api/simulados/responsaveis?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadResponsaveis()
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/simulados"
            className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-300"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <div>
            <h1 className="text-2xl font-medium text-slate-900 tracking-tight">Responsáveis de Simulado</h1>
            <p className="text-slate-600 text-sm">Designar professores para lançamento de notas por turma</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário lateral */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-300 p-6 space-y-6 sticky top-24">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-lg">
                <Plus className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="font-medium text-slate-800">Nova Designação</h3>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Turma</label>
                <select
                  required
                  value={formData.turmaId}
                  onChange={e => setFormData(p => ({ ...p, turmaId: e.target.value }))}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-500 outline-none"
                >
                  <option value="">Selecione a Turma...</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Área</label>
                <select
                  required
                  value={formData.areaId}
                  onChange={e => setFormData(p => ({ ...p, areaId: e.target.value }))}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-500 outline-none"
                >
                  <option value="">Selecione a Área...</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Professor Responsável</label>
                <select
                  required
                  value={formData.userId}
                  onChange={e => setFormData(p => ({ ...p, userId: e.target.value }))}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-500 outline-none"
                >
                  <option value="">Selecione o Professor...</option>
                  {professores.map(p => <option key={p.id} value={p.id}>{p.name || p.email}</option>)}
                </select>
              </div>

              {message && (
                <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-medium animate-in slide-in-from-top-1 ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{message.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-slate-600 hover:bg-slate-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Designar Professor
              </button>
            </form>
          </div>
        </div>

        {/* Lista de Responsáveis */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-300">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Professor / Área</th>
                    <th className="px-6 py-4 text-[10px] font-medium text-slate-400 uppercase tracking-widest text-center">Turma</th>
                    <th className="px-6 py-4 text-[10px] font-medium text-slate-400 uppercase tracking-widest text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-20 text-center">
                        <Loader2 className="w-8 h-8 text-slate-700 animate-spin mx-auto mb-2" />
                        <span className="text-sm text-slate-600 font-medium tracking-tight">Carregando designações...</span>
                      </td>
                    </tr>
                  ) : responsaveis.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Users className="w-10 h-10 text-slate-200" />
                          <p className="text-slate-400 text-sm font-medium">Nenhum professor designado.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    responsaveis.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shadow-sm">
                              <Award className="w-5 h-5 text-slate-700" />
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-slate-800 tracking-tight">{item.user.name || item.user.email}</h4>
                                <div className="flex items-center gap-1.5">
                                    <BookOpen className="w-3 h-3 text-slate-300" />
                                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{item.area.nome}</span>
                                </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-medium tracking-tighter">
                            {item.turma.nome}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
