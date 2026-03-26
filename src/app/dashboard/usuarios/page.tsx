import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import UsuariosClient from "@/components/UsuariosClient"

export const metadata = {
  title: 'Áxis - Usuarios'
}

export const runtime = 'nodejs'

async function getUsuarios() {
  return await prisma.$queryRaw<any[]>`
    SELECT 
      id, name, email, username,
      is_superuser as "isSuperuser",
      is_staff as "isStaff",
      is_active as "isActive",
      is_approved as "isApproved",
      is_aee as "isAEE"
    FROM users
    WHERE estudante_id IS NULL AND is_portal_user = false AND id NOT LIKE 'GROUP_%'
    ORDER BY is_approved ASC, name ASC
  `
}

export default async function UsuariosPage() {
  const session = await auth()
  if (!session || !session.user.isSuperuser) redirect("/dashboard")

  const usuarios = await getUsuarios()
  const pendentes = usuarios.filter(u => !u.isApproved).length

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-300 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-blue-900 flex items-center gap-3">
                  Gerenciar Usuários
                  {pendentes > 0 && (
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-full uppercase tracking-wider animate-pulse">
                      {pendentes} pendente{pendentes !== 1 ? 's' : ''}
                    </span>
                  )}
                </h1>
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
        <UsuariosClient usuarios={usuarios} />
      </main>
    </div>
  )
}
