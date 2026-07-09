import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { matchId, matchDay, matchDate } = await req.json();

    if (!matchId) {
      return NextResponse.json({ error: "ID da partida não informado" }, { status: 400 });
    }

    const updateData: any = {};
    if (matchDay !== undefined) updateData.matchDay = matchDay;
    if (matchDate !== undefined) {
      updateData.matchDate = matchDate ? new Date(matchDate) : null;
    }

    const updated = await prisma.gameMatch.update({
      where: { id: matchId },
      data: updateData
    });

    return NextResponse.json({ success: true, match: updated });

  } catch (error) {
    console.error("Erro ao salvar horário da partida:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
