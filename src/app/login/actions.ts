"use server"

import { prisma } from "@/lib/prisma"
import { enviarSenhaPorEmail } from "@/lib/mail"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function resetPassword(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    })

    if (!user) {
      return { success: false, message: "E-mail não encontrado." }
    }

    // Gerar nova senha aleatória (8 caracteres)
    const newPassword = crypto.randomBytes(4).toString("hex")

    // Enviar a nova senha por e-mail ANTES de gravar no banco: se o envio falhar,
    // a senha atual do usuário permanece válida em vez de trocarmos por algo que ele nunca vai receber.
    const emailSent = await enviarSenhaPorEmail(email, user.name || user.username, newPassword)

    if (!emailSent) {
      return {
        success: false,
        message: "Não foi possível enviar o e-mail com a nova senha. Tente novamente mais tarde ou contate o suporte.",
      }
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Atualizar senha no banco
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
      },
    })

    return { success: true, message: "Nova senha enviada para seu e-mail." }
  } catch (error) {
    console.error("Erro ao resetar senha:", error)
    return { success: false, message: "Erro interno ao processar solicitação." }
  }
}
