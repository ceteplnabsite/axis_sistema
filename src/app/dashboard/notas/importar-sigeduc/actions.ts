'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canGradeDisciplina } from '@/lib/permissions'
import { isTurmaSemestral } from '@/lib/conselho'
import { casarNomes, nomeSemLigacoes, normalizarNome, semelhancaComponente } from '@/lib/sigeduc'

export type TurmaCandidata = {
  turmaId: string; turma: string; batem: number; totalAxis: number
  disciplinas: { id: string; nome: string; semelhanca: number }[]
}

/**
 * Procura, entre as turmas ativas em que o usuário lança notas, a que tem os mesmos estudantes
 * da tabela do SIGEduc (pelo nome) e, nela, a disciplina mais parecida com o componente.
 */
export async function procurarTurma(nomes: string[], componente: string): Promise<{ candidatas: TurmaCandidata[] } | { erro: string }> {
  const session = await auth()
  if (!session?.user || session.user.isPortalUser) return { erro: 'Não autorizado' }
  const u = session.user
  const chaves = new Set(nomes.slice(0, 300).map(normalizarNome))
  const chaves2 = new Set(nomes.slice(0, 300).map(nomeSemLigacoes))

  const disciplinas = await prisma.disciplina.findMany({
    where: { turma: { status: 'ATIVA' }, ...(u.isSuperuser || u.isDirecao ? {} : { usuariosPermitidos: { some: { id: u.id } } }) },
    select: { id: true, nome: true, turmaId: true }
  })
  const porTurma = new Map<string, { id: string; nome: string }[]>()
  for (const d of disciplinas) porTurma.set(d.turmaId, [...(porTurma.get(d.turmaId) ?? []), { id: d.id, nome: d.nome }])

  const turmas = await prisma.turma.findMany({
    where: { id: { in: [...porTurma.keys()] } },
    select: { id: true, nome: true, estudantes: { select: { nome: true } } }
  })
  const candidatas: TurmaCandidata[] = turmas.map(t => ({
    turmaId: t.id, turma: t.nome, totalAxis: t.estudantes.length,
    batem: t.estudantes.filter(e => chaves.has(normalizarNome(e.nome)) || chaves2.has(nomeSemLigacoes(e.nome))).length,
    disciplinas: (porTurma.get(t.id) ?? [])
      .map(d => ({ ...d, semelhanca: semelhancaComponente(d.nome, componente) }))
      .sort((a, b) => b.semelhanca - a.semelhanca || a.nome.localeCompare(b.nome))
  })).filter(c => c.batem > 0).sort((a, b) => b.batem - a.batem || a.turma.localeCompare(b.turma)).slice(0, 8)
  return { candidatas }
}

export type AlunoAxis = {
  matricula: string; nome: string
  n1: number | null; n2: number | null; n3: number | null
  inf1: boolean; inf2: boolean; inf3: boolean
}

/** Notas atuais da disciplina no Áxis (para comparar com o SIGEduc) */
export async function notasAtuais(disciplinaId: string): Promise<{ semestral: boolean; turma: string; disciplina: string; encerrada: boolean; alunos: AlunoAxis[] } | { erro: string }> {
  const session = await auth()
  if (!session?.user) return { erro: 'Não autorizado' }
  if (!await canGradeDisciplina(session.user, disciplinaId)) return { erro: 'Você não lança notas nesta disciplina' }
  const d = await prisma.disciplina.findUnique({
    where: { id: disciplinaId },
    select: { nome: true, turma: { select: { id: true, nome: true, modalidade: true, status: true, estudantes: { select: { matricula: true, nome: true }, orderBy: { nome: 'asc' } } } } }
  })
  if (!d) return { erro: 'Disciplina não encontrada' }
  const notas = await prisma.notaFinal.findMany({
    where: { disciplinaId, estudante: { turmaId: d.turma.id } },
    select: { estudanteId: true, nota1: true, nota2: true, nota3: true, isDesistenteUnid1: true, isDesistenteUnid2: true, isDesistenteUnid3: true }
  })
  const porAluno = new Map(notas.map(n => [n.estudanteId, n]))
  return {
    semestral: isTurmaSemestral(d.turma.modalidade), turma: d.turma.nome, disciplina: d.nome, encerrada: d.turma.status === 'ENCERRADA',
    alunos: d.turma.estudantes.map(e => {
      const n = porAluno.get(e.matricula)
      return { matricula: e.matricula, nome: e.nome, n1: n?.nota1 ?? null, n2: n?.nota2 ?? null, n3: n?.nota3 ?? null,
        inf1: !!n?.isDesistenteUnid1, inf2: !!n?.isDesistenteUnid2, inf3: !!n?.isDesistenteUnid3 }
    })
  }
}

// ───────── Mudanças de turma (o SIGEduc é soberano) ─────────

export type MudancaEntrada = { matricula: string; nome: string; turmaAtual: string; notasQueVem: number }
export type MudancaSaida = { matricula: string; nome: string }

const EVASAO = 'Transferidos / Evasão'

async function turmaDaDisciplina(disciplinaId: string) {
  const d = await prisma.disciplina.findUnique({
    where: { id: disciplinaId },
    select: { turma: { select: { id: true, nome: true, status: true, anoLetivo: true, disciplinas: { select: { id: true, nome: true } } } } }
  })
  return d?.turma ?? null
}

/** notas do aluno em turmas ATIVAS (período atual) que podem ir para a disciplina de mesmo nome da turma nova */
async function planoDeNotas(matricula: string, alvo: { id: string; disciplinas: { id: string; nome: string }[] }) {
  const notas = await prisma.notaFinal.findMany({
    where: { estudanteId: matricula },
    select: { id: true, disciplinaId: true, disciplina: { select: { nome: true, turmaId: true, turma: { select: { status: true } } } } }
  })
  const jaTem = new Set(notas.filter(n => n.disciplina.turmaId === alvo.id).map(n => n.disciplinaId))
  const destinoPorNome = new Map(alvo.disciplinas.map(d => [normalizarNome(d.nome), d.id]))
  const mover: { notaId: string; para: string }[] = []
  for (const n of notas) {
    if (n.disciplina.turmaId === alvo.id || n.disciplina.turma.status !== 'ATIVA') continue // encerrada = histórico
    const para = destinoPorNome.get(normalizarNome(n.disciplina.nome))
    if (para && !jaTem.has(para)) { mover.push({ notaId: n.id, para }); jaTem.add(para) } // nota que já existe na turma nova fica
  }
  return mover
}

/**
 * Compara a lista do SIGEduc com a escola inteira:
 * - entrar: nome do SIGEduc que não está nesta turma e é UMA única pessoa em outra turma do ano (ou na Evasão);
 * - sair: aluno desta turma que não aparece na lista do SIGEduc (vai para Transferidos / Evasão).
 * Nome repetido/ambíguo nunca entra nem sai sozinho.
 */
export async function planejarMudancasTurma(disciplinaId: string, nomesSigeduc: string[]): Promise<{ entrar: MudancaEntrada[]; sair: MudancaSaida[]; duvidas: string[] } | { erro: string }> {
  const session = await auth()
  if (!session?.user) return { erro: 'Não autorizado' }
  if (!await canGradeDisciplina(session.user, disciplinaId)) return { erro: 'Você não lança notas nesta disciplina' }
  const alvo = await turmaDaDisciplina(disciplinaId)
  if (!alvo) return { erro: 'Turma não encontrada' }
  if (alvo.status === 'ENCERRADA') return { entrar: [], sair: [], duvidas: [] }

  const nomes = [...new Set(nomesSigeduc.slice(0, 300))]
  const daTurma = await prisma.estudante.findMany({ where: { turmaId: alvo.id }, select: { matricula: true, nome: true } })
  const casados = casarNomes(nomes, daTurma)
  const naoAchados = nomes.filter(n => casados.get(n) === null)

  // quem sai: aluno desta turma que não tem nenhum nome parecido na lista do SIGEduc
  const chaves = new Set(nomes.flatMap(n => [normalizarNome(n), nomeSemLigacoes(n)]))
  const usados = new Set([...casados.values()].flatMap(v => (v && 'matricula' in v ? [v.matricula] : [])))
  const sair = daTurma.filter(a => !usados.has(a.matricula) && !chaves.has(normalizarNome(a.nome)) && !chaves.has(nomeSemLigacoes(a.nome)))

  // quem entra: procura na escola (turmas do ano letivo + Evasão), fora desta turma
  const entrar: MudancaEntrada[] = [], duvidas: string[] = []
  if (naoAchados.length) {
    const escola = await prisma.estudante.findMany({
      where: { turmaId: { not: alvo.id }, turma: { OR: [{ anoLetivo: alvo.anoLetivo ?? undefined }, { nome: EVASAO }] } },
      select: { matricula: true, nome: true, turma: { select: { nome: true } } }
    })
    const naEscola = casarNomes(naoAchados, escola)
    const porMat = new Map(escola.map(e => [e.matricula, e]))
    for (const n of naoAchados) {
      const r = naEscola.get(n)
      if (r && 'matricula' in r) {
        const e = porMat.get(r.matricula)!
        entrar.push({ matricula: e.matricula, nome: e.nome, turmaAtual: e.turma.nome, notasQueVem: (await planoDeNotas(e.matricula, alvo)).length })
      } else if (r && 'ambiguo' in r) duvidas.push(n)
    }
  }
  return { entrar, sair: sair.map(a => ({ matricula: a.matricula, nome: a.nome })), duvidas }
}

/** Aplica as mudanças de turma (confirmadas pelo professor na prévia). Tudo numa transação, com auditoria. */
export async function aplicarMudancasTurma(disciplinaId: string, entrar: string[], sair: string[]): Promise<{ ok: true; entraram: number; sairam: number; notasMovidas: number } | { erro: string }> {
  const session = await auth()
  if (!session?.user) return { erro: 'Não autorizado' }
  if (!await canGradeDisciplina(session.user, disciplinaId)) return { erro: 'Você não lança notas nesta disciplina' }
  const alvo = await turmaDaDisciplina(disciplinaId)
  if (!alvo || alvo.status === 'ENCERRADA') return { erro: 'Turma não encontrada ou encerrada' }

  // confere de novo no servidor (o que chegou do navegador não basta)
  const plano = await prisma.estudante.findMany({ where: { matricula: { in: [...entrar, ...sair] } }, select: { matricula: true, nome: true, turmaId: true, turma: { select: { nome: true } } } })
  const porMat = new Map(plano.map(e => [e.matricula, e]))
  if (entrar.some(m => !porMat.has(m) || porMat.get(m)!.turmaId === alvo.id)) return { erro: 'A lista mudou desde a prévia. Recarregue e confira de novo.' }
  if (sair.some(m => porMat.get(m)?.turmaId !== alvo.id)) return { erro: 'A lista mudou desde a prévia. Recarregue e confira de novo.' }

  let evasao = await prisma.turma.findFirst({ where: { nome: EVASAO }, select: { id: true } })
  if (!evasao && sair.length) evasao = await prisma.turma.create({ data: { nome: EVASAO, anoLetivo: alvo.anoLetivo }, select: { id: true } })

  const movimentos = await Promise.all(entrar.map(async m => ({ m, notas: await planoDeNotas(m, alvo) })))
  const notasMovidas = movimentos.reduce((s, x) => s + x.notas.length, 0)

  await prisma.$transaction([
    ...entrar.map(m => prisma.estudante.update({ where: { matricula: m }, data: { turmaId: alvo.id, turmaAnteriorId: porMat.get(m)!.turmaId, status: 'ATIVO' } })),
    ...movimentos.flatMap(x => x.notas.map(n => prisma.notaFinal.update({ where: { id: n.notaId }, data: { disciplinaId: n.para } }))),
    ...(sair.length ? [prisma.estudante.updateMany({ where: { matricula: { in: sair }, turmaId: alvo.id }, data: { turmaId: evasao!.id, turmaAnteriorId: alvo.id, status: 'REMOVIDO_VIA_VARREDURA' } })] : []),
    prisma.auditLog.createMany({ data: [
      ...movimentos.map(x => ({ userId: session.user.id, entityType: 'ESTUDANTE', entityId: x.m, action: 'UPDATE',
        details: JSON.stringify({ acao: 'SIGEDUC_ENTRAR_TURMA', de: porMat.get(x.m)!.turma.nome, para: alvo.nome, notasMovidas: x.notas.length, origem: 'importação SIGEduc' }) })),
      ...sair.map(m => ({ userId: session.user.id, entityType: 'ESTUDANTE', entityId: m, action: 'UPDATE',
        details: JSON.stringify({ acao: 'SIGEDUC_SAIR_PARA_EVASAO', de: alvo.nome, para: EVASAO, origem: 'importação SIGEduc' }) })),
    ] }),
  ])
  return { ok: true, entraram: entrar.length, sairam: sair.length, notasMovidas }
}
