import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

// Última série de cada modalidade semestral. Ao chegar nela, a turma é
// FINALIZADA (concluído) em vez de promovida para uma próxima série.
const MAX_SERIE: Record<string, number> = {
  PROEJA: 5,
  SUBSEQUENTE: 4,
  PROSUB: 4,
}

function sugerirProximoNome(nomeAtual: string, novaSerie: number) {
  const match = nomeAtual.match(/^(\d+)(.*)$/)
  if (match) return `${novaSerie}${match[2]}`
  return `${nomeAtual} - S${novaSerie}`
}

interface PlanoItem {
  nome: string
  id?: string
  modalidade?: string | null
  serieAtual?: number
  estudantes?: number
  acao?: "PROMOVER" | "FINALIZAR"
  detalhe?: string
  novoNome?: string
  novaSerie?: number
  erro?: string
}

async function montarPlano(nomes: string[]): Promise<PlanoItem[]> {
  const plano: PlanoItem[] = []

  for (const nomeRaw of nomes) {
    const nome = nomeRaw.trim()
    if (!nome) continue

    const encontradas = await prisma.turma.findMany({ where: { nome } })

    if (encontradas.length === 0) {
      plano.push({ nome, erro: "Turma não encontrada" })
      continue
    }
    if (encontradas.length > 1) {
      plano.push({ nome, erro: `Nome ambíguo: ${encontradas.length} turmas encontradas com esse nome` })
      continue
    }

    const turma = encontradas[0]

    if (turma.status === "ENCERRADA") {
      plano.push({ nome, id: turma.id, erro: "Turma já está ENCERRADA" })
      continue
    }

    const max = turma.modalidade ? MAX_SERIE[turma.modalidade] : undefined
    if (!max) {
      plano.push({ nome, id: turma.id, modalidade: turma.modalidade, erro: `Modalidade '${turma.modalidade}' não é semestral — ação em massa não se aplica` })
      continue
    }

    const serieAtual = turma.serie ? parseInt(turma.serie, 10) : NaN
    if (isNaN(serieAtual)) {
      plano.push({ nome, id: turma.id, modalidade: turma.modalidade, erro: "Série da turma inválida/vazia" })
      continue
    }

    const estudantesCount = await prisma.estudante.count({ where: { turmaId: turma.id } })

    if (serieAtual >= max) {
      plano.push({
        nome,
        id: turma.id,
        modalidade: turma.modalidade,
        serieAtual,
        estudantes: estudantesCount,
        acao: "FINALIZAR",
        detalhe: `Série ${serieAtual}/${max} — última etapa. ${estudantesCount} aluno(s) ficarão CONCLUÍDO.`,
      })
    } else {
      const novaSerie = serieAtual + 1
      const novoNome = sugerirProximoNome(turma.nome, novaSerie)
      plano.push({
        nome,
        id: turma.id,
        modalidade: turma.modalidade,
        serieAtual,
        estudantes: estudantesCount,
        acao: "PROMOVER",
        detalhe: `Nova turma: ${novoNome} (série ${novaSerie}). ${estudantesCount} aluno(s) serão movidos. Turma de origem será ENCERRADA.`,
        novoNome,
        novaSerie,
      })
    }
  }

  return plano
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session || !session.user.isSuperuser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
  }

  const body = await request.json()
  const nomes: string[] = Array.isArray(body.nomes) ? body.nomes : []
  const dryRun = body.dryRun !== false

  if (nomes.length === 0) {
    return NextResponse.json({ message: "Informe ao menos um nome de turma" }, { status: 400 })
  }

  const plano = await montarPlano(nomes)

  if (dryRun) {
    return NextResponse.json({ dryRun: true, plano })
  }

  const resultados: (PlanoItem & { executado: boolean; erroExecucao?: string; novaTurmaId?: string })[] = []

  for (const item of plano) {
    if (item.erro || !item.acao || !item.id) {
      resultados.push({ ...item, executado: false })
      continue
    }

    try {
      if (item.acao === "FINALIZAR") {
        await prisma.turma.update({ where: { id: item.id }, data: { status: "ENCERRADA" } })
        await prisma.estudante.updateMany({ where: { turmaId: item.id }, data: { status: "CONCLUIDO" } })
        resultados.push({ ...item, executado: true })
      } else {
        const originalTurma = await prisma.turma.findUnique({
          where: { id: item.id },
          include: { estudantes: true },
        })
        if (!originalTurma) throw new Error("Turma original não encontrada durante execução")

        const newTurma = await prisma.turma.create({
          data: {
            nome: item.novoNome!,
            cursoId: originalTurma.cursoId,
            curso: originalTurma.curso,
            turno: originalTurma.turno,
            modalidade: originalTurma.modalidade,
            serie: item.novaSerie!.toString(),
            numero: originalTurma.numero,
            anoLetivo: originalTurma.anoLetivo,
          },
        })

        const matrizDisciplinas = await prisma.matrizCurricular.findMany({
          where: {
            cursoId: originalTurma.cursoId || "",
            serie: item.novaSerie!.toString(),
            anoLetivo: originalTurma.anoLetivo || new Date().getFullYear(),
          },
        })

        if (matrizDisciplinas.length > 0) {
          await prisma.disciplina.createMany({
            data: matrizDisciplinas.map((m) => ({
              nome: m.nome,
              turmaId: newTurma.id,
              areaId: m.areaId,
            })),
          })
        }

        if (originalTurma.estudantes.length > 0) {
          await prisma.estudante.updateMany({
            where: { matricula: { in: originalTurma.estudantes.map((e) => e.matricula) } },
            data: { turmaId: newTurma.id },
          })
        }

        await prisma.turma.update({ where: { id: originalTurma.id }, data: { status: "ENCERRADA" } })

        resultados.push({ ...item, executado: true, novaTurmaId: newTurma.id })
      }
    } catch (e) {
      resultados.push({ ...item, executado: false, erroExecucao: e instanceof Error ? e.message : String(e) })
    }
  }

  revalidatePath("/dashboard/turmas")
  return NextResponse.json({ dryRun: false, resultados })
}
