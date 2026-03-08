import { 
  Users, Monitor, Network, Microscope, ShieldAlert, Stethoscope, 
  Construction, Sprout, Settings, FlaskConical, Truck, 
  ClipboardList, Apple, Video, HardHat, Scale, LucideIcon 
} from "lucide-react"

export const MAP_CURSOS: Record<string, string> = {
  "I": "Informática",
  "VS": "Vigilância Sanitária",
  "PV": "Produção de Áudio e Vídeo",
  "EL": "Eletromecânica",
  "A": "Agroecologia",
  "ND": "Nutrição e Dietética",
  "PC": "Planejamento e Controle de Produção",
  "Q": "Química",
  "RC": "Redes de Computadores",
  "ED": "Edificações",
  "AC": "Análises Clínicas",
  "ST": "Segurança do Trabalho",
  "SJ": "Serviços Jurídicos",
  "E": "Enfermagem"
}

export const MAP_TURNOS: Record<string, string> = {
  "M": "Matutino",
  "V": "Vespertino",
  "N": "Noturno",
  "I": "Integral"
}

export const MAP_CORES: Record<string, { bg: string, shadow: string }> = {
  "Informática": { bg: "bg-rose-600", shadow: "shadow-rose-100" },
  "Redes de Computadores": { bg: "bg-rose-600", shadow: "shadow-rose-100" },
  "Análises Clínicas": { bg: "bg-blue-600", shadow: "shadow-blue-100" },
  "Vigilância Sanitária": { bg: "bg-blue-500", shadow: "shadow-blue-100" },
  "Enfermagem": { bg: "bg-sky-500", shadow: "shadow-sky-100" },
  "Edificações": { bg: "bg-emerald-600", shadow: "shadow-emerald-100" },
  "Agroecologia": { bg: "bg-green-600", shadow: "shadow-green-100" },
  "Eletromecânica": { bg: "bg-teal-600", shadow: "shadow-teal-100" },
  "Química": { bg: "bg-teal-500", shadow: "shadow-teal-100" },
  "Logística": { bg: "bg-amber-500", shadow: "shadow-amber-100" },
  "Planejamento e Controle de Produção": { bg: "bg-amber-500", shadow: "shadow-amber-100" },
  "Nutrição e Dietética": { bg: "bg-orange-500", shadow: "shadow-orange-100" },
  "Produção de Áudio e Vídeo": { bg: "bg-indigo-500", shadow: "shadow-indigo-100" },
  "Segurança do Trabalho": { bg: "bg-slate-700", shadow: "shadow-slate-200" },
  "Serviços Jurídicos": { bg: "bg-indigo-700", shadow: "shadow-indigo-200" },
}

export const MAP_ICONS: Record<string, LucideIcon> = {
  "Informática": Monitor,
  "Redes de Computadores": Network,
  "Análises Clínicas": Microscope,
  "Vigilância Sanitária": ShieldAlert,
  "Enfermagem": Stethoscope,
  "Edificações": Construction,
  "Agroecologia": Sprout,
  "Eletromecânica": Settings,
  "Química": FlaskConical,
  "Logística": Truck,
  "Planejamento e Controle de Produção": ClipboardList,
  "Nutrição e Dietética": Apple,
  "Produção de Áudio e Vídeo": Video,
  "Segurança do Trabalho": HardHat,
  "Serviços Jurídicos": Scale,
}

export function getTurmaColor(curso: string | null) {
  if (!curso) return { bg: "bg-blue-600", shadow: "shadow-blue-200" }
  const nomeLimpo = curso.split('(')[0].trim()
  return MAP_CORES[nomeLimpo] || { bg: "bg-blue-600", shadow: "shadow-blue-200" }
}

export function getTurmaIcon(curso: string | null) {
  if (!curso) return Users
  const nomeLimpo = curso.split('(')[0].trim()
  return MAP_ICONS[nomeLimpo] || Users
}

export function decodeTurma(nome: string) {
  // Regex para o padrão 1TIM1 (Série + T + Sigla + Turno + Numero)
  const match = nome.match(/^(\d+)T([A-Z])([MVNI])(\d+)$/)
  if (!match) return { curso: null, turno: null }
  
  const sigla = match[2]
  const turnoInic = match[3]
  
  return {
    curso: MAP_CURSOS[sigla] || null,
    turno: MAP_TURNOS[turnoInic] || null
  }
}
