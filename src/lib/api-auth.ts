// Verificações de acesso para rotas de API (as telas escondem botões, mas a API precisa barrar sozinha).
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

/** Só Direção e TI. Retorna a resposta de erro (401/403) ou null se pode seguir. */
export async function apenasGestao() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  if (!session.user.isSuperuser && !session.user.isDirecao) return NextResponse.json({ message: 'Acesso restrito à Direção' }, { status: 403 })
  return null
}

/** Só TI (administrador do sistema). */
export async function apenasTI() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  if (!session.user.isSuperuser) return NextResponse.json({ message: 'Acesso restrito ao administrador' }, { status: 403 })
  return null
}

/** Qualquer usuário logado do sistema (não vale para o portal do aluno). */
export async function apenasLogado() {
  const session = await auth()
  if (!session?.user || session.user.isPortalUser) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  return null
}
