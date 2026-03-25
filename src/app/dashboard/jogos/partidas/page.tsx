import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import MatchesClient from "./MatchesClient"

export default async function MatchesPage() {
  const session = await auth()
  if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
    redirect("/login")
  }

  const [modalities, teams, matches] = await Promise.all([
    prisma.sportModality.findMany({ where: { isActive: true } }),
    prisma.sportsTeam.findMany({ 
      where: { status: 'APPROVED' },
      include: { modality: true } 
    }),
    prisma.gameMatch.findMany({
      include: {
        team1: true,
        team2: true,
        winner: true,
        modality: true
      },
      orderBy: { matchDate: 'asc' }
    })
  ])

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <MatchesClient 
        modalities={JSON.parse(JSON.stringify(modalities))}
        teams={JSON.parse(JSON.stringify(teams))}
        initialMatches={JSON.parse(JSON.stringify(matches))}
      />
    </div>
  )
}
