"use client"

import { useState } from "react"
import { AlertTriangle, BookOpen, CalendarDays, CheckCircle2, CircleDashed, Lock, LogOut, Printer, Search } from "lucide-react"
import { consultarBoletim } from "./actions"
import type { Boletim, DisciplinaBoletim } from "@/lib/boletim"

const fmt = (v: number) => v.toFixed(1).replace('.', ',')
/** Máscara dd/mm/aaaa enquanto digita */
const mascaraData = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/')
}

export default function BoletimClient({ aberto }: { aberto: boolean }) {
  const [matricula, setMatricula] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [boletim, setBoletim] = useState<Boletim | null>(null)

  const consultar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      const r = await consultarBoletim(matricula, nascimento)
      if (r.ok) setBoletim(r.boletim)
      else setErro(r.erro)
    } catch {
      setErro('Não foi possível consultar agora. Tente de novo em instantes.')
    } finally {
      setCarregando(false)
    }
  }

  const sair = () => { setBoletim(null); setMatricula(''); setNascimento(''); setErro(null) }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        <header className={`text-center ${boletim ? 'mb-5 print:mb-3' : 'mb-8'}`}>
          <img src="/images/logo_axis_azul.png" alt="Áxis" className={`mx-auto object-contain ${boletim ? 'h-12' : 'h-20 sm:h-24'}`} />
          <p className="mt-3 text-slate-600 font-semibold text-sm uppercase tracking-wide">Consulte seu resultado</p>
          <p className="text-slate-500 font-medium text-xs mt-0.5">CETEP/LNAB</p>
        </header>

        {!aberto ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-2">
            <Lock className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-medium text-slate-800">A consulta de resultados está fechada no momento.</p>
            <p className="text-sm text-slate-500">Ela é aberta pela Direção depois do fechamento das notas.</p>
          </div>
        ) : !boletim ? (
          <form onSubmit={consultar} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Matrícula</span>
              <input value={matricula} onChange={e => setMatricula(e.target.value)} inputMode="numeric" autoComplete="off" required
                placeholder="Ex.: 9666533"
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-lg tracking-wider text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Data de nascimento</span>
              <input value={nascimento} onChange={e => setNascimento(mascaraData(e.target.value))} required
                inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa" pattern="\d{2}/\d{2}/\d{4}" title="Use o formato dd/mm/aaaa"
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-lg tracking-wider text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </label>
            {erro && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{erro}</p>}
            <button type="submit" disabled={carregando}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white py-3.5 font-semibold hover:bg-slate-800 disabled:opacity-60">
              <Search size={18} /> {carregando ? 'Consultando…' : 'Ver meu resultado'}
            </button>
            <p className="text-xs text-slate-500 text-center">Seus dados não ficam salvos neste aparelho.</p>
          </form>
        ) : (
          <Resultado boletim={boletim} onSair={sair} />
        )}
      </div>
    </div>
  )
}

function Resultado({ boletim: b, onSair }: { boletim: Boletim; onSair: () => void }) {
  const ap = b.disciplinas.filter(d => d.situacao === 'AP').length
  const rc = b.disciplinas.filter(d => d.situacao === 'RC' && !d.faltando.length).length
  const rcProvisorio = b.disciplinas.filter(d => d.situacao === 'RC' && d.faltando.length).length
  const semNota = b.disciplinas.filter(d => !d.unidades).length
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <p className="text-lg font-semibold text-slate-900 uppercase leading-snug">{b.nome}</p>
        <p className="text-sm text-slate-600 mt-1">
          <b>{b.turma}</b>{b.curso ? ` · ${b.curso}` : ''}{b.turno ? ` · ${b.turno}` : ''} · {b.periodo}
          {b.encerrada && <span className="ml-2 text-amber-700">(turma encerrada)</span>}
        </p>
        <div className="flex flex-wrap gap-2 mt-4 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 px-3 py-1"><CheckCircle2 size={14} /> {ap} aprovada{ap === 1 ? '' : 's'}</span>
          {rc > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 text-white px-3 py-1"><AlertTriangle size={14} /> {rc} em recuperação</span>}
          {rcProvisorio > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 text-orange-800 px-3 py-1"><AlertTriangle size={14} /> {rcProvisorio} abaixo de 5, faltam notas</span>}
          {semNota > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-600 px-3 py-1"><CircleDashed size={14} /> {semNota} sem nota</span>}
        </div>
      </div>

      <ul className="space-y-2">
        {b.disciplinas.map(d => <LinhaDisciplina key={d.nome} d={d} />)}
      </ul>

      <div className="text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
        <p><b className="text-emerald-700">AP</b>: média 5 ou mais. <b className="text-orange-700">RC</b>: média abaixo de 5. Procure a coordenação sobre a recuperação.</p>
        <p>A média conta 0 para a unidade ainda sem nota. Quando o professor lançar, o resultado pode mudar.</p>
        <p>Resultado provisório; o resultado oficial é o da secretaria.</p>
      </div>

      <div className="flex gap-2 print:hidden">
        <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 font-medium text-slate-700 hover:bg-slate-50">
          <Printer size={18} /> Imprimir / salvar PDF
        </button>
        <button onClick={onSair} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white py-3 font-medium hover:bg-slate-800">
          <LogOut size={18} /> Sair
        </button>
      </div>
    </div>
  )
}

function LinhaDisciplina({ d }: { d: DisciplinaBoletim }) {
  const provisorio = d.situacao === 'RC' && d.faltando.length > 0
  const corMedia = d.situacao === 'AP' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : provisorio ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-orange-500 border-orange-500 text-white'
  return (
    <li className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden break-inside-avoid">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <p className="font-semibold text-slate-900 leading-snug">{d.nome}</p>
        {d.situacao ? (
          <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
            d.situacao === 'AP' ? 'bg-emerald-500 text-white'
              : provisorio ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-orange-500 text-white'}`}>
            {d.situacao}
          </span>
        ) : (
          <span className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium border border-dashed border-slate-300 bg-slate-50 text-slate-500">sem nota</span>
        )}
      </div>

      {d.unidades ? (
        <div className="p-3">
          <div className={`grid gap-2 ${d.unidades.length === 3 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {d.unidades.map(u => (
              <div key={u.u} className={`rounded-xl border text-center py-2 ${u.nota === null ? 'border-dashed border-slate-300 bg-slate-50' : 'border-slate-200 bg-white'}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{u.u}ª unid.</p>
                <p className={`mt-0.5 text-lg font-semibold tabular-nums ${u.nota === null ? 'text-slate-300' : u.nota >= 5 ? 'text-slate-900' : 'text-orange-600'}`}>
                  {u.nota !== null ? fmt(u.nota) : '—'}
                </p>
                {u.infrequente && <p className="text-[9px] font-bold text-orange-600 -mt-0.5">INFREQUENTE</p>}
              </div>
            ))}
            <div className={`rounded-xl border text-center py-2 ${corMedia}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Média</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">{fmt(d.media ?? 0)}</p>
            </div>
          </div>
          {d.faltando.length > 0 && (
            <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs text-orange-800">
              <AlertTriangle size={13} className="shrink-0" />
              Falta a nota da{d.faltando.length > 1 ? 's' : ''} {d.faltando.map(u => `${u}ª`).join(' e ')} unidade{d.faltando.length > 1 ? 's' : ''}. A média conta 0 por enquanto.
            </p>
          )}
        </div>
      ) : (
        <p className="px-4 py-3 text-sm text-slate-500">O professor ainda não lançou nota nesta disciplina.</p>
      )}

      {d.situacao === 'RC' && (
        <div className="mx-3 mb-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <BookOpen size={13} /> Recuperação{provisorio ? ' (caso você fique em recuperação)' : ''}
          </p>
          {d.recuperacao ? (
            <>
              <p className="mt-1 text-sm text-slate-800 whitespace-pre-line">{d.recuperacao.assunto}</p>
              {(d.recuperacao.quando || d.recuperacao.orientacoes) && (
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
                  {d.recuperacao.quando && <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {d.recuperacao.quando}</span>}
                  {d.recuperacao.quando && d.recuperacao.orientacoes && <span aria-hidden>·</span>}
                  {d.recuperacao.orientacoes && <span>{d.recuperacao.orientacoes}</span>}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500">O professor ainda não informou o assunto da recuperação.</p>
          )}
        </div>
      )}
    </li>
  )
}
