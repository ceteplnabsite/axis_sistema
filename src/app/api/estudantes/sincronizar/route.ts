import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { apenasGestao } from '@/lib/api-auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const negado = await apenasGestao()
  if (negado) return negado

  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const manualTurma = formData.get('manualTurma') as string

    if (!file || !manualTurma) {
      return NextResponse.json({ message: 'Arquivo ou Turma ausente' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length <= 1) {
      return NextResponse.json({ message: 'Arquivo CSV vazio' }, { status: 400 })
    }

    // Identificar a turma alvo
    // turma ATIVA com esse nome (há turmas encerradas de 2026.1 com o mesmo nome das de 2026.2)
    const turmaAlvo = await prisma.turma.findFirst({
      where: { nome: manualTurma, status: 'ATIVA' },
      orderBy: { createdAt: 'desc' }
    })
    if (!turmaAlvo) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 })
    }

    // Identificar/Criar turma de Evasão
    let turmaEvasao = await prisma.turma.findFirst({
      where: { nome: 'Transferidos / Evasão' }
    })
    if (!turmaEvasao) {
      const config = await prisma.globalConfig.findUnique({ where: { id: 'global' } })
      const currentYear = config?.anoLetivoAtual || new Date().getFullYear()
      turmaEvasao = await prisma.turma.create({
        data: { nome: 'Transferidos / Evasão', anoLetivo: currentYear }
      })
    }

    const linesToProcess = lines.slice(1)
    const matriculasNoPdf = new Set<string>()
    const dataNoPdf: { matricula: string, nome: string }[] = []

    for (let i = 0; i < linesToProcess.length; i++) {
        const parts = linesToProcess[i].split(',').map(s => s.trim())
        if (parts.length >= 2) {
           const matricula = parts[0]
           const nome = parts[1]
           if (matricula && nome && !matriculasNoPdf.has(matricula)) {
               matriculasNoPdf.add(matricula)
               dataNoPdf.push({ matricula, nome })
           }
        }
    }

    // Buscar todos os estudantes da turma alvo atual
    const estudantesNaTurmaAtualmente = await prisma.estudante.findMany({
        where: { turmaId: turmaAlvo.id }
    })

    // Buscar todos os estudantes que estão no PDF para ver se existem no sistema (mesmo em outras turmas)
    const estudantesNoSistema = await prisma.estudante.findMany({
        where: { matricula: { in: Array.from(matriculasNoPdf) } }
    })
    const mapSistema = new Map(estudantesNoSistema.map(e => [e.matricula, e]))

    // Monta as mudanças e grava tudo de uma vez, numa transação (ou grava tudo, ou nada)
    const novos = dataNoPdf.filter(i => !mapSistema.has(i.matricula))
    const vindos = dataNoPdf.map(i => mapSistema.get(i.matricula)).filter((e): e is NonNullable<typeof e> => !!e && e.turmaId !== turmaAlvo.id)
    const saindo = estudantesNaTurmaAtualmente.filter(e => !matriculasNoPdf.has(e.matricula)).map(e => e.matricula)
    // quem vem de outra turma guarda a turma de onde veio: agrupa por turma de origem
    const porOrigem = new Map<string, string[]>()
    for (const e of vindos) porOrigem.set(e.turmaId, [...(porOrigem.get(e.turmaId) ?? []), e.matricula])

    await prisma.$transaction([
      prisma.estudante.createMany({ data: novos.map(i => ({ matricula: i.matricula, nome: i.nome, turmaId: turmaAlvo.id, status: 'ATIVO' })), skipDuplicates: true }),
      ...[...porOrigem].map(([origem, mats]) => prisma.estudante.updateMany({
        where: { matricula: { in: mats } }, data: { turmaId: turmaAlvo.id, turmaAnteriorId: origem, status: 'ATIVO' }
      })),
      prisma.estudante.updateMany({
        where: { matricula: { in: saindo }, turmaId: turmaAlvo.id },
        data: { turmaId: turmaEvasao.id, turmaAnteriorId: turmaAlvo.id, status: 'REMOVIDO_VIA_VARREDURA' }
      }),
    ])
    const createdCount = novos.length, updatedCount = vindos.length, removedCount = saindo.length

    revalidatePath('/dashboard/estudantes')
    revalidatePath('/dashboard')

    return NextResponse.json({
      message: 'Sincronização concluída com sucesso',
      created: createdCount,
      updated: updatedCount,
      removed: removedCount
    })
  } catch (error) {
    console.error('Erro na sincronização:', error)
    return NextResponse.json(
      { message: 'Erro interno ao sincronizar turma' },
      { status: 500 }
    )
  }
}
