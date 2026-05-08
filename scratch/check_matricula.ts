
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:08CetepaA!%40@db.temluomkwlbvffiwoghj.supabase.co:5432/postgres"
    }
  }
})

async function check() {
  const matricula = '10563617'
  console.log('Checando matrícula:', matricula)
  try {
    const est = await prisma.estudante.findUnique({ where: { matricula } })
    const user = await prisma.user.findUnique({ where: { username: matricula } })
    
    console.log('Estudante encontrado:', est ? 'SIM' : 'NÃO')
    if (est) console.log(JSON.stringify(est, null, 2))
    
    console.log('Usuário encontrado:', user ? 'SIM' : 'NÃO')
    if (user) console.log(JSON.stringify(user, null, 2))
  } catch (err) {
    console.error('Erro ao consultar:', err)
  } finally {
    await prisma.$disconnect()
  }
}

check()
