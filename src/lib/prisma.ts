import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

if (!globalForPrisma.pool) {
  globalForPrisma.pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10, // Limita o número de conexões por instância para não estourar o limite do plano grátis
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })
}

const adapter = new PrismaPg(globalForPrisma.pool)

// Forçando a atualização do cliente Prisma
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
