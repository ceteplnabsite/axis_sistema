"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function resolvePendencia(messageId: string) {
  const session = await auth()
  const user = session?.user as any
  
  if (!user || (!user.isSuperuser && !user.isDirecao)) {
    return { error: "Não autorizado" }
  }

  try {
    // Mark the message as resolved instead of deleting
    await prisma.message.update({
      where: { id: messageId },
      data: { isResolved: true }
    })
    
    revalidatePath("/dashboard/admin/pendencias")
    return { success: true }
  } catch (error) {
    console.error("Erro ao resolver pendência:", error)
    return { error: "Erro ao resolver solicitação" }
  }
}

export async function responderPendencia(parentId: string, content: string) {
  const session = await auth()
  const user = session?.user as any
  
  if (!user || (!user.isSuperuser && !user.isDirecao)) {
    return { error: "Não autorizado" }
  }

  try {
    const originalMessage = await prisma.message.findUnique({
      where: { id: parentId },
      select: { senderId: true, subject: true }
    })

    if (!originalMessage) return { error: "Mensagem original não encontrada" }

    // Create reply
    const reply = await prisma.message.create({
      data: {
        subject: `Re: ${originalMessage.subject}`,
        content: `<p><strong>Resposta da Administração:</strong></p>${content}`,
        category: "SUPORTE",
        senderId: user.id,
        receiverId: originalMessage.senderId,
        parentId: parentId,
        isRead: false
      }
    })

    // Mark as read by sender (admin)
    await prisma.messageRead.create({
      data: {
        messageId: reply.id,
        userId: user.id
      }
    })

    revalidatePath("/dashboard/admin/pendencias")
    return { success: true }
  } catch (error) {
    console.error("Erro ao responder pendência:", error)
    return { error: "Erro ao enviar resposta" }
  }
}
