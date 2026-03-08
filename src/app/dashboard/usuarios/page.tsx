import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Plus, Shield, GraduationCap, PauseCircle, Clock, CheckCircle2 } from "lucide-react"
import UserActions from "@/components/UserActions"

export const metadata = {
  title: 'Áxis - Usuarios'
}

export const runtime = 'nodejs'

async function getUsuarios() {
  return await prisma.user.findMany({
    where: {
      estudanteId: null,
      isPortalUser: false,
      NOT: {
        id: { startsWith: "GROUP_" }
      }
    },
    orderBy: [
      { isApproved: 'asc' },
      { name: 'asc' }
    ],
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      isSuperuser: true,
      isStaff: true,
      isActive: true,
      isApproved: true,
      _count: {
        select: {
          disciplinasPermitidas: true
        }
      }
    }
  })
}

export default async function UsuariosPage() {
  const session = await auth()
  
  if (!session || !session.user.isSuperuser) {
    redirect("/dashboard")
  }

  const usuarios = await getUsuarios()

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-300 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-blue-900">Gerenciar Usuários</h1>
                <p className="text-sm text-slate-700">Administradores e Professores</p>
              </div>
            </div>
            <Link
              href="/dashboard/usuarios/novo"
              className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-300 border border-slate-700 font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>Novo Usuário</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-300 border border-slate-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-300">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-widest">
                    Usuário
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-slate-600 uppercase tracking-widest">
                    Função & Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-slate-600 uppercase tracking-widest">
                    Permissões
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-slate-600 uppercase tracking-widest leading-none">
                    Gerenciamento
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className={`hover:bg-slate-50 transition-colors ${!usuario.isActive ? 'opacity-60 bg-slate-100' : ''} ${!usuario.isApproved ? 'bg-slate-50/10' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-medium text-lg shadow-inner ${
                          !usuario.isApproved
                            ? 'bg-amber-400'
                            : !usuario.isActive 
                              ? 'bg-slate-300' 
                              : usuario.isSuperuser 
                                ? 'bg-gradient-to-br from-slate-500 to-purple-600' 
                                : 'bg-gradient-to-br from-slate-500 to-slate-600'
                        }`}>
                          {usuario.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center gap-2">
                             <div className={`text-sm font-medium tracking-tight ${!usuario.isActive ? 'text-slate-600' : 'text-slate-800'}`}>
                              {usuario.name || 'Sem nome'}
                            </div>
                            {!usuario.isApproved && (
                              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                            )}
                          </div>
                          <div className="text-xs text-slate-600 font-medium tracking-tight">
                            {usuario.email}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">
                             @{usuario.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-1.5">
                          {!usuario.isApproved ? (
                             <span className="px-2.5 py-0.5 inline-flex items-center text-[10px] font-medium uppercase tracking-wider rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 mr-1" />
                              Solicitação
                            </span>
                          ) : (
                            <>
                              {usuario.isSuperuser && (
                                <span className="px-2.5 py-0.5 inline-flex items-center text-[10px] font-medium uppercase tracking-wider rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Admin
                                </span>
                              )}
                              {usuario.isStaff && (
                                <span className="px-2.5 py-0.5 inline-flex items-center text-[10px] font-medium uppercase tracking-wider rounded-full bg-slate-200 text-slate-800 border border-slate-300">
                                  <GraduationCap className="w-3 h-3 mr-1" />
                                  Professor
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        
                        {usuario.isApproved && !usuario.isActive && (
                          <span className="px-2.5 py-0.5 inline-flex items-center text-[10px] font-medium uppercase tracking-wider rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                            <PauseCircle className="w-3 h-3 mr-1" />
                            Acesso Pausado
                          </span>
                        )}

                        {usuario.isApproved && usuario.isActive && (
                           <span className="px-2.5 py-0.5 inline-flex items-center text-[10px] font-medium uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Ativo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      {usuario.isSuperuser ? (
                        <span className="text-slate-700 font-medium text-[10px] uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">Controle Total</span>
                      ) : !usuario.isApproved ? (
                        <span className="text-slate-400 italic text-[10px] font-medium uppercase tracking-widest">A aguardar</span>
                      ) : (
                        <span className="font-medium text-slate-700 text-xs">
                          {usuario._count.disciplinasPermitidas} <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">Disciplinas</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <UserActions 
                        userId={usuario.id} 
                        userName={usuario.name || ''} 
                        isActive={usuario.isActive}
                        isApproved={usuario.isApproved}
                        isSuperuser={usuario.isSuperuser}
                        isStaff={usuario.isStaff}
                       />
                    </td>
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
