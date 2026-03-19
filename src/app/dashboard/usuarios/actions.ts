
'use server';

import { prisma } from "@/lib/prisma"

export async function getPendingUsersCount() {
  try {
    const count = await prisma.user.count({
      where: {
        isApproved: false
      }
    })
    return count
  } catch (error) {
    console.error("Erro ao contar usuários pendentes:", error)
    return 0
  }
}
