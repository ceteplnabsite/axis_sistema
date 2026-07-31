import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function run() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "estudantes" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ATIVO'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "estudantes" ADD COLUMN IF NOT EXISTS "turma_anterior_id" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "estudantes" ADD CONSTRAINT "estudantes_turma_anterior_id_fkey" FOREIGN KEY ("turma_anterior_id") REFERENCES "Turma"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
