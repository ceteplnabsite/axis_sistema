import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando limpeza de superusuários...')
  
  // 1. Procurar todos os superusuários atuais
  const superusers = await prisma.user.findMany({
      where: { isSuperuser: true }
  })
  
  console.log(`Encontrados ${superusers.length} superusuário(s). Apagando...`)
  
  // 2. Apagar todos - um por um para não dar erro de relação dependendo do que já foi criado
  for (const user of superusers) {
      try {
          // Ignora se for o próprio email que vamos criar agora, caso o script rode duas vezes
          if (user.email === 'ceteplnabsite@gmail.com') continue;

          await prisma.user.delete({
              where: { id: user.id }
          })
          console.log(`Apagado: ${user.email}`)
      } catch (e) {
         console.log(`Erro ao apagar ${user.email}. Ele já tem registros vinculados. Removendo privilégios de admin em vez de apagar...`)
         await prisma.user.update({
             where: { id: user.id },
             data: { 
                 isSuperuser: false,
                 isDirecao: false,
                 isActive: false, 
                 isApproved: false 
             }
         })
      }
  }

  // 3. Criar a nova conta de admin para ceteplnabsite@gmail.com
  console.log('Criando a nova conta de administrador central...')
  const hashedPassword = await bcrypt.hash('admin123', 10) // Senha padrão: admin123
  
  const existeBase = await prisma.user.findFirst({
      where: { email: 'ceteplnabsite@gmail.com' }
  })
  
  if (!existeBase) {
      const novoAdmin = await prisma.user.create({
        data: {
          username: 'cetep_admin',
          email: 'ceteplnabsite@gmail.com',
          password: hashedPassword,
          name: 'Administração CETEP',
          isSuperuser: true,
          isStaff: true,
          isActive: true,
          isApproved: true,
          isDirecao: true
        }
      })
      console.log('--- NOVO ADMIN CRIADO COM SUCESSO ---')
      console.log('E-mail:', novoAdmin.email)
  } else {
      console.log('O e-mail ceteplnabsite@gmail.com já existia no banco! Promovendo a SuperUser e atualizando a senha.')
      await prisma.user.update({
          where: { id: existeBase.id },
          data: { 
              password: hashedPassword,
              isSuperuser: true,
              isStaff: true,
              isActive: true,
              isApproved: true,
              isDirecao: true
          }
      })
      console.log('Usuário promovido com sucesso.')
  }
}

main()
  .catch((e) => console.error('Erro:', e))
  .finally(async () => await prisma.$disconnect())
