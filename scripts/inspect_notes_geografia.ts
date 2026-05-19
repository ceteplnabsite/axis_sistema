
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// Carregar .env manualmente para garantir
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      const key = match[1]
      let value = match[2] || ''
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1)
      }
      process.env[key] = value
    }
  })
}

// Substituir DATABASE_URL por DIRECT_URL (porta 5432) para contornar bloqueio da porta 6543 do pgbouncer
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

const prisma = new PrismaClient()

async function main() {
  const turmaId = 'cmmjvd6ul0006ie041nyqdie2'
  
  console.log('=== INSPEÇÃO DE TURMA E DISCIPLINAS ===')
  const turma = await prisma.turma.findUnique({
    where: { id: turmaId },
    include: {
      disciplinas: {
        where: { nome: { contains: 'Geografia', mode: 'insensitive' } }
      },
      estudantes: {
        select: { matricula: true, nome: true }
      }
    }
  })

  if (!turma) {
    console.error('Turma não encontrada!')
    return
  }

  console.log(`Turma encontrada: ${turma.nome} (${turma.id})`)
  console.log(`Estudantes cadastrados na turma: ${turma.estudantes.length}`)
  
  const geografia = turma.disciplinas[0]
  if (!geografia) {
    console.error('Disciplina Geografia não encontrada nesta turma!')
    return
  }

  console.log(`Disciplina encontrada: ${geografia.nome} (${geografia.id})`)

  console.log('\n=== LENDO NOTAS SALVAS NO BANCO ===')
  const notas = await prisma.notaFinal.findMany({
    where: {
      disciplinaId: geografia.id,
      estudanteId: { in: turma.estudantes.map(e => e.matricula) }
    },
    include: {
      estudante: { select: { nome: true } }
    }
  })

  console.log(`Total de registros de Notas Finais no banco: ${notas.length}`)
  
  if (notas.length === 0) {
    console.log('NENHUM REGISTRO DE NOTA ENCONTRADO PARA ESTA DISCIPLINA E TURMA!')
  } else {
    notas.forEach(n => {
      console.log(`Estudante: ${n.estudante.nome} (${n.estudanteId})`)
      console.log(`  - Nota 1: ${n.nota1}`)
      console.log(`  - Nota 2: ${n.nota2}`)
      console.log(`  - Nota 3: ${n.nota3}`)
      console.log(`  - Nota Calculada: ${n.nota}`)
      console.log(`  - Status: ${n.status}`)
      console.log(`  - Desistentes Unid: ${n.isDesistenteUnid1}/${n.isDesistenteUnid2}/${n.isDesistenteUnid3}`)
      console.log(`  - Atualizado em: ${n.updatedAt}`)
    })
  }

  console.log('\n=== VERIFICANDO SE EXISTEM AUDITORIAS DE NOTA ===')
  const auditorias = await prisma.notaFinalAudit.findMany({
    where: {
      notaFinal: {
        disciplinaId: geografia.id
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      notaFinal: {
        select: { estudanteId: true }
      }
    }
  })
  
  console.log(`Auditorias encontradas: ${auditorias.length}`)
  auditorias.forEach(a => {
    console.log(`NotaFinalId: ${a.notaFinalId} (Estudante: ${a.notaFinal.estudanteId})`)
    console.log(`  - Anterior: ${a.notaAnterior} | Atual: ${a.notaAtual} | Status: ${a.status}`)
    console.log(`  - Criado em: ${a.createdAt}`)
  })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
