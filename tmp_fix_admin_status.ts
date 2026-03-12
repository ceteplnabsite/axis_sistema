import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'andressamirellaf@gmail.com' }
  })
  
  if (user) {
      console.log('Status do Usuário:', user.email)
      console.log('isActive antes:', user.isActive)
      console.log('isApproved antes:', user.isApproved)
      
      // Vamos forçar os status para true e tentar logar
      await prisma.user.update({
          where: { id: user.id },
          data: {
              isActive: true,
              isApproved: true
          }
      })
      console.log('Status atualizados para true forçadamente!')
  } else {
      console.log('Usuário não encontrado!')
  }
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect())
