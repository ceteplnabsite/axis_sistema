import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import PendenciasClient from "./PendenciasClient"

export const metadata = {
  title: "Pendências de Cadastro | Sistema de Notas",
}

export default async function PendenciasPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }
  
  const user = session.user as any
  if (!user.isSuperuser && !user.isDirecao) {
    redirect("/dashboard")
  }

  // Buscar mensagens de "Cadastro Pendente"
  const pendencias = await prisma.message.findMany({
    where: {
      subject: { startsWith: "[Cadastro Pendente]" },
    },
    include: {
      sender: {
        select: {
          name: true,
          username: true
        }
      },
      replies: {
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: { name: true, username: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return <PendenciasClient pendencias={pendencias} />
}
