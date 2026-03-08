import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import SimuladosClient from "./SimuladosClient"
import { prisma } from "@/lib/prisma"

export const metadata = {
  title: 'Áxis - Simulados'
}

export default async function SimuladosPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = session.user as any
  
  // Buscar turmas que o professor tem acesso ou todas para gestão
  let turmas = []
  if (user.isSuperuser || user.isDirecao) {
    turmas = await prisma.turma.findMany({
      where: { anoLetivo: 2026 },
      orderBy: { nome: 'asc' }
    })
  } else {
    // 1. Turmas onde o professor leciona
    const teacher = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        disciplinasPermitidas: { include: { turma: true } },
        responsavelSimulados: { include: { turma: true } } // 2. Turmas onde ele é responsável pelo simulado
      }
    })
    
    const turmasMap = new Map()
    teacher?.disciplinasPermitidas.forEach(d => {
      if (d.turma) turmasMap.set(d.turma.id, d.turma)
    })
    teacher?.responsavelSimulados.forEach(r => {
      if (r.turma) turmasMap.set(r.turma.id, r.turma)
    })
    turmas = Array.from(turmasMap.values())
  }

  // Buscar Áreas
  let areas = []
  if (user.isSuperuser || user.isDirecao) {
    areas = await prisma.areaConhecimento.findMany({
      orderBy: { nome: 'asc' }
    })
  } else {
    // Professor vê áreas onde:
    // A) Ele leciona uma disciplina vinculada a essa área
    // B) Ele foi designado como responsável nominal para essa área em alguma turma
    const teacher = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        disciplinasPermitidas: { select: { areaId: true } },
        responsavelSimulados: { select: { areaId: true } }
      }
    })
    
    const areaIdsSet = new Set<string>()
    teacher?.disciplinasPermitidas.forEach(d => { if (d.areaId) areaIdsSet.add(d.areaId) })
    teacher?.responsavelSimulados.forEach(r => { if (r.areaId) areaIdsSet.add(r.areaId) })
    
    const areaIds = Array.from(areaIdsSet)
    
    areas = await prisma.areaConhecimento.findMany({
      where: { id: { in: areaIds } },
      orderBy: { nome: 'asc' }
    })
  }

  // Filtrar turmas apenas para EPTM
  turmas = turmas.filter(t => t.modalidade?.toUpperCase().includes('EPTM'))

  return (
    <SimuladosClient 
      turmas={turmas} 
      areas={areas} 
      user={user}
    />
  )
}
