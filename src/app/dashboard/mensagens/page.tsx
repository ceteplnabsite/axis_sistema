import { auth } from "@/lib/auth"
import { getMessages, getUsersForSelect, getTurmasForSelect, getResumoFila } from "./actions"
import type { FiltroFila } from "@/lib/chamados"

const FILTROS: FiltroFila[] = ['novos', 'atrasados', 'aguardando', 'resolvidos']
import MessagesClient from "./MessagesClient"
import { redirect } from "next/navigation"
import { LifeBuoy } from "lucide-react"

export const metadata = {
  title: 'Áxis - Mensagens'
}

// envio de comunicados por e-mail (after) e lembretes podem levar alguns segundos
export const maxDuration = 60

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ fila?: string }> }) {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  const { received, sent } = await getMessages()
  const users = await getUsersForSelect()
  const turmas = await getTurmasForSelect()
  const resumoFila = await getResumoFila()
  const { fila } = await searchParams
  const filaInicial = FILTROS.find(f => f === fila) ?? null

  // Transform User[] to the shape MessagesClient expects
  const userOptions = users.map(u => ({
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.isSuperuser ? "Admin" : u.isDirecao ? "Direção" : u.isStaff ? "Professor" : "Usuário",
    isStudent: !!u.estudanteId || u.isPortalUser
  }))

  const currentUserRole = {
    isSuperuser: session.user.isSuperuser,
    isDirecao: session.user.isDirecao,
    isStaff: session.user.isStaff
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-medium text-slate-800 tracking-tighter">Mensagens</h1>
          <p className="text-sm text-slate-600">Conversas, comunicados e chamados.</p>
        </div>
        <p className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2">
          <LifeBuoy className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Não encontra uma turma, disciplina ou estudante? Abra um chamado de <b>Suporte Técnico</b>.</span>
        </p>
      </div>
      <MessagesClient 
        receivedMessages={received as any} 
        sentMessages={sent as any}
        users={userOptions}
        turmas={turmas}
        currentUserRole={currentUserRole}
        currentUserId={session.user.id}
        resumoFila={resumoFila}
        filaInicial={filaInicial}
      />
    </div>
  )
}
