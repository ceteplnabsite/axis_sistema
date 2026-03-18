
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matricula } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 })

  try {
    // Busca o perfil AEE do aluno
    const profile = await prisma.aeeProfile.findUnique({
      where: { estudanteId: matricula },
      select: { id: true, estudante: { select: { turmaId: true, turma: { select: { usuariosPermitidos: { select: { id: true } } } } } } }
    })

    if (!profile) {
      return NextResponse.json({ message: "Perfil não encontrado" }, { status: 404 })
    }

    // Verifica se professor tem aula nessa turma
    const isDirecao = session.user.isDirecao || session.user.isSuperuser
    const isProfessorDaTurma = profile.estudante.turma.usuariosPermitidos.some(u => u.id === session.user.id)

    if (!isDirecao && !isProfessorDaTurma) {
      return NextResponse.json({ message: "Não autorizado para este aluno" }, { status: 403 })
    }

    // Registra o aceite (upsert para evitar duplicata mas atualizar data if needed)
    const ack = await prisma.aEEAcknowledgement.upsert({
      where: {
        profileId_userId: {
          profileId: profile.id,
          userId: session.user.id
        }
      },
      update: { readAt: new Date() },
      create: {
        profileId: profile.id,
        userId: session.user.id
      }
    })

    return NextResponse.json({ success: true, ack })

  } catch (error: any) {
    console.error("Erro AEE Atestar:", error)
    return NextResponse.json({ message: "Erro ao atestar: " + error.message }, { status: 500 })
  }
}
