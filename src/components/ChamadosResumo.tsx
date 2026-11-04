import Link from "next/link"
import { LifeBuoy } from "lucide-react"
import { resumoChamados } from "@/lib/chamados"

const NOMES: Record<string, string> = { SUPORTE: 'Suporte técnico', DIRECAO: 'Direção' }

/** Cartão do dashboard: chamados esperando a equipe (só para quem atende) */
export default async function ChamadosResumo({ user }: { user: { id: string; isSuperuser?: boolean; isDirecao?: boolean } }) {
  const r = await resumoChamados(user)
  if (!r.categorias.length) return null
  const total = r.novos + r.aguardandoEquipe

  return (
    <section className="bg-white border border-slate-300 rounded-[2rem] p-5 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-300 flex items-center justify-center text-slate-700 shrink-0">
          <LifeBuoy className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mb-0.5">Chamados esperando a equipe</p>
          {total === 0 ? (
            <p className="text-sm font-medium text-slate-800">Nenhum chamado esperando resposta.</p>
          ) : (
            <p className="text-sm text-slate-800">
              {r.categorias.map((c, i) => (
                <span key={c}>
                  {i > 0 && <span className="text-slate-300 mx-2">|</span>}
                  {NOMES[c]}: <b>{r.porCategoria[c].abertos}</b>
                  {r.porCategoria[c].atrasados > 0 && <span className="text-rose-700"> ({r.porCategoria[c].atrasados} há +24h)</span>}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
      {total > 0 && (
        <Link href={`/dashboard/mensagens?fila=${r.atrasados ? 'atrasados' : 'novos'}`}
          className="shrink-0 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
          {r.atrasados ? `Responder ${r.atrasados} atrasado${r.atrasados > 1 ? 's' : ''}` : 'Ver chamados'}
        </Link>
      )}
    </section>
  )
}
