'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { normalizarNome } from '@/lib/sigeduc'

/** Disciplinas da turma (com professores) e itens da Matriz Curricular que ainda faltam nela. Só Direção/TI. */

async function gestao() {
  const session = await auth()
  if (!session?.user || (!session.user.isSuperuser && !session.user.isDirecao)) return null
  return session
}

const anoDa = (t: { anoLetivo: number | null }) => t.anoLetivo ?? new Date().getFullYear()

export type DisciplinaDaTurma = { id: string; nome: string; professores: string[]; alunosComNota: number }
export type DadosDisciplinasTurma = {
  disciplinas: DisciplinaDaTurma[]
  faltandoDaMatriz: string[]
  temMatriz: boolean   // a turma tem curso e série (dá para usar a matriz)
}

export async function disciplinasDaTurma(turmaId: string): Promise<DadosDisciplinasTurma | { erro: string }> {
  if (!(await gestao())) return { erro: 'Acesso restrito à Direção' }
  const turma = await prisma.turma.findUnique({
    where: { id: turmaId },
    select: {
      cursoId: true, serie: true, anoLetivo: true,
      disciplinas: {
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true, usuariosPermitidos: { select: { name: true } }, _count: { select: { notas: true } } }
      }
    }
  })
  if (!turma) return { erro: 'Turma não encontrada' }

  const disciplinas = turma.disciplinas.map(d => ({
    id: d.id, nome: d.nome, professores: d.usuariosPermitidos.map(u => u.name ?? '').filter(Boolean), alunosComNota: d._count.notas
  }))
  if (!turma.cursoId || !turma.serie) return { disciplinas, faltandoDaMatriz: [], temMatriz: false }

  const matriz = await prisma.matrizCurricular.findMany({
    where: { cursoId: turma.cursoId, serie: turma.serie, anoLetivo: anoDa(turma) },
    select: { nome: true }, orderBy: { nome: 'asc' }
  })
  const tem = new Set(turma.disciplinas.map(d => normalizarNome(d.nome)))
  return { disciplinas, faltandoDaMatriz: matriz.map(m => m.nome).filter(n => !tem.has(normalizarNome(n))), temMatriz: true }
}

/** Cria na turma as disciplinas da matriz que faltam (não mexe nas que já existem, nem em notas/professores). */
export async function puxarDaMatriz(turmaId: string): Promise<{ criadas: string[] } | { erro: string }> {
  const session = await gestao()
  if (!session) return { erro: 'Acesso restrito à Direção' }
  const turma = await prisma.turma.findUnique({
    where: { id: turmaId },
    select: { nome: true, cursoId: true, serie: true, anoLetivo: true, disciplinas: { select: { nome: true } } }
  })
  if (!turma) return { erro: 'Turma não encontrada' }
  if (!turma.cursoId || !turma.serie) return { erro: 'A turma precisa ter curso e série para usar a matriz' }

  const matriz = await prisma.matrizCurricular.findMany({
    where: { cursoId: turma.cursoId, serie: turma.serie, anoLetivo: anoDa(turma) },
    select: { nome: true, areaId: true }
  })
  const tem = new Set(turma.disciplinas.map(d => normalizarNome(d.nome)))
  const novas = matriz.filter(m => !tem.has(normalizarNome(m.nome)))
  if (!novas.length) return { criadas: [] }

  await prisma.$transaction(async tx => {
    for (const m of novas) {
      const d = await tx.disciplina.create({ data: { nome: m.nome, turmaId, areaId: m.areaId } })
      await tx.auditLog.create({ data: {
        userId: session.user.id, entityType: 'DISCIPLINA', entityId: d.id, action: 'CREATE',
        details: JSON.stringify({ acao: 'DISCIPLINA_DA_MATRIZ', turma: turma.nome, nome: m.nome })
      } })
    }
  })
  revalidatePath(`/dashboard/turmas/${turmaId}/editar`)
  return { criadas: novas.map(m => m.nome) }
}

/** Adiciona uma disciplina à turma; também entra na matriz do curso/série (para as próximas turmas). */
export async function adicionarDisciplina(turmaId: string, nome: string): Promise<{ ok: true; naMatriz: boolean } | { erro: string }> {
  const session = await gestao()
  if (!session) return { erro: 'Acesso restrito à Direção' }
  const limpo = nome.replace(/\s+/g, ' ').trim()
  if (limpo.length < 2) return { erro: 'Digite o nome da disciplina' }
  if (limpo.length > 150) return { erro: 'Nome muito longo' }

  const turma = await prisma.turma.findUnique({
    where: { id: turmaId },
    select: { nome: true, cursoId: true, serie: true, anoLetivo: true, disciplinas: { select: { nome: true } } }
  })
  if (!turma) return { erro: 'Turma não encontrada' }
  const igual = turma.disciplinas.find(d => normalizarNome(d.nome) === normalizarNome(limpo))
  if (igual) return { erro: `A turma já tem "${igual.nome}"` }

  let naMatriz = false
  await prisma.$transaction(async tx => {
    const d = await tx.disciplina.create({ data: { nome: limpo, turmaId } })
    if (turma.cursoId && turma.serie) {
      const ano = anoDa(turma)
      const itens = await tx.matrizCurricular.findMany({ where: { cursoId: turma.cursoId, serie: turma.serie, anoLetivo: ano }, select: { nome: true } })
      if (!itens.some(i => normalizarNome(i.nome) === normalizarNome(limpo))) {
        await tx.matrizCurricular.create({ data: { nome: limpo, cursoId: turma.cursoId, serie: turma.serie, anoLetivo: ano } })
        naMatriz = true
      }
    }
    await tx.auditLog.create({ data: {
      userId: session.user.id, entityType: 'DISCIPLINA', entityId: d.id, action: 'CREATE',
      details: JSON.stringify({ acao: 'DISCIPLINA_ADICIONADA_NA_TURMA', turma: turma.nome, nome: limpo, incluidaNaMatriz: naMatriz })
    } })
  })
  revalidatePath(`/dashboard/turmas/${turmaId}/editar`)
  return { ok: true, naMatriz }
}
