/**
 * Fase 2 — Aplica a planilha revisada (dados/planilha-revisao-proeja-prosub.csv).
 *
 * Por padrão roda em SIMULAÇÃO: executa tudo dentro de uma transação e desfaz
 * no final (ROLLBACK), então valida de verdade sem gravar nada.
 *
 * Uso:
 *   Simular:  npx tsx scripts/horario-2026-2/aplicar.ts --usuario=admin
 *   Executar: npx tsx scripts/horario-2026-2/aplicar.ts --usuario=admin --executar --banco=<nome_do_banco>
 *
 * --usuario  login/e-mail de um superusuário (fica registrado na auditoria)
 * --banco    precisa ser igual ao nome do banco do DATABASE_URL (trava contra rodar no banco errado)
 * --planilha caminho alternativo do CSV (opcional)
 *
 * Regras (as mesmas da tela Importar Horário):
 *  - nunca mexe em disciplina de turma ENCERRADA;
 *  - um professor por disciplina (vincular remove o vínculo anterior);
 *  - disciplina criada também entra na Matriz Curricular do curso/série/ano;
 *  - pode rodar de novo sem duplicar (o que já está feito é pulado).
 * Ações aceitas na coluna "acao": OK, VINCULAR, TRANSFERIR, CRIAR_DISCIPLINA, REVISAR, IGNORAR.
 * Só VINCULAR, TRANSFERIR e CRIAR_DISCIPLINA alteram o banco.
 */
import 'dotenv/config'
import { PrismaClient, Prisma } from '@prisma/client'
import fs from 'fs'
import { AJUSTES_TURMAS, NOMES_DISCIPLINAS } from '../../dados/horario-2026-2/ajustes'

const prisma = new PrismaClient()
const ORIGEM = 'script horario-2026-2'
const MODALIDADES = ['PROEJA', 'PROSUB', 'SUBSEQUENTE']

// mesma chave do gerador: sem acento/pontuação/maiúsculas e sem "de/da/e…"
const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'as', 'os', 'no', 'na', 'p', 'para', 'ao'])
const chave = (s: string) => normalizar(s).split(' ').filter(w => w.length > 1 && !STOP.has(w)).join(' ')
const dicionario = new Map(Object.entries(NOMES_DISCIPLINAS).map(([k, v]) => [chave(k), v]))

const arg = (n: string) => process.argv.find(a => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=')
const flag = (n: string) => process.argv.includes(`--${n}`)

function normalizar(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function lerCsv(arquivo: string): Record<string, string>[] {
  const bruto = fs.readFileSync(arquivo, 'utf8').replace(/^﻿/, '')
  if (bruto.includes('�')) {
    throw new Error('A planilha não está em UTF-8. No Excel, salve como "CSV UTF-8 (delimitado por vírgulas)".')
  }
  // parser simples de CSV com aspas
  const linhas: string[][] = []
  let campo = '', linha: string[] = [], aspas = false
  const sep = bruto.split(/\r?\n/)[0].includes(';') ? ';' : ','
  for (let i = 0; i < bruto.length; i++) {
    const c = bruto[i]
    if (aspas) {
      if (c === '"' && bruto[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === sep) { linha.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && bruto[i + 1] === '\n') i++
      linha.push(campo); campo = ''
      if (linha.some(x => x !== '')) linhas.push(linha)
      linha = []
    } else campo += c
  }
  linha.push(campo); if (linha.some(x => x !== '')) linhas.push(linha)
  const [cab, ...resto] = linhas
  return resto.map(l => Object.fromEntries(cab.map((c, i) => [c.trim(), (l[i] ?? '').trim()])))
}

class Rollback extends Error {}
let abortadoPorErro = false

async function main() {
  const executar = flag('executar')
  const planilha = arg('planilha') ?? 'dados/planilha-revisao-proeja-prosub.csv'
  const login = arg('usuario')
  const nomeBanco = new URL(process.env.DATABASE_URL!).pathname.slice(1)
  const hostBanco = new URL(process.env.DATABASE_URL!).host

  console.log(`Banco: ${nomeBanco} @ ${hostBanco}`)
  console.log(`Modo:  ${executar ? '*** EXECUÇÃO (grava no banco) ***' : 'SIMULAÇÃO (nada será gravado)'}`)
  if (executar && arg('banco') !== nomeBanco) {
    throw new Error(`Para executar, confirme o banco com --banco=${nomeBanco}`)
  }
  if (!login) throw new Error('Informe --usuario=<login de um superusuário> (vai para a auditoria)')
  const admin = await prisma.user.findFirst({
    where: { OR: [{ username: { equals: login, mode: 'insensitive' } }, { email: { equals: login, mode: 'insensitive' } }] }
  })
  if (!admin?.isSuperuser) throw new Error(`Usuário "${login}" não encontrado ou não é superusuário`)

  const linhas = lerCsv(planilha)
  console.log(`Planilha: ${planilha} (${linhas.length} linhas)\n`)

  const relatorio: string[] = []
  const cont: Record<string, number> = {}
  const conta = (k: string) => { cont[k] = (cont[k] ?? 0) + 1 }

  // horário de Brasília, como o logAudit do sistema
  const agoraBr = () => { const n = new Date(); return new Date(n.getTime() + (-180 + n.getTimezoneOffset()) * 60000) }

  try {
    await prisma.$transaction(async tx => {
      const audit = (entityType: string, entityId: string, action: string, details: object) =>
        tx.auditLog.create({ data: { userId: admin.id, entityType, entityId, action, details: JSON.stringify({ ...details, origem: ORIGEM }), createdAt: agoraBr() } })

      // ── 1. Ajustes de turmas ───────────────────────────────────────────────
      for (const e of AJUSTES_TURMAS.encerrar) {
        const t = await tx.turma.findUnique({ where: { id: e.id }, include: { _count: { select: { estudantes: true } } } })
        if (!t) { relatorio.push(`ERRO      turma ${e.nome} (${e.id}) não encontrada`); conta('erro'); continue }
        if (t.status === 'ENCERRADA') { relatorio.push(`já feito  ${t.nome} já está ENCERRADA`); conta('ja_feito'); continue }
        await tx.turma.update({ where: { id: t.id }, data: { status: 'ENCERRADA' } })
        await audit('TURMA', t.id, 'UPDATE', { acao: 'ENCERRAR', nome: t.nome, motivo: e.motivo, alunos: t._count.estudantes })
        relatorio.push(`ENCERRAR  ${t.nome} (${t._count.estudantes} alunos ficam no histórico) — ${e.motivo}`); conta('turma_encerrada')
      }
      for (const r of AJUSTES_TURMAS.renomear) {
        const t = await tx.turma.findUnique({ where: { id: r.id } })
        if (!t) { relatorio.push(`ERRO      turma ${r.nomeAtual} (${r.id}) não encontrada`); conta('erro'); continue }
        if (t.nome === r.novoNome) { relatorio.push(`já feito  ${r.novoNome} já renomeada`); conta('ja_feito'); continue }
        if (t.nome !== r.nomeAtual) { relatorio.push(`ERRO      turma ${r.id} se chama "${t.nome}", esperado "${r.nomeAtual}"`); conta('erro'); continue }
        const conflito = await tx.turma.count({ where: { nome: r.novoNome, status: { not: 'ENCERRADA' }, id: { not: t.id } } })
        if (conflito) { relatorio.push(`ERRO      já existe turma ATIVA ${r.novoNome}; não renomeei ${r.nomeAtual}`); conta('erro'); continue }
        await tx.turma.update({ where: { id: t.id }, data: { nome: r.novoNome } })
        await audit('TURMA', t.id, 'UPDATE', { acao: 'RENOMEAR', de: r.nomeAtual, para: r.novoNome })
        relatorio.push(`RENOMEAR  ${r.nomeAtual} → ${r.novoNome}`); conta('turma_renomeada')
      }

      // ── 1b. Padronizar nomes de disciplinas existentes (NOMES_DISCIPLINAS) ──
      // Só turmas ATIVAS de PROEJA/PROSUB/SUBSEQUENTE e a Matriz Curricular desses cursos.
      // Turmas encerradas ficam como estão (histórico).
      const substituida = new Map<string, string>() // disciplina removida → a que ficou
      const turmasAlvo = await tx.turma.findMany({
        where: { status: 'ATIVA', modalidade: { in: MODALIDADES } },
        include: {
          disciplinas: {
            select: {
              id: true, nome: true,
              usuariosPermitidos: { select: { id: true } },
              _count: { select: { notas: true, questoes: true } }
            }
          }
        }
      })
      for (const t of turmasAlvo) {
        for (const d of [...t.disciplinas]) {
          const novo = dicionario.get(chave(d.nome))
          if (!novo || novo === d.nome) continue
          const igual = t.disciplinas.find(o => o.id !== d.id && chave(o.nome) === chave(novo))
          if (igual) {
            // duplicada na mesma turma: só remove se estiver VAZIA (sem notas e sem questões)
            if (d._count.notas || d._count.questoes) {
              relatorio.push(`aviso     ${t.nome} / "${d.nome}" duplicada de "${igual.nome}" mas tem ${d._count.notas} nota(s) e ${d._count.questoes} questão(ões) — não mexi`); conta('aviso'); continue
            }
            // se a que fica não tem professor, herda o da removida
            if (!igual.usuariosPermitidos.length && d.usuariosPermitidos.length) {
              await tx.user.update({ where: { id: d.usuariosPermitidos[0].id }, data: { disciplinasPermitidas: { connect: { id: igual.id } } } })
              igual.usuariosPermitidos.push(d.usuariosPermitidos[0])
            }
            await tx.disciplina.delete({ where: { id: d.id } })
            await audit('DISCIPLINA', d.id, 'DELETE', { acao: 'REMOVER_DUPLICADA', turma: t.nome, nome: d.nome, mantida: igual.nome, mantidaId: igual.id })
            substituida.set(d.id, igual.id)
            t.disciplinas.splice(t.disciplinas.indexOf(d), 1)
            relatorio.push(`DUPLICADA ${t.nome} / "${d.nome}" removida (vazia) — fica "${igual.nome}"`); conta('duplicada_removida')
            continue
          }
          const antigo = d.nome
          await tx.disciplina.update({ where: { id: d.id }, data: { nome: novo } })
          await audit('DISCIPLINA', d.id, 'UPDATE', { acao: 'RENOMEAR', turma: t.nome, de: antigo, para: novo })
          d.nome = novo
          relatorio.push(`NOME      ${t.nome} / "${antigo}" → "${novo}"`)
          conta('disciplina_renomeada')
        }
      }
      // duplicadas de nome idêntico na mesma turma (já existiam antes do script):
      // fica a que tem mais dados; as outras só saem se estiverem VAZIAS
      for (const t of turmasAlvo) {
        const grupos = new Map<string, typeof t.disciplinas>()
        for (const d of t.disciplinas) { const k = chave(d.nome); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k)!.push(d) }
        for (const grupo of grupos.values()) {
          if (grupo.length < 2) continue
          const peso = (d: (typeof grupo)[number]) => d._count.notas * 100 + d._count.questoes * 10 + d.usuariosPermitidos.length
          const [fica, ...resto] = [...grupo].sort((a, b) => peso(b) - peso(a))
          for (const d of resto) {
            if (d._count.notas || d._count.questoes) {
              relatorio.push(`aviso     ${t.nome} / "${d.nome}" está em dobro mas tem notas/questões — não mexi`); conta('aviso'); continue
            }
            if (!fica.usuariosPermitidos.length && d.usuariosPermitidos.length) {
              await tx.user.update({ where: { id: d.usuariosPermitidos[0].id }, data: { disciplinasPermitidas: { connect: { id: fica.id } } } })
              fica.usuariosPermitidos.push(d.usuariosPermitidos[0])
            }
            await tx.disciplina.delete({ where: { id: d.id } })
            await audit('DISCIPLINA', d.id, 'DELETE', { acao: 'REMOVER_DUPLICADA', turma: t.nome, nome: d.nome, mantidaId: fica.id })
            substituida.set(d.id, fica.id)
            t.disciplinas.splice(t.disciplinas.indexOf(d), 1)
            relatorio.push(`DUPLICADA ${t.nome} / "${d.nome}" em dobro, removida a cópia vazia`); conta('duplicada_removida')
          }
        }
      }

      const cursosAlvo = [...new Set(turmasAlvo.map(t => t.cursoId).filter((c): c is string => !!c))]
      const matrizAlvo = await tx.matrizCurricular.findMany({ where: { cursoId: { in: cursosAlvo } } })
      for (const m of [...matrizAlvo]) {
        const novo = dicionario.get(chave(m.nome))
        if (!novo || novo === m.nome) continue
        const igual = matrizAlvo.find(o => o.id !== m.id && o.cursoId === m.cursoId && o.serie === m.serie && o.anoLetivo === m.anoLetivo && chave(o.nome) === chave(novo))
        if (igual) {
          // item duplicado no modelo da matriz: remove o abreviado (é o que gerava disciplina em dobro na promoção)
          if (!igual.areaId && m.areaId) await tx.matrizCurricular.update({ where: { id: igual.id }, data: { areaId: m.areaId } })
          await tx.matrizCurricular.delete({ where: { id: m.id } })
          await audit('DISCIPLINA', m.id, 'DELETE', { acao: 'MATRIZ_REMOVER_DUPLICADA', nome: m.nome, cursoId: m.cursoId, serie: m.serie, anoLetivo: m.anoLetivo, areaId: m.areaId, mantida: igual.nome })
          matrizAlvo.splice(matrizAlvo.indexOf(m), 1)
          relatorio.push(`DUPLICADA Matriz ${m.cursoId}/série ${m.serie}: "${m.nome}" removida — fica "${igual.nome}"`); conta('matriz_duplicada_removida')
          continue
        }
        await tx.matrizCurricular.update({ where: { id: m.id }, data: { nome: novo } })
        await audit('DISCIPLINA', m.id, 'UPDATE', { acao: 'MATRIZ_RENOMEAR', de: m.nome, para: novo, cursoId: m.cursoId, serie: m.serie })
        relatorio.push(`MATRIZ    ${m.cursoId}/série ${m.serie}: "${m.nome}" → "${novo}"`)
        m.nome = novo
        conta('matriz_renomeada')
      }

      // ── 2. Linhas da planilha ──────────────────────────────────────────────
      const usuarios = await tx.user.findMany({ where: { isPortalUser: false }, select: { id: true, name: true } })

      for (const [i, l] of linhas.entries()) {
        const ref = `L${i + 2} ${l.turma_banco || l.turma_pdf} / ${l.disciplina_banco || l.disciplina_nova || l.disciplina_pdf}`
        const acao = (l.acao || '').toUpperCase()
        if (acao === 'OK' || acao === 'IGNORAR') { conta(acao.toLowerCase()); continue }
        if (acao === 'REVISAR') { relatorio.push(`pulado    ${ref} — REVISAR: ${l.observacao}`); conta('revisar'); continue }
        if (!['VINCULAR', 'TRANSFERIR', 'CRIAR_DISCIPLINA'].includes(acao)) {
          relatorio.push(`ERRO      ${ref} — ação desconhecida "${l.acao}"`); conta('erro'); continue
        }

        // professor: se o nome em professor_sistema foi editado, ele manda
        let profId = l.professor_id
        const profPorId = usuarios.find(u => u.id === profId)
        if (!profPorId || (l.professor_sistema && normalizar(profPorId.name || '') !== normalizar(l.professor_sistema))) {
          const achados = usuarios.filter(u => normalizar(u.name || '') === normalizar(l.professor_sistema || ''))
          if (achados.length !== 1) {
            relatorio.push(`ERRO      ${ref} — professor "${l.professor_sistema}" ${achados.length ? 'ambíguo' : 'não encontrado'}`); conta('erro'); continue
          }
          profId = achados[0].id
        }
        const profNome = usuarios.find(u => u.id === profId)!.name?.trim()

        const turma = await tx.turma.findUnique({ where: { id: l.turma_id }, include: { disciplinas: { include: { usuariosPermitidos: { select: { id: true, name: true } } } } } })
        if (!turma) { relatorio.push(`ERRO      ${ref} — turma não encontrada`); conta('erro'); continue }
        if (turma.status === 'ENCERRADA') { relatorio.push(`ERRO      ${ref} — turma ENCERRADA, nada feito`); conta('erro'); continue }

        let disc = acao === 'CRIAR_DISCIPLINA'
          ? turma.disciplinas.find(d => normalizar(d.nome) === normalizar(l.disciplina_nova || l.disciplina_pdf))
          : turma.disciplinas.find(d => d.id === (substituida.get(l.disciplina_id) ?? l.disciplina_id))

        if (!disc && acao !== 'CRIAR_DISCIPLINA') {
          relatorio.push(`ERRO      ${ref} — disciplina ${l.disciplina_id} não pertence à turma`); conta('erro'); continue
        }

        if (!disc) {
          const nome = (l.disciplina_nova || l.disciplina_pdf).trim()
          const nova = await tx.disciplina.create({ data: { nome, turmaId: turma.id } })
          disc = { ...nova, usuariosPermitidos: [] } as any
          await audit('DISCIPLINA', nova.id, 'CREATE', { nome, turma: turma.nome, professor: profNome })
          let matriz = ''
          if (turma.cursoId && turma.serie) {
            const ano = turma.anoLetivo ?? new Date().getFullYear()
            const existe = await tx.matrizCurricular.findUnique({
              where: { nome_cursoId_serie_anoLetivo: { nome, cursoId: turma.cursoId, serie: turma.serie, anoLetivo: ano } }
            })
            if (!existe) {
              const mz = await tx.matrizCurricular.create({ data: { nome, cursoId: turma.cursoId, serie: turma.serie, anoLetivo: ano } })
              await audit('DISCIPLINA', mz.id, 'CREATE', { acao: 'MATRIZ_INCLUIR', nome, cursoId: turma.cursoId, serie: turma.serie, anoLetivo: ano })
              matriz = ' (+ Matriz Curricular)'
            }
          }
          relatorio.push(`CRIAR     ${turma.nome} / ${nome}${matriz} → ${profNome}`); conta('disciplina_criada')
        } else if (acao === 'CRIAR_DISCIPLINA') {
          relatorio.push(`já existe ${turma.nome} / ${disc.nome} — só vincula`); conta('ja_existia')
        }

        const atuais = disc!.usuariosPermitidos
        if (atuais.length === 1 && atuais[0].id === profId) {
          if (acao !== 'CRIAR_DISCIPLINA') { relatorio.push(`já feito  ${turma.nome} / ${disc!.nome} → ${profNome}`); conta('ja_feito') }
          continue
        }
        const removidos = atuais.filter(u => u.id !== profId)
        await tx.$executeRaw`DELETE FROM "_DisciplinaUsuarios" WHERE "A" = ${disc!.id} AND "B" != ${profId}`
        await tx.user.update({ where: { id: profId }, data: { disciplinasPermitidas: { connect: { id: disc!.id } } } })
        await audit('DISCIPLINA', disc!.id, 'UPDATE', {
          acao: removidos.length ? 'TRANSFERIR_PROFESSOR' : 'VINCULAR_PROFESSOR',
          disciplina: disc!.nome, turma: turma.nome, professor: profNome, professorId: profId,
          jaVinculado: atuais.some(u => u.id === profId),
          removidos: removidos.map(u => u.name?.trim()), removidosIds: removidos.map(u => u.id)
        })
        if (acao !== 'CRIAR_DISCIPLINA') {
          relatorio.push(`${removidos.length ? 'TRANSFERIR' : 'VINCULAR '} ${turma.nome} / ${disc!.nome} → ${profNome}${removidos.length ? ` (sai ${removidos.map(u => u.name?.trim()).join(', ')})` : ''}`)
        }
        conta(removidos.length ? 'transferido' : 'vinculado')
      }

      // na execução real, qualquer erro desfaz TUDO (nada de aplicação parcial)
      if (executar && cont.erro) { abortadoPorErro = true; throw new Rollback() }
      if (!executar) throw new Rollback()
    }, { timeout: 900_000, maxWait: 30_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (e) {
    if (!(e instanceof Rollback)) throw e
  }

  const saida = relatorio.join('\n')
  console.log(saida)
  console.log('\nResumo:', cont)
  const arq = `dados/relatorio-aplicar-${executar ? 'EXECUCAO' : 'simulacao'}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`
  fs.writeFileSync(arq, `Banco: ${nomeBanco} @ ${hostBanco}\nModo: ${executar ? 'EXECUÇÃO' : 'SIMULAÇÃO'}\n\n${saida}\n\nResumo: ${JSON.stringify(cont)}\n`)
  console.log(`\n${abortadoPorErro ? 'HOUVE ERROS — tudo desfeito, NADA foi gravado.' : executar ? 'GRAVADO no banco.' : 'Simulação: NADA foi gravado (rollback).'} Relatório: ${arq}`)
  if (cont.erro) process.exitCode = 1
}

main().catch(e => { console.error('FALHOU:', e.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
