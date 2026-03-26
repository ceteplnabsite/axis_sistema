"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, Save, Loader2, Shield, User, Mail, 
  AlertCircle, Key, Calendar, CheckCircle2, ChevronRight,
  ShieldCheck, UserCircle, Settings2, Fingerprint, Accessibility
} from "lucide-react"

interface UsuarioFormProps {
  usuario?: {
    id: string
    name: string | null
    email: string
    username: string
    isSuperuser: boolean
    isDirecao: boolean
    isStaff: boolean
    isAEE?: boolean
    lastLogin?: string | null
  }
  isEdit?: boolean
}

export default function UsuarioForm({ usuario, isEdit = false }: UsuarioFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const [formData, setFormData] = useState({
    name: usuario?.name || "",
    email: usuario?.email || "",
    password: "",
    isSuperuser: usuario?.isSuperuser || false,
    isDirecao: usuario?.isDirecao || false,
    isStaff: usuario?.isStaff || !isEdit,
    isAEE: (usuario as any)?.isAEE || false,
  })

  const formatLastLogin = (date: string | null | undefined) => {
    if (!date) return "Nunca"
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(new Date(date))
  }

  const [showConfirm, setShowConfirm] = useState(false)
  
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const url = isEdit ? `/api/usuarios/${usuario?.id}` : '/api/usuarios'
      const payload = { ...formData }
      if (isEdit && !payload.password) {
        delete (payload as any).password
      }

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        router.push('/dashboard/usuarios')
        router.refresh()
      } else {
        const data = await response.json()
        setError(`${data.message || 'Erro ao processar'}${data.detail ? ': ' + data.detail : ''}`)
        setShowConfirm(false)
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
      setShowConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  const roles = [
    { 
      id: 'isStaff', 
      label: 'Professor', 
      desc: 'Lançamento de notas das disciplinas permitidas',
      icon: <UserCircle className="w-5 h-5" />,
      color: 'blue' 
    },
    { 
      id: 'isDirecao', 
      label: 'Gestão Escolar', 
      desc: 'Acesso total a relatórios e visualização de turmas',
      icon: <ShieldCheck className="w-5 h-5" />,
      color: 'purple' 
    },
    { 
      id: 'isSuperuser', 
      label: 'Administrador (T.I)', 
      desc: 'Controle completo, logs e gestão de usuários',
      icon: <Fingerprint className="w-5 h-5" />,
      color: 'slate' 
    },
    { 
      id: 'isAEE', 
      label: 'Especialista AEE', 
      desc: 'Acesso exclusivo para gestão de alunos com necessidades especiais',
      icon: <Accessibility className="w-5 h-5" />,
      color: 'teal' 
    }
  ]

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-20">
      {/* Navbar Minimalista */}
      <nav className="bg-white/70 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/dashboard/usuarios" 
              className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition-colors font-semibold text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </Link>
            
            <div className="flex items-center space-x-2">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
               <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Sistema de Resultados
               </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 mt-12">
        {/* Título Centralizado */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold text-slate-800 tracking-tight mb-2">
            {isEdit ? 'Editar Acesso' : 'Novo Colaborador'}
          </h1>
          <p className="text-slate-500 font-medium">
            {isEdit ? 'Atualize as credenciais e permissões do usuário' : 'Crie uma nova conta com envio automático de senha'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl text-rose-800 flex items-center shadow-sm">
              <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
              <span className="text-sm font-semibold">{error}</span>
            </div>
          )}

          {/* Seção 1: Dados do Usuário */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
            <div className="flex items-center space-x-4 mb-8">
               <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                  <User className="w-5 h-5" />
               </div>
               <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Informações Básicas</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Nome Completo
                </label>
                <input 
                  type="text" required value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all outline-none font-semibold text-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    E-mail do Usuário
                  </label>
                  <input 
                    type="email" required value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all outline-none font-semibold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    {isEdit ? 'Alterar Senha' : 'Senha Inicial'}
                  </label>
                  <input 
                    type="password" required={!isEdit}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder={isEdit ? "Deixe em branco..." : "••••••••"}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all outline-none font-semibold text-slate-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Níveis de Acesso */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
            <div className="flex items-center space-x-4 mb-8">
               <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                  <Settings2 className="w-5 h-5" />
               </div>
               <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Nível de Permissão</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {roles.map((role) => {
                const isActive = (formData as any)[role.id]
                return (
                  <label 
                    key={role.id} 
                    className={`flex items-center p-6 rounded-3xl border-2 transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl translate-y-[-2px]' 
                        : 'bg-white border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-5 ${
                      isActive ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {role.icon}
                    </div>
                    <div className="flex-grow">
                       <p className={`font-semibold uppercase tracking-tight text-sm ${isActive ? 'text-white' : 'text-slate-800'}`}>
                          {role.label}
                       </p>
                       <p className={`text-xs ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                          {role.desc}
                       </p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isActive ? 'border-blue-500 bg-blue-500' : 'border-slate-200'
                    }`}>
                       {isActive && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <input 
                      type="checkbox" className="hidden" 
                      checked={isActive}
                      onChange={(e) => setFormData({...formData, [role.id]: e.target.checked})}
                    />
                  </label>
                )
              })}
            </div>
          </div>

          {/* Info Adicional + Botão */}
          <div className="space-y-6">
            {!isEdit && (
              <div className="flex items-center space-x-3 text-blue-600 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                 <Mail className="w-5 h-5" />
                 <p className="text-xs font-semibold leading-tight">
                    Um e-mail de ativação com a senha gerada será enviado automaticamente para o endereço informado acima.
                 </p>
              </div>
            )}

            {isEdit && (
              <div className="bg-slate-100 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Último Acesso</span>
                </div>
                <span className="text-sm font-semibold text-slate-700">{formatLastLogin(usuario?.lastLogin)}</span>
              </div>
            )}

            <button
              type="button" 
              onClick={() => setShowConfirm(true)}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 bg-slate-900 text-white py-6 rounded-[2rem] font-semibold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              <span>{isEdit ? 'Salvar Alterações' : 'Finalizar Cadastro'}</span>
              {!loading && !isEdit && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </form>
      </main>

      {/* Modal de Confirmação */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-800 mb-2">Confirmar Alterações?</h3>
            <p className="text-slate-500 font-medium mb-8">
              Você está prestes a {isEdit ? 'atualizar os dados deste usuário' : 'criar um novo acesso no sistema'}. Deseja prosseguir?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowConfirm(false)}
                className="py-4 rounded-2xl font-semibold text-slate-500 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleSubmit()}
                className="py-4 rounded-2xl font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg"
              >
                Sim, Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
