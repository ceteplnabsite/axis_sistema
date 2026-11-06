// Relatório da turma (tela e PDF Global): mesma regra dos boletins e do Resultados.
import { isTurmaSemestral, mediaDasUnidades, statusParaBoletim, type Unidade } from '@/lib/conselho'

export type DisciplinaRelatorio = {
  id: string; nome: string; semNota: boolean
  n1: number | null; n2: number | null; n3: number | null; rec: number | null
  media: number | null; status: string | null; provisorio: boolean; faltando: Unidade[]; infrequente: boolean
}
export type EstudanteRelatorio = {
  matricula: string; nome: string; linhas: DisciplinaRelatorio[]; mediaGeral: number | null
  aprovadas: number; recuperacoes: number; provisorias: number; pendentes: number; outras: number; infrequente: boolean
}

type NotaEntrada = {
  disciplinaId: string; nota1: number | null; nota2: number | null; nota3: number | null; notaRecuperacao: number | null; status: string
  isDesistenteUnid1: boolean; isDesistenteUnid2: boolean; isDesistenteUnid3: boolean
}

export function resumoDaTurma(turma: {
  modalidade: string | null
  disciplinas: { id: string; nome: string }[]
  estudantes: { matricula: string; nome: string; notas: NotaEntrada[] }[]
}) {
  const semestral = isTurmaSemestral(turma.modalidade)
  const disciplinas = turma.disciplinas.map(d => ({ id: d.id, nome: d.nome }))
  const estudantes: EstudanteRelatorio[] = turma.estudantes.map(e => {
    const porDisc = new Map(e.notas.map(n => [n.disciplinaId, n]))
    const linhas: DisciplinaRelatorio[] = disciplinas.map(d => {
      const n = porDisc.get(d.id)
      if (!n) return { id: d.id, nome: d.nome, semNota: true, n1: null, n2: null, n3: null, rec: null, media: null, status: null, provisorio: false, faltando: [], infrequente: false }
      const st = statusParaBoletim(n, semestral)
      return {
        id: d.id, nome: d.nome, semNota: false, n1: n.nota1, n2: n.nota2, n3: semestral ? null : n.nota3, rec: n.notaRecuperacao,
        media: mediaDasUnidades(n, semestral), status: st.status, provisorio: st.provisorio, faltando: st.faltando,
        infrequente: n.status === 'DESISTENTE' || n.isDesistenteUnid1 || n.isDesistenteUnid2 || (!semestral && n.isDesistenteUnid3)
      }
    })
    const comNota = linhas.filter(l => !l.semNota)
    return {
      matricula: e.matricula, nome: e.nome, linhas,
      mediaGeral: comNota.length ? comNota.reduce((s, l) => s + (l.media ?? 0), 0) / comNota.length : null,
      aprovadas: comNota.filter(l => ['APROVADO', 'APROVADO_RECUPERACAO', 'APROVADO_CONSELHO'].includes(l.status!)).length,
      recuperacoes: comNota.filter(l => l.status === 'RECUPERACAO').length,
      provisorias: comNota.filter(l => l.provisorio).length,
      pendentes: linhas.filter(l => l.semNota || l.faltando.length).length,
      outras: comNota.filter(l => ['DEPENDENCIA', 'CONSERVADO'].includes(l.status!)).length,
      infrequente: linhas.some(l => l.infrequente),
    }
  })
  return { semestral, disciplinas, estudantes }
}

/** Situação geral do estudante na turma */
export function situacaoDoEstudante(e: EstudanteRelatorio): { texto: string; tipo: 'sem_notas' | 'recuperacao' | 'outras' | 'aprovado_parcial' | 'aprovado' } {
  if (!e.linhas.some(l => !l.semNota)) return { texto: 'Sem notas', tipo: 'sem_notas' }
  if (e.recuperacoes > 0) return { texto: `Recuperação em ${e.recuperacoes}`, tipo: 'recuperacao' }
  if (e.outras > 0) return { texto: 'Dependência / conservado', tipo: 'outras' }
  if (e.pendentes > 0) return { texto: 'Aprovado até agora', tipo: 'aprovado_parcial' }
  return { texto: 'Aprovado', tipo: 'aprovado' }
}
