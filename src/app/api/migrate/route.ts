import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "estudantes" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ATIVO'`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "estudantes" ADD COLUMN IF NOT EXISTS "turma_anterior_id" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "estudantes" ADD CONSTRAINT "estudantes_turma_anterior_id_fkey" FOREIGN KEY ("turma_anterior_id") REFERENCES "turmas"("id") ON DELETE SET NULL ON UPDATE CASCADE`)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message })
  }
}
