import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const user = session?.user as any
    if (!user) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get("turmaId")
    const areaId = searchParams.get("areaId")
    const unidade = searchParams.get("unidade")

    if (!turmaId || !areaId || !unidade) {
      return NextResponse.json({ message: "Turma, Área e Unidade são obrigatórios" }, { status: 400 })
    }

    // Busca estudantes da turma com suas notas de simulado para a área/unidade específica
    const estudantes = await prisma.estudante.findMany({
      where: { turmaId },
      orderBy: { nome: 'asc' },
      include: {
        notasSimulado: {
          where: {
            areaId,
            unidade: parseInt(unidade),
            anoLetivo: 2026 // Definido como padrão
          }
        }
      }
    })

    // Verificar se o usuário TEM PERMISSÃO DE EDIÇÃO para esta consulta específica
    let canEdit = user.isSuperuser || user.isDirecao
    if (!canEdit) {
      const isResponsavel = await (prisma as any).responsavelSimulado.findFirst({
        where: { userId: user.id, turmaId, areaId, anoLetivo: 2026 }
      })
      canEdit = !!isResponsavel
    }

    return NextResponse.json({ 
        estudantes,
        canEdit
    })
  } catch (error) {
    console.error("Erro ao buscar estudantes para simulado:", error)
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const user = session?.user as any
    if (!user) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    }

    const { areaId, unidade, notas, turmaId } = await request.json()

    if (!areaId || !unidade || !Array.isArray(notas) || !turmaId) {
      return NextResponse.json({ message: "Dados incompletos" }, { status: 400 })
    }

    // Verificação de permissão rigorosa
    if (!user.isSuperuser && !user.isDirecao) {
      const isResponsavelNominal = await (prisma as any).responsavelSimulado.findFirst({
        where: { userId: user.id, turmaId, areaId, anoLetivo: 2026 }
      })

      if (!isResponsavelNominal) {
        return NextResponse.json({ message: "Apenas o Professor Designado ou a Direção podem lançar notas nesta área/turma" }, { status: 403 })
      }
    }

    // Lançamento em lote
    const operations = notas.map((n: any) => {
      return prisma.notaSimulado.upsert({
        where: {
          estudanteId_areaId_unidade_anoLetivo: {
            estudanteId: n.estudanteId,
            areaId,
            unidade: parseInt(unidade),
            anoLetivo: 2026
          }
        },
        update: {
          nota: parseFloat(n.nota),
          lancadoById: user.id
        },
        create: {
          estudanteId: n.estudanteId,
          areaId,
          unidade: parseInt(unidade),
          nota: parseFloat(n.nota),
          anoLetivo: 2026,
          lancadoById: user.id
        }
      })
    })

    // Usar transaction garante que as conexões não fiquem presas e se uma falhar, nada é salvo (atomicidade)
    await prisma.$transaction(operations)

    await logAudit(
      user.id,
      'NOTA',
      turmaId,
      'UPDATE',
      { context: 'Lançamento em Lote de Simulados', areaId, unidade, notasLançadas: notas.length }
    )

    return NextResponse.json({ message: "Notas de simulado salvas com sucesso" })
  } catch (error) {
    console.error("Erro ao salvar notas de simulado:", error)
    return NextResponse.json({ message: "Erro ao salvar notas" }, { status: 500 })
  }
}
