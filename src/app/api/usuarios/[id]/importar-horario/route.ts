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

    // Conecta as disciplinas ao professor (mantendo as já existentes)
    await prisma.user.update({
      where: { id },
      data: {
        disciplinasPermitidas: {
          connect: disciplinaIds.map(did => ({ id: did }))
        }
      }
    })

    return NextResponse.json({
      vinculadas: disciplinaIds.length,
      message: `${disciplinaIds.length} disciplina(s) vinculada(s) com sucesso!`
    })

  } catch (error: any) {
    console.error('Erro importar-horario:', error)
    return NextResponse.json({ message: 'Erro interno: ' + error.message }, { status: 500 })
  }
}
