import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || !session.user.isSuperuser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params

    const turma = await prisma.turma.findUnique({ where: { id } })
    if (!turma) {
      return NextResponse.json({ message: "Turma não encontrada" }, { status: 404 })
    }

    await prisma.turma.update({
      where: { id },
      data: { status: "ENCERRADA" }
    })

    await prisma.estudante.updateMany({
      where: { turmaId: id },
      data: { status: "CONCLUIDO" }
    })

    revalidatePath('/dashboard/turmas')
    return NextResponse.json({ message: "Turma finalizada com sucesso" })

  } catch (error) {
    console.error("Erro ao finalizar turma:", error)
    return NextResponse.json({ message: "Erro interno ao finalizar turma" }, { status: 500 })
  }
}
