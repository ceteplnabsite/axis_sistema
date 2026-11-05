// Peças visuais da tela de Mensagens (avatar, categoria, datas, prévia).
import { Landmark, LifeBuoy, Megaphone, MessageSquare } from "lucide-react"

const TZ = 'America/Sao_Paulo'
const CORES = [
  'bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-800',
  'bg-sky-100 text-sky-700', 'bg-rose-100 text-rose-700', 'bg-violet-100 text-violet-700', 'bg-teal-100 text-teal-700',
]

export function iniciais(nome?: string | null) {
  const p = (nome || '?').replace(/^(Para|Com):\s*/, '').trim().split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] ?? '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

/** Avatar com iniciais; a cor é sempre a mesma para o mesmo nome */
export function Avatar({ nome, tamanho = 'md' }: { nome?: string | null; tamanho?: 'sm' | 'md' }) {
  const chave = (nome || '?').replace(/^(Para|Com):\s*/, '')
  let h = 0
  for (const c of chave) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const tam = tamanho === 'sm' ? 'w-8 h-8 text-[11px]' : 'w-10 h-10 text-xs'
  return (
    <span aria-hidden className={`${tam} ${CORES[h % CORES.length]} rounded-full flex items-center justify-center font-semibold shrink-0`}>
      {iniciais(nome)}
    </span>
  )
}

const CATEGORIAS: Record<string, { rotulo: string; Icone: typeof MessageSquare }> = {
  COMUNICADO: { rotulo: 'Comunicado', Icone: Megaphone },
  SUPORTE: { rotulo: 'Suporte', Icone: LifeBuoy },
  DIRECAO: { rotulo: 'Direção', Icone: Landmark },
  GERAL: { rotulo: 'Conversa', Icone: MessageSquare },
}

export function CategoriaTag({ categoria }: { categoria: string }) {
  const c = CATEGORIAS[categoria] ?? CATEGORIAS.GERAL
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
      <c.Icone size={12} className="text-slate-400" /> {c.rotulo}
    </span>
  )
}

const diaDe = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ })

/** "14:32" hoje, "Ontem", "12 out" no ano, "12/10/25" antes */
export function tempoCurto(val: Date | string) {
  const d = new Date(val), agora = new Date()
  if (diaDe(d) === diaDe(agora)) return d.toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  if (diaDe(d) === diaDe(new Date(agora.getTime() - 86400_000))) return 'Ontem'
  if (d.getFullYear() === agora.getFullYear()) return d.toLocaleDateString('pt-BR', { timeZone: TZ, day: 'numeric', month: 'short' }).replace('.', '')
  return d.toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit' })
}

/** Separador da conversa: "Hoje", "Ontem" ou "4 de novembro" */
export function rotuloDia(val: Date | string) {
  const d = new Date(val), agora = new Date()
  if (diaDe(d) === diaDe(agora)) return 'Hoje'
  if (diaDe(d) === diaDe(new Date(agora.getTime() - 86400_000))) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { timeZone: TZ, day: 'numeric', month: 'long', ...(d.getFullYear() !== agora.getFullYear() ? { year: 'numeric' } : {}) })
}
export const mesmoDia = (a: Date | string, b: Date | string) => diaDe(new Date(a)) === diaDe(new Date(b))

/** Texto puro curto para a prévia da lista */
export function previa(conteudo?: string | null, max = 90) {
  const t = (conteudo || '')
    .replace(/<br\s*\/?>|<\/p>/gi, ' ').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[*_`#>]+/g, '').replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max - 1) + '…' : t
}
