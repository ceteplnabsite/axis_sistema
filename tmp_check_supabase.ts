import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function test() {
  try {
     const count = await prisma.user.count()
     console.log('Local Connection Success, users:', count)
  } catch(e: any) {
     console.log('Local Connection Failed', e.message)
  }
}
test().catch(console.error).finally(async ()=>await prisma.$disconnect())
