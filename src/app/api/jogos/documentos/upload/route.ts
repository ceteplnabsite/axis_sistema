import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const teamId = formData.get("teamId") as string;
    const memberId = formData.get("memberId") as string;
    const type = formData.get("type") as "front" | "back";
    const file = formData.get("file") as File;

    if (!teamId || !memberId || !type || !file) {
      return NextResponse.json({ error: "Faltando dados" }, { status: 400 });
    }

    const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
    }

    // Gerar um nome de arquivo seguro
    const fileExt = file.name.split('.').pop();
    const fileName = `${teamId}/${memberId}_${type}_${Date.now()}.${fileExt}`;
    const bucketUrl = `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/identidades_jogos/${fileName}`;

    // Upload direto para o bucket usando as chaves de servico
    const fileBuffer = await file.arrayBuffer();

    const uploadRes = await fetch(bucketUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": file.type,
      },
      body: fileBuffer
    });

    if (!uploadRes.ok) {
      const respErr = await uploadRes.json();
      console.error("Supabase Error:", respErr);
      return NextResponse.json({ error: "Falha ao enviar arquivo para armazenamento" }, { status: 500 });
    }

    const publicUrl = `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/identidades_jogos/${fileName}`;

    // Atualizar no banco
    await prisma.teamMember.update({
      where: { id: memberId },
      data: type === "front" ? { idFrontUrl: publicUrl } : { idBackUrl: publicUrl }
    });

    return NextResponse.json({ success: true, url: publicUrl });

  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
