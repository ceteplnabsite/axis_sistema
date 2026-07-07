const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const student = await prisma.estudante.findUnique({
    where: { matricula: '10709047' },
    include: { notas: true }
  })
  console.log(JSON.stringify(student, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
