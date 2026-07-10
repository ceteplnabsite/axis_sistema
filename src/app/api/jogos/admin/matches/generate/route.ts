import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { modalityId, bracketSize, format = 'BRACKET' } = await req.json();

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
    const selectedTeams = shuffled.slice(0, bracketSize > teams.length ? teams.length : bracketSize);
    
    const totalRounds = Math.log2(bracketSize);

    if (format === '14_TEAMS_3_DAYS') {
        const groups: any[][] = [[], [], [], []];
        const groupCapacities = [4, 4, 3, 3];
        
        let teamIndex = 0;
        for (let i = 0; i < groups.length; i++) {
            while (groups[i].length < groupCapacities[i] && teamIndex < selectedTeams.length) {
                groups[i].push(selectedTeams[teamIndex]);
                teamIndex++;
            }
        }

        // Fase de Grupos
        for (let g = 0; g < groups.length; g++) {
            const groupName = String.fromCharCode(65 + g);
            const groupTeams = groups[g];
            for (let i = 0; i < groupTeams.length; i++) {
                for (let j = i + 1; j < groupTeams.length; j++) {
                    await prisma.gameMatch.create({
                        data: {
                            modalityId,
                            team1Id: groupTeams[i].id,
                            team2Id: groupTeams[j].id,
                            round: 0,
                            status: 'PENDING',
                            groupId: `Grupo ${groupName}`,
                            score1: 0,
                            score2: 0
                        }
                    });
                }
            }
        }

        // Semifinais
        for (let i = 0; i < 2; i++) {
            await prisma.gameMatch.create({
                data: {
                    modalityId,
                    team1Id: null,
                    team2Id: null,
                    round: 1,
                    status: 'PENDING',
                    score1: 0,
                    score2: 0,
                    winnerId: null
                }
            });
        }
        
        // Finais (1º e 3º Lugar)
        for (let i = 0; i < 2; i++) {
             await prisma.gameMatch.create({
                 data: {
                    modalityId,
                    team1Id: null,
                    team2Id: null,
                    round: 2,
                    status: 'PENDING',
                    score1: 0,
                    score2: 0,
                    winnerId: null
                 }
             });
        }
    } else if (format === 'GROUPS') {
        const numGroups = Math.max(1, bracketSize / 2);
        const groups: any[][] = Array.from({ length: numGroups }, () => []);
        
        // Distribuir times nos grupos
        selectedTeams.forEach((team, index) => {
            groups[index % numGroups].push(team);
        });

        // Gerar partidas da Fase de Grupos (round 0)
        for (let g = 0; g < numGroups; g++) {
            const groupName = String.fromCharCode(65 + g); // A, B, C...
            const groupTeams = groups[g];
            
            for (let i = 0; i < groupTeams.length; i++) {
                for (let j = i + 1; j < groupTeams.length; j++) {
                    await prisma.gameMatch.create({
                        data: {
                            modalityId,
                            team1Id: groupTeams[i].id,
                            team2Id: groupTeams[j].id,
                            round: 0,
                            status: 'PENDING',
                            groupId: `Grupo ${groupName}`,
                            score1: 0,
                            score2: 0
                        }
                    });
                }
            }
        }

        // Gerar Bracket vazio esperando os vencedores
        for (let r = 1; r <= totalRounds; r++) {
            const matchCount = bracketSize / Math.pow(2, r);
            for (let i = 0; i < matchCount; i++) {
                await prisma.gameMatch.create({
                  data: {
                    modalityId,
                    team1Id: null,
                    team2Id: null,
                    round: r,
                    status: 'PENDING',
                    score1: 0,
                    score2: 0,
                    winnerId: null
                  }
                });
            }
        }
    } else {
        // LÓGICA MATA-MATA (BRACKET NORMAL)
        const slots = new Array(bracketSize).fill(null);
        for (let i = 0; i < selectedTeams.length; i++) {
            slots[i] = selectedTeams[i];
        }
        slots.sort(() => Math.random() - 0.5); // Espalhar os BYEs aleatoriamente
        
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
            currentRoundWinners = nextRoundWinners;
        }
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
