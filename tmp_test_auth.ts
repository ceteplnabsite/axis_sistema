import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const credentials = { username: 'andressamirellaf@gmail.com', password: '08Anndy!' }
  
  const user = await prisma.user.findFirst({
      where: {
        OR: [
            { username: { equals: credentials.username, mode: 'insensitive' } },
            { email: { equals: credentials.username, mode: 'insensitive' } }
        ]
      }
  })

  if (!user) { console.log('user n existe'); return; }
  console.log('User found:', user.email, 'isActive:', user.isActive)

  const passwordMatch = await bcrypt.compare(credentials.password, user.password)
  console.log('pwdMatch:', passwordMatch)
  
  try {
     await prisma.$executeRaw`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`
     console.log('Updated last_login (users)')
  } catch (e1: unknown) {
     console.log('Error users:', (e1 as Error).message)
     try {
         await prisma.$executeRaw`UPDATE "User" SET last_login = NOW() WHERE id = ${user.id}`
         console.log('Updated last_login (User)')
     } catch (e2: unknown) {
         console.log('Error User:', (e2 as Error).message)
     }
  }
}
main().catch(console.error).finally(async () => await prisma.$disconnect())
