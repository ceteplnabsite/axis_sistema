const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await client.connect();
  try {
    await client.query(`ALTER TABLE "estudantes" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ATIVO'`);
    await client.query(`ALTER TABLE "estudantes" ADD COLUMN IF NOT EXISTS "turma_anterior_id" TEXT`);
    await client.query(`ALTER TABLE "estudantes" ADD CONSTRAINT "estudantes_turma_anterior_id_fkey" FOREIGN KEY ("turma_anterior_id") REFERENCES "Turma"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}
run();
