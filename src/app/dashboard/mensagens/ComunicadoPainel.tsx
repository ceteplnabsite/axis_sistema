"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, Mail, Pin, PinOff, Users } from "lucide-react"
import { alternarFixado, darCiencia, lembrarPendentes, relatorioLeitura, type LinhaRelatorio } from "./comunicado-actions"

type Relatorio = { publico: string; requerCiencia: boolean; total: number; lidos: number; cientes: number; linhas: LinhaRelatorio[] }

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/**
 * Painel de um comunicado: "Estou ciente" para quem recebe; relatório de leitura,
 * lembrete e fixar para quem enviou, Direção e administradores.
 */
export default function ComunicadoPainel({ mensagem, currentUserId, podeGerir, podeFixar, onAtualizar }: {
  mensagem: { id: string; senderId: string; requerCiencia?: boolean; fixado?: boolean; ciencias?: { createdAt: string | Date }[] }
  currentUserId: string
  podeGerir: boolean
  podeFixar: boolean
  onAtualizar?: (parcial: { fixado?: boolean; cienteEm?: string }) => void
}) {
  const souRemetente = mensagem.senderId === currentUserId
  const [cienteEm, setCienteEm] = useState<string | null>(mensagem.ciencias?.[0] ? new Date(mensagem.ciencias[0].createdAt).toISOString() : null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [rel, setRel] = useState<Relatorio | null>(null)
  const [verLista, setVerLista] = useState(false)
  const [confirmarLembrete, setConfirmarLembrete] = useState(false)
  const [lembrete, setLembrete] = useState<string | null>(null)
  const [fixado, setFixado] = useState(!!mensagem.fixado)

  const carregar = () => relatorioLeitura(mensagem.id).then(r => { if (!('error' in r)) setRel(r as Relatorio) })
  useEffect(() => { if (podeGerir) carregar() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagem.id, podeGerir])

  const ciente = async () => {
    setSalvando(true); setErro(null)
    const r = await darCiencia(mensagem.id)
    setSalvando(false)
    if ('error' in r && r.error) { setErro(r.error); return }
    if ('em' in r && r.em) { setCienteEm(r.em); onAtualizar?.({ cienteEm: r.em }) }
  }

  const lembrar = async () => {
    setConfirmarLembrete(false); setLembrete('enviando')
    const r = await lembrarPendentes(mensagem.id)
    if ('error' in r && r.error) { setLembrete(`Erro: ${r.error}`); return }
    const ok = r as { pendentes: number; enviados: number; falhas: number; simulados: number }
    setLembrete(ok.simulados && !ok.enviados && !ok.falhas ? 'E-mail não configurado neste ambiente: nada foi enviado.'
      : ok.falhas ? `${ok.enviados} e-mail(s) enviados, ${ok.falhas} falharam.` : `Lembrete enviado para ${ok.enviados} pessoa(s).`)
  }

  const fixar = async () => {
    const r = await alternarFixado(mensagem.id)
    if ('fixado' in r && typeof r.fixado === 'boolean') { setFixado(r.fixado); onAtualizar?.({ fixado: r.fixado }) }
  }

  const pendentes = rel ? rel.linhas.filter(l => (rel.requerCiencia ? !l.cienteEm : !l.leuEm)) : []
  const feitos = rel ? (rel.requerCiencia ? rel.cientes : rel.lidos) : 0
  const pct = rel?.total ? Math.round((feitos / rel.total) * 100) : 0

  return (
    <div className="space-y-3">
      {/* quem recebe */}
      {!souRemetente && mensagem.requerCiencia && (
        cienteEm ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
            <CheckCircle2 size={18} /> Você confirmou ciência em {dataHora(cienteEm)}.
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-900">Este comunicado pede que você <b>confirme que está ciente</b>.</p>
            <button type="button" onClick={ciente} disabled={salvando}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Estou ciente
            </button>
          </div>
        )
      )}
      {erro && <p className="text-sm text-rose-700">{erro}</p>}

      {/* quem enviou / Direção */}
      {podeGerir && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5"><Users size={13} /> Para: {rel?.publico ?? '…'}</p>
              {rel ? (
                <p className="text-lg font-semibold text-slate-900">
                  {feitos} de {rel.total} {rel.requerCiencia ? 'deram ciência' : 'leram'}
                  {rel.requerCiencia && <span className="ml-2 text-sm font-normal text-slate-500">({rel.lidos} abriram)</span>}
                </p>
              ) : <p className="text-sm text-slate-400">Carregando relatório…</p>}
            </div>
            {podeFixar && (
              <button type="button" onClick={fixar} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50">
                {fixado ? <><PinOff size={15} /> Desafixar</> : <><Pin size={15} /> Fixar no topo</>}
              </button>
            )}
          </div>
          {rel && (
            <>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-slate-800" style={{ width: `${pct}%` }} /></div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setVerLista(v => !v)} className="text-sm text-slate-600 underline underline-offset-2 hover:text-slate-900">
                  {verLista ? 'Ocultar lista' : `Ver quem falta (${pendentes.length})`}
                </button>
                {pendentes.length > 0 && !confirmarLembrete && !lembrete && (
                  <button type="button" onClick={() => setConfirmarLembrete(true)} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
                    <Mail size={15} /> Lembrar {pendentes.length} por e-mail
                  </button>
                )}
                {confirmarLembrete && (
                  <span className="ml-auto flex items-center gap-2 text-sm">
                    Enviar e-mail para {pendentes.length} pessoa(s)?
                    <button type="button" onClick={lembrar} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-medium">Enviar</button>
                    <button type="button" onClick={() => setConfirmarLembrete(false)} className="px-3 py-1.5 rounded-lg border border-slate-300">Cancelar</button>
                  </span>
                )}
                {lembrete === 'enviando' && <span className="ml-auto inline-flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Enviando…</span>}
                {lembrete && lembrete !== 'enviando' && <span className="ml-auto text-sm text-slate-600">{lembrete}</span>}
              </div>
              {verLista && (
                <div className="grid sm:grid-cols-2 gap-x-6 text-sm max-h-72 overflow-y-auto border-t border-slate-100 pt-2">
                  {[...pendentes, ...rel.linhas.filter(l => !pendentes.includes(l))].map(l => {
                    const feito = rel.requerCiencia ? l.cienteEm : l.leuEm
                    return (
                      <div key={l.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-50">
                        <span className={feito ? 'text-slate-500' : 'text-slate-900'}>{l.nome}</span>
                        <span className={`text-xs shrink-0 ${feito ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {feito ? `${rel.requerCiencia ? 'ciente' : 'leu'} ${dataHora(feito)}` : rel.requerCiencia ? (l.leuEm ? 'abriu, sem ciência' : 'pendente') : 'não leu'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
