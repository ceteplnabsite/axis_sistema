"use client"

import { useMemo, useState } from "react"
import { Users, BookOpen, ChevronDown, ChevronUp, AlertCircle, FileText, X, Search, ChevronsUpDown, ChevronsDown, ChevronsUp } from "lucide-react"
import { situacaoDoEstudante, type EstudanteRelatorio } from "@/lib/relatorio-turma"

type Professor = { id: string; name: string | null; email: string; disciplina: string }

type Filtro = 'todos' | 'aprovados' | 'recuperacao' | 'pendentes'
type Ordem = 'nome' | 'media_asc' | 'media_desc' | 'rec_desc'

const ROTULO: Record<string, string> = {
  APROVADO: 'Aprovado', APROVADO_RECUPERACAO: 'Apr. recuperação', APROVADO_CONSELHO: 'Apr. Conselho',
  RECUPERACAO: 'Recuperação', DEPENDENCIA: 'Dependência', CONSERVADO: 'Conservado',
}
const COR: Record<string, string> = {
  APROVADO: 'text-green-700 bg-green-100', APROVADO_RECUPERACAO: 'text-green-800 bg-green-100', APROVADO_CONSELHO: 'text-slate-700 bg-slate-200',
  RECUPERACAO: 'text-orange-700 bg-orange-100', DEPENDENCIA: 'text-rose-700 bg-rose-100', CONSERVADO: 'text-slate-600 bg-slate-200',
}
const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '–' : v.toFixed(1))
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const COR_SITUACAO = {
  sem_notas: 'text-slate-600 bg-slate-100', recuperacao: 'text-orange-800 bg-orange-100', outras: 'text-rose-700 bg-rose-100',
  aprovado_parcial: 'text-green-700 bg-green-50 border border-green-200', aprovado: 'text-green-700 bg-green-100',
} as const
const situacao = (e: EstudanteRelatorio) => { const s = situacaoDoEstudante(e); return { texto: s.texto, cor: COR_SITUACAO[s.tipo] } }

export default function RelatorioClient({ turmaNome, semestral, disciplinas, estudantes, professores, isProfessorOnly }: {
  turmaNome: string; semestral: boolean
  disciplinas: { id: string; nome: string }[]
  estudantes: EstudanteRelatorio[]
  professores: Professor[]
  isProfessorOnly: boolean
}) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const [showProfessorsModal, setShowProfessorsModal] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [ordem, setOrdem] = useState<Ordem>('nome')
  const [disciplinaId, setDisciplinaId] = useState('')

  const professoresList = useMemo(() => {
    const m = new Map<string, { id: string; name: string; email: string; disciplinas: string[] }>()
    for (const p of professores) {
      const atual = m.get(p.id) ?? { id: p.id, name: p.name ?? 'Professor(a)', email: p.email, disciplinas: [] }
      if (!atual.disciplinas.includes(p.disciplina)) atual.disciplinas.push(p.disciplina)
      m.set(p.id, atual)
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [professores])


  // visão por disciplina: os números e o status passam a ser daquela disciplina
  const linhaDa = (e: EstudanteRelatorio) => (disciplinaId ? e.linhas.find(l => l.id === disciplinaId) : undefined)

  // com uma disciplina escolhida, os quadros contam só aquela disciplina
  const APROV = ['APROVADO', 'APROVADO_RECUPERACAO', 'APROVADO_CONSELHO']
  const contagem = {
    todos: estudantes.length,
    aprovados: estudantes.filter(e => { const l = linhaDa(e); return l ? APROV.includes(l.status ?? '') : e.recuperacoes === 0 && e.outras === 0 && e.aprovadas > 0 }).length,
    recuperacao: estudantes.filter(e => { const l = linhaDa(e); return l ? l.status === 'RECUPERACAO' : e.recuperacoes > 0 }).length,
    pendentes: estudantes.filter(e => { const l = linhaDa(e); return l ? l.semNota || l.faltando.length > 0 : e.pendentes > 0 }).length,
  }

  const lista = useMemo(() => {
    const q = normalizar(busca.trim())
    const r = estudantes.filter(e => {
      if (q && !q.split(/\s+/).every(p => normalizar(`${e.nome} ${e.matricula}`).includes(p))) return false
      const l = linhaDa(e)
      if (filtro === 'aprovados') return l ? ['APROVADO', 'APROVADO_RECUPERACAO', 'APROVADO_CONSELHO'].includes(l.status ?? '') : e.recuperacoes === 0 && e.outras === 0 && e.aprovadas > 0
      if (filtro === 'recuperacao') return l ? l.status === 'RECUPERACAO' : e.recuperacoes > 0
      if (filtro === 'pendentes') return l ? l.semNota || l.faltando.length > 0 : e.pendentes > 0
      return true
    })
    const media = (e: EstudanteRelatorio) => (disciplinaId ? linhaDa(e)?.media : e.mediaGeral) ?? -1
    return r.sort((a, b) =>
      ordem === 'media_asc' ? media(a) - media(b)
        : ordem === 'media_desc' ? media(b) - media(a)
          : ordem === 'rec_desc' ? b.recuperacoes - a.recuperacoes || a.nome.localeCompare(b.nome)
            : a.nome.localeCompare(b.nome))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estudantes, busca, filtro, ordem, disciplinaId])

  const alternar = (m: string) => setAbertos(s => { const n = new Set(s); if (n.has(m)) n.delete(m); else n.add(m); return n })
  const todosAbertos = lista.length > 0 && lista.every(e => abertos.has(e.matricula))

  const Card = ({ chave, rotulo, valor, cor }: { chave: Filtro; rotulo: string; valor: number; cor: string }) => (
    <button type="button" onClick={() => setFiltro(filtro === chave && chave !== 'todos' ? 'todos' : chave)} aria-pressed={filtro === chave}
      className={`text-left rounded-xl p-5 border transition-all ${cor} ${filtro === chave ? 'ring-2 ring-offset-2 ring-slate-500 shadow-md' : 'hover:shadow-sm'}`}>
      <p className="text-sm mb-1">{rotulo}</p>
      <p className="text-3xl font-medium">{valor}</p>
    </button>
  )

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-end mb-6">
        <button onClick={() => setShowProfessorsModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium transition-colors border border-indigo-200 shadow-sm">
          <Users className="w-5 h-5" /> Ver Professores da Turma
        </button>
      </div>

      {!isProfessorOnly ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            <Card chave="todos" rotulo="Total de estudantes" valor={contagem.todos} cor="bg-white border-slate-300 text-blue-900" />
            <Card chave="aprovados" rotulo={disciplinaId ? 'Aprovados na disciplina' : 'Aprovados (até agora)'} valor={contagem.aprovados} cor="bg-green-50 border-green-200 text-green-900" />
            <Card chave="recuperacao" rotulo={disciplinaId ? 'Em recuperação na disciplina' : 'Em recuperação'} valor={contagem.recuperacao} cor="bg-orange-50 border-orange-200 text-orange-900" />
            <Card chave="pendentes" rotulo="Com notas pendentes" valor={contagem.pendentes} cor="bg-slate-50 border-slate-300 text-slate-800" />
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Clique num quadro para filtrar. Média ≥ 5 já conta como aprovado, mesmo faltando unidade (a unidade sem nota conta 0).
            {semestral ? ' Turma semestral: 2 unidades.' : ' Turma anual: 3 unidades.'}
          </p>
        </>
      ) : (
        <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-blue-900">Contagem de Alunos</h2>
            <p className="text-sm text-blue-700">Total de estudantes matriculados nesta turma</p>
          </div>
          <div className="text-4xl font-medium text-blue-900 pr-4">{estudantes.length}</div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-300 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-medium text-blue-900">
              {isProfessorOnly ? 'Estudantes Matriculados' : 'Desempenho Detalhado dos Estudantes'}
              <span className="ml-2 text-sm text-slate-500">({lista.length} de {estudantes.length})</span>
            </h3>
            {!isProfessorOnly && (
              <button onClick={() => setAbertos(todosAbertos ? new Set() : new Set(lista.map(e => e.matricula)))}
                className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1.5">
                {todosAbertos ? <><ChevronsUp size={16} /> Fechar todos</> : <><ChevronsDown size={16} /> Abrir todos</>}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
            <label className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar estudante (nome ou matrícula)…"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20" />
            </label>
            {!isProfessorOnly && (
              <>
                <select aria-label="Ver por disciplina" value={disciplinaId} onChange={e => setDisciplinaId(e.target.value)}
                  className="py-2 pl-3 pr-8 rounded-lg border border-slate-300 bg-white text-sm max-w-xs">
                  <option value="">Todas as disciplinas (média geral)</option>
                  {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <ChevronsUpDown size={16} className="text-slate-400" />
                  <select aria-label="Ordenar" value={ordem} onChange={e => setOrdem(e.target.value as Ordem)} className="py-2 pl-3 pr-8 rounded-lg border border-slate-300 bg-white text-sm">
                    <option value="nome">Nome</option>
                    <option value="media_asc">Menor média primeiro</option>
                    <option value="media_desc">Maior média primeiro</option>
                    <option value="rec_desc">Mais recuperações primeiro</option>
                  </select>
                </label>
              </>
            )}
          </div>
        </div>

        {estudantes.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <p className="text-slate-700">Nenhum estudante cadastrado nesta turma</p>
          </div>
        ) : lista.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Nenhum estudante com esses filtros.</div>
        ) : (
          <div className="flex flex-col">
            {lista.map((e, index) => {
              const aberto = abertos.has(e.matricula)
              const l = linhaDa(e)
              const sit = situacao(e)
              const media = disciplinaId ? l?.media ?? null : e.mediaGeral
              return (
                <div key={e.matricula} className="border-b border-slate-200 last:border-b-0">
                  <div onClick={() => alternar(e.matricula)}
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors ${aberto ? 'bg-slate-50' : ''}`}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="text-xs text-slate-400 w-6">{index + 1}</span>
                      <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0">{e.nome.charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-800 uppercase tracking-tight truncate flex items-center gap-2">
                          {e.nome}
                          {e.infrequente && <span className="text-[10px] normal-case text-orange-700 bg-orange-50 border border-orange-200 rounded px-1.5">infrequente</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">{e.matricula}</div>
                      </div>
                    </div>

                    {!isProfessorOnly && (
                      <div className="hidden md:flex items-center gap-6 pr-4">
                        <div className="text-center w-20">
                          <p className="text-[10px] text-slate-400 uppercase">{disciplinaId ? 'Média' : 'Média geral'}</p>
                          <span className={`text-sm ${media !== null && media < 5 ? 'text-rose-600' : 'text-slate-700'}`}>{fmt(media)}</span>
                        </div>
                        <div className="text-center w-48">
                          {disciplinaId ? (
                            !l || l.semNota ? <span className="text-xs text-slate-500">sem nota</span> : (
                              <span className={`px-3 py-1 inline-flex text-xs rounded-full ${l.provisorio ? 'text-orange-700 bg-orange-50 border border-orange-200' : COR[l.status ?? ''] ?? 'bg-slate-100'}`}>
                                {ROTULO[l.status ?? ''] ?? l.status}{l.faltando.length ? ` · falta ${l.faltando.map(u => `U${u}`).join(' ')}` : ''}
                              </span>
                            )
                          ) : (
                            <span className={`px-3 py-1 inline-flex text-xs rounded-full ${sit.cor}`}>{sit.texto}</span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="text-slate-400 p-2">{aberto ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</div>
                  </div>

                  {aberto && !isProfessorOnly && (
                    <div className="p-4 bg-slate-50/80 border-t border-slate-100">
                      {!e.linhas.some(x => !x.semNota) ? (
                        <div className="text-center py-4 text-sm text-slate-500 flex items-center justify-center gap-2"><AlertCircle className="w-4 h-4" /> Nenhuma nota lançada para este estudante ainda.</div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-100 text-slate-600">
                              <tr>
                                <th className="px-4 py-2 text-left font-medium">Disciplina</th>
                                <th className="px-4 py-2 text-center font-medium">1ª Unid.</th>
                                <th className="px-4 py-2 text-center font-medium">2ª Unid.</th>
                                {!semestral && <th className="px-4 py-2 text-center font-medium">3ª Unid.</th>}
                                <th className="px-4 py-2 text-center font-medium text-blue-800">Média</th>
                                <th className="px-4 py-2 text-center font-medium">Recup.</th>
                                <th className="px-4 py-2 text-center font-medium">Situação</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {e.linhas.map(x => (
                                <tr key={x.id} className={`${x.semNota ? 'text-slate-400' : 'text-slate-700'} ${x.id === disciplinaId ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                                  <td className="px-4 py-2 text-slate-800">{x.nome}</td>
                                  <td className="px-4 py-2 text-center">{fmt(x.n1)}</td>
                                  <td className="px-4 py-2 text-center">{fmt(x.n2)}</td>
                                  {!semestral && <td className="px-4 py-2 text-center">{fmt(x.n3)}</td>}
                                  <td className={`px-4 py-2 text-center ${x.media !== null && x.media < 5 ? 'text-rose-600' : 'text-blue-900'}`}>{fmt(x.media)}</td>
                                  <td className="px-4 py-2 text-center">{fmt(x.rec)}</td>
                                  <td className="px-4 py-2 text-center">
                                    {x.semNota ? <span className="text-xs">sem nota</span> : (
                                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${x.provisorio ? 'text-orange-700 bg-orange-50 border border-orange-200' : COR[x.status ?? ''] ?? 'bg-slate-100'}`}
                                        title={x.faltando.length ? 'A média conta 0 para a unidade sem nota' : undefined}>
                                        {ROTULO[x.status ?? ''] ?? x.status}{x.faltando.length ? ` · falta ${x.faltando.map(u => `U${u}`).join(' ')}` : ''}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                  {aberto && isProfessorOnly && (
                    <div className="p-4 bg-slate-50/80 border-t border-slate-100 text-center text-sm text-slate-500">
                      O detalhamento de notas não está disponível para o seu perfil nesta visualização.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showProfessorsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-medium text-slate-800 flex items-center gap-2"><BookOpen className="w-6 h-6 text-indigo-600" /> Corpo Docente da Turma</h3>
                <p className="text-sm text-slate-500 mt-1">{turmaNome}</p>
              </div>
              <button onClick={() => setShowProfessorsModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              {professoresList.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p>Nenhum professor vinculado às disciplinas desta turma.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {professoresList.map(prof => (
                    <div key={prof.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">{prof.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <h4 className="text-slate-800 text-sm leading-tight">{prof.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{prof.email}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {prof.disciplinas.map(d => <span key={d} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] uppercase rounded border border-indigo-100">{d}</span>)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
              <button onClick={() => setShowProfessorsModal(false)} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
