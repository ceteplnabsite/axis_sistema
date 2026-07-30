import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    const provaId = searchParams.get("provaId")
    const unidade = searchParams.get("unidade")

    if (!turmaId || (!areaId && !provaId) || !unidade) {
      return NextResponse.json({ message: "Turma, Prova/Área e Unidade são obrigatórios" }, { status: 400 })
    }

    // Busca estudantes da turma com suas notas de simulado
    const estudantes = await prisma.estudante.findMany({
      where: { turmaId },
      orderBy: { nome: 'asc' },
      include: {
        notasSimulado: {
          where: provaId ? {
            provaId,
            unidade: parseInt(unidade),
            anoLetivo: 2026
          } : {
            areaId,
            unidade: parseInt(unidade),
            anoLetivo: 2026
          },
          include: {
            lancadoBy: {
              select: { name: true, email: true }
            }
          }
        }
      }
    })

    // Buscar a Prova e seu gabarito se provaId for fornecido
    let gabarito: any = null
    let canView = false

    if (provaId) {
      const prova = await prisma.prova.findUnique({
        where: { id: provaId },
        include: {
          questoes: {
            include: {
              disciplinas: {
                include: {
                  usuariosPermitidos: { select: { id: true } }
                }
              }
            }
          }
        }
      })

      if (prova) {
        // Extrair gabarito
        if (prova.questoesSnapshot) {
          try {
            const questoesSnapshot = typeof prova.questoesSnapshot === 'string' 
              ? JSON.parse(prova.questoesSnapshot) 
              : prova.questoesSnapshot;
              
            if (Array.isArray(questoesSnapshot)) {
              gabarito = questoesSnapshot.map((q: any, index: number) => ({
                numero: index + 1,
                correta: q.correta || 'N/A',
                disciplina: q.disciplina || 'Desconhecida'
              }))
            }
          } catch (e) {
            console.error("Erro ao fazer parse do questoesSnapshot", e)
          }
        } else if (prova.questoes) {
          gabarito = prova.questoes.map((q: any, index: number) => ({
            numero: index + 1,
            correta: q.correta,
            disciplina: q.disciplinas?.[0]?.nome || 'Desconhecida'
          }))
        }

        // Verificar permissão de visualização (se ensina alguma disciplina da prova)
        const professoresDaProva = new Set<string>()
        prova.questoes.forEach(q => {
          q.disciplinas.forEach(d => {
            d.usuariosPermitidos.forEach(u => professoresDaProva.add(u.id))
          })
        })
        
        canView = professoresDaProva.has(user.id) || user.isSuperuser || user.isDirecao
      }
    } else {
      canView = user.isSuperuser || user.isDirecao
    }

    // Verificar se o usuário TEM PERMISSÃO DE EDIÇÃO para esta consulta
    let canEdit = user.isSuperuser || user.isDirecao
    if (!canEdit) {
      let whereResponsavel: any = { userId: user.id, turmaId, anoLetivo: 2026 }
      if (provaId) {
        whereResponsavel.provaId = provaId
        // O responsável pode estar vinculado à unidade específica ou a todas (nulo)
        // Se unidade estiver presente na req, checamos se ele tem permissão nela ou nulo
      } else {
        whereResponsavel.areaId = areaId
      }
      
      const isResponsavel = await (prisma as any).responsavelSimulado.findMany({
        where: whereResponsavel
      })

      // Se encontrou, checa se a unidade bate
      canEdit = isResponsavel.some((r: any) => r.unidade === null || r.unidade === parseInt(unidade))
      if (canEdit) canView = true // Se pode editar, pode ver
    }

    if (!canView && !canEdit) {
        // Se não pode nem ver nem editar, não retornar dados sensíveis
        return NextResponse.json({ message: "Sem permissão de acesso a estes resultados" }, { status: 403 })
    }

    return NextResponse.json({ 
        estudantes,
        canEdit,
        canView,
        gabarito: canEdit ? gabarito : null // Apenas editores (responsáveis) veem o gabarito
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

    const { areaId, provaId, unidade, notas, turmaId } = await request.json()

    if ((!areaId && !provaId) || !unidade || !Array.isArray(notas) || !turmaId) {
      return NextResponse.json({ message: "Dados incompletos" }, { status: 400 })
    }

    // Verificação de permissão rigorosa
    if (!user.isSuperuser && !user.isDirecao) {
      let whereResponsavel: any = { userId: user.id, turmaId, anoLetivo: 2026 }
      if (provaId) whereResponsavel.provaId = provaId
      else whereResponsavel.areaId = areaId
      
      const responsaveis = await (prisma as any).responsavelSimulado.findMany({
        where: whereResponsavel
      })

      const isResponsavelNominal = responsaveis.some((r: any) => r.unidade === null || r.unidade === parseInt(unidade))

      if (!isResponsavelNominal) {
        return NextResponse.json({ message: "Apenas o Professor Designado ou a Direção podem lançar notas nesta prova/turma" }, { status: 403 })
      }
    }

    // Buscar notas de simulado existentes no banco
    const whereExisting: any = {
      unidade: parseInt(unidade),
      anoLetivo: 2026,
      estudanteId: { in: notas.map((n: any) => n.estudanteId) }
    }
    if (provaId) whereExisting.provaId = provaId
    else whereExisting.areaId = areaId

    const existingNotasSimulado = await prisma.notaSimulado.findMany({
      where: whereExisting
    })

    const operations: any[] = []
    
    // O ID deve ser único para upset, mas nós removemos o unique para areaId_estudanteId.
    // Como a constraint unique real sumiu do schema, vamos usar update/create se baseando se já existe.
    for (const n of notas) {
      const existing = existingNotasSimulado.find(e => e.estudanteId === n.estudanteId)
      
      const parsedNota = n.nota !== null && n.nota !== undefined && String(n.nota).trim() !== '' ? parseFloat(n.nota) : null
      const isAusente = n.ausente === true
      const parsedNotaSegundaChamada = n.notaSegundaChamada !== null && n.notaSegundaChamada !== undefined && String(n.notaSegundaChamada).trim() !== '' ? parseFloat(n.notaSegundaChamada) : null

      const dataToSave = {
        nota: parsedNota,
        ausente: isAusente,
        notaSegundaChamada: parsedNotaSegundaChamada,
        lancadoById: user.id
      }

      if (existing) {
        // Se a nota atual vier vazia, não vamos sobrescrever e sim manter, MAS vamos permitir atualizar ausente e segunda chamada
        if (parsedNota === null && !isAusente) {
           dataToSave.nota = existing.nota
           dataToSave.lancadoById = existing.lancadoById // preserva quem lançou antes
        }

        operations.push(
          prisma.notaSimulado.update({
            where: { id: existing.id },
            data: dataToSave
          })
        )
      } else {
        // Create se não existir e se tivermos algum valor para salvar
        if (parsedNota !== null || isAusente) {
          operations.push(
            prisma.notaSimulado.create({
              data: {
                estudanteId: n.estudanteId,
                areaId: areaId || null,
                provaId: provaId || null,
                unidade: parseInt(unidade),
                nota: parsedNota,
                ausente: isAusente,
                notaSegundaChamada: parsedNotaSegundaChamada,
                anoLetivo: 2026,
                lancadoById: user.id
              }
            })
          )
        }
      }
    }

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
