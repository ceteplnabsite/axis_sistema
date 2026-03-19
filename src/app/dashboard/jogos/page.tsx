
import { prisma } from "@/lib/prisma"
import JogosAdminClient from "./JogosAdminClient"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function JogosAdminPage() {
  const session = await auth()
  
  if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
    redirect("/login")
  }

  const [inscricoes, modalidades, config] = await Promise.all([
    prisma.sportsTeam.findMany({
      include: {
        modality: true,
        members: {
          include: {
            student: {
              include: {
                turma: true,
                notas: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.sportModality.findMany({
      where: { isActive: true }
    }),
    prisma.sportsSettings.findFirst()
  ])

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <JogosAdminClient 
        initialInscricoes={JSON.parse(JSON.stringify(inscricoes))} 
        modalities={JSON.parse(JSON.stringify(modalidades))}
        config={JSON.parse(JSON.stringify(config || { minGrade: 6, minAttendance: 75, maxInfrequentPercent: 20 }))}
      />
    </div>
  )
}
