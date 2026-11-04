"use client"

import type { FiltroFila, ResumoChamados } from "@/lib/chamados"

/** Contadores da fila para quem atende chamados; cada um filtra a lista */
export default function PainelFila({ resumo, filtro, onFiltro }: {
  resumo: ResumoChamados
  filtro: FiltroFila | null
  onFiltro: (f: FiltroFila | null) => void
}) {
  const itens: { chave: FiltroFila | null; rotulo: string; valor?: number; destaque?: boolean; dica: string }[] = [
    { chave: null, rotulo: 'Todos', dica: 'Todas as mensagens recebidas' },
    { chave: 'atrasados', rotulo: 'Sem resposta há +24h', valor: resumo.atrasados, destaque: resumo.atrasados > 0, dica: 'Esperando a equipe há mais de 24 horas (mais antigos primeiro)' },
    { chave: 'novos', rotulo: 'Novos', valor: resumo.novos, dica: 'Ninguém da equipe respondeu ainda' },
    { chave: 'aguardando', rotulo: 'Aguardando solicitante', valor: resumo.aguardandoSolicitante, dica: 'A equipe respondeu; fecham sozinhos após 7 dias sem retorno' },
    { chave: 'resolvidos', rotulo: 'Resolvidos', dica: 'Últimos chamados resolvidos' },
  ]
  return (
    <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filtrar chamados">
      {itens.map(i => {
        const ativo = filtro === i.chave
        return (
          <button key={i.rotulo} type="button" role="tab" aria-selected={ativo} title={i.dica}
            onClick={() => onFiltro(i.chave)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              ativo ? 'bg-slate-900 border-slate-900 text-white'
                : i.destaque ? 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            {i.rotulo}
            {i.valor !== undefined && (
              <span className={`min-w-6 px-1.5 py-0.5 rounded-md text-xs font-semibold text-center ${
                ativo ? 'bg-white/20' : i.destaque ? 'bg-rose-100' : 'bg-slate-100'}`}>{i.valor}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
