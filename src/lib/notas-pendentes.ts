// Cálculo de notas não lançadas por professor + e-mail de aviso.
// Usado pelo botão "Avisar professores" do Conselho e pelo lembrete diário (cron).
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { isTurmaSemestral, unidadesDaTurma, unidadesFaltando, type Unidade } from '@/lib/conselho'
import { MAX_NOMES_POR_DISCIPLINA } from '@/config/lembrete-notas'

/** Só alunos ativos contam (removidos na varredura / concluídos não geram pendência) */
export const ESTUDANTE_ATIVO: Prisma.EstudanteWhereInput = { OR: [{ status: 'ATIVO' }, { status: null }] }

export type PendenciaDisciplina = {
  turmaId: string
  turma: string
  disciplina: string
  semestral: boolean
  alunos: { nome: string; unidades: Unidade[] }[]
}

export type PendenciasProfessor = { id: string; nome: string; email: string; ativo: boolean; itens: PendenciaDisciplina[] }

/**
 * Pendências (aluno ativo × disciplina × unidade sem nota) agrupadas por professor.
 * `cobrar` limita quais unidades contam (ex.: só as com prazo vencido); padrão = todas da turma.
 */
export async function pendenciasPorProfessor(
  turmas: Prisma.TurmaWhereInput,
  cobrar: (semestral: boolean) => Unidade[] = unidadesDaTurma
) {
  const lista = await prisma.turma.findMany({
    where: { ...turmas, status: 'ATIVA' },
    select: {
      id: true, nome: true, modalidade: true,
      disciplinas: { select: { id: true, nome: true, usuariosPermitidos: { select: { id: true, name: true, email: true, isActive: true } } } },
      estudantes: {
        where: ESTUDANTE_ATIVO,
        select: {
          nome: true,
          notas: { select: { disciplinaId: true, nota1: true, nota2: true, nota3: true, isDesistenteUnid1: true, isDesistenteUnid2: true, isDesistenteUnid3: true } }
        },
        orderBy: { nome: 'asc' }
      }
    },
    orderBy: { nome: 'asc' }
  })

  const porProfessor = new Map<string, PendenciasProfessor>()
  const semProfessor: { turma: string; disciplina: string; alunos: number }[] = []

  for (const t of lista) {
    const semestral = isTurmaSemestral(t.modalidade)
    const cobradas = cobrar(semestral)
    if (!cobradas.length) continue
    for (const d of t.disciplinas) {
      const alunos = t.estudantes.flatMap(e => {
        const n = e.notas.find(x => x.disciplinaId === d.id)
        const falta = (n ? unidadesFaltando(n, semestral) : unidadesDaTurma(semestral)).filter(u => cobradas.includes(u))
        return falta.length ? [{ nome: e.nome, unidades: falta }] : []
      })
      if (!alunos.length) continue
      const item: PendenciaDisciplina = { turmaId: t.id, turma: t.nome, disciplina: d.nome, semestral, alunos }
      if (!d.usuariosPermitidos.length) { semProfessor.push({ turma: t.nome, disciplina: d.nome, alunos: alunos.length }); continue }
      for (const u of d.usuariosPermitidos) {
        if (!porProfessor.has(u.id)) porProfessor.set(u.id, { id: u.id, nome: u.name?.trim() || 'Professor(a)', email: u.email, ativo: u.isActive, itens: [] })
        porProfessor.get(u.id)!.itens.push(item)
      }
    }
  }
  return { porProfessor: [...porProfessor.values()], semProfessor }
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const ord = (us: number[]) => us.map(u => `${u}ª`).join(', ')

/** Resumo por unidade: { 1: 0, 2: 3, 3: 12 } (quantos alunos sem nota em cada unidade) */
export function faltasPorUnidade(item: PendenciaDisciplina) {
  const r: Partial<Record<Unidade, number>> = {}
  for (const u of unidadesDaTurma(item.semestral)) {
    const n = item.alunos.filter(a => a.unidades.includes(u)).length
    if (n) r[u] = n
  }
  return r
}

/** Última unidade da turma (3ª nas regulares, 2ª no PROEJA/PROSUB): fecha resultados e Conselho */
export const ultimaUnidade = (semestral: boolean): Unidade => (semestral ? 2 : 3)
const faltaUltima = (i: PendenciaDisciplina) => i.alunos.some(a => a.unidades.includes(ultimaUnidade(i.semestral)))

/** E-mail para um professor com tudo o que ele ainda não lançou. */
export function emailNotasPendentes(p: PendenciasProfessor, opcoes: { motivo: 'CONSELHO' | 'LEMBRETE' }) {
  const base = process.env.NEXTAUTH_URL || 'https://ceteplnab.com.br'
  const turmas = [...new Set(p.itens.map(i => i.turma))]
  const blocos = p.itens.map(i => {
    const faltas = faltasPorUnidade(i)
    const resumo = (Object.entries(faltas) as [string, number][]).filter(([, n]) => n > 0).map(([u, n]) => `${u}ª unidade: <b>${n}</b> aluno(s)`).join(' · ')
    const lista = i.alunos.slice(0, MAX_NOMES_POR_DISCIPLINA).map(a => `${esc(a.nome)} <span style="color:#94a3b8">(${ord(a.unidades)})</span>`).join(', ')
    const resto = i.alunos.length - MAX_NOMES_POR_DISCIPLINA
    const nomes = resto > 0 ? `${lista} <b>e mais ${resto} aluno(s)</b>` : lista
    const urgente = faltaUltima(i)
      ? `<p style="margin:8px 0 0; padding:8px 10px; background:#fff1f2; border-left:3px solid #e11d48; color:#9f1239; font-size:13px;"><b>${ultimaUnidade(i.semestral)}ª unidade:</b> precisamos dessas notas o quanto antes para montar os resultados finais e o Conselho de Classe.</p>`
      : ''
    return `
      <div style="margin:12px 0; padding:14px 16px; background:#f8fafc; border-radius:8px;${faltaUltima(i) ? ' border:1px solid #fecdd3;' : ''}">
        <p style="margin:0; color:#0f172a; font-weight:bold;">${esc(i.turma)} — ${esc(i.disciplina)}</p>
        <p style="margin:4px 0 8px; color:#475569; font-size:13px;">${resumo} <span style="color:#94a3b8">(${i.semestral ? 'semestral: 2 unidades' : 'anual: 3 unidades'})</span></p>
        <p style="margin:0; color:#64748b; font-size:12px; line-height:1.6;">${nomes}</p>
        ${urgente}
        <a href="${base}/dashboard/notas/lancar/${i.turmaId}" style="display:inline-block; margin-top:10px; color:#db2777; font-size:13px; font-weight:bold;">Lançar notas desta turma →</a>
      </div>`
  }).join('')
  const algumaUltima = p.itens.some(faltaUltima)
  const avisoUltima = algumaUltima
    ? `<p style="margin:0 0 16px; padding:12px 14px; background:#fff1f2; border-radius:8px; color:#9f1239;"><b>Atenção:</b> faltam notas da <b>última unidade</b> (3ª unidade nas turmas regulares; 2ª no PROEJA/PROSUB). Precisamos delas <b>o quanto antes</b> para montar os resultados e realizar o Conselho de Classe.</p>`
    : ''
  const intro = opcoes.motivo === 'CONSELHO'
    ? `O <b>Conselho de Classe</b> está aguardando notas que ainda não foram lançadas no Áxis:`
    : `Este é o lembrete diário do Áxis: ainda há <b>notas não lançadas</b> nas suas turmas. Assim que tudo estiver lançado, os lembretes param.`
  const assunto = opcoes.motivo === 'CONSELHO'
    ? `Notas pendentes — Conselho de Classe ${turmas.join(', ')}`
    : `${algumaUltima ? 'URGENTE — ' : ''}Lembrete: notas não lançadas (${turmas.length} turma${turmas.length > 1 ? 's' : ''})`
  const html = `<meta charset="utf-8">
    <div style="font-family:sans-serif; max-width:640px; margin:0 auto; padding:20px; border:1px solid #e2e8f0; border-radius:12px;">
      <h2 style="color:#0f172a; margin-top:0;">Olá, ${esc(p.nome)}!</h2>
      <p style="color:#475569;">${intro}</p>
      ${avisoUltima}
      ${blocos}
      <hr style="border:0; border-top:1px solid #e2e8f0; margin:24px 0;">
      <p style="color:#94a3b8; font-size:12px;">Mensagem automática do Áxis — CETEP LNAB. Unidades marcadas como Infrequente (INF) contam como lançadas. Por favor, não responda.</p>
    </div>`
  return { assunto, html }
}
