import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DIAS_FECHAMENTO_AUTOMATICO, fecharChamadosSemRetorno } from '@/lib/chamados'

/**
 * Rotina diária dos chamados (vercel.json → todo dia 10:30 UTC = 7h30 Bahia).
 *
 * Fecha como "Resolvido" o chamado que a equipe respondeu e o solicitante não voltou
 * a escrever há DIAS_FECHAMENTO_AUTOMATICO dias. Se ele responder depois, o chamado reabre.
 *
 * Acesso: a Vercel chama com "Authorization: Bearer <CRON_SECRET>".
 * Administrador logado pode abrir /api/cron/chamados?simular=1 para ver o que seria fechado.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const simular = request.nextUrl.searchParams.get('simular') === '1'
  const segredo = process.env.CRON_SECRET
  const viaCron = !!segredo && request.headers.get('authorization') === `Bearer ${segredo}`

  if (!viaCron) {
    const session = await auth()
    if (!session?.user?.isSuperuser || !simular) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
  }

  const r = await fecharChamadosSemRetorno({ simular })

  if (!simular && r.fechados) {
    const sistema = await prisma.user.findFirst({ where: { isSuperuser: true, isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true } })
    if (sistema) {
      await prisma.auditLog.create({
        data: {
          userId: sistema.id, entityType: 'USUARIO', entityId: 'chamados', action: 'UPDATE',
          details: JSON.stringify({ acao: 'FECHAR_CHAMADOS_SEM_RETORNO', dias: DIAS_FECHAMENTO_AUTOMATICO, fechados: r.fechados, porCategoria: r.porCategoria, ids: r.ids })
        }
      })
    }
  }

  return NextResponse.json({ simulacao: simular, dias: DIAS_FECHAMENTO_AUTOMATICO, fechados: r.fechados, porCategoria: r.porCategoria })
}
