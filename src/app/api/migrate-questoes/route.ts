import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const questoes = await prisma.questao.findMany({
      where: { unidade: "2" },
      include: { disciplinas: true }
    })
    
    const grouped: Record<string, any[]> = {}
    questoes.forEach(q => {
      const discKeys = q.disciplinas.map(d => d.id).sort().join(',')
      const key = `${q.professorId}_${discKeys}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(q)
    })
    
    let updatedCount = 0;
    let logs = []

    for (const key in grouped) {
      const qs = grouped[key]
      const hasSegundaChamada = qs.some(q => q.tipo === 'SEGUNDA CHAMADA')
      if (hasSegundaChamada) {
         logs.push(`Skipping group ${key} because it already has SEGUNDA CHAMADA questions.`)
         continue;
      }
      
      qs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      const total = qs.length
      if (total <= 1) continue;
      
      const half = Math.floor(total / 2)
      const toChange = qs.slice(qs.length - half)
      
      for (const q of toChange) {
         await prisma.questao.update({
           where: { id: q.id },
           data: { tipo: 'SEGUNDA CHAMADA' }
         })
         updatedCount++;
      }
      logs.push(`Group ${key}: total ${total}. Changed ${toChange.length} to SEGUNDA CHAMADA.`)
    }
    
    return NextResponse.json({ success: true, updatedCount, logs })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
