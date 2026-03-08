import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// POST create estudante
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { nome, turmaId, matricula } = await request.json()

    if (!nome || nome.trim() === '') {
      return NextResponse.json(
        { message: 'Nome do estudante é obrigatório' },
        { status: 400 }
      )
    }

    if (!matricula) {
      return NextResponse.json(
        { message: 'Matrícula é obrigatória' },
        { status: 400 }
      )
    }

    const estudante = await prisma.estudante.create({
      data: {
        nome: nome.trim(),
        turmaId,
        matricula
      }
    })

    // Se tiver matrícula, criar acesso ao portal automaticamente
    if (matricula) {
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.hash(matricula, 10)
      
      try {
        await prisma.user.create({
            data: {
              username: matricula,
              email: `${matricula}@axis.com`,
              password: hashedPassword,
              name: nome.trim(),
              isPortalUser: true,
              estudanteId: estudante.matricula,
              isApproved: true,
              isActive: true
            }
          })
      } catch (userError) {
          console.error('Erro ao criar usuário automático do portal:', userError)
      }
    }

    return NextResponse.json(estudante, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar estudante:', error)
    return NextResponse.json(
      { message: 'Erro ao criar estudante' },
      { status: 500 }
    )
  }
}
