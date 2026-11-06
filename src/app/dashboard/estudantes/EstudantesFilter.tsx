"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Search, Users, FilterX, X, Loader2, SlidersHorizontal } from "lucide-react"
import { useCallback, useState, useEffect, useTransition, useMemo } from "react"
import { useDebounce } from "use-debounce"

type Turma = { id: string; nome: string; cursoId: string | null; turno: string | null; curso?: string | null; serie?: string | null; modalidade?: string | null; status?: string | null }

interface FilterProps {
  cursos: { id: string; nome: string }[]
  turmas: Turma[]
  totalResults: number
  exibidos?: number
}

/** Filtros que vão para o endereço da página (dá para salvar/compartilhar a busca) */
const CAMPOS = ['cursoId', 'turno', 'serie', 'modalidade', 'turmaStatus', 'situacao', 'aee', 'portal', 'turmaId'] as const
type Campo = (typeof CAMPOS)[number]

const OPCOES: Partial<Record<Campo, { rotulo: string; valores: [string, string][] }>> = {
  turno: { rotulo: 'Turno', valores: [['Matutino', 'Matutino'], ['Vespertino', 'Vespertino'], ['Noturno', 'Noturno']] },
  serie: { rotulo: 'Série / módulo', valores: [['1', '1º'], ['2', '2º'], ['3', '3º'], ['4', '4º'], ['5', '5º']] },
  modalidade: { rotulo: 'Modalidade', valores: [['EPTM', 'EPTM (regular)'], ['PROEJA', 'PROEJA'], ['SUBSEQUENTE', 'Subsequente']] },
  turmaStatus: { rotulo: 'Turmas', valores: [['ATIVA', 'Só turmas ativas'], ['ENCERRADA', 'Só turmas encerradas']] },
  situacao: { rotulo: 'Situação do aluno', valores: [['ativos', 'Ativos'], ['evasao', 'Transferidos / evasão'], ['concluidos', 'Concluídos']] },
  aee: { rotulo: 'AEE', valores: [['sim', 'Com atendimento AEE']] },
  portal: { rotulo: 'Portal', valores: [['sim', 'Com acesso ao Portal'], ['nao', 'Sem acesso ao Portal']] },
}

const sel = "block w-full pl-3 pr-8 py-2.5 text-sm text-slate-700 border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 rounded-lg"

export default function EstudantesFilter({ cursos, turmas, totalResults, exibidos }: FilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [debouncedSearch] = useDebounce(search, 300)
  const valor = (c: Campo) => searchParams.get(c) || ""

  const navegar = useCallback((mudar: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString())
    mudar(params)
    startTransition(() => router.push(`?${params.toString()}`))
  }, [router, searchParams])

  // busca enquanto digita (espera 300 ms)
  useEffect(() => {
    if (debouncedSearch !== (searchParams.get("search") || "")) {
      navegar(p => { if (debouncedSearch.trim()) p.set("search", debouncedSearch.trim()); else p.delete("search") })
    }
  }, [debouncedSearch, searchParams, navegar])

  // mudar curso/turno/série/modalidade/situação da turma limpa a turma escolhida
  const definir = (c: Campo, v: string) => navegar(p => {
    if (v) p.set(c, v); else p.delete(c)
    if (c !== 'turmaId' && ['cursoId', 'turno', 'serie', 'modalidade', 'turmaStatus'].includes(c)) p.delete('turmaId')
  })

  const turmasFiltradas = useMemo(() => turmas.filter(t =>
    (!valor('cursoId') || t.cursoId === valor('cursoId') || t.curso === valor('cursoId')) &&
    (!valor('turno') || t.turno === valor('turno')) &&
    (!valor('serie') || t.serie?.includes(valor('serie'))) &&
    (!valor('modalidade') || t.modalidade === valor('modalidade')) &&
    (!valor('turmaStatus') || t.status === valor('turmaStatus'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [turmas, searchParams])

  // etiquetas dos filtros ativos (com X para tirar)
  const ativos: { campo: Campo | 'search'; texto: string }[] = []
  if (searchParams.get('search')) ativos.push({ campo: 'search', texto: `“${searchParams.get('search')}”` })
  for (const c of CAMPOS) {
    const v = valor(c); if (!v) continue
    const texto = c === 'cursoId' ? cursos.find(x => x.id === v)?.nome ?? v
      : c === 'turmaId' ? `Turma ${turmas.find(t => t.id === v)?.nome ?? ''}`
      : OPCOES[c]?.valores.find(([k]) => k === v)?.[1] ?? v
    ativos.push({ campo: c, texto })
  }

  const limpar = () => { setSearch(""); startTransition(() => router.push(pathname)) }
  const tirar = (c: Campo | 'search') => { if (c === 'search') setSearch(""); navegar(p => p.delete(c)) }

  const Select = ({ campo }: { campo: Campo }) => {
    const o = OPCOES[campo]!
    return (
      <select aria-label={o.rotulo} className={sel} value={valor(campo)} onChange={e => definir(campo, e.target.value)}>
        <option value="">{o.rotulo}</option>
        {o.valores.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
      </select>
    )
  }

  return (
    <div className="p-6 border-b border-slate-300 space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-lg px-6 py-3 flex items-center space-x-4 shadow-sm min-w-[200px]">
          <div className="p-2 bg-white/20 rounded-lg">
            {isPending ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Users className="w-5 h-5 text-white" />}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-200 uppercase tracking-widest">{isPending ? 'Buscando...' : 'Encontrados'}</p>
            <p className="text-2xl font-medium leading-none">{isPending ? '--' : totalResults}</p>
            {!isPending && exibidos !== undefined && exibidos < totalResults && (
              <p className="text-[11px] text-slate-200 mt-1">mostrando os {exibidos} primeiros</p>
            )}
          </div>
        </div>

        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {isPending ? <Loader2 className="h-6 w-6 text-slate-400 animate-spin" /> : <Search className="h-6 w-6 text-slate-400" />}
          </div>
          <input
            type="search"
            placeholder="Nome (em qualquer ordem, com ou sem acento) ou matrícula…"
            className="block w-full pl-12 pr-4 py-4 h-full border border-slate-300 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 sm:text-lg transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <select aria-label="Curso" className={sel} value={valor('cursoId')} onChange={e => definir('cursoId', e.target.value)}>
          <option value="">Curso</option>
          {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <Select campo="modalidade" />
        <Select campo="turno" />
        <Select campo="serie" />
        <select aria-label="Turma" className={sel} value={valor('turmaId')} onChange={e => definir('turmaId', e.target.value)}>
          <option value="">Turma ({turmasFiltradas.length})</option>
          {turmasFiltradas.map(t => <option key={t.id} value={t.id}>{t.nome}{t.status === 'ENCERRADA' ? ' (encerrada)' : ''}</option>)}
        </select>
        <Select campo="turmaStatus" />
        <Select campo="situacao" />
        <Select campo="aee" />
        <Select campo="portal" />
        <button onClick={limpar} disabled={!ativos.length}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium border border-slate-300 disabled:opacity-40"
          title="Limpar todos os filtros">
          <FilterX className="w-4 h-4" /> Limpar
        </button>
      </div>

      {ativos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          {ativos.map(a => (
            <span key={a.campo} className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 pl-3 pr-1 py-1 text-xs text-slate-700">
              {a.texto}
              <button onClick={() => tirar(a.campo)} aria-label={`Tirar filtro ${a.texto}`} className="p-0.5 rounded-full hover:bg-slate-200">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
