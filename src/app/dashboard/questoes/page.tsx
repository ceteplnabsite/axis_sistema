import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import QuestoesClient from "./QuestoesClient"
import { getTurmasPermitidas } from "@/lib/data-fetching"

export const metadata = {
  title: 'Áxis - Questoes'
}

export const runtime = 'nodejs'

export default async function QuestoesPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const isManagement = session.user.isSuperuser || session.user.isDirecao
  const userId = session.user.id

  // Buscar configurações
  const config = await prisma.globalConfig.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global', isBancoQuestoesAtivo: true }
  })

  // Se professor e banco estiver desativado, bloqueia acesso
  if (!session.user.isSuperuser && !session.user.isDirecao && !config.isBancoQuestoesAtivo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 15c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-medium text-slate-900">Módulo em Manutenção</h1>
        <p className="text-slate-600 mt-2 max-w-md">
          O Banco de Questões foi temporariamente desativado pela direção para manutenção ou atualização pedagógica.
        </p>
      </div>
    )
  }

  // Buscar turmas e disciplinas para os filtros/seleção
  const turmasPermitidas = await getTurmasPermitidas(session)
  const turmas = turmasPermitidas.map((t: any) => ({
    id: t.id,
    nome: t.nome,
    serie: t.serie
  }))

  const disciplinasRaw = await prisma.disciplina.findMany({
    where: isManagement ? {} : {
      usuariosPermitidos: {
        some: { id: userId }
      }
    },
    include: {
      turma: { select: { nome: true, serie: true } }
    },
    orderBy: { nome: 'asc' }
  })

  // Formatar dados das disciplinas de forma consistente (sempre inclui a turma)
  const disciplinasForm = disciplinasRaw.map(d => ({
    id: d.id,
    nome: d.nome,
    turmaId: d.turmaId,
    turmaNome: d.turma.nome,
    serie: d.turma.serie,
    label: `${d.nome} (${d.turma.nome})`
  }))

  // Buscar métricas do banco
  const stats = await prisma.$transaction([
    prisma.questao.count({ where: { status: 'APROVADA' } }),
    prisma.questao.count({ where: { status: 'PENDENTE' } }),
    prisma.questao.count({ where: isManagement ? {} : { professorId: userId } })
  ])

  const metrics = {
    totalAprovadas: stats[0],
    totalPendentes: stats[1],
    minhasQuestoes: stats[2]
  }

  // Buscar contagem de questões por turma
  // Para professores: só as próprias questões. Para admins: todas.
  const turmasComContagem = await prisma.turma.findMany({
    where: isManagement
      ? { questoes: { some: {} } }
      : { questoes: { some: { professorId: userId } } },
    select: {
      id: true,
      nome: true,
      serie: true,
      _count: {
        select: {
          questoes: true
        }
      }
    },
    orderBy: { nome: 'asc' }
  })

  // Para cada turma, buscar contagem por status
  const questoesPorTurmaRaw = await Promise.all(
    turmasComContagem.map(async (turma) => {
      const whereBase = isManagement
        ? { turmas: { some: { id: turma.id } } }
        : { turmas: { some: { id: turma.id } }, professorId: userId }

      const [total, aprovadas, pendentes] = await prisma.$transaction([
        prisma.questao.count({ where: whereBase }),
        prisma.questao.count({ where: { ...whereBase, status: 'APROVADA' } }),
        prisma.questao.count({ where: { ...whereBase, status: 'PENDENTE' } }),
      ])

      return {
        id: turma.id,
        nome: turma.nome,
        serie: turma.serie,
        total,
        aprovadas,
        pendentes,
        rejeitadas: total - aprovadas - pendentes
      }
    })
  )

  // Ordenar por total decrescente
  const questoesPorTurma = questoesPorTurmaRaw.sort((a, b) => b.total - a.total)

  return (
    <QuestoesClient 
      user={session.user} 
      turmas={turmas} 
      disciplinas={disciplinasForm} 
      metrics={metrics}
      questoesPorTurma={questoesPorTurma}
    />
  )
}
