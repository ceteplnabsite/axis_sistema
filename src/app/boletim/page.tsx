import { prisma } from '@/lib/prisma'
import BoletimClient from './BoletimClient'

export const metadata = { title: 'Consulte seu resultado · CETEP LNAB' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Página pública (sem login): o aluno consulta o próprio resultado pela matrícula */
export default async function BoletimPage() {
  const config = await prisma.globalConfig.findUnique({ where: { id: 'global' }, select: { boletimOnlineAtivo: true } })
  return <BoletimClient aberto={!!config?.boletimOnlineAtivo} />
}
