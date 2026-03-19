
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, status, feedback } = await req.json();

    const result = await prisma.sportsTeam.update({
      where: { id },
      data: { status, feedback }
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar status" }, { status: 500 });
  }
}
