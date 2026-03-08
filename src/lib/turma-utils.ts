import { 
  Users, Monitor, Network, Microscope, ShieldAlert, Stethoscope, 
  Construction, Sprout, Settings, FlaskConical, Truck, 
  ClipboardList, Apple, Video, HardHat, Scale, LucideIcon,
  Leaf, HeartPulse, Cpu, Wifi, DatabaseZap, Package,
  Building2, Beaker, ShieldCheck, Gavel, Clapperboard,
  ChefHat, Factory, TreePine, BriefcaseMedical, SquareActivity,
  Ambulance
} from "lucide-react"

// ── Mapa de Siglas → Nome Curto (para decodeTurma) ────────────────────────
export const MAP_CURSOS: Record<string, string> = {
  "I":  "Informática",
  "VS": "Vigilância em Saúde",
  "PV": "Produção de Áudio e Vídeo",
  "EL": "Eletromecânica",
  "A":  "Agroecologia",
  "ND": "Nutrição e Dietética",
  "PC": "Planejamento e Controle de Produção",
  "Q":  "Química",
  "RC": "Redes de Computadores",
  "ED": "Edificações",
  "AC": "Análises Clínicas",
  "ST": "Segurança do Trabalho",
  "SJ": "Serviços Jurídicos",
  "E":  "Enfermagem",
  "MA": "Meio Ambiente",
  "ADM": "Administração",
  "LOG": "Logística",
}

export const MAP_TURNOS: Record<string, string> = {
  "M": "Matutino",
  "V": "Vespertino",
  "N": "Noturno",
  "I": "Integral"
}

// ── Cores por Categoria ────────────────────────────────────────────────────
// 🔴 Vermelho/Rosa  → Tecnologia da Informação
// 🔵 Azul/Céu       → Saúde
// 🟢 Verde          → Meio Ambiente / Agronomia
// 🟡 Âmbar/Laranja  → Administração / Logística
// 🟣 Índigo/Roxo    → Produção / Jurídico / Criativo
// ⚫ Slate          → Segurança do Trabalho
// 🩵 Teal           → Química / Engenharia

type CorTurma = { bg: string; shadow: string }

const CORES: Record<string, CorTurma> = {
  // TI — Vermelho/ Rosa
  "Informática":                           { bg: "bg-rose-600",    shadow: "shadow-rose-200" },
  "Técnico em Informática":               { bg: "bg-rose-600",    shadow: "shadow-rose-200" },
  "Redes de Computadores":                { bg: "bg-red-500",     shadow: "shadow-red-200"  },
  "Técnico em Redes de Computadores":     { bg: "bg-red-500",     shadow: "shadow-red-200"  },

  // Saúde — Azul
  "Análises Clínicas":                    { bg: "bg-blue-600",    shadow: "shadow-blue-200" },
  "Técnico em Análises Clínicas":         { bg: "bg-blue-600",    shadow: "shadow-blue-200" },
  "Vigilância Sanitária":                 { bg: "bg-cyan-500",    shadow: "shadow-cyan-200" },
  "Vigilância em Saúde":                  { bg: "bg-cyan-500",    shadow: "shadow-cyan-200" },
  "Técnica em Vigilância em Saúde":       { bg: "bg-cyan-500",    shadow: "shadow-cyan-200" },
  "Técnico em Vigilância em Saúde":       { bg: "bg-cyan-500",    shadow: "shadow-cyan-200" },
  "Enfermagem":                           { bg: "bg-sky-500",     shadow: "shadow-sky-200"  },
  "Técnico em Enfermagem":                { bg: "bg-sky-500",     shadow: "shadow-sky-200"  },
  "Nutrição e Dietética":                 { bg: "bg-blue-400",    shadow: "shadow-blue-100" },
  "Técnico em Nutrição e Dietética":      { bg: "bg-blue-400",    shadow: "shadow-blue-100" },

  // Meio Ambiente / Agronomia — Verde
  "Agroecologia":                         { bg: "bg-green-600",   shadow: "shadow-green-200"   },
  "Técnico em Agroecologia":              { bg: "bg-green-600",   shadow: "shadow-green-200"   },
  "Meio Ambiente":                        { bg: "bg-emerald-600", shadow: "shadow-emerald-200" },
  "Técnico em Meio Ambiente":             { bg: "bg-emerald-600", shadow: "shadow-emerald-200" },

  // Administração / Logística — Âmbar / Laranja
  "Administração":                        { bg: "bg-amber-500",   shadow: "shadow-amber-200"  },
  "Técnico em Administração":             { bg: "bg-amber-500",   shadow: "shadow-amber-200"  },
  "Logística":                            { bg: "bg-orange-500",  shadow: "shadow-orange-200" },
  "Técnico em Logística":                 { bg: "bg-orange-500",  shadow: "shadow-orange-200" },
  "Planejamento e Controle de Produção":  { bg: "bg-yellow-500",  shadow: "shadow-yellow-200" },
  "Técnico em Planejamento e Controle de Produção": { bg: "bg-yellow-500", shadow: "shadow-yellow-200" },
  "Técnico em Planejamento e Controle de Produção ": { bg: "bg-yellow-500", shadow: "shadow-yellow-200" }, // trailing space

  // Engenharia / Construção — Teal / Ciano
  "Edificações":                          { bg: "bg-teal-600",    shadow: "shadow-teal-200"    },
  "Técnico em Edificações":               { bg: "bg-teal-600",    shadow: "shadow-teal-200"    },
  "Eletromecânica":                       { bg: "bg-teal-500",    shadow: "shadow-teal-200"    },
  "Técnico em Eletromecânica":            { bg: "bg-teal-500",    shadow: "shadow-teal-200"    },
  "Química":                              { bg: "bg-violet-600",  shadow: "shadow-violet-200"  },
  "Técnico em Química":                   { bg: "bg-violet-600",  shadow: "shadow-violet-200"  },

  // Criativo / Cultural — Índigo / Roxo
  "Produção de Áudio e Vídeo":            { bg: "bg-indigo-500",  shadow: "shadow-indigo-200" },
  "Técnico em Produção de Áudio e Vídeo": { bg: "bg-indigo-500",  shadow: "shadow-indigo-200" },

  // Jurídico — Índigo Escuro
  "Serviços Jurídicos":                   { bg: "bg-indigo-700",  shadow: "shadow-indigo-200" },
  "Técnico em Serviços Jurídicos":        { bg: "bg-indigo-700",  shadow: "shadow-indigo-200" },

  // Segurança — Slate Escuro
  "Segurança do Trabalho":                { bg: "bg-slate-700",   shadow: "shadow-slate-200" },
  "Técnico em Segurança do Trabalho":     { bg: "bg-slate-700",   shadow: "shadow-slate-200" },
}

// ── Ícones por Curso ───────────────────────────────────────────────────────
const ICONS: Record<string, LucideIcon> = {
  // TI
  "Informática":                           Monitor,
  "Técnico em Informática":               Monitor,
  "Redes de Computadores":                Wifi,
  "Técnico em Redes de Computadores":     Wifi,

  // Saúde
  "Análises Clínicas":                    Microscope,
  "Técnico em Análises Clínicas":         Microscope,
  "Vigilância Sanitária":                 ShieldAlert,
  "Vigilância em Saúde":                  ShieldAlert,
  "Técnica em Vigilância em Saúde":       ShieldAlert,
  "Técnico em Vigilância em Saúde":       ShieldAlert,
  "Enfermagem":                           Stethoscope,
  "Técnico em Enfermagem":                Stethoscope,
  "Nutrição e Dietética":                 Apple,
  "Técnico em Nutrição e Dietética":      Apple,

  // Meio Ambiente / Agronomia
  "Agroecologia":                         Sprout,
  "Técnico em Agroecologia":              Sprout,
  "Meio Ambiente":                        TreePine,
  "Técnico em Meio Ambiente":             TreePine,

  // Administração / Logística
  "Administração":                        ClipboardList,
  "Técnico em Administração":             ClipboardList,
  "Logística":                            Truck,
  "Técnico em Logística":                 Truck,
  "Planejamento e Controle de Produção":  Package,
  "Técnico em Planejamento e Controle de Produção": Package,
  "Técnico em Planejamento e Controle de Produção ": Package,

  // Engenharia / Construção
  "Edificações":                          Building2,
  "Técnico em Edificações":               Building2,
  "Eletromecânica":                       Settings,
  "Técnico em Eletromecânica":            Settings,
  "Química":                              FlaskConical,
  "Técnico em Química":                   FlaskConical,

  // Criativo
  "Produção de Áudio e Vídeo":            Clapperboard,
  "Técnico em Produção de Áudio e Vídeo": Clapperboard,

  // Jurídico
  "Serviços Jurídicos":                   Scale,
  "Técnico em Serviços Jurídicos":        Scale,

  // Segurança
  "Segurança do Trabalho":                HardHat,
  "Técnico em Segurança do Trabalho":     HardHat,
}

// ── Lookup com fallback inteligente ───────────────────────────────────────
function normalizarCurso(curso: string): string {
  // Remove trailing spaces e normaliza
  return curso.trim()
}

function buscarPorPalavraChave(nome: string): string | null {
  const n = nome.toLowerCase()
  if (n.includes("informática") || n.includes("informatica")) return "Informática"
  if (n.includes("redes")) return "Redes de Computadores"
  if (n.includes("análises clínicas") || n.includes("analises clinicas")) return "Análises Clínicas"
  if (n.includes("vigilância") || n.includes("vigilancia")) return "Vigilância em Saúde"
  if (n.includes("enfermagem")) return "Enfermagem"
  if (n.includes("nutrição") || n.includes("nutricao")) return "Nutrição e Dietética"
  if (n.includes("meio ambiente")) return "Meio Ambiente"
  if (n.includes("agroecologia")) return "Agroecologia"
  if (n.includes("administração") || n.includes("administracao")) return "Administração"
  if (n.includes("logística") || n.includes("logistica")) return "Logística"
  if (n.includes("planejamento")) return "Planejamento e Controle de Produção"
  if (n.includes("edificações") || n.includes("edificacoes")) return "Edificações"
  if (n.includes("eletromecânica") || n.includes("eletromecanica")) return "Eletromecânica"
  if (n.includes("química") || n.includes("quimica")) return "Química"
  if (n.includes("áudio") || n.includes("audio") || n.includes("vídeo") || n.includes("video")) return "Produção de Áudio e Vídeo"
  if (n.includes("jurídico") || n.includes("juridico")) return "Serviços Jurídicos"
  if (n.includes("segurança") || n.includes("seguranca")) return "Segurança do Trabalho"
  return null
}

export function getTurmaColor(curso: string | null): CorTurma {
  const fallback = { bg: "bg-blue-600", shadow: "shadow-blue-200" }
  if (!curso) return fallback

  const nome = normalizarCurso(curso)
  if (CORES[nome]) return CORES[nome]

  // Busca por palavra-chave
  const chave = buscarPorPalavraChave(nome)
  if (chave && CORES[chave]) return CORES[chave]

  return fallback
}

export function getTurmaIcon(curso: string | null): LucideIcon {
  if (!curso) return Users

  const nome = normalizarCurso(curso)
  if (ICONS[nome]) return ICONS[nome]

  // Busca por palavra-chave
  const chave = buscarPorPalavraChave(nome)
  if (chave && ICONS[chave]) return ICONS[chave]

  return Users
}

export function decodeTurma(nome: string) {
  // Regex para padrões como 1TIM1, 1TRCM1, 1TADMSUB1
  const match = nome.match(/^(\d+)T([A-Z]+)([MVNI])(\d+)/)
  if (!match) return { curso: null, turno: null }

  const sigla = match[2]
  const turnoInic = match[3]

  return {
    curso: MAP_CURSOS[sigla] || null,
    turno: MAP_TURNOS[turnoInic] || null
  }
}

// Retrocompatibilidade
export const MAP_CORES = CORES
export const MAP_ICONS = ICONS
