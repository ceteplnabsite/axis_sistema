"use client"

import { useEffect, useState } from "react"
import { BookOpen, CheckCircle2, Loader2, Save } from "lucide-react"
import { getAssuntoRecuperacao, salvarAssuntoRecuperacao } from "../../recuperacao-assunto-actions"

/** Quadro "Recuperação" na tela de lançar notas: o professor informa o assunto da prova */
export default function AssuntoRecuperacaoCard({ disciplinaId, disciplinaNome, turmaNome, somenteLeitura }: {
  disciplinaId: string; disciplinaNome: string; turmaNome: string; somenteLeitura: boolean
}) {
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [assunto, setAssunto] = useState('')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [orientacoes, setOrientacoes] = useState('')
  const [outras, setOutras] = useState<{ id: string; turma: string }[]>([])
  const [aplicarOutras, setAplicarOutras] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [original, setOriginal] = useState('')

  useEffect(() => {
    getAssuntoRecuperacao(disciplinaId).then(r => {
      if ('erro' in r) { setErro(r.erro); return }
      const a = r.assunto
      setAssunto(a?.assunto ?? ''); setData(a?.data ?? ''); setHora(a?.hora ?? ''); setOrientacoes(a?.orientacoes ?? '')
      setOriginal(JSON.stringify([a?.assunto ?? '', a?.data ?? '', a?.hora ?? '', a?.orientacoes ?? '']))
      setOutras(r.outrasTurmas)
      if (a?.atualizadoEm) setInfo(`Salvo por ${a.atualizadoPor ?? 'alguém'} em ${new Date(a.atualizadoEm).toLocaleString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`)
    }).finally(() => setCarregando(false))
  }, [disciplinaId])

  const alterado = JSON.stringify([assunto, data, hora, orientacoes]) !== original || aplicarOutras

  const salvar = async () => {
    setSalvando(true); setErro(null)
    const r = await salvarAssuntoRecuperacao(disciplinaId, { assunto, data, hora, orientacoes }, aplicarOutras ? outras.map(o => o.id) : [])
    setSalvando(false)
    if ('erro' in r) { setErro(r.erro); return }
    setOriginal(JSON.stringify([assunto.trim(), data, hora, orientacoes.trim()]))
    setAssunto(assunto.trim()); setOrientacoes(orientacoes.trim()); setAplicarOutras(false)
    setInfo(`${assunto.trim() ? 'Salvo' : 'Assunto apagado'} agora${r.salvas > 1 ? ` em ${r.salvas} turmas` : ''}.`)
  }

  const campo = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"

  return (
    <section className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><BookOpen size={18} /></span>
        <div>
          <h3 className="font-semibold text-slate-900">Recuperação de {disciplinaNome} ({turmaNome})</h3>
          <p className="text-xs text-slate-500">Os alunos em recuperação veem este assunto quando consultam o resultado em ceteplnab.com.br/resultados.</p>
        </div>
      </div>
      {carregando ? (
        <div className="p-5 text-sm text-slate-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Carregando…</div>
      ) : (
        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Assunto da prova</span>
            <textarea value={assunto} onChange={e => setAssunto(e.target.value)} disabled={somenteLeitura} rows={3} maxLength={1500}
              placeholder="Ex.: Modelagem ER, normalização (1FN a 3FN), SELECT com JOIN e GROUP BY"
              className={`${campo} mt-1 resize-y`} />
          </label>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Data <span className="font-normal text-slate-400">(opcional)</span></span>
              <input type="date" value={data} onChange={e => setData(e.target.value)} disabled={somenteLeitura} className={`${campo} mt-1`} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Horário <span className="font-normal text-slate-400">(opcional)</span></span>
              <input type="time" value={hora} onChange={e => setHora(e.target.value)} disabled={somenteLeitura || !data} className={`${campo} mt-1`} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Orientações <span className="font-normal text-slate-400">(opcional)</span></span>
              <input value={orientacoes} onChange={e => setOrientacoes(e.target.value)} disabled={somenteLeitura} maxLength={300}
                placeholder="Ex.: trazer calculadora" className={`${campo} mt-1`} />
            </label>
          </div>
          {outras.length > 0 && !somenteLeitura && (
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={aplicarOutras} onChange={e => setAplicarOutras(e.target.checked)} className="mt-0.5 rounded" />
              <span>Usar o mesmo assunto nas minhas outras turmas de {disciplinaNome} ({outras.map(o => o.turma).join(', ')})</span>
            </label>
          )}
          {erro && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{erro}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500 flex items-center gap-1.5">{info && <><CheckCircle2 size={14} className="text-emerald-600" /> {info}</>}</p>
            {!somenteLeitura && (
              <button type="button" onClick={salvar} disabled={salvando || !alterado}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium text-sm disabled:opacity-50">
                {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar assunto
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
