import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import UsuarioForm from "@/components/UsuarioForm"

export const metadata = {
  title: 'Áxis - Usuarios'
}

export const runtime = 'nodejs'

export default async function NovoUsuarioPage() {
  const session = await auth()
  
  if (!session || !session.user.isSuperuser) {
    redirect("/dashboard")
  }

  return <UsuarioForm />
}
