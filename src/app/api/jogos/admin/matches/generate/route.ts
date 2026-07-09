import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { modalityId, bracketSize } = await req.json();

    if (!modalityId || !bracketSize) {
      return NextResponse.json({ error: "Modalidade e tamanho da chave são obrigatórios" }, { status: 400 });
    }

    await prisma.gameMatch.deleteMany({
      where: { modalityId }
    });

    const teams = await prisma.sportsTeam.findMany({
      where: { modalityId, status: 'APPROVED' }
    });

    if (teams.length < 2) {
      return NextResponse.json({ error: "É necessário ao menos 2 equipes aprovadas para gerar chaves." }, { status: 400 });
    }

    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const selectedTeams = shuffled.slice(0, bracketSize);

    const slots = new Array(bracketSize).fill(null);
    for (let i = 0; i < selectedTeams.length; i++) {
        slots[i] = selectedTeams[i];
    }
    slots.sort(() => Math.random() - 0.5); // Espalhar os BYEs aleatoriamente
    
    const totalRounds = Math.log2(bracketSize);
    
    // Usamos um for loop e awaits seriais para garantir a ordem exata de criação no banco (ordem pelo ID/createdAt)
    const round1Winners: any[] = new Array(bracketSize / 2).fill(null);
    
    // Gerar Rodada 1
    for (let i = 0; i < bracketSize; i += 2) {
      const team1 = slots[i];
      const team2 = slots[i+1];
      
      const hasBye = !team1 || !team2;
      const winner = hasBye ? (team1 || team2) : null;
      if (winner) round1Winners[i / 2] = winner;

      await prisma.gameMatch.create({
        data: {
          modalityId,
          team1Id: team1?.id || null,
          team2Id: team2?.id || null,
          round: 1,
          status: hasBye ? 'COMPLETED' : 'PENDING',
          score1: 0,
          score2: 0,
          winnerId: winner?.id || null
        }
      });
    }
    
    // Gerar Rodadas Seguintes
    let currentRoundWinners = round1Winners;
    for (let r = 2; r <= totalRounds; r++) {
        const matchCount = bracketSize / Math.pow(2, r);
        const nextRoundWinners = new Array(matchCount).fill(null);
        
        for (let i = 0; i < matchCount; i++) {
            const team1 = currentRoundWinners[i * 2];
            const team2 = currentRoundWinners[i * 2 + 1];
            
            // Se ambos avançaram por BYE (raro, mas possível em chaves muito vazias), ou se é um match vazio
            const hasBye = (team1 || team2) && (!team1 || !team2) && r === 2; // Byes só empurram automaticamente se for da rodada 1 pra 2
            // Simplificando: vamos apenas posicionar. O admin avança o resto manualmente se precisar.
            
            await prisma.gameMatch.create({
              data: {
                modalityId,
                team1Id: team1?.id || null,
                team2Id: team2?.id || null,
                round: r,
                status: 'PENDING',
                score1: 0,
                score2: 0,
                winnerId: null
              }
            });
        }
        currentRoundWinners = nextRoundWinners; // Reset para as rodadas seguintes ficarem vazias
    }

    const newMatches = await prisma.gameMatch.findMany({
      where: { modalityId },
      orderBy: { id: 'asc' },
      include: { team1: true, team2: true, winner: true, modality: true }
    });

    return NextResponse.json({ success: true, matches: newMatches });

  } catch (error) {
    console.error("Erro ao gerar chaves:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
