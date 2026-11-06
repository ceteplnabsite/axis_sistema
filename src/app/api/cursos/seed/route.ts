import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apenasTI } from '@/lib/api-auth'

export async function GET() {
  const negado = await apenasTI()
  if (negado) return negado

  const cursosIniciais = [
    // EPTNM
    { nome: "Vigilância Sanitária", sigla: "VS", modalidade: "EPTNM", turnos: ["Matutino", "Vespertino"] },
    { nome: "Produção de Áudio e Vídeo", sigla: "PAV", modalidade: "EPTNM", turnos: ["Matutino", "Vespertino"] },
    { nome: "Eletromecânica", sigla: "ELM", modalidade: "EPTNM", turnos: ["Matutino", "Vespertino"] },
    { nome: "Agroecologia", sigla: "AGRO", modalidade: "EPTNM", turnos: ["Matutino", "Vespertino"] },
    { nome: "Nutrição e Dietética", sigla: "NUT", modalidade: "EPTNM", turnos: ["Matutino", "Vespertino"] },
    { nome: "Planejamento e Controle de Produção", sigla: "PCP", modalidade: "EPTNM", turnos: ["Matutino", "Vespertino"] },
    { nome: "Química", sigla: "QUI", modalidade: "EPTNM", turnos: ["Matutino", "Vespertino"] },
    { nome: "Redes de Computadores", sigla: "R", modalidade: "EPTNM", turnos: ["Matutino", "Vespertino"] },
    { nome: "Edificações", sigla: "EDIF", modalidade: "EPTNM", turnos: ["Matutino", "Vespertino"] },
    { nome: "Informática", sigla: "I", modalidade: "EPTNM", turnos: ["Matutino", "Vespertino"] },
    { nome: "Análises Clínicas", sigla: "AC", modalidade: "EPTNM", turnos: ["Matutino", "Vespertino"] },
    
    // PROSUB
    { nome: "Vigilância Sanitária (PROSUB)", sigla: "VS", modalidade: "PROSUB", turnos: ["Vespertino", "Noturno"] },
    { nome: "Segurança do Trabalho (PROSUB)", sigla: "ST", modalidade: "PROSUB", turnos: ["Vespertino", "Noturno"] },
    { nome: "Serviços Jurídicos (PROSUB)", sigla: "SJ", modalidade: "PROSUB", turnos: ["Vespertino", "Noturno"] },
    { nome: "Edificações (PROSUB)", sigla: "EDIF", modalidade: "PROSUB", turnos: ["Vespertino", "Noturno"] },
    { nome: "Enfermagem (PROSUB)", sigla: "ENF", modalidade: "PROSUB", turnos: ["Vespertino", "Noturno"] },
    
    // PROEJA
    { nome: "Produção de Áudio e Vídeo (PROEJA)", sigla: "PAV", modalidade: "PROEJA", turnos: ["Vespertino", "Noturno"] },
    { nome: "Eletromecânica (PROEJA)", sigla: "ELM", modalidade: "PROEJA", turnos: ["Vespertino", "Noturno"] },
    { nome: "Planejamento e Controle de Produção (PROEJA)", sigla: "PCP", modalidade: "PROEJA", turnos: ["Vespertino", "Noturno"] },
    { nome: "Redes de Computadores (PROEJA)", sigla: "R", modalidade: "PROEJA", turnos: ["Vespertino", "Noturno"] },
    { nome: "Segurança do Trabalho (PROEJA)", sigla: "ST", modalidade: "PROEJA", turnos: ["Vespertino", "Noturno"] },
    { nome: "Serviços Jurídicos (PROEJA)", sigla: "SJ", modalidade: "PROEJA", turnos: ["Vespertino", "Noturno"] },
    { nome: "Edificações (PROEJA)", sigla: "EDIF", modalidade: "PROEJA", turnos: ["Vespertino", "Noturno"] },
    { nome: "Análises Clínicas (PROEJA)", sigla: "AC", modalidade: "PROEJA", turnos: ["Vespertino", "Noturno"] },
  ]

  try {
    const keys = Object.keys(prisma).filter(k => !k.startsWith('_'))
    
    // Tentar acessar diretamente se a chave existir
    const cursoModel = (prisma as any).curso || (prisma as any).Curso
    
    if (!cursoModel) {
       return NextResponse.json({ 
         message: 'Modelo "curso" não encontrado', 
         availableModels: keys,
         prismaInfo: typeof prisma
       }, { status: 500 })
    }

    for (const c of cursosIniciais) {
      await cursoModel.upsert({
        where: { nome: c.nome },
        update: {
           sigla: c.sigla,
           modalidade: c.modalidade,
           turnos: c.turnos
        },
        create: {
          nome: c.nome,
          sigla: c.sigla,
          modalidade: c.modalidade,
          turnos: c.turnos
        }
      })
    }
    return NextResponse.json({ message: 'Cursos sincronizados com sucesso', models: keys })
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
