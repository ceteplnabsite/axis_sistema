import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function testGet() {
  try {
    console.log("Testando busca na MatrizCurricular...")
    const where = {}
    const matriz = await prisma.matrizCurricular.findMany({
      where,
      include: {
        area: { select: { nome: true } }
      },
      orderBy: { nome: 'asc' }
    })
    console.log("Sucesso! Itens encontrados:", matriz.length)
  } catch (error) {
    console.error("ERRO DETECTADO NO BANCO:", error)
  } finally {
    await prisma.$disconnect()
  }
}

testGet()
