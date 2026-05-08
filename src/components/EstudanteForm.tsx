"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Loader2, CheckCheck, X } from "lucide-react"

interface Turma {
  id: string
  nome: string
}

interface EstudanteFormProps {
  estudante?: {
    nome: string
    turmaId: string
    matricula: string
  }
  isEdit?: boolean
}

export default function EstudanteForm({ estudante, isEdit = false }: EstudanteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resultMsg, setResultMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [formData, setFormData] = useState({
    nome: estudante?.nome || "",
    turmaId: estudante?.turmaId || "",
    matricula: estudante?.matricula || ""
  })

  useEffect(() => {
    // Carregar turmas
    fetch('/api/turmas')
      .then(res => res.json())
      .then(data => setTurmas(data))
      .catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResultMsg(null)

    try {
      const url = isEdit ? `/api/estudantes/${estudante?.matricula}` : '/api/estudantes'
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setResultMsg({ 
          text: isEdit ? 'Estudante atualizado com sucesso!' : 'Estudante cadastrado com sucesso!', 
          ok: true 
        })
        
        // Aguarda 1.5s para o usuário ver a mensagem antes de redirecionar
        setTimeout(() => {
          router.push('/dashboard/estudantes')
          router.refresh()
        }, 1500)
      } else {
        setError(data.message || 'Erro ao salvar estudante')
        setResultMsg({ text: data.message || 'Erro ao salvar estudante', ok: false })
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
      setResultMsg({ text: 'Erro de conexão com o servidor', ok: false })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este estudante?')) return

    setLoading(true)
    setError("")
    setResultMsg(null)

    try {
      const response = await fetch(`/api/estudantes/${estudante?.matricula}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        setResultMsg({ text: 'Estudante excluído com sucesso!', ok: true })
        
        setTimeout(() => {
          router.push('/dashboard/estudantes')
          router.refresh()
        }, 1500)
      } else {
        setError(data.message || 'Erro ao excluir estudante')
        setResultMsg({ text: data.message || 'Erro ao excluir estudante', ok: false })
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
      setResultMsg({ text: 'Erro de conexão com o servidor', ok: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/estudantes"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {isEdit ? 'Editar Estudante' : 'Novo Estudante'}
              </h1>
              <p className="text-sm text-gray-600">
                {isEdit ? 'Atualize as informações do estudante' : 'Cadastre um novo estudante'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                id="nome"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ex: João Silva Santos"
              />
            </div>

            <div>
              <label htmlFor="matricula" className="block text-sm font-medium text-gray-700 mb-2">
                Número de Matrícula *
              </label>
              <input
                type="text"
                id="matricula"
                required
                value={formData.matricula}
                onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ex: 2024001234"
              />
              <p className="mt-1 text-xs text-slate-500">
                A matrícula é o identificador único do aluno e será usada para o acesso ao portal.
              </p>
            </div>

            <div>
              <label htmlFor="turmaId" className="block text-sm font-medium text-gray-700 mb-2">
                Turma *
              </label>
              <select
                id="turmaId"
                required
                value={formData.turmaId}
                onChange={(e) => setFormData({ ...formData, turmaId: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Selecione uma turma...</option>
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <div>
              {isEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-6 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  Excluir Estudante
                </button>
              )}
            </div>
            <div className="flex space-x-4">
              <Link
                href="/dashboard/estudantes"
                className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>{isEdit ? 'Atualizar' : 'Criar'} Estudante</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Toast Notification */}
      {resultMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className={`flex items-center gap-3 text-white px-5 py-3.5 rounded-2xl shadow-2xl max-w-sm border ${
            resultMsg.ok
              ? 'bg-emerald-600 border-emerald-500/50 shadow-emerald-900/30'
              : 'bg-rose-600 border-rose-500/50 shadow-rose-900/30'
          }`}>
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              {resultMsg.ok ? <CheckCheck size={16} /> : <X size={16} />}
            </div>
            <p className="text-sm font-semibold leading-tight flex-1">{resultMsg.text}</p>
            <button
              onClick={() => setResultMsg(null)}
              className="shrink-0 text-white/60 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
