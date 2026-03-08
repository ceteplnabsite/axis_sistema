import { Metadata } from "next"
import PlanosClient from "./PlanosClient"

export const metadata: Metadata = {
  title: "Planos de Ensino | Áxis",
  description: "Gerenciamento de planos de ensino quinzenais.",
}

export default function PlanosPage() {
  return (
    <PlanosClient />
  )
}
