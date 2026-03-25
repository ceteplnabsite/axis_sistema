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

    return NextResponse.json({ success: true, match: updated });

  } catch (error) {
    console.error("Erro ao salvar resultado:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
