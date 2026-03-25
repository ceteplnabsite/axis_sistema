import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { enviarEmailDocumentosJogos } from "@/lib/mail";

export async function PATCH(req: Request) {
  const session = await auth();
  
  if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, status, feedback } = await req.json();

    const result = await prisma.sportsTeam.update({
      where: { id },
      data: { status, feedback }
    });

    if (status === 'APPROVED' && result.contactEmail) {
      await enviarEmailDocumentosJogos(result.contactEmail, result.nome, result.id);
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar status" }, { status: 500 });
  }
}
