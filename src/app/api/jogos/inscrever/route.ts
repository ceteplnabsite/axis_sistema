
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { nomeTime, contactEmail, modalityId, leaderMatricula, members } = data

    // 1. Validação básica (campos obrigatórios)
    if (!nomeTime || !contactEmail || !modalityId || !leaderMatricula || !members || members.length === 0) {
      return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 })
    }

    // 2. Criar o Time e seus membros em uma transação para garantir integridade
    const result = await prisma.$transaction(async (tx) => {
      // 2a. Primeiro, vamos atualizar o campo dataNascimento de cada estudante no banco
      for (const member of members) {
        if (member.dataNascimento) {
          await tx.estudante.update({
            where: { matricula: member.matricula },
            data: { dataNascimento: new Date(member.dataNascimento) }
          })
        }
      }

      // 2b. Criar o time
      const newTeam = await tx.sportsTeam.create({
        data: {
          nome: nomeTime,
          contactEmail,
          modalityId,
          status: "Pendente"
        }
      })

      // 2c. Adicionar membros ao time
      const teamMembersData = members.map((m: any) => ({
        teamId: newTeam.id,
        studentId: m.matricula,
        isLeader: m.matricula === leaderMatricula
      }))

      await tx.teamMember.createMany({
        data: teamMembersData
      })

      return newTeam
    })

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
