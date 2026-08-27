import { prisma } from "./prisma"

interface GradingUser {
  id: string
  isSuperuser?: boolean | null
  isDirecao?: boolean | null
  isPortalUser?: boolean | null
}

// Define quem pode lançar/alterar notas, recuperação e decisões de conselho de uma disciplina:
// superusuários e direção podem tudo; contas do portal (pais/alunos) nunca podem;
// professores só podem na(s) disciplina(s) em que estão explicitamente vinculados.
export async function canGradeDisciplina(user: GradingUser, disciplinaId: string): Promise<boolean> {
  if (!user || user.isPortalUser) return false
  if (user.isSuperuser || user.isDirecao) return true

  const disciplina = await prisma.disciplina.findUnique({
    where: { id: disciplinaId },
    select: {
      usuariosPermitidos: {
        where: { id: user.id },
        select: { id: true }
      }
    }
  })

  return !!disciplina && disciplina.usuariosPermitidos.length > 0
}
