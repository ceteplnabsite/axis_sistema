/**
 * Corrige turmas PROEJA/SUBSEQUENTE do semestre 2026.2 que foram cadastradas
 * com curso, nome ou modalidade errados (auditoria de 04/11/2026).
 *
 * Regras de segurança:
 *  - disciplina só é removida se estiver VAZIA (sem notas, questões e professor);
 *  - turma só é apagada se estiver VAZIA (sem alunos, disciplinas, provas, planos, horários);
 *  - tudo numa transação: qualquer erro desfaz tudo; padrão é SIMULAÇÃO.
 *
 * Uso:
 *   npx tsx scripts/horario-2026-2/corrigir-turmas.ts --usuario=admin
 *   npx tsx scripts/horario-2026-2/corrigir-turmas.ts --usuario=admin --executar --banco=<nome_do_banco>
 */
import 'dotenv/config'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const ORIGEM = 'script horario-2026-2 (corrigir-turmas)'
const ANO = 2026

type Curso = { id: string; sigla: string; nome: string; modalidade: string; turnos: string[] }

/** Turma ligada ao curso errado: cria o curso certo, religa e separa as matrizes */
const RELIGAR_CURSO: {
  nomeAtual: string; novoNome: string; novoTurno: string; curso: Curso; cursoErrado: string
  /** itens a tirar da matriz do curso errado (mesma série) — foram parar lá por causa desta turma */
  tirarDaMatrizErrada: string[]
}[] = [
  {
    nomeAtual: '1TADMSUB', novoNome: '1TADMV1SUB', novoTurno: 'Vespertino',
    curso: { id: 'subsequente_adm', sigla: 'ADM_SUB', nome: 'Técnico em Administração', modalidade: 'SUBSEQUENTE', turnos: ['Vespertino'] },
    cursoErrado: 'proeja_adm',
    tirarDaMatrizErrada: ['Logística'], // adicionado pelo aplicar.ts
  },
  {
    nomeAtual: '1TACN1SUB', novoNome: '1TACN1SUB', novoTurno: 'Noturno',
    curso: { id: 'subsequente_ac', sigla: 'AC_SUB', nome: 'Técnico em Análises Clínicas', modalidade: 'SUBSEQUENTE', turnos: ['Noturno'] },
    cursoErrado: 'proeja_ac',
    tirarDaMatrizErrada: ['Iniciação ao Trabalho Científico', 'Urinálise', 'Fundamentos e Gestão Laboratorial',
      'Coleta e Manipulação de Amostras', 'Microbiologia', 'Anatomofisiologia'], // adicionados pelo aplicar.ts
  },
  {
    nomeAtual: '1TVSN1E', novoNome: '1TVSN1E', novoTurno: 'Noturno',
    curso: { id: 'proeja_vs', sigla: 'VS_PRO', nome: 'Técnica em Vigilância em Saúde', modalidade: 'PROEJA', turnos: ['Noturno'] },
    cursoErrado: 'subsequente_vs',
    // matriz real do Subsequente VS série 1 = disciplinas da 1TVSV1SUB; o resto veio da 1TVSN1E
    tirarDaMatrizErrada: ['Educação Física', 'Matemática', 'Iniciação Científica', 'Biologia', 'Inglês', 'Química',
      'Território e Vigilância em Saúde', 'Arte', 'Geografia', 'Sociologia', 'Filosofia', 'Língua Portuguesa', 'História'],
  },
]

/** Disciplina com nome de outro curso, herdado da matriz (ex: AC com nome de Nutrição) */
const CORRIGIR_NOME_DISCIPLINA = [
  { cursoId: 'eptm_ac', serie: '1', de: 'Anatomia e Fisiologia em Nutrição', para: 'Anatomofisiologia' },
]

/** Nome fora do padrão do sistema (Urânia usa "ENF", o sistema usa a sigla do curso "E") */
const RENOMEAR = [{ nomeAtual: '1ENFN1SUB', novoNome: '1TEN1SUB' }]

/** Turma duplicada: move as disciplinas (com professores) para a turma real e apaga a cópia vazia */
const MESCLAR = [{ copia: '2ENFN1SUB', real: '2TEN1SUB' }]

const arg = (n: string) => process.argv.find(a => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=')
class Rollback extends Error {}

async function main() {
  const executar = process.argv.includes('--executar')
  const url = new URL(process.env.DATABASE_URL!)
  const nomeBanco = url.pathname.slice(1)
  console.log(`Banco: ${nomeBanco} @ ${url.host}\nModo:  ${executar ? '*** EXECUÇÃO ***' : 'SIMULAÇÃO (nada será gravado)'}\n`)
  if (executar && arg('banco') !== nomeBanco) throw new Error(`Para executar, confirme com --banco=${nomeBanco}`)
  const login = arg('usuario')
  const admin = login && await prisma.user.findFirst({ where: { OR: [{ username: login }, { email: login }] } })
  if (!admin || !admin.isSuperuser) throw new Error('Informe --usuario=<login de superusuário>')

  const rel: string[] = []
  let erros = 0
  const erro = (m: string) => { rel.push(`ERRO   ${m}`); erros++ }
  const agoraBr = () => { const n = new Date(); return new Date(n.getTime() + (-180 + n.getTimezoneOffset()) * 60000) }

  try {
    await prisma.$transaction(async tx => {
      const audit = (entityType: string, entityId: string, action: string, details: object) =>
        tx.auditLog.create({ data: { userId: admin.id, entityType, entityId, action, details: JSON.stringify({ ...details, origem: ORIGEM }), createdAt: agoraBr() } })
      const ativa = (nome: string) => tx.turma.findMany({
        where: { nome, status: 'ATIVA' },
        include: { disciplinas: { include: { usuariosPermitidos: { select: { id: true } }, _count: { select: { notas: true, questoes: true } } } } }
      })

      // ── 1. Religar curso ─────────────────────────────────────────────────
      for (const c of RELIGAR_CURSO) {
        let ts = await ativa(c.nomeAtual)
        if (!ts.length) ts = await ativa(c.novoNome)
        if (ts.length !== 1) { erro(`esperava 1 turma ATIVA ${c.nomeAtual}, achei ${ts.length}`); continue }
        const turma = ts[0]
        if (![c.cursoErrado, c.curso.id].includes(turma.cursoId ?? '')) { erro(`${turma.nome} está no curso ${turma.cursoId}, esperado ${c.cursoErrado}`); continue }

        const existe = await tx.curso.findFirst({ where: { OR: [{ id: c.curso.id }, { sigla: c.curso.sigla }] } })
        if (!existe) {
          await tx.curso.create({ data: c.curso })
          rel.push(`CURSO  criado ${c.curso.nome} (${c.curso.modalidade}) [${c.curso.sigla}]`)
        } else if (existe.id !== c.curso.id) { erro(`sigla ${c.curso.sigla} já usada pelo curso ${existe.id}`); continue }

        if (turma.nome !== c.novoNome || turma.turno !== c.novoTurno || turma.cursoId !== c.curso.id || turma.modalidade !== c.curso.modalidade) {
          if (turma.nome !== c.novoNome && (await tx.turma.count({ where: { nome: c.novoNome, status: 'ATIVA' } }))) { erro(`já existe turma ATIVA ${c.novoNome}`); continue }
          await tx.turma.update({ where: { id: turma.id }, data: { nome: c.novoNome, turno: c.novoTurno, cursoId: c.curso.id, curso: c.curso.nome, modalidade: c.curso.modalidade } })
          await audit('TURMA', turma.id, 'UPDATE', { acao: 'CORRIGIR_CURSO', de: { nome: turma.nome, turno: turma.turno, cursoId: turma.cursoId, modalidade: turma.modalidade }, para: { nome: c.novoNome, turno: c.novoTurno, cursoId: c.curso.id, modalidade: c.curso.modalidade } })
          rel.push(`TURMA  ${turma.nome} → ${c.novoNome} | ${turma.turno} → ${c.novoTurno} | curso ${turma.cursoId} → ${c.curso.id}`)
        }

        // disciplinas que vieram da matriz errada: vazias e sem professor (não estão no horário)
        const ficam = []
        for (const d of turma.disciplinas) {
          if (!d._count.notas && !d._count.questoes && !d.usuariosPermitidos.length) {
            await tx.disciplina.delete({ where: { id: d.id } })
            await audit('DISCIPLINA', d.id, 'DELETE', { acao: 'REMOVER_HERDADA_CURSO_ERRADO', turma: c.novoNome, nome: d.nome })
            rel.push(`REMOVE ${c.novoNome} / ${d.nome} (veio do curso errado, vazia, fora do horário)`)
          } else ficam.push(d)
        }

        const serie = turma.serie ?? '1'
        for (const d of ficam) {
          const k = { nome: d.nome, cursoId: c.curso.id, serie, anoLetivo: turma.anoLetivo ?? ANO }
          if (!(await tx.matrizCurricular.findUnique({ where: { nome_cursoId_serie_anoLetivo: k } }))) {
            const mz = await tx.matrizCurricular.create({ data: { ...k, areaId: d.areaId } })
            await audit('DISCIPLINA', mz.id, 'CREATE', { acao: 'MATRIZ_INCLUIR', ...k })
            rel.push(`MATRIZ + ${c.curso.sigla}/série ${serie}: ${d.nome}`)
          }
        }
        for (const nome of c.tirarDaMatrizErrada) {
          const m = await tx.matrizCurricular.findUnique({ where: { nome_cursoId_serie_anoLetivo: { nome, cursoId: c.cursoErrado, serie, anoLetivo: turma.anoLetivo ?? ANO } } })
          if (m) { await tx.matrizCurricular.delete({ where: { id: m.id } }); await audit('DISCIPLINA', m.id, 'DELETE', { acao: 'MATRIZ_REMOVER', nome, cursoId: c.cursoErrado, serie, areaId: m.areaId }); rel.push(`MATRIZ - ${c.cursoErrado}/série ${serie}: ${nome}`) }
        }
      }

      // ── 1b. Nome de disciplina herdado de outro curso ─────────────────────
      for (const c of CORRIGIR_NOME_DISCIPLINA) {
        const ts = await tx.turma.findMany({
          where: { cursoId: c.cursoId, serie: c.serie, status: 'ATIVA' },
          include: { disciplinas: { include: { usuariosPermitidos: { select: { id: true } }, _count: { select: { notas: true, questoes: true } } } } }
        })
        for (const t of ts) {
          const errada = t.disciplinas.find(d => d.nome === c.de)
          if (!errada) continue
          const certa = t.disciplinas.find(d => d.nome === c.para)
          if (certa) {
            // em dobro: fica a cópia que tem dados (notas/questões); a outra só sai se estiver vazia
            const temDados = (d: typeof errada) => d._count.notas + d._count.questoes
            const [fica, sai] = temDados(errada) > temDados(certa) ? [errada, certa] : [certa, errada]
            if (temDados(sai)) { erro(`${t.nome}: "${c.de}" e "${c.para}" têm dados nas duas — mesclar manualmente`); continue }
            if (!fica.usuariosPermitidos.length && sai.usuariosPermitidos.length)
              await tx.user.update({ where: { id: sai.usuariosPermitidos[0].id }, data: { disciplinasPermitidas: { connect: { id: fica.id } } } })
            await tx.disciplina.delete({ where: { id: sai.id } })
            await audit('DISCIPLINA', sai.id, 'DELETE', { acao: 'REMOVER_DUPLICADA', turma: t.nome, nome: sai.nome, mantidaId: fica.id })
            if (fica.nome !== c.para) {
              await tx.disciplina.update({ where: { id: fica.id }, data: { nome: c.para } })
              await audit('DISCIPLINA', fica.id, 'UPDATE', { acao: 'RENOMEAR', turma: t.nome, de: fica.nome, para: c.para })
            }
            rel.push(`DUPLA  ${t.nome}: removida cópia vazia "${sai.nome}"; fica "${c.para}" (${fica._count.questoes} questões, ${fica._count.notas} notas)`)
          } else {
            await tx.disciplina.update({ where: { id: errada.id }, data: { nome: c.para } })
            await audit('DISCIPLINA', errada.id, 'UPDATE', { acao: 'RENOMEAR', turma: t.nome, de: c.de, para: c.para })
            rel.push(`NOME   ${t.nome} / "${c.de}" → "${c.para}"`)
          }
        }
        const mzErrada = await tx.matrizCurricular.findMany({ where: { cursoId: c.cursoId, serie: c.serie, nome: c.de } })
        for (const m of mzErrada) {
          const certa = await tx.matrizCurricular.findFirst({ where: { cursoId: c.cursoId, serie: c.serie, anoLetivo: m.anoLetivo, nome: c.para } })
          if (certa) {
            await tx.matrizCurricular.delete({ where: { id: m.id } })
            await audit('DISCIPLINA', m.id, 'DELETE', { acao: 'MATRIZ_REMOVER_DUPLICADA', nome: c.de, cursoId: c.cursoId, serie: c.serie, anoLetivo: m.anoLetivo, areaId: m.areaId, mantida: c.para })
            rel.push(`MATRIZ - ${c.cursoId}/série ${c.serie}: ${c.de} (já existe ${c.para})`)
          } else {
            await tx.matrizCurricular.update({ where: { id: m.id }, data: { nome: c.para } })
            await audit('DISCIPLINA', m.id, 'UPDATE', { acao: 'MATRIZ_RENOMEAR', de: c.de, para: c.para, cursoId: c.cursoId, serie: c.serie })
            rel.push(`MATRIZ   ${c.cursoId}/série ${c.serie}: ${c.de} → ${c.para}`)
          }
        }
      }

      // ── 2. Renomear para o padrão ────────────────────────────────────────
      for (const r of RENOMEAR) {
        const ts = await ativa(r.nomeAtual)
        if (!ts.length) { if ((await ativa(r.novoNome)).length === 1) rel.push(`ok     ${r.novoNome} já renomeada`); else erro(`turma ${r.nomeAtual} não encontrada`); continue }
        if (ts.length > 1 || (await tx.turma.count({ where: { nome: r.novoNome, status: 'ATIVA' } }))) { erro(`conflito ao renomear ${r.nomeAtual} → ${r.novoNome}`); continue }
        await tx.turma.update({ where: { id: ts[0].id }, data: { nome: r.novoNome } })
        await audit('TURMA', ts[0].id, 'UPDATE', { acao: 'RENOMEAR', de: r.nomeAtual, para: r.novoNome })
        rel.push(`TURMA  ${r.nomeAtual} → ${r.novoNome}`)
      }

      // ── 3. Mesclar cópia na turma real ───────────────────────────────────
      for (const mz of MESCLAR) {
        const [copias, reais] = [await ativa(mz.copia), await ativa(mz.real)]
        if (!copias.length && reais.length === 1) { rel.push(`ok     ${mz.copia} já mesclada`); continue }
        if (copias.length !== 1 || reais.length !== 1) { erro(`mesclar ${mz.copia} → ${mz.real}: achei ${copias.length}/${reais.length} turmas`); continue }
        const [copia, real] = [copias[0], reais[0]]
        for (const d of copia.disciplinas) {
          const igual = real.disciplinas.find(x => x.nome.toLowerCase() === d.nome.toLowerCase())
          if (igual) { erro(`${mz.real} já tem "${d.nome}" — mesclar manualmente`); continue }
          await tx.disciplina.update({ where: { id: d.id }, data: { turmaId: real.id } })
          await audit('DISCIPLINA', d.id, 'UPDATE', { acao: 'MOVER_TURMA', nome: d.nome, de: copia.nome, para: real.nome })
          rel.push(`MOVE   ${copia.nome} / ${d.nome} → ${real.nome} (com professor)`)
        }
        const resto = await tx.turma.findUnique({ where: { id: copia.id }, include: { _count: { select: { estudantes: true, disciplinas: true, provas: true, horarios: true, planosEnsino: true, questoes: true, responsavelSimulados: true, estudantesAnteriores: true } } } })
        const pendencias = Object.entries(resto!._count).filter(([, n]) => n > 0)
        if (pendencias.length) { erro(`${copia.nome} não está vazia (${pendencias.map(([k, n]) => `${k}=${n}`).join(', ')}) — não apaguei`); continue }
        await tx.turma.delete({ where: { id: copia.id } })
        await audit('TURMA', copia.id, 'DELETE', { acao: 'REMOVER_DUPLICADA', nome: copia.nome, mesclada_em: real.nome })
        rel.push(`APAGA  turma ${copia.nome} (cópia vazia de ${real.nome})`)
      }

      if (erros || !executar) throw new Rollback()
    }, { timeout: 600_000, maxWait: 30_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (e) { if (!(e instanceof Rollback)) throw e }

  console.log(rel.join('\n'))
  console.log(`\n${erros ? `${erros} ERRO(S) — nada gravado.` : executar ? 'GRAVADO no banco.' : 'Simulação: NADA foi gravado.'}`)
  if (erros) process.exitCode = 1
}

main().catch(e => { console.error('FALHOU:', e.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
