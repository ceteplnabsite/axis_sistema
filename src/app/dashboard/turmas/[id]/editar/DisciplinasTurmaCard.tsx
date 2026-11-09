"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { BookOpen, Layers, Plus, Loader2, UserX, CheckCircle2, AlertCircle } from "lucide-react"
import { disciplinasDaTurma, puxarDaMatriz, adicionarDisciplina, type DadosDisciplinasTurma } from "./disciplinas-actions"

export default function DisciplinasTurmaCard({ turmaId }: { turmaId: string }) {
  const [dados, setDados] = useState<DadosDisciplinasTurma | null>(null)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [nome, setNome] = useState('')
  const [pendente, start] = useTransition()

  const carregar = () => start(async () => {
    const r = await disciplinasDaTurma(turmaId)
    if ('erro' in r) setErro(r.erro); else setDados(r)
  })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar() }, [turmaId])

  const puxar = () => start(async () => {
    setErro(''); setAviso('')
    const r = await puxarDaMatriz(turmaId)
    if ('erro' in r) { setErro(r.erro); return }
    setAviso(r.criadas.length ? `${r.criadas.length === 1 ? 'Criada 1 disciplina' : `Criadas ${r.criadas.length} disciplinas`} da matriz: ${r.criadas.join(', ')}.` : 'Nada a puxar: a turma já tem tudo o que está na matriz.')
    const d = await disciplinasDaTurma(turmaId); if (!('erro' in d)) setDados(d)
  })

  const adicionar = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      setErro(''); setAviso('')
      const r = await adicionarDisciplina(turmaId, nome)
      if ('erro' in r) { setErro(r.erro); return }
      setAviso(`"${nome.trim()}" adicionada${r.naMatriz ? ' (e incluída na matriz do curso/série)' : ''}.`)
      setNome('')
      const d = await disciplinasDaTurma(turmaId); if (!('erro' in d)) setDados(d)
    })
  }

  const semProf = dados?.disciplinas.filter(d => !d.professores.length) ?? []

  return (
    <section className="mt-10 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-medium text-slate-800">Disciplinas da turma</h2>
          {dados && <span className="text-sm text-slate-500">{dados.disciplinas.length} · {semProf.length} sem professor</span>}
          {pendente && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
        </div>
        {dados?.temMatriz && (
          <button type="button" onClick={puxar} disabled={pendente || !dados.faltandoDaMatriz.length}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm hover:bg-slate-700 disabled:opacity-40">
            <Layers className="w-4 h-4" />
            {dados.faltandoDaMatriz.length ? `Puxar da matriz (${dados.faltandoDaMatriz.length})` : 'Matriz completa'}
          </button>
        )}
      </div>

      {dados && !dados.temMatriz && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          Esta turma não tem curso e série definidos, então não dá para usar a matriz. Você ainda pode adicionar disciplinas abaixo.
        </p>
      )}
      {dados && dados.faltandoDaMatriz.length > 0 && (
        <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
          Na matriz, mas não nesta turma: {dados.faltandoDaMatriz.join(', ')}.
        </p>
      )}
      {erro && <p className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4"><AlertCircle className="w-4 h-4" />{erro}</p>}
      {aviso && <p className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4"><CheckCircle2 className="w-4 h-4" />{aviso}</p>}

      {dados && (
        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg mb-4">
          {dados.disciplinas.length === 0 && <li className="p-3 text-sm text-slate-500">Nenhuma disciplina ainda.</li>}
          {dados.disciplinas.map(d => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="text-slate-800">{d.nome}</span>
              {d.professores.length
                ? <span className="text-slate-500">{d.professores.join(', ')}</span>
                : <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 rounded-full px-2 py-0.5 text-xs"><UserX className="w-3 h-3" />sem professor</span>}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={adicionar} className="flex flex-col sm:flex-row gap-2">
        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da nova disciplina"
          className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" />
        <button type="submit" disabled={pendente || nome.trim().length < 2}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-sm hover:bg-slate-100 disabled:opacity-40">
          <Plus className="w-4 h-4" /> Adicionar disciplina
        </button>
      </form>
      <p className="text-xs text-slate-500 mt-3">
        Para pôr um professor numa disciplina sem professor, vá em <Link href="/dashboard/usuarios" className="underline">Usuários</Link> › professor › Vincular disciplinas.
      </p>
    </section>
  )
}
