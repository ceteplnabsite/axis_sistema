/**
 * Fase 1 — Gera planilha de revisão (SOMENTE LEITURA, não grava nada no banco).
 *
 * Lê o PDF do Urânia ("Relatório de Professores (Individual)"), extrai os pares
 * TURMA(Disciplina) de turmas PROEJA/PROSUB (sufixo eja/sub) e cruza com o banco,
 * já considerando as decisões de ajuste de turmas definidas em AJUSTES_TURMAS.
 *
 * Uso:
 *   npx tsx scripts/horario-2026-2/gerar-planilha.ts "dados/HORÁRIO.GERAL.2026.2.pdf"
 *
 * Saída: dados/planilha-revisao-proeja-prosub.csv (separador ";", abre no Excel)
 *
 * Com --regulares: analisa as turmas REGULARES (EPTM) em vez de PROEJA/SUB e salva em
 * dados/planilha-revisao-regulares.csv (só leitura — o aplicar.ts lê a planilha PROEJA/SUB).
 */
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { AJUSTES_TURMAS, DUPLAS, NOMES_DISCIPLINAS, ALIAS_TURMAS_PDF } from '../../dados/horario-2026-2/ajustes'

const prisma = new PrismaClient()
const REGULARES = process.argv.includes('--regulares')

// ── Normalização ────────────────────────────────────────────────────────────
const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'as', 'os', 'no', 'na', 'p', 'para', 'ao'])

export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ') // pontuação vira espaço ("ESTAB.DE" → "estab de")
    .replace(/\s+/g, ' ')
    .trim()
}
const palavras = (s: string) => normalizar(s).split(' ').filter(w => w.length > 1 && !STOP.has(w))

/** Mesmo comportamento do Importar Horário para o código da turma (…EJA → …E) */
export function normCodTurma(c: string): string {
  c = c.toUpperCase()
  if (/EJA$/.test(c)) return c.replace(/EJA$/, '').replace(/([A-Z]{2,})E([NMVI])(\d+)$/, '$1$2$3') + 'E'
  return c
}

type Conf = 'EXATA' | 'ALTA' | 'MEDIA' | 'MESMO_PROFESSOR'
/** Compara nome do horário com nome do banco. Exige cobertura nos DOIS sentidos
 *  para evitar falsos positivos tipo SOCIOLOGIA → "Empreendedorismo Int Soci". */
export function compararDisc(nomeBanco: string, nomeHorario: string): { conf: Conf; score: number } | null {
  const b = normalizar(nomeBanco), h = normalizar(nomeHorario)
  if (b === h) return { conf: 'EXATA', score: 1 }
  const pb = palavras(nomeBanco), ph = palavras(nomeHorario)
  if (!pb.length || !ph.length) return null
  if (pb.join(' ') === ph.join(' ')) return { conf: 'EXATA', score: 1 }
  const bate = (x: string, y: string) => x.startsWith(y) || y.startsWith(x)
  const covH = ph.filter(x => pb.some(y => bate(x, y))).length / ph.length
  const covB = pb.filter(y => ph.some(x => bate(x, y))).length / pb.length
  if (covH === 1 && covB === 1) return { conf: 'ALTA', score: 0.99 }
  if (covH >= 0.6 && covB >= 0.6) return { conf: 'MEDIA', score: (covH + covB) / 2 }
  return null
}

// ── Leitura do PDF ──────────────────────────────────────────────────────────
type Entrada = { professor: string; turma: string; disc: string }

async function lerPdf(arquivo: string): Promise<Entrada[]> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(arquivo)), verbosity: 0 }).promise
  let txt = ''
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent()
    txt += ' ' + tc.items.map((it: any) => it.str).join(' ')
  }
  txt = txt.replace(/CETEP\/LN-AB.*?\(www\.horario\.com\.br\)/g, ' ')
  // Cabeçalho de cada professor: "NOME  Hor   Seg   Ter   Qua   Qui   Sex"
  // (o nome pode ter apelido entre parênteses, ex: "FULANO SILVA(APELIDO)")
  const partes = txt.split(/\s{2,}([^\s()\-][^()]*?(?:\([A-Z ]+\))?)\s+Hor\s+Seg\s+Ter\s+Qua\s+Qui\s+Sex/)
  const out: Entrada[] = []
  for (let i = 1; i < partes.length; i += 2) {
    const professor = partes[i].trim()
    const re = /([0-9][A-Z0-9]*?)\s*\(([^)]*)\)/gi
    let m
    while ((m = re.exec(partes[i + 1]))) out.push({ professor, turma: m[1].toUpperCase(), disc: m[2].trim() })
  }
  return out
}

// ── CSV ─────────────────────────────────────────────────────────────────────
const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

async function main() {
  const arquivo = process.argv.slice(2).find(a => !a.startsWith('--'))
  if (!arquivo) throw new Error('Informe o caminho do PDF')
  const entradas = await lerPdf(arquivo)
  const todosProfs = [...new Set(entradas.map(e => e.professor))]
  console.log(`PDF: ${todosProfs.length} professores, ${entradas.length} aulas`)

  // pares únicos de PROEJA/PROSUB
  const pares: Entrada[] = []
  for (const e of entradas) {
    if (/(EJA|SUB)$/.test(e.turma) === REGULARES) continue
    if (!pares.some(p => p.turma === e.turma && normalizar(p.disc) === normalizar(e.disc))) pares.push(e)
  }

  // ── turmas (aplicando ajustes simulados) ──
  const turmasBanco = await prisma.turma.findMany({
    include: { disciplinas: { include: { usuariosPermitidos: { select: { id: true, name: true } } } } }
  })
  const renomear = new Map(AJUSTES_TURMAS.renomear.map(r => [r.id, r.novoNome]))
  const encerrar = new Set(AJUSTES_TURMAS.encerrar.map(e => e.id))
  const nomeEfetivo = (t: { id: string; nome: string }) => (renomear.get(t.id) ?? t.nome).toUpperCase()
  const statusEfetivo = (t: { id: string; status: string }) => (encerrar.has(t.id) ? 'ENCERRADA' : t.status)

  function resolverTurma(codPdf: string) {
    // aceita o código corrigido (alias) E o original: antes do corrigir-turmas.ts
    // a turma ainda tem o nome antigo (ex: 1TADMSUB), depois tem o novo (1TADMV1SUB)
    const cod = ALIAS_TURMAS_PDF[codPdf] ?? codPdf
    const alvos = new Set([normCodTurma(cod), cod, normCodTurma(codPdf), codPdf])
    const cands = turmasBanco.filter(t => alvos.has(nomeEfetivo(t)))
    const ativas = cands.filter(t => statusEfetivo(t) !== 'ENCERRADA')
    if (ativas.length === 1) return { turma: ativas[0], erro: null }
    // antes da mescla existem as duas (ex: cópia 2ENFN1SUB e real 2TEN1SUB): usa a de código
    // original do horário — o corrigir-turmas.ts depois move as disciplinas para a real
    const originais = ativas.filter(t => [normCodTurma(codPdf), codPdf].includes(nomeEfetivo(t)))
    if (cod !== codPdf && originais.length === 1) return { turma: originais[0], erro: null }
    if (ativas.length > 1) return { turma: null, erro: `Mais de uma turma ATIVA com o código ${[...alvos][0]}` }
    if (cands.length) return { turma: null, erro: `Turma ${[...alvos][0]} existe mas está ENCERRADA` }
    return { turma: null, erro: `Turma ${[...alvos][0]} não existe no banco` }
  }

  // ── professores ──
  const usuarios = await prisma.user.findMany({
    where: { isPortalUser: false },
    select: {
      id: true, name: true, isActive: true,
      disciplinasPermitidas: { select: { nome: true, turma: { select: { nome: true } } } }
    }
  })
  /** Duplas "A/B" seguem a tabela DUPLAS (ajustes.ts); fora dela, ficam para revisão */
  const nomeQueAssume = (n: string) => (DUPLAS[n.toUpperCase()] ?? n).replace(/\(.*\)/, '').trim()
  const cacheProf = new Map<string, { id: string; name: string; obs: string } | { id: null; name: string; obs: string }>()
  function resolverProfessor(nomePdf: string) {
    if (cacheProf.has(nomePdf)) return cacheProf.get(nomePdf)!
    const busca = nomeQueAssume(nomePdf)
    const toks = normalizar(busca).split(' ')
    let cands = usuarios.filter(u => {
      const w = normalizar(u.name || '').split(' ')
      return toks.every(t => w.includes(t))
    })
    let res: any
    if (cands.length > 1) {
      // "MARIA" não é a "ANA MARIA": descarta quem bate com outro nome mais completo do PDF
      const outrosNomes = todosProfs.map(nomeQueAssume).filter(n => n !== busca)
      const semOutros = cands.filter(u => {
        const w = normalizar(u.name || '').split(' ')
        return !outrosNomes.some(n => {
          const t = normalizar(n).split(' ')
          return t.length > toks.length && toks.every(x => t.includes(x)) && t.every(x => w.includes(x))
        })
      })
      if (semOutros.length) cands = semOutros
    }
    if (cands.length > 1) {
      // desempate: quem já tem vínculos com aulas deste professor no PDF (inclusive turmas regulares)
      const aulas = entradas.filter(e => e.professor === nomePdf)
      const pontos = cands.map(u => ({
        u,
        n: u.disciplinasPermitidas.filter(d =>
          aulas.some(a => normCodTurma(a.turma) === d.turma.nome.toUpperCase() && compararDisc(d.nome, a.disc))
        ).length
      })).sort((a, b) => b.n - a.n)
      if (pontos[0].n > 0 && pontos[1].n === 0) cands = [pontos[0].u]
    }
    if (nomePdf.includes('/') && !DUPLAS[nomePdf.toUpperCase()]) {
      const r = { id: null, name: '', obs: `Dupla "${nomePdf}" sem definição de quem assume (adicione em DUPLAS no ajustes.ts).` }
      cacheProf.set(nomePdf, r)
      return r
    }
    const pre = nomePdf.includes('/') ? `Dupla no horário, assume "${busca}". ` : ''
    if (cands.length === 1) {
      const u = cands[0]
      res = { id: u.id, name: u.name!.trim(), obs: pre + (u.isActive ? '' : 'USUÁRIO INATIVO. ') }
    } else if (cands.length === 0) {
      res = { id: null, name: '', obs: pre + `Professor "${busca}" não cadastrado.` }
    } else {
      res = { id: null, name: cands.map(c => c.name!.trim()).join(' | '), obs: pre + 'Mais de um usuário com esse nome — escolha.' }
    }
    cacheProf.set(nomePdf, res)
    return res
  }

  // ── nome para disciplina nova: reaproveita a grafia que já existe no sistema ──
  const matrizes = await prisma.matrizCurricular.findMany({ select: { nome: true, cursoId: true } })
  const catalogo = [
    ...turmasBanco.flatMap(t => t.disciplinas.map(d => ({ nome: d.nome.trim(), cursoId: t.cursoId }))),
    ...matrizes.map(m => ({ nome: m.nome.trim(), cursoId: m.cursoId as string | null }))
  ]
  const ehTudoMaiusculo = (s: string) => s === s.toUpperCase()
  /** entre variantes, prefere a mais usada que não seja TUDO MAIÚSCULO e tenha acento */
  function melhorGrafia(nomes: string[]): string {
    const freq = new Map<string, number>()
    for (const n of nomes) freq.set(n, (freq.get(n) ?? 0) + 1)
    return [...freq].sort(([a, fa], [b, fb]) =>
      Number(ehTudoMaiusculo(a)) - Number(ehTudoMaiusculo(b)) ||
      Number(normalizar(b) !== b.toLowerCase()) - Number(normalizar(a) !== a.toLowerCase()) ||
      fb - fa
    )[0][0]
  }
  const dicionario = new Map(Object.entries(NOMES_DISCIPLINAS).map(([k, v]) => [palavras(k).join(' '), v]))
  function sugerirNome(nomePdf: string, cursoId: string | null): { nome: string; origem: string } {
    const chave = palavras(nomePdf).join(' ')
    // 0. dicionário curado (ajustes.ts) tem prioridade — evita copiar grafias já abreviadas no sistema
    if (dicionario.has(chave)) return { nome: dicionario.get(chave)!, origem: 'DICIONÁRIO (nome completo)' }
    // 1. mesmo nome (ignorando acento/maiúsculas/pontuação) em qualquer lugar do sistema
    const iguais = catalogo.filter(c => palavras(c.nome).join(' ') === chave).map(c => c.nome)
    if (iguais.length) return { nome: melhorGrafia(iguais), origem: 'SISTEMA (mesmo nome)' }
    // 2. abreviação de uma disciplina do mesmo curso (cobertura total nos dois sentidos)
    if (cursoId) {
      const doCurso = catalogo.filter(c => c.cursoId === cursoId && compararDisc(c.nome, nomePdf)?.conf === 'ALTA')
      const distintos = [...new Set(doCurso.map(c => palavras(c.nome).join(' ')))]
      if (distintos.length === 1) return { nome: melhorGrafia(doCurso.map(c => c.nome)), origem: 'SISTEMA (mesmo curso, nome completo)' }
    }
    return { nome: nomePdf, origem: 'HORÁRIO (sem correspondência — ajuste se quiser)' }
  }

  // ── cruzamento disciplina a disciplina (1:1 por turma, exatas primeiro) ──
  type Linha = Record<string, string>
  const linhas: Linha[] = []
  const porTurma = new Map<string, Entrada[]>()
  for (const p of pares) { if (!porTurma.has(p.turma)) porTurma.set(p.turma, []); porTurma.get(p.turma)!.push(p) }

  for (const [codPdf, itens] of [...porTurma].sort(([a], [b]) => a.localeCompare(b))) {
    const { turma, erro } = resolverTurma(codPdf)
    const usados = new Set<string>()
    const match = new Map<Entrada, { d: any; conf: Conf }>()
    if (turma) {
      // todas as combinações candidatas, melhor score primeiro
      const cands: { e: Entrada; d: any; conf: Conf; score: number }[] = []
      for (const e of itens) for (const d of turma.disciplinas) {
        const r = compararDisc(d.nome, e.disc)
        if (r) cands.push({ e, d, ...r })
      }
      cands.sort((a, b) => b.score - a.score)
      for (const c of cands) {
        if (match.has(c.e) || usados.has(c.d.id)) continue
        match.set(c.e, { d: c.d, conf: c.conf }); usados.add(c.d.id)
      }
      // abreviação que não bateu direto, mas cujo nome completo (dicionário/sistema) já existe na turma
      for (const e of itens) {
        if (match.has(e)) continue
        const alvo = palavras(sugerirNome(e.disc, turma.cursoId).nome).join(' ')
        const d = turma.disciplinas.find(x => !usados.has(x.id) && palavras(x.nome).join(' ') === alvo)
        if (d) { match.set(e, { d, conf: 'ALTA' }); usados.add(d.id) }
      }
      // nome diferente, mas sobrou na turma UMA disciplina fora do horário que já é do
      // mesmo professor (ex: "PROJETO DE TEC SOCIAIS" ↔ "PTSESES", ambas do mesmo professor)
      for (const e of itens) {
        if (match.has(e)) continue
        const pid = resolverProfessor(e.professor).id
        if (!pid) continue
        const doProf = turma.disciplinas.filter(x => !usados.has(x.id) && x.usuariosPermitidos.some((u: any) => u.id === pid))
        const pendentesDoProf = itens.filter(x => !match.has(x) && resolverProfessor(x.professor).id === pid)
        if (doProf.length === 1 && pendentesDoProf.length === 1) { match.set(e, { d: doProf[0], conf: 'MESMO_PROFESSOR' as Conf }); usados.add(doProf[0].id) }
      }
    }
    for (const e of itens) {
      const prof = resolverProfessor(e.professor)
      const m = match.get(e)
      const atual = m?.d.usuariosPermitidos ?? []
      let acao: string, obs = prof.obs
      if (!turma) { acao = 'REVISAR'; obs = erro + '. ' + obs }
      else if (!prof.id) acao = 'REVISAR'
      else if (!m) { acao = 'CRIAR_DISCIPLINA'; obs += 'Disciplina não existe nesta turma. Ajuste o nome em disciplina_nova se quiser. ' }
      else if (atual.some((u: any) => u.id === prof.id)) {
        const extras = atual.filter((u: any) => u.id !== prof.id)
        if (extras.length) { acao = 'TRANSFERIR'; obs += `Tem professor a mais: ${extras.map((u: any) => u.name?.trim()).join(', ')} (será removido). ` }
        else acao = 'OK'
      }
      else if (atual.length) { acao = 'TRANSFERIR'; obs += `Hoje está com ${atual.map((u: any) => u.name?.trim()).join(', ')}. ` }
      else acao = 'VINCULAR'
      if (m && m.conf === 'MEDIA') obs += 'Nome da disciplina parecido mas não igual — confira. '
      if (m && m.conf === 'MESMO_PROFESSOR') obs += 'Nome diferente do horário; reconhecida por ser a única disciplina do mesmo professor nesta turma. '
      const sugestao = !m && turma ? sugerirNome(e.disc, turma.cursoId) : null
      linhas.push({
        acao,
        turma_pdf: codPdf,
        turma_banco: turma ? nomeEfetivo(turma) : '',
        disciplina_pdf: e.disc,
        disciplina_banco: m?.d.nome ?? '',
        disciplina_nova: sugestao?.nome ?? '',
        origem_nome_novo: sugestao?.origem ?? '',
        confianca_nome: m ? m.conf : '',
        professor_pdf: e.professor,
        professor_sistema: prof.name,
        professor_atual: atual.map((u: any) => u.name?.trim()).join(', '),
        observacao: obs.trim(),
        turma_id: turma?.id ?? '',
        disciplina_id: m?.d.id ?? '',
        professor_id: prof.id ?? ''
      })
    }
  }

  const cols = Object.keys(linhas[0])
  const csv = '﻿' + [cols.join(';'), ...linhas.map(l => cols.map(c => csvCell(l[c])).join(';'))].join('\r\n')
  const destino = path.join('dados', REGULARES ? 'planilha-revisao-regulares.csv' : 'planilha-revisao-proeja-prosub.csv')
  fs.writeFileSync(destino, csv)

  const cont: Record<string, number> = {}
  for (const l of linhas) cont[l.acao] = (cont[l.acao] ?? 0) + 1
  console.log(`Pares ${REGULARES ? 'REGULARES' : 'PROEJA/PROSUB'}: ${linhas.length}`, cont)
  console.log(`Disciplinas com nome parecido (confira): ${linhas.filter(l => l.confianca_nome === 'MEDIA').length}`)
  console.log(`Planilha salva em ${destino}`)
}

main().finally(() => prisma.$disconnect())
