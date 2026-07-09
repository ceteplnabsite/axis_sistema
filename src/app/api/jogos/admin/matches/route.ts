import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { matchId, score1, score2, status } = await req.json();

    if (!matchId) {
      return NextResponse.json({ error: "ID da partida não informado" }, { status: 400 });
    }

    // Buscar partida atual
    const match = await prisma.gameMatch.findUnique({
      where: { id: matchId }
    });

    if (!match) {
      return NextResponse.json({ error: "Partida não encontrada" }, { status: 404 });
    }

    // Calcular vencedor
    let winnerId = null;
    if (status === 'COMPLETED') {
        if (score1 > score2) winnerId = match.team1Id;
        else if (score2 > score1) winnerId = match.team2Id;
    }

    // Atualizar
    const updated = await prisma.gameMatch.update({
      where: { id: matchId },
      data: { score1, score2, status, winnerId }
    });

    // Se a partida foi finalizada, verificar se a rodada inteira acabou
    let generatedNextRound = false;
    
    if (status === 'COMPLETED') {
        const roundMatches = await prisma.gameMatch.findMany({
            where: { modalityId: match.modalityId, round: match.round }
        });
        
        const allCompleted = roundMatches.every(m => m.status === 'COMPLETED');
        
        if (allCompleted) {
            const winners = roundMatches.map(m => m.winnerId).filter(id => id !== null) as string[];
            
            if (winners.length > 1) {
                const nextRoundExists = await prisma.gameMatch.findFirst({
                    where: { modalityId: match.modalityId, round: match.round + 1 }
                });
                
                if (!nextRoundExists) {
                    const newMatches = [];
                    for (let i = 0; i < winners.length; i += 2) {
                        const t1 = winners[i];
                        const t2 = winners[i+1];
                        
                        newMatches.push({
                            modalityId: match.modalityId,
                            team1Id: t1,
                            team2Id: t2 || null,
                            round: match.round + 1,
                            status: t2 ? 'PENDING' : 'COMPLETED',
                            winnerId: t2 ? null : t1,
                            score1: 0,
                            score2: 0
                        });
                    }
                    
                    await prisma.gameMatch.createMany({ data: newMatches });
                    generatedNextRound = true;
                }
            }
        }
    }

    if (generatedNextRound) {
        const allMatches = await prisma.gameMatch.findMany({
            where: { modalityId: match.modalityId },
            include: { team1: true, team2: true, winner: true, modality: true }
        });
        return NextResponse.json({ success: true, match: updated, generatedNextRound, allMatches });
    }

    return NextResponse.json({ success: true, match: updated });

  } catch (error) {
    console.error("Erro ao salvar resultado:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
