/**
 * Cadastra professores do horário 2026.2 que ainda não existem no sistema.
 * Ficam ativos e APROVADOS (podem entrar direto). Não envia e-mail.
 * Senha inicial padrão — peça para a pessoa trocar em Perfil no primeiro acesso.
 *
 * Uso:
 *   npx tsx scripts/horario-2026-2/criar-usuarios.ts --usuario=admin
 *   npx tsx scripts/horario-2026-2/criar-usuarios.ts --usuario=admin --executar --banco=<nome_do_banco>
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import fs from 'fs'

const prisma = new PrismaClient()
const ORIGEM = 'script horario-2026-2 (criar-usuarios)'
// dados pessoais ficam fora do git (repositório público): dados/horario-2026-2/novos-professores.json
// formato: { "senhaPadrao": "...", "professores": [{ "name": "...", "email": "..." }] }
const CONFIG = 'dados/horario-2026-2/novos-professores.json'
const { senhaPadrao: SENHA_PADRAO, professores: NOVOS } = JSON.parse(fs.readFileSync(CONFIG, 'utf8')) as {
  senhaPadrao: string; professores: { name: string; email: string }[]
}

const arg = (n: string) => process.argv.find(a => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=')

async function main() {
  const executar = process.argv.includes('--executar')
  const url = new URL(process.env.DATABASE_URL!)
  const nomeBanco = url.pathname.slice(1)
  console.log(`Banco: ${nomeBanco} @ ${url.host}\nModo:  ${executar ? '*** EXECUÇÃO ***' : 'SIMULAÇÃO (nada será gravado)'}\n`)
  if (executar && arg('banco') !== nomeBanco) throw new Error(`Para executar, confirme com --banco=${nomeBanco}`)
  const login = arg('usuario')
  const admin = login && await prisma.user.findFirst({ where: { OR: [{ username: login }, { email: login }] } })
  if (!admin || !admin.isSuperuser) throw new Error('Informe --usuario=<login de superusuário>')

  const senhaHash = await hash(SENHA_PADRAO, 10)
  for (const n of NOVOS) {
    const existe = await prisma.user.findFirst({
      where: { OR: [{ email: { equals: n.email, mode: 'insensitive' } }, { username: { equals: n.email, mode: 'insensitive' } }] }
    })
    if (existe) { console.log(`ok     ${n.name} já cadastrada (${existe.name?.trim()})`); continue }
    if (!executar) { console.log(`CRIAR  ${n.name} <${n.email}> — professor(a), ativo(a), aprovado(a)`); continue }
    const u = await prisma.user.create({
      data: { name: n.name, email: n.email, username: n.email, password: senhaHash, isStaff: true, isActive: true, isApproved: true }
    })
    await prisma.auditLog.create({ data: { userId: admin.id, entityType: 'USUARIO', entityId: u.id, action: 'CREATE', details: JSON.stringify({ nome: n.name, email: n.email, origem: ORIGEM }) } })
    console.log(`CRIADO ${n.name} <${n.email}>`)
  }
  console.log(`\n${executar ? 'GRAVADO no banco.' : 'Simulação: NADA foi gravado.'}`)
}

main().catch(e => { console.error('FALHOU:', e.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
