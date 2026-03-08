import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const cursosParaCadastrar = [
    // --- EPTM (Matutino / Vespertino) ---
    { nome: "Agroecologia (EPTM)", sigla: "AGRO-EPTM", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Artes Visuais (EPTM)", sigla: "PAV-EPTM", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Redes de Computadores (EPTM)", sigla: "RC-EPTM", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Informática (EPTM)", sigla: "I-EPTM", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Química (EPTM)", sigla: "Q-EPTM", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Processos Culturais (EPTM)", sigla: "PCP-EPTM", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Nutrição e Dietética (EPTM)", sigla: "ND-EPTM", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Análises Clínicas (EPTM)", sigla: "AC-EPTM", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Edificações (EPTM)", sigla: "ED-EPTM", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Eletromecânica (EPTM)", sigla: "ELE-EPTM", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },
    { nome: "Meio Ambiente (EPTM)", sigla: "MA-EPTM", modalidade: "EPTM", turnos: ["MATUTINO", "VESPERTINO"] },

    // --- SUBSEQUENTE (Vespertino / Noturno) ---
    { nome: "Análises Clínicas (Sub)", sigla: "AC-SUB", modalidade: "SUBSEQUENTE", turnos: ["VESPERTINO", "NOTURNO"] },
    { nome: "Nutrição e Dietética (Sub)", sigla: "ND-SUB", modalidade: "SUBSEQUENTE", turnos: ["VESPERTINO", "NOTURNO"] },
    { nome: "Segurança do Trabalho (Sub)", sigla: "TST-SUB", modalidade: "SUBSEQUENTE", turnos: ["VESPERTINO", "NOTURNO"] },
    { nome: "Vigilância em Saúde (Sub)", sigla: "VS-SUB", modalidade: "SUBSEQUENTE", turnos: ["VESPERTINO"] },
    { nome: "Enfermagem (Sub)", sigla: "ENF-SUB", modalidade: "SUBSEQUENTE", turnos: ["VESPERTINO", "NOTURNO"] },
    { nome: "Serviços Jurídicos (Sub)", sigla: "SJ-SUB", modalidade: "SUBSEQUENTE", turnos: ["NOTURNO"] },
    { nome: "Edificações (Sub)", sigla: "ED-SUB", modalidade: "SUBSEQUENTE", turnos: ["NOTURNO"] },

    // --- PROEJA / EJA (Noturno) ---
    { nome: "Análises Clínicas (EJA)", sigla: "AC-EJA", modalidade: "PROEJA", turnos: ["NOTURNO"] },
    { nome: "Nutrição e Dietética (EJA)", sigla: "ND-EJA", modalidade: "PROEJA", turnos: ["NOTURNO"] },
    { nome: "Segurança do Trabalho (EJA)", sigla: "TST-EJA", modalidade: "PROEJA", turnos: ["NOTURNO"] },
    { nome: "Logística (EJA)", sigla: "LOG-EJA", modalidade: "PROEJA", turnos: ["NOTURNO"] },
    { nome: "Administração (EJA)", sigla: "ADM-EJA", modalidade: "PROEJA", turnos: ["NOTURNO"] },
    { nome: "Serviços Jurídicos (EJA)", sigla: "SJ-EJA", modalidade: "PROEJA", turnos: ["NOTURNO"] },
    { nome: "Informática (EJA)", sigla: "I-EJA", modalidade: "PROEJA", turnos: ["NOTURNO"] },
    { nome: "Eletromecânica (EJA)", sigla: "ELE-EJA", modalidade: "PROEJA", turnos: ["NOTURNO"] },
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
    
    console.log("Cadastrando catálogo completo de Cursos (EPTM, SUB, PROEJA)...")
    
    for (const curso of cursosParaCadastrar) {
      const novo = await prisma.curso.create({
        data: curso
      })
      console.log(`[${novo.modalidade}] ${novo.nome} (${novo.sigla})`)
    }
    
    console.log("\nProcesso concluído! O catálogo está completo nos três turnos.")
  } catch (error) {
    console.error("Erro durante a migração:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
