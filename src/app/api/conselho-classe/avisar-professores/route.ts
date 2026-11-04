import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { enviarEmail, type ResultadoEnvio } from '@/lib/mail'
import { pendenciasPorProfessor, emailNotasPendentes } from '@/lib/notas-pendentes'

export const runtime = 'nodejs'

/**
 * Lista (simular: true) ou envia por e-mail, para cada professor, as notas que ele ainda
 * não lançou nesta turma — o que impede o Conselho de decidir.
 * Só Direção e administradores.
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || !(session.user.isSuperuser || session.user.isDirecao)) {
    return NextResponse.json({ message: 'Apenas a Direção pode avisar professores' }, { status: 403 })
  }

  const { turmaId, simular = true } = await request.json() as { turmaId: string; simular?: boolean }
  const turma = await prisma.turma.findUnique({ where: { id: turmaId }, select: { id: true, nome: true, status: true } })
  if (!turma) return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 })
  if (turma.status === 'ENCERRADA') return NextResponse.json({ message: 'Turma encerrada' }, { status: 403 })

  const { porProfessor, semProfessor } = await pendenciasPorProfessor({ id: turma.id })

  const destinatarios = porProfessor.map(p => ({
    nome: p.nome, email: p.email, ativo: p.ativo,
    disciplinas: p.itens.map(i => ({ disciplina: i.disciplina, alunosPendentes: i.alunos.length }))
  }))

  if (simular) {
    return NextResponse.json({ turma: turma.nome, destinatarios, semProfessor: semProfessor.map(s => s.disciplina) })
  }

  const resultados: { nome: string; email: string; resultado: ResultadoEnvio | 'inativo' }[] = []
  for (const p of porProfessor) {
    if (!p.ativo) { resultados.push({ nome: p.nome, email: p.email, resultado: 'inativo' }); continue }
    const { assunto, html } = emailNotasPendentes(p, { motivo: 'CONSELHO' })
    resultados.push({ nome: p.nome, email: p.email, resultado: await enviarEmail(p.email, assunto, html) })
  }

  await logAudit(session.user.id, 'TURMA', turma.id, 'UPDATE', {
    acao: 'AVISO_NOTAS_PENDENTES', turma: turma.nome,
    enviados: resultados.map(r => `${r.nome}: ${r.resultado}`)
  })

  return NextResponse.json({ turma: turma.nome, resultados, semProfessor: semProfessor.map(s => s.disciplina) })
}
