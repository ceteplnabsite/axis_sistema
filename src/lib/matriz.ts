import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { normalizarNome } from '@/lib/sigeduc'

type Db = PrismaClient | Prisma.TransactionClient

/**
 * REGRA: toda turma criada recebe as disciplinas da Matriz Curricular do seu curso/série/ano.
 * Cria só as que faltam (compara o nome sem acento/maiúsculas), sem tocar nas que já existem,
 * em notas ou em professores. Turma sem curso ou série → nada a fazer.
 * Devolve os nomes das disciplinas criadas.
 */
export async function aplicarMatrizNaTurma(turmaId: string, db: Db = prisma): Promise<string[]> {
  const turma = await db.turma.findUnique({
    where: { id: turmaId },
    select: { cursoId: true, serie: true, anoLetivo: true, disciplinas: { select: { nome: true } } }
  })
  if (!turma?.cursoId || !turma.serie) return []

  const matriz = await db.matrizCurricular.findMany({
    where: { cursoId: turma.cursoId, serie: turma.serie, anoLetivo: turma.anoLetivo ?? new Date().getFullYear() },
    select: { nome: true, areaId: true },
    orderBy: { nome: 'asc' }
  })
  const tem = new Set(turma.disciplinas.map(d => normalizarNome(d.nome)))
  const novas: { nome: string; areaId: string | null }[] = []
  for (const m of matriz) {
    const k = normalizarNome(m.nome)
    if (tem.has(k)) continue
    tem.add(k)
    novas.push(m)
  }
  if (novas.length) await db.disciplina.createMany({ data: novas.map(m => ({ nome: m.nome, turmaId, areaId: m.areaId })) })
  return novas.map(m => m.nome)
}
