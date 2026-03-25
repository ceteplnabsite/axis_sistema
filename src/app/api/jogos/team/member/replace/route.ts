import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const { memberId, newMatricula } = await req.json();

    if (!memberId || !newMatricula) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // 1. Buscar o novo estudante
    const student = await prisma.estudante.findUnique({
      where: { matricula: newMatricula },
      include: { notas: true }
    });

    if (!student) {
      return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 });
    }

    // 2. Verificar Elegibilidade (75% rule)
    const notas = student.notas || [];
    const totalSubjects = notas.length;
    const passingSubjects = notas.filter((n: any) => (n.nota || 0) >= 6.0).length;
    const passingPerc = totalSubjects > 0 ? (passingSubjects / totalSubjects) * 100 : 0;
    
    // Frequência (usando a mesma lógica dos desalistas/infrequentes)
    const infrequentCount = notas.filter((n: any) => n.isDesistenteUnid1 || n.isDesistenteUnid2 || n.isDesistenteUnid3).length;
    const infrequentPerc = totalSubjects > 0 ? (infrequentCount / totalSubjects) * 100 : 0;

    if (passingPerc < 75) {
      return NextResponse.json({ error: `Estudante inelegível: Aprovado em apenas ${passingPerc.toFixed(0)}% das disciplinas.` }, { status: 400 });
    }

    if (infrequentPerc > 25) { // Supondo 25% como limite padrão de infrequência
      return NextResponse.json({ error: "Estudante inelegível: Infrequência escolar acima do limite." }, { status: 400 });
    }

    // 3. Efetivar a troca
    const updatedMember = await prisma.teamMember.update({
      where: { id: memberId },
      data: { studentId: newMatricula },
      include: { student: { include: { turma: true } } }
    });

    return NextResponse.json({ success: true, member: updatedMember });

  } catch (error) {
    console.error("Erro ao trocar membro:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
