import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import UsuarioForm from "@/components/UsuarioForm"

export const metadata = {
  title: 'Áxis - Usuarios'
}

export const runtime = 'nodejs'

async function getUsuario(id: string) {
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, username: true, name: true,
      isSuperuser: true, isStaff: true, isDirecao: true, isAEE: true, lastLogin: true,
      disciplinasPermitidas: { select: { id: true } }
    }
  })
  return u && { ...u, lastLogin: u.lastLogin?.toISOString() ?? null }
}

export default async function EditarUsuarioPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  
  if (!session || !session.user.isSuperuser) {
    redirect("/dashboard")
  }

  const { id } = await params
  const usuario = await getUsuario(id)

  if (!usuario) {
    redirect("/dashboard/usuarios")
  }

  return <UsuarioForm usuario={usuario} isEdit={true} />
}
