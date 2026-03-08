import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { nome, sigla, modalidade, turnos } = await req.json()

    if (!nome || !sigla || !modalidade) {
      return NextResponse.json(
        { message: "Nome, sigla e modalidade são obrigatórios" },
        { status: 400 }
      )
    }

    // Criar um ID customizado (apenas letras minúsculas e números)
    let cursoId = `${modalidade.toLowerCase()}_${sigla.toLowerCase()}`.replace(/[^a-z0-9_]/g, '')
    
    // Verificar se o id, nome ou sigla já existem
    const existingCurso = await prisma.curso.findFirst({
      where: {
        OR: [
          { id: cursoId },
          { nome: nome, modalidade: modalidade }
        ]
      }
    })

    if (existingCurso) {
       // Tentar gerar um novo ID ou apenas avisar
       return NextResponse.json(
          { message: "O curso com esse nome e modalidade já existe." },
          { status: 400 }
       )
    }

    // Sigla precisa ser única em todo o BD (segundo nosso schema)
    const existingSigla = await prisma.curso.findUnique({
      where: { sigla }
    })

    if (existingSigla) {
      return NextResponse.json(
        { message: "Essa sigla já está em uso por outro curso." },
        { status: 400 }
      )
    }

    const curso = await prisma.curso.create({
      data: {
        id: cursoId,
        nome,
        sigla,
        modalidade,
        turnos: turnos || []
      }
    })

    return NextResponse.json(curso, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { message: "Conflito de unicidade (nome, sigla ou modalidade já existem)." },
        { status: 400 }
      )
    }
    console.error("Erro ao criar curso:", error)
    return NextResponse.json(
      { message: "Erro interno no servidor ao criar curso" },
      { status: 500 }
    )
  }
}
