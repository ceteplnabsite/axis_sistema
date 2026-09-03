import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user.isSuperuser) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    const { disciplinaIds } = await request.json() as { disciplinaIds: string[] }
    if (!disciplinaIds?.length) {
      return NextResponse.json({ message: 'Nenhuma disciplina para vincular' }, { status: 400 })
    }

    // Defesa extra: nunca vincular professor a disciplina de turma ENCERRADA,
    // mesmo que o client tenha enviado o id (ex: seleção manual indevida).
    const disciplinas = await prisma.disciplina.findMany({
      where: { id: { in: disciplinaIds } },
      select: { id: true, turma: { select: { status: true } } }
    })
    const idsBloqueados = disciplinas.filter(d => d.turma?.status === 'ENCERRADA').map(d => d.id)
    const idsParaVincular = disciplinaIds.filter(did => !idsBloqueados.includes(did))

    if (idsParaVincular.length === 0) {
      return NextResponse.json({ message: 'Todas as disciplinas selecionadas pertencem a turmas encerradas' }, { status: 400 })
    }

    // Regra de Exclusividade (mesma da tela de Vincular Disciplinas): se
    // outro professor já está nessas disciplinas, remove o vínculo antigo
    // antes de conectar este, para nunca ficar com dois professores na
    // mesma disciplina.
    const placeholders = idsParaVincular.map((_, i) => `$${i + 1}`).join(',')
    await prisma.$executeRawUnsafe(`
      DELETE FROM "_DisciplinaUsuarios"
      WHERE "A" IN (${placeholders}) AND "B" != $${idsParaVincular.length + 1}
    `, ...idsParaVincular, id)

    // Conecta as disciplinas ao professor (mantendo as já existentes)
    await prisma.user.update({
      where: { id },
      data: {
        disciplinasPermitidas: {
          connect: idsParaVincular.map(did => ({ id: did }))
        }
      }
    })

    return NextResponse.json({
      vinculadas: idsParaVincular.length,
      bloqueadas: idsBloqueados.length,
      message: idsBloqueados.length > 0
        ? `${idsParaVincular.length} disciplina(s) vinculada(s). ${idsBloqueados.length} ignorada(s) por pertencer a turma encerrada.`
        : `${idsParaVincular.length} disciplina(s) vinculada(s) com sucesso!`
    })

  } catch (error: any) {
    console.error('Erro importar-horario:', error)
    return NextResponse.json({ message: 'Erro interno: ' + error.message }, { status: 500 })
  }
}
