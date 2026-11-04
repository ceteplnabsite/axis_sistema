/**
 * Encerra chamados antigos que NUNCA tiveram resposta da equipe (limpeza única, 04/11/2026).
 *
 * Fecha: chamado de Suporte ou Direção, ainda aberto, aberto antes de --antes=AAAA-MM-DD
 * (padrão: hoje), em que ninguém além de quem abriu escreveu. Não mexe nos chamados que
 * já tiveram resposta (esses fecham sozinhos pela rotina diária após 7 dias sem retorno).
 *
 * - Marca como RESOLVIDO com fechamento = LIMPEZA_ANTIGOS (a tela mostra "Encerrado").
 * - Não altera updated_at (a ordem das listas não muda).
 * - Se o professor responder depois, o chamado reabre normalmente.
 *
 * Uso:
 *   npx tsx scripts/mensagens/fechar-chamados-antigos.ts --usuario=admin
 *   npx tsx scripts/mensagens/fechar-chamados-antigos.ts --usuario=admin --executar --banco=<nome_do_banco>
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const ORIGEM = 'script mensagens (fechar-chamados-antigos)'
const MOTIVO = 'LIMPEZA_ANTIGOS'

const arg = (n: string) => process.argv.find(a => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=')
const hojeBahia = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bahia' })

async function main() {
  const executar = process.argv.includes('--executar')
  const url = new URL(process.env.DATABASE_URL!)
  const nomeBanco = url.pathname.slice(1)
  console.log(`Banco: ${nomeBanco} @ ${url.host}\nModo:  ${executar ? '*** EXECUÇÃO ***' : 'SIMULAÇÃO (nada será gravado)'}\n`)
  if (executar && arg('banco') !== nomeBanco) throw new Error(`Para executar, confirme com --banco=${nomeBanco}`)
  const login = arg('usuario')
  const admin = login && await prisma.user.findFirst({ where: { OR: [{ username: login }, { email: login }] } })
  if (!admin || !admin.isSuperuser) throw new Error('Informe --usuario=<login de superusuário>')

  const antes = arg('antes') ?? hojeBahia()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(antes)) throw new Error('--antes deve ser AAAA-MM-DD')
  // meia-noite na Bahia (UTC-3)
  const limite = new Date(`${antes}T00:00:00-03:00`)

  const alvos = await prisma.$queryRaw<{ id: string; ticket_number: number; categoria: string; created_at: Date; subject: string }[]>`
    select m.id, m.ticket_number, m.category::text as categoria, m.created_at, m.subject
      from messages m
     where m.parent_id is null
       and m.category::text in ('SUPORTE', 'DIRECAO')
       and m.status::text not in ('RESOLVIDO', 'FECHADO')
       and m.subject not like '[Cadastro Pendente]%'
       and m.created_at < ${limite}
       and not exists (select 1 from messages y where y.parent_id = m.id and y.sender_id <> m.sender_id)
     order by m.created_at`

  const porCat: Record<string, number> = {}
  for (const a of alvos) {
    porCat[a.categoria] = (porCat[a.categoria] ?? 0) + 1
    console.log(`#${a.ticket_number}  ${a.created_at.toISOString().slice(0, 10)}  ${a.categoria.padEnd(7)}  ${a.subject.slice(0, 60)}`)
  }
  console.log(`\nAbertos antes de ${antes} e nunca respondidos: ${alvos.length}`, porCat)

  if (!executar || !alvos.length) {
    if (!executar) console.log('\nSimulação: nada foi gravado.')
    return
  }

  const ids = alvos.map(a => a.id)
  await prisma.$transaction(async tx => {
    const n = await tx.$executeRaw`
      update messages set status = 'RESOLVIDO', is_resolved = true, fechamento = ${MOTIVO}
       where id = any(${ids}) and status::text not in ('RESOLVIDO', 'FECHADO')`
    if (n !== ids.length) throw new Error(`Esperava ${ids.length}, atualizou ${n}: nada foi gravado`)
    await tx.auditLog.create({
      data: {
        userId: admin.id, entityType: 'USUARIO', entityId: 'chamados', action: 'UPDATE',
        details: JSON.stringify({ acao: 'FECHAR_CHAMADOS_ANTIGOS_SEM_RESPOSTA', antes, fechados: n, porCategoria: porCat, tickets: alvos.map(a => a.ticket_number), ids, origem: ORIGEM })
      }
    })
  })
  console.log(`\n✓ ${ids.length} chamado(s) encerrado(s).`)
}

main().catch(e => { console.error('ERRO:', e.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
