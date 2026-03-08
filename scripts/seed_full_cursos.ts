import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const cursosParaCadastrar = [
    // EPTM - Matutino/Vespertino
    { nome: "Agroecologia", sigla: "AGRO", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Artes Visuais", sigla: "PAV", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Redes de Computadores", sigla: "RC", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Informática", sigla: "I", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Química", sigla: "Q", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Processos Culturais", sigla: "PCP", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Nutrição e Dietética", sigla: "ND", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Análises Clínicas", sigla: "AC", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Edificações", sigla: "ED", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Eletromecânica", sigla: "ELE", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Meio Ambiente", sigla: "MA", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },

    // SUBSEQUENTE - Vespertino (identificados pelo sufixo 'sub' nas turmas)
    { nome: "Nutrição e Dietética (Subsequente)", sigla: "NDSUB", modalidade: "SUBSEQUENTE", turnos: ["VESPERTINO"] },
    { nome: "Análises Clínicas (Subsequente)", sigla: "ACSUB", modalidade: "SUBSEQUENTE", turnos: ["VESPERTINO"] },
    { nome: "Segurança do Trabalho", sigla: "TST", modalidade: "SUBSEQUENTE", turnos: ["VESPERTINO"] },
    { nome: "Vigilância em Saúde", sigla: "VS", modalidade: "SUBSEQUENTE", turnos: ["VESPERTINO"] },
    { nome: "Enfermagem", sigla: "E", modalidade: "SUBSEQUENTE", turnos: ["VESPERTINO"] },
  ]

  console.log("Limpando cursos e dados relacionados...")
  
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
    
    console.log("Cadastrando Cursos, Siglas e Modalidades...")
    
    for (const curso of cursosParaCadastrar) {
      const novo = await prisma.curso.create({
        data: {
          nome: curso.nome,
          sigla: curso.sigla,
          modalidade: curso.modalidade,
          turnos: curso.turnos
        }
      })
      console.log(`[${novo.modalidade}] ${novo.nome} (${novo.sigla})`)
    }
    
    console.log("\nProcesso concluído! Cursos cadastrados com sucesso.")
  } catch (error) {
    console.error("Erro durante a migração:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
