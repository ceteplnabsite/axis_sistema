"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, ChevronRight, BarChart3, Mail, Loader2, X, CheckCircle2, AlertTriangle } from "lucide-react"

export interface TurmaProcessada {
  id: string
  nome: string
  curso: string
  turno: string
  totalAlunosPendentes: number
  totalAlunosResolvidos: number
  alunosAguardandoNota: number
  alunosParaDecidir: number
  alertasSigeduc: number
  percentualLancado: number
  situacao: 'esperando' | 'pronta' | 'fechada'
  isResolvido: boolean
}

type Situacao = TurmaProcessada['situacao']
type Ordem = 'perto' | 'nome' | 'lancado' | 'decidir'

const SITUACOES: Record<Situacao, { rotulo: string; dica: string; ponto: string; selo: string }> = {
  esperando: { rotulo: 'Esperando professores', dica: 'Ainda falta nota lançada', ponto: 'bg-amber-400', selo: 'text-amber-800 bg-amber-50 border-amber-200' },
  pronta: { rotulo: 'Pronta para o Conselho', dica: 'Tudo lançado, falta decidir', ponto: 'bg-pink-500', selo: 'text-pink-800 bg-pink-50 border-pink-200' },
  fechada: { rotulo: 'Fechada', dica: 'Tudo decidido', ponto: 'bg-emerald-500', selo: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
}

const ORDENS: [Ordem, string][] = [
  ['perto', 'Mais perto de fechar'],
  ['lancado', 'Mais notas lançadas'],
  ['decidir', 'Mais alunos para decidir'],
  ['nome', 'Nome da turma'],
]

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

type Destinatario = { nome: string; email: string; ativo: boolean; disciplinas: { turma?: string; disciplina: string; alunosPendentes: number }[] }
type ResultadoAviso = { nome: string; email: string; resultado: string }
type Aviso = { etapa: 'carregando' | 'previa' | 'enviando' | 'feito' | 'erro'; destinatarios?: Destinatario[]; resultados?: ResultadoAviso[]; semProfessor?: string[]; erro?: string }

export default function ConselhoClasseList({ turmas, ehDirecao }: { turmas: TurmaProcessada[]; ehDirecao: boolean }) {
  const [busca, setBusca] = useState("")
  const [situacao, setSituacao] = useState<Situacao | 'todas'>('todas')
  const [turno, setTurno] = useState('')
  const [ordem, setOrdem] = useState<Ordem>('perto')
  const [aviso, setAviso] = useState<Aviso | null>(null)

  const contagem = useMemo(() => {
    const c: Record<Situacao, number> = { esperando: 0, pronta: 0, fechada: 0 }
    turmas.forEach(t => c[t.situacao]++)
    return c
  }, [turmas])

  const turnos = useMemo(() => [...new Set(turmas.map(t => t.turno))].sort(), [turmas])
  const lancadoGeral = turmas.length ? Math.floor(turmas.reduce((s, t) => s + t.percentualLancado, 0) / turmas.length) : 100

  const visiveis = useMemo(() => {
    const termos = semAcento(busca).split(/\s+/).filter(Boolean)
    const lista = turmas.filter(t =>
      (situacao === 'todas' || t.situacao === situacao) &&
      (!turno || t.turno === turno) &&
      termos.every(p => semAcento(`${t.nome} ${t.curso}`).includes(p)))
    const peso: Record<Situacao, number> = { pronta: 0, esperando: 1, fechada: 2 }
    return lista.sort((a, b) => {
      if (ordem === 'nome') return a.nome.localeCompare(b.nome)
      if (ordem === 'lancado') return b.percentualLancado - a.percentualLancado || a.nome.localeCompare(b.nome)
      if (ordem === 'decidir') return b.alunosParaDecidir - a.alunosParaDecidir || a.nome.localeCompare(b.nome)
      // mais perto de fechar: prontas primeiro (menos alunos para decidir), depois as que esperam (mais lançadas), fechadas no fim
      return peso[a.situacao] - peso[b.situacao]
        || (a.situacao === 'pronta' ? a.alunosParaDecidir - b.alunosParaDecidir : b.percentualLancado - a.percentualLancado)
        || a.nome.localeCompare(b.nome)
    })
  }, [turmas, busca, situacao, turno, ordem])

  const chamarAviso = async (simular: boolean) => {
    setAviso(a => ({ ...(a ?? {}), etapa: simular ? 'carregando' : 'enviando' }))
    try {
      const r = await fetch('/api/conselho-classe/avisar-professores', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todas: true, simular })
      })
      const d = await r.json()
      if (!r.ok) { setAviso({ etapa: 'erro', erro: d.message }); return }
      setAviso({ etapa: simular ? 'previa' : 'feito', destinatarios: d.destinatarios, resultados: d.resultados, semProfessor: d.semProfessor })
    } catch { setAviso({ etapa: 'erro', erro: 'Sem conexão com o servidor.' }) }
  }

  return (
    <div className="space-y-5">
      {/* Resumo: cada quadro filtra a lista */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Notas lançadas nas turmas ativas</p>
            <p className="text-2xl text-slate-900 tabular-nums">{lancadoGeral}% <span className="text-base text-slate-500">em média · {turmas.length} turmas</span></p>
          </div>
          {ehDirecao && contagem.esperando > 0 && (
            <button type="button" onClick={() => chamarAviso(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm hover:bg-slate-100">
              <Mail size={16} /> Avisar professores de todas as turmas
            </button>
          )}
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-slate-800" style={{ width: `${lancadoGeral}%` }} /></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button type="button" onClick={() => setSituacao('todas')} aria-pressed={situacao === 'todas'}
            className={`text-left p-3 rounded-xl border ${situacao === 'todas' ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
            <div className="text-sm text-slate-600">Todas</div>
            <div className="text-2xl text-slate-900 tabular-nums">{turmas.length}</div>
            <div className="text-xs text-slate-400">turmas</div>
          </button>
          {(Object.keys(SITUACOES) as Situacao[]).map(s => (
            <button key={s} type="button" onClick={() => setSituacao(v => v === s ? 'todas' : s)} aria-pressed={situacao === s}
              className={`text-left p-3 rounded-xl border ${situacao === s ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
              <div className="flex items-center gap-2 text-sm text-slate-600"><span className={`w-2 h-2 rounded-full ${SITUACOES[s].ponto}`} />{SITUACOES[s].rotulo}</div>
              <div className="text-2xl text-slate-900 tabular-nums">{contagem[s]}</div>
              <div className="text-xs text-slate-400">{SITUACOES[s].dica}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Busca, turno e ordem */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar turma ou curso…"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 bg-white outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
        </div>
        <select aria-label="Turno" value={turno} onChange={e => setTurno(e.target.value)}
          className="px-3 py-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-700">
          <option value="">Todos os turnos</option>
          {turnos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select aria-label="Ordenar" value={ordem} onChange={e => setOrdem(e.target.value as Ordem)}
          className="px-3 py-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-700">
          {ORDENS.map(([v, t]) => <option key={v} value={v}>Ordenar: {t}</option>)}
        </select>
      </div>

      {/* Turmas */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
        {visiveis.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <BarChart3 className="w-10 h-10 opacity-30 mx-auto mb-2" />
            <p className="text-sm">Nenhuma turma neste filtro</p>
          </div>
        )}
        {visiveis.map(t => {
          const s = SITUACOES[t.situacao]
          return (
            <Link key={t.id} href={`/dashboard/conselho-classe/${t.id}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto] gap-x-4 gap-y-2 items-center px-5 py-4 hover:bg-slate-50">
              <div className="min-w-0">
                <p className="text-slate-900">{t.nome}</p>
                <p className="text-xs text-slate-500 truncate">{t.curso} · {t.turno}</p>
              </div>
              <div className="hidden md:block">
                <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Notas lançadas</span><span className="tabular-nums">{t.percentualLancado}%</span></div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${t.percentualLancado === 100 ? 'bg-emerald-500' : 'bg-slate-700'}`} style={{ width: `${t.percentualLancado}%` }} /></div>
              </div>
              <div className="col-span-full md:col-span-1 order-last md:order-none text-xs text-slate-600 space-x-2">
                <span className={`inline-block px-2 py-0.5 rounded-full border ${s.selo}`}>{s.rotulo}</span>
                {t.alunosAguardandoNota > 0 && <span className="text-amber-700">{t.alunosAguardandoNota} aguardando nota</span>}
                {t.alunosParaDecidir > 0 && <span className="text-rose-700">{t.alunosParaDecidir} para decidir</span>}
                {t.situacao === 'fechada' && <span className="text-emerald-700">{t.totalAlunosResolvidos} alunos resolvidos</span>}
                {t.alertasSigeduc > 0 && <span className="inline-flex items-center gap-1 text-rose-700" title="Notas que professores informaram terem sido alteradas no SIGEduc"><AlertTriangle size={12} />{t.alertasSigeduc} nota{t.alertasSigeduc > 1 ? 's' : ''} alterada{t.alertasSigeduc > 1 ? 's' : ''} no SIGEduc</span>}
              </div>
              <ChevronRight size={18} className="text-slate-400 justify-self-end" />
            </Link>
          )
        })}
      </div>

      {/* Aviso a todos os professores */}
      {aviso && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={() => aviso.etapa !== 'enviando' && setAviso(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg text-slate-900">Avisar professores por e-mail</h2>
                <p className="text-sm text-slate-500">Notas que faltam lançar em todas as turmas ativas</p>
              </div>
              {aviso.etapa !== 'enviando' && <button type="button" onClick={() => setAviso(null)} aria-label="Fechar" className="text-slate-400 hover:text-slate-700"><X size={20} /></button>}
            </div>
            {(aviso.etapa === 'carregando' || aviso.etapa === 'enviando') && (
              <p className="flex items-center gap-2 text-slate-600"><Loader2 size={16} className="animate-spin" />{aviso.etapa === 'carregando' ? 'Calculando pendências…' : 'Enviando e-mails… não feche esta janela.'}</p>
            )}
            {aviso.etapa === 'erro' && <p className="flex items-center gap-2 text-rose-700"><AlertTriangle size={16} />{aviso.erro}</p>}
            {aviso.etapa === 'previa' && aviso.destinatarios && (
              <>
                <p className="text-slate-700 mb-3">Cada professor recebe <b>um único e-mail</b> com todas as turmas, disciplinas e alunos que faltam, e o link para lançar:</p>
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl mb-3">
                  {aviso.destinatarios.map(d => (
                    <li key={d.email} className="px-4 py-2 text-sm">
                      <div className="flex justify-between gap-3"><span className="text-slate-900">{d.nome}</span><span className="text-slate-500 truncate">{d.ativo ? d.email : 'usuário inativo, não recebe'}</span></div>
                      <p className="text-xs text-slate-500">{d.disciplinas.map(x => `${x.turma ? x.turma + ' · ' : ''}${x.disciplina} (${x.alunosPendentes})`).join(' · ')}</p>
                    </li>
                  ))}
                </ul>
                {!!aviso.semProfessor?.length && <p className="text-sm text-rose-700 mb-3">Sem professor vinculado (ninguém para avisar): {aviso.semProfessor.join(', ')}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setAviso(null)} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100">Cancelar</button>
                  <button type="button" onClick={() => chamarAviso(false)} disabled={!aviso.destinatarios.some(d => d.ativo)}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 inline-flex items-center gap-2">
                    <Mail size={16} /> Enviar para {aviso.destinatarios.filter(d => d.ativo).length} professor(es)
                  </button>
                </div>
              </>
            )}
            {aviso.etapa === 'feito' && aviso.resultados && (
              <>
                <p className="flex items-center gap-2 text-emerald-700 mb-3"><CheckCircle2 size={16} />Envio concluído.</p>
                <ul className="text-sm divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {aviso.resultados.map(r => (
                    <li key={r.email} className="px-4 py-2 flex justify-between gap-3">
                      <span className="text-slate-900">{r.nome}</span>
                      <span className={r.resultado === 'erro' ? 'text-rose-700' : r.resultado === 'inativo' ? 'text-slate-400' : 'text-emerald-700'}>
                        {r.resultado === 'erro' ? 'falhou' : r.resultado === 'inativo' ? 'inativo' : r.resultado === 'simulado' ? 'simulado (e-mail desligado)' : 'enviado'}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
