import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Nomes aleatórios e realistas
const nomes = [
  "João Pedro da Silva", "Maria Eduarda Santos", "Ana Luiza Ferreira", "Lucas Gabriel Almeida",
  "Beatriz Oliveira Costa", "Pedro Henrique Souza", "Lara Rodrigues", "Arthur Matos",
  "Mariana Ribeiro", "Gabriel Lima Pereira", "Julia Carvalho Nascimento", "Matheus Gomes",
  "Sofia Barros Silva", "Enzo Monteiro", "Manuela Cardoso"
]

// Array de status disponíveis no schema
const StatusNota = {
  APROVADO: "APROVADO",
  RECUPERACAO: "RECUPERACAO",
  DESISTENTE: "DESISTENTE",
  APROVADO_RECUPERACAO: "APROVADO_RECUPERACAO",
  APROVADO_CONSELHO: "APROVADO_CONSELHO",
  DEPENDENCIA: "DEPENDENCIA",
  CONSERVADO: "CONSERVADO"
}

// Helper: Gera nota aleatória entre max e min, com precisão de 1 casa
const randNota = (min: number, max: number) => {
  return parseFloat((Math.random() * (max - min) + min).toFixed(1))
}

async function main() {
  // Puxa a turma (no caso a única ou com o contendo "T")
  const turmas = await prisma.turma.findMany()
  if (turmas.length === 0) {
    console.error("Nenhuma turma encontrada no banco!")
    return
  }
  
  // Pegamos a primeira turma disponível, ou a que tem o nome esperado
  const turma = turmas[0]

  console.log(`Turma encontrada: ${turma.nome} (ID: ${turma.id})`)
  
  // Verifica disciplinas dessa turma
  const disciplinas = await prisma.disciplina.findMany({ where: { turmaId: turma.id } })
  if (disciplinas.length === 0) {
    console.error("Esta turma não possui disciplinas (Matriz não importada). Crie disciplinas primeiro!")
    return
  }
  
  console.log(`Disciplinas vinculadas: ${disciplinas.length}`)
  
  console.log("Iniciando injeção de 15 alunos e suas notas...")
  const timestamp = new Date().getTime().toString().slice(-6) // final da matricula
  
  // Limpa tudo o que estiver associado aos alunos que vamos gerar (se rodar mais de uma vez)
  // Ou melhor, apenas cria novos.
  
  for (let i = 0; i < nomes.length; i++) {
    // 1. Cria Estudante
    const matricula = `2026${timestamp}${i.toString().padStart(3, '0')}`
    const estudante = await prisma.estudante.create({
      data: {
        matricula: matricula,
        nome: nomes[i],
        turmaId: turma.id
      }
    })
    
    // 2. Cria as Notas desse Estudante para TODAS as disciplinas
    for (const disc of disciplinas) {
      // Criação de comportamento realista do estudante:
      // Pode ser aluno ÓTIMO (todas as notas > 8), REGULAR (notas ~6-8), RUIM (notas < 6) ou EXATAS VS HUMANAS.
      const tipoAluno = i % 3 // 0 = Ótimo, 1 = Regular, 2 = Dificuldade
      
      let nota1 = 0, nota2 = null, nota3 = null, notaRecup = null
      let status: keyof typeof StatusNota = 'APROVADO'
      let isDesistente = false
      
      // Alguns alunos são desistentes na unidade 2
      if (i === 14) { // Pior caso
        nota1 = randNota(0, 4)
        isDesistente = true
        status = 'DESISTENTE'
      } else {
        if (tipoAluno === 0) { // Bom aluno
          nota1 = randNota(7.5, 10)
          nota2 = randNota(8, 10)
          nota3 = randNota(7, 10)
        } else if (tipoAluno === 1) { // Mediano
          nota1 = randNota(5.5, 8.5)
          nota2 = randNota(5, 8)
          nota3 = randNota(6, 9)
        } else { // Aluno com Recuperação
          nota1 = randNota(3, 6)
          nota2 = randNota(3, 7)
          nota3 = randNota(4, 7)
        }
        
        // Verifica cálculo (10 + 10 + 10 = 30 pontos no total). Media é a soma / 3 >= 6 (ou 18 pts)
        const somaOriginal = parseFloat(((nota1 || 0) + (nota2 || 0) + (nota3 || 0)).toFixed(1))
        
        // Se < 18, entra em Recuperação
        if (somaOriginal < 18) {
           notaRecup = randNota(5, 9) // Dá uma chance
           const somaComRecup = somaOriginal + notaRecup
           if (somaComRecup >= 24) { // Exemplo de regra fictícia que somando os 4 dá 24 ou a recup substitui a pior
               // Vamos considerar que se aprovou na recup
               status = 'APROVADO_RECUPERACAO'
           } else if (somaComRecup >= 20) {
               status = 'APROVADO_CONSELHO' // Outro caso fictício
           } else {
               status = 'RECUPERACAO' // Fica retido / em recuperação final
           }
        } else {
           status = 'APROVADO'
        }
      }

      await prisma.notaFinal.create({
        data: {
          estudanteId: estudante.matricula,
          disciplinaId: disc.id,
          nota: isDesistente ? nota1 : (nota1 + (nota2||0) + (nota3||0)), // Campo legadom "nota" = somatório ou média dependendo do negócio
          nota1: nota1,
          nota2: nota2,
          nota3: nota3,
          notaRecuperacao: notaRecup,
          status: status,
          isDesistenteUnid1: false,
          isDesistenteUnid2: isDesistente,
          isDesistenteUnid3: isDesistente
        }
      })
    }
  }
  
  console.log("Foram criados 15 estudantes com 100% de preenchimento na grade de notas e variações de comportamento (recuperação, desistência)!")
}

main().catch(console.error).finally(() => prisma.$disconnect())
