import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enviarEmail, type ResultadoEnvio } from '@/lib/mail'
import { pendenciasPorProfessor, emailNotasPendentes, faltasPorUnidade, assuntosRecuperacaoPendentes, type AssuntoPendente, type PendenciasProfessor } from '@/lib/notas-pendentes'
import { LEMBRETE_INICIO_PADRAO, dataValida, hojeNaBahia } from '@/config/lembrete-notas'

/**
 * Lembrete diário de notas não lançadas (agendado em vercel.json → todo dia 10:00 UTC = 7h Bahia).
 *
 * - Liga/desliga e data de início na tela Configurações (admin master); padrão 20/11/2026.
 * - A partir da data, cobra TODAS as unidades: regulares 3, PROEJA/SUBSEQUENTE/PROSUB 2. INF conta como lançada.
 * - Um e-mail por professor, com todas as turmas/disciplinas dele; quem não tem pendência não recebe.
 * - Também cobra o assunto da recuperação: disciplina com aluno em RC definitivo e sem assunto informado.
 * - Nunca envia duas vezes no mesmo dia (registro na Auditoria).
 *
 * Acesso: a Vercel chama com "Authorization: Bearer <CRON_SECRET>".
 * Administrador logado pode abrir /api/cron/lembrete-notas?simular=1 (e &dia=AAAA-MM-DD) para ver a prévia.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ACAO = 'LEMBRETE_NOTAS_PENDENTES'

export async function GET(request: NextRequest) {
  const simular = request.nextUrl.searchParams.get('simular') === '1'
  const segredo = process.env.CRON_SECRET
  const viaCron = !!segredo && request.headers.get('authorization') === `Bearer ${segredo}`

  if (!viaCron) {
    // fora do agendamento, só administrador e só em prévia
    const session = await auth()
    if (!session?.user?.isSuperuser || !simular) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
  }

  const config = await prisma.globalConfig.findUnique({ where: { id: 'global' }, select: { lembreteNotasAtivo: true, lembreteNotasInicio: true } })
  const ativo = config?.lembreteNotasAtivo ?? true
  const inicio = dataValida(config?.lembreteNotasInicio) ? config!.lembreteNotasInicio : LEMBRETE_INICIO_PADRAO
  const hoje = hojeNaBahia()
  const diaPrevia = request.nextUrl.searchParams.get('dia')
  const dia = simular && dataValida(diaPrevia) ? diaPrevia : hoje

  if (!simular) {
    if (!ativo) return NextResponse.json({ pulado: true, motivo: 'Lembrete desligado em Configurações', hoje })
    if (hoje < inicio) return NextResponse.json({ pulado: true, motivo: `Lembretes começam em ${inicio}`, hoje })
  }

  const { porProfessor, semProfessor } = await pendenciasPorProfessor({})
  // junta, por professor, as notas pendentes e os assuntos de recuperação não informados
  const juntos = new Map<string, PendenciasProfessor & { assuntos: AssuntoPendente[] }>(porProfessor.map(p => [p.id, { ...p, assuntos: [] }]))
  for (const a of await assuntosRecuperacaoPendentes()) {
    if (!juntos.has(a.id)) juntos.set(a.id, { id: a.id, nome: a.nome, email: a.email, ativo: a.ativo, itens: [], assuntos: [] })
    juntos.get(a.id)!.assuntos = a.itens
  }
  const ativos = [...juntos.values()].filter(p => p.ativo)

  if (simular) {
    return NextResponse.json({
      simulacao: true, hoje, dia, inicio, lembreteAtivo: ativo, enviariaNoDia: ativo && dia >= inicio,
      professores: ativos.length, inativosIgnorados: juntos.size - ativos.length,
      semProfessor,
      resumo: ativos.map(p => ({
        professor: p.nome,
        email: p.email,
        itens: p.itens.map(i => ({ turma: i.turma, disciplina: i.disciplina, faltasPorUnidade: faltasPorUnidade(i) })),
        assuntoRecuperacao: p.assuntos.map(a => ({ turma: a.turma, disciplina: a.disciplina, alunosRC: a.alunosRC }))
      }))
    })
  }

  // auditoria precisa de um usuário: usa o administrador do sistema
  const sistema = await prisma.user.findFirst({ where: { isSuperuser: true, isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true } })
  const jaEnviado = await prisma.auditLog.findFirst({
    where: { action: 'CREATE', entityType: 'USUARIO', details: { contains: `"acao":"${ACAO}","dia":"${hoje}"` } },
    select: { id: true }
  })
  if (jaEnviado) {
    return NextResponse.json({ pulado: true, motivo: `Lembrete de ${hoje} já foi enviado`, hoje })
  }
  // marca o dia antes de enviar: se a Vercel repetir a chamada, não duplica
  const registro = sistema && await prisma.auditLog.create({
    data: { userId: sistema.id, entityType: 'USUARIO', entityId: 'lembrete-notas', action: 'CREATE', details: JSON.stringify({ acao: ACAO, dia: hoje, status: 'enviando' }) }
  })

  // envia em lotes de 5 para caber no tempo da função
  const resultados: { email: string; resultado: ResultadoEnvio }[] = []
  for (let i = 0; i < ativos.length; i += 5) {
    const lote = ativos.slice(i, i + 5)
    resultados.push(...await Promise.all(lote.map(async p => {
      const { assunto, html } = emailNotasPendentes(p, { motivo: 'LEMBRETE', assuntos: p.assuntos })
      return { email: p.email, resultado: await enviarEmail(p.email, assunto, html) }
    })))
  }

  const contagem = resultados.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.resultado]: (acc[r.resultado] ?? 0) + 1 }), {})
  if (registro) {
    await prisma.auditLog.update({
      where: { id: registro.id },
      data: { details: JSON.stringify({ acao: ACAO, dia: hoje, status: 'concluido', contagem, falhas: resultados.filter(r => r.resultado === 'erro').map(r => r.email) }) }
    })
  }

  return NextResponse.json({ hoje, professores: ativos.length, contagem })
}
