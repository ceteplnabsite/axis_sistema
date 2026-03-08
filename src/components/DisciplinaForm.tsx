"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Loader2, CheckSquare, Square, Sun, Sunset, Moon } from "lucide-react"
import ErrorModal from "./ErrorModal"
import ConfirmModal from "./ConfirmModal"

interface Turma {
  id: string
  nome: string
  curso?: string | null
  turno?: string | null
}

interface Area {
  id: string
  nome: string
}

interface DisciplinaFormProps {
  disciplina?: {
    id: string
    nome: string
    turmaId: string
    areaId?: string | null
  }
  isEdit?: boolean
}

export default function DisciplinaForm({ disciplina, isEdit = false }: DisciplinaFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState("")
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [formData, setFormData] = useState({
    nome: disciplina?.nome || "",
    turmaId: disciplina?.turmaId || "",
    areaId: disciplina?.areaId || ""
  })
  
  const [bulkMode, setBulkMode] = useState(false)
  const [nomesBulk, setNomesBulk] = useState("")
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>(
    isEdit && disciplina?.turmaId ? [disciplina.turmaId] : []
  )

  useEffect(() => {
    // Carregar turmas
    fetch('/api/turmas')
      .then(res => res.json())
      .then(data => setTurmas(data))
      .catch(console.error)

    // Carregar áreas
    fetch('/api/areas')
      .then(res => res.json())
      .then(data => setAreas(data))
      .catch(console.error)
  }, [])

  const groupedTurmas = turmas.reduce((acc, turma) => {
      const turno = turma.turno || 'Outros'
      const curso = turma.curso || 'Geral'
      
      if (!acc[turno]) acc[turno] = {}
      if (!acc[turno][curso]) acc[turno][curso] = []
      
      acc[turno][curso].push(turma)
      return acc
  }, {} as Record<string, Record<string, Turma[]>>)

  const sortedTurnos = Object.keys(groupedTurmas).sort((a, b) => {
      const order = ['Matutino', 'Vespertino', 'Noturno', 'Integral', 'Outros']
      return order.indexOf(a) - order.indexOf(b)
  })

  const toggleAllTurmas = () => {
    if (selectedTurmas.length === turmas.length) {
      setSelectedTurmas([])
    } else {
      setSelectedTurmas(turmas.map(t => t.id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!isEdit && selectedTurmas.length === 0) {
      setError("Selecione pelo menos uma turma")
      setLoading(false)
      return
    }

    try {
      const url = isEdit ? `/api/disciplinas/${disciplina?.id}` : '/api/disciplinas'
      const method = isEdit ? 'PUT' : 'POST'

      let body: any = {}

      if (isEdit) {
        // Na edição, mantemos o comportamento padrão de editar um único registro
        body = formData
      } else {
        // Na criação, usamos a lógica de multi-seleção
        body = {
            nome: formData.nome,
            nomes: bulkMode ? nomesBulk.split('\n') : undefined,
            turmaIds: selectedTurmas,
            areaId: formData.areaId || undefined
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        router.push('/dashboard/disciplinas')
        router.refresh()
      } else {
        const data = await response.json()
        const errorMsg = data.message || 'Erro ao salvar disciplina'
        setError(errorMsg)
        setIsErrorModalOpen(true)
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
      setIsErrorModalOpen(true)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!disciplina?.id) {
      setError("ID da disciplina não encontrado")
      setIsErrorModalOpen(true)
      return
    }

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/disciplinas/${disciplina.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setIsConfirmModalOpen(false)
        router.push('/dashboard/disciplinas')
        router.refresh()
      } else {
        const data = await response.json()
        setError(data.message || 'Erro ao excluir disciplina')
        setIsErrorModalOpen(true)
        setIsConfirmModalOpen(false)
      }
    } catch (err) {
      console.error('Erro ao excluir:', err)
      setError('Erro ao conectar com o servidor')
      setIsErrorModalOpen(true)
      setIsConfirmModalOpen(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorModal 
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        message={error}
      />
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Disciplina"
        message={`Tem certeza que deseja excluir a disciplina "${disciplina?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Não, Cancelar"
        loading={deleteLoading}
      />
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/disciplinas"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {isEdit ? 'Editar Disciplina' : 'Nova Disciplina'}
              </h1>
              <p className="text-sm text-gray-600">
                {isEdit ? 'Atualize as informações da disciplina' : 'Cadastre uma nova disciplina em uma ou mais turmas'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-8">
            {/* Seção 1: Dados da Disciplina */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm mr-3">1</span>
                Informações da Disciplina
              </h3>
              
              <div className="pl-11">
                {!isEdit && (
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="bulkMode"
                      checked={bulkMode}
                      onChange={(e) => setBulkMode(e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="bulkMode" className="ml-2 block text-sm text-gray-900 cursor-pointer select-none">
                      Cadastrar múltiplas disciplinas (em lote)
                    </label>
                  </div>
                )}

                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                  {bulkMode ? 'Nomes das Disciplinas (uma por linha)' : 'Nome da Disciplina *'}
                </label>
                
                {bulkMode ? (
                  <textarea
                    id="nomes"
                    rows={5}
                    value={nomesBulk}
                    onChange={(e) => setNomesBulk(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Matemática&#10;Português&#10;História"
                    required
                  />
                ) : (
                  <input
                    type="text"
                    id="nome"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Ex: Programação Web"
                  />
                )}
                {bulkMode && (
                  <p className="mt-1 text-sm text-gray-500">
                    Digite o nome de cada disciplina em uma nova linha. Todas as disciplinas listadas serão criadas para as turmas selecionadas.
                  </p>
                )}

                <div className="mt-6">
                  <label htmlFor="areaId" className="block text-sm font-medium text-gray-700 mb-2">
                    Área do Conhecimento (Simulado)
                  </label>
                  <select
                    id="areaId"
                    value={formData.areaId}
                    onChange={(e) => setFormData({ ...formData, areaId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    <option value="">Nenhuma área selecionada</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.nome}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Opcional. Vincule a uma área para que as notas de simulado desta área apareçam para o professor.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6"></div>

            {/* Seção 2: Seleção de Turmas */}
            <div>
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm mr-3">2</span>
                    {isEdit ? 'Turma' : 'Turmas de Destino'}
                  </h3>
                  
                  {!isEdit && turmas.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAllTurmas}
                      className="text-sm font-medium text-purple-600 hover:text-purple-800 flex items-center transition-colors"
                    >
                      {selectedTurmas.length === turmas.length ? (
                        <><CheckSquare className="w-4 h-4 mr-1" /> Desmarcar Todas</>
                      ) : (
                        <><Square className="w-4 h-4 mr-1" /> Selecionar Todas</>
                      )}
                    </button>
                  )}
               </div>

               <div className="pl-11">
                 {isEdit ? (
                    <select
                      id="turmaId"
                      required
                      value={formData.turmaId}
                      onChange={(e) => setFormData({ ...formData, turmaId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Selecione uma turma...</option>
                      {turmas.map((turma) => (
                        <option key={turma.id} value={turma.id}>
                          {turma.nome}
                        </option>
                      ))}
                    </select>
                 ) : (
                   <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-6">
                     {sortedTurnos.map(turno => (
                        <div key={turno}>
                           <h4 className="flex items-center text-sm font-semibold text-gray-800 uppercase tracking-wider mb-3 pb-1 border-b border-gray-100">
                                {turno === 'Matutino' && <Sun className="w-4 h-4 mr-2 text-orange-500"/>}
                                {turno === 'Vespertino' && <Sunset className="w-4 h-4 mr-2 text-orange-600"/>}
                                {turno === 'Noturno' && <Moon className="w-4 h-4 mr-2 text-blue-600"/>}
                                {turno}
                           </h4>
                           <div className="space-y-4 pl-2">
                               {Object.keys(groupedTurmas[turno]).sort().map(curso => (
                                   <div key={curso}>
                                      {curso !== 'Geral' && (
                                          <h5 className="text-xs font-semibold text-gray-500 mb-2 uppercase">{curso}</h5>
                                      )}
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                          {groupedTurmas[turno][curso].map(t => {
                                              const isSelected = selectedTurmas.includes(t.id)
                                              return (
                                                <label 
                                                  key={t.id} 
                                                  className={`flex items-center p-2 rounded border cursor-pointer transition-all duration-200 group ${
                                                    isSelected 
                                                      ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-300' 
                                                      : 'hover:bg-gray-50 border-gray-200'
                                                  }`}
                                                >
                                                  <div className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center mr-2 transition-colors ${
                                                    isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300 bg-white'
                                                  }`}>
                                                    {isSelected && <CheckSquare className="w-3 h-3 text-white" />}
                                                    <input
                                                      type="checkbox"
                                                      className="hidden"
                                                      checked={isSelected}
                                                      onChange={(e) => {
                                                         if (e.target.checked) setSelectedTurmas([...selectedTurmas, t.id])
                                                         else setSelectedTurmas(selectedTurmas.filter(id => id !== t.id))
                                                      }}
                                                    />
                                                  </div>
                                                  <span className={`text-xs font-medium ${isSelected ? 'text-purple-900' : 'text-gray-700'}`}>
                                                    {t.nome}
                                                  </span>
                                                </label>
                                              )
                                          })}
                                      </div>
                                   </div>
                               ))}
                           </div>
                        </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-100">
            <div>
              {isEdit && (
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={loading || deleteLoading}
                  className="px-6 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  Excluir
                </button>
              )}
            </div>
            <div className="flex space-x-4">
              <Link
                href="/dashboard/disciplinas"
                className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading || (!isEdit && selectedTurmas.length === 0)}
                className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg disabled:opacity-50 font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>{isEdit ? 'Atualizar Disciplina' : 'Cadastrar Disciplinas'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
