import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import ImportarSigeducClient from "./ImportarSigeducClient"

export const metadata = { title: 'Áxis - Importar do SIGEduc' }
export const dynamic = 'force-dynamic'

export default async function ImportarSigeducPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/dashboard/notas/importar-sigeduc")
  if (session.user.isPortalUser) redirect("/dashboard")
  return <ImportarSigeducClient />
}
