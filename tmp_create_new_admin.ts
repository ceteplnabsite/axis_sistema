import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando alteração do administrador...')
  
  // 1. Tentar apagar o admin antigo
  try {
    const adminAntigo = await prisma.user.findFirst({
      where: {
        OR: [{ username: 'admin' }, { email: 'admin@cetep.edu.br' }]
      }
    })
    
    if (adminAntigo) {
      console.log(`Apagando o usuário antigo (${adminAntigo.email})...`)
      await prisma.user.delete({
        where: { id: adminAntigo.id }
      })
      console.log('Usuário antigo apagado com sucesso!')
    }
  } catch (error) {
    console.error('Aviso: Não foi possível apagar o admin antigo (provavelmente já tinha algum registro vinculado). Ele será ignorado.', error)
  }

  // 2. Criar a nova conta de admin para a Andressa
  console.log('Criando a nova conta de administrador para andressamirellaf@gmail.com...')
  const hashedPassword = await bcrypt.hash('08Anndy!', 10)
  
  // Verifica se a nova conta já existe caso o script rode duas vezes
  const existeNova = await prisma.user.findFirst({
      where: { email: 'andressamirellaf@gmail.com' }
  })
  
  if (!existeNova) {
      const novoAdmin = await prisma.user.create({
        data: {
          username: 'andressamirella',
          email: 'andressamirellaf@gmail.com',
          password: hashedPassword,
          name: 'Andressa Mirella',
          isSuperuser: true,
          isStaff: true,
          isActive: true,
          isApproved: true,
          isDirecao: true
        }
      })
      console.log('--- NOVO ADMIN CRIADO COM SUCESSO ---')
      console.log('Usuário:', novoAdmin.username)
      console.log('E-mail:', novoAdmin.email)
  } else {
      console.log('A conta andressamirellaf@gmail.com já existe! Atualizando a senha só por garantia...')
      await prisma.user.update({
          where: { id: existeNova.id },
          data: { password: hashedPassword }
      })
      console.log('Senha atualizada com sucesso.')
  }
}

main()
  .catch((e) => console.error('Erro na execução:', e))
  .finally(async () => await prisma.$disconnect())
