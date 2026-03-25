import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { modalityId } = await req.json();

    if (!modalityId) {
      return NextResponse.json({ error: "Modalidade não informada" }, { status: 400 });
    }

    // 1. Apagar partidas antigas desta modalidade (para recomeçar)
    await prisma.gameMatch.deleteMany({
      where: { modalityId }
    });

    // 2. Buscar equipes aprovadas
    const teams = await prisma.sportsTeam.findMany({
      where: { modalityId, status: 'APPROVED' }
    });

    if (teams.length < 2) {
      return NextResponse.json({ error: "É necessário ao menos 2 equipes aprovadas para gerar chaves." }, { status: 400 });
    }

    // 3. Embaralhar equipes
    const shuffled = [...teams].sort(() => Math.random() - 0.5);

    // 4. Agrupar em pares
    const matchesData = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      const team1 = shuffled[i];
      const team2 = shuffled[i+1]; // Pode ser undefined se for ímpar

      matchesData.push({
        modalityId,
        team1Id: team1.id,
        team2Id: team2?.id || null, // BYE se for ímpar
        round: 1,
        status: team2 ? 'PENDING' : 'COMPLETED',
        score1: 0,
        score2: 0,
        winnerId: team2 ? null : team1.id
      });
    }

    // 5. Criar no banco
    await prisma.gameMatch.createMany({
      data: matchesData
    });

    // 6. Retornar novas partidas
    const newMatches = await prisma.gameMatch.findMany({
      where: { modalityId },
      include: { team1: true, team2: true, winner: true, modality: true }
    });

    return NextResponse.json({ success: true, matches: newMatches });

  } catch (error) {
    console.error("Erro ao gerar chaves:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
