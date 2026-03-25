import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });
    }

    // Excluir membros primeiro (cascata manual se não houver no prisma)
    // Embora normalmente o Prisma lide com isso se configurado onDelete: Cascade
    await prisma.sportsTeam.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir equipe:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
