// Boletim online: o resultado de um aluno na turma atual (mesma regra da tela de Resultados).
import { prisma } from '@/lib/prisma'
import { assuntoDoBanco, quandoRecuperacao } from '@/lib/recuperacao-assunto'
import { isTurmaSemestral, mediaDasUnidades, situacaoFinal, unidadesDaTurma, unidadesFaltando, type Unidade } from '@/lib/conselho'

export type DisciplinaBoletim = {
  nome: string
  /** null = nenhuma nota lançada pelo professor */
  unidades: { u: Unidade; nota: number | null; infrequente: boolean }[] | null
  media: number | null
  situacao: 'AP' | 'RC' | null
  faltando: Unidade[]
  /** só preenchido quando a situação é RC */
  recuperacao: { assunto: string; quando: string | null; orientacoes: string | null } | null
}
export type Boletim = {
  nome: string; turma: string; curso: string | null; turno: string | null; periodo: string
  encerrada: boolean; semestral: boolean; disciplinas: DisciplinaBoletim[]
}

export const normalizarMatricula = (m: string) => m.replace(/[\s.]/g, '').toUpperCase().slice(0, 30)

export async function boletimDoAluno(matricula: string): Promise<Boletim | null> {
  const e = await prisma.estudante.findUnique({
    where: { matricula },
    select: {
      nome: true,
      turma: { select: { id: true, nome: true, curso: true, turno: true, modalidade: true, status: true, createdAt: true, anoLetivo: true,
        disciplinas: { select: { id: true, nome: true, recuperacaoAssunto: true, recuperacaoData: true, recuperacaoOrientacoes: true, recuperacaoAtualizadoEm: true, recuperacaoAtualizadoPor: true }, orderBy: { nome: 'asc' } } } },
      notas: { select: { disciplinaId: true, nota1: true, nota2: true, nota3: true, isDesistenteUnid1: true, isDesistenteUnid2: true, isDesistenteUnid3: true } }
    }
  })
  if (!e) return null
  const t = e.turma
  const semestral = isTurmaSemestral(t.modalidade)
  const notas = new Map(e.notas.map(n => [n.disciplinaId, n]))
  const ano = t.anoLetivo ?? t.createdAt.getFullYear()
  return {
    nome: e.nome, turma: t.nome, curso: t.curso, turno: t.turno,
    periodo: semestral ? `${ano}.${t.createdAt.getMonth() < 6 ? 1 : 2}` : String(ano),
    encerrada: t.status === 'ENCERRADA', semestral,
    disciplinas: t.disciplinas.map(d => {
      const n = notas.get(d.id)
      if (!n) return { nome: d.nome, unidades: null, media: null, situacao: null, faltando: [], recuperacao: null }
      const inf = { 1: n.isDesistenteUnid1, 2: n.isDesistenteUnid2, 3: n.isDesistenteUnid3 }
      const val = { 1: n.nota1, 2: n.nota2, 3: n.nota3 }
      const situacao = situacaoFinal(n, semestral)
      const a = situacao === 'RC' ? assuntoDoBanco(d) : null
      return {
        nome: d.nome,
        unidades: unidadesDaTurma(semestral).map(u => ({ u, nota: val[u] ?? null, infrequente: !!inf[u] })),
        media: mediaDasUnidades(n, semestral),
        situacao,
        faltando: unidadesFaltando(n, semestral),
        recuperacao: a ? { assunto: a.assunto, quando: quandoRecuperacao(a), orientacoes: a.orientacoes } : null,
      }
    })
  }
}
