"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, ArrowRightLeft, CheckCircle2, Download, Loader2, LogIn, LogOut, RefreshCw, Save } from "lucide-react"
import { ORIGEM_SIGEDUC, TIPO_MENSAGEM, TIPO_RECEBIDO, casarNomes, codigoTurmaSigeduc, notaSigeduc, validarDadosSigeduc, type DadosSigeduc } from "@/lib/sigeduc"
import { aplicarMudancasTurma, notasAtuais, planejarMudancasTurma, procurarTurma, type AlunoAxis, type MudancaEntrada, type MudancaSaida, type TurmaCandidata } from "./actions"

type Unid = '1' | '2' | '3'
type Linha = {
  chave: string; unidade: Unid; nome: string; matricula: string | null
  axis: number | null; sigeduc: number | null; inf: boolean
  tipo: 'igual' | 'nova' | 'alterar' | 'vazia' | 'nao_achado' | 'ambiguo'
}

const fmt = (v: number | null) => (v === null ? '—' : v.toFixed(1).replace('.', ','))

/** Aceita dados do SIGEduc; quando o próprio Áxis roda localmente (teste), aceita também páginas do localhost */
const origemPermitida = (origem: string) =>
  origem === ORIGEM_SIGEDUC || (window.location.hostname === 'localhost' && /^http:\/\/localhost(:\d+)?$/.test(origem))

export default function ImportarSigeducClient() {
  const [dados, setDados] = useState<DadosSigeduc | null>(null)
  const [candidatas, setCandidatas] = useState<TurmaCandidata[] | null>(null)
  const [turmaId, setTurmaId] = useState('')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [axis, setAxis] = useState<{ semestral: boolean; turma: string; disciplina: string; encerrada: boolean; alunos: AlunoAxis[] } | null>(null)
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState<string | null>(null)
  const [mudancas, setMudancas] = useState<{ entrar: MudancaEntrada[]; sair: MudancaSaida[]; duvidas: string[] } | null>(null)
  const [aplicandoMud, setAplicandoMud] = useState(false)
  const [confirmMud, setConfirmMud] = useState(false)

  // 1. Recebe a tabela do SIGEduc (enviada pelo botão "Enviar ao Áxis")
  useEffect(() => {
    const ouvir = (e: MessageEvent) => {
      if (!origemPermitida(e.origin) || !e.data || e.data.tipo !== TIPO_MENSAGEM) return
      const ok = validarDadosSigeduc(e.data.dados)
      ;(e.source as Window | null)?.postMessage({ tipo: TIPO_RECEBIDO }, { targetOrigin: e.origin })
      if (!ok) { setErro('Os dados recebidos do SIGEduc estão num formato inesperado. Nada foi alterado.'); return }
      setDados(atual => (atual && JSON.stringify(atual) === JSON.stringify(ok) ? atual : ok))
    }
    window.addEventListener('message', ouvir)
    return () => window.removeEventListener('message', ouvir)
  }, [])

  // 2. Encontra a turma do Áxis com os mesmos estudantes
  useEffect(() => {
    if (!dados) return
    setCarregando(true); setErro(null); setSalvo(null)
    const nomes = [...new Set(Object.values(dados.unidades).flatMap(l => (l ?? []).map(x => x.nome)))]
    procurarTurma(nomes, dados.componente).then(r => {
      if ('erro' in r) { setErro(r.erro); return }
      setCandidatas(r.candidatas)
      const melhor = r.candidatas[0]
      if (!melhor) { setErro('Nenhuma turma sua no Áxis tem os estudantes desta tabela do SIGEduc.'); return }
      setTurmaId(melhor.turmaId)
      setDisciplinaId(melhor.disciplinas[0]?.id ?? '')
    }).finally(() => setCarregando(false))
  }, [dados])

  const carregarNotas = useCallback((id: string) => {
    setCarregando(true); setAxis(null)
    notasAtuais(id).then(r => { if ('erro' in r) setErro(r.erro); else setAxis(r) }).finally(() => setCarregando(false))
  }, [])

  // 3. Notas atuais da disciplina escolhida
  useEffect(() => { if (disciplinaId) carregarNotas(disciplinaId) }, [disciplinaId, carregarNotas])

  // 3b. Mudanças de turma: o SIGEduc manda (quem não está na lista sai; quem está e vem de outra turma entra)
  const planejar = useCallback(() => {
    if (!dados || !disciplinaId) return
    const nomes = [...new Set(Object.values(dados.unidades).flatMap(l => (l ?? []).map(x => x.nome)))]
    setMudancas(null)
    planejarMudancasTurma(disciplinaId, nomes).then(r => { if ('erro' in r) setErro(r.erro); else setMudancas(r) })
  }, [dados, disciplinaId])
  useEffect(() => { planejar() }, [planejar])

  const aplicarMudancas = async () => {
    if (!mudancas) return
    setAplicandoMud(true); setErro(null)
    const r = await aplicarMudancasTurma(disciplinaId, mudancas.entrar.map(e => e.matricula), mudancas.sair.map(s => s.matricula))
    setAplicandoMud(false); setConfirmMud(false)
    if ('erro' in r) { setErro(r.erro); return }
    const partes: string[] = []
    if (r.entraram) partes.push(`${r.entraram} ${r.entraram === 1 ? 'estudante entrou' : 'estudantes entraram'} na turma (${r.notasMovidas} ${r.notasMovidas === 1 ? 'nota trazida' : 'notas trazidas'})`)
    if (r.sairam) partes.push(`${r.sairam} ${r.sairam === 1 ? 'estudante foi' : 'estudantes foram'} para Transferidos / Evasão`)
    setSalvo(`Mudanças de turma aplicadas: ${partes.join('; ')}. Confira as notas abaixo.`)
    carregarNotas(disciplinaId); planejar()
  }

  const turmaSel = candidatas?.find(c => c.turmaId === turmaId)

  // 4. Comparação unidade por unidade
  const comparacao = useMemo(() => {
    if (!dados || !axis) return null
    const unidadesAxis: Unid[] = axis.semestral ? ['1', '2'] : ['1', '2', '3']
    // ligação rígida: cada estudante do Áxis recebe no máximo um nome; dúvida nunca é aplicada
    const todosNomes = Object.values(dados.unidades).flatMap(l => (l ?? []).map(x => x.nome))
    const casamento = casarNomes(todosNomes, axis.alunos)
    const porMatricula = new Map(axis.alunos.map(a => [a.matricula, a]))
    const linhas: Linha[] = []
    const vistos = new Set<string>()
    for (const u of unidadesAxis) {
      for (const l of dados.unidades[u] ?? []) {
        const c = casamento.get(l.nome)
        const sig = notaSigeduc(l.nota)
        if (!c || 'ambiguo' in c) { linhas.push({ chave: `${u}|${l.nome}`, unidade: u, nome: l.nome, matricula: null, axis: null, sigeduc: sig, inf: false, tipo: c ? 'ambiguo' : 'nao_achado' }); continue }
        const a = porMatricula.get(c.matricula)!
        vistos.add(a.matricula)
        const atual = u === '1' ? a.n1 : u === '2' ? a.n2 : a.n3
        const inf = u === '1' ? a.inf1 : u === '2' ? a.inf2 : a.inf3
        const tipo: Linha['tipo'] = sig === null ? 'vazia' : atual === null ? 'nova' : Math.abs(atual - sig) < 0.05 ? 'igual' : 'alterar'
        linhas.push({ chave: `${u}|${a.matricula}`, unidade: u, nome: a.nome, matricula: a.matricula, axis: atual, sigeduc: sig, inf, tipo })
      }
    }
    const foraDoSigeduc = axis.alunos.filter(a => !vistos.has(a.matricula))
    const ignoradas = (Object.keys(dados.unidades) as Unid[]).filter(u => !unidadesAxis.includes(u) && (dados.unidades[u] ?? []).some(l => l.nota))
    return { linhas, unidadesAxis, foraDoSigeduc, ignoradas }
  }, [dados, axis])

  // por padrão, todas as notas novas e alterações vêm marcadas
  useEffect(() => {
    if (comparacao) setMarcadas(new Set(comparacao.linhas.filter(l => l.tipo === 'nova' || l.tipo === 'alterar').map(l => l.chave)))
  }, [comparacao])

  const aplicar = async () => {
    if (!comparacao || !axis) return
    setSalvando(true); setErro(null)
    const mudancas = comparacao.linhas.filter(l => marcadas.has(l.chave) && l.matricula && l.sigeduc !== null)
    const porAluno = new Map<string, AlunoAxis>(axis.alunos.map(a => [a.matricula, a]))
    const linhasApi = [...new Set(mudancas.map(m => m.matricula!))].map(mat => {
      const a = porAluno.get(mat)!
      const nova = { n1: a.n1, n2: a.n2, n3: a.n3 }
      for (const m of mudancas.filter(x => x.matricula === mat)) nova[`n${m.unidade}` as 'n1' | 'n2' | 'n3'] = m.sigeduc
      const s = (v: number | null) => (v === null ? '' : String(v))
      // a marca de Infrequente do Áxis é mantida como está
      return { estudanteId: mat, disciplinaId, nota1: s(nova.n1), nota2: s(nova.n2), nota3: s(nova.n3),
        isDesistente: false, isDesistenteUnid1: a.inf1, isDesistenteUnid2: a.inf2, isDesistenteUnid3: a.inf3 }
    })
    try {
      const r = await fetch('/api/notas/lancar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notas: linhasApi, contexto: 'SIGEDUC' }) })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) { setErro(body.message || 'Não foi possível salvar. Nada foi alterado.'); return }
      setSalvo(`${mudancas.length} nota${mudancas.length > 1 ? 's' : ''} de ${linhasApi.length} estudante${linhasApi.length > 1 ? 's' : ''} salva${mudancas.length > 1 ? 's' : ''} em ${axis.disciplina} (${axis.turma}).`)
      setConfirmando(false)
      carregarNotas(disciplinaId)
    } finally { setSalvando(false) }
  }

  const resumo = (u: Unid) => {
    const ls = comparacao?.linhas.filter(l => l.unidade === u) ?? []
    const c = (t: Linha['tipo']) => ls.filter(l => l.tipo === t).length
    return { total: ls.length, igual: c('igual'), nova: c('nova'), alterar: c('alterar'), vazia: c('vazia'), nao: c('nao_achado') + c('ambiguo') }
  }
  const qtdMarcadas = comparacao?.linhas.filter(l => marcadas.has(l.chave)).length ?? 0

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-slate-300 -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/notas" className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700"><ArrowLeft size={20} /></Link>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Importar notas do SIGEduc</h1>
              <p className="text-sm text-slate-500">Confira as diferenças antes de salvar. Nada muda no SIGEduc.</p>
            </div>
          </div>
          <Link href="/dashboard/notas/importar-sigeduc/instalar" className="flex items-center gap-2 text-sm text-indigo-700 hover:underline"><Download size={16} /> Instalar o botão</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto space-y-5 pb-24">
        {!dados && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="font-medium text-slate-800">Aguardando os dados do SIGEduc…</p>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              No SIGEduc, abra a tela <b>Lançar Notas para Avaliações das Unidades</b> da turma e clique no favorito <b>Enviar ao Áxis</b>.
              Se ainda não tem o botão, <Link href="/dashboard/notas/importar-sigeduc/instalar" className="text-indigo-700 underline">veja como instalar</Link>.
            </p>
          </div>
        )}

        {erro && <p role="alert" className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{erro}</p>}
        {salvo && <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2"><CheckCircle2 size={16} /> {salvo}</p>}

        {dados && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 grid md:grid-cols-2 gap-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Lido do SIGEduc</p>
              <p className="mt-1 font-semibold text-slate-900">{codigoTurmaSigeduc(dados.turma)}</p>
              <p className="text-sm text-slate-600">{dados.componente}</p>
              <p className="text-xs text-slate-500 mt-1">
                Unidades na página: {(Object.keys(dados.unidades) as Unid[]).map(u => `${u}ª (${(dados.unidades[u] ?? []).filter(l => l.nota).length} notas)`).join(' · ')}
              </p>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Turma no Áxis</span>
                <select value={turmaId} onChange={e => { setTurmaId(e.target.value); const c = candidatas?.find(x => x.turmaId === e.target.value); setDisciplinaId(c?.disciplinas[0]?.id ?? '') }}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  {candidatas?.map(c => <option key={c.turmaId} value={c.turmaId}>{c.turma} — {c.batem} de {c.totalAxis} estudantes batem</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Disciplina no Áxis</span>
                <select value={disciplinaId} onChange={e => setDisciplinaId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  {turmaSel?.disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
              </label>
              {turmaSel && turmaSel.batem < Math.max(...Object.values(dados.unidades).map(l => l?.length ?? 0)) * 0.8 && (
                <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5"><AlertTriangle size={13} /> Poucos nomes batem: confira se é a turma certa.</p>
              )}
              {turmaSel && turmaSel.disciplinas[0] && turmaSel.disciplinas[0].semelhanca < 0.3 && (
                <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5"><AlertTriangle size={13} /> Confira a disciplina: o nome não se parece com o componente do SIGEduc.</p>
              )}
            </div>
          </section>
        )}

        {carregando && <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Carregando…</p>}

        {comparacao && axis && (
          <>
            {axis.encerrada && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">Esta turma está encerrada no Áxis: as notas não podem ser alteradas.</p>}
            {mudancas && (mudancas.entrar.length > 0 || mudancas.sair.length > 0 || mudancas.duvidas.length > 0) && !axis.encerrada && (
              <section className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-indigo-100 bg-indigo-50/60 flex items-center gap-2">
                  <ArrowRightLeft size={18} className="text-indigo-600" />
                  <h2 className="font-semibold text-slate-900">Mudanças de turma</h2>
                  <span className="text-xs text-slate-500">O SIGEduc é a referência: a turma do Áxis fica igual à lista do SIGEduc.</span>
                </div>
                <div className="p-5 space-y-4 text-sm">
                  {mudancas.entrar.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1.5 font-medium text-emerald-800"><LogIn size={15} /> Vêm para {axis.turma} ({mudancas.entrar.length})</p>
                      <ul className="mt-1 space-y-1">
                        {mudancas.entrar.map(e => (
                          <li key={e.matricula} className="text-slate-700">{e.nome} <span className="text-slate-500">— hoje em {e.turmaAtual}{e.notasQueVem ? `, traz ${e.notasQueVem} nota(s)` : ''}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {mudancas.sair.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1.5 font-medium text-orange-800"><LogOut size={15} /> Saem para Transferidos / Evasão ({mudancas.sair.length})</p>
                      <ul className="mt-1 space-y-1">
                        {mudancas.sair.map(e => <li key={e.matricula} className="text-slate-700">{e.nome} <span className="text-slate-500">— não está na lista do SIGEduc; as notas ficam guardadas</span></li>)}
                      </ul>
                    </div>
                  )}
                  {mudancas.duvidas.length > 0 && (
                    <p className="text-rose-700 flex items-start gap-1.5"><AlertTriangle size={15} className="shrink-0 mt-0.5" /> Nome repetido na escola, confira à mão: {mudancas.duvidas.join(', ')}</p>
                  )}
                  <p className="text-xs text-slate-500">Notas que o aluno já tem na turma nova são mantidas. Notas de turmas encerradas (semestre anterior) ficam lá como histórico.</p>
                  {(mudancas.entrar.length > 0 || mudancas.sair.length > 0) && (
                    confirmMud ? (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700">Confirma as mudanças de turma?</span>
                        <button onClick={() => setConfirmMud(false)} className="px-4 py-2 rounded-xl border border-slate-300">Cancelar</button>
                        <button onClick={aplicarMudancas} disabled={aplicandoMud} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium flex items-center gap-2 disabled:opacity-60">
                          {aplicandoMud ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />} Sim, aplicar
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmMud(true)} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium flex items-center gap-2">
                        <ArrowRightLeft size={16} /> Aplicar mudanças de turma
                      </button>
                    )
                  )}
                </div>
              </section>
            )}

            {comparacao.ignoradas.length > 0 && (
              <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-3">A {comparacao.ignoradas.map(u => `${u}ª`).join(' e ')} unidade do SIGEduc não existe nesta turma do Áxis (turma semestral) e foi ignorada.</p>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={mostrarTodas} onChange={e => setMostrarTodas(e.target.checked)} className="rounded" /> Mostrar também as notas iguais e vazias
              </label>
              <button onClick={() => carregarNotas(disciplinaId)} className="text-sm text-slate-600 flex items-center gap-1.5 hover:text-slate-900"><RefreshCw size={14} /> Recarregar notas do Áxis</button>
            </div>

            {comparacao.unidadesAxis.map(u => {
              const r = resumo(u)
              const ls = comparacao.linhas.filter(l => l.unidade === u && (mostrarTodas || l.tipo === 'nova' || l.tipo === 'alterar' || l.tipo === 'nao_achado' || l.tipo === 'ambiguo'))
              return (
                <section key={u} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold text-slate-900">{u}ª unidade</h2>
                    <p className="text-xs text-slate-500">
                      {r.total ? <>{r.igual} iguais · <b className="text-indigo-700">{r.nova} novas</b> · <b className="text-orange-700">{r.alterar} diferentes</b> · {r.vazia} vazias no SIGEduc{r.nao ? <> · <b className="text-rose-700">{r.nao} para conferir à mão</b></> : null}</> : 'Sem dados desta unidade na página do SIGEduc'}
                    </p>
                  </div>
                  {ls.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                        <tr><th className="w-10" /><th className="text-left px-3 py-2">Estudante</th><th className="px-3 py-2 w-24">Áxis</th><th className="px-3 py-2 w-24">SIGEduc</th><th className="text-left px-3 py-2 w-44">Situação</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ls.map(l => {
                          const pode = (l.tipo === 'nova' || l.tipo === 'alterar') && !axis.encerrada
                          return (
                            <tr key={l.chave} className={l.tipo === 'alterar' ? 'bg-orange-50/40' : ''}>
                              <td className="text-center">{pode && <input type="checkbox" checked={marcadas.has(l.chave)} aria-label={`Aplicar nota de ${l.nome}`}
                                onChange={e => setMarcadas(s => { const n = new Set(s); if (e.target.checked) n.add(l.chave); else n.delete(l.chave); return n })} className="rounded" />}</td>
                              <td className="px-3 py-2 text-slate-800">{l.nome}{l.inf && <span className="ml-2 text-[10px] font-bold text-orange-600">INF</span>}</td>
                              <td className="px-3 py-2 text-center tabular-nums text-slate-600">{l.tipo === 'nao_achado' || l.tipo === 'ambiguo' ? '' : fmt(l.axis)}</td>
                              <td className="px-3 py-2 text-center tabular-nums font-semibold text-slate-900">{fmt(l.sigeduc)}</td>
                              <td className="px-3 py-2 text-xs">
                                {l.tipo === 'igual' && <span className="text-slate-500">igual</span>}
                                {l.tipo === 'vazia' && <span className="text-slate-400">vazia no SIGEduc (não mexe)</span>}
                                {l.tipo === 'nova' && <span className="text-indigo-700 font-medium">nota nova</span>}
                                {l.tipo === 'alterar' && <span className="text-orange-700 font-medium">vai alterar {fmt(l.axis)} → {fmt(l.sigeduc)}</span>}
                                {l.tipo === 'nao_achado' && <span className="text-rose-700 font-medium">não encontrado nesta turma do Áxis</span>}
                                {l.tipo === 'ambiguo' && <span className="text-rose-700 font-medium">nome repetido ou parecido: confira à mão (não será aplicado)</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : r.total ? <p className="px-5 py-4 text-sm text-emerald-700 flex items-center gap-2"><CheckCircle2 size={16} /> Tudo igual ao Áxis nesta unidade.</p> : null}
                </section>
              )
            })}

            {comparacao.foraDoSigeduc.length > 0 && (
              <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-3">
                <b>No Áxis, mas não na página do SIGEduc:</b> {comparacao.foraDoSigeduc.map(a => a.nome).join(', ')}. Essas notas não são alteradas.
              </p>
            )}

            {!axis.encerrada && (
              <div className="sticky bottom-4 bg-white border border-slate-200 shadow-lg rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">{qtdMarcadas ? <><b>{qtdMarcadas}</b> nota{qtdMarcadas > 1 ? 's' : ''} marcada{qtdMarcadas > 1 ? 's' : ''} para salvar em <b>{axis.disciplina}</b> ({axis.turma}).</> : 'Nenhuma diferença para salvar.'}</p>
                {confirmando ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-700">Confirma?</span>
                    <button onClick={() => setConfirmando(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-sm">Cancelar</button>
                    <button onClick={aplicar} disabled={salvando} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-60">
                      {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Sim, salvar
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmando(true)} disabled={!qtdMarcadas} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-40">
                    <Save size={16} /> Salvar no Áxis
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
