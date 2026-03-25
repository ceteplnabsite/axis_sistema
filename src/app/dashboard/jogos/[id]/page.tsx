import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import ManageTeamClient from "@/app/dashboard/jogos/[id]/ManageTeamClient"

export default async function ManageTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth()
  
  if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
    redirect("/login")
  }

  const team = await prisma.sportsTeam.findUnique({
    where: { id },
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
    }
  })

  if (!team) {
    return notFound()
  }

  const config = await prisma.sportsSettings.findFirst()

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <ManageTeamClient 
        team={JSON.parse(JSON.stringify(team))} 
        config={JSON.parse(JSON.stringify(config || { minGrade: 6, minAttendance: 75, maxInfrequentPercent: 20 }))}
      />
    </div>
  )
}
