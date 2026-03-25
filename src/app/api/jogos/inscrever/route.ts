
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { enviarEmailConfirmacaoJogos } from "@/lib/mail"

export async function POST(req: Request) {
  try {
    const data = await req.json()
    // Aceita tanto em português quanto inglês vindo do front
    const teamName = data.teamName || data.nomeTime
    const contactEmail = data.email || data.contactEmail
    const contactPhone = data.phone || data.contactPhone
    const modalityId = data.modalityId
    const members = data.members || []
    
    // Identifica o líder dentro do array de membros
    const leader = members.find((m: any) => m.isLeader)
    const leaderMatricula = leader?.matricula

    // 1. Validação básica (campos obrigatórios)
    if (!teamName || !contactEmail || !modalityId || !leaderMatricula || members.length === 0) {
      return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 })
    }

    // Busca o nome da modalidade para o e-mail
    const modality = await prisma.sportModality.findUnique({
      where: { id: modalityId }
    });

    // 2. Criar o Time e seus membros em uma transação para garantir integridade
    const result = await prisma.$transaction(async (tx) => {
      // 2a. Primeiro, vamos atualizar dataNascimento e sexo de cada estudante no banco
      for (const member of members) {
        const updateData: any = {};
        if (member.dataNascimento) updateData.dataNascimento = new Date(member.dataNascimento);
        if (member.sexo) updateData.sexo = member.sexo;

        if (Object.keys(updateData).length > 0) {
          await tx.estudante.update({
            where: { matricula: member.matricula },
            data: updateData
          })
        }
      }

      // 2b. Criar o time
      const newTeam = await tx.sportsTeam.create({
        data: {
          nome: teamName,
          contactEmail,
          contactPhone,
          modalityId,
          status: "Pendente"
        }
      })

      // 2c. Adicionar membros ao time
      const teamMembersData = members.map((m: any) => ({
        teamId: newTeam.id,
        studentId: m.matricula,
        isLeader: !!m.isLeader
      }))

      await tx.teamMember.createMany({
        data: teamMembersData
      })

      return newTeam
    })

    // 3. Enviar e-mail de confirmação de forma assíncrona (não bloqueia a resposta)
    try {
      await enviarEmailConfirmacaoJogos(
        contactEmail,
        teamName,
        modality?.nome || 'Esporte',
        leader.nome,
        members.map((m: any) => m.nome)
      );
    } catch (emailError) {
      console.error("Erro ao enviar e-mail de confirmação dos jogos:", emailError);
      // Não falha a requisição se o e-mail falhar, o time já foi criado
    }

    return NextResponse.json({ success: true, team: result })
  } catch (error: any) {
    console.error("Erro ao realizar inscrição de time:", error)
    // Se der erro de unicidade (ex: aluno já em outro time do mesmo esporte)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Um ou mais jogadores já possuem inscrição registrada para este esporte." }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro interno no servidor ao processar sua inscrição." }, { status: 500 })
  }
}
