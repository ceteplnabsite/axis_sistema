
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()
const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Limpando mensagens existentes...')
  await prisma.messageRead.deleteMany({})
  await prisma.messageDelete.deleteMany({})
  await prisma.message.deleteMany({})
  console.log('✅ Mensagens limpas.')

  console.log('🚀 Populando novas mensagens...')

  // 1. Obter usuários necessários
  const professores = await prisma.user.findMany({
    where: { username: { contains: '.prof' } }
  })
  
  const direcao = await prisma.user.findFirst({
    where: { OR: [{ isDirecao: true }, { isSuperuser: true }] }
  })

  if (!direcao || professores.length === 0) {
    console.log('❌ Usuários necessários não encontrados.')
    return
  }

  // 2. Mensagens dos Professores para o SUPORTE
  console.log('🛠️ Criando mensagens de suporte...')
  const suporteMsgs = [
    { 
        sender: professores[0], 
        subject: 'Dificuldade no lançamento de notas', 
        content: 'Olá suporte, estou tentando lançar as notas da turma 1TIM1 mas o sistema está dando erro ao salvar a unidade 3.' 
    },
    { 
        sender: professores[1], 
        subject: 'Dúvida sobre Plano de Ensino', 
        content: 'Como posso excluir um plano que cadastrei na quinzena errada? Não encontrei o botão de delete.' 
    }
  ]

  for (const m of suporteMsgs) {
    await prisma.message.create({
      data: {
        subject: m.subject,
        content: m.content,
        category: 'SUPORTE',
        senderId: m.sender.id,
        receiverId: null // Support is broadcast to admins
      }
    })
  }

  // 3. Mensagens da Direção para TODOS (Comunicados Gerais)
  console.log('📢 Criando comunicados da direção...')
  const comunicadosDirecao = [
    {
        subject: '⚠️ Encerramento do Prazo de Notas - 1º Unidade',
        content: 'Prezados, lembramos que o prazo para o lançamento das notas da 1ª unidade encerra-se na próxima sexta-feira. Favor regularizar as pendências.',
        category: 'COMUNICADO',
        receiver: null // Para todos
    },
    {
        subject: '📅 Reunião de Planejamento Pedagógico',
        content: 'Convidamos todos os docentes para a reunião de planejamento que ocorrerá no auditório central às 14h.',
        category: 'COMUNICADO',
        receiver: 'GROUP_STAFF' // Apenas para o corpo docente
    },
    {
        subject: '✨ Boas-vindas ao ano letivo 2026',
        content: 'Sejam bem-vindos ao Áxis! Estamos felizes em iniciar mais um ciclo com vocês. Em caso de dúvidas, procurem o suporte.',
        category: 'COMUNICADO',
        receiver: null
    }
  ]

  for (const c of comunicadosDirecao) {
    await prisma.message.create({
      data: {
        subject: c.subject,
        content: c.content,
        category: c.category as any,
        senderId: direcao.id,
        receiverId: c.receiver
      }
    })
  }

  console.log('✨ Mensagens e comunicados populados com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
