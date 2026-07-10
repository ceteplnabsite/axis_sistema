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

    // Se a partida foi finalizada com um vencedor, avançar para a próxima rodada já desenhada
    let advancedToNextRound = false;
    
    if (status === 'COMPLETED' && winnerId) {
        const currentRoundMatches = await prisma.gameMatch.findMany({
            where: { modalityId: match.modalityId, round: match.round },
            orderBy: { id: 'asc' }
        });
        
        const matchIndex = currentRoundMatches.findIndex(m => m.id === matchId);
        
        if (matchIndex !== -1) {
            const nextRoundIndex = Math.floor(matchIndex / 2);
            
            const nextRoundMatches = await prisma.gameMatch.findMany({
                where: { modalityId: match.modalityId, round: match.round + 1 },
                orderBy: { id: 'asc' }
            });
            
            if (nextRoundMatches.length > nextRoundIndex) {
                const nextMatch = nextRoundMatches[nextRoundIndex];
                const teamField = matchIndex % 2 === 0 ? 'team1Id' : 'team2Id';
                
                await prisma.gameMatch.update({
                    where: { id: nextMatch.id },
                    data: { [teamField]: winnerId }
                });
                advancedToNextRound = true;
            }
        }
    }

    if (advancedToNextRound) {
        const allMatches = await prisma.gameMatch.findMany({
            where: { modalityId: match.modalityId },
            orderBy: { id: 'asc' },
            include: { team1: true, team2: true, winner: true, modality: true }
        });
        // Usamos a mesma flag geradaNextRound para o frontend saber que precisa recarregar a árvore
        return NextResponse.json({ success: true, match: updated, generatedNextRound: true, allMatches });
    }

    return NextResponse.json({ success: true, match: updated });

  } catch (error) {
    console.error("Erro ao salvar resultado:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const modalityId = searchParams.get('modalityId');

    if (!modalityId) {
      return NextResponse.json({ error: "ID da modalidade não informado" }, { status: 400 });
    }

    await prisma.gameMatch.deleteMany({
      where: { modalityId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao limpar chaves:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
