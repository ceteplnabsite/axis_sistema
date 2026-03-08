import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const cursosParaCadastrar = [
    { nome: "Agroecologia", sigla: "AGRO", modalidade: "EPTM", turnos: ["MATUTINO"] },
    { nome: "Artes Visuais", sigla: "PAV", modalidade: "EPTM", turnos: ["MATUTINO"] },
    { nome: "Redes de Computadores", sigla: "RC", modalidade: "EPTM", turnos: ["MATUTINO"] },
    { nome: "Informática", sigla: "I", modalidade: "EPTM", turnos: ["MATUTINO"] },
    { nome: "Química", sigla: "Q", modalidade: "EPTM", turnos: ["MATUTINO"] },
    { nome: "Processos Culturais", sigla: "PCP", modalidade: "EPTM", turnos: ["MATUTINO"] },
    { nome: "Nutrição e Dietética", sigla: "ND", modalidade: "EPTM", turnos: ["MATUTINO"] },
    { nome: "Análises Clínicas", sigla: "AC", modalidade: "EPTM", turnos: ["MATUTINO"] },
    { nome: "Edificações", sigla: "ED", modalidade: "EPTM", turnos: ["MATUTINO"] },
    { nome: "Eletromecânica", sigla: "ELE", modalidade: "EPTM", turnos: ["MATUTINO"] },
  ]

  console.log("Limpando cursos e turmas anteriores...")
  
  try {
    await prisma.horarioAula.deleteMany({})
    await prisma.notaFinalAudit.deleteMany({})
    await prisma.notaFinal.deleteMany({})
    await prisma.disciplina.deleteMany({})
    await prisma.estudante.deleteMany({})
    await prisma.prova.deleteMany({})
    await prisma.turma.deleteMany({})
    await prisma.matrizCurricular.deleteMany({})
    await prisma.curso.deleteMany({})
    
    console.log("Cadastrando apenas os Cursos e Siglas (EPTM)...")
    
    for (const curso of cursosParaCadastrar) {
      const novo = await prisma.curso.create({
        data: curso
      })
      console.log(`Cadastrado: ${novo.nome} (${novo.sigla})`)
    }
    
    console.log("\nProcesso concluído! Apenas os cursos estão no sistema.")
  } catch (error) {
    console.error("Erro durante a migração:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
