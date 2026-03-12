import { Metadata } from "next"
import OcorrenciasClient from "./OcorrenciasClient"

export const metadata: Metadata = {
  title: "Registro de Ocorrências | Áxis",
  description: "Livro de registros e ocorrências escolares.",
}

export default function OcorrenciasPage() {
  return (
    <OcorrenciasClient />
  )
}
