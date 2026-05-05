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
    // Delete the message completely to mark as resolved for everyone
    await prisma.message.delete({
      where: { id: messageId }
    })
    
    revalidatePath("/dashboard/admin/pendencias")
    return { success: true }
  } catch (error) {
    console.error("Erro ao resolver pendência:", error)
    return { error: "Erro ao resolver solicitação" }
  }
}
