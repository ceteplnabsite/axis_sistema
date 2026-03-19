
import { PrismaClient } from "@prisma/client"
import JogosAdminClient from "./JogosAdminClient"
import { authOptions } from "@/lib/auth"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

const prisma = new PrismaClient()

export default async function JogosAdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const [inscricoes, modalidades, config] = await Promise.all([
    prisma.sportsTeam.findMany({
      include: {
        modality: true,
        members: {
          include: {
            student: {
              include: {
                turma: true,
                notas: true,
                frequencias: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.sportModality.findMany(),
    prisma.sportsSettings.findFirst()
  ])

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <JogosAdminClient 
        initialInscricoes={JSON.parse(JSON.stringify(inscricoes))} 
        modalities={modalities}
        config={JSON.parse(JSON.stringify(config))}
      />
    </div>
  )
}
