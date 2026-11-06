import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import InstalarBotao from "./InstalarBotao"

export const metadata = { title: 'Áxis - Botão Enviar ao Áxis' }

export default async function InstalarPage() {
  const session = await auth()
  if (!session) redirect("/login")
  return <InstalarBotao />
}
