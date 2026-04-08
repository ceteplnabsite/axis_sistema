
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const cursoId = (await prisma.curso.findFirst())?.id;
    if (!cursoId) {
        console.log("Nenhum curso encontrado no banco.");
        return;
    }

    console.log(`Testando busca por cursoId: ${cursoId}`);
    const itens = await prisma.matrizCurricular.findMany({
        where: { cursoId: cursoId }
    });

    console.log(`Encontrados ${itens.length} itens para o curso.`);
    if (itens.length > 0) {
        console.log(`Exemplo de série: "${itens[0].serie}"`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
