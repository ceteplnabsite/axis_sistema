'use client'

import { useState } from 'react'
import { ArrowUpCircle, CheckCircle2, AlertCircle, AlertTriangle, Loader2, XCircle } from 'lucide-react'

const NOMES_INICIAIS = `1TACN1sub
3TACN1eja
4TACN1eja
5TACN1eja
3TNDN1eja
4TNDN1eja
5TNDN1eja
1TSTN1eja
1TSTN1sub
2TSTN1eja
3TSTN1sub
4TSTN1eja
4TLN1eja
2TADMN1eja
4TADMN1eja
5TADMN1eja
2TSJN1sub
3TSJN1eja
4TSJN1eja
5TSJN1eja
3TIN1eja
4TIN1eja
5TIN1eja
2TEDN1sub
3TEDN1sub
2TELEN1eja
1ENFN1sub
2ENFN1sub
1TVSN1eja`

interface PlanoItem {
  nome: string
  id?: string
  modalidade?: string | null
  serieAtual?: number
  estudantes?: number
  acao?: 'PROMOVER' | 'FINALIZAR'
  detalhe?: string
  novoNome?: string
  novaSerie?: number
  erro?: string
}

interface ResultadoItem extends PlanoItem {
  executado: boolean
  erroExecucao?: string
  novaTurmaId?: string
}

export default function PromoverTurmasEmMassaPage() {
  const [texto, setTexto] = useState(NOMES_INICIAIS)
  const [plano, setPlano] = useState<PlanoItem[] | null>(null)
  const [resultados, setResultados] = useState<ResultadoItem[] | null>(null)
  const [analisando, setAnalisando] = useState(false)
  const [executando, setExecutando] = useState(false)

  const nomesLista = () => texto.split('\n').map(n => n.trim()).filter(Boolean)

  const analisar = async () => {
    setAnalisando(true)
    setResultados(null)
    setPlano(null)
    try {
      const res = await fetch('/api/admin/bulk-promover-turmas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomes: nomesLista(), dryRun: true })
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.message || 'Erro ao analisar')
        return
      }
      setPlano(data.plano)
    } catch {
      alert('Erro de conexão ao analisar')
    } finally {
      setAnalisando(false)
    }
  }

  const executar = async () => {
    if (!plano) return
    const validos = plano.filter(p => !p.erro)
    const promover = validos.filter(p => p.acao === 'PROMOVER').length
    const finalizar = validos.filter(p => p.acao === 'FINALIZAR').length

    if (!confirm(
      `Confirma executar?\n\n` +
      `• ${promover} turma(s) serão PROMOVIDAS (nova turma criada, alunos movidos, origem encerrada)\n` +
      `• ${finalizar} turma(s) serão FINALIZADAS (alunos marcados como CONCLUÍDO)\n\n` +
      `Esta ação mexe em dados reais de alunos e não tem desfazer automático.`
    )) return

    setExecutando(true)
    try {
      const res = await fetch('/api/admin/bulk-promover-turmas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomes: nomesLista(), dryRun: false })
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.message || 'Erro ao executar')
        return
      }
      setResultados(data.resultados)
      setPlano(null)
    } catch {
      alert('Erro de conexão ao executar')
    } finally {
      setExecutando(false)
    }
  }

  const comErro = plano?.filter(p => p.erro) || []
  const promover = plano?.filter(p => p.acao === 'PROMOVER') || []
  const finalizar = plano?.filter(p => p.acao === 'FINALIZAR') || []

  return (
    <div className="p-8 max-w-5xl mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 text-slate-800">
        <ArrowUpCircle className="text-blue-500" /> Promover/Encerrar Turmas em Massa
      </h1>
      <p className="text-gray-600 mb-8 text-sm">
        Cole os nomes das turmas (um por linha). Turmas na última série da modalidade
        são finalizadas (concluído); as demais são promovidas para a próxima série,
        com a turma de origem encerrada automaticamente.
      </p>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Nomes das turmas
        </label>
        <textarea
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setPlano(null); setResultados(null) }}
          rows={12}
          className="w-full font-mono text-sm p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button
          onClick={analisar}
          disabled={analisando || nomesLista().length === 0}
          className="mt-4 flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all"
        >
          {analisando ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
          Analisar (sem alterar nada ainda)
        </button>
      </div>

      {plano && (
        <div className="space-y-6">
          {comErro.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
              <h3 className="text-rose-700 font-bold text-sm flex items-center gap-2 mb-3">
                <XCircle className="w-4 h-4" /> {comErro.length} turma(s) com problema — não serão tocadas
              </h3>
              <ul className="text-xs text-rose-700 space-y-1">
                {comErro.map((p, i) => (
                  <li key={i}><b>{p.nome}</b>: {p.erro}</li>
                ))}
              </ul>
            </div>
          )}

          {promover.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <h3 className="text-blue-700 font-bold text-sm flex items-center gap-2 mb-3">
                <ArrowUpCircle className="w-4 h-4" /> {promover.length} turma(s) serão PROMOVIDAS
              </h3>
              <ul className="text-xs text-blue-800 space-y-1.5">
                {promover.map((p, i) => (
                  <li key={i}><b>{p.nome}</b> ({p.modalidade}, série {p.serieAtual}) → {p.detalhe}</li>
                ))}
              </ul>
            </div>
          )}

          {finalizar.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="text-amber-700 font-bold text-sm flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4" /> {finalizar.length} turma(s) serão FINALIZADAS (concluído)
              </h3>
              <ul className="text-xs text-amber-800 space-y-1.5">
                {finalizar.map((p, i) => (
                  <li key={i}><b>{p.nome}</b> ({p.modalidade}, série {p.serieAtual}) → {p.detalhe}</li>
                ))}
              </ul>
            </div>
          )}

          {(promover.length > 0 || finalizar.length > 0) && (
            <button
              onClick={executar}
              disabled={executando}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3"
            >
              {executando ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              {executando ? 'Executando...' : `Confirmar e Executar (${promover.length + finalizar.length} turma${promover.length + finalizar.length === 1 ? '' : 's'})`}
            </button>
          )}
        </div>
      )}

      {resultados && (
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4">Resultado da execução</h3>
          <ul className="text-sm space-y-2">
            {resultados.map((r, i) => (
              <li key={i} className={`flex items-start gap-2 ${r.executado ? 'text-emerald-700' : 'text-rose-600'}`}>
                {r.executado ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                <span>
                  <b>{r.nome}</b>: {r.executado
                    ? (r.acao === 'PROMOVER' ? `promovida para ${r.novoNome}` : 'finalizada (concluído)')
                    : (r.erro || r.erroExecucao || 'não executada')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-12 bg-amber-50 border border-amber-200 p-6 rounded-xl">
        <h3 className="text-amber-800 font-bold flex items-center gap-2 mb-2">
          <AlertTriangle size={18} /> Importante
        </h3>
        <ul className="text-sm text-amber-700 list-disc ml-5 space-y-1">
          <li>Sempre rode &quot;Analisar&quot; primeiro e confira a lista antes de executar.</li>
          <li>Última série: PROEJA = 5, SUBSEQUENTE/PROSUB = 4. Turmas nessa série são finalizadas em vez de promovidas.</li>
          <li>Turmas com nome não encontrado, ambíguo, já encerradas ou de modalidade não semestral aparecem como erro e não são alteradas.</li>
        </ul>
      </div>
    </div>
  )
}
