import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { logAudit } from '@/lib/audit'

export const runtime = 'nodejs'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    
    if (!session || !session.user.isSuperuser) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    const data = await request.json()
    const { 
      name, email, username, password, 
      isSuperuser, isDirecao, isStaff, isActive, disciplinasIds 
    } = data

    // Regra de Exclusividade: Se houver novas disciplinas, remover de outros professores
    if (disciplinasIds && Array.isArray(disciplinasIds) && disciplinasIds.length > 0) {
      await prisma.$executeRawUnsafe(`
        DELETE FROM "_DisciplinaUsuarios" 
        WHERE "A" = ANY($1) AND "B" != $2
      `, disciplinasIds, id)
    }

    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) {
      updateData.email = email
      updateData.username = email
    }
    if (isSuperuser !== undefined) updateData.isSuperuser = isSuperuser
    if (isDirecao !== undefined) updateData.isDirecao = isDirecao
    if (isStaff !== undefined) updateData.isStaff = isStaff
    if (isActive !== undefined) updateData.isActive = isActive
    
    if (disciplinasIds !== undefined) {
      updateData.disciplinasPermitidas = {
        set: disciplinasIds.map((id: string) => ({ id }))
      }
    }

    if (password && password.trim() !== '') {
      updateData.password = await hash(password, 10)
    }

    try {
      // Tentar atualização normal via Prisma Client
        await prisma.user.update({
          where: { id },
          data: updateData
        })
        
        await logAudit(
          session.user.id,
          'USUARIO',
          id,
          'UPDATE',
          { fields: Object.keys(updateData).filter(k => k !== 'password') }
        )

        return NextResponse.json({ message: 'Usuário atualizado com sucesso' })
    } catch (prismaError: any) {
      console.warn('Prisma Client falhou no UPDATE, tentando fallback via SQL bruto...', prismaError.message)
      
      // Fallback via SQL Bruto para campos que o Prisma pode não reconhecer por cache
      const sqlFields: string[] = []
      const values: any[] = []
      let valIdx = 1

      if (name !== undefined) { sqlFields.push(`name = $${valIdx++}`); values.push(name) }
      if (email !== undefined) { 
        sqlFields.push(`email = $${valIdx++}`); values.push(email)
        sqlFields.push(`username = $${valIdx++}`); values.push(email) 
      }
      if (isSuperuser !== undefined) { sqlFields.push(`is_superuser = $${valIdx++}`); values.push(!!isSuperuser) }
      if (isDirecao !== undefined) { sqlFields.push(`is_direcao = $${valIdx++}`); values.push(!!isDirecao) }
      if (isStaff !== undefined) { sqlFields.push(`is_staff = $${valIdx++}`); values.push(!!isStaff) }
      if (isActive !== undefined) { sqlFields.push(`is_active = $${valIdx++}`); values.push(!!isActive) }
      if (updateData.password) { sqlFields.push(`password = $${valIdx++}`); values.push(updateData.password) }

      if (sqlFields.length > 0) {
        values.push(id)
        await prisma.$executeRawUnsafe(`
          UPDATE "users" SET ${sqlFields.join(', ')}, updated_at = NOW() WHERE id = $${valIdx}
        `, ...values)
      }

      // Disciplinas precisam ser tratadas separadamente se houver alteração
      if (disciplinasIds !== undefined) {
        await prisma.$executeRawUnsafe(`DELETE FROM "_DisciplinaUsuarios" WHERE "B" = $1`, id)
        for (const dId of disciplinasIds) {
          await prisma.$executeRawUnsafe(`INSERT INTO "_DisciplinaUsuarios" ("A", "B") VALUES ($1, $2)`, dId, id)
        }
      }

      await logAudit(
        session.user.id,
        'USUARIO',
        id,
        'UPDATE',
        { method: 'SQL_FALLBACK', fields: sqlFields.map((f: string) => f.split(' ')[0]) }
      )

      return NextResponse.json({ message: 'Usuário atualizado via SQL (Fallback)' })
    }

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json(
      { message: 'Erro ao atualizar usuário' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    
    if (!session || !session.user.isSuperuser) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    // Impedir que o usuário se exclua
    if (session.user.id === id) {
      return NextResponse.json({ message: 'Você não pode excluir seu próprio usuário' }, { status: 400 })
    }

    const userToDelete = await prisma.user.findUnique({ where: { id } })
    if (!userToDelete) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
    }

    await prisma.user.delete({
      where: { id }
    })

    await logAudit(
      session.user.id,
      'USUARIO',
      id,
      'DELETE',
      { name: userToDelete.name, email: userToDelete.email }
    )

    return NextResponse.json({ message: 'Usuário excluído com sucesso' })

  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir usuário' },
      { status: 500 }
    )
  }
}
