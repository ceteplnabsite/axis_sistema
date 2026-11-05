// Regras do Conselho de Classe / Recuperação — fonte única usada pela tela e pelas APIs.
// (Sem dependências de servidor: também é importado por componentes client.)

export const NOTA_MINIMA = 5

/** Status que o Conselho pode gravar (RECUPERACAO = desfazer uma decisão) */
export const STATUS_DECISAO_CONSELHO = ['APROVADO_RECUPERACAO', 'APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO', 'RECUPERACAO', 'DESISTENTE'] as const

export function isTurmaSemestral(modalidade?: string | null) {
  return modalidade === 'PROEJA' || modalidade === 'SUBSEQUENTE' || modalidade === 'PROSUB'
}

type NotasUnidades = {
  nota1?: number | null; nota2?: number | null; nota3?: number | null
  isDesistenteUnid1?: boolean; isDesistenteUnid2?: boolean; isDesistenteUnid3?: boolean
}

export type Unidade = 1 | 2 | 3
const NOTA_KEY = { 1: 'nota1', 2: 'nota2', 3: 'nota3' } as const
const INF_KEY = { 1: 'isDesistenteUnid1', 2: 'isDesistenteUnid2', 3: 'isDesistenteUnid3' } as const

export const unidadesDaTurma = (semestral: boolean): Unidade[] => (semestral ? [1, 2] : [1, 2, 3])
export const notaDaUnidade = (n: NotasUnidades, u: Unidade) => n[NOTA_KEY[u]] ?? null
export const infrequenteNaUnidade = (n: NotasUnidades, u: Unidade) => !!n[INF_KEY[u]]

/** Unidades ainda sem nota (unidade marcada como infrequente conta como lançada) */
export function unidadesFaltando(n: NotasUnidades, semestral: boolean): Unidade[] {
  return unidadesDaTurma(semestral).filter(u => notaDaUnidade(n, u) === null && !infrequenteNaUnidade(n, u))
}

/**
 * Média das unidades com 1 casa, arredondando a metade para cima (4,95 → 5,0).
 * Unidade sem nota vale 0. A conta é feita em décimos inteiros: em ponto flutuante,
 * (4,6 + 5,3) / 2 dava 4,9499… e arredondava para 4,9.
 */
export function mediaExata(notas: (number | null | undefined)[]): number {
  const decimos = notas.reduce<number>((s, x) => s + Math.round((x ?? 0) * 10), 0)
  return Math.round(decimos / notas.length) / 10
}

/** Média das unidades da turma (unidade sem nota ou infrequente sem nota vale 0) */
export function mediaDasUnidades(n: NotasUnidades, semestral: boolean): number {
  return mediaExata(semestral ? [n.nota1, n.nota2] : [n.nota1, n.nota2, n.nota3])
}

/**
 * Status automático depois de lançar as unidades: APROVADO só com todas as unidades
 * com nota e média ≥ 5. Infrequente sem nota não aprova sozinho: vai para o Conselho.
 */
export function statusPelasUnidades(n: NotasUnidades, semestral: boolean): 'APROVADO' | 'RECUPERACAO' {
  const todasComNota = unidadesDaTurma(semestral).every(u => notaDaUnidade(n, u) !== null)
  return todasComNota && mediaDasUnidades(n, semestral) >= NOTA_MINIMA ? 'APROVADO' : 'RECUPERACAO'
}

/** Decisões do Conselho que um novo lançamento não pode desfazer sozinho */
export const STATUS_PROTEGIDOS = ['APROVADO_RECUPERACAO', 'APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO', 'DESISTENTE'] as const
export const statusProtegido = (s?: string | null) => !!s && (STATUS_PROTEGIDOS as readonly string[]).includes(s)

/** Regra da escola: recuperação ≥ 5 aprova (-1 = não realizou) */
export function aprovadoNaRecuperacao(notaRecuperacao?: number | null) {
  return notaRecuperacao !== null && notaRecuperacao !== undefined && notaRecuperacao >= NOTA_MINIMA
}

/** Situação final de uma disciplina, como aparece em Resultados (tela e PDF) */
export type SituacaoFinal = 'AP' | 'RC' | 'AR' | 'AC' | 'DP' | 'CO' | 'DS' | 'EC'

export const SITUACOES_FINAIS: Record<SituacaoFinal, string> = {
  AP: 'Aprovado', AR: 'Aprovado na recuperação', AC: 'Aprovado pelo Conselho', RC: 'Recuperação',
  DP: 'Dependência', CO: 'Conservado', DS: 'Desistente', EC: 'Em curso (falta unidade)',
}

/**
 * Usa o status gravado (decisões do Conselho e da recuperação valem como estão).
 * RECUPERACAO só vira "RC" quando todas as unidades foram lançadas; antes disso é "EC".
 */
export function situacaoFinal(n: NotasUnidades & { status?: string | null }, semestral: boolean): SituacaoFinal {
  switch (n.status) {
    case 'DESISTENTE': return 'DS'
    case 'APROVADO_RECUPERACAO': return 'AR'
    case 'APROVADO_CONSELHO': return 'AC'
    case 'DEPENDENCIA': return 'DP'
    case 'CONSERVADO': return 'CO'
    case 'APROVADO': return 'AP'
  }
  return unidadesFaltando(n, semestral).length ? 'EC' : 'RC'
}
