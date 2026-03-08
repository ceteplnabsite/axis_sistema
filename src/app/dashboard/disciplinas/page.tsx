import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, BookOpen } from "lucide-react"
import { getDisciplinasPermitidas } from "@/lib/data-fetching"
import DisciplinasList from "./DisciplinasList"

export const metadata = {
  title: 'Áxis - Disciplinas'
}

export const runtime = 'nodejs'

export default async function DisciplinasPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const disciplinas = await getDisciplinasPermitidas(session)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-300 sticky top-0 z-50 -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-5">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-slate-800 tracking-tight">Disciplinas</h1>
                <p className="text-base text-slate-700 font-medium">Cadastrar e editar disciplinas</p>
              </div>
            </div>
            <Link
              href="/dashboard/disciplinas/nova"
              className={`flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-medium hover:bg-slate-800 transition-all text-xs uppercase tracking-widest active:scale-95 shadow-xl shadow-slate-300 ${!session.user.isSuperuser ? 'hidden' : ''}`}
            >
              <Plus size={16} />
              <span>Nova Disciplina</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32">
        {disciplinas.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-300/50 border border-slate-200 p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 flex items-center justify-center rounded-3xl mx-auto mb-6">
               <BookOpen className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-medium text-slate-800 mb-2">
              Nenhuma disciplina cadastrada
            </h3>
            <p className="text-slate-700 font-medium mb-6 max-w-sm mx-auto">
              Comece criando sua primeira disciplina
            </p>
            <Link
              href="/dashboard/disciplinas/nova"
              className="inline-flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Criar Primeira Disciplina</span>
            </Link>
          </div>
        ) : (
          <DisciplinasList disciplinas={disciplinas} />
        )}
      </main>
    </div>
  )
}
