import { prisma } from "./prisma"
import { v4 as uuidv4 } from "uuid"
// Updated with AuditLog model

type EntityType = 'NOTA' | 'QUESTAO' | 'USUARIO' | 'TURMA' | 'DISCIPLINA' | 'CONSELHO' | 'PROVA' | 'ESTUDANTE' | 'OCORRENCIA'

export async function logAudit(
  userId: string,
  entityType: EntityType,
  entityId: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE',
  details?: any,
  ipAddress?: string
) {
  try {
    // Ajustar para o fuso horário de Brasília (UTC-3)
    const now = new Date()
    const offset = -3 * 60 // -3 horas em minutos
    const brTime = new Date(now.getTime() + (offset + now.getTimezoneOffset()) * 60000)

    const pClient = prisma as any
    if (pClient.auditLog) {
      await pClient.auditLog.create({
        data: {
          userId,
          entityType,
          entityId,
          action,
          details: details ? JSON.stringify(details) : null,
          ipAddress,
          createdAt: brTime
        }
      })
    } else {
      const detailsStr = details ? JSON.stringify(details) : null
      await prisma.$executeRaw`
        INSERT INTO "audit_logs" (id, user_id, entity_type, entity_id, action, details, ip_address, created_at)
        VALUES (
          ${uuidv4()}, 
          ${userId}, 
          ${entityType}, 
          ${entityId}, 
          ${action}, 
          ${detailsStr}, 
          ${ipAddress || null}, 
          ${brTime}
        )
      `
    }
  } catch (error) {
    console.error('CRITICAL: logAudit failed even with fallback:', error)
  }
}
