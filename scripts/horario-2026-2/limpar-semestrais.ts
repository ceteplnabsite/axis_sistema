/**
 * Deixa cada turma SEMESTRAL ativa (PROEJA/SUBSEQUENTE/PROSUB) que está no horário 2026.2
 * com exatamente as disciplinas do horário: remove as que sobraram (vieram da matriz e não
 * têm aula no horário).
 *
 * Usa a planilha gerada por gerar-planilha.ts (rodar antes, já com as turmas corrigidas):
 * a disciplina que aparece na planilha fica; a que não aparece é removida — SÓ se estiver
 * vazia (sem notas e sem questões). Com dados, só avisa e não mexe. TCC sempre fica.
 * Turmas fora do horário não são tocadas.
 *
 * Uso:
 *   npx tsx scripts/horario-2026-2/limpar-semestrais.ts --usuario=admin
 *   npx tsx scripts/horario-2026-2/limpar-semestrais.ts --usuario=admin --executar --banco=<nome_do_banco>
 */
import 'dotenv/config'
import { PrismaClient, Prisma } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()
const ORIGEM = 'script horario-2026-2 (limpar-semestrais)'
const PLANILHA = 'dados/planilha-revisao-proeja-prosub.csv'

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

  const linhas = fs.readFileSync(PLANILHA, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean)
  const cab = linhas[0].split(';')
  const [iAcao, iTurma, iDisc] = ['acao', 'turma_id', 'disciplina_id'].map(c => cab.indexOf(c))
  const rows = linhas.slice(1).map(l => l.split(';'))
  const pendentes = rows.filter(r => r[iAcao] !== 'OK')
  if (pendentes.length) throw new Error(`A planilha ainda tem ${pendentes.length} linha(s) que não estão OK — rode aplicar.ts e gere a planilha de novo antes de limpar`)
  const turmasDoHorario = new Set(rows.map(r => r[iTurma]).filter(Boolean))
  const disciplinasDoHorario = new Set(rows.map(r => r[iDisc]).filter(Boolean))

  const rel: string[] = []
  let removidas = 0, mantidasComDados = 0, mantidasTcc = 0
  const agoraBr = () => { const n = new Date(); return new Date(n.getTime() + (-180 + n.getTimezoneOffset()) * 60000) }

  try {
    await prisma.$transaction(async tx => {
      // planilha desatualizada (gerada antes de remover duplicatas) apontaria para disciplina apagada
      const existentes = await tx.disciplina.count({ where: { id: { in: [...disciplinasDoHorario] } } })
      if (existentes !== disciplinasDoHorario.size) {
        throw new Error(`Planilha desatualizada: ${disciplinasDoHorario.size - existentes} disciplina(s) citada(s) não existem mais — gere a planilha de novo (gerar-planilha.ts) e repita`)
      }
      const turmas = await tx.turma.findMany({
        where: { id: { in: [...turmasDoHorario] }, status: 'ATIVA', modalidade: { in: ['PROEJA', 'SUBSEQUENTE', 'PROSUB'] } },
        include: { disciplinas: { include: { usuariosPermitidos: { select: { name: true } }, _count: { select: { notas: true, questoes: true } } } } },
        orderBy: { nome: 'asc' }
      })
      for (const t of turmas) {
        for (const d of t.disciplinas.filter(x => !disciplinasDoHorario.has(x.id))) {
          // TCC não tem aula no horário, mas tem nota no fim do curso: fica na turma
          if (/^tcc\b/i.test(d.nome.trim())) {
            rel.push(`mantém ${t.nome} / ${d.nome} (TCC)`)
            mantidasTcc++
            continue
          }
          if (d._count.notas || d._count.questoes) {
            rel.push(`aviso  ${t.nome} / ${d.nome}: fora do horário mas tem ${d._count.notas} nota(s) e ${d._count.questoes} questão(ões) — não removida`)
            mantidasComDados++
            continue
          }
          await tx.disciplina.delete({ where: { id: d.id } })
          await tx.auditLog.create({ data: { userId: admin.id, entityType: 'DISCIPLINA', entityId: d.id, action: 'DELETE', createdAt: agoraBr(),
            details: JSON.stringify({ acao: 'REMOVER_FORA_DO_HORARIO', turma: t.nome, nome: d.nome, professores: d.usuariosPermitidos.map(u => u.name?.trim()), origem: ORIGEM }) } })
          rel.push(`REMOVE ${t.nome} / ${d.nome}${d.usuariosPermitidos.length ? ` (desvincula ${d.usuariosPermitidos.map(u => u.name?.trim()).join(', ')})` : ''}`)
          removidas++
        }
        // conferência: nenhuma disciplina repetida na turma
        const nomes = (await tx.disciplina.findMany({ where: { turmaId: t.id }, select: { nome: true } })).map(d => d.nome.toLowerCase())
        const dup = nomes.filter((n, i) => nomes.indexOf(n) !== i)
        if (dup.length) rel.push(`aviso  ${t.nome}: disciplina repetida — ${[...new Set(dup)].join(', ')}`)
      }
      if (!executar) throw new Rollback()
    }, { timeout: 600_000, maxWait: 30_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (e) { if (!(e instanceof Rollback)) throw e }

  console.log(rel.join('\n') || 'Nada a remover.')
  console.log(`\nRemovidas: ${removidas} | mantidas por ter dados: ${mantidasComDados} | TCC mantidos: ${mantidasTcc}`)
  console.log(executar ? 'GRAVADO no banco.' : 'Simulação: NADA foi gravado.')
}

main().catch(e => { console.error('FALHOU:', e.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
