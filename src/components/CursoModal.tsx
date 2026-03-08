"use client"

import { useState } from "react"
import { X, Save, Loader2, GraduationCap, Hash } from "lucide-react"

interface CursoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (cursos: any[]) => void
}

const MODALIDADES = ["EPTM", "PROEJA", "SUBSEQUENTE"]

export default function CursoModal({ isOpen, onClose, onSuccess }: CursoModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    nome: "",
    sigla: "",
    modalidades: ["EPTM"] as string[],
    turnos: [] as string[]
  })

  if (!isOpen) return null

  const handleToggleTurno = (turno: string) => {
    setFormData(prev => ({
      ...prev,
      turnos: prev.turnos.includes(turno)
        ? prev.turnos.filter(t => t !== turno)
        : [...prev.turnos, turno]
    }))
  }

  const handleToggleModalidade = (modalidade: string) => {
    setFormData(prev => ({
      ...prev,
      modalidades: prev.modalidades.includes(modalidade)
        ? prev.modalidades.filter(m => m !== modalidade)
        : [...prev.modalidades, modalidade]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.turnos.length === 0) {
      setError("Selecione pelo menos um turno")
      return
    }
    if (formData.modalidades.length === 0) {
      setError("Selecione pelo menos uma modalidade")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/cursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formData.nome,
          sigla: formData.sigla,
          modalidades: formData.modalidades,
          turnos: formData.turnos,
        })
      })

      if (response.ok) {
        const data = await response.json()
        onSuccess(Array.isArray(data) ? data : [data])
        onClose()
      } else {
        const data = await response.json()
        setError(data.message || 'Erro ao criar curso')
      }
    } catch {
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  const labelModalidade: Record<string, string> = {
    EPTM: "EPTM",
    PROEJA: "PROEJA",
    SUBSEQUENTE: "Subsequente",
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500 rounded-xl">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Novo Curso</h2>
              <p className="text-xs text-slate-400 font-medium">Cadastre em uma ou mais modalidades</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold animate-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Nome */}
            <div className="group">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome do Curso</label>
              <input
                required type="text" placeholder="Ex: Técnico em Meio Ambiente"
                value={formData.nome}
                onChange={e => {
                  const nome = e.target.value
                  const words = nome.split(' ').filter(w => !['de', 'da', 'do', 'e', 'o', 'a', 'em', 'dos', 'das'].includes(w.toLowerCase()))
                  let autoSigla = ""
                  if (words.length >= 2) {
                    autoSigla = ((words[0]?.[0] || "") + (words[1]?.[0] || "")).toUpperCase()
                  } else if (words.length === 1) {
                    autoSigla = (words[0]?.[0] || "").toUpperCase()
                  }
                  setFormData({ ...formData, nome, sigla: autoSigla })
                }}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-500 transition-all"
              />
            </div>

            {/* Sigla */}
            <div className="group">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sigla (Nomenclatura)</label>
              <div className="relative">
                <input
                  required type="text" placeholder="Ex: MA" maxLength={6}
                  value={formData.sigla}
                  onChange={e => setFormData({ ...formData, sigla: e.target.value.toUpperCase() })}
                  className="w-full pl-10 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-500 transition-all"
                />
                <Hash className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
              {formData.modalidades.length > 1 && (
                <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
                  💡 A sigla será combinada com cada modalidade automaticamente (ex: {formData.sigla || "MA"}_EPTM)
                </p>
              )}
            </div>

            {/* Modalidades — multi-seleção */}
            <div className="space-y-2">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Modalidades
                <span className="ml-2 text-blue-500 normal-case font-bold">
                  {formData.modalidades.length > 1 ? `(${formData.modalidades.length} selecionadas — será criado um registro para cada)` : ""}
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {MODALIDADES.map(m => (
                  <button
                    key={m} type="button"
                    onClick={() => handleToggleModalidade(m)}
                    className={`px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all border ${
                      formData.modalidades.includes(m)
                        ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                    }`}
                  >
                    {labelModalidade[m]}
                  </button>
                ))}
              </div>

              {/* Preview dos cursos que serão criados */}
              {formData.modalidades.length > 1 && formData.nome && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1.5">Serão criados:</p>
                  {formData.modalidades.map(m => (
                    <div key={m} className="flex items-center gap-2 text-xs text-blue-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      <span className="font-semibold">{formData.nome}</span>
                      <span className="text-blue-400">–</span>
                      <span className="font-bold text-[10px] bg-blue-100 px-1.5 py-0.5 rounded">{m}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Turnos */}
            <div className="space-y-2">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 ml-1">Turnos Disponíveis</label>
              <div className="flex flex-wrap gap-2">
                {["Matutino", "Vespertino", "Noturno"].map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => handleToggleTurno(t)}
                    className={`px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all border ${
                      formData.turnos.includes(t)
                        ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex space-x-3">
            <button
              type="submit" disabled={loading}
              className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-semibold text-sm flex items-center justify-center space-x-2 hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>
                {formData.modalidades.length > 1
                  ? `Cadastrar em ${formData.modalidades.length} Modalidades`
                  : "Cadastrar Curso"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
