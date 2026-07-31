import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
})
async function main() {
  const result = await prisma.notaSimulado.deleteMany({
    where: {
      estudanteId: "10576946",
      unidade: 2
    }
  })
  console.log("Deleted:", result)
}
main()
