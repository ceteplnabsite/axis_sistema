import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { enviarEmailDocumentosJogos, enviarEmailRejeicaoJogos } from "@/lib/mail";

export async function PATCH(req: Request) {
  const session = await auth();
  
  if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, status, feedback, reasons, irregularStudents } = await req.json();

    const result = await prisma.sportsTeam.update({
      where: { id },
      data: { status, feedback },
      include: {
        members: {
          include: { student: true }
        }
      }
    });

    if (status === 'APPROVED' && result.contactEmail) {
      await enviarEmailDocumentosJogos(result.contactEmail, result.nome, result.id);
    }

    if (status === 'REJECTED' && result.contactEmail) {
      const leader = result.members.find((m: any) => m.isLeader);
      const leaderName = leader ? leader.student.nome : 'Líder da Equipe';
      await enviarEmailRejeicaoJogos(
        result.contactEmail,
        result.nome,
        leaderName,
        reasons || [],
        irregularStudents || [],
        feedback || ''
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar status" }, { status: 500 });
  }
}
