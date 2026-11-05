import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { dadosResultados } from '@/lib/resultados'
import { gerarPdfResultados, type UnidadeRelatorio } from '@/lib/resultados-pdf'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    if (!session.user.isSuperuser && !session.user.isDirecao) {
      return NextResponse.json({ message: 'Acesso restrito à Direção' }, { status: 403 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const unit = (searchParams.get('unit') || 'FINAL') as UnidadeRelatorio

    const dados = await dadosResultados(id)
    if (!dados) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 })
    }
    const { turma } = dados
    const pdfBuffer = gerarPdfResultados(dados, unit)


    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="resultado-${unit}-${turma.nome.replace(/\s+/g, '-')}.pdf"`
      }
    })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ message: 'Erro ao gerar PDF' }, { status: 500 })
  }
}
