import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.findFirst({
    where: { 
        OR: [
            { username: 'admin' },
            { email: 'admin@axis.com' }
        ]
    }
  })
  
  if (admin) {
      console.log('--- ADMIN ENCONTRADO ---')
      console.log('Username:', admin.username)
      console.log('E-mail:', admin.email)
      console.log('Is Active:', admin.isActive)
      console.log('Is Approved:', admin.isApproved)
      console.log('Is Direcao:', admin.isDirecao)
      
      const pwdMatch = await bcrypt.compare('admin123', admin.password)
      console.log('A senha é admin123?', pwdMatch)
  } else {
      console.log('⚠️ Nenhum usuário admin encontrado no banco!')
      
      // Mostrar todos os usuários do banco
      const users = await prisma.user.findMany()
      console.log('Lista de todos os usuários:', users.map(u => ({ username: u.username, email: u.email })))
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())
