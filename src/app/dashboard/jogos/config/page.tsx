
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import JogosConfigClient from "./JogosConfigClient"

export default async function JogosConfigPage() {
  const session = await auth()
  if (!session?.user || (!session.user.isSuperuser && !session.user.isDirecao)) {
    redirect("/dashboard")
  }

  const settings = await prisma.sportsSettings.findUnique({
    where: { id: "global_config" }
  })

  return <JogosConfigClient initialSettings={JSON.parse(JSON.stringify(settings))} />
}
