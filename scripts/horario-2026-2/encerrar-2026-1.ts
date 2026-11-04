/**
 * Encerra as turmas SUBSEQUENTE de 2026.1 que ficaram ATIVAS.
 * NÃO move alunos e NÃO altera o status deles: os aprovados serão levados depois
 * para as turmas de 2026.2 a partir da lista do outro sistema.
 * Notas de 2026.1 ficam no histórico das turmas encerradas.
 *
 * Uso:
 *   npx tsx scripts/horario-2026-2/encerrar-2026-1.ts --usuario=admin
 *   npx tsx scripts/horario-2026-2/encerrar-2026-1.ts --usuario=admin --executar --banco=<nome_do_banco>
 */
import 'dotenv/config'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const ORIGEM = 'script horario-2026-2 (encerrar-2026-1)'
const INICIO_2026_2 = new Date('2026-07-01T00:00:00Z') // criada antes disso = turma de 2026.1
const ENCERRAR = ['1TSTV1SUB', '1TVSV1SUB', '3TSTV1SUB', '4TEV1SUB', '4TNDV1SUB']

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
  const agoraBr = () => { const n = new Date(); return new Date(n.getTime() + (-180 + n.getTimezoneOffset()) * 60000) }

  try {
    await prisma.$transaction(async tx => {
      for (const nome of ENCERRAR) {
        const ts = await tx.turma.findMany({ where: { nome, createdAt: { lt: INICIO_2026_2 } }, include: { _count: { select: { estudantes: true } } } })
        const ativas = ts.filter(t => t.status === 'ATIVA')
        if (!ativas.length && ts.some(t => t.status === 'ENCERRADA')) { rel.push(`ok        ${nome} (2026.1) já está ENCERRADA`); continue }
        if (ativas.length !== 1) { rel.push(`ERRO      esperava 1 turma ${nome} de 2026.1 ATIVA, achei ${ativas.length}`); erros++; continue }
        const t = ativas[0]
        await tx.turma.update({ where: { id: t.id }, data: { status: 'ENCERRADA' } })
        await tx.auditLog.create({ data: { userId: admin.id, entityType: 'TURMA', entityId: t.id, action: 'UPDATE', details: JSON.stringify({ acao: 'ENCERRAR', nome: t.nome, semestre: '2026.1', alunos: t._count.estudantes, origem: ORIGEM }), createdAt: agoraBr() } })
        rel.push(`ENCERRAR  ${t.nome} (2026.1) — ${t._count.estudantes} aluno(s) permanecem nela, sem mudança de status`)
      }
      if (erros || !executar) throw new Rollback()
    }, { timeout: 600_000, maxWait: 30_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (e) { if (!(e instanceof Rollback)) throw e }

  console.log(rel.join('\n'))
  console.log(`\n${erros ? `${erros} ERRO(S) — nada gravado.` : executar ? 'GRAVADO no banco.' : 'Simulação: NADA foi gravado.'}`)
  if (erros) process.exitCode = 1
}

main().catch(e => { console.error('FALHOU:', e.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
