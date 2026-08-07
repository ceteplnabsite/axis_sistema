import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  return NextResponse.json(
    { message: 'O autocadastro público está temporariamente desativado. Solicite seu acesso diretamente à coordenação ou direção da escola.' },
    { status: 403 }
  )
}

